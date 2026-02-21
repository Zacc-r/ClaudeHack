# DRAKO Voice Schedule Builder — Product Requirements Document v2
### AI Interfaces Hackathon with Claude | February 21, 2026
### Author: Zacc Romero

---

## 1. Problem Statement

Planning your day shouldn't require filling out forms, dragging blocks on a calendar, or configuring settings. People plan their days through conversation — talking through what matters, what's a priority, and what can wait. Current productivity tools ignore this. They make you conform to the tool instead of the tool conforming to you.

---

## 2. Solution

A conversational robot assistant named DRAKO that talks with you to plan your day. Instead of typing, tapping, or swiping, you just talk. DRAKO — a friendly animated robot character — asks about your life categories one at a time. You say yes, no, or "that's a priority." In under 60 seconds of conversation, Claude generates an optimized daily schedule and DRAKO narrates it back to you while a visual timeline renders on screen.

**Three-layer architecture:**
- **OpenClaw** orchestrates the conversation flow and coordinates all services
- **Tavus CVI** provides the real-time voice interface (DRAKO's voice)
- **Claude** provides the intelligence (schedule optimization)

**Key Insight**: The interface IS the conversation. There are no buttons to learn, no screens to navigate, no forms to fill. Just talk.

---

## 3. Target Users

| Persona | Why This Works For Them |
|---------|------------------------|
| **Busy professionals** | Talk through your day in 60 seconds while making coffee |
| **Students** | Natural planning without productivity app overwhelm |
| **Fitness-focused** | Voice-first works mid-warmup, pre-gym |
| **Accessibility needs** | No fine motor control required, fully voice-driven |
| **DRAKO early adopters** | Showcase of multimodal AI orchestration |

---

## 4. User Flow

```
[Open App] → [Robot greets you] → [Voice Q&A] → [Schedule generates] → [Robot narrates + timeline displays]
```

### 4.1 Greeting Phase (5 seconds)
- Robot face appears with idle animation (blinking, subtle movement)
- DRAKO speaks: "Hey! I'm DRAKO. Let's plan your day. I'll ask you about a few things — just say yes, no, or tell me it's a priority. Ready?"
- User says "ready" / "yes" / "let's go"
- OpenClaw transitions state to asking phase

### 4.2 Category Q&A Phase (45-60 seconds)
- DRAKO asks about each category conversationally, one at a time:
  - "Want to get a workout in today?"
  - "How about some news and current events?"
  - "Should we block time for deep work?"
  - "Any creative projects on tap?"
- User responds naturally: "yes", "no", "definitely", "skip", "that's a big priority"
- Robot reacts: nods for yes (eyes happy), shakes for no (eyes sympathetic), eyes go starry for priority
- OpenClaw parses intent and tracks state
- Progress indicator shows categories remaining
- Quick constraints at the end:
  - "What time are you waking up?" (or default to 7 AM)
  - "And when do you want to wind down?" (or default to 11 PM)

### 4.3 Generation Phase (3-5 seconds)
- DRAKO: "Nice, let me put this together for you..."
- Robot eyes animate thinking (spinning, pulsing, looking side to side)
- OpenClaw fires Claude API call with all collected data
- Loading animation on timeline area

### 4.4 Narration + Display Phase (20-30 seconds)
- Schedule timeline renders on screen with staggered animation
- DRAKO narrates: "Alright here's your day. You're kicking off at 7 AM with your morning routine, then hitting a priority workout at 7:30..."
- Each time block highlights as DRAKO speaks about it
- Priority items get star indicator + verbal emphasis
- Tips appear at the bottom after narration

### 4.5 Complete Phase
- DRAKO: "That's your day! Want to adjust anything, or are we good?"
- User can request changes verbally ("move exercise to evening", "add more study time")
- Or confirm: "looks good" → DRAKO celebrates
- Option to regenerate entirely

---

## 5. Category Cards (15 Categories)

| # | Category | DRAKO's Question | Duration | Time Pref |
|---|----------|-----------------|----------|-----------|
| 1 | Sleep & Recovery | "Let's make sure you're getting enough rest. Want me to protect your sleep time?" | 480 min | Night |
| 2 | Morning Routine | "Want time to ease into your day — shower, coffee, that kind of thing?" | 30 min | Morning |
| 3 | Exercise | "Want to get a workout in today?" | 60 min | Morning |
| 4 | News | "Should I carve out some time for news and current events?" | 20 min | Morning |
| 5 | Deep Work | "Any deep focus work you need to get done?" | 120 min | Morning |
| 6 | Meals | "I'll block time for meals — breakfast, lunch, dinner. Cool?" | 90 min | Flexible |
| 7 | Learning | "Got anything you want to study or learn today?" | 60 min | Afternoon |
| 8 | Social | "Want to make time for friends or social stuff?" | 60 min | Evening |
| 9 | Meditation | "How about some mindfulness or meditation?" | 15 min | Morning |
| 10 | Creative Time | "Any creative projects on tap?" | 45 min | Afternoon |
| 11 | Email & Comms | "Need to catch up on email and messages?" | 30 min | Morning |
| 12 | Entertainment | "Should we leave room for some fun — TV, games, whatever?" | 60 min | Evening |
| 13 | Side Project | "Working on any side projects right now?" | 90 min | Flexible |
| 14 | Self-Care | "Want dedicated self-care time today?" | 30 min | Morning |
| 15 | Finance | "Quick finance check-in today?" | 15 min | Flexible |

---

## 6. Robot Character Design

### Personality
- Friendly, slightly playful, efficient
- Speaks in short sentences (under 15 words per question)
- Enthusiastic about priorities ("Ooh, that's a big one!")
- Empathetic about skips ("No worries, we'll skip that")
- Celebrates at the end ("You're all set! Go crush it")

### Visual Design
- **NOT a human face** — clearly a robot
- Geometric, clean, minimal
- Two circular eyes (primary expression vehicle)
- Simple curved mouth line
- Optional: antenna, ear lights, chest indicator
- Dark background with glowing accents
- DRAKO brand colors

### Expression States
| State | Eyes | Mouth | Other |
|-------|------|-------|-------|
| Idle | Soft blink every 3-4s | Slight smile curve | Subtle float animation |
| Listening | Wide, attentive | Neutral | Ear lights pulse |
| Happy (yes) | Crescent/squint up | Wider smile | Quick nod animation |
| Sympathetic (no) | Slight tilt | Neutral-flat | Gentle head shake |
| Excited (priority) | Star/sparkle eyes | Big grin | Antenna bounce |
| Thinking | Looking side to side | Slight purse | Loading spinner in chest |
| Talking | Normal, blink rhythm | Animated open/close | Subtle head movement |
| Celebrating | Heart/star eyes | Maximum smile | Particles/confetti |

---

## 7. OpenClaw Orchestration

### Conversation State Machine
```
IDLE → GREETING → ASKING → GENERATING → NARRATING → COMPLETE
                    ↑                                   │
                    └───────── (adjustments) ────────────┘
```

### OpenClaw Responsibilities
1. **Session Init**: Create Tavus persona + start conversation
2. **Intent Parsing**: Convert natural speech to structured data
   - "yes" / "yeah" / "definitely" / "sure" → selected = true
   - "no" / "nah" / "skip" / "pass" → selected = false  
   - "priority" / "big one" / "for sure" / "absolutely" → priority = true
3. **State Tracking**: Know which category is current, which are done
4. **Transition Logic**: When all categories asked → trigger Claude
5. **Claude Call**: Build prompt from state, send, parse JSON response
6. **Narration Routing**: Feed schedule narration text back to Tavus
7. **Frontend Updates**: Push schedule data to display for timeline rendering
8. **Adjustment Handling**: Parse change requests, re-call Claude if needed

### Intent Detection Keywords
```json
{
  "yes": ["yes", "yeah", "yep", "sure", "definitely", "of course", "absolutely", "let's do it", "sounds good"],
  "no": ["no", "nah", "skip", "pass", "not today", "nope", "I'm good"],
  "priority": ["priority", "important", "big one", "for sure", "definitely a priority", "must", "need to"],
  "ready": ["ready", "let's go", "go ahead", "start", "I'm ready", "yep"],
  "done": ["looks good", "perfect", "I'm set", "that works", "done", "all good"]
}
```

---

## 8. Design Principles

1. **Conversation IS the interface** — Zero buttons for core flow, voice-only input
2. **Honest AI** — Robot character, not fake human. Approachable because it's authentic.
3. **Speed** — 60 second Q&A, 5 second generation, 30 second narration. Under 2 minutes total.
4. **Delight through character** — DRAKO's personality makes planning fun, not a chore
5. **Orchestration as architecture** — OpenClaw proves the multi-service AI agent model
6. **Privacy ready** — Architecture separates personal data from AI processing (DRAKO integration path)

---

## 9. Success Metrics (Hackathon Demo)

| Metric | Target |
|--------|--------|
| Conversation to schedule | < 2 minutes total |
| Schedule generation | < 5 seconds |
| Robot expressiveness | Minimum 4 visible expression states |
| Voice recognition accuracy | Natural yes/no parsing works live |
| Demo factor | Audible "wow" from audience when robot starts talking |
| Architecture clarity | Judges understand the 3-layer stack |

---

## 10. Out of Scope (Hackathon)

- Full SwiftUI iOS app (web demo for hackathon)
- Custom Tavus replica training (use stock or non-human replica)
- On-device AI processing
- Calendar integration
- Multi-day scheduling
- User accounts / persistence
- Custom category creation via voice

---

## 11. Demo Script (2 minutes)

**[0:00]** "What if planning your day was as easy as having a conversation?"

**[0:05]** Open the app. DRAKO appears, greets the audience by name.

**[0:10]** DRAKO starts asking categories. Rapid-fire yes/no answers. Show the robot reacting — happy, sympathetic, excited for priorities.

**[0:50]** "Let me put this together..." Robot thinks. Timeline starts rendering.

**[0:55]** DRAKO narrates the schedule while time blocks appear. Audience sees the visual timeline build in real-time.

**[1:20]** "That's your day! Go crush it." Robot celebrates.

**[1:25]** Explain the architecture: "What you just saw was three AI systems working together. OpenClaw orchestrating the conversation, Tavus powering the voice and persona, and Claude generating the intelligent schedule. All coordinated in real-time."

**[1:40]** "This is a proof of concept for DRAKO — a privacy-first AI assistant that runs on your phone. Today it's a web demo. Tomorrow it's running locally on your iPhone, learning your patterns, and building your schedule before you even ask."

**[2:00]** Done.

---

## 12. DRAKO Integration Roadmap (Post-Hackathon)

1. Port web frontend to SwiftUI iOS app
2. Replace Tavus with on-device STT/TTS for privacy
3. Replace OpenClaw orchestration with DRAKO's native routing layer
4. Claude API routed through DRAKO's privacy filter (strip PII)
5. Local AI handles repeat schedules (learns patterns over time)
6. Categories become dynamic modules from DRAKO marketplace
7. Schedule connects to Apple Calendar + DRAKO notification system
8. Robot character becomes DRAKO's persistent brand mascot across the app
