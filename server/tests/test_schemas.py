import pytest

from tools.schemas import (
    check_availability_schema,
    create_event_schema,
    reschedule_event_schema,
    cancel_event_schema,
    scheduling_tools,
)


class TestCheckAvailabilitySchema:
    def test_name(self):
        assert check_availability_schema.name == "check_availability"

    def test_has_description(self):
        assert check_availability_schema.description
        assert len(check_availability_schema.description) > 10

    def test_date_is_required(self):
        assert "date" in check_availability_schema.required

    def test_has_time_preference_property(self):
        assert "time_preference" in check_availability_schema.properties


class TestCreateEventSchema:
    def test_name(self):
        assert create_event_schema.name == "create_event"

    def test_start_time_is_required(self):
        assert "start_time" in create_event_schema.required

    def test_title_is_optional(self):
        assert "title" not in create_event_schema.required

    def test_duration_is_optional(self):
        assert "duration_minutes" not in create_event_schema.required

    def test_has_attendee_name_property(self):
        assert "attendee_name" in create_event_schema.properties


class TestRescheduleEventSchema:
    def test_name(self):
        assert reschedule_event_schema.name == "reschedule_event"

    def test_event_id_required(self):
        assert "event_id" in reschedule_event_schema.required

    def test_new_start_time_required(self):
        assert "new_start_time" in reschedule_event_schema.required

    def test_has_description(self):
        assert reschedule_event_schema.description
        assert "reschedule" in reschedule_event_schema.description.lower()


class TestCancelEventSchema:
    def test_name(self):
        assert cancel_event_schema.name == "cancel_event"

    def test_event_id_required(self):
        assert "event_id" in cancel_event_schema.required

    def test_notify_attendees_is_optional(self):
        assert "notify_attendees" not in cancel_event_schema.required

    def test_has_description(self):
        assert cancel_event_schema.description


class TestSchedulingTools:
    def test_has_four_tools(self):
        assert len(scheduling_tools.standard_tools) == 4

    def test_all_tools_have_names(self):
        for tool in scheduling_tools.standard_tools:
            assert tool.name

    def test_all_tools_have_descriptions(self):
        for tool in scheduling_tools.standard_tools:
            assert tool.description
