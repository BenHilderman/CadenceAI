import pytest

from graph.edges import route_action, check_verification


class TestRouteAction:
    """Tests for the route_action conditional entry point."""

    def test_check_availability_routes_to_fetch_busy(self):
        state = {"action": "check_availability"}
        assert route_action(state) == "fetch_busy"

    def test_create_event_routes_to_book_event(self):
        state = {"action": "create_event"}
        assert route_action(state) == "book_event"

    def test_reschedule_event_routes_to_verify_free(self):
        state = {"action": "reschedule_event"}
        assert route_action(state) == "verify_free"

    def test_cancel_event_routes_to_cancel_event(self):
        state = {"action": "cancel_event"}
        assert route_action(state) == "cancel_event"

    def test_unknown_action_defaults_to_book_event(self):
        """Any unrecognized action falls through to book_event."""
        state = {"action": "unknown_action"}
        assert route_action(state) == "book_event"


class TestCheckVerification:
    """Tests for the check_verification conditional edge."""

    def test_free_slot_with_create_routes_to_book(self):
        state = {"is_slot_free": True, "action": "create_event"}
        assert check_verification(state) == "book_event"

    def test_free_slot_with_reschedule_routes_to_reschedule(self):
        state = {"is_slot_free": True, "action": "reschedule_event"}
        assert check_verification(state) == "reschedule_event"

    def test_busy_slot_routes_to_return_error(self):
        state = {"is_slot_free": False, "action": "create_event"}
        assert check_verification(state) == "return_error"

    def test_missing_is_slot_free_defaults_to_error(self):
        """When is_slot_free is absent, default (False) → return_error."""
        state = {"action": "create_event"}
        assert check_verification(state) == "return_error"

    def test_free_slot_default_action_routes_to_book(self):
        """When action is missing, defaults to create_event → book_event."""
        state = {"is_slot_free": True}
        assert check_verification(state) == "book_event"
