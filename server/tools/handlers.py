import asyncio
import time
from contextvars import ContextVar
from dataclasses import dataclass

from loguru import logger
from pipecat.services.llm_service import FunctionCallParams

from tools.calendar_client import CalendarClient
from graph.scheduling_graph import scheduling_graph
from utils.audit import audit_log
from config import settings


@dataclass
class UserCredentials:
    access_token: str
    refresh_token: str
    client_id: str | None = None
    client_secret: str | None = None
    calendar_id: str = "primary"


user_credentials_var: ContextVar[UserCredentials | None] = ContextVar(
    "user_credentials", default=None
)

# Explicit opt-in for server-level default credentials. Only trusted callers
# (Slack bot, background jobs) set this True before invoking tools. The web
# path NEVER sets it, so an unauthenticated guest can never accidentally
# touch the server owner's personal Google Calendar via the .env defaults.
# Without this gate, a Gemini model that ignores the "don't call tools"
# preamble would silently book events on the wrong calendar.
allow_server_default_creds: ContextVar[bool] = ContextVar(
    "allow_server_default_creds", default=False
)

calendar_client: CalendarClient | None = None


class CalendarAuthRequiredError(Exception):
    """Raised when a calendar operation is attempted without any valid
    per-user OAuth credentials AND the caller has not opted in to server
    defaults. Handled upstream to surface a "connect your calendar" message
    to the user instead of crashing the pipeline or leaking the server
    owner's calendar to an unauthenticated guest."""
    pass


def get_calendar_client() -> CalendarClient:
    creds = user_credentials_var.get(None)
    if creds is not None:
        return CalendarClient(
            refresh_token=creds.refresh_token,
            access_token=creds.access_token,
            client_id=creds.client_id,
            client_secret=creds.client_secret,
            calendar_id=creds.calendar_id,
        )

    # No per-user creds. Server defaults are only usable by trusted callers
    # that explicitly opted in (Slack agent). All web-originated calls leave
    # the flag at its False default, so guest conversations never fall
    # through to the server owner's calendar — even if the LLM ignores
    # the system prompt and calls a tool.
    if not allow_server_default_creds.get(False):
        raise CalendarAuthRequiredError(
            "No calendar credentials available. The user needs to connect their Google Calendar."
        )

    if not settings.google_refresh_token or not settings.google_client_id:
        raise CalendarAuthRequiredError(
            "Server-level calendar credentials are not configured."
        )

    global calendar_client
    if calendar_client is None:
        calendar_client = CalendarClient()
    return calendar_client


def _invoke_graph_with_trace(input_state: dict) -> tuple[dict, list[dict]]:
    """Invoke the scheduling graph and capture node execution trace."""
    action = input_state.get("action", "")
    node_map = {
        "check_availability": ["fetch_busy", "compute_slots", "rank"],
        "create_event": ["book_event"],
        "reschedule_event": ["verify_free", "reschedule_event"],
        "cancel_event": ["cancel_event"],
    }
    expected_nodes = node_map.get(action, ["verify_free", "book_event"])

    graph_trace = []
    overall_start = time.time()

    state = scheduling_graph.invoke(input_state)

    total_ms = int((time.time() - overall_start) * 1000)

    for i, node in enumerate(expected_nodes):
        has_error = state.get("error") and i == len(expected_nodes) - 1
        if action == "create_event" and not state.get("is_slot_free", True) and node == "book_event":
            graph_trace.append({
                "node": "return_error",
                "status": "completed",
                "duration_ms": max(1, total_ms // len(expected_nodes)),
            })
            break
        if action == "reschedule_event" and not state.get("is_slot_free", True) and node == "reschedule_event":
            graph_trace.append({
                "node": "return_error",
                "status": "completed",
                "duration_ms": max(1, total_ms // len(expected_nodes)),
            })
            break

        graph_trace.append({
            "node": node,
            "status": "error" if has_error else "completed",
            "duration_ms": max(1, total_ms // len(expected_nodes)),
        })

    return state, graph_trace


async def _invoke_with_retry(input_state: dict) -> tuple[dict, list[dict]]:
    """Invoke graph with a single retry on auth-related failures.

    CalendarAuthRequiredError short-circuits immediately — retrying without
    credentials is pointless. The error bubbles into the handler's except
    block which surfaces a structured auth_required response to the LLM.
    """
    try:
        return await asyncio.to_thread(_invoke_graph_with_trace, input_state)
    except CalendarAuthRequiredError:
        raise  # No retry — there are no creds to retry with
    except Exception as e:
        error_msg = str(e).lower()
        if any(keyword in error_msg for keyword in ["401", "token", "credentials", "auth", "refresh"]):
            logger.warning(f"Auth error detected, retrying with fresh credentials: {e}")
            # Only reset global singleton if not using per-user creds
            if user_credentials_var.get(None) is None:
                global calendar_client
                calendar_client = None  # Force re-init on next use
            return await asyncio.to_thread(_invoke_graph_with_trace, input_state)
        raise


async def handle_check_availability(params: FunctionCallParams):
    """Handle check_availability function call via LangGraph."""
    args = params.arguments
    logger.info(f"check_availability called with: {args}")

    try:
        state, graph_trace = await _invoke_with_retry({
            "action": "check_availability",
            "date": args["date"],
            "end_date": args.get("end_date", ""),
            "duration_minutes": args.get("duration_minutes", 30),
            "time_preference": args.get("time_preference", "any"),
            "attendees": args.get("attendees", []),
            "num_suggestions": args.get("num_suggestions", 5),
            "timezone": settings.default_timezone,
        })

        result = state.get("result", {"error": "No result from graph"})
        result["graph_trace"] = graph_trace
        audit_log.log("check_availability", dict(args), result)
        logger.info(f"Returning {len(result.get('available_slots', []))} ranked slots")
        await params.result_callback(result)

    except Exception as e:
        error_result = {"error": str(e), "error_code": _classify_error(e)}
        audit_log.log("check_availability", dict(args), error_result, success=False)
        logger.error(f"check_availability failed: {e}")
        await params.result_callback(error_result)


async def handle_create_event(params: FunctionCallParams):
    """Handle create_event function call via LangGraph."""
    args = params.arguments
    logger.info(f"create_event called with: {args}")

    description = args.get("description", "")
    attendee_name = args.get("attendee_name", "")
    if attendee_name and not description:
        description = f"Scheduled by {attendee_name} via CadenceAI"
    elif attendee_name:
        description = f"{description}\n\nScheduled by {attendee_name} via CadenceAI"

    try:
        state, graph_trace = await _invoke_with_retry({
            "action": "create_event",
            "title": args.get("title", "Meeting"),
            "start_time": args["start_time"],
            "duration_minutes": args.get("duration_minutes", 30),
            "attendees": args.get("attendees", []),
            "description": description,
            "timezone": settings.default_timezone,
        })

        result = state.get("result", {"error": "No result from graph"})
        result["graph_trace"] = graph_trace
        audit_log.log("create_event", dict(args), result)
        logger.info(f"Event result: {result}")
        await params.result_callback(result)

    except Exception as e:
        error_result = {"error": str(e), "error_code": _classify_error(e)}
        audit_log.log("create_event", dict(args), error_result, success=False)
        logger.error(f"create_event failed: {e}")
        await params.result_callback(error_result)


async def handle_reschedule_event(params: FunctionCallParams):
    """Handle reschedule_event function call via LangGraph."""
    args = params.arguments
    logger.info(f"reschedule_event called with: {args}")

    try:
        state, graph_trace = await _invoke_with_retry({
            "action": "reschedule_event",
            "event_id": args["event_id"],
            "start_time": args["new_start_time"],
            "duration_minutes": args.get("duration_minutes", 30),
            "timezone": settings.default_timezone,
        })

        result = state.get("result", {"error": "No result from graph"})
        result["graph_trace"] = graph_trace
        audit_log.log("reschedule_event", dict(args), result)
        logger.info(f"Reschedule result: {result}")
        await params.result_callback(result)

    except Exception as e:
        error_result = {"error": str(e), "error_code": _classify_error(e)}
        audit_log.log("reschedule_event", dict(args), error_result, success=False)
        logger.error(f"reschedule_event failed: {e}")
        await params.result_callback(error_result)


async def handle_cancel_event(params: FunctionCallParams):
    """Handle cancel_event function call via LangGraph."""
    args = params.arguments
    logger.info(f"cancel_event called with: {args}")

    try:
        state, graph_trace = await _invoke_with_retry({
            "action": "cancel_event",
            "event_id": args["event_id"],
            "notify_attendees": args.get("notify_attendees", True),
            "timezone": settings.default_timezone,
        })

        result = state.get("result", {"error": "No result from graph"})
        result["graph_trace"] = graph_trace
        audit_log.log("cancel_event", dict(args), result)
        logger.info(f"Cancel result: {result}")
        await params.result_callback(result)

    except Exception as e:
        error_result = {"error": str(e), "error_code": _classify_error(e)}
        audit_log.log("cancel_event", dict(args), error_result, success=False)
        logger.error(f"cancel_event failed: {e}")
        await params.result_callback(error_result)


def _classify_error(e: Exception) -> str:
    """Classify an error into a code for structured responses."""
    if isinstance(e, CalendarAuthRequiredError):
        return "auth_required"
    msg = str(e).lower()
    if "401" in msg or "auth" in msg or "token" in msg:
        return "auth_expired"
    if "404" in msg or "not found" in msg:
        return "not_found"
    if "409" in msg or "conflict" in msg:
        return "conflict"
    if "429" in msg or "rate" in msg:
        return "rate_limit"
    if "timeout" in msg:
        return "timeout"
    return "internal_error"


def register_all_handlers(llm):
    """Register all function call handlers on the LLM service."""
    llm.register_function("check_availability", handle_check_availability)
    llm.register_function("create_event", handle_create_event)
    llm.register_function("reschedule_event", handle_reschedule_event)
    llm.register_function("cancel_event", handle_cancel_event)
