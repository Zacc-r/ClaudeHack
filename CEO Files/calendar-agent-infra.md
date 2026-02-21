# Calendar Agent + Cloud Infrastructure
### How the AI processes conversation and builds the calendar

---

## The Two Paths

### Path A: Real-Time (Function Calling)
During a live Tavus conversation, the persona's LLM recognizes schedule intents and triggers function calls that hit your API routes instantly.

```
User says "Add gym at 7am"
  → Tavus STT → LLM recognizes intent
  → Function call: add_event({ title: "Gym", start_time: "07:00" })
  → Hits POST /api/tavus/tools on your Vercel app
  → Your route calls Claude: "Any conflicts at 7am?"
  → Claude: "No conflicts, approved"
  → Write to Redis: ZADD schedule:demo:2026-02-22 420 '{"title":"Gym"...}'
  → Publish to Redis channel: schedule:updates
  → Frontend SSE listener receives update
  → Calendar card slides in with animation
  → Tavus persona speaks: "Done! Gym is locked in at 7am."
```

### Path B: Post-Conversation (Webhook Batch)
After a conversation ends, Tavus sends a webhook with the full transcript. Claude processes it to extract any missed schedule changes.

```
Conversation ends
  → Tavus fires webhook: application.transcription_ready
  → Hits POST /api/webhook/tavus on your app
  → Full transcript sent to Claude: "Extract all schedule changes"
  → Claude returns array of actions
  → Each action processed and written to Redis
  → Calendar UI updates with any missed items
```

## API Routes to Build

```
/api/tavus/tools          → Receives function calls FROM Tavus during conversation
/api/tavus/start          → Creates persona + starts conversation, returns iframe URL
/api/schedule             → CRUD for schedule events (GET/POST/PUT/DELETE)
/api/schedule/stream      → SSE endpoint for real-time calendar updates
/api/webhook/tavus        → Receives post-conversation webhooks
/api/copilotkit           → CopilotKit runtime (text chat fallback)
```

## Real-Time UI Update Flow (SSE)

The frontend opens an EventSource connection to `/api/schedule/stream`.
When any schedule change hits Redis, it publishes to a channel.
The SSE route subscribes to that channel and pushes updates to the browser.

```
Browser ──EventSource──→ /api/schedule/stream
                              │
                    Redis SUBSCRIBE 'schedule:updates'
                              │
  When event happens:  ←──── Redis PUBLISH 'schedule:updates' '{...}'
                              │
Browser receives: ←───────── data: {"type":"add","event":{...}}
                              │
React state updates → Calendar card animates in
```

## Redis Schema

```
# Schedule events (sorted set, score = minutes since midnight)
schedule:{user_id}:{YYYY-MM-DD}
  score: 420  → {"id":"evt_1","title":"Gym","start":"07:00","end":"08:00"}
  score: 540  → {"id":"evt_2","title":"Standup","start":"09:00","end":"09:30"}

# Session tracking
session:{conversation_id}
  → {"user_id":"demo","started_at":"...","persona_id":"..."}

# Real-time updates (pub/sub channel)
schedule:updates
  → {"type":"add|move|remove","event":{...},"timestamp":"..."}
```

## Environment Variables

```env
# APIs
TAVUS_API_KEY=<your-tavus-key>
ANTHROPIC_API_KEY=<your-anthropic-key>

# Redis
REDIS_URL=redis://default:xBvq7f45NDfsq58CyADLXYCaWy68BPqH@redis-15331.c277.us-east-1-3.ec2.cloud.redislabs.com:15331

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Vercel Deployment

```bash
# One command deploy
npx vercel

# Set env vars
vercel env add TAVUS_API_KEY
vercel env add ANTHROPIC_API_KEY
vercel env add REDIS_URL
```

Once deployed, update the Tavus persona's function call endpoints to point to your Vercel URL instead of localhost.

## npm Packages Needed

```bash
npm install ioredis @anthropic-ai/sdk
npm install @copilotkit/react-core @copilotkit/react-ui @copilotkit/runtime
```
