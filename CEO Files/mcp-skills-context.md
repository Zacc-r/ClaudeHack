# MCP Agent Skills & Context
### Configuration for Figma MCP + CopilotKit MCP

---

## Figma MCP — Skills for Cursor + Claude Code

### What it does
Figma MCP gives your coding agents direct access to Figma design data — layout, components, variables, tokens — so they generate accurate code instead of guessing from screenshots.

### Configuration
```json
{
  "mcpServers": {
    "figma": {
      "url": "https://mcp.figma.com/mcp"
    }
  }
}
```

### Available Tools
- `get_design_context` — Get layout, styles, and component info for a selected frame
- `get_code_connect_mappings` — Map Figma components to your codebase components
- `get_variables_and_styles` — Extract design tokens (colors, spacing, typography)
- `generate_figma_design` — (Claude Code only) Send UI back to Figma as design layers

### How to use effectively
1. Select a frame in Figma (or paste a Figma link)
2. Prompt: "Implement this design as a React + Tailwind component"
3. The agent reads the actual design data (not a screenshot) and generates code

### Context rules for agents
- Always use Tailwind CSS classes, not inline styles
- Match Figma spacing values to Tailwind's spacing scale
- Use semantic HTML elements
- Extract colors as CSS variables / Tailwind config values
- Maintain responsive behavior — check Figma auto-layout constraints

---

## CopilotKit MCP — Skills for the Next.js App

### What it does
CopilotKit connects your React frontend to AI agents and MCP tool servers. It provides shared state, chat UI, and the ability for the AI to call tools and render UI dynamically.

### Packages
```
@copilotkit/react-core    — Hooks: useCopilotReadable, useCopilotAction, useCopilotChat
@copilotkit/react-ui      — Components: CopilotSidebar, CopilotPopup, CopilotChat
@copilotkit/runtime        — Backend: CopilotRuntime, AnthropicAdapter
```

### Key Hooks for DRAKO

#### useCopilotReadable — Give the AI access to app state
```typescript
useCopilotReadable({
  description: "The user's current schedule",
  value: scheduleData,
});
```
Use this so DRAKO's chat can "see" the schedule without the user describing it.

#### useCopilotAction — Let the AI modify app state
```typescript
useCopilotAction({
  name: "addScheduleEvent",
  description: "Add a new event to the schedule",
  parameters: [
    { name: "title", type: "string", required: true },
    { name: "startTime", type: "string", required: true },
    { name: "endTime", type: "string" },
  ],
  handler: async ({ title, startTime, endTime }) => {
    await addEventToRedis({ title, startTime, endTime });
    refreshSchedule();
  },
});
```

#### useCopilotChat — Programmatic chat control
```typescript
const { setMcpServers, visibleMessages, appendMessage } = useCopilotChat();
```

### Integration Pattern for DRAKO
```
DRAKO App
├── CopilotKit Provider (layout.tsx)
│   ├── useCopilotReadable → schedule state
│   ├── useCopilotAction → add/move/remove events
│   ├── CopilotSidebar → text chat backup for voice
│   └── Tavus Video iframe → primary voice interface
```

The CopilotKit chat sidebar acts as a **text fallback** alongside the Tavus voice interface. Both can modify the same schedule state.

---

## Redis Schema for Schedule Data

```
Key Pattern: schedule:{user_id}:{date}
Type: Sorted Set (score = start_time as minutes since midnight)

Example:
schedule:demo:2026-02-21
  score: 540   → { "id": "evt_1", "title": "Team Standup", "start": "09:00", "end": "09:30" }
  score: 720   → { "id": "evt_2", "title": "Lunch", "start": "12:00", "end": "13:00" }
  score: 840   → { "id": "evt_3", "title": "Focus Time", "start": "14:00", "end": "16:00" }
```

### Redis Commands
```
ZADD schedule:demo:2026-02-21 540 '{"id":"evt_1","title":"Team Standup","start":"09:00","end":"09:30"}'
ZRANGEBYSCORE schedule:demo:2026-02-21 0 1440   # Get all events for the day
ZREM schedule:demo:2026-02-21 '{"id":"evt_1",...}'  # Remove an event
```

---

## Demo Script (for hackathon presentation)

### Scene 1: Empty Schedule
- Open app → DRAKO greets user
- "Hey! I'm DRAKO. Your schedule is wide open today. What would you like to plan?"

### Scene 2: Build a Day
- User: "Add a team standup at 9am, lunch at noon, and focus time from 2 to 4"
- DRAKO confirms each, UI updates in real-time

### Scene 3: Conflict Resolution
- User: "Add a dentist appointment at 2:30pm"
- DRAKO: "That overlaps with your Focus Time block. Want me to shorten focus time to end at 2:30, or move the dentist to after 4?"

### Scene 4: Quick View
- User: "What does my afternoon look like?"
- DRAKO summarizes just the PM events
