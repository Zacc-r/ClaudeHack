# Tavus API Quick Reference
### For DRAKO Build — All agents read this

---

## Authentication
All requests use header: `x-api-key: <your-tavus-api-key>`
Base URL: `https://tavusapi.com/v2`

## Stock Replicas (use for hackathon — no custom video needed)
- Nathan: `re8e740a42`
- Celebrity DJ persona: `p24293d6`

## Core Endpoints

### Create Persona
```
POST /v2/personas
```
```json
{
  "persona_name": "DRAKO",
  "pipeline_mode": "full",
  "system_prompt": "You are DRAKO, a friendly and efficient voice AI scheduling assistant...",
  "context": "You help users manage their daily schedule through conversation...",
  "default_replica_id": "re8e740a42",
  "layers": {
    "llm": {
      "model": "tavus-llama"
    },
    "tts": {
      "tts_engine": "cartesia",
      "tts_emotion_control": true
    }
  }
}
```
Response includes `persona_id` — save this.

### Create Conversation
```
POST /v2/conversations
```
```json
{
  "replica_id": "re8e740a42",
  "persona_id": "<your-persona-id>",
  "conversational_context": "The user wants to plan their day. Current schedule: [inject from Redis]",
  "callback_url": "https://your-app.com/api/tavus-webhook"
}
```
Response includes:
- `conversation_id` — unique ID
- `conversation_url` — embed this in an iframe or redirect to it
- `status` — "active"

### Get Conversation
```
GET /v2/conversations/{conversation_id}
```

### End Conversation
```
POST /v2/conversations/{conversation_id}/end
```

### List Personas
```
GET /v2/personas
```

### Update Persona (JSON Patch)
```
PATCH /v2/personas/{persona_id}
```
```json
[
  { "op": "replace", "path": "/context", "value": "Updated context..." },
  { "op": "replace", "path": "/system_prompt", "value": "New prompt..." }
]
```

## Function Calling (Tools)
Tavus supports function calling — the persona can trigger external tools during conversation.
Define tools in the persona's `layers.llm.tools` array:
```json
{
  "type": "function",
  "function": {
    "name": "add_schedule_event",
    "description": "Add a new event to the user's schedule",
    "parameters": {
      "type": "object",
      "properties": {
        "title": { "type": "string" },
        "start_time": { "type": "string" },
        "end_time": { "type": "string" }
      },
      "required": ["title", "start_time"]
    }
  }
}
```

## Document/RAG Support
Upload docs the persona can reference during conversation:
```
POST /v2/documents
```
Use `document_ids` or `document_tags` in persona or conversation creation.

## Embedding the Conversation
The `conversation_url` returned is a Daily.co room URL.
Embed in your app with an iframe:
```html
<iframe src="{conversation_url}" allow="camera;microphone" />
```

## Key Notes
- Conversations timeout after 4 minutes by default
- Callback webhooks fire on conversation status changes
- You can inject `conversational_context` per-conversation to customize each session
- Supports 30+ languages via Cartesia + ElevenLabs
