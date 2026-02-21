# MCP Setup Guide — Figma + CopilotKit for DRAKO

## MCP #1: Figma → Cursor + Claude Code
**Purpose**: Let your coding agents read Figma designs and generate code from them.

### Option A: Remote Server (Easiest — no Figma desktop app needed)

**For Cursor:**
Open Cursor → Settings → Cursor Settings → MCP tab → Add new global MCP server.
```json
{
  "mcpServers": {
    "figma": {
      "url": "https://mcp.figma.com/mcp"
    }
  }
}
```
Then click **Connect** next to Figma and authenticate with your Figma account.

**For Claude Code:**
```bash
claude mcp add --transport http figma https://mcp.figma.com/mcp
```
Then type `/mcp` in Claude Code, select `figma`, and click **Authenticate**.

### Option B: Desktop Server (Selection-based — more powerful)
1. Open Figma **desktop app** (must be latest version)
2. Open a Design file → toggle to **Dev Mode** (Shift+D)
3. In the inspect panel → click **Enable desktop MCP server**
4. Server runs at `http://127.0.0.1:3845/mcp`

**For Claude Code:**
```bash
claude mcp add --transport http figma-desktop http://127.0.0.1:3845/mcp
```

### How to use Figma MCP:
- Select a frame in Figma → prompt Cursor: "Implement this design as a React component"
- Paste a Figma link into the chat → it extracts the node ID and pulls design context
- Works with variables, components, layout data, and design tokens

---

## MCP #2: CopilotKit → Your Next.js App
**Purpose**: Let your app's frontend connect to MCP servers so DRAKO's AI can use tools through the UI.

### Step 1: Install CopilotKit packages
```bash
npm install @copilotkit/react-core @copilotkit/react-ui @copilotkit/runtime
```

### Step 2: Create the API route (`src/app/api/copilotkit/route.ts`)
### Step 3: Wrap app with CopilotKit in `src/app/layout.tsx`
### Step 4: Add MCP servers dynamically via `useCopilotChat`
### Step 5: Add CopilotSidebar for DRAKO chat UI

---

## Architecture
```
FIGMA DESIGNS
    ↓ (MCP: figma)
CURSOR / CLAUDE CODE → generates React code
    ↓
NEXT.JS APP (src/)
    ↓ (CopilotKit runtime)
COPILOTKIT ← connects to MCP servers for tools
    ↓
DRAKO UI (chat sidebar + schedule + Tavus video)
```
