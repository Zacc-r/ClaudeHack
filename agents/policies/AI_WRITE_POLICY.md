# AI Write Policy

Governs what AI agents (Cursor, Claude, OpenClaw, etc.) may create and where.

## Principles

1. **No blind writes** — Agents must not create or modify files outside allowed paths without explicit user approval.
2. **Tokens must never be stored in config files** — Use environment variables only. No secrets in JSON, YAML, or committed config.
3. **Preserve invariants** — Never break builds or deployment config.
4. **Audit trail** — Prefer moves and renames over deletes; use `.dead-code/` for archives.
5. **One place for outputs** — All AI-generated docs, logs, and prompts land in designated zones only.

## Canonical AI Output Zones

| Zone | Path | Used by | Contents |
|------|------|---------|----------|
| Prompts & logs | `.cursor-prompts/` | Cursor, Claude, OpenClaw | CURSOR_PROMPT_*.md, DEBUG_*.md, prompts, openclaw-runs/ |
| Runtime scratch | `tmp/` | Scripts, dev servers | Ephemeral files during local runs |
| Script outputs | `scripts/tmp/` | Audit/operational scripts | CSV dumps, report artifacts, script scratch |

## Tool Output Routing (Cursor / Claude / OpenClaw)

| Tool | Output type | Where to write | Blocked elsewhere |
|------|-------------|----------------|-------------------|
| **Cursor** | Prompts, debug notes | `.cursor-prompts/` | Root |
| **Claude** | Session logs, scratch | `.cursor-prompts/` or `scripts/tmp/` | Root (`claude*.log`, `*_notes.md`) |
| **OpenClaw** | Run logs, artifacts | `.cursor-prompts/openclaw-runs/` | Root (`openclaw*.log`, `*.out`, `*.trace`) |

### Examples

```
✅ .cursor-prompts/CURSOR_PROMPT_TASK.md
✅ .cursor-prompts/DEBUG_ISSUE.md
✅ .cursor-prompts/openclaw-runs/run-20260221.json
✅ scripts/tmp/audit-export.csv

❌ ROOT_JUNK.md                    → guard FAIL
❌ claude-session.log              → blocked, gitignored
❌ openclaw-run.out                → blocked, gitignored
❌ analysis_scratch.md             → blocked (use .cursor-prompts/)
```

## Allowed Write Locations

| Path | Agent May | Notes |
|------|-----------|-------|
| `src/` | Create source files | Main application code |
| `lib/` | Add modules, extend existing | Shared utilities |
| `scripts/` | Add operational scripts | ESM .mjs preferred |
| `docs/` | Add, update docs | Project documentation |
| `agents/` | Add policies, runbooks, specs | Agent configs and prompts |
| `.cursor-prompts/` | Archive prompt artifacts, logs | CURSOR_PROMPT_*, DEBUG_*, openclaw-runs/ |
| `tmp/` | Runtime scratch only | Ephemeral; gitignored |
| `scripts/tmp/` | Script output artifacts | Gitignored |

## Blocked patterns (anywhere in tree, unless in `.cursor-prompts/`)

- `*.backup`, `*.bak`, `*.tmp`, `*.disabled`
- `CURSOR_PROMPT_*`, `DEBUG_*`
- `*_scratch.md`, `*_notes.md`, `*_tmp.*`
- `openclaw*.log`, `claude*.log`, `*.log`, `*.out`, `*.trace`

## Enforcement

- Agents should run build/lint checks before committing structural changes
- `.gitignore` blocks log files and scratch artifacts
