# Parallel Agent Workstreams
### Running multiple agent sessions on the same project simultaneously

---

## The Setup
You can run multiple Cursor tabs, Claude Code sessions, and OpenClaw — all hitting the same repo.
The key is giving each one a DIFFERENT file zone so they never collide.

## Active Workstreams

### Stream 1: BACKEND APIs (Cursor Tab #1 or Claude Code)
**Files owned**: `src/app/api/` + `src/lib/`
**Task**: Build all API routes
```
src/app/api/
├── tavus/tools/route.ts    → Function call handler (from Tavus)
├── tavus/start/route.ts    → Create persona + start conversation
├── schedule/route.ts       → CRUD schedule events
├── schedule/stream/route.ts → SSE real-time updates
├── webhook/tavus/route.ts  → Post-conversation webhooks
└── copilotkit/route.ts     → CopilotKit runtime
src/lib/
├── tavus.ts                → Tavus API client
├── redis.ts                → Redis connection + helpers
├── claude.ts               → Claude API client
└── schedule.ts             → Schedule logic + validation
```
**Prompt for this agent**:
> "You are building the backend API layer for DRAKO. Read ceo-files/calendar-agent-infra.md and ceo-files/tavus-api-reference.md. Build each API route one at a time. Start with src/lib/redis.ts, then src/lib/tavus.ts, then the API routes. Do NOT touch src/components/ or src/app/page.tsx."

---

### Stream 2: FRONTEND UI (Cursor Tab #2)
**Files owned**: `src/components/` + `src/app/page.tsx` + `src/app/layout.tsx`
**Task**: Build all React components and the main page layout
```
src/components/
├── VideoCall.tsx            → Tavus iframe wrapper + voice indicator
├── ScheduleView.tsx         → Timeline calendar with hour lines
├── ScheduleCard.tsx         → Individual event card (animated)
├── VoiceIndicator.tsx       → Waveform animation
├── ChatSidebar.tsx          → CopilotKit text fallback
└── Header.tsx               → Top bar with status
src/app/
├── page.tsx                 → Main layout: video left, schedule right
└── layout.tsx               → CopilotKit provider wrapper
```
**Prompt for this agent**:
> "You are building the frontend UI for DRAKO. Read ceo-files/ui-design-spec.md and ceo-files/product-spec.md. Build each component in src/components/ one at a time. Use Tailwind CSS. Dark theme. The schedule should update via SSE from /api/schedule/stream. Do NOT touch src/app/api/ or src/lib/."

---

### Stream 3: INFRASTRUCTURE (Claude Code)
**Files owned**: `ai-agents/` + root config files + `.env.local` + `package.json`
**Task**: Environment, dependencies, git, API testing, deployment
```
Tasks:
├── Install all npm dependencies
├── Set up .env.local with all API keys
├── Test Redis connection
├── Test Tavus API (create persona, verify)
├── Test Claude API
├── Set up Vercel project
├── Manage git (commit, push after each milestone)
└── Update ai-agents/memory/ after each phase
```
**Prompt for this agent**:
> "You are the infrastructure agent. Read ceo-files/architecture.md and ceo-files/agent-boundaries.md. Install dependencies: ioredis, @anthropic-ai/sdk, @copilotkit/react-core, @copilotkit/react-ui, @copilotkit/runtime. Set up .env.local. Test all API connections. Do NOT write application code in src/."

---

### Stream 4: MONITORING (OpenClaw)
**Files owned**: `ai-agents/memory/` (append only)
**Task**: Watch everything, alert on issues
```
Tasks:
├── Monitor dev server (curl localhost:3000 every 2 min)
├── Monitor Redis connection health
├── Watch for git conflicts
├── Alert if progress.md hasn't updated in 30 min
├── Run periodic API health checks
└── Log discoveries in learnings.md
```

---

## Collision Prevention Rules

### HARD RULE: One agent per file zone
```
src/app/api/  + src/lib/     → Stream 1 ONLY
src/components/ + page/layout → Stream 2 ONLY
ai-agents/ + root configs    → Stream 3 ONLY
ai-agents/memory/ (append)   → Stream 4 ONLY
```

### If two agents need to coordinate:
Example: Frontend needs an API route that doesn't exist yet
1. Frontend agent writes a MOCK/stub: `const data = await fetch('/api/schedule')` with a TODO comment
2. Backend agent sees the TODO and builds the real route
3. Both commit separately — no merge conflicts because different files

### Shared files (DANGER ZONE):
These files might be touched by multiple agents — coordinate carefully:
- `package.json` — Only Stream 3 (Claude Code) installs packages
- `tailwind.config.ts` — Only Stream 2 (Frontend) modifies
- `.env.local` — Only Stream 3 (Claude Code) modifies
- `tsconfig.json` — Only Stream 3 modifies

### Git Strategy:
- Each stream commits with a prefix: `[api]`, `[ui]`, `[infra]`, `[monitor]`
- Claude Code does the git push (single source of truth for remote)
- If Cursor commits, it uses `git add` only on its own files
- Avoid `git add .` — always specify paths

---

## Kickoff Order (after disk cleanup)

```
MINUTE 0:   Stream 3 (Claude Code) — install deps, set up env
MINUTE 2:   Stream 1 (Backend) — start building lib/redis.ts
MINUTE 2:   Stream 2 (Frontend) — start building components
MINUTE 5:   Stream 4 (OpenClaw) — start monitoring
MINUTE 10:  Stream 1 has redis.ts + tavus.ts → Stream 2 can wire SSE
MINUTE 15:  Stream 3 tests APIs → confirms keys work
MINUTE 20:  Both streams coding in parallel, no conflicts
MINUTE 30:  First integration test: frontend calls backend
```

## How to Launch All Streams

1. Open Cursor Tab #1 → paste Stream 1 prompt (backend)
2. Open Cursor Tab #2 → paste Stream 2 prompt (frontend)
3. Open Claude Code terminal → paste Stream 3 prompt (infra)
4. OpenClaw is already running → it reads ai-agents/ and starts monitoring

All four agents read from `ceo-files/` but NEVER write to it.
All four agents can READ `ai-agents/memory/progress.md` for status.
