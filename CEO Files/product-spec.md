# DRAKO — Product Spec
### Voice AI Schedule Builder | Tavus Hackathon Feb 21, 2026

---

## What is DRAKO?
DRAKO is a voice-powered AI scheduling assistant. Users talk to a video AI avatar (powered by Tavus) that helps them plan, organize, and manage their day through natural conversation. The avatar can see, hear, and respond in real-time.

## How it works
1. User opens the app → sees DRAKO's video avatar
2. User talks to DRAKO about their schedule ("I need to fit a workout in tomorrow morning")
3. DRAKO reasons about the request using Claude API (checks conflicts, suggests optimal times)
4. DRAKO responds via voice AND updates the visual schedule UI in real-time
5. Schedule data persists in Redis

## Core User Flow
```
User opens app
    → Tavus conversation starts (video + voice)
    → User speaks: "What does my day look like?"
    → Claude API processes request + schedule state
    → DRAKO responds via voice: "You have 3 meetings..."
    → UI updates: schedule cards animate in
    → User: "Move my 2pm to 4pm"
    → Claude validates, updates Redis
    → DRAKO confirms via voice, UI slides the card
```

## Tech Stack
- **Frontend**: Next.js (App Router) + React + Tailwind CSS
- **Voice/Video AI**: Tavus CVI (Conversational Video Interface)
- **Intelligence**: Claude API (Anthropic) — reasoning, schedule logic
- **State**: Redis Cloud — session + schedule persistence
- **Deployment**: Vercel (final demo)
- **Design**: Figma → code via MCP

## Key Features for Demo
1. Live video avatar conversation (Tavus)
2. Voice-driven schedule management
3. Visual schedule display that updates in real-time
4. At least 3 demo scenarios: view schedule, add event, resolve conflict

## Non-Goals (Hackathon Scope)
- No user auth / login
- No calendar integrations (Google Cal, etc.)
- No mobile native app
- No multi-user support
