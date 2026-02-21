# AI Output Conventions

Where each AI tool (Cursor, Claude, OpenClaw) should write outputs.

**Tokens:** Must never be stored in config files; use environment variables only. Never store tokens in MCP JSON configs.

## Cursor

| Output type | Location | Example |
|-------------|----------|---------|
| Prompt task files | `.cursor-prompts/` | `CURSOR_PROMPT_TASK.md` |
| Debug / scratch notes | `.cursor-prompts/` | `DEBUG_ISSUE.md` |
| Do NOT | Repo root | Loose `.md` at root |

## Claude

| Output type | Location | Example |
|-------------|----------|---------|
| Session logs | `.cursor-prompts/` or `scripts/tmp/` | `claude-session-20260221.md` |
| Script outputs | `scripts/tmp/` | CSV exports, report artifacts |
| Do NOT | Repo root | `claude-*.log` at root |

## OpenClaw

| Output type | Location | Example |
|-------------|----------|---------|
| Run artifacts | `.cursor-prompts/openclaw-runs/` | `run-20260221-*.json`, logs |
| Do NOT | Repo root | `openclaw-*.log` at root |

## Scripts (Node, Bash)

| Output type | Location | Example |
|-------------|----------|---------|
| Audit/report artifacts | `scripts/tmp/` | `audit-*.csv`, `report-*.json` |
| Dev server scratch | `tmp/` | Ephemeral cache files |
| Do NOT | Repo root | Loose files |

## Quick reference

| Zone | Tool | Blocked patterns (elsewhere) |
|------|------|-----------------------------|
| `.cursor-prompts/` | Cursor, Claude, OpenClaw | `CURSOR_PROMPT_*`, `DEBUG_*`, `*_scratch.md`, `*_notes.md`, `*.log`, `*.out`, `*.trace` |
| `.cursor-prompts/openclaw-runs/` | OpenClaw only | `openclaw*.log`, `claude*.log` |
| `tmp/` | Dev servers, scripts | — |
| `scripts/tmp/` | Audit/ETL scripts | — |

See `agents/policies/AI_WRITE_POLICY.md` for full policy.
