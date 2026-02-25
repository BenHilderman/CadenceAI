# CadenceAI — Voice AI Scheduling Agent

A real-time voice-first AI scheduling assistant powered by Gemini Live (speech-to-speech), LangGraph orchestration, and Google Calendar. Speak naturally, and CadenceAI checks availability, ranks time slots, and books meetings with Google Meet links — all through conversation.

**Live Demo:** [cadenceai.vercel.app](https://cadenceai.vercel.app)

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│  Browser (Next.js 15 + React 19 + Pipecat React SDK)        │
│  ┌─────────────────┐  ┌──────────────┐  ┌────────────────┐  │
│  │ VoiceVisualizer  │  │ GraphViewer  │  │  SlotCards +   │  │
│  │ + Transcript     │  │ (pipeline)   │  │  BookingConfirm│  │
│  └────────┬─────────┘  └──────────────┘  └────────────────┘  │
│           │ WebRTC (SmallWebRTC — P2P, free)                 │
└───────────┼──────────────────────────────────────────────────┘
            ↕
┌───────────┼──────────────────────────────────────────────────┐
│  Python Server (FastAPI + Pipecat 0.0.103)                   │
│           │                                                  │
│  ┌────────▼─────────┐                                        │
│  │  Gemini Live      │  ← Speech-to-speech (no STT/TTS)     │
│  │  (native audio)   │                                       │
│  └────────┬──────────┘                                       │
│           │ Function calls                                   │
│  ┌────────▼──────────────────────────────────────────────┐   │
│  │  LangGraph Scheduling Pipeline                        │   │
│  │                                                       │   │
│  │  Availability:  fetch_busy → compute_slots → rank     │   │
│  │  Booking:       verify_free → book_event              │   │
│  │                                                       │   │
│  │  ✦ Multi-attendee conflict resolution                 │   │
│  │  ✦ LangSmith tracing (opt-in)                         │   │
│  └────────┬──────────────────────────────────────────────┘   │
│           │                                                  │
│  ┌────────▼─────────┐                                        │
│  │ Google Calendar   │  FreeBusy API + Events API            │
│  │ + Google Meet     │  Conference data auto-provisioning    │
│  └──────────────────┘                                        │
└──────────────────────────────────────────────────────────────┘
```

## Key Features

| Feature | Description |
|---------|-------------|
| **Gemini Live** | Native speech-to-speech — no separate STT/TTS pipeline |
| **LangGraph Orchestration** | Structured multi-node graph for availability + booking flows |
| **Graph Visualization** | Real-time pipeline animation in the UI (nodes light up as they execute) |
| **Smart Slot Ranking** | Scores by time preference (+3), buffer time (+2), work hours edge penalty (-0.5) |
| **Multi-Attendee** | Checks FreeBusy across multiple calendars for mutual availability |
| **LangSmith Tracing** | Opt-in observability — every graph invocation traced with node-level spans |
| **WebRTC (P2P)** | Zero-infrastructure voice transport via SmallWebRTC |
| **Audit Trail** | Full function call log visible in the UI for transparency |

## Conversation Flow

1. Bot greets: *"Hi, I'm Cadence! What's your name?"*
2. Asks for date, time preference, and duration
3. Calls `check_availability` → LangGraph runs: `fetch_busy → compute_slots → rank`
4. Presents top 3 ranked time slots
5. User picks a slot → asks for meeting title
6. Confirms all details → calls `create_event` → LangGraph runs: `verify_free → book_event`
7. Announces Google Meet link

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Voice AI | Gemini 2.5 Flash (native audio preview) |
| Transport | SmallWebRTC (P2P, zero infra) |
| Pipeline | Pipecat v0.0.103 |
| Orchestration | LangGraph 0.4.1 |
| Observability | LangSmith (opt-in) |
| Calendar | Google Calendar API (FreeBusy + Events) |
| Backend | FastAPI + Uvicorn |
| Frontend | Next.js 15, React 19, Tailwind CSS 4 |
| Animations | Framer Motion |
| Deployment | Fly.io (backend) + Vercel (frontend) |

## Quick Start

### Prerequisites
- Python 3.11+
- Node.js 20+
- Google API Key (Gemini)
- Google Calendar OAuth credentials + refresh token

### Setup

```bash
# Clone
git clone https://github.com/yourusername/CadenceAI.git
cd CadenceAI

# Configure environment
cp .env.example server/.env
# Fill in API keys and OAuth credentials in server/.env

# Start the server
cd server
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 7860

# Start the frontend (new terminal)
cd web
npm install
npm run dev
```

Open `http://localhost:3000` → click **Try the Demo** → connect and speak.

### LangSmith Tracing (Optional)

```bash
# In server/.env
LANGCHAIN_TRACING_V2=true
LANGCHAIN_API_KEY=your-langsmith-key
LANGCHAIN_PROJECT=cadenceai
```

Every `scheduling_graph.invoke()` call will appear as a traced run with node-level spans in your LangSmith dashboard.

## Deployment

**Backend (Fly.io):**
```bash
cd server
fly launch
fly secrets set GOOGLE_API_KEY=... GOOGLE_CLIENT_ID=... # etc
fly deploy
```

**Frontend (Vercel):**
- Import repo in Vercel
- Set env: `NEXT_PUBLIC_PIPECAT_URL=https://cadenceai-server.fly.dev/api/offer`
- Deploy

## Project Structure

```
CadenceAI/
├── server/
│   ├── bot.py              # Pipecat pipeline + WebRTC
│   ├── main.py             # FastAPI server
│   ├── config.py           # Environment settings
│   ├── system_prompt.py    # Agent conversation instructions
│   ├── tools/
│   │   ├── schemas.py      # Function call schemas
│   │   ├── handlers.py     # LangGraph invocation + graph tracing
│   │   └── calendar_client.py  # Google Calendar API (multi-calendar)
│   ├── graph/
│   │   ├── scheduling_graph.py  # StateGraph compilation
│   │   ├── nodes.py        # fetch_busy, compute_slots, rank, verify_free, book_event
│   │   ├── edges.py        # Conditional routing
│   │   └── state.py        # TypedDict state
│   └── utils/
│       ├── audit.py        # Audit trail
│       ├── slot_ranker.py  # Slot scoring algorithm
│       └── time_utils.py   # Time constants + helpers
│
├── web/
│   ├── src/
│   │   ├── app/            # Next.js pages (landing + demo)
│   │   ├── components/
│   │   │   ├── agent/      # VoiceAgent, GraphVisualizer, SlotCards, etc.
│   │   │   └── landing/    # Hero, Features, DemoPreview
│   │   ├── hooks/          # useVoiceAgent, useTranscript, useAuditLog
│   │   └── lib/            # Types
│   └── package.json
│
└── README.md
```
