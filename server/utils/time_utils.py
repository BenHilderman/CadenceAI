from datetime import datetime, time


WORK_HOURS = {
    "start": time(8, 0),
    "end": time(18, 0),
}

TIME_PREFERENCES = {
    "morning": (time(8, 0), time(12, 0)),
    "afternoon": (time(12, 0), time(17, 0)),
    "evening": (time(17, 0), time(20, 0)),
    "any": (time(8, 0), time(18, 0)),
}


def parse_date(date_str: str) -> datetime:
    """Parse a YYYY-MM-DD date string."""
    return datetime.strptime(date_str, "%Y-%m-%d")


def format_time_12h(dt: datetime) -> str:
    """Format datetime to 12-hour time string."""
    return dt.strftime("%-I:%M %p")


def is_within_preference(dt: datetime, preference: str) -> bool:
    """Check if a datetime falls within a time preference window."""
    start, end = TIME_PREFERENCES.get(preference, TIME_PREFERENCES["any"])
    return start <= dt.time() <= end
