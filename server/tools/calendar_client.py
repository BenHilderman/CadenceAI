from datetime import datetime, timedelta

from google.auth.transport.requests import Request
from google.auth.exceptions import RefreshError
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from loguru import logger

from config import settings

TOKEN_URI = "https://oauth2.googleapis.com/token"
REQUEST_TIMEOUT = 10


class CalendarClient:
    def __init__(self):
        self.credentials = Credentials(
            token=None,
            refresh_token=settings.google_refresh_token,
            token_uri=TOKEN_URI,
            client_id=settings.google_client_id,
            client_secret=settings.google_client_secret,
        )
        self._refresh_credentials()
        self.service = build("calendar", "v3", credentials=self.credentials)
        self.calendar_id = settings.google_calendar_id
        logger.info("Google Calendar client initialized")

    def _refresh_credentials(self):
        """Refresh OAuth2 credentials, handling full re-auth if refresh fails."""
        try:
            self.credentials.refresh(Request())
        except RefreshError as e:
            logger.error(f"Token refresh failed, attempting full re-initialization: {e}")
            self.credentials = Credentials(
                token=None,
                refresh_token=settings.google_refresh_token,
                token_uri=TOKEN_URI,
                client_id=settings.google_client_id,
                client_secret=settings.google_client_secret,
            )
            self.credentials.refresh(Request())

    def _ensure_valid_credentials(self):
        """Ensure credentials are valid, refreshing if needed."""
        if not self.credentials.valid:
            self._refresh_credentials()

    def get_busy_times(
        self, date: str, timezone: str | None = None, calendar_ids: list[str] | None = None
    ) -> list[dict]:
        """Get busy time blocks for a given date across one or more calendars."""
        self._ensure_valid_credentials()
        tz = timezone or settings.default_timezone

        ids = [self.calendar_id]
        if calendar_ids:
            ids.extend(cid for cid in calendar_ids if cid not in ids)

        body = {
            "timeMin": f"{date}T00:00:00",
            "timeMax": f"{date}T23:59:59",
            "timeZone": tz,
            "items": [{"id": cid} for cid in ids],
        }

        result = self.service.freebusy().query(body=body).execute()

        all_busy = []
        for cid in ids:
            cal_data = result.get("calendars", {}).get(cid, {})
            if cal_data.get("errors"):
                logger.warning(f"Calendar {cid} returned errors: {cal_data['errors']}")
            cal_busy = cal_data.get("busy", [])
            all_busy.extend(cal_busy)

        if len(ids) > 1 and all_busy:
            all_busy = self._merge_busy_blocks(all_busy)

        logger.info(f"Found {len(all_busy)} busy blocks on {date} across {len(ids)} calendar(s)")
        return all_busy

    def get_busy_times_range(
        self, start_date: str, end_date: str, timezone: str | None = None,
        calendar_ids: list[str] | None = None
    ) -> dict[str, list[dict]]:
        """Get busy time blocks across a date range. Returns {date: [busy_blocks]}."""
        self._ensure_valid_credentials()
        tz = timezone or settings.default_timezone

        ids = [self.calendar_id]
        if calendar_ids:
            ids.extend(cid for cid in calendar_ids if cid not in ids)

        body = {
            "timeMin": f"{start_date}T00:00:00",
            "timeMax": f"{end_date}T23:59:59",
            "timeZone": tz,
            "items": [{"id": cid} for cid in ids],
        }

        result = self.service.freebusy().query(body=body).execute()

        all_busy = []
        for cid in ids:
            cal_data = result.get("calendars", {}).get(cid, {})
            cal_busy = cal_data.get("busy", [])
            all_busy.extend(cal_busy)

        if len(ids) > 1 and all_busy:
            all_busy = self._merge_busy_blocks(all_busy)

        # Group by date
        busy_by_date: dict[str, list[dict]] = {}
        start_dt = datetime.fromisoformat(start_date)
        end_dt = datetime.fromisoformat(end_date)
        current = start_dt
        while current <= end_dt:
            date_str = current.strftime("%Y-%m-%d")
            busy_by_date[date_str] = []
            current += timedelta(days=1)

        for block in all_busy:
            block_date = block["start"][:10]
            if block_date in busy_by_date:
                busy_by_date[block_date].append(block)

        logger.info(f"Found busy blocks across {len(busy_by_date)} days ({start_date} to {end_date})")
        return busy_by_date

    @staticmethod
    def _merge_busy_blocks(blocks: list[dict]) -> list[dict]:
        """Merge overlapping busy blocks into contiguous ranges."""
        sorted_blocks = sorted(blocks, key=lambda b: b["start"])
        merged = [sorted_blocks[0]]

        for block in sorted_blocks[1:]:
            if block["start"] <= merged[-1]["end"]:
                merged[-1]["end"] = max(merged[-1]["end"], block["end"])
            else:
                merged.append(block)

        return merged

    def create_event(
        self,
        title: str,
        start_time: str,
        duration_minutes: int,
        attendees: list[str] | None = None,
        description: str | None = None,
        timezone: str | None = None,
    ) -> dict:
        """Create a calendar event with Google Meet link."""
        self._ensure_valid_credentials()
        tz = timezone or settings.default_timezone

        start_dt = datetime.fromisoformat(start_time)
        end_dt = start_dt + timedelta(minutes=duration_minutes)

        event_body = {
            "summary": title,
            "start": {"dateTime": start_dt.isoformat(), "timeZone": tz},
            "end": {"dateTime": end_dt.isoformat(), "timeZone": tz},
            "conferenceData": {
                "createRequest": {
                    "requestId": f"cadence-{datetime.now().timestamp()}",
                    "conferenceSolutionKey": {"type": "hangoutsMeet"},
                }
            },
        }

        if attendees:
            event_body["attendees"] = [{"email": e} for e in attendees]

        if description:
            event_body["description"] = description

        event = (
            self.service.events()
            .insert(
                calendarId=self.calendar_id,
                body=event_body,
                conferenceDataVersion=1,
            )
            .execute()
        )

        logger.info(f"Created event: {event.get('summary')} at {event.get('start')}")
        return {
            "id": event["id"],
            "title": event.get("summary", title),
            "start": event["start"]["dateTime"],
            "end": event["end"]["dateTime"],
            "html_link": event.get("htmlLink", ""),
            "meet_link": event.get("hangoutLink", ""),
        }

    def get_event(self, event_id: str) -> dict:
        """Get a single event by ID."""
        self._ensure_valid_credentials()

        try:
            event = self.service.events().get(
                calendarId=self.calendar_id,
                eventId=event_id,
            ).execute()

            return {
                "id": event["id"],
                "title": event.get("summary", ""),
                "start": event.get("start", {}).get("dateTime", ""),
                "end": event.get("end", {}).get("dateTime", ""),
                "attendees": [a.get("email") for a in event.get("attendees", [])],
                "html_link": event.get("htmlLink", ""),
                "meet_link": event.get("hangoutLink", ""),
                "status": event.get("status", ""),
            }
        except HttpError as e:
            if e.resp.status == 404:
                raise ValueError(f"Event {event_id} not found") from e
            raise

    def update_event(
        self,
        event_id: str,
        start_time: str,
        duration_minutes: int,
        timezone: str | None = None,
    ) -> dict:
        """Update an existing event's time (reschedule)."""
        self._ensure_valid_credentials()
        tz = timezone or settings.default_timezone

        # Fetch the existing event first to preserve its data
        try:
            existing = self.service.events().get(
                calendarId=self.calendar_id,
                eventId=event_id,
            ).execute()
        except HttpError as e:
            if e.resp.status == 404:
                raise ValueError(f"Event {event_id} not found") from e
            raise

        start_dt = datetime.fromisoformat(start_time)
        end_dt = start_dt + timedelta(minutes=duration_minutes)

        existing["start"] = {"dateTime": start_dt.isoformat(), "timeZone": tz}
        existing["end"] = {"dateTime": end_dt.isoformat(), "timeZone": tz}

        updated = self.service.events().update(
            calendarId=self.calendar_id,
            eventId=event_id,
            body=existing,
        ).execute()

        logger.info(f"Updated event {event_id}: {updated.get('summary')} -> {start_time}")
        return {
            "id": updated["id"],
            "title": updated.get("summary", ""),
            "start": updated["start"]["dateTime"],
            "end": updated["end"]["dateTime"],
            "html_link": updated.get("htmlLink", ""),
            "meet_link": updated.get("hangoutLink", ""),
        }

    def delete_event(self, event_id: str, notify_attendees: bool = True) -> dict:
        """Delete/cancel a calendar event."""
        self._ensure_valid_credentials()

        # Fetch event info before deleting for the response
        try:
            event = self.service.events().get(
                calendarId=self.calendar_id,
                eventId=event_id,
            ).execute()
            event_title = event.get("summary", "Untitled")
            event_start = event.get("start", {}).get("dateTime", "")
        except HttpError as e:
            if e.resp.status == 404:
                raise ValueError(f"Event {event_id} not found") from e
            raise

        send_updates = "all" if notify_attendees else "none"

        self.service.events().delete(
            calendarId=self.calendar_id,
            eventId=event_id,
            sendUpdates=send_updates,
        ).execute()

        logger.info(f"Deleted event {event_id}: {event_title}")
        return {
            "id": event_id,
            "title": event_title,
            "start": event_start,
            "cancelled": True,
            "notified_attendees": notify_attendees,
        }

    def list_upcoming_events(self, date: str, n: int = 10, timezone: str | None = None) -> list[dict]:
        """List upcoming events for a given date."""
        self._ensure_valid_credentials()
        tz = timezone or settings.default_timezone

        time_min = f"{date}T00:00:00"
        time_max = f"{date}T23:59:59"

        result = self.service.events().list(
            calendarId=self.calendar_id,
            timeMin=f"{time_min}+00:00" if "+" not in time_min else time_min,
            timeMax=f"{time_max}+00:00" if "+" not in time_max else time_max,
            maxResults=n,
            singleEvents=True,
            orderBy="startTime",
            timeZone=tz,
        ).execute()

        events = []
        for event in result.get("items", []):
            events.append({
                "id": event["id"],
                "title": event.get("summary", "Untitled"),
                "start": event.get("start", {}).get("dateTime", event.get("start", {}).get("date", "")),
                "end": event.get("end", {}).get("dateTime", event.get("end", {}).get("date", "")),
                "attendees": [a.get("email") for a in event.get("attendees", [])],
                "meet_link": event.get("hangoutLink", ""),
            })

        logger.info(f"Listed {len(events)} events on {date}")
        return events
