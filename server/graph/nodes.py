from datetime import datetime, timedelta

from googleapiclient.errors import HttpError
from loguru import logger

from graph.state import SchedulingState
from tools.calendar_client import CalendarClient
from utils.slot_ranker import compute_free_slots, rank_slots
from config import settings


def get_client() -> CalendarClient:
    from tools.handlers import get_calendar_client
    return get_calendar_client()


def fetch_busy(state: SchedulingState) -> SchedulingState:
    """Fetch busy times from Google Calendar (supports multi-day ranges)."""
    client = get_client()
    tz = state.get("timezone", settings.default_timezone)
    attendees = state.get("attendees", [])
    end_date = state.get("end_date", "")

    try:
        if end_date and end_date != state["date"]:
            # Multi-day range query
            busy_by_date = client.get_busy_times_range(
                state["date"], end_date, tz, calendar_ids=attendees or None
            )
            logger.info(f"fetch_busy: multi-day range {state['date']} to {end_date}")
            # Flatten for downstream processing, but tag with date info
            all_busy = []
            for date_str, blocks in busy_by_date.items():
                for block in blocks:
                    block["_date"] = date_str
                    all_busy.append(block)
            return {"busy_times": all_busy}
        else:
            busy = client.get_busy_times(state["date"], tz, calendar_ids=attendees or None)
            logger.info(f"fetch_busy: {len(busy)} busy blocks on {state['date']} ({len(attendees)} attendee(s))")
            return {"busy_times": busy}

    except HttpError as e:
        status = e.resp.status if hasattr(e, 'resp') else 0
        if status == 401:
            error_msg = "Calendar authentication expired. Please re-authenticate."
        elif status == 404:
            error_msg = "Calendar not found. Please check the calendar ID."
        elif status == 429:
            error_msg = "Too many requests to Google Calendar. Please try again in a moment."
        else:
            error_msg = f"Google Calendar error: {str(e)}"
        logger.error(f"fetch_busy failed: {error_msg}")
        return {"busy_times": [], "error": error_msg}


def compute_slots(state: SchedulingState) -> SchedulingState:
    """Compute free slots from busy times (supports multi-day)."""
    if state.get("error"):
        return {"free_slots": []}

    tz = state.get("timezone", settings.default_timezone)
    duration = state.get("duration_minutes", 30)
    end_date = state.get("end_date", "")

    if end_date and end_date != state.get("date", ""):
        # Multi-day: compute slots per day
        all_free = []
        start_dt = datetime.fromisoformat(state["date"])
        end_dt = datetime.fromisoformat(end_date)
        current = start_dt

        while current <= end_dt:
            date_str = current.strftime("%Y-%m-%d")
            day_busy = [b for b in state["busy_times"] if b.get("_date", b["start"][:10]) == date_str]
            day_free = compute_free_slots(date_str, day_busy, duration, tz)
            # Tag each free slot with its date
            for slot in day_free:
                slot["date"] = date_str
            all_free.extend(day_free)
            current += timedelta(days=1)

        logger.info(f"compute_slots: {len(all_free)} free windows across date range")
        return {"free_slots": all_free}
    else:
        free = compute_free_slots(state["date"], state["busy_times"], duration, tz)
        logger.info(f"compute_slots: {len(free)} free windows")
        return {"free_slots": free}


def rank(state: SchedulingState) -> SchedulingState:
    """Rank free slots and return top N."""
    if state.get("error"):
        return {"result": {"error": state["error"]}}

    duration = state.get("duration_minutes", 30)
    preference = state.get("time_preference", "any")
    num_suggestions = state.get("num_suggestions", 5)
    busy_times = state.get("busy_times", [])

    ranked = rank_slots(state["free_slots"], duration, preference, busy_times, num_suggestions)
    logger.info(f"rank: returning {len(ranked)} ranked slots")

    date_info = state.get("date", "")
    end_date = state.get("end_date", "")
    if end_date and end_date != date_info:
        date_info = f"{date_info} to {end_date}"

    return {
        "ranked_slots": ranked,
        "result": {
            "date": date_info,
            "duration_minutes": duration,
            "time_preference": preference,
            "busy_count": len(busy_times),
            "available_slots": ranked,
            "busy_times": busy_times,
        },
    }


def verify_free(state: SchedulingState) -> SchedulingState:
    """Verify the requested time slot is actually free."""
    client = get_client()

    start = datetime.fromisoformat(state["start_time"])
    date_str = start.strftime("%Y-%m-%d")
    tz = state.get("timezone", settings.default_timezone)
    attendees = state.get("attendees", [])

    try:
        busy = client.get_busy_times(date_str, tz, calendar_ids=attendees or None)
    except HttpError as e:
        logger.error(f"verify_free failed to fetch busy times: {e}")
        return {"is_slot_free": False, "error": f"Failed to verify slot: {e}"}

    duration = state.get("duration_minutes", 30)
    end = start + timedelta(minutes=duration)

    is_free = True
    conflicting_range = ""
    for b in busy:
        busy_start = datetime.fromisoformat(b["start"].replace("Z", "+00:00")).replace(tzinfo=None)
        busy_end = datetime.fromisoformat(b["end"].replace("Z", "+00:00")).replace(tzinfo=None)
        if start < busy_end and end > busy_start:
            is_free = False
            conflicting_range = f"{busy_start.strftime('%I:%M %p')} - {busy_end.strftime('%I:%M %p')}"
            break

    logger.info(f"verify_free: slot {'is' if is_free else 'is NOT'} free")
    result: dict = {"is_slot_free": is_free, "busy_times": busy}
    if not is_free:
        # Fetch actual event details so the LLM can tell the user WHAT is conflicting
        conflicting_event = {"time_range": conflicting_range}
        try:
            events = client.list_upcoming_events(date_str, n=20, timezone=tz)
            for ev in events:
                ev_start = datetime.fromisoformat(ev["start"].replace("Z", "+00:00")).replace(tzinfo=None)
                ev_end = datetime.fromisoformat(ev["end"].replace("Z", "+00:00")).replace(tzinfo=None)
                if start < ev_end and end > ev_start:
                    conflicting_event["title"] = ev.get("title", "Untitled")
                    conflicting_event["start"] = ev["start"]
                    conflicting_event["end"] = ev["end"]
                    break
        except Exception as e:
            logger.warning(f"Could not fetch conflicting event details: {e}")

        event_label = conflicting_event.get("title", "an event")
        result["error"] = f"Conflicts with '{event_label}' at {conflicting_range}"
        result["conflicting_event"] = conflicting_event
    return result


def book_event(state: SchedulingState) -> SchedulingState:
    """Book the event on Google Calendar."""
    client = get_client()
    tz = state.get("timezone", settings.default_timezone)

    try:
        event = client.create_event(
            title=state.get("title", "Meeting"),
            start_time=state["start_time"],
            duration_minutes=state.get("duration_minutes", 30),
            attendees=state.get("attendees"),
            description=state.get("description"),
            timezone=tz,
        )
        logger.info(f"book_event: created {event.get('title')}")
        return {"result": {"success": True, "event": event}}

    except HttpError as e:
        if hasattr(e, 'resp') and e.resp.status == 409:
            logger.warning(f"book_event: 409 conflict for {state['start_time']}")
            return {
                "error": "This time slot was just taken by another event. Let me find alternatives.",
                "result": {
                    "success": False,
                    "error": "conflict",
                    "message": "The slot was taken between verification and booking. Please check availability again.",
                },
            }
        raise


def return_error(state: SchedulingState) -> SchedulingState:
    """Return a conflict error with details for the LLM to suggest alternatives."""
    conflict_info = state.get("error", "")
    error_msg = f"Time slot is not available. {conflict_info}".strip()

    result: dict = {
        "success": False,
        "error": "conflict",
        "message": error_msg,
        "suggestion": "Please check availability to find alternative times.",
    }

    # Pass through conflicting event details so the LLM can tell the user what's blocking
    conflicting_event = state.get("conflicting_event")
    if conflicting_event:
        result["conflicting_event"] = conflicting_event

    return {
        "error": error_msg,
        "result": result,
    }


def reschedule_event(state: SchedulingState) -> SchedulingState:
    """Reschedule an existing event to a new time."""
    client = get_client()
    tz = state.get("timezone", settings.default_timezone)

    try:
        updated = client.update_event(
            event_id=state["event_id"],
            start_time=state["start_time"],
            duration_minutes=state.get("duration_minutes", 30),
            timezone=tz,
        )
        logger.info(f"reschedule_event: moved {state['event_id']} to {state['start_time']}")
        return {"result": {"success": True, "event": updated, "action": "rescheduled"}}

    except ValueError as e:
        return {"error": str(e), "result": {"success": False, "error": "not_found", "message": str(e)}}
    except HttpError as e:
        if hasattr(e, 'resp') and e.resp.status == 409:
            return {
                "error": "New time conflicts with another event.",
                "result": {"success": False, "error": "conflict", "message": "The new time conflicts with another event."},
            }
        raise


def cancel_event(state: SchedulingState) -> SchedulingState:
    """Cancel/delete a calendar event."""
    client = get_client()
    notify = state.get("notify_attendees", True)

    try:
        result = client.delete_event(state["event_id"], notify_attendees=notify)
        logger.info(f"cancel_event: deleted {state['event_id']}")
        return {"result": {"success": True, **result, "action": "cancelled"}}

    except ValueError as e:
        return {"error": str(e), "result": {"success": False, "error": "not_found", "message": str(e)}}
    except HttpError as e:
        raise
