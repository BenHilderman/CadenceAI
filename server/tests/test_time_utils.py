import pytest
from datetime import datetime, time

from utils.time_utils import parse_date, format_time_12h, is_within_preference, WORK_HOURS, TIME_PREFERENCES


class TestParseDate:
    def test_parse_valid_date(self):
        dt = parse_date("2025-03-10")
        assert dt.year == 2025
        assert dt.month == 3
        assert dt.day == 10

    def test_parse_date_returns_datetime(self):
        result = parse_date("2025-01-01")
        assert isinstance(result, datetime)

    def test_parse_invalid_format_raises(self):
        with pytest.raises(ValueError):
            parse_date("March 10, 2025")

    def test_parse_date_leap_year(self):
        dt = parse_date("2024-02-29")
        assert dt.month == 2
        assert dt.day == 29

    def test_parse_date_end_of_year(self):
        dt = parse_date("2025-12-31")
        assert dt.month == 12
        assert dt.day == 31


class TestFormatTime12h:
    def test_format_morning(self):
        dt = datetime(2025, 3, 10, 9, 30)
        result = format_time_12h(dt)
        assert "9:30" in result
        assert "AM" in result

    def test_format_afternoon(self):
        dt = datetime(2025, 3, 10, 14, 0)
        result = format_time_12h(dt)
        assert "2:00" in result
        assert "PM" in result

    def test_format_noon(self):
        dt = datetime(2025, 3, 10, 12, 0)
        result = format_time_12h(dt)
        assert "12:00" in result
        assert "PM" in result

    def test_format_midnight(self):
        dt = datetime(2025, 3, 10, 0, 0)
        result = format_time_12h(dt)
        assert "12:00" in result
        assert "AM" in result


class TestIsWithinPreference:
    def test_morning_slot_in_morning(self):
        dt = datetime(2025, 3, 10, 9, 0)
        assert is_within_preference(dt, "morning") is True

    def test_afternoon_slot_not_in_morning(self):
        dt = datetime(2025, 3, 10, 14, 0)
        assert is_within_preference(dt, "morning") is False

    def test_evening_slot_in_evening(self):
        dt = datetime(2025, 3, 10, 18, 0)
        assert is_within_preference(dt, "evening") is True

    def test_any_preference_accepts_all(self):
        for hour in [7, 12, 17, 21]:
            dt = datetime(2025, 3, 10, hour, 0)
            assert is_within_preference(dt, "any") is True

    def test_unknown_preference_defaults_to_any(self):
        dt = datetime(2025, 3, 10, 10, 0)
        assert is_within_preference(dt, "nonexistent") is True

    def test_boundary_morning_start(self):
        dt = datetime(2025, 3, 10, 7, 0)
        assert is_within_preference(dt, "morning") is True

    def test_boundary_morning_end(self):
        dt = datetime(2025, 3, 10, 12, 0)
        assert is_within_preference(dt, "morning") is True


class TestConstants:
    def test_work_hours_start(self):
        assert WORK_HOURS["start"] == time(7, 0)

    def test_work_hours_end(self):
        assert WORK_HOURS["end"] == time(22, 0)

    def test_time_preferences_has_four_keys(self):
        assert set(TIME_PREFERENCES.keys()) == {"morning", "afternoon", "evening", "any"}
