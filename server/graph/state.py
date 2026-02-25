from typing import TypedDict, Literal


class SchedulingState(TypedDict, total=False):
    action: Literal["check_availability", "create_event", "reschedule_event", "cancel_event"]
    # Input params
    date: str
    end_date: str
    duration_minutes: int
    time_preference: str
    num_suggestions: int
    title: str
    start_time: str
    attendees: list[str]
    description: str
    timezone: str
    # Reschedule/cancel params
    event_id: str
    notify_attendees: bool
    # Intermediate
    busy_times: list[dict]
    free_slots: list[dict]
    ranked_slots: list[dict]
    is_slot_free: bool
    # Output
    result: dict
    error: str | None
