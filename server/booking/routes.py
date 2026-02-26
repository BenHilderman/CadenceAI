import asyncio
from datetime import datetime

from fastapi import APIRouter, HTTPException, Query
from loguru import logger
from pydantic import BaseModel, EmailStr

from config import settings
from graph.scheduling_graph import scheduling_graph
from utils.audit import audit_log

router = APIRouter(prefix="/api/booking", tags=["booking"])

VALID_SLUGS = {"ben", "demo", "cadence"}

SLUG_PROFILES = {
    "ben": {
        "name": "Ben",
        "timezone": settings.default_timezone,
        "durations": [15, 30, 60],
        "days_ahead": 14,
    },
    "demo": {
        "name": "CadenceAI Demo",
        "timezone": settings.default_timezone,
        "durations": [15, 30, 60],
        "days_ahead": 14,
    },
    "cadence": {
        "name": "Cadence",
        "timezone": settings.default_timezone,
        "durations": [15, 30],
        "days_ahead": 14,
    },
}


def _validate_slug(slug: str) -> None:
    if slug not in VALID_SLUGS:
        raise HTTPException(status_code=404, detail="Booking page not found")


def _invoke_graph(input_state: dict) -> dict:
    return scheduling_graph.invoke(input_state)


# --- Request / Response Models ---


class BookingCreateRequest(BaseModel):
    slug: str
    start_time: str
    duration_minutes: int = 30
    guest_name: str
    guest_email: str
    notes: str = ""


class SlotResponse(BaseModel):
    start_time: str
    end_time: str
    display_time: str
    score: float
    reason: str


class SlotsResponse(BaseModel):
    slots: list[SlotResponse]
    date: str
    duration_minutes: int


class BookingCreateResponse(BaseModel):
    success: bool
    event: dict | None = None
    error: str | None = None


class ProfileResponse(BaseModel):
    name: str
    timezone: str
    durations: list[int]
    days_ahead: int


# --- Endpoints ---


@router.get("/slots", response_model=SlotsResponse)
async def get_available_slots(
    date: str = Query(..., description="Date in YYYY-MM-DD format"),
    duration: int = Query(30, description="Meeting duration in minutes"),
    slug: str = Query("demo", description="Booking page slug"),
):
    _validate_slug(slug)

    try:
        datetime.strptime(date, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")

    logger.info(f"Booking slots requested: slug={slug}, date={date}, duration={duration}")

    try:
        state = await asyncio.to_thread(
            _invoke_graph,
            {
                "action": "check_availability",
                "date": date,
                "duration_minutes": duration,
                "time_preference": "any",
                "num_suggestions": 10,
                "timezone": settings.default_timezone,
            },
        )

        result = state.get("result", {})
        raw_slots = result.get("available_slots", [])

        slots = [
            SlotResponse(
                start_time=s["start_time"],
                end_time=s["end_time"],
                display_time=s["display_time"],
                score=s.get("score", 0),
                reason=s.get("reason", ""),
            )
            for s in raw_slots
        ]

        return SlotsResponse(slots=slots, date=date, duration_minutes=duration)

    except Exception as e:
        logger.error(f"Booking slots error: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch available slots")


@router.post("/create", response_model=BookingCreateResponse)
async def create_booking(req: BookingCreateRequest):
    _validate_slug(req.slug)

    logger.info(f"Booking create: slug={req.slug}, time={req.start_time}, guest={req.guest_email}")

    description = f"Booked by {req.guest_name} via CadenceAI booking link"
    if req.notes:
        description += f"\n\nNotes: {req.notes}"

    try:
        state = await asyncio.to_thread(
            _invoke_graph,
            {
                "action": "create_event",
                "title": f"Meeting with {req.guest_name}",
                "start_time": req.start_time,
                "duration_minutes": req.duration_minutes,
                "attendees": [req.guest_email],
                "description": description,
                "timezone": settings.default_timezone,
            },
        )

        result = state.get("result", {})
        error = state.get("error")

        if error or not result.get("success", False):
            audit_log.log(
                "booking_create",
                {"slug": req.slug, "guest_email": req.guest_email},
                {"error": error or "Booking failed"},
                success=False,
            )
            return BookingCreateResponse(success=False, error=error or "Slot is no longer available")

        audit_log.log(
            "booking_create",
            {"slug": req.slug, "guest_email": req.guest_email, "start_time": req.start_time},
            result,
        )

        return BookingCreateResponse(success=True, event=result.get("event"))

    except Exception as e:
        logger.error(f"Booking create error: {e}")
        raise HTTPException(status_code=500, detail="Failed to create booking")


@router.get("/profile/{slug}", response_model=ProfileResponse)
async def get_profile(slug: str):
    _validate_slug(slug)

    profile = SLUG_PROFILES.get(slug, SLUG_PROFILES["demo"])
    return ProfileResponse(**profile)
