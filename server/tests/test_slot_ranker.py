import pytest

from utils.slot_ranker import compute_free_slots, rank_slots


class TestComputeFreeSlots:
    """Tests for compute_free_slots utility."""

    def test_empty_day_returns_full_window(self):
        """Empty day → one big 7am-10pm slot."""
        slots = compute_free_slots("2025-03-10", [], 30, "America/Toronto")
        assert len(slots) == 1
        assert slots[0]["start"] == "2025-03-10T07:00:00"
        assert slots[0]["end"] == "2025-03-10T22:00:00"

    def test_fully_busy_returns_empty(self):
        """Day fully blocked → no free slots."""
        busy = [{"start": "2025-03-10T06:00:00", "end": "2025-03-10T23:00:00"}]
        slots = compute_free_slots("2025-03-10", busy, 30, "America/Toronto")
        assert len(slots) == 0

    def test_single_midday_meeting_returns_two_slots(self):
        """Single mid-day meeting → two free slots (before and after)."""
        busy = [{"start": "2025-03-10T12:00:00", "end": "2025-03-10T13:00:00"}]
        slots = compute_free_slots("2025-03-10", busy, 30, "America/Toronto")
        assert len(slots) == 2
        # Morning slot: 7am - 12pm
        assert slots[0]["start"] == "2025-03-10T07:00:00"
        assert slots[0]["end"] == "2025-03-10T12:00:00"
        # Afternoon slot: 1pm - 10pm
        assert slots[1]["start"] == "2025-03-10T13:00:00"
        assert slots[1]["end"] == "2025-03-10T22:00:00"

    def test_duration_filtering_excludes_short_gaps(self):
        """Short gaps smaller than duration → excluded."""
        busy = [
            {"start": "2025-03-10T10:00:00", "end": "2025-03-10T10:20:00"},
            {"start": "2025-03-10T10:30:00", "end": "2025-03-10T17:50:00"},
        ]
        # 10-minute gap (10:20-10:30) is too short for a 30-min meeting
        slots = compute_free_slots("2025-03-10", busy, 30, "America/Toronto")
        # Should have the morning slot (7am-10am) and evening slot (17:50-22:00)
        starts = [s["start"] for s in slots]
        assert "2025-03-10T07:00:00" in starts
        # The 10-min gap should NOT produce a slot
        assert "2025-03-10T10:20:00" not in starts


class TestRankSlots:
    """Tests for rank_slots scoring algorithm."""

    def test_morning_preference_scores_morning_higher(self):
        """Morning preference → morning slots get +3 bonus."""
        free = [
            {"start": "2025-03-10T08:00:00", "end": "2025-03-10T12:00:00"},
            {"start": "2025-03-10T14:00:00", "end": "2025-03-10T18:00:00"},
        ]
        ranked = rank_slots(free, 30, time_preference="morning", num_suggestions=10)
        # Top slot should be in the morning
        assert "08:" in ranked[0]["start_time"] or "09:" in ranked[0]["start_time"] or "10:" in ranked[0]["start_time"] or "11:" in ranked[0]["start_time"]
        # Morning slots should have higher scores than afternoon
        morning_scores = [s["score"] for s in ranked if "T08:" in s["start_time"] or "T09:" in s["start_time"] or "T10:" in s["start_time"] or "T11:" in s["start_time"]]
        afternoon_scores = [s["score"] for s in ranked if "T14:" in s["start_time"] or "T15:" in s["start_time"] or "T16:" in s["start_time"]]
        if morning_scores and afternoon_scores:
            assert max(morning_scores) > max(afternoon_scores)

    def test_buffer_scoring(self):
        """Slots with 30+ min buffer both sides get +2."""
        free = [
            {"start": "2025-03-10T09:00:00", "end": "2025-03-10T12:00:00"},
        ]
        ranked = rank_slots(free, 30, time_preference="any", num_suggestions=20)
        # 10:00 AM has 60min before and 90min after → should get buffer bonus
        slot_10am = next((s for s in ranked if "T10:00" in s["start_time"]), None)
        assert slot_10am is not None
        assert slot_10am["score"] >= 2.0  # At least buffer bonus

    def test_lunch_overlap_loses_bonus(self):
        """Slots overlapping 12:00-1:00 PM lose the lunch protection bonus."""
        free = [
            {"start": "2025-03-10T11:00:00", "end": "2025-03-10T14:00:00"},
        ]
        ranked = rank_slots(free, 60, time_preference="any", num_suggestions=20)
        # 12:00 PM (overlaps lunch) should have lower score than 11:00 AM
        slot_noon = next((s for s in ranked if "T12:00" in s["start_time"]), None)
        slot_11am = next((s for s in ranked if "T11:00" in s["start_time"]), None)
        if slot_noon and slot_11am:
            assert slot_11am["score"] >= slot_noon["score"]

    def test_edge_of_day_penalty(self):
        """Slots at edge of work hours get -0.5 penalty."""
        free = [
            {"start": "2025-03-10T08:00:00", "end": "2025-03-10T18:00:00"},
        ]
        ranked = rank_slots(free, 30, time_preference="any", num_suggestions=30)
        # 8:00 AM (edge) should have lower score than 10:00 AM (non-edge)
        slot_8am = next((s for s in ranked if "T08:00" in s["start_time"]), None)
        slot_10am = next((s for s in ranked if "T10:00" in s["start_time"]), None)
        if slot_8am and slot_10am:
            assert slot_10am["score"] > slot_8am["score"]

    def test_num_suggestions_limit(self):
        """num_suggestions limits the number of returned slots."""
        free = [
            {"start": "2025-03-10T08:00:00", "end": "2025-03-10T18:00:00"},
        ]
        ranked = rank_slots(free, 30, num_suggestions=3)
        assert len(ranked) == 3

    def test_sort_order_score_desc_time_asc(self):
        """Slots sorted by score (desc), then time (asc) for ties."""
        free = [
            {"start": "2025-03-10T08:00:00", "end": "2025-03-10T18:00:00"},
        ]
        ranked = rank_slots(free, 30, num_suggestions=10)
        # Check that scores are non-increasing
        for i in range(len(ranked) - 1):
            assert ranked[i]["score"] >= ranked[i + 1]["score"]
        # For same score, earlier time first
        for i in range(len(ranked) - 1):
            if ranked[i]["score"] == ranked[i + 1]["score"]:
                assert ranked[i]["start_time"] <= ranked[i + 1]["start_time"]
