from datetime import datetime, timedelta, time as dt_time

from utils.time_utils import WORK_HOURS, TIME_PREFERENCES, format_time_12h

LUNCH_START = dt_time(12, 0)
LUNCH_END = dt_time(13, 0)
FATIGUE_THRESHOLD = 3


def compute_free_slots(
    date: str,
    busy_times: list[dict],
    duration_minutes: int,
    timezone: str,
) -> list[dict]:
    """Compute available slots for a given date."""
    day_start = datetime.fromisoformat(f"{date}T{WORK_HOURS['start'].isoformat()}")
    day_end = datetime.fromisoformat(f"{date}T{WORK_HOURS['end'].isoformat()}")
    duration = timedelta(minutes=duration_minutes)

    busy = []
    for b in busy_times:
        start = datetime.fromisoformat(b["start"].replace("Z", "+00:00")).replace(tzinfo=None)
        end = datetime.fromisoformat(b["end"].replace("Z", "+00:00")).replace(tzinfo=None)
        busy.append((start, end))
    busy.sort(key=lambda x: x[0])

    free_slots = []
    current = day_start

    for busy_start, busy_end in busy:
        if current + duration <= busy_start:
            free_slots.append(
                {"start": current.isoformat(), "end": busy_start.isoformat()}
            )
        current = max(current, busy_end)

    if current + duration <= day_end:
        free_slots.append({"start": current.isoformat(), "end": day_end.isoformat()})

    return free_slots


def _count_meetings_on_day(busy_times: list[dict], date_str: str) -> int:
    """Count discrete busy blocks on a specific day."""
    count = 0
    for b in busy_times:
        if b.get("start", "")[:10] == date_str:
            count += 1
    return count


def _has_focus_block(candidate_start: datetime, candidate_end: datetime,
                     busy_times: list[dict], date_str: str) -> bool:
    """Check if scheduling here preserves a 2+ hour uninterrupted block elsewhere in the day."""
    day_start = datetime.fromisoformat(f"{date_str}T{WORK_HOURS['start'].isoformat()}")
    day_end = datetime.fromisoformat(f"{date_str}T{WORK_HOURS['end'].isoformat()}")

    # Build list of all occupied blocks (existing + proposed)
    blocks = []
    for b in busy_times:
        if b.get("start", "")[:10] == date_str:
            bs = datetime.fromisoformat(b["start"].replace("Z", "+00:00")).replace(tzinfo=None)
            be = datetime.fromisoformat(b["end"].replace("Z", "+00:00")).replace(tzinfo=None)
            blocks.append((bs, be))
    blocks.append((candidate_start, candidate_end))
    blocks.sort(key=lambda x: x[0])

    # Find largest gap
    current = day_start
    max_gap_minutes = 0
    for block_start, block_end in blocks:
        gap = (block_start - current).total_seconds() / 60
        if gap > max_gap_minutes:
            max_gap_minutes = gap
        current = max(current, block_end)
    # Check gap after last block
    final_gap = (day_end - current).total_seconds() / 60
    if final_gap > max_gap_minutes:
        max_gap_minutes = final_gap

    return max_gap_minutes >= 120


def rank_slots(
    free_slots: list[dict],
    duration_minutes: int,
    time_preference: str = "any",
    busy_times: list[dict] | None = None,
    num_suggestions: int = 5,
) -> list[dict]:
    """Rank free slots and return top N candidate meeting times.

    Scoring (7 factors):
        +3.0: matches time preference
        +2.0: 30+ min buffer both sides
        +1.0: 15+ min buffer at least one side
        +1.5: focus time protection (preserves a 2+ hour uninterrupted block)
        +1.0: lunch protection (doesn't overlap 12:00-1:00 PM)
        -0.5: edge of work hours
        -1.0: meeting fatigue (3+ meetings already that day, penalize adjacent slots)
    """
    duration = timedelta(minutes=duration_minutes)
    pref_start, pref_end = TIME_PREFERENCES.get(
        time_preference, TIME_PREFERENCES["any"]
    )
    busy_times = busy_times or []

    candidates = []

    for i, slot in enumerate(free_slots):
        slot_start = datetime.fromisoformat(slot["start"])
        slot_end = datetime.fromisoformat(slot["end"])
        date_str = slot.get("date", slot["start"][:10])

        candidate = slot_start
        while candidate + duration <= slot_end:
            score = 0.0
            reasons = []
            candidate_end = candidate + duration

            # 1. Time preference match (+3)
            if pref_start <= candidate.time() <= pref_end:
                score += 3
                reasons.append(f"matches {time_preference} preference")

            # 2. Buffer scoring (+2 or +1)
            buffer_before = (candidate - slot_start).total_seconds() / 60
            buffer_after = (slot_end - candidate_end).total_seconds() / 60
            if buffer_before >= 30 and buffer_after >= 30:
                score += 2
                reasons.append("good buffer around meeting")
            elif buffer_before >= 15 or buffer_after >= 15:
                score += 1
                reasons.append("some buffer available")

            # 3. Focus time protection (+1.5)
            if _has_focus_block(candidate, candidate_end, busy_times, date_str):
                score += 1.5
                reasons.append("preserves focus time block")

            # 4. Lunch protection (+1)
            overlaps_lunch = (
                candidate.time() < LUNCH_END and candidate_end.time() > LUNCH_START
            )
            if not overlaps_lunch:
                score += 1
                reasons.append("doesn't overlap lunch")

            # 5. Edge-of-day penalty (-0.5)
            if candidate.time() <= WORK_HOURS["start"] or candidate_end.time() >= WORK_HOURS["end"]:
                score -= 0.5
                reasons.append("edge of work hours")

            # 6. Meeting fatigue penalty (-1)
            day_meeting_count = _count_meetings_on_day(busy_times, date_str)
            if day_meeting_count >= FATIGUE_THRESHOLD:
                # Check if adjacent to an existing meeting (within 15 min)
                is_adjacent = False
                for b in busy_times:
                    if b.get("start", "")[:10] != date_str:
                        continue
                    bs = datetime.fromisoformat(b["start"].replace("Z", "+00:00")).replace(tzinfo=None)
                    be = datetime.fromisoformat(b["end"].replace("Z", "+00:00")).replace(tzinfo=None)
                    if abs((candidate - be).total_seconds()) < 900 or abs((bs - candidate_end).total_seconds()) < 900:
                        is_adjacent = True
                        break
                if is_adjacent:
                    score -= 1
                    reasons.append("heavy meeting day — adjacent to existing meeting")

            display_date = ""
            if slot.get("date"):
                display_date = f"{slot['date']} "

            candidates.append({
                "start_time": candidate.isoformat(),
                "end_time": candidate_end.isoformat(),
                "display_time": f"{display_date}{format_time_12h(candidate)}",
                "date": date_str,
                "score": round(score, 1),
                "reason": "; ".join(reasons) if reasons else "available slot",
            })

            candidate += timedelta(minutes=15)

    candidates.sort(key=lambda x: (-x["score"], x["start_time"]))

    return candidates[:num_suggestions]
