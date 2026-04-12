from loguru import logger
from pipecat.audio.vad.silero import SileroVADAnalyzer
from pipecat.pipeline.pipeline import Pipeline
from pipecat.pipeline.runner import PipelineRunner
from pipecat.pipeline.task import PipelineParams, PipelineTask
from pipecat.processors.frameworks.rtvi import RTVIFunctionCallReportLevel, RTVIObserverParams
from pipecat.frames.frames import LLMMessagesUpdateFrame
from pipecat.processors.aggregators.llm_context import LLMContext
from pipecat.processors.aggregators.llm_response_universal import LLMContextAggregatorPair
from pipecat.services.google.gemini_live import GeminiLiveLLMService
from pipecat.services.google.gemini_live.llm import InputParams
from pipecat.transcriptions.language import Language
from pipecat.transports.base_transport import TransportParams
from pipecat.transports.smallwebrtc.connection import SmallWebRTCConnection
from pipecat.transports.smallwebrtc.transport import SmallWebRTCTransport

from config import settings
from system_prompt import get_system_prompt
from tools.schemas import scheduling_tools
from tools.handlers import register_all_handlers, UserCredentials, user_credentials_var


async def run_bot(webrtc_connection: SmallWebRTCConnection, user_creds: UserCredentials | None = None):
    """Create and run the Pipecat pipeline with GeminiLive."""
    if user_creds is not None:
        user_credentials_var.set(user_creds)
    logger.info("Starting bot pipeline")

    transport = SmallWebRTCTransport(
        webrtc_connection=webrtc_connection,
        params=TransportParams(
            audio_in_enabled=True,
            audio_out_enabled=True,
            audio_in_sample_rate=24000,
            audio_out_sample_rate=24000,
        ),
    )

    # Tell the prompt whether the user has connected their calendar.
    # Guest mode changes the flow: bot collects name/date/time, then pauses
    # at the check_availability checkpoint to prompt for Connect Calendar
    # instead of calling a tool that would fail.
    is_authenticated = user_creds is not None

    llm = GeminiLiveLLMService(
        api_key=settings.google_api_key,
        model="models/gemini-2.5-flash-native-audio-preview-12-2025",
        voice_id="Puck",
        system_instruction=get_system_prompt(is_authenticated=is_authenticated),
        tools=scheduling_tools,
        params=InputParams(language=Language.EN_US),
    )

    register_all_handlers(llm)

    context = LLMContext()
    context_aggregator = LLMContextAggregatorPair(context)

    pipeline = Pipeline(
        [
            transport.input(),
            context_aggregator.user(),
            llm,
            context_aggregator.assistant(),
            transport.output(),
        ]
    )

    task = PipelineTask(
        pipeline,
        params=PipelineParams(
            audio_in_enabled=True,
            audio_out_enabled=True,
            vad_enabled=True,
            vad_analyzer=SileroVADAnalyzer(),
        ),
        rtvi_observer_params=RTVIObserverParams(
            function_call_report_level={"*": RTVIFunctionCallReportLevel.FULL},
        ),
    )

    connected = False

    @transport.event_handler("on_client_connected")
    async def on_connected(transport_self, conn):
        nonlocal connected
        if connected:
            return
        connected = True
        logger.info("Client connected")
        await conn.connect()
        # Trigger the LLM to greet the user immediately
        await task.queue_frames([LLMMessagesUpdateFrame(
            messages=[{"role": "user", "content": "Hello"}],
            run_llm=True,
        )])

    @transport.event_handler("on_client_disconnected")
    async def on_disconnected(transport_self, conn):
        logger.info("Client disconnected")
        await task.cancel()

    runner = PipelineRunner(handle_sigint=False)
    await runner.run(task)
