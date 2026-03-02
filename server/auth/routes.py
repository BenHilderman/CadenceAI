import asyncio
import calendar
from datetime import datetime
from urllib.parse import urlencode
from zoneinfo import ZoneInfo

from fastapi import APIRouter
from fastapi.responses import RedirectResponse, JSONResponse
from loguru import logger
import requests as http_requests

from config import settings
from auth.sessions import create_session, get_session
from tools.calendar_client import CalendarClient

router = APIRouter(prefix="/api/auth", tags=["auth"])

SCOPES = [
    "https://www.googleapis.com/auth/calendar",
    "https://www.googleapis.com/auth/userinfo.email",
    "openid",
]

GOOGLE_AUTH_URI = "https://accounts.google.com/o/oauth2/auth"
GOOGLE_TOKEN_URI = "https://oauth2.googleapis.com/token"


@router.get("/google")
async def google_login():
    params = {
        "client_id": settings.google_client_id,
        "redirect_uri": settings.auth_redirect_uri,
        "response_type": "code",
        "scope": " ".join(SCOPES),
        "access_type": "offline",
        "prompt": "consent",
        "include_granted_scopes": "true",
    }
    return RedirectResponse(f"{GOOGLE_AUTH_URI}?{urlencode(params)}")


@router.get("/callback")
async def google_callback(code: str):
    # Exchange auth code for tokens (no PKCE — server-side with client_secret)
    token_resp = http_requests.post(
        GOOGLE_TOKEN_URI,
        data={
            "code": code,
            "client_id": settings.google_client_id,
            "client_secret": settings.google_client_secret,
            "redirect_uri": settings.auth_redirect_uri,
            "grant_type": "authorization_code",
        },
        timeout=10,
    )
    token_resp.raise_for_status()
    tokens = token_resp.json()

    access_token = tokens["access_token"]
    refresh_token = tokens.get("refresh_token", "")

    # Fetch user email from Google userinfo
    userinfo_resp = http_requests.get(
        "https://www.googleapis.com/oauth2/v2/userinfo",
        headers={"Authorization": f"Bearer {access_token}"},
        timeout=10,
    )
    userinfo_resp.raise_for_status()
    email = userinfo_resp.json().get("email", "unknown")

    session_id = create_session(
        google_email=email,
        access_token=access_token,
        refresh_token=refresh_token,
        token_expiry=None,
    )

    logger.info(f"OAuth complete for {email}, session created")
    return RedirectResponse(f"{settings.frontend_url}/demo?session={session_id}")


@router.get("/me")
async def auth_me(session: str):
    user_session = get_session(session)
    if user_session is None:
        return JSONResponse(
            status_code=401,
            content={"authenticated": False, "error": "Invalid or expired session"},
        )
    return {"authenticated": True, "email": user_session.google_email}


def _fetch_month_events(
    access_token: str, refresh_token: str, year: int, month: int
) -> dict:
    """Blocking call — run via asyncio.to_thread."""
    tz = settings.default_timezone
    zi = ZoneInfo(tz)

    first_day = datetime(year, month, 1, tzinfo=zi)
    last_day_num = calendar.monthrange(year, month)[1]
    last_day = datetime(year, month, last_day_num, 23, 59, 59, tzinfo=zi)

    client = CalendarClient(
        refresh_token=refresh_token,
        access_token=access_token,
    )

    result = (
        client.service.events()
        .list(
            calendarId=client.calendar_id,
            timeMin=first_day.isoformat(),
            timeMax=last_day.isoformat(),
            singleEvents=True,
            orderBy="startTime",
            maxResults=250,
            timeZone=tz,
        )
        .execute()
    )

    events_by_date: dict[str, list[dict]] = {}
    for event in result.get("items", []):
        start = event.get("start", {})
        end = event.get("end", {})

        all_day = "date" in start and "dateTime" not in start
        start_val = start.get("dateTime", start.get("date", ""))
        end_val = end.get("dateTime", end.get("date", ""))
        date_key = start_val[:10]

        if date_key not in events_by_date:
            events_by_date[date_key] = []

        events_by_date[date_key].append(
            {
                "id": event["id"],
                "title": event.get("summary", "Untitled"),
                "start": start_val,
                "end": end_val,
                "all_day": all_day,
            }
        )

    return {"year": year, "month": month, "events_by_date": events_by_date}


@router.get("/calendar/month")
async def calendar_month(session: str, year: int, month: int):
    user_session = get_session(session)
    if user_session is None:
        return JSONResponse(
            status_code=401,
            content={"error": "Invalid or expired session"},
        )

    if not (1 <= month <= 12):
        return JSONResponse(status_code=400, content={"error": "Invalid month"})

    try:
        data = await asyncio.to_thread(
            _fetch_month_events,
            user_session.access_token,
            user_session.refresh_token,
            year,
            month,
        )
        return data
    except Exception as e:
        logger.error(f"Failed to fetch month events: {e}")
        return JSONResponse(
            status_code=500,
            content={"error": "Failed to fetch calendar events"},
        )
