import asyncio

import google.generativeai as genai
from fastapi import APIRouter, Request
from loguru import logger
from pydantic import BaseModel

from config import settings
from slack.agent import SCHEDULING_TOOLS, execute_tool
from system_prompt import get_system_prompt
from auth.sessions import get_session
from tools.handlers import UserCredentials, user_credentials_var

router = APIRouter(prefix="/api", tags=["chat"])

# Per-session conversation history (keyed by session_id from client)
_sessions: dict[str, list[dict]] = {}

TEXT_ADDENDUM = """

## Text Chat Guidelines
- You are communicating via text in a web browser — do NOT reference voice, speaking, or audio
- Use markdown: **bold**, *italic*, `code`
- Use bullet points and line breaks for readability
- Keep responses concise and scannable
- When presenting time slots, format as a numbered list
- Include links as markdown: [link text](url)
- Follow the strict step-by-step conversation flow — never skip steps or assume defaults
"""


class ChatRequest(BaseModel):
    message: str
    session_id: str


class ChatResponse(BaseModel):
    response: str
    tool_calls: list[dict] = []
    slots: list[dict] | None = None
    booked_event: dict | None = None
    busy_times: list[dict] | None = None


def _get_text_system_prompt() -> str:
    return get_system_prompt() + TEXT_ADDENDUM


@router.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest, request: Request):
    # Set per-user credentials if session provided
    session_id = request.query_params.get("session")
    if session_id:
        user_session = get_session(session_id)
        if user_session:
            user_credentials_var.set(UserCredentials(
                access_token=user_session.access_token,
                refresh_token=user_session.refresh_token,
                client_id=settings.google_client_id,
                client_secret=settings.google_client_secret,
            ))

    genai.configure(api_key=settings.google_api_key)

    if req.session_id not in _sessions:
        _sessions[req.session_id] = []

    history = _sessions[req.session_id]

    model = genai.GenerativeModel(
        model_name="gemini-2.5-flash",
        system_instruction=_get_text_system_prompt(),
        tools=SCHEDULING_TOOLS,
    )

    chat_session = model.start_chat(history=history)
    all_tool_calls: list[dict] = []
    extracted_slots: list[dict] | None = None
    extracted_event: dict | None = None
    extracted_busy: list[dict] | None = None

    try:
        response = await asyncio.to_thread(chat_session.send_message, req.message)

        # Function calling loop (same pattern as slack/agent.py)
        while response.candidates and response.candidates[0].content.parts:
            function_calls = [
                part for part in response.candidates[0].content.parts
                if part.function_call.name
            ]

            if not function_calls:
                break

            function_responses = []
            for fc in function_calls:
                name = fc.function_call.name
                args = dict(fc.function_call.args) if fc.function_call.args else {}
                result = await asyncio.to_thread(execute_tool, name, args)

                all_tool_calls.append({"name": name, "args": args, "result": result})

                # Extract slots and booked events for structured response
                if name == "check_availability" and "available_slots" in result:
                    extracted_slots = result["available_slots"]
                    if "busy_times" in result:
                        extracted_busy = result["busy_times"]
                if name == "create_event" and result.get("success") and result.get("event"):
                    extracted_event = result["event"]

                function_responses.append(
                    genai.protos.Part(
                        function_response=genai.protos.FunctionResponse(
                            name=name,
                            response={"result": result},
                        )
                    )
                )

            response = await asyncio.to_thread(
                chat_session.send_message,
                genai.protos.Content(parts=function_responses),
            )

        # Extract text response
        response_text = ""
        for part in response.candidates[0].content.parts:
            if part.text:
                response_text += part.text

        # Save conversation history
        _sessions[req.session_id] = chat_session.history

        return ChatResponse(
            response=response_text or "I processed your request but have no text response.",
            tool_calls=all_tool_calls,
            slots=extracted_slots,
            booked_event=extracted_event,
            busy_times=extracted_busy,
        )

    except Exception as e:
        logger.error(f"Chat error for session {req.session_id}: {e}")
        return ChatResponse(
            response=f"Sorry, I ran into an error: {str(e)}",
            tool_calls=all_tool_calls,
        )
