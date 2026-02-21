# DRAKO AI Agent Hub
### Shared context, memory, and scripts for all agents
### Hackathon Day — February 21, 2026

---

## Purpose
This folder is the central nervous system for all AI agents working on DRAKO.
Every agent reads from and writes to this shared space so they understand each other.

---

## Folder Structure

```
ai-agents/
├── AGENT-HUB.md          ← You are here. Master index.
├── memory/                ← Persistent memory across agent sessions
│   ├── decisions.md       ← Key decisions made during the build
│   ├── progress.md        ← What's done, what's next, blockers
│   └── learnings.md       ← Things we learned (API quirks, gotchas)
├── scripts/               ← Runnable scripts for automation
│   └── (scripts go here)
└── shared-context/        ← Shared state agents can read/write
    ├── project-state.json ← Current phase, status, config
    └── api-status.md      ← API health, keys status, endpoints
```

---

## Agent Communication Protocol

1. **Before starting work**: Read `memory/progress.md` to know current state
2. **When making a decision**: Log it in `memory/decisions.md` with timestamp
3. **When hitting a blocker**: Update `memory/progress.md` with the blocker
4. **When learning something**: Add it to `memory/learnings.md`
5. **When completing a phase**: Update `shared-context/project-state.json`

---

## Active Agents

| Agent | Role | Reads | Writes |
|-------|------|-------|--------|
| Claude (CEO Files) | Strategy, PRD, phase plans | ceo-files/* | ceo-files/* |
| Claude (Builder) | Code generation, debugging | ai-agents/*, src/* | src/*, ai-agents/memory/* |
| Claude (Reviewer) | Code review, testing | src/*, ai-agents/* | ai-agents/memory/learnings.md |

---

## Current Build Phase
**Phase**: 0 — Environment + Accounts
**Status**: Setting up
**Next milestone**: Tavus + Claude APIs tested, project scaffolded
