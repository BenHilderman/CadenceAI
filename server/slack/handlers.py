from loguru import logger
from slack_bolt.async_app import AsyncApp

from slack.agent import process_message, clear_history
from slack.formatter import format_response


def register_handlers(app: AsyncApp) -> None:
    @app.event("message")
    async def handle_message(event: dict, say) -> None:
        """Handle DMs to the bot."""
        # Ignore bot messages and message_changed events
        if event.get("bot_id") or event.get("subtype"):
            return

        user_id = event.get("user", "")
        text = event.get("text", "").strip()

        if not text:
            return

        logger.info(f"Slack DM from {user_id}: {text}")

        # Special commands
        if text.lower() in ("reset", "clear", "start over"):
            clear_history(user_id)
            await say(text="Conversation cleared! How can I help you schedule?")
            return

        response = await process_message(user_id, text)
        blocks = format_response(response)
        await say(blocks=blocks, text=response)

    @app.command("/cadence")
    async def handle_cadence_command(ack, command, say) -> None:
        """Handle /cadence slash command."""
        await ack()

        user_id = command.get("user_id", "")
        text = command.get("text", "").strip()

        if not text:
            await say(
                text="Hey! I'm Cadence, your scheduling assistant. Try `/cadence schedule a meeting tomorrow at 2pm`"
            )
            return

        logger.info(f"Slack command from {user_id}: /cadence {text}")
        response = await process_message(user_id, text)
        blocks = format_response(response)
        await say(blocks=blocks, text=response)
