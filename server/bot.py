from loguru import logger
from pipecat.audio.vad.silero import SileroVADAnalyzer
from pipecat.pipeline.pipeline import Pipeline
from pipecat.pipeline.runner import PipelineRunner
from pipecat.pipeline.task import PipelineParams, PipelineTask
from pipecat.processors.aggregators.llm_context import LLMContext
from pipecat.processors.aggregators.llm_response_universal import LLMContextAggregatorPair
from pipecat.services.google.gemini_live import GeminiLiveLLMService
from pipecat.transports.base_transport import TransportParams
from pipecat.transports.smallwebrtc.connection import SmallWebRTCConnection
from pipecat.transports.smallwebrtc.transport import SmallWebRTCTransport

from config import settings
from system_prompt import get_system_prompt
from tools.schemas import scheduling_tools
from tools.handlers import register_all_handlers


async def run_bot(webrtc_connection: SmallWebRTCConnection):
    """Create and run the Pipecat pipeline with GeminiLive."""
    logger.info("Starting bot pipeline")

    transport = SmallWebRTCTransport(
        webrtc_connection=webrtc_connection,
        params=TransportParams(
            audio_in_enabled=True,
            audio_out_enabled=True,
            audio_in_sample_rate=16000,
            audio_out_sample_rate=16000,
        ),
    )

    llm = GeminiLiveLLMService(
        api_key=settings.google_api_key,
        model="models/gemini-2.5-flash-native-audio-preview-12-2025",
        voice_id="Puck",
        system_instruction=get_system_prompt(),
        tools=scheduling_tools,
    )

    register_all_handlers(llm)

    context = LLMContext()
    context_aggregator = LLMContextAggregatorPair(context)

    pipeline = Pipeline(
        [
            transport.input(),
            context_aggregator.user(),
            llm,
            transport.output(),
            context_aggregator.assistant(),
        ]
    )

    task = PipelineTask(
        pipeline,
        PipelineParams(
            audio_in_enabled=True,
            audio_out_enabled=True,
            vad_enabled=True,
            vad_analyzer=SileroVADAnalyzer(),
        ),
    )

    @transport.event_handler("on_client_connected")
    async def on_connected(conn):
        logger.info("Client connected")
        await conn.connect()

    @transport.event_handler("on_client_disconnected")
    async def on_disconnected(conn):
        logger.info("Client disconnected")
        await task.cancel()

    runner = PipelineRunner(handle_sigint=False)
    await runner.run(task)
