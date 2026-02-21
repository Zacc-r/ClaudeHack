# Key Decisions Log

---

### [10:45 AM] Project Structure
- **Decision**: Separate `ceo-files/` (strategy docs) from `ai-agents/` (runtime/memory)
- **Reason**: Clean separation of planning vs execution context
- **Impact**: All agents know where to find strategy vs runtime state

### [10:45 AM] Fresh GitHub Repo
- **Decision**: Brand new repo "ClaudeHack" — zero prior code
- **Reason**: Transparency for hackathon judges, clean start
- **Impact**: Everything built from scratch today, fully auditable

### [11:50 AM] Package Manager: pnpm over npm
- **Decision**: Use pnpm instead of npm for dependency management
- **Reason**: npm kept hanging/failing with disk space issues; pnpm was faster and more resilient
- **Impact**: Project uses pnpm-lock.yaml, run `pnpm install` for deps

### [11:50 AM] Removed CopilotKit Imports
- **Decision**: Removed CopilotKit imports from layout.tsx (was causing build errors)
- **Reason**: Our stack is Tavus + Claude API, not CopilotKit; these imports were likely from a different session/experiment
- **Impact**: Clean build, can add our actual integration dependencies as needed

### Phase 1 Infrastructure
- **Decision**: Using ioredis (not @redis/client) for Redis — better pub/sub support
- **Decision**: Singleton pattern for Redis + Claude clients — prevents connection leaks in serverless
- **Decision**: Redis sorted sets (ZADD/ZRANGEBYSCORE) for schedule storage — natural time-ordered retrieval, O(log n) inserts
- **Decision**: Tavus API URL: tavusapi.com/v2 with pipeline_mode: full, Cartesia TTS engine
- **Decision**: Re-added CopilotKit as dependency (react-core, react-ui, runtime) for text chat fallback alongside Tavus voice
