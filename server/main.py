import asyncio

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from loguru import logger
from pipecat.transports.smallwebrtc.connection import SmallWebRTCConnection
from pipecat.transports.smallwebrtc.request_handler import (
    SmallWebRTCRequest,
    SmallWebRTCPatchRequest,
    SmallWebRTCRequestHandler,
    IceCandidate,
)

from config import settings
from bot import run_bot
from utils.audit import audit_log
from booking.routes import router as booking_router
from chat.routes import router as chat_router
from auth.routes import router as auth_router
from auth.sessions import get_session
from tools.handlers import UserCredentials

app = FastAPI(title="CadenceAI API")

# Build CORS origins list
cors_origins = [
    settings.frontend_url,
    "http://localhost:3000",
    "https://cadenceai.space",
    "https://www.cadenceai.space",
    "https://cadenceai.vercel.app",
    "https://cadenceai-app.vercel.app",
]
if settings.extension_origin:
    cors_origins.append(settings.extension_origin)

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount booking routes
app.include_router(booking_router)

# Mount text chat routes
app.include_router(chat_router)

# Mount auth routes
app.include_router(auth_router)

request_handler = SmallWebRTCRequestHandler(
    ice_servers=["stun:stun.l.google.com:19302"],
)


@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "cadenceai"}


@app.get("/api/audit")
async def get_audit_log():
    return {"entries": audit_log.get_entries()}


@app.get("/api/self_test")
async def self_test():
    """Smoke test: create a test event, verify it exists, delete it."""
    import time as _time
    from datetime import datetime, timedelta
    from tools.calendar_client import CalendarClient

    start = _time.time()
    try:
        client = CalendarClient()
        test_start = (datetime.now() + timedelta(hours=1)).isoformat()
        event = client.create_event(
            title="CadenceAI Self-Test (auto-delete)",
            start_time=test_start,
            duration_minutes=15,
        )
        event_id = event["id"]

        # Verify it exists
        fetched = client.get_event(event_id)
        assert fetched["id"] == event_id

        # Clean up
        client.delete_event(event_id, notify_attendees=False)

        elapsed_ms = int((_time.time() - start) * 1000)
        return {
            "status": "pass",
            "elapsed_ms": elapsed_ms,
            "event_id": event_id,
            "message": "OAuth + Calendar API working end-to-end",
        }
    except Exception as e:
        elapsed_ms = int((_time.time() - start) * 1000)
        logger.error(f"Self-test failed: {e}")
        return JSONResponse(
            status_code=500,
            content={
                "status": "fail",
                "elapsed_ms": elapsed_ms,
                "event_id": None,
                "message": str(e),
            },
        )


_bot_tasks: set[asyncio.Task] = set()


@app.post("/api/offer")
async def offer_post(request: Request):
    """Handle SDP offer from client."""
    data = await request.json()
    sdp_request = SmallWebRTCRequest.from_dict(data)

    # Extract per-user credentials from session if provided
    session_id = request.query_params.get("session")
    user_creds: UserCredentials | None = None
    if session_id:
        user_session = get_session(session_id)
        if user_session:
            user_creds = UserCredentials(
                access_token=user_session.access_token,
                refresh_token=user_session.refresh_token,
                client_id=settings.google_client_id,
                client_secret=settings.google_client_secret,
            )

    async def on_connection(connection: SmallWebRTCConnection):
        # IMPORTANT: run_bot() blocks until the pipeline finishes (client disconnect).
        # We must NOT await it here — handle_web_request awaits this callback, and
        # needs it to return immediately so it can send the SDP answer and register
        # the peer connection for ICE candidate PATCH requests.
        task = asyncio.create_task(run_bot(connection, user_creds=user_creds))
        _bot_tasks.add(task)
        task.add_done_callback(_bot_tasks.discard)

    answer = await request_handler.handle_web_request(sdp_request, on_connection)
    return JSONResponse(content=answer)


@app.patch("/api/offer")
async def offer_patch(request: Request):
    """Handle ICE candidates from client."""
    data = await request.json()
    logger.info(f"PATCH /api/offer — pc_id={data.get('pc_id')}, candidates={len(data.get('candidates', []))}")
    candidates = [IceCandidate(**c) for c in data.get("candidates", [])]
    patch_request = SmallWebRTCPatchRequest(
        pc_id=data["pc_id"],
        candidates=candidates,
    )
    try:
        await request_handler.handle_patch_request(patch_request)
    except Exception as e:
        logger.error(f"PATCH failed: {e}")
        raise
    return JSONResponse(content={"status": "ok"})


# Conditionally mount Slack routes if configured
if settings.slack_bot_token:
    from slack.app import create_slack_app

    slack_app, slack_handler = create_slack_app()

    @app.post("/api/slack/events")
    async def slack_events(request: Request):
        return await slack_handler.handle(request)

    @app.post("/api/slack/commands")
    async def slack_commands(request: Request):
        return await slack_handler.handle(request)

    @app.post("/api/slack/interactions")
    async def slack_interactions(request: Request):
        return await slack_handler.handle(request)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=7860, reload=True)
