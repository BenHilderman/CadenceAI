import pytest

from tools.calendar_client import _event_request_id, CalendarClient


class TestEventRequestId:
    """Tests for the deterministic request ID generator."""

    def test_deterministic_same_inputs(self):
        """Same inputs always produce the same request ID."""
        id1 = _event_request_id("Meeting", "2025-03-10T10:00:00")
        id2 = _event_request_id("Meeting", "2025-03-10T10:00:00")
        assert id1 == id2

    def test_different_titles_produce_different_ids(self):
        id1 = _event_request_id("Meeting", "2025-03-10T10:00:00")
        id2 = _event_request_id("Standup", "2025-03-10T10:00:00")
        assert id1 != id2

    def test_different_times_produce_different_ids(self):
        id1 = _event_request_id("Meeting", "2025-03-10T10:00:00")
        id2 = _event_request_id("Meeting", "2025-03-10T11:00:00")
        assert id1 != id2

    def test_attendees_affect_id(self):
        id1 = _event_request_id("Meeting", "2025-03-10T10:00:00", ["a@x.com"])
        id2 = _event_request_id("Meeting", "2025-03-10T10:00:00", ["b@x.com"])
        assert id1 != id2

    def test_attendee_order_does_not_matter(self):
        """Attendees are sorted, so order shouldn't affect the ID."""
        id1 = _event_request_id("Meeting", "2025-03-10T10:00:00", ["a@x.com", "b@x.com"])
        id2 = _event_request_id("Meeting", "2025-03-10T10:00:00", ["b@x.com", "a@x.com"])
        assert id1 == id2

    def test_none_attendees_same_as_empty(self):
        id1 = _event_request_id("Meeting", "2025-03-10T10:00:00", None)
        id2 = _event_request_id("Meeting", "2025-03-10T10:00:00", [])
        assert id1 == id2

    def test_prefix_is_cadence(self):
        rid = _event_request_id("Meeting", "2025-03-10T10:00:00")
        assert rid.startswith("cadence-")

    def test_id_has_expected_length(self):
        """cadence- prefix + 16 hex chars."""
        rid = _event_request_id("Meeting", "2025-03-10T10:00:00")
        assert len(rid) == len("cadence-") + 16


class TestMergeBusyBlocks:
    """Tests for CalendarClient._merge_busy_blocks (static method)."""

    def test_non_overlapping_blocks_unchanged(self):
        blocks = [
            {"start": "2025-03-10T09:00:00", "end": "2025-03-10T10:00:00"},
            {"start": "2025-03-10T11:00:00", "end": "2025-03-10T12:00:00"},
        ]
        merged = CalendarClient._merge_busy_blocks(blocks)
        assert len(merged) == 2

    def test_overlapping_blocks_merged(self):
        blocks = [
            {"start": "2025-03-10T09:00:00", "end": "2025-03-10T10:30:00"},
            {"start": "2025-03-10T10:00:00", "end": "2025-03-10T11:00:00"},
        ]
        merged = CalendarClient._merge_busy_blocks(blocks)
        assert len(merged) == 1
        assert merged[0]["start"] == "2025-03-10T09:00:00"
        assert merged[0]["end"] == "2025-03-10T11:00:00"

    def test_adjacent_blocks_merged(self):
        """Blocks where one ends exactly when the next starts get merged."""
        blocks = [
            {"start": "2025-03-10T09:00:00", "end": "2025-03-10T10:00:00"},
            {"start": "2025-03-10T10:00:00", "end": "2025-03-10T11:00:00"},
        ]
        merged = CalendarClient._merge_busy_blocks(blocks)
        assert len(merged) == 1
        assert merged[0]["end"] == "2025-03-10T11:00:00"

    def test_unsorted_input_still_merges(self):
        """Blocks given out of order are sorted first."""
        blocks = [
            {"start": "2025-03-10T14:00:00", "end": "2025-03-10T15:00:00"},
            {"start": "2025-03-10T09:00:00", "end": "2025-03-10T10:00:00"},
        ]
        merged = CalendarClient._merge_busy_blocks(blocks)
        assert len(merged) == 2
        assert merged[0]["start"] == "2025-03-10T09:00:00"

    def test_nested_block_absorbed(self):
        """A block entirely within another is absorbed."""
        blocks = [
            {"start": "2025-03-10T09:00:00", "end": "2025-03-10T12:00:00"},
            {"start": "2025-03-10T10:00:00", "end": "2025-03-10T11:00:00"},
        ]
        merged = CalendarClient._merge_busy_blocks(blocks)
        assert len(merged) == 1
        assert merged[0]["end"] == "2025-03-10T12:00:00"

    def test_single_block_returns_itself(self):
        blocks = [{"start": "2025-03-10T09:00:00", "end": "2025-03-10T10:00:00"}]
        merged = CalendarClient._merge_busy_blocks(blocks)
        assert len(merged) == 1

    def test_three_overlapping_merge_to_one(self):
        blocks = [
            {"start": "2025-03-10T09:00:00", "end": "2025-03-10T10:30:00"},
            {"start": "2025-03-10T10:00:00", "end": "2025-03-10T11:30:00"},
            {"start": "2025-03-10T11:00:00", "end": "2025-03-10T12:00:00"},
        ]
        merged = CalendarClient._merge_busy_blocks(blocks)
        assert len(merged) == 1
        assert merged[0]["start"] == "2025-03-10T09:00:00"
        assert merged[0]["end"] == "2025-03-10T12:00:00"
