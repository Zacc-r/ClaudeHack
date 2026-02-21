# Agent Boundaries & Governance
### Who does what — prevent agents from stepping on each other

---

## Agent Roles

### 🖥️ CURSOR (IDE Agent)
**Owns**: `src/` — all application code
**Can**: Create/edit React components, API routes, lib files, install npm packages
**Cannot**: Modify `ai-agents/` memory files, modify `ceo-files/`, run git operations
**Reports to**: Governor (Claude on claude.ai)

### ⚡ CLAUDE CODE (Terminal Agent)
**Owns**: `ai-agents/` — memory, scripts, shared context
**Can**: Run bash, git operations, API testing (curl), create scripts, manage .env files
**Cannot**: Write application code in `src/` without Governor approval
**Reports to**: Governor (Claude on claude.ai)

### 🦞 OPENCLAW (Autonomous Agent)
**Owns**: Monitoring, health checks, background automation
**Can**: Read all files, write to `ai-agents/memory/`, run health check scripts
**Cannot**: Modify `src/`, modify `ceo-files/`, make architectural decisions
**Reports to**: Governor (Claude on claude.ai)

### 🧠 GOVERNOR (Claude on claude.ai)
**Owns**: Strategy, decisions, prompt management, phase transitions
**Can**: Update all three agent prompts, make architectural decisions, approve phase changes
**Cannot**: Directly execute code (works through the other agents)
**Reports to**: Zacc (CEO)

---

## File Ownership Map

```
hackathon/
├── ceo-files/              → OWNER: Zacc + Governor (READ ONLY for agents)
├── ai-agents/
│   ├── AGENT-HUB.md        → OWNER: Claude Code
│   ├── AGENTS.md            → OWNER: Claude Code (OpenClaw reads)
│   ├── SOUL.md              → OWNER: Claude Code (OpenClaw reads)
│   ├── IDENTITY.md          → OWNER: Claude Code (OpenClaw reads)
│   ├── USER.md              → OWNER: Claude Code
│   ├── TOOLS.md             → OWNER: Claude Code
│   ├── memory/
│   │   ├── progress.md      → OWNER: All agents APPEND (Claude Code manages)
│   │   ├── decisions.md     → OWNER: Governor + Claude Code
│   │   └── learnings.md     → OWNER: All agents APPEND
│   ├── scripts/             → OWNER: Claude Code
│   └── shared-context/
│       ├── project-state.json → OWNER: Claude Code
│       ├── api-status.md     → OWNER: Claude Code + OpenClaw
│       └── device-info.md    → OWNER: Claude Code
├── src/                     → OWNER: Cursor
├── .env.local               → OWNER: Claude Code (never commit)
└── package.json             → OWNER: Cursor (Claude Code can read)
```

## Communication Protocol

### Before starting any work:
1. Read `ai-agents/memory/progress.md`
2. Check what phase we're in
3. Check for blockers

### After completing any task:
1. Update `progress.md` with what was done
2. If a decision was made, log in `decisions.md`
3. If something unexpected happened, log in `learnings.md`
4. Commit if file changes were made

### Conflict Resolution:
- If two agents need the same file → Governor decides priority
- If an agent is blocked → log blocker in `progress.md`, alert Governor
- If an agent finds a bug in another's work → log in `learnings.md`, don't fix directly

## Phase Gate Rules
- No agent advances to the next phase until Governor approves
- Governor approves based on progress.md showing all phase tasks complete
- Phase transitions are logged in decisions.md
