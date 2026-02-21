# DRAKO Voice Schedule Builder — Tech Stack Guide v2
### AI Interfaces Hackathon with Claude | February 21, 2026

---

## Overview

A voice-driven AI scheduling assistant featuring an animated robot character. Users have a real-time conversation with DRAKO — a friendly robot persona powered by Tavus voice AI — answering yes/no/priority questions about life categories. Claude generates an optimized daily schedule from the responses. OpenClaw orchestrates the entire pipeline.

**Tagline: "Talk to your day."**

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    OpenClaw                          │
│              (Orchestrator / Brain)                  │
│                                                     │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────┐ │
│  │ Conversation │  │   Schedule   │  │   State    │ │
│  │   Manager    │  │  Generator   │  │  Tracker   │ │
│  │  (Tavus ↔)   │  │  (Claude ↔)  │  │ (answers)  │ │
│  └──────┬──────┘  └──────┬───────┘  └─────┬──────┘ │
│         │                │                │         │
└─────────┼────────────────┼────────────────┼─────────┘
          │                │                │
          ▼                ▼                ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   Tavus API  │  │  Claude API  │  │   Frontend   │
│              │  │              │  │              │
│ • Voice I/O  │  │ • Schedule   │  │ • Robot face │
│ • Persona    │  │   generation │  │ • Timeline   │
│ • STT / TTS  │  │ • JSON output│  │ • Animations │
│ • Conversa-  │  │              │  │              │
│   tion mgmt  │  │              │  │              │
└──────────────┘  └──────────────┘  └──────────────┘
```

---

## Core Stack

| Layer | Technology | Role |
|-------|-----------|------|
| **Orchestrator** | OpenClaw | Routes between services, manages state, executes commands |
| **Voice / Conversation** | Tavus CVI API | Real-time voice conversation with robot persona |
| **Intelligence** | Claude API (claude-sonnet-4-5-20250929) | Schedule generation from collected preferences |
| **Frontend** | Web (React/HTML) or SwiftUI | Animated robot character + schedule timeline display |
| **State** | OpenClaw memory / local JSON | Tracks categories, user responses, generated schedule |

---

## Service Details

### OpenClaw (Orchestrator)

OpenClaw runs as the central agent coordinating all services:

**Skills needed:**
- `swiftui-ux-craft` — UI component patterns
- `ux-design-laws` — Design principles for the interface
- Custom scheduling skill — conversation flow logic

**Responsibilities:**
- Start/manage Tavus conversation session
- Parse user voice responses into structured data (yes/no/priority)
- Track conversation state (which categories asked, which remain)
- Decide when to transition from Q&A to schedule generation
- Call Claude API with structured category data
- Push generated schedule to frontend for display
- Feed schedule back to Tavus for verbal narration

**Configuration:**
```json
{
  "agents": {
    "list": [{
      "id": "drako-scheduler",
      "model": "claude-sonnet-4-5-20250929",
      "mcp": {
        "servers": []
      }
    }]
  }
}
```

### Tavus CVI (Voice Layer)

**API Endpoint:** `https://tavusapi.com/v2/conversations`

**Persona Configuration:**
```json
{
  "persona_name": "DRAKO",
  "system_prompt": "You are DRAKO, a friendly robot scheduling assistant. You have a warm, slightly playful personality. You ask the user about different life categories one at a time, listen for yes/no/priority answers, and keep the conversation moving efficiently. You're enthusiastic but concise — each question should be under 15 words. After all categories are covered, you announce you're generating the schedule and then narrate each time block.",
  "context": "Categories to ask about: Sleep & Recovery, Morning Routine, Exercise, News, Deep Work, Meals, Learning, Social, Meditation, Creative Time, Email, Entertainment, Side Project, Self-Care, Finance. For each, ask if they want it today. If yes, ask normal or high priority. Keep it conversational and fast.",
  "default_replica_id": "<non-human-replica-id>"
}
```

**Key API Calls:**
- `POST /v2/personas` — Create DRAKO persona
- `POST /v2/conversations` — Start voice session
- `GET /v2/conversations/{id}` — Check status / get transcript
- `POST /v2/conversations/{id}/end` — End session

**Webhook Events:**
- `conversation.participant_joined` — User connected
- `conversation.ended` — Conversation finished
- Transcript available post-conversation for data extraction

### Claude API (Schedule Brain)

**Model:** `claude-sonnet-4-5-20250929`
**Endpoint:** `https://api.anthropic.com/v1/messages`

**System Prompt:**
```
You are a schedule optimization engine. Given a set of life categories 
with priority levels, a wake time, and a sleep time, generate an 
intelligent daily schedule. Consider:
- Energy levels (high cognitive tasks morning, creative afternoon, social evening)
- Natural transitions between activities
- 5-10 min buffer blocks between activities  
- Priority items get preferred time slots and more duration
- Meals at standard times (breakfast, lunch, dinner)
- Wind-down activities before sleep

Respond ONLY with valid JSON. No markdown. No explanation.
```

**Response Schema:**
```json
{
  "blocks": [
    {
      "category": "string",
      "startTime": "7:00 AM",
      "endTime": "7:30 AM",
      "title": "string",
      "description": "string",
      "priority": true
    }
  ],
  "summary": "string",
  "tips": ["string"],
  "narration": "Here's your day: You'll start with..."
}
```

The `narration` field is key — OpenClaw feeds this back to Tavus for the robot to speak.

---

## Frontend Options

### Option A: Web-Based (Recommended for Hackathon)
- **Framework:** HTML + vanilla JS or React
- **Robot character:** CSS/SVG animated face or canvas-based
- **Tavus embed:** `conversation_url` in iframe or Daily.co WebRTC
- **Schedule display:** DOM-rendered timeline with CSS animations
- **Pros:** Fastest to build, easy to demo on any screen, Tavus embed is native web

### Option B: SwiftUI iOS App
- **Robot character:** SwiftUI animated shapes (circles for eyes, curves for mouth)
- **Tavus embed:** WKWebView wrapping conversation_url
- **Schedule display:** Native SwiftUI timeline component
- **Pros:** Fits DRAKO platform story, feels like a real app
- **Cons:** Tavus WebRTC in WebView can be tricky, adds complexity

### Recommendation
**Go web for the hackathon.** Tavus is built for web embeds. You can always port to SwiftUI later for DRAKO integration. A clean web demo on a big screen is more impressive to judges than a phone app they can't see.

---

## Data Models

### Category
```typescript
interface Category {
  id: string;
  name: string;           // "Exercise / Training"
  icon: string;           // Emoji or icon reference
  defaultDuration: number; // Minutes
  timePreference: "morning" | "afternoon" | "evening" | "night" | "flexible";
  asked: boolean;
  selected: boolean;
  priority: boolean;
}
```

### ConversationState
```typescript
interface ConversationState {
  currentIndex: number;
  categories: Category[];
  wakeTime: string;       // "7:00 AM"
  sleepTime: string;      // "11:00 PM"
  phase: "greeting" | "asking" | "generating" | "narrating" | "complete";
}
```

### GeneratedSchedule
```typescript
interface GeneratedSchedule {
  blocks: TimeBlock[];
  summary: string;
  tips: string[];
  narration: string;
}

interface TimeBlock {
  category: string;
  startTime: string;
  endTime: string;
  title: string;
  description: string;
  priority: boolean;
  color: string;
}
```

---

## File Structure

```
drako-voice-scheduler/
├── index.html              # Main page with robot + schedule
├── css/
│   └── styles.css          # Robot animations, timeline, layout
├── js/
│   ├── app.js              # Main app controller
│   ├── robot.js            # Robot face animations
│   ├── tavus.js            # Tavus API integration
│   ├── claude.js           # Claude API schedule generation
│   ├── timeline.js         # Schedule timeline renderer
│   ├── state.js            # Conversation state manager
│   └── categories.js       # Category data
├── assets/
│   └── robot-parts/        # SVG parts for robot face (if needed)
├── openclaw/
│   ├── SKILL.md            # Custom scheduling skill
│   └── config.json         # OpenClaw agent configuration
└── README.md
```

---

## API Keys Required

| Service | Key | Where to Get |
|---------|-----|-------------|
| **Tavus** | `x-api-key` | hack.tavuslabs.org (hackathon endpoint) or tavus.io developer portal |
| **Claude** | `x-api-key` | console.anthropic.com |
| **OpenClaw** | Uses Claude key | Configured in openclaw.json |

---

## Integration Path to DRAKO (Post-Hackathon)

1. **Frontend** → Port web robot character to SwiftUI with native animations
2. **Tavus** → Replace with on-device speech-to-text + local TTS for privacy
3. **Claude API** → Route through DRAKO's privacy filter + cloud fallback system
4. **OpenClaw** → Replace with DRAKO's native orchestration layer
5. **State** → Persist in SwiftData, learn patterns over time with local AI
6. **Categories** → Dynamic from DRAKO marketplace, user-customizable
