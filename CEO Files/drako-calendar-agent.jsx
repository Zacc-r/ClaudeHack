import React, { useState, useEffect, useCallback } from "react";

// ═══════════════════════════════════════════════════════════════
// DRAKO — Calendar Agent Architecture
// Real-time voice → AI processing → Calendar UI
// ═══════════════════════════════════════════════════════════════

// ┌─────────────────────────────────────────────────────────────┐
// │                    THE BIG PICTURE                          │
// │                                                             │
// │  User speaks → Tavus hears → Function call fires →          │
// │  Your API processes → Claude reasons → Redis updates →      │
// │  Frontend polls → Calendar animates                         │
// │                                                             │
// │  TWO PATHS:                                                 │
// │  PATH A: Real-time (function calling during conversation)   │
// │  PATH B: Post-conversation (webhook with full transcript)   │
// │                                                             │
// │  We build BOTH. Path A for live updates.                    │
// │  Path B as fallback + batch processing.                     │
// └─────────────────────────────────────────────────────────────┘

// ═══════════════════════════════════════════════════════════════
// SECTION 1: CLOUD INFRASTRUCTURE
// ═══════════════════════════════════════════════════════════════

/*
SERVICES NEEDED:
─────────────────────────────────────────────
1. Vercel (Next.js host)
   - Frontend + API routes
   - Serverless functions handle Tavus webhooks
   - Edge functions for low-latency Redis reads
   - FREE tier is fine for hackathon

2. Redis Cloud (already set up)
   - Schedule data (sorted sets by time)
   - Session state (conversation_id → user mapping)
   - Event stream (pub/sub for real-time UI updates)

3. Tavus CVI
   - Video avatar + voice
   - Function calling → hits your Vercel API routes
   - Webhooks → transcript + status updates

4. Claude API (Anthropic)
   - Schedule reasoning (conflict detection, suggestions)
   - Natural language → structured event data
   - Called BY your API routes, not directly by Tavus

FLOW DIAGRAM:
─────────────────────────────────────────────

  User speaks: "Add gym at 7am tomorrow"
       │
       ▼
  ┌─────────────┐
  │  TAVUS CVI  │  STT transcribes → LLM processes
  │  (hosted)   │  → recognizes intent → triggers function call
  └──────┬──────┘
         │ HTTP POST (function call)
         ▼
  ┌─────────────────────┐
  │  VERCEL API ROUTE   │  /api/tavus/tools
  │  (your serverless)  │
  └──────┬──────────────┘
         │ calls Claude for validation
         ▼
  ┌─────────────────────┐
  │  CLAUDE API         │  "Is there a conflict at 7am?"
  │  (reasoning)        │  → returns structured response
  └──────┬──────────────┘
         │ writes result
         ▼
  ┌─────────────────────┐
  │  REDIS CLOUD        │  ZADD schedule:user:2026-02-22 420 '{...}'
  │  (state store)      │  PUBLISH schedule:updates '{event_added}'
  └──────┬──────────────┘
         │ pub/sub notification
         ▼
  ┌─────────────────────┐
  │  NEXT.JS FRONTEND   │  Receives update → animates new card in
  │  (React + SSE)      │
  └─────────────────────┘
*/

// ═══════════════════════════════════════════════════════════════
// SECTION 2: API ROUTES (Next.js App Router)
// ═══════════════════════════════════════════════════════════════

// --- /api/tavus/tools/route.ts ---
// This is what Tavus function calling hits
const TavusToolsHandler = `
import { NextRequest, NextResponse } from 'next/server';
import { Redis } from 'ioredis';
import Anthropic from '@anthropic-ai/sdk';

const redis = new Redis(process.env.REDIS_URL);
const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { function_name, arguments: args, conversation_id } = body;

  switch (function_name) {
    case 'get_schedule':
      return handleGetSchedule(args, conversation_id);
    case 'add_event':
      return handleAddEvent(args, conversation_id);
    case 'move_event':
      return handleMoveEvent(args, conversation_id);
    case 'remove_event':
      return handleRemoveEvent(args, conversation_id);
    default:
      return NextResponse.json({ error: 'Unknown function' }, { status: 400 });
  }
}

async function handleAddEvent(args, conversationId) {
  const { title, start_time, end_time, date } = args;
  const targetDate = date || new Date().toISOString().split('T')[0];
  const startMinutes = timeToMinutes(start_time);

  // Ask Claude to validate
  const currentSchedule = await getScheduleFromRedis(targetDate);
  const validation = await claude.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 300,
    messages: [{
      role: 'user',
      content: \`Current schedule for \${targetDate}: \${JSON.stringify(currentSchedule)}
      User wants to add: "\${title}" at \${start_time}\${end_time ? ' to ' + end_time : ''}.
      Check for conflicts. Respond with JSON:
      { "ok": true/false, "conflict": null or "description", "suggestion": null or "alternative" }\`
    }]
  });

  const result = JSON.parse(validation.content[0].text);

  if (result.ok) {
    const event = {
      id: 'evt_' + Date.now(),
      title, start: start_time, end: end_time || null, date: targetDate
    };
    await redis.zadd(\`schedule:demo:\${targetDate}\`, startMinutes, JSON.stringify(event));
    await redis.publish('schedule:updates', JSON.stringify({ type: 'add', event }));
    return NextResponse.json({ success: true, event, message: \`Added "\${title}" at \${start_time}\` });
  } else {
    return NextResponse.json({
      success: false,
      conflict: result.conflict,
      suggestion: result.suggestion
    });
  }
}
`;

// --- /api/schedule/stream/route.ts ---
// Server-Sent Events for real-time UI updates
const ScheduleStreamHandler = `
import { NextRequest } from 'next/server';
import { Redis } from 'ioredis';

export async function GET(req: NextRequest) {
  const encoder = new TextEncoder();
  const subscriber = new Redis(process.env.REDIS_URL);

  const stream = new ReadableStream({
    start(controller) {
      subscriber.subscribe('schedule:updates');
      subscriber.on('message', (channel, message) => {
        controller.enqueue(encoder.encode(\`data: \${message}\\n\\n\`));
      });
    },
    cancel() {
      subscriber.unsubscribe('schedule:updates');
      subscriber.disconnect();
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
`;

// --- /api/webhook/tavus/route.ts ---
// Post-conversation transcript processing (Path B)
const WebhookHandler = `
import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { Redis } from 'ioredis';

const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const redis = new Redis(process.env.REDIS_URL);

export async function POST(req: NextRequest) {
  const body = await req.json();

  if (body.event_type === 'application.transcription_ready') {
    const transcript = body.properties.transcript;

    // Send full transcript to Claude for batch schedule extraction
    const extraction = await claude.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: \`Extract ALL schedule changes from this conversation transcript.
        Return JSON array of actions:
        [{ "action": "add|move|remove", "title": "...", "start": "HH:MM", "end": "HH:MM", "date": "YYYY-MM-DD" }]

        Transcript:
        \${JSON.stringify(transcript)}\`
      }]
    });

    const actions = JSON.parse(extraction.content[0].text);
    // Process each action and update Redis
    for (const action of actions) {
      await processScheduleAction(action);
    }

    return NextResponse.json({ processed: actions.length });
  }

  return NextResponse.json({ ok: true });
}
`;

// ═══════════════════════════════════════════════════════════════
// SECTION 3: FRONTEND — Calendar Component with Real-time Updates
// ═══════════════════════════════════════════════════════════════

const MOCK_EVENTS = [
  { id: "evt_1", title: "Team Standup", start: "09:00", end: "09:30", color: "#6C5CE7" },
  { id: "evt_2", title: "Lunch Break", start: "12:00", end: "13:00", color: "#10B981" },
  { id: "evt_3", title: "Focus Time", start: "14:00", end: "16:00", color: "#F59E0B" },
];

const HOURS = Array.from({ length: 14 }, (_, i) => i + 7); // 7am to 8pm

function timeToMinutes(t) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function minutesToY(minutes, startHour = 7) {
  return ((minutes - startHour * 60) / 60) * 80;
}

// Schedule Card Component
function ScheduleCard({ event, isNew, onRemove }) {
  const top = minutesToY(timeToMinutes(event.start));
  const height = event.end
    ? ((timeToMinutes(event.end) - timeToMinutes(event.start)) / 60) * 80
    : 60;

  return (
    <div
      style={{
        position: "absolute",
        top: `${top}px`,
        left: "72px",
        right: "16px",
        height: `${Math.max(height, 40)}px`,
        background: `${event.color || "#6C5CE7"}18`,
        borderLeft: `4px solid ${event.color || "#6C5CE7"}`,
        borderRadius: "0 12px 12px 0",
        padding: "10px 14px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        animation: isNew ? "slideIn 0.3s ease-out" : "none",
        transition: "all 0.3s ease",
        cursor: "pointer",
      }}
      onClick={() => onRemove && onRemove(event.id)}
    >
      <div style={{ fontWeight: 600, fontSize: "14px", color: "#F8FAFC" }}>
        {event.title}
      </div>
      <div style={{ fontSize: "12px", color: "#94A3B8", fontFamily: "monospace", marginTop: "2px" }}>
        {event.start}{event.end ? ` — ${event.end}` : ""}
      </div>
    </div>
  );
}

// Voice Activity Indicator
function VoiceIndicator({ active, speaker }) {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: "6px",
      padding: "8px 16px",
      borderRadius: "20px",
      background: active ? (speaker === "drako" ? "#6C5CE718" : "#10B98118") : "#1E1E2E",
      transition: "all 0.3s ease",
    }}>
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          style={{
            width: "3px",
            height: active ? `${12 + Math.random() * 16}px` : "4px",
            background: active ? (speaker === "drako" ? "#A855F7" : "#10B981") : "#475569",
            borderRadius: "2px",
            transition: "height 0.1s ease",
            animation: active ? `wave 0.5s ease-in-out ${i * 0.1}s infinite alternate` : "none",
          }}
        />
      ))}
      <span style={{ fontSize: "12px", color: "#94A3B8", marginLeft: "4px" }}>
        {active ? (speaker === "drako" ? "🐉 DRAKO speaking" : "🎤 Listening...") : "Idle"}
      </span>
    </div>
  );
}

// Main App Layout
export default function DRAKOApp() {
  const [events, setEvents] = useState(MOCK_EVENTS);
  const [newEventIds, setNewEventIds] = useState(new Set());
  const [voiceActive, setVoiceActive] = useState(false);
  const [speaker, setSpeaker] = useState("user");
  const [conversationUrl, setConversationUrl] = useState(null);
  const [status, setStatus] = useState("ready");
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  // Simulate voice activity for demo
  useEffect(() => {
    const interval = setInterval(() => {
      setVoiceActive((v) => !v);
      setSpeaker((s) => (s === "drako" ? "user" : "drako"));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // SSE listener for real-time schedule updates
  useEffect(() => {
    // In production: const es = new EventSource('/api/schedule/stream');
    // es.onmessage = (e) => {
    //   const update = JSON.parse(e.data);
    //   if (update.type === 'add') {
    //     setEvents(prev => [...prev, update.event]);
    //     setNewEventIds(prev => new Set([...prev, update.event.id]));
    //   }
    // };
  }, []);

  const addEvent = useCallback((event) => {
    const colors = ["#6C5CE7", "#10B981", "#F59E0B", "#EF4444", "#3B82F6", "#EC4899"];
    const newEvent = {
      ...event,
      id: "evt_" + Date.now(),
      color: colors[Math.floor(Math.random() * colors.length)],
    };
    setEvents((prev) => [...prev, newEvent].sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start)));
    setNewEventIds((prev) => new Set([...prev, newEvent.id]));
    setTimeout(() => {
      setNewEventIds((prev) => {
        const next = new Set(prev);
        next.delete(newEvent.id);
        return next;
      });
    }, 500);
  }, []);

  const removeEvent = useCallback((id) => {
    setEvents((prev) => prev.filter((e) => e.id !== id));
  }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0A0A0F",
        color: "#F8FAFC",
        fontFamily: "'Inter', -apple-system, sans-serif",
      }}
    >
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(40px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes wave {
          from { height: 4px; }
          to { height: 20px; }
        }
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(168, 85, 247, 0.4); }
          50% { box-shadow: 0 0 20px 4px rgba(168, 85, 247, 0.2); }
        }
      `}</style>

      {/* Header */}
      <header
        style={{
          padding: "16px 24px",
          borderBottom: "1px solid #1E293B",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "24px" }}>🐉</span>
          <span style={{ fontSize: "18px", fontWeight: 700, letterSpacing: "-0.5px" }}>DRAKO</span>
          <span style={{ fontSize: "13px", color: "#94A3B8" }}>Voice Schedule Builder</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ fontSize: "13px", color: "#94A3B8" }}>{today}</span>
          <div
            style={{
              width: "10px",
              height: "10px",
              borderRadius: "50%",
              background: status === "active" ? "#10B981" : status === "ready" ? "#F59E0B" : "#EF4444",
              animation: status === "active" ? "pulseGlow 2s infinite" : "none",
            }}
          />
        </div>
      </header>

      {/* Main Layout */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "0",
          height: "calc(100vh - 60px)",
        }}
      >
        {/* Left: Video Panel */}
        <div
          style={{
            borderRight: "1px solid #1E293B",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "32px",
            gap: "20px",
          }}
        >
          {/* Video Container */}
          <div
            style={{
              width: "100%",
              maxWidth: "480px",
              aspectRatio: "16/9",
              borderRadius: "16px",
              background: "#14141F",
              border: voiceActive && speaker === "drako"
                ? "2px solid #A855F7"
                : "2px solid #1E293B",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "64px",
              animation: voiceActive && speaker === "drako" ? "pulseGlow 1.5s infinite" : "none",
              transition: "border-color 0.3s ease",
              overflow: "hidden",
            }}
          >
            {conversationUrl ? (
              <iframe
                src={conversationUrl}
                allow="camera;microphone"
                style={{ width: "100%", height: "100%", border: "none", borderRadius: "14px" }}
              />
            ) : (
              "🐉"
            )}
          </div>

          <VoiceIndicator active={voiceActive} speaker={speaker} />

          {/* Quick Action Buttons */}
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", justifyContent: "center" }}>
            {[
              { label: "Start Conversation", action: () => setStatus("active") },
              { label: "+ Add Event", action: () => addEvent({ title: "New Event", start: "15:00", end: "16:00" }) },
              { label: "View Schedule", action: () => {} },
            ].map((btn) => (
              <button
                key={btn.label}
                onClick={btn.action}
                style={{
                  padding: "8px 16px",
                  borderRadius: "8px",
                  background: "#1E1E2E",
                  border: "1px solid #2D2D44",
                  color: "#F8FAFC",
                  fontSize: "13px",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
                onMouseOver={(e) => { e.currentTarget.style.background = "#2D2D44"; }}
                onMouseOut={(e) => { e.currentTarget.style.background = "#1E1E2E"; }}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>

        {/* Right: Schedule Panel */}
        <div
          style={{
            padding: "24px",
            overflowY: "auto",
          }}
        >
          <div style={{ marginBottom: "20px" }}>
            <h2 style={{ fontSize: "20px", fontWeight: 700, margin: 0 }}>Today's Schedule</h2>
            <p style={{ fontSize: "13px", color: "#94A3B8", margin: "4px 0 0" }}>
              {events.length} event{events.length !== 1 ? "s" : ""} scheduled
            </p>
          </div>

          {/* Timeline */}
          <div style={{ position: "relative", minHeight: `${HOURS.length * 80}px` }}>
            {/* Hour lines */}
            {HOURS.map((hour) => (
              <div
                key={hour}
                style={{
                  position: "absolute",
                  top: `${(hour - 7) * 80}px`,
                  left: 0,
                  right: 0,
                  display: "flex",
                  alignItems: "flex-start",
                }}
              >
                <span
                  style={{
                    fontSize: "11px",
                    color: "#475569",
                    fontFamily: "monospace",
                    width: "56px",
                    textAlign: "right",
                    paddingRight: "12px",
                    paddingTop: "2px",
                  }}
                >
                  {hour.toString().padStart(2, "0")}:00
                </span>
                <div
                  style={{
                    flex: 1,
                    borderTop: "1px solid #1E293B",
                  }}
                />
              </div>
            ))}

            {/* Events */}
            {events.map((event) => (
              <ScheduleCard
                key={event.id}
                event={event}
                isNew={newEventIds.has(event.id)}
                onRemove={removeEvent}
              />
            ))}

            {/* Now indicator */}
            {(() => {
              const now = new Date();
              const nowMinutes = now.getHours() * 60 + now.getMinutes();
              if (nowMinutes >= 7 * 60 && nowMinutes <= 20 * 60) {
                return (
                  <div
                    style={{
                      position: "absolute",
                      top: `${minutesToY(nowMinutes)}px`,
                      left: "56px",
                      right: 0,
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    <div
                      style={{
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        background: "#EF4444",
                      }}
                    />
                    <div style={{ flex: 1, height: "2px", background: "#EF444466" }} />
                  </div>
                );
              }
              return null;
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}
