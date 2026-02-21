# OpenClaw Run Template

> Copy-paste this into your prompt. Fill in the bracketed fields.

---

```
AGENT: @[AgentName]
TASK: [One-line description of what to do]

SCOPE:
- [File or directory 1 to touch]
- [File or directory 2 to touch]
- No changes outside scope.

ALLOWED WRITE ZONES (new files only here):
- [Zone 1, e.g. src/]
- [Zone 2, e.g. docs/]
- All other paths: edit-only, no new files.

OUTPUT CONTRACT:
- Run logs → .cursor-prompts/openclaw-runs/YYYY-MM-DD/
- Generated artifacts → scripts/tmp/openclaw/
- Never create files at repo root.

VERIFY (run all, paste output):
1. Build/lint check                              → exit 0
2. [Task-specific check]                         → exit 0

EVIDENCE FORMAT:
  [command]
  [stdout/stderr, truncated to key lines]
  RESULT: PASS | FAIL
```

---

## Filled Example

### Build a new feature

```
AGENT: @Builder
TASK: Add user authentication flow

SCOPE:
- src/auth/ (new)
- src/app/login/ (new)

ALLOWED WRITE ZONES:
- src/
- lib/

OUTPUT CONTRACT:
- Run logs → .cursor-prompts/openclaw-runs/2026-02-21/
- Never create files at repo root.

VERIFY:
1. npm run build                                 → exit 0
2. npm run lint                                  → exit 0

EVIDENCE FORMAT:
  $ npm run build
  ✓ Compiled successfully
  RESULT: PASS
```
