from graph.state import SchedulingState


def route_action(state: SchedulingState) -> str:
    """Route to the correct subgraph based on action."""
    action = state["action"]
    if action == "check_availability":
        return "fetch_busy"
    if action == "reschedule_event":
        return "verify_free"
    if action == "cancel_event":
        return "cancel_event"
    # create_event: verify the slot is free before booking
    return "verify_free"


def check_verification(state: SchedulingState) -> str:
    """Route based on whether the slot is free."""
    if state.get("is_slot_free", False):
        # Determine which action to take based on the original action
        action = state.get("action", "create_event")
        if action == "reschedule_event":
            return "reschedule_event"
        return "book_event"
    return "return_error"
