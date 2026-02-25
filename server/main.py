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

app = FastAPI(title="CadenceAI API")

# Build CORS origins list
cors_origins = [
    settings.frontend_url,
    "http://localhost:3000",
    "https://cadenceai.vercel.app",
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

request_handler = SmallWebRTCRequestHandler(
    ice_servers=["stun:stun.l.google.com:19302"],
)


@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "cadenceai"}


@app.get("/api/audit")
async def get_audit_log():
    return {"entries": audit_log.get_entries()}


@app.post("/api/offer")
async def offer_post(request: Request):
    """Handle SDP offer from client."""
    data = await request.json()
    sdp_request = SmallWebRTCRequest.from_dict(data)

    async def on_connection(connection: SmallWebRTCConnection):
        await run_bot(connection)

    answer = await request_handler.handle_web_request(sdp_request, on_connection)
    return JSONResponse(content=answer)


@app.patch("/api/offer")
async def offer_patch(request: Request):
    """Handle ICE candidates from client."""
    data = await request.json()
    candidates = [IceCandidate(**c) for c in data.get("candidates", [])]
    patch_request = SmallWebRTCPatchRequest(
        pc_id=data["pc_id"],
        candidates=candidates,
    )
    await request_handler.handle_patch_request(patch_request)
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
