# DRAKO Architecture
### How all the pieces connect

---

## System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    USER'S BROWSER                        │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │  Tavus Video  │  │  Schedule UI │  │  CopilotKit   │  │
│  │  (iframe)     │  │  (React)     │  │  Chat Sidebar │  │
│  └──────┬───────┘  └──────┬───────┘  └───────┬───────┘  │
│         │                  │                   │          │
└─────────┼──────────────────┼───────────────────┼──────────┘
          │                  │                   │
          ▼                  ▼                   ▼
┌─────────────────────────────────────────────────────────┐
│                 NEXT.JS APP (Vercel)                      │
│                                                          │
│  src/app/                                                │
│  ├── page.tsx              → Main UI layout              │
│  ├── api/                                                │
│  │   ├── tavus/route.ts    → Tavus API proxy             │
│  │   ├── schedule/route.ts → CRUD schedule (Redis)       │
│  │   ├── copilotkit/route.ts → CopilotKit runtime        │
│  │   └── tavus-webhook/route.ts → Conversation callbacks │
│  ├── components/                                         │
│  │   ├── VideoCall.tsx     → Tavus iframe wrapper        │
│  │   ├── ScheduleView.tsx  → Calendar/list display       │
│  │   ├── ScheduleCard.tsx  → Individual event card       │
│  │   └── DrakoAvatar.tsx   → Avatar status/fallback      │
│  └── lib/                                                │
│      ├── tavus.ts          → Tavus API client            │
│      ├── redis.ts          → Redis connection + helpers   │
│      ├── claude.ts         → Claude API client           │
│      └── schedule.ts       → Schedule logic/validation    │
└──────────┬──────────────────┬────────────────────────────┘
           │                  │
           ▼                  ▼
┌──────────────────┐  ┌──────────────────┐
│    TAVUS CVI     │  │   CLAUDE API     │
│                  │  │                  │
│ - Video stream   │  │ - Schedule       │
│ - Voice (STT)    │  │   reasoning      │
│ - Avatar render  │  │ - Conflict       │
│ - TTS response   │  │   detection      │
│ - Function calls │  │ - Natural lang   │
│                  │  │   → structured   │
└──────────────────┘  └──────────────────┘
                              │
                              ▼
                      ┌──────────────────┐
                      │   REDIS CLOUD    │
                      │                  │
                      │ - Schedule data  │
                      │ - Session state  │
                      │ - Conversation   │
                      │   history        │
                      └──────────────────┘
```

## Data Flow: User says "Add a meeting at 2pm"

```
1. User speaks → Tavus STT transcribes
2. Tavus LLM processes → triggers function call "add_schedule_event"
3. Function call hits Next.js API → /api/schedule
4. API route calls Claude to validate (any conflicts?)
5. Claude responds: "No conflicts, adding event"
6. Schedule written to Redis
7. Response sent back to Tavus → TTS speaks confirmation
8. Frontend polls/subscribes → Schedule UI updates
```

## Agent Responsibilities

```
CURSOR (IDE)           → Writes code in src/
CLAUDE CODE (Terminal)  → Infra, git, API testing, scripts
OPENCLAW (Background)   → Monitoring, health checks, automation
GOVERNOR (Claude.ai)    → Orchestrates, updates prompts, decisions
```

## Key Files to Create

```
src/
├── app/
│   ├── layout.tsx          → CopilotKit wrapper
│   ├── page.tsx            → Main page: video + schedule
│   └── api/
│       ├── tavus/route.ts  → POST: create persona/conversation
│       ├── schedule/route.ts → GET/POST/PUT/DELETE schedule
│       ├── copilotkit/route.ts → CopilotKit runtime endpoint
│       └── webhook/route.ts → Tavus callback handler
├── components/
│   ├── VideoCall.tsx
│   ├── ScheduleView.tsx
│   ├── ScheduleCard.tsx
│   └── ChatSidebar.tsx
└── lib/
    ├── tavus.ts
    ├── redis.ts
    ├── claude.ts
    └── schedule.ts
```

## Environment Variables (.env.local)
```
TAVUS_API_KEY=
ANTHROPIC_API_KEY=
REDIS_URL=redis://default:...@redis-15331...redislabs.com:15331
NEXT_PUBLIC_APP_URL=http://localhost:3000
```
