# TOOLS.md - Local Notes

## API Endpoints
- **Tavus Persona**: `POST https://tavusapi.com/v2/personas`
- **Tavus Conversation**: `POST https://tavusapi.com/v2/conversations`
- **Claude Messages**: `POST https://api.anthropic.com/v1/messages`

## API Keys
- **Tavus**: Set via `$TAVUS_API_KEY` (check `.env.local`)
- **Claude**: Set via `$CLAUDE_API_KEY` (check `.env.local`)

## Dev Server
- Expected at: `http://localhost:3000`
- Stack: Vanilla HTML/JS/CSS (no framework)

## Git
- Repo: `github.com/Zacc-r/ClaudeHack`
- Branch: `main`
- Remote: `origin`

## Health Check Commands
```bash
# Test Claude API
curl -s https://api.anthropic.com/v1/messages \
  -H "x-api-key: $CLAUDE_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d '{"model":"claude-sonnet-4-5-20250929","max_tokens":10,"messages":[{"role":"user","content":"ping"}]}' | head -c 200

# Test Tavus API
curl -s https://tavusapi.com/v2/personas \
  -H "x-api-key: $TAVUS_API_KEY" | head -c 200

# Dev server
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000
```
