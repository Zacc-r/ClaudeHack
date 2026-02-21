# DRAKO Voice Schedule Builder — Phase Library v2
### Build Phases for Hackathon Day | February 21, 2026
### Build window: 10:45 AM – 6:30 PM (7h 45m)

---

## Phase Overview

| Phase | Name | Duration | Deliverable |
|-------|------|----------|-------------|
| 0 | Environment + Accounts | 30 min | OpenClaw running, API keys tested, project scaffolded |
| 1 | Robot Character | 60 min | Animated robot face with expression states |
| 2 | Tavus Voice Layer | 60 min | DRAKO persona created, voice conversation working |
| 3 | Conversation State Machine | 45 min | OpenClaw tracking yes/no/priority, managing flow |
| 4 | Claude Schedule Generation | 30 min | Schedule JSON from category selections |
| 5 | Timeline Display | 45 min | Visual schedule rendering with animations |
| 6 | Wire It All Together | 45 min | End-to-end flow: voice → parse → generate → display → narrate |
| 7 | Polish + Demo Prep | 30 min | Smooth transitions, demo rehearsal |

**Total: ~7h 15m (30 min buffer built in)**

---

## Detailed Timeline

| Time | Phase | Notes |
|------|-------|-------|
| 10:45 - 11:15 | **Phase 0**: Setup | Scaffold, test APIs |
| 11:15 - 12:15 | **Phase 1**: Robot Character ⚡ | The face of the product |
| 12:15 - 12:30 | **Break / Lunch** | |
| 12:30 - 1:30 | **Phase 2**: Tavus Voice | Get DRAKO talking |
| 1:30 - 2:15 | **Phase 3**: State Machine ⚡ | OpenClaw orchestration |
| 2:15 - 2:30 | **Break** | |
| 2:30 - 3:00 | **Phase 4**: Claude Integration | Schedule brain |
| 3:00 - 3:45 | **Phase 5**: Timeline Display | Visual schedule |
| 3:45 - 4:30 | **Phase 6**: Integration ⚡ | Wire everything together |
| 4:30 - 4:45 | **Break** | |
| 4:45 - 5:15 | **Phase 7**: Polish + Demo | Rehearse 3x |
| 5:15 - 6:30 | **Buffer / Bonus** | Extra polish or bonus features |

**Checkpoint targets:**
- **12:15 PM** → Robot face animated and expressive on screen ✅
- **1:30 PM** → DRAKO talks to you through Tavus ✅
- **3:00 PM** → Full conversation tracked, Claude generating schedules ✅
- **4:30 PM** → End-to-end demo working ✅

---

## Phase 0: Environment + Accounts (30 min)

### Objective
Everything set up and tested before writing real code.

### Tasks
- [ ] OpenClaw installed and running on Mac
- [ ] Load custom skills: `swiftui-ux-craft` + `ux-design-laws` into `~/.openclaw/skills/`
- [ ] Tavus account created, API key obtained from hack.tavuslabs.org
- [ ] Claude API key tested with a quick curl call
- [ ] Test Tavus API: create a basic conversation, confirm you get a `conversation_url`
- [ ] Create project directory: `drako-voice-scheduler/`
- [ ] Scaffold file structure (index.html, js/, css/, assets/)
- [ ] `git init`, first commit
- [ ] Open PRD + Phase Library for reference

### Verification Gate
✅ Tavus conversation URL loads in browser. Claude API returns JSON. OpenClaw responds to commands.

### Quick API Tests
```bash
# Test Claude
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: $CLAUDE_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d '{"model":"claude-sonnet-4-5-20250929","max_tokens":100,"messages":[{"role":"user","content":"Say hello"}]}'

# Test Tavus - Create persona
curl -X POST https://tavusapi.com/v2/personas \
  -H "x-api-key: $TAVUS_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"persona_name":"DRAKO Test","system_prompt":"You are a friendly robot."}'
```

---

## Phase 1: Robot Character (60 min) ⚡ Critical — This IS your demo

### Objective
Build an animated robot face that's expressive, charming, and clearly not human.

### Tasks
- [ ] Create `robot.js` — Robot class with SVG/Canvas face
- [ ] Design robot face:
  - Two large circular eyes (primary expression tool)
  - Curved mouth line (adjustable curvature for expressions)
  - Head outline (rounded rectangle or circle)
  - Optional: antenna with bobble, ear indicator lights
- [ ] Implement expression states:
  - `idle` — soft blink every 3-4s, slight float, small smile
  - `listening` — eyes wide and attentive, ear lights pulse
  - `happy` — eyes squint up (crescent), mouth wider, quick nod
  - `sad` — eyes tilt down slightly, mouth flatten, gentle shake
  - `excited` — eyes become stars/sparkles, big grin, antenna bounce
  - `thinking` — eyes look left-right-left, mouth slight purse, loading indicator
  - `talking` — eyes normal with blinks, mouth animates open/close cycle
  - `celebrating` — eyes hearts/stars, max smile, particle burst
- [ ] Smooth transitions between states (CSS transitions or requestAnimationFrame)
- [ ] Background: dark gradient, robot slightly glowing
- [ ] Layout: robot face takes top 40-50% of screen, lower area reserved for timeline
- [ ] Test all expressions manually with button triggers (remove buttons later)

### Verification Gate
✅ Robot displays with smooth idle animation. Can trigger all 8 expressions. Feels alive and friendly.

### Expression Implementation Guide
```javascript
// Eyes as primary expression vehicle
class RobotEyes {
  // Normal: two circles with inner pupil
  // Happy: circles become upward crescents (clip-path or arc)
  // Sad: circles with slight downward tilt
  // Excited: replace circles with star shapes
  // Thinking: pupils move left-right in animation loop
  // Listening: circles slightly larger, pupils centered
}

// Mouth as secondary expression
class RobotMouth {
  // SVG path with control points for curvature
  // Smile: curve up (positive control point)
  // Neutral: straight line
  // Sad: curve down
  // Talking: oscillate between open (ellipse) and closed (line)
  // Big grin: wider curve up with more height
}
```

### Color Palette
```css
:root {
  --robot-body: #1E293B;       /* Dark slate */
  --robot-face: #334155;       /* Lighter slate */
  --robot-eyes: #38BDF8;       /* Sky blue glow */
  --robot-mouth: #38BDF8;      /* Matching blue */
  --robot-accent: #818CF8;     /* Indigo accents */
  --robot-priority: #FBBF24;   /* Gold for priority/excitement */
  --robot-glow: rgba(56, 189, 248, 0.3); /* Eye glow effect */
  --bg-dark: #0F172A;          /* Background */
  --bg-gradient: linear-gradient(180deg, #0F172A 0%, #1E293B 100%);
}
```

---

## Phase 2: Tavus Voice Layer (60 min)

### Objective
Get DRAKO talking. User can have a real-time voice conversation with the robot.

### Tasks
- [ ] Create `tavus.js` — Tavus API wrapper
- [ ] Create DRAKO persona via API:
  - System prompt: friendly robot, asks categories, parses yes/no
  - Context: list of categories with conversational questions
  - Non-human replica (or stock replica if non-human unavailable)
- [ ] Start a conversation session → get `conversation_url`
- [ ] Embed Tavus conversation in page (iframe or Daily.co integration)
- [ ] Handle participant_joined event → trigger greeting
- [ ] Test: can you talk to DRAKO and hear it respond?
- [ ] Adjust persona system prompt for pacing and tone
- [ ] Connect Tavus audio state to robot expressions:
  - When DRAKO is speaking → robot mouth animates, `talking` state
  - When user is speaking → robot in `listening` state
  - When neither → `idle` state

### Verification Gate
✅ DRAKO greets you by voice. You can say "yes" or "no" and DRAKO responds naturally. Robot expressions sync with conversation.

### Tavus Persona Creation
```javascript
async function createDRAKOPersona(apiKey) {
  const response = await fetch('https://tavusapi.com/v2/personas', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      persona_name: "DRAKO",
      system_prompt: `You are DRAKO, a friendly robot scheduling assistant. Your personality:
- Warm but efficient. Every question under 15 words.
- Enthusiastic about priorities ("Ooh that's a big one!")
- Sympathetic about skips ("No worries, moving on")
- You ask about life categories one at a time
- After each answer, briefly acknowledge then move to next
- After all categories, say "Let me put this together for you"
- When given a schedule narration, read it naturally with enthusiasm`,
      context: `Ask about these categories in order:
1. Exercise - "Want to get a workout in today?"
2. Deep Work - "Any focused work you need to knock out?"
3. News - "Should I block some time for news?"
4. Learning - "Got anything to study or learn?"
5. Creative Time - "Any creative projects on tap?"
6. Social - "Making time for friends today?"
7. Meditation - "How about some mindfulness?"
8. Side Project - "Working on any side projects?"
9. Entertainment - "Leave room for some fun?"
10. Finance - "Quick finance check-in needed?"

Meals, morning routine, and sleep are automatically included.
For each: ask the question, wait for yes/no, if yes ask "normal or priority?"
Keep it moving. Don't over-explain.`,
    })
  });
  return response.json();
}
```

### Audio-to-Expression Sync
```javascript
// Monitor Tavus conversation state to drive robot expressions
function syncRobotToConversation(robot, conversationState) {
  switch(conversationState) {
    case 'ai_speaking': robot.setExpression('talking'); break;
    case 'user_speaking': robot.setExpression('listening'); break;
    case 'idle': robot.setExpression('idle'); break;
  }
}
```

---

## Phase 3: Conversation State Machine (45 min) ⚡ Critical — OpenClaw's brain

### Objective
OpenClaw tracks the conversation, parses user intent, manages category state, and knows when to trigger schedule generation.

### Tasks
- [ ] Create `state.js` — ConversationStateManager class
- [ ] Define state machine: IDLE → GREETING → ASKING → GENERATING → NARRATING → COMPLETE
- [ ] Implement category tracking (15 categories, each with asked/selected/priority flags)
- [ ] Build intent parser for Tavus transcript:
  - Parse "yes" variants → selected = true
  - Parse "no" variants → selected = false
  - Parse "priority" variants → priority = true
  - Parse "ready" variants → start conversation
  - Parse wake/sleep times from natural speech
- [ ] OpenClaw skill for orchestrating the conversation flow
- [ ] Hook into Tavus transcript/webhook to get user responses
- [ ] Advance state after each parsed response
- [ ] Detect when all categories have been asked → transition to GENERATING
- [ ] Log state to console for debugging

### Verification Gate
✅ Can see in console: each category asked, user response parsed, state advancing correctly. Transitions to GENERATING after final category.

### State Manager
```javascript
class ConversationStateManager {
  constructor(categories) {
    this.categories = categories;
    this.currentIndex = 0;
    this.phase = 'idle'; // idle | greeting | asking | generating | narrating | complete
    this.results = [];
    this.wakeTime = '7:00 AM';
    this.sleepTime = '11:00 PM';
  }

  parseIntent(transcript) {
    const lower = transcript.toLowerCase();
    const yesWords = ['yes', 'yeah', 'yep', 'sure', 'definitely', 'of course', 'absolutely'];
    const noWords = ['no', 'nah', 'skip', 'pass', 'not today', 'nope'];
    const priorityWords = ['priority', 'important', 'big one', 'for sure', 'must', 'need to'];

    if (priorityWords.some(w => lower.includes(w))) return { selected: true, priority: true };
    if (yesWords.some(w => lower.includes(w))) return { selected: true, priority: false };
    if (noWords.some(w => lower.includes(w))) return { selected: false, priority: false };
    return null; // couldn't parse
  }

  recordResponse(intent) {
    const category = this.categories[this.currentIndex];
    this.results.push({ ...category, ...intent });
    this.currentIndex++;
    
    if (this.currentIndex >= this.categories.length) {
      this.phase = 'generating';
      return 'generate';
    }
    return 'next';
  }

  getSelectedCategories() {
    return this.results.filter(r => r.selected);
  }

  getPriorityCategories() {
    return this.results.filter(r => r.priority);
  }
}
```

### OpenClaw Integration
OpenClaw monitors the Tavus transcript in real-time or via webhook. For each new user utterance:
1. Pass to `parseIntent()`
2. Call `recordResponse()`  
3. If returns 'generate' → trigger Phase 4 (Claude call)
4. If returns 'next' → Tavus persona continues to next question

---

## Phase 4: Claude Schedule Generation (30 min)

### Objective
Convert category selections into an intelligent daily schedule via Claude API.

### Tasks
- [ ] Create `claude.js` — Claude API wrapper
- [ ] Build system prompt (schedule optimization expert)
- [ ] Build user message from ConversationStateManager data:
  - Selected categories with priority flags
  - Wake/sleep times
  - Default durations and time preferences
- [ ] Request structured JSON (blocks, summary, tips, narration)
- [ ] Parse response, validate no time overlaps
- [ ] Store generated schedule in app state
- [ ] Handle errors (retry once, fallback to mock data)
- [ ] Generate narration text for Tavus to speak

### Verification Gate
✅ Claude returns valid schedule JSON from real category selections. Narration text reads naturally.

### Claude Call
```javascript
async function generateSchedule(selectedCategories, wakeTime, sleepTime) {
  const categoryList = selectedCategories.map(c => {
    const marker = c.priority ? '⭐ HIGH PRIORITY' : '';
    return `- ${c.name} (${c.defaultDuration} min, prefers ${c.timePreference}) ${marker}`;
  }).join('\n');

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': CLAUDE_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 2048,
      system: `You are a schedule optimization engine. Generate an intelligent daily schedule as JSON. Consider energy levels, natural transitions, buffer time, and priority items getting preferred slots. Include a "narration" field written as natural speech for a friendly robot to read aloud. Respond ONLY with valid JSON, no markdown fences.`,
      messages: [{
        role: 'user',
        content: `Create a schedule.
Wake: ${wakeTime} | Sleep: ${sleepTime}
Auto-included: Morning Routine (30 min), Meals (breakfast/lunch/dinner, 90 min total), Sleep

Selected:
${categoryList}

JSON schema:
{
  "blocks": [{"category":"","startTime":"","endTime":"","title":"","description":"","priority":false,"color":"#hex"}],
  "summary": "",
  "tips": [],
  "narration": "Here's your day..."
}`
      }]
    })
  });
  
  const data = await response.json();
  return JSON.parse(data.content[0].text);
}
```

---

## Phase 5: Timeline Display (45 min)

### Objective
Beautiful visual timeline that renders the generated schedule below the robot.

### Tasks
- [ ] Create `timeline.js` — Timeline renderer
- [ ] Layout: scrollable vertical timeline in bottom 50-60% of screen
- [ ] Each time block: colored left bar + time + title + description
- [ ] Priority blocks: star badge + gold accent
- [ ] Color-code blocks by category
- [ ] Staggered entrance animation (blocks slide in one by one, 50ms delay each)
- [ ] Active block highlight that syncs with robot narration
- [ ] Summary card at top of timeline
- [ ] Tips section at bottom
- [ ] "Start Over" button to reset conversation
- [ ] Responsive layout (works on projector/big screen for demo)

### Verification Gate
✅ Timeline renders from mock schedule data with smooth animations. Colors and layout look professional.

### Category Colors
```javascript
const CATEGORY_COLORS = {
  'Sleep & Recovery': '#6366F1',
  'Morning Routine': '#F59E0B',
  'Exercise': '#EF4444',
  'News': '#3B82F6',
  'Deep Work': '#14B8A6',
  'Meals': '#F59E0B',
  'Learning': '#8B5CF6',
  'Social': '#F87171',
  'Meditation': '#34D399',
  'Creative Time': '#EC4899',
  'Email': '#6B7280',
  'Entertainment': '#A855F7',
  'Side Project': '#F97316',
  'Self-Care': '#FB923C',
  'Finance': '#10B981'
};
```

### Timeline Block HTML Structure
```html
<div class="time-block" style="--block-color: #EF4444">
  <div class="time-label">7:30 AM</div>
  <div class="block-connector">
    <div class="connector-dot"></div>
    <div class="connector-line"></div>
  </div>
  <div class="block-content">
    <div class="block-header">
      <span class="block-title">Morning Workout</span>
      <span class="priority-badge">⭐</span>
    </div>
    <div class="block-description">High-intensity training session</div>
    <div class="block-duration">60 min</div>
  </div>
</div>
```

---

## Phase 6: Wire It All Together (45 min) ⚡ Critical — The magic moment

### Objective
Connect all pieces so the end-to-end flow works: voice conversation → state tracking → Claude generation → timeline display → robot narration.

### Tasks
- [ ] Create `app.js` — Main controller connecting all modules
- [ ] Flow: 
  1. Page load → init robot (idle state) → create Tavus conversation
  2. User joins → robot transitions to greeting → DRAKO speaks
  3. DRAKO asks categories → state machine tracks responses
  4. All categories done → robot goes to thinking state
  5. Claude API call fires → schedule generates
  6. Timeline renders with staggered animation
  7. DRAKO narrates schedule (feed narration to Tavus or use browser TTS)
  8. Each block highlights as it's narrated
  9. Robot celebrates at the end
- [ ] Handle the Tavus → OpenClaw → frontend data flow
- [ ] Handle the OpenClaw → Claude → Tavus return flow
- [ ] Error handling: if Tavus drops, if Claude fails, if parsing fails
- [ ] Test end-to-end 3 times with different category selections
- [ ] Debug and fix timing issues

### Verification Gate
✅ Full demo flow works end-to-end with real voice conversation. Schedule generates and displays while robot narrates.

### Integration Architecture
```javascript
// app.js - Main orchestrator
class DRAKOApp {
  constructor() {
    this.robot = new Robot('robot-container');
    this.tavus = new TavusManager(TAVUS_API_KEY);
    this.state = new ConversationStateManager(CATEGORIES);
    this.timeline = new TimelineRenderer('timeline-container');
  }

  async start() {
    this.robot.setExpression('idle');
    const conversation = await this.tavus.createConversation();
    this.tavus.onTranscript(this.handleTranscript.bind(this));
    this.tavus.onSpeakingState(this.handleSpeakingState.bind(this));
  }

  handleSpeakingState(state) {
    if (state === 'ai') this.robot.setExpression('talking');
    else if (state === 'user') this.robot.setExpression('listening');
    else this.robot.setExpression('idle');
  }

  handleTranscript(text, speaker) {
    if (speaker !== 'user') return;
    
    const intent = this.state.parseIntent(text);
    if (!intent) return;

    // Update robot expression based on response
    if (intent.priority) this.robot.flashExpression('excited', 1500);
    else if (intent.selected) this.robot.flashExpression('happy', 1000);
    else this.robot.flashExpression('sad', 1000);

    const action = this.state.recordResponse(intent);
    
    if (action === 'generate') {
      this.generateSchedule();
    }
  }

  async generateSchedule() {
    this.robot.setExpression('thinking');
    
    const schedule = await generateSchedule(
      this.state.getSelectedCategories(),
      this.state.wakeTime,
      this.state.sleepTime
    );

    this.timeline.render(schedule.blocks);
    this.robot.setExpression('talking');
    
    // Narrate through Tavus or browser TTS
    await this.narrate(schedule.narration);
    
    this.robot.setExpression('celebrating');
  }
}
```

### Fallback: Browser TTS for Narration
If routing narration back through Tavus is complex, use Web Speech API:
```javascript
async narrate(text) {
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1.1;
  utterance.pitch = 0.9; // Slightly lower for robot feel
  speechSynthesis.speak(utterance);
}
```

---

## Phase 7: Polish + Demo Prep (30 min)

### Tasks
- [ ] Add page title/branding: "DRAKO" logo or text
- [ ] Smooth all transitions between phases
- [ ] Add subtle background particles or grid animation
- [ ] Confetti animation when schedule completes
- [ ] Handle edge cases:
  - User says something unparseable → DRAKO asks again
  - All categories skipped → DRAKO: "Sounds like a rest day! Want me to plan that?"
  - API timeout → show friendly error, offer retry
- [ ] Test on the screen/projector you'll present on
- [ ] Rehearse demo script 3 times:
  1. Full flow with real voice
  2. Time it — must be under 2 minutes
  3. Prepare for "what if Tavus drops" — have browser TTS fallback
- [ ] Ensure no API keys visible on screen
- [ ] Prepare one-line architecture explanation for judges

### Demo Backup Plan
Pre-generate a schedule JSON as fallback. If any API fails during demo:
1. Robot still animates (local, no API needed)
2. Pre-recorded audio or browser TTS for conversation
3. Mock schedule renders on cue

---

## Contingency Plans

### If Tavus is problematic:
- Use Web Speech API for both STT and TTS
- Robot + Claude + Timeline still work perfectly
- Conversation still happens, just through browser speech
- Mention Tavus integration in architecture slide

### If running behind:
- **Cut Phase 1 scope:** Simpler robot (just eyes + mouth, skip antenna/extras). Save 20 min.
- **Cut Phase 5 scope:** Simple list instead of fancy timeline. Save 20 min.
- **Combine Phases 3+4:** Hardcode 5-6 categories instead of full 15. Save 15 min.

### If ahead of schedule (bonus features):
- Phase 8: Voice-driven schedule adjustments ("move exercise to evening")
- Phase 9: Save/share schedule as image
- Phase 10: Add ambient music that matches the robot's mood
- Phase 11: Multiple schedule styles (packed day, chill day, productive day)

---

## Quick Reference

### API Endpoints
```
Tavus Persona:     POST https://tavusapi.com/v2/personas
Tavus Conversation: POST https://tavusapi.com/v2/conversations
Claude Messages:    POST https://api.anthropic.com/v1/messages
```

### Key Files
```
app.js      → Main controller, wires everything
robot.js    → Character animation
tavus.js    → Voice conversation management
state.js    → Category tracking, intent parsing
claude.js   → Schedule generation
timeline.js → Visual schedule display
```

### Demo Day Reminders
1. Charge everything
2. Test APIs 30 minutes before demo
3. Have mock data ready as fallback
4. Keep the story simple: "Talk to your day"
5. End with the DRAKO vision: privacy-first, on-device, learns over time
6. Smile. You built something amazing in one day.
