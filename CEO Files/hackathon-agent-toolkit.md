# The Agent Toolkit — Complete Skills, Tools & CLI Reference
### For OpenClaw, Claude Code, Cursor, and AI Agent Development
### Compiled: February 21, 2026

---

## TABLE OF CONTENTS

1. [OpenClaw Built-in Tools](#openclaw-built-in-tools)
2. [OpenClaw Chat Commands](#openclaw-chat-commands)
3. [OpenClaw CLI Commands](#openclaw-cli-commands)
4. [Official Company Agent Skills](#official-company-agent-skills)
5. [Official Company CLI Tools](#official-company-cli-tools)
6. [Community Skills — Coding & Frontend](#community-skills--coding--frontend)
7. [Community Skills — Project Management & Productivity](#community-skills--project-management--productivity)
8. [Community Skills — AI & LLM](#community-skills--ai--llm)
9. [Community Skills — DevOps & Infrastructure](#community-skills--devops--infrastructure)
10. [Community Skills — Data & APIs](#community-skills--data--apis)
11. [Community Skills — Creative & Media](#community-skills--creative--media)
12. [Community Skills — Communication & Social](#community-skills--communication--social)
13. [Community Skills — Finance & Crypto](#community-skills--finance--crypto)
14. [Community Skills — Smart Home & IoT](#community-skills--smart-home--iot)
15. [Community Skills — Meta & Agent Management](#community-skills--meta--agent-management)
16. [Swift & iOS Specific Skills](#swift--ios-specific-skills)
17. [MCP Servers](#mcp-servers)
18. [Skill Installation Methods](#skill-installation-methods)
19. [Recommended Stacks by Use Case](#recommended-stacks-by-use-case)

---

## OPENCLAW BUILT-IN TOOLS

These are the core capabilities you enable in `openclaw.json` under `tools.allow`:

| Tool | What It Does | Risk Level |
|------|-------------|------------|
| `read` | Read files on your system | Low |
| `write` | Create and edit files | Medium |
| `exec` | Run shell/terminal commands | High |
| `web_search` | Search the web (Google-style) | Low |
| `web_fetch` | Fetch and read web pages | Low |
| `browser` | Full Chrome control — click, type, screenshot, navigate, fill forms | High |
| `memory` | Remember information across sessions | Low |
| `canvas` | Visual workspace for diagrams/flowcharts (A2UI) | Low |
| `image` | Understand and analyze images | Low |
| `cron` | Schedule recurring tasks on a timer | Medium |
| `sessions` | Manage conversation sessions | Medium |
| `message` | Send messages across channels | Medium |
| `voice_call` | Make/receive phone calls with ElevenLabs TTS | High |
| `discord_actions` | Discord server management | Medium |
| `slack_actions` | Slack workspace actions | Medium |

**Configuration example:**
```json
{
  "tools": {
    "allow": ["read", "write", "exec", "web_search", "web_fetch", "browser", "memory", "image"]
  }
}
```

---

## OPENCLAW CHAT COMMANDS

Use these inside any conversation with your agent:

### Session & Status
| Command | What It Does |
|---------|-------------|
| `/status` | Session info — model, tokens used, cost |
| `/status --usage` | Full provider usage breakdown |
| `/context` | Show what's in the context window and token usage |
| `/id` | Show sender identity info |
| `/help` | List all available commands |

### Model & Thinking
| Command | What It Does |
|---------|-------------|
| `/model <name>` | Switch model mid-chat (e.g., `/model opus`) |
| `/think high` | Enable extended thinking / reasoning |
| `/think off` | Disable extended thinking |
| `/verbose on` | Show tool execution details |
| `/verbose full` | Show ALL tool output |
| `/reason on` | Show structured reasoning |

### Execution
| Command | What It Does |
|---------|-------------|
| `/bash <command>` | Run a shell command directly |
| `!poll` | Check output of running background job |
| `!stop` | Stop current running task |
| `/stop` | Stop current generation |

### Session Management
| Command | What It Does |
|---------|-------------|
| `/new` | Start a new session |
| `/clear` | Clear current session context |
| `/undo` | Undo last action |
| `/retry` | Retry last failed action |

### Channel & Routing
| Command | What It Does |
|---------|-------------|
| `/dock-telegram` | Route replies to Telegram |
| `/dock-discord` | Route replies to Discord |
| `/dock-slack` | Route replies to Slack |

### Configuration
| Command | What It Does |
|---------|-------------|
| `/config get <key>` | Read a config value |
| `/config set <key> <value>` | Set a config value |
| `/allowlist list` | Show allowed senders |
| `/allowlist add <id>` | Add sender to allowlist |

---

## OPENCLAW CLI COMMANDS

Run these from your terminal:

### Setup & Health
```bash
openclaw onboard              # First-time setup wizard
openclaw setup                # Re-run setup
openclaw doctor               # Diagnose issues
openclaw security audit       # Security check
openclaw update               # Update to latest version
openclaw reset                # Reset config/state
openclaw uninstall            # Remove gateway + data
```

### Gateway (Background Service)
```bash
openclaw gateway status       # Is it running?
openclaw gateway start        # Start the daemon
openclaw gateway stop         # Stop it
openclaw gateway restart      # Restart
openclaw gateway run          # Run in foreground (debug)
openclaw gateway logs         # View logs
openclaw gateway health       # Health check
openclaw gateway probe        # Probe RPC endpoint
openclaw gateway discover     # DNS discovery
openclaw gateway install      # Install as system service
openclaw gateway uninstall    # Remove system service
```

### Skills
```bash
openclaw skills list          # List loaded skills
openclaw skills list -v       # With missing requirements detail
openclaw skills info <name>   # Detail on a specific skill
openclaw skills check         # Verify all skill requirements
npx clawhub install <name>    # Install from ClawHub registry
npx clawhub search <query>    # Search ClawHub for skills
npx clawhub sync              # Sync installed skills
```

### Models & Auth
```bash
openclaw models list          # Available models
openclaw models status        # Current model info
openclaw models set <model>   # Set primary model
openclaw models set-image <m> # Set image/vision model
openclaw models auth add      # Add provider credentials
openclaw models auth setup-token  # Anthropic setup token
openclaw models auth paste-token  # Paste token manually
openclaw models auth order get    # View auth rotation order
openclaw models aliases list      # List model aliases
openclaw models aliases add <alias> <model>  # Add shortcut
openclaw models fallbacks list    # View fallback chain
openclaw models fallbacks add <model>  # Add fallback model
```

### Memory
```bash
openclaw memory status        # Memory system status
openclaw memory index         # Re-index memory
openclaw memory search <q>    # Search memory
```

### Agents (Multi-Agent)
```bash
openclaw agents list          # List configured agents
openclaw agents add           # Add a new agent
openclaw agents delete <id>   # Remove an agent
```

### Channels
```bash
openclaw channels list        # Connected channels
openclaw channels status      # Channel health
openclaw channels add         # Connect new channel
openclaw channels remove      # Disconnect channel
openclaw channels login       # Re-authenticate
openclaw channels logout      # Disconnect auth
```

### Cron (Scheduled Tasks)
```bash
openclaw cron status          # Cron system status
openclaw cron list            # List scheduled jobs
openclaw cron add             # Add a new job
openclaw cron edit <id>       # Edit existing job
openclaw cron rm <id>         # Remove a job
openclaw cron enable <id>     # Enable a job
openclaw cron disable <id>    # Disable a job
openclaw cron runs            # View run history
openclaw cron run <id>        # Manually trigger a job
```

### Browser
```bash
openclaw browser status       # Browser state
openclaw browser start        # Launch controlled browser
openclaw browser stop         # Close browser
openclaw browser reset-profile  # Reset browser profile
openclaw browser tabs         # List open tabs
openclaw browser open <url>   # Open URL
openclaw browser focus <id>   # Focus a tab
openclaw browser close <id>   # Close a tab
openclaw browser screenshot   # Capture current page
openclaw browser snapshot     # Get page structure (aria/ai)
openclaw browser navigate <url>  # Navigate to URL
openclaw browser click <ref>  # Click an element
openclaw browser type <ref> <text>  # Type into element
```

### Sandbox
```bash
openclaw sandbox list         # List sandboxes
openclaw sandbox recreate     # Recreate sandbox container
openclaw sandbox explain      # Explain sandbox config
```

### Nodes (iOS/Android/Remote)
```bash
openclaw nodes list           # List connected nodes
openclaw nodes devices        # List devices
openclaw node run             # Run command on node
openclaw node status          # Node health
openclaw node install         # Install node agent
openclaw node start/stop/restart  # Manage node
```

### System
```bash
openclaw system event         # System events
openclaw system heartbeat last    # Last heartbeat
openclaw system heartbeat enable  # Enable heartbeat
openclaw system heartbeat disable # Disable heartbeat
openclaw presence             # Online/presence status
```

### Approvals & Security
```bash
openclaw approvals get        # View pending approvals
openclaw approvals set        # Set approval policy
openclaw acp status           # Agent Control Protocol status
openclaw acp health           # ACP health check
```

### Plugins
```bash
openclaw plugins list         # List plugins
openclaw plugins info <name>  # Plugin details
openclaw plugins install <n>  # Install plugin
openclaw plugins enable <n>   # Enable plugin
openclaw plugins disable <n>  # Disable plugin
openclaw plugins doctor       # Plugin health check
```

---

## OFFICIAL COMPANY AGENT SKILLS

Skills published by the actual engineering teams at these companies:

### Anthropic
| Skill | Description |
|-------|-------------|
| Official Claude Code skills | Built into Claude Code |

### Vercel
| Skill | Description |
|-------|-------------|
| `openai/vercel-deploy` | Deploy to Vercel with preview or production options |
| `vercel-react-best-practices` | React/Next.js best practices from Vercel |
| Skills.sh ecosystem | `npx skills add <skill-name>` for Vercel-curated skills |

### Cloudflare
| Skill | Description |
|-------|-------------|
| `cloudflare/wrangler` | Deploy and manage Workers, KV, R2, D1, Vectorize, Queues, Workflows |
| `dmmulroy/cloudflare-skill` | Cloudflare platform reference for Workers, Pages, storage, AI, networking |

### Supabase
| Skill | Description |
|-------|-------------|
| `supabase/postgres-best-practices` | PostgreSQL best practices for Supabase |

### Google
| Skill | Description |
|-------|-------------|
| `google-gemini/gemini-skills` | Gemini API, SDK, and model interactions |
| `google-labs-code/design-md` | Create and manage DESIGN.md files |
| `google-labs-code/enhance-prompt` | Improve prompts with design specs and UI/UX vocabulary |
| `google-labs-code/react-components` | Stitch to React component conversion |
| `google-labs-code/remotion` | Generate walkthrough videos from app designs |
| `google-labs-code/shadcn-ui` | Build UI components with shadcn/ui |
| `google-labs-code/stitch-loop` | Iterative design-to-code feedback loop |

### Stripe
| Skill | Description |
|-------|-------------|
| Official Stripe agent skill | Payment integration best practices |

### Sentry
| Skill | Description |
|-------|-------------|
| Official Sentry skill | Error tracking and monitoring integration |

### Expo
| Skill | Description |
|-------|-------------|
| Official Expo skill | React Native development with Expo |

### Hugging Face
| Skill | Description |
|-------|-------------|
| Official HF skills | ML workflows, model discovery, inference |

### Remotion
| Skill | Description |
|-------|-------------|
| `remotion-dev/remotion` | Programmatic video creation with React |

### Replicate
| Skill | Description |
|-------|-------------|
| `replicate/replicate` | Discover, compare, and run AI models via API |

### Typefully
| Skill | Description |
|-------|-------------|
| `typefully/typefully` | Create, schedule, publish to X, LinkedIn, Threads, Bluesky, Mastodon |

### ClickHouse
| Skill | Description |
|-------|-------------|
| `ClickHouse/agent-skills` | ClickHouse database best practices |

### Neon
| Skill | Description |
|-------|-------------|
| `neondatabase/using-neon` | Best practices for Neon Serverless Postgres |

### Trail of Bits
| Skill | Description |
|-------|-------------|
| Official security skills | Security auditing and vulnerability analysis |

---

## OFFICIAL COMPANY CLI TOOLS

Install these on your system so OpenClaw can use them:

### Deployment & Hosting
| CLI | Install | Key Commands |
|-----|---------|-------------|
| `vercel` | `npm i -g vercel` | `vercel`, `vercel --prod`, `vercel env pull` |
| `netlify` | `npm i -g netlify-cli` | `netlify deploy`, `netlify dev`, `netlify open` |
| `wrangler` | `npm i -g wrangler` | `wrangler deploy`, `wrangler dev`, `wrangler pages` |
| `railway` | `npm i -g @railway/cli` | `railway up`, `railway run`, `railway logs` |
| `fly` | `brew install flyctl` | `fly launch`, `fly deploy`, `fly status` |
| `firebase` | `npm i -g firebase-tools` | `firebase deploy`, `firebase serve`, `firebase init` |
| `heroku` | `brew tap heroku/brew && brew install heroku` | `heroku create`, `heroku ps`, `heroku logs` |
| `coolify` | Docker-based | Self-hosted PaaS with web UI |

### Databases
| CLI | Install | Key Commands |
|-----|---------|-------------|
| `supabase` | `npm i -g supabase` | `supabase init`, `supabase start`, `supabase db push` |
| `turso` | `brew install tursodatabase/tap/turso` | `turso db create`, `turso db shell` |
| `planetscale` | `brew install planetscale/tap/pscale` | `pscale connect`, `pscale branch` |

### Git & Source Control
| CLI | Install | Key Commands |
|-----|---------|-------------|
| `gh` | `brew install gh` | `gh repo create`, `gh pr create`, `gh issue list` |
| `git` | Pre-installed | `git add`, `git commit`, `git push` |
| `glab` | `brew install glab` | GitLab CLI equivalent of `gh` |

### Payments & Commerce
| CLI | Install | Key Commands |
|-----|---------|-------------|
| `stripe` | `brew install stripe/stripe-cli/stripe` | `stripe listen`, `stripe trigger`, `stripe logs` |

### Communication
| CLI | Install | Key Commands |
|-----|---------|-------------|
| `twilio` | `npm i -g twilio-cli` | `twilio phone-numbers:list`, `twilio api` |

### Monitoring & Observability
| CLI | Install | Key Commands |
|-----|---------|-------------|
| `sentry-cli` | `npm i -g @sentry/cli` | `sentry-cli releases`, `sentry-cli sourcemaps` |

### Mobile Development
| CLI | Install | Key Commands |
|-----|---------|-------------|
| `expo` | `npm i -g expo-cli` | `expo start`, `expo build`, `expo publish` |
| `xcrun` | Xcode (pre-installed on Mac) | `xcrun simctl`, `xcrun swift` |
| `xcodebuild` | Xcode | `xcodebuild build`, `xcodebuild test` |
| `swift` | Xcode | `swift build`, `swift run`, `swift test` |
| `pod` | `gem install cocoapods` | `pod install`, `pod update` |
| `asc` | App Store Connect CLI | `asc apps list`, `asc builds` |

### Package Managers
| CLI | Install | Key Commands |
|-----|---------|-------------|
| `npm` | Comes with Node.js | `npm install`, `npm run` |
| `bun` | `brew install bun` | `bun install`, `bun run` (much faster than npm) |
| `pnpm` | `npm i -g pnpm` | `pnpm install`, `pnpm run` |
| `yarn` | `npm i -g yarn` | `yarn add`, `yarn run` |
| `brew` | Pre-installed on Mac | `brew install`, `brew update` |
| `pip` | Comes with Python | `pip install` |
| `uv` | `brew install uv` | `uv pip install` (fast Python package manager) |
| `cargo` | Rust toolchain | `cargo build`, `cargo run` |

### Search & Utilities
| CLI | Install | Key Commands |
|-----|---------|-------------|
| `ripgrep` (`rg`) | `brew install ripgrep` | `rg <pattern>` — fast file search |
| `fzf` | `brew install fzf` | Fuzzy finder for files/commands |
| `jq` | `brew install jq` | JSON processor |
| `yq` | `brew install yq` | YAML processor |
| `httpie` | `brew install httpie` | `http GET/POST` — better than curl |
| `bat` | `brew install bat` | `bat <file>` — cat with syntax highlighting |
| `fd` | `brew install fd` | `fd <pattern>` — fast file finder |
| `ast-grep` | `brew install ast-grep` | Structural code search |
| `tree` | `brew install tree` | Directory structure visualization |
| `watch` | Pre-installed | `watch -n 1 <command>` — repeat command |

### AI Agent CLIs
| CLI | Install | Key Commands |
|-----|---------|-------------|
| `claude` | `npm i -g @anthropic-ai/claude-code` | `claude`, `claude --model` |
| `codex` | `npm i -g @openai/codex` | `codex` |
| `gemini` | `npm i -g @anthropic-ai/gemini-cli` | `gemini` |
| `openclaw` | `npm i -g openclaw` | `openclaw onboard` |

---

## COMMUNITY SKILLS — CODING & FRONTEND

| Skill | Description |
|-------|-------------|
| `context7` | Fetch live library docs via API — React, Tavus, any framework |
| `frontend-design-auditor` | Expert UI/UX + React performance auditor (PinakBot) |
| `design-system-extractor` | Extract design tokens, components, patterns from codebases |
| `conventional-commits` | Format commits using Conventional Commits standard |
| `pr-reviewer` | Automated GitHub PR code review with diff analysis |
| `pr-commit-workflow` | Create commits and PRs following best practices |
| `commit-analyzer` | Analyze git commit patterns for autonomous coding |
| `self-improvement` | Agent learns from mistakes, logs learnings |
| `claude-code-wingman` | Dispatch Claude Code tasks in background tmux sessions |
| `treelisty-openclaw-skill` | Hierarchical project decomposition |
| `recursive-decomposition` | Handle 100+ file, 50k+ token tasks |
| `bug-isolator` | Create minimal subtests to isolate complex bugs |
| `adr-skill` | Manage Architecture Decision Records |

---

## COMMUNITY SKILLS — PROJECT MANAGEMENT & PRODUCTIVITY

| Skill | Description |
|-------|-------------|
| `adhd-project-manager` | Hyperfocus management, context-switch minimization |
| `flowmind` | Goals, tasks, subtasks, notes, people, tags via REST API |
| `project-context-sync` | Keep a living project state document updated |
| `cron-natural-language` | Create cron jobs from natural language |
| `master-timing` | Master OpenClaw's Cron vs Heartbeat timing systems |
| `daily-briefing` | AI-recommended actions texted every morning |
| `brain-dump-to-tasks` | Dump goals → agent generates and schedules tasks |

---

## COMMUNITY SKILLS — AI & LLM

| Skill | Description |
|-------|-------------|
| `orchestrate-multi-model` | Use multiple AI models as workers with Claude as coordinator |
| `pollinations` | Pollinations.ai API for text, images, videos, audio generation |
| `parallel-search` | High-accuracy web search via Parallel.ai API |
| `claude-agent-designer` | Design custom Claude Code agents with effective prompts |
| `self-learning-api-generator` | Auto-discovers APIs from browser traffic |
| `self-writing-meta-extension` | Learns how you work, writes new capabilities into itself |
| `triple-memory` | LanceDB + Git-Notes + file-based memory system |
| `sophie-optimizer` | Automated context health management |

---

## COMMUNITY SKILLS — DEVOPS & INFRASTRUCTURE

| Skill | Description |
|-------|-------------|
| `railway-skill` | Deploy and manage apps on Railway.app |
| `coolify` | Manage Coolify deployments, apps, databases |
| `azure-infra` | Azure Cloud management via CLI |
| `azure-proxy` | Azure OpenAI integration |
| `r2-storage` | Cloudflare R2 storage management |
| `ssh-essentials` | SSH commands for remote access |
| `sysadmin-toolbox` | Tool discovery and shell one-liners |
| `system-monitor` | CPU, RAM, GPU status of local machine |
| `reverse-proxy-local` | Connect to internet via Tailscale |
| `tailscale` | Manage Tailscale tailnet |
| `prometheus` | Query Prometheus monitoring data |

---

## COMMUNITY SKILLS — DATA & APIs

| Skill | Description |
|-------|-------------|
| `danube` | 100+ API tools (Gmail, GitHub, Notion, etc.) through MCP |
| `deepwiki` | Query DeepWiki MCP server for GitHub repo documentation |
| `office-to-md` | Convert Word, Excel, PowerPoint, PDF to Markdown |
| `canvas-lms` | Access Canvas LMS for course data, assignments |
| `qlik-cloud` | Complete Qlik Cloud analytics (37 tools) |
| `servicenow-agent` | Read-only ServiceNow Table, Attachment access |
| `servicenow-docs` | Search ServiceNow documentation |

---

## COMMUNITY SKILLS — CREATIVE & MEDIA

| Skill | Description |
|-------|-------------|
| `nano-banana-pro` | Generate/edit images via Gemini 3 Pro |
| `ffmpeg-video-editor` | Generate FFmpeg commands from natural language |
| `figma` | Professional Figma design analysis and asset export |
| `gifhorse` | Search video dialogue, create reaction GIFs with subtitles |
| `excalidraw-flowchart` | Create Excalidraw flowcharts from descriptions |
| `gamma` | Generate presentations, documents, social posts via Gamma.app |
| `remotion` | Programmatic video creation with React |
| `eachlabs-image-edit` | Edit, transform, upscale images using 200+ AI models |
| `eachlabs-fashion-ai` | Fashion imagery, virtual try-on, runway videos |

---

## COMMUNITY SKILLS — COMMUNICATION & SOCIAL

| Skill | Description |
|-------|-------------|
| `typefully` | Schedule posts to X, LinkedIn, Threads, Bluesky, Mastodon |
| `instagram-teneo` | Extract Instagram data |
| `zoom-manager` | Manage Zoom meetings via OAuth API |
| `negotiation` | Tactical negotiation framework (Chris Voss methods) |
| `13-free-business-skills` | Prospect research, cold email, competitor analysis, SEO, CRM |

---

## COMMUNITY SKILLS — FINANCE & CRYPTO

| Skill | Description |
|-------|-------------|
| `agent-commerce-engine` | Universal engine for agentic commerce |
| `cost-governor` | Track LLM costs, enforce budget limits |
| `token-panel-ultimate` | Track AI usage across Claude Max, Gemini, Manus |
| `rba-rate-intelligence` | RBA cash rate monitor |
| `sec-filing-watcher` | Monitor SEC EDGAR for new filings |
| `polymarket` | Prediction market trading |
| `token-launcher` | Launch tokens on Base via Uniswap V4 |

---

## COMMUNITY SKILLS — SMART HOME & IOT

| Skill | Description |
|-------|-------------|
| `switchbot` | Control SwitchBot devices (curtains, plugs, lights, locks) |
| `tado` | Smart thermostat control |
| `wyoming-openclaw` | Wyoming Protocol bridge for Home Assistant voice |
| `snapmaker` | Monitor and control 3D printers |
| `camsnap` | Capture from RTSP/ONVIF cameras |
| `solar-weather` | Monitor solar weather / geomagnetic conditions |
| `remarkable` | Send files to reMarkable e-ink tablet |
| `airfoil` | Control AirPlay speakers |

---

## COMMUNITY SKILLS — META & AGENT MANAGEMENT

| Skill | Description |
|-------|-------------|
| `sophie-optimizer` | Automated context health management |
| `skill-publisher` | Prepare skills for public registry |
| `skill-release-manager` | Automate skill release lifecycle |
| `skill-vetter` | Security-first skill vetting |
| `skill-exporter` | Export skills as standalone microservices |
| `openclaw-migration` | Handle workspace renaming migrations |
| `update-plus` | Full backup, update, restore for OpenClaw |
| `openclaw-backup` | Backup and restore config, skills, settings |
| `usage-export` | Export usage data to CSV for analytics |
| `claw-swarm` | Collaborative agent swarm for difficult tasks |
| `soulstamp` | Agent identity verification |
| `clawprint` | Agent discovery, trust, exchange |

---

## SWIFT & iOS SPECIFIC SKILLS

| Skill | Author | Description |
|-------|--------|-------------|
| `swiftui-expert-skill` | AvdLee | Modern SwiftUI best practices + iOS 26 Liquid Glass |
| `swift-patterns-skill` | efremidze | Modern Swift/SwiftUI patterns |
| `claude-skills` (Swift) | Joannis | Swift Server development + linting |
| `app-store-connect-cli-skills` | rudrankriyam | Automate App Store deployments via ASC CLI |
| `makepad-skills` | ZhangHanDong | Makepad UI development for Rust apps |
| `swiftui-ux-craft` | Custom (yours) | Production SwiftUI components, animations, gestures |
| `ux-design-laws` | Custom (yours) | Universal UX laws: Fitts, Hick, Gestalt, etc. |

---

## MCP SERVERS

Model Context Protocol servers that extend agent capabilities:

### Official / Major
| MCP Server | What It Does |
|-----------|-------------|
| Notion | Read/write Notion pages, databases |
| Linear | Issue tracking, project management |
| Slack | Message channels, search history |
| GitHub | Full GitHub API access |
| Google Drive | Search, read, write Drive files |
| Gmail | Read, send, manage email |
| Stripe | Payment data, customer management |
| Filesystem | Read/write local files with permissions |
| Postgres | Direct database queries |
| Sentry | Error monitoring and tracking |

### Community
| MCP Server | What It Does |
|-----------|-------------|
| Danube | 100+ API tools through single MCP |
| DeepWiki | GitHub repo documentation |
| Context7 | Live library documentation |
| Obsidian | Note management |

---

## SKILL INSTALLATION METHODS

### Method 1: ClawHub (Official Registry)
```bash
npx clawhub install <skill-name>
npx clawhub search <query>
npx clawhub sync
```

### Method 2: GitHub URL (Paste in Chat)
Just paste the repo URL in your OpenClaw chat:
```
"Install this skill: https://github.com/openclaw/skills/tree/main/skills/<author>/<skill>"
```

### Method 3: Manual (Drop in Folder)
```bash
mkdir -p ~/.openclaw/skills/<skill-name>
# Copy SKILL.md into the folder
# OpenClaw auto-detects on next load
```

### Method 4: Workspace Skills (Per-Project)
```bash
mkdir -p <project>/skills/<skill-name>
# Skills here only apply to this project
```

### Method 5: Skills.sh (Vercel Ecosystem)
```bash
npx skills add <skill-name>
```

### Skill Precedence
```
Workspace skills (highest)
  → ~/.openclaw/skills (managed/local)
    → Bundled skills (lowest)
```

---

## RECOMMENDED STACKS BY USE CASE

### Hackathon (Web App)
```
Skills:  context7, frontend-design-auditor, conventional-commits,
         self-improvement, ux-design-laws, shadcn-ui
CLIs:    vercel, gh, bun, ripgrep
Tools:   read, write, exec, web_search, web_fetch, memory
```

### Hackathon (iOS App)
```
Skills:  swiftui-ux-craft, ux-design-laws, swiftui-expert-skill,
         swift-patterns-skill, self-improvement, context7
CLIs:    xcrun, swift, gh, xcodebuild
Tools:   read, write, exec, web_search, memory
```

### Full-Stack Product
```
Skills:  context7, supabase-best-practices, vercel-deploy,
         cloudflare-wrangler, stripe-skill, pr-reviewer
CLIs:    vercel, supabase, stripe, gh, bun
Tools:   read, write, exec, web_search, web_fetch, browser, memory, cron
```

### AI Agent Development
```
Skills:  claude-agent-designer, orchestrate-multi-model, triple-memory,
         sophie-optimizer, self-improvement, self-writing-meta-extension
CLIs:    claude, openclaw, gh
Tools:   read, write, exec, web_search, web_fetch, memory, cron, sessions
```

### Solo Founder / Productivity
```
Skills:  adhd-project-manager, daily-briefing, brain-dump-to-tasks,
         13-free-business-skills, typefully, flowmind
CLIs:    gh, vercel, supabase
Tools:   read, write, exec, web_search, web_fetch, memory, cron, message
```

### Content & Marketing
```
Skills:  typefully, gamma, figma, nano-banana-pro, remotion,
         negotiation, 13-free-business-skills
CLIs:    gh, vercel
Tools:   read, write, exec, web_search, web_fetch, browser, image
```

---

*This reference covers 5,700+ skills on ClawHub, 50+ bundled skills, 25+ official company CLIs, and the full OpenClaw tool/command surface. For the latest, check github.com/openclaw/openclaw and clawhub.com.*
