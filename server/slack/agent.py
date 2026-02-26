import asyncio
import json
from datetime import datetime

import google.generativeai as genai
from loguru import logger

from config import settings
from graph.scheduling_graph import scheduling_graph
from system_prompt import get_system_prompt
from utils.audit import audit_log

# Per-user conversation history (keyed by Slack user ID)
_conversations: dict[str, list[dict]] = {}

# Tool definitions for Gemini function calling
SCHEDULING_TOOLS = [
    genai.protos.Tool(
        function_declarations=[
            genai.protos.FunctionDeclaration(
                name="check_availability",
                description="Check calendar availability and find open meeting slots on a date or date range.",
                parameters=genai.protos.Schema(
                    type=genai.protos.Type.OBJECT,
                    properties={
                        "date": genai.protos.Schema(type=genai.protos.Type.STRING, description="Date in YYYY-MM-DD format"),
                        "end_date": genai.protos.Schema(type=genai.protos.Type.STRING, description="Optional end date for multi-day queries (YYYY-MM-DD)"),
                        "duration_minutes": genai.protos.Schema(type=genai.protos.Type.INTEGER, description="Meeting duration in minutes (default 30)"),
                        "time_preference": genai.protos.Schema(type=genai.protos.Type.STRING, description="Preferred time: morning, afternoon, evening, or any"),
                        "attendees": genai.protos.Schema(
                            type=genai.protos.Type.ARRAY,
                            items=genai.protos.Schema(type=genai.protos.Type.STRING),
                            description="Email addresses of attendees to check mutual availability",
                        ),
                        "num_suggestions": genai.protos.Schema(type=genai.protos.Type.INTEGER, description="Number of slot suggestions (default 5)"),
                    },
                    required=["date"],
                ),
            ),
            genai.protos.FunctionDeclaration(
                name="create_event",
                description="Create a calendar event with Google Meet link.",
                parameters=genai.protos.Schema(
                    type=genai.protos.Type.OBJECT,
                    properties={
                        "start_time": genai.protos.Schema(type=genai.protos.Type.STRING, description="Start time in ISO 8601 format"),
                        "title": genai.protos.Schema(type=genai.protos.Type.STRING, description="Meeting title"),
                        "duration_minutes": genai.protos.Schema(type=genai.protos.Type.INTEGER, description="Duration in minutes (default 30)"),
                        "attendees": genai.protos.Schema(
                            type=genai.protos.Type.ARRAY,
                            items=genai.protos.Schema(type=genai.protos.Type.STRING),
                            description="Email addresses of attendees",
                        ),
                        "attendee_name": genai.protos.Schema(type=genai.protos.Type.STRING, description="Name of the person scheduling"),
                        "description": genai.protos.Schema(type=genai.protos.Type.STRING, description="Event description"),
                    },
                    required=["start_time"],
                ),
            ),
            genai.protos.FunctionDeclaration(
                name="reschedule_event",
                description="Reschedule an existing calendar event to a new time.",
                parameters=genai.protos.Schema(
                    type=genai.protos.Type.OBJECT,
                    properties={
                        "event_id": genai.protos.Schema(type=genai.protos.Type.STRING, description="The event ID to reschedule"),
                        "new_start_time": genai.protos.Schema(type=genai.protos.Type.STRING, description="New start time in ISO 8601 format"),
                        "duration_minutes": genai.protos.Schema(type=genai.protos.Type.INTEGER, description="Duration in minutes (default 30)"),
                    },
                    required=["event_id", "new_start_time"],
                ),
            ),
            genai.protos.FunctionDeclaration(
                name="cancel_event",
                description="Cancel/delete an existing calendar event.",
                parameters=genai.protos.Schema(
                    type=genai.protos.Type.OBJECT,
                    properties={
                        "event_id": genai.protos.Schema(type=genai.protos.Type.STRING, description="The event ID to cancel"),
                        "notify_attendees": genai.protos.Schema(type=genai.protos.Type.BOOLEAN, description="Whether to notify attendees (default true)"),
                    },
                    required=["event_id"],
                ),
            ),
        ]
    )
]

SLACK_ADDENDUM = """

## Slack-Specific Guidelines
- You are communicating via text in Slack — do NOT reference voice, speaking, or audio
- Use Slack markdown: *bold*, _italic_, `code`, > blockquote
- Use bullet points and line breaks for readability
- Keep responses concise — Slack messages should be scannable
- When presenting time slots, format as a numbered list
- Include links as <URL|display text> format for Meet links
"""


def _get_slack_system_prompt() -> str:
    return get_system_prompt() + SLACK_ADDENDUM


def _invoke_graph(input_state: dict) -> dict:
    return scheduling_graph.invoke(input_state)


def execute_tool(name: str, args: dict) -> dict:
    """Execute a scheduling tool by invoking the LangGraph scheduling graph."""
    logger.info(f"Slack agent calling tool: {name} with args: {args}")

    action_map = {
        "check_availability": "check_availability",
        "create_event": "create_event",
        "reschedule_event": "reschedule_event",
        "cancel_event": "cancel_event",
    }

    action = action_map.get(name)
    if not action:
        return {"error": f"Unknown tool: {name}"}

    input_state: dict = {
        "action": action,
        "timezone": settings.default_timezone,
    }

    if action == "check_availability":
        input_state["date"] = args["date"]
        input_state["end_date"] = args.get("end_date", "")
        input_state["duration_minutes"] = args.get("duration_minutes", 30)
        input_state["time_preference"] = args.get("time_preference", "any")
        input_state["attendees"] = args.get("attendees", [])
        input_state["num_suggestions"] = args.get("num_suggestions", 5)

    elif action == "create_event":
        input_state["title"] = args.get("title", "Meeting")
        input_state["start_time"] = args["start_time"]
        input_state["duration_minutes"] = args.get("duration_minutes", 30)
        input_state["attendees"] = args.get("attendees", [])
        description = args.get("description", "")
        attendee_name = args.get("attendee_name", "")
        if attendee_name and not description:
            description = f"Scheduled by {attendee_name} via CadenceAI Slack"
        elif attendee_name:
            description = f"{description}\n\nScheduled by {attendee_name} via CadenceAI Slack"
        input_state["description"] = description

    elif action == "reschedule_event":
        input_state["event_id"] = args["event_id"]
        input_state["start_time"] = args["new_start_time"]
        input_state["duration_minutes"] = args.get("duration_minutes", 30)

    elif action == "cancel_event":
        input_state["event_id"] = args["event_id"]
        input_state["notify_attendees"] = args.get("notify_attendees", True)

    try:
        state = _invoke_graph(input_state)
        result = state.get("result", {"error": "No result from graph"})
        error = state.get("error")

        if error:
            audit_log.log(name, args, {"error": error}, success=False)
            return {"error": error}

        audit_log.log(name, args, result)
        return result

    except Exception as e:
        logger.error(f"Tool execution error: {e}")
        audit_log.log(name, args, {"error": str(e)}, success=False)
        return {"error": str(e)}


async def process_message(user_id: str, text: str) -> str:
    """Process a Slack message through the Gemini agent with function calling."""
    genai.configure(api_key=settings.google_api_key)

    if user_id not in _conversations:
        _conversations[user_id] = []

    history = _conversations[user_id]

    model = genai.GenerativeModel(
        model_name="gemini-2.5-flash",
        system_instruction=_get_slack_system_prompt(),
        tools=SCHEDULING_TOOLS,
    )

    chat = model.start_chat(history=history)

    try:
        response = await asyncio.to_thread(chat.send_message, text)

        # Function calling loop
        while response.candidates and response.candidates[0].content.parts:
            function_calls = [
                part for part in response.candidates[0].content.parts
                if part.function_call.name
            ]

            if not function_calls:
                break

            function_responses = []
            for fc in function_calls:
                name = fc.function_call.name
                args = dict(fc.function_call.args) if fc.function_call.args else {}
                result = await asyncio.to_thread(execute_tool, name, args)
                function_responses.append(
                    genai.protos.Part(
                        function_response=genai.protos.FunctionResponse(
                            name=name,
                            response={"result": result},
                        )
                    )
                )

            response = await asyncio.to_thread(
                chat.send_message,
                genai.protos.Content(parts=function_responses),
            )

        # Extract text response
        response_text = ""
        for part in response.candidates[0].content.parts:
            if part.text:
                response_text += part.text

        # Save conversation history
        _conversations[user_id] = chat.history

        return response_text or "I processed your request but have no text response."

    except Exception as e:
        logger.error(f"Slack agent error for user {user_id}: {e}")
        return f"Sorry, I ran into an error: {str(e)}"


def clear_history(user_id: str) -> None:
    """Clear conversation history for a user."""
    _conversations.pop(user_id, None)
