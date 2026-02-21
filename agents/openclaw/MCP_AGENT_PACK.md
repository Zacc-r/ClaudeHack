# MCP Agent Pack — Hackathon

> 4 agents. Each owns a domain. All bound by `agents/policies/AI_WRITE_POLICY.md`.

---

## Usage

### Choosing an agent

Read the task. Scan the **Default Routing Rules** table below. Pick the **first matching** agent based on keywords in the task. If nothing matches, default to **Builder**.

### Invoking an agent in a prompt

Prefix your prompt with the agent name to set scope:

```
@Builder    — Build features, add routes, create components
@DataOps    — Run scripts, process data, ETL tasks
@DevOps     — Deploy, fix CI, manage infra
@Gardener   — Clean up, organize, maintain repo structure
```

### Where each agent can create files

| Agent | Create-new zones |
|-------|-----------------|
| Builder | `src/`, `lib/`, `components/`, `app/`, `pages/` |
| DataOps | `scripts/`, `scripts/tmp/`, `data/`, `docs/` |
| DevOps | `.github/`, `ops/`, `docs/` |
| Gardener | `.dead-code/`, `docs/`, `agents/` |

Everything else is **edit-only** — the agent can modify existing files but cannot create new ones outside its zones.

---

## OpenClaw Output Contract

All OpenClaw-generated artifacts must land in exactly two places:

| What | Where | Example |
|------|-------|---------|
| Run logs, JSON, scratch | `.cursor-prompts/openclaw-runs/YYYY-MM-DD/` | `run-20260221-143022.json` |
| Script-generated reports | `scripts/tmp/openclaw/` | `audit-export-20260221.csv` |

**Hard rules:**
1. Never create files at repo root.
2. Date-stamp directories: use `YYYY-MM-DD` folders inside `openclaw-runs/`.
3. All output in these dirs is gitignored or ephemeral.

**Template:** See `agents/openclaw/OPENCLAW_RUN_TEMPLATE.md` for a copy-paste prompt scaffold.

---

## 1. Builder

**Owns:** Application code — features, routes, components, styles.

| | |
|---|---|
| **Responsibilities** | Build and modify application code. Add features, routes, components. Maintain types and utilities. |
| **Create files in** | `src/`, `lib/`, `components/`, `app/`, `pages/`, `public/` |
| **Edit-only** | `package.json` (dependencies only), config files |

**Never do:**
- Create loose files at repo root
- Touch deployment config without DevOps approval
- Delete files without checking for references first

---

## 2. DataOps

**Owns:** Scripts, data processing, ETL pipelines.

| | |
|---|---|
| **Responsibilities** | Build and maintain scripts. Run data processing tasks. Write output to `scripts/tmp/`. |
| **Create files in** | `scripts/`, `scripts/tmp/`, `data/`, `docs/` (data audits) |
| **Edit-only** | Data access modules, cron config |

**Never do:**
- Write output files anywhere except `scripts/tmp/` (gitignored)
- Run destructive operations without explicit user approval

---

## 3. DevOps

**Owns:** Deploys, CI/CD, infrastructure config.

| | |
|---|---|
| **Responsibilities** | Run deploys. Maintain CI workflows. Manage infra configs. |
| **Create files in** | `.github/workflows/`, `ops/`, `docs/` (deployment docs) |
| **Edit-only** | `vercel.json`, deployment configs, `package.json` (scripts) |

**Never do:**
- Run production deploys without passing build first
- Force-push to main/master
- Modify application code — that's Builder territory

---

## 4. Gardener

**Owns:** Repository structure, cleanup, organization.

| | |
|---|---|
| **Responsibilities** | Maintain repo structure. Archive dead code to `.dead-code/`. Update `.gitignore`. Organize files. |
| **Create files in** | `.dead-code/`, `docs/`, `agents/` |
| **Edit-only** | `.gitignore`, root config files |

**Never do:**
- Delete files that are imported without checking references
- Create files at repo root
- Modify application code

---

## Default Routing Rules

When a task arrives, route to the **first matching** agent:

| Signal | Route to |
|--------|----------|
| Task mentions deploy, CI, production, infra | **DevOps** |
| Task mentions script, ETL, data, process, ingest | **DataOps** |
| Task mentions cleanup, organize, archive, structure | **Gardener** |
| Task mentions feature, component, route, UI, build | **Builder** |
| Ambiguous | **Builder** (default) |

**Conflict resolution:**
- If scope is uncertain: **STOP** and ask before proceeding.
- If two agents claim edit rights to the same file: the agent whose **primary domain owns the file** wins.

---

## Smoke Checklist

Run from repo root to verify setup:

```sh
# 1. Verify agent dirs exist
ls -la agents/

# 2. Verify output zones exist
ls -la .cursor-prompts/openclaw-runs/

# 3. Verify gitignore covers outputs
grep -E "openclaw|cursor-prompts" .gitignore || echo "Add to .gitignore"
```
