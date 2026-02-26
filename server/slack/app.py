from slack_bolt.async_app import AsyncApp
from slack_bolt.adapter.fastapi.async_handler import AsyncSlackRequestHandler

from config import settings


def create_slack_app() -> tuple[AsyncApp, AsyncSlackRequestHandler]:
    app = AsyncApp(
        token=settings.slack_bot_token,
        signing_secret=settings.slack_signing_secret,
    )

    from slack.handlers import register_handlers

    register_handlers(app)

    handler = AsyncSlackRequestHandler(app)
    return app, handler
