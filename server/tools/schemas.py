from pipecat.adapters.schemas.function_schema import FunctionSchema
from pipecat.adapters.schemas.tools_schema import ToolsSchema

check_availability_schema = FunctionSchema(
    name="check_availability",
    description="Check calendar availability for a specific date (or date range) and find the best meeting slots. Call this before booking any meeting. Supports checking multiple attendee calendars for mutual availability.",
    properties={
        "date": {
            "type": "string",
            "description": "The start date to check in YYYY-MM-DD format",
        },
        "end_date": {
            "type": "string",
            "description": "End date for multi-day range in YYYY-MM-DD format. If omitted, checks single day only.",
        },
        "duration_minutes": {
            "type": "integer",
            "description": "Meeting duration in minutes. Default 30.",
        },
        "time_preference": {
            "type": "string",
            "enum": ["morning", "afternoon", "evening", "any"],
            "description": "Preferred time of day. Default 'any'.",
        },
        "attendees": {
            "type": "array",
            "items": {"type": "string"},
            "description": "List of attendee email addresses to check for mutual availability. Optional.",
        },
        "num_suggestions": {
            "type": "integer",
            "description": "Number of slot suggestions to return. Default 5.",
        },
    },
    required=["date"],
)

create_event_schema = FunctionSchema(
    name="create_event",
    description="Create a calendar event with a Google Meet link.",
    properties={
        "title": {
            "type": "string",
            "description": "Event title. Default 'Meeting'.",
        },
        "start_time": {
            "type": "string",
            "description": "Event start time in ISO 8601 format (e.g. 2024-01-15T10:00:00)",
        },
        "duration_minutes": {
            "type": "integer",
            "description": "Event duration in minutes. Default 30.",
        },
        "attendees": {
            "type": "array",
            "items": {"type": "string"},
            "description": "List of attendee email addresses. Optional.",
        },
        "attendee_name": {
            "type": "string",
            "description": "Name of the person scheduling the meeting. Included in event description.",
        },
        "description": {
            "type": "string",
            "description": "Event description. Optional.",
        },
    },
    required=["start_time"],
)

reschedule_event_schema = FunctionSchema(
    name="reschedule_event",
    description="Reschedule an existing calendar event to a new time. Verifies the new slot is free before updating.",
    properties={
        "event_id": {
            "type": "string",
            "description": "The ID of the event to reschedule.",
        },
        "new_start_time": {
            "type": "string",
            "description": "The new start time in ISO 8601 format (e.g. 2024-01-15T14:00:00)",
        },
        "duration_minutes": {
            "type": "integer",
            "description": "New duration in minutes. If omitted, keeps the original duration.",
        },
    },
    required=["event_id", "new_start_time"],
)

cancel_event_schema = FunctionSchema(
    name="cancel_event",
    description="Cancel/delete an existing calendar event.",
    properties={
        "event_id": {
            "type": "string",
            "description": "The ID of the event to cancel.",
        },
        "notify_attendees": {
            "type": "boolean",
            "description": "Whether to send cancellation notifications to attendees. Default true.",
        },
    },
    required=["event_id"],
)

scheduling_tools = ToolsSchema(
    standard_tools=[
        check_availability_schema,
        create_event_schema,
        reschedule_event_schema,
        cancel_event_schema,
    ]
)
