import secrets
from dataclasses import dataclass, field
from datetime import datetime, timedelta


SESSION_TTL = timedelta(hours=24)

@dataclass
class UserSession:
    session_id: str
    google_email: str
    access_token: str
    refresh_token: str
    token_expiry: datetime | None = None
    created_at: datetime = field(default_factory=datetime.utcnow)


_sessions: dict[str, UserSession] = {}


def create_session(
    google_email: str,
    access_token: str,
    refresh_token: str,
    token_expiry: datetime | None = None,
) -> str:
    session_id = secrets.token_urlsafe(32)
    _sessions[session_id] = UserSession(
        session_id=session_id,
        google_email=google_email,
        access_token=access_token,
        refresh_token=refresh_token,
        token_expiry=token_expiry,
        created_at=datetime.utcnow(),
    )
    return session_id


def get_session(session_id: str) -> UserSession | None:
    session = _sessions.get(session_id)
    if session is None:
        return None
    if datetime.utcnow() - session.created_at > SESSION_TTL:
        _sessions.pop(session_id, None)
        return None
    return session
