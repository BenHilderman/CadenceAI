# CadenceAI — Voice AI Scheduling Agent

A real-time voice-first AI scheduling assistant powered by Gemini Live (speech-to-speech), LangGraph orchestration, and Google Calendar.

**Live Demo:** [cadenceai.vercel.app](https://cadenceai.vercel.app)

---

## 60-Second Test

1. Open the [demo page](https://cadenceai.vercel.app/demo)
2. Click **Connect** and allow microphone access
3. Try saying: *"Book a 30 minute meeting tomorrow at 2pm called Vikara Demo"*
4. Watch the agent check availability → rank slots → confirm details
5. Say *"yes"* to confirm — a real Google Calendar event with a Meet link is created

> **No mic?** Use the text input at the bottom of the screen. Type the same prompt and the agent works identically.

---

## Requirements Checklist

| Requirement | Implementation |
|------------|---------------|
| Talk to the agent in real time | Gemini Live speech-to-speech via Pipecat WebRTC |
| Collect name, date/time, optional title | Multi-turn conversation flow with natural language parsing |
| Confirmation before booking | Agent always confirms all details before calling `create_event` |
| Real calendar event created | Google Calendar Events API with Google Meet link auto-provisioned |
| Text fallback | `/api/chat` endpoint + inline text input (voice and text coexist) |

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│  Browser (Next.js 16 + React 19 + Pipecat React SDK)        │
│  ┌─────────────────┐  ┌──────────────┐  ┌────────────────┐  │
│  │ VoiceOrb +       │  │ GraphViewer  │  │  SlotCards +   │  │
│  │ Transcript       │  │ (pipeline)   │  │  BookingConfirm│  │
│  └────────┬─────────┘  └──────────────┘  └────────────────┘  │
│           │ WebRTC (SmallWebRTC — P2P)  │ Text: POST /api/chat│
└───────────┼─────────────────────────────┼────────────────────┘
            ↕                             ↕
┌───────────┼─────────────────────────────┼────────────────────┐
│  Python Server (FastAPI + Pipecat 0.0.103)                   │
│           │                             │                    │
│  ┌────────▼─────────┐  ┌───────────────▼──────────────────┐  │
│  │  Gemini Live      │  │  Gemini 2.5 Flash (text chat)   │  │
│  │  (native audio)   │  │  Same tools, same graph         │  │
│  └────────┬──────────┘  └───────────────┬─────────────────┘  │
│           │ Function calls              │                    │
│  ┌────────▼─────────────────────────────▼──────────────────┐ │
│  │  LangGraph Scheduling Pipeline                          │ │
│  │                                                         │ │
│  │  Availability:  fetch_busy → compute_slots → rank       │ │
│  │  Booking:       verify_free → book_event                │ │
│  │                                                         │ │
│  │  ✦ 7-factor slot ranking (preference, buffer, lunch,    │ │
│  │    focus time, edge penalty, fatigue)                    │ │
│  │  ✦ Multi-attendee conflict resolution                   │ │
│  │  ✦ Race condition detection (verify before booking)     │ │
│  └────────┬────────────────────────────────────────────────┘ │
│           │                                                  │
│  ┌────────▼─────────┐                                        │
│  │ Google Calendar   │  FreeBusy API + Events API            │
│  │ + Google Meet     │  Idempotent conference provisioning   │
│  └──────────────────┘                                        │
└──────────────────────────────────────────────────────────────┘
```

---

## Slot Ranking Algorithm

Slots are scored with 7 factors to surface the best meeting times:

| Factor | Score | Description |
|--------|-------|-------------|
| Time preference match | +3.0 | Matches requested morning/afternoon/evening |
| Buffer (both sides) | +2.0 | 30+ minutes free before and after |
| Buffer (one side) | +1.0 | 15+ minutes free on at least one side |
| Focus time protection | +1.5 | Preserves a 2+ hour uninterrupted block |
| Lunch protection | +1.0 | Doesn't overlap 12:00–1:00 PM |
| Edge-of-day penalty | -0.5 | First or last slot of work hours |
| Meeting fatigue | -1.0 | 3+ meetings that day, adjacent to existing meeting |

---

## Calendar Integration

- **OAuth 2.0** with refresh token — auto-refreshes on expiry
- **FreeBusy API** for availability checks (single-day and multi-day range)
- **Events API** for CRUD operations (create, reschedule, cancel)
- **Google Meet** auto-provisioned via `conferenceData` with deterministic `requestId` for idempotency
- **Multi-calendar** support — checks mutual availability across attendee calendars
- **Race condition protection** — `verify_free` node re-checks slot immediately before booking

---

## Local Development

### Docker Compose (recommended)

```bash
cp .env.example server/.env
# Fill in API keys and OAuth credentials in server/.env

docker compose up
```

Server starts on `http://localhost:7860`, frontend on `http://localhost:3000`.

### Manual Setup

```bash
# Server
cd server
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp ../.env.example .env  # fill in credentials
uvicorn main:app --host 0.0.0.0 --port 7860

# Frontend (new terminal)
cd web
npm install
npm run dev
```

Open `http://localhost:3000` → click **Try the Demo** → connect and speak.

### Verify Calendar Integration

```bash
curl http://localhost:7860/api/self_test
# Returns: { "status": "pass", "elapsed_ms": ..., "event_id": "...", "message": "..." }
```

### LangSmith Tracing (Optional)

```bash
# In server/.env
LANGCHAIN_TRACING_V2=true
LANGCHAIN_API_KEY=your-langsmith-key
LANGCHAIN_PROJECT=cadenceai
```

---

## Testing

```bash
cd server
pip install -r requirements.txt  # includes pytest
python -m pytest tests/ -v
```

Tests cover:
- `compute_free_slots` — empty days, fully busy, mid-day meetings, duration filtering
- `rank_slots` — preference scoring, buffer bonuses, lunch protection, edge penalties, sort order
- `execute_tool` — availability checks, event creation, conflicts, unknown tools, error handling

---

## Bonus Features

These features go beyond the core assignment:

| Feature | Description |
|---------|-------------|
| **Slack Bot** | Full Gemini-powered scheduling agent in Slack DMs |
| **Chrome Extension** | Side-panel voice agent for scheduling from any page |
| **Booking Pages** | Shareable `/book/:slug` links with slot picker UI |
| **Graph Visualization** | Real-time LangGraph pipeline animation in the UI |
| **Audit Trail** | Full function call log visible in the UI for transparency |
| **LangSmith Tracing** | Opt-in observability with node-level spans |

---

## Deployment

### Server (Fly.io)

```bash
# Install Fly CLI
brew install flyctl

# Deploy from the server directory
cd server
fly auth login
fly deploy
fly secrets set GOOGLE_API_KEY=... GOOGLE_CLIENT_ID=... GOOGLE_CLIENT_SECRET=... GOOGLE_REFRESH_TOKEN=...
```

The server deploys to `https://cadenceai-server.fly.dev` (configured in `fly.toml`).

### Frontend (Vercel)

1. Connect the GitHub repo at [vercel.com/new](https://vercel.com/new)
2. Set the root directory to `web`
3. Add environment variables:
   - `NEXT_PUBLIC_PIPECAT_URL` = `https://cadenceai-server.fly.dev/api/offer`
   - `NEXT_PUBLIC_API_URL` = `https://cadenceai-server.fly.dev`
4. Deploy

### CORS

After deployment, add the Vercel URL to `cors_origins` in `server/main.py` and redeploy the server.

---

## Voice Stack

| Component | Technology |
|-----------|-----------|
| Speech-to-Speech LLM | Gemini 2.5 Flash (native audio mode) via Pipecat |
| Real-time Transport | WebRTC (Pipecat SmallWebRTC — peer-to-peer) |
| Voice Activity Detection | Silero VAD |
| Pipeline Framework | Pipecat 0.0.103 |
| Orchestration | LangGraph (4 tools, 8 nodes, conditional routing) |
| Calendar API | Google Calendar v3 (OAuth 2.0 + FreeBusy + Events) |
| Frontend | Next.js 16 + Pipecat React SDK |

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Microphone not working | Check browser permissions. Chrome works best — Safari has WebRTC limitations |
| "Connection failed" | Ensure the server is running on port 7860. Check CORS origins in `main.py` |
| Wrong timezone | Set `DEFAULT_TIMEZONE` in `server/.env` (default: `America/Toronto`) |
| Calendar auth errors | Run `curl localhost:7860/api/self_test` to diagnose. Refresh token may have expired |
| No Meet link generated | Ensure `conferenceDataVersion=1` is set (it is by default). Google Workspace required |
| Text chat not responding | Verify `GOOGLE_API_KEY` is set — the text chat uses Gemini 2.5 Flash |

---

## Security

- **OAuth tokens** stored in server-side environment variables only — never exposed to the client
- **Scopes** limited to Google Calendar read/write (`calendar.events`, `calendar.freebusy`)
- **No secrets in repo** — `.env` is gitignored, `.env.example` shows required keys without values
- **CORS** pinned to specific origins (localhost, Vercel deployment, optional extension ID)
- **Idempotent bookings** — deterministic `requestId` prevents duplicate events on retry
- **Input validation** — Pydantic models on all API endpoints

---

## Project Structure

```
CadenceAI/
├── server/
│   ├── main.py              # FastAPI server + WebRTC + self-test
│   ├── bot.py               # Pipecat pipeline (WebRTC → Gemini → output)
│   ├── config.py            # Environment settings
│   ├── system_prompt.py     # Agent conversation instructions
│   ├── chat/
│   │   └── routes.py        # POST /api/chat (text fallback)
│   ├── tools/
│   │   ├── schemas.py       # Function call schemas (4 tools)
│   │   ├── handlers.py      # Pipecat → LangGraph bridge + graph tracing
│   │   └── calendar_client.py  # Google Calendar API (idempotent)
│   ├── graph/
│   │   ├── scheduling_graph.py  # LangGraph StateGraph
│   │   ├── nodes.py         # 8 executor nodes
│   │   ├── edges.py         # Conditional routing
│   │   └── state.py         # TypedDict state schema
│   ├── booking/
│   │   └── routes.py        # Booking link API (with dedup)
│   ├── slack/
│   │   ├── app.py           # Slack Bolt integration
│   │   └── agent.py         # Gemini function calling agent
│   ├── utils/
│   │   ├── slot_ranker.py   # 7-factor scoring algorithm
│   │   ├── audit.py         # Audit trail
│   │   └── time_utils.py    # Time constants + helpers
│   └── tests/
│       ├── test_slot_ranker.py  # Slot computation + ranking tests
│       └── test_handlers.py     # Tool execution tests
│
├── web/
│   ├── src/
│   │   ├── app/             # Next.js pages (landing + demo)
│   │   ├── components/
│   │   │   └── agent/       # VoiceAgent, VoiceOrb, TextInput, PromptHint, ...
│   │   ├── hooks/           # useVoiceAgent, useTranscript, useAuditLog, useTextChat
│   │   └── lib/types.ts     # TypeScript interfaces
│   ├── Dockerfile           # Multi-stage Next.js build
│   └── package.json
│
├── docker-compose.yml       # One-command local setup
└── README.md
```
