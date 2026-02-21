import { NextRequest, NextResponse } from 'next/server';
import { getRedis, getUser, addEvent, getSchedule, type ScheduleEvent } from '@/lib/redis';
import { getClaude } from '@/lib/claude';
import { v4 as uuid } from 'uuid';

export const maxDuration = 30;

const COLORS = ['#6C5CE7','#10B981','#F59E0B','#3B82F6','#EC4899','#EF4444','#8B5CF6','#14B8A6'];
let colorIdx = 0;

function nextColor() { return COLORS[colorIdx++ % COLORS.length]; }

export async function POST(req: NextRequest) {
  const userId = req.cookies.get('drako_user_id')?.value;
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const user = await getUser(userId);
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const { message, date } = await req.json();
  const targetDate = date || new Date().toISOString().split('T')[0];

  const events = await getSchedule(userId, targetDate);

  const systemPrompt = `You are DRAKO, ${user.name}'s AI scheduling assistant. 
You understand natural language schedule changes and respond with both a friendly message AND a JSON action.

Current schedule for ${targetDate}:
${events.map(e => `- [${e.id}] "${e.title}" ${e.start}–${e.end}`).join('\n') || '(empty)'}

You MUST respond in this exact format (valid JSON, nothing else):
{
  "reply": "friendly short confirmation (1-2 sentences, casual, use emojis)",
  "action": "none" | "add" | "move" | "remove" | "resize" | "rebuild",
  "eventId": "existing event id (for move/remove/resize)",
  "event": { "title": "...", "start": "HH:MM", "end": "HH:MM", "color": "#hex" }
}

Rules:
- action "none": just chatting, no change
- action "add": create new event (provide full event object, no eventId)
- action "move": change start/end time (provide eventId + updated event)
- action "remove": delete event (provide eventId only)
- action "resize": change duration (provide eventId + updated event with new end)
- action "rebuild": regenerate the whole day's schedule
- Always use HH:MM 24h format for times
- Keep event titles short with emoji prefix`;

  const claude = getClaude();
  const response = await claude.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 400,
    system: systemPrompt,
    messages: [{ role: 'user', content: message }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '{}';
  let parsed: { reply: string; action: string; eventId?: string; event?: Partial<ScheduleEvent> };

  try {
    const match = text.match(/\{[\s\S]*\}/);
    parsed = match ? JSON.parse(match[0]) : { reply: text, action: 'none' };
  } catch {
    return NextResponse.json({ reply: text, action: 'none', events });
  }

  const r = getRedis();
  let updatedEvents = events;

  if (parsed.action === 'add' && parsed.event) {
    const newEvent: ScheduleEvent = {
      id: `evt_${uuid().slice(0,8)}`,
      title: parsed.event.title || '📌 New event',
      start: parsed.event.start || '09:00',
      end: parsed.event.end || '10:00',
      date: targetDate,
      color: parsed.event.color || nextColor(),
    };
    await addEvent(userId, newEvent);
    updatedEvents = await getSchedule(userId, targetDate);

  } else if (parsed.action === 'move' && parsed.eventId && parsed.event) {
    const key = `schedule:${userId}:${targetDate}`;
    const existing = events.find(e => e.id === parsed.eventId);
    if (existing) {
      await r.lrem(key, 0, JSON.stringify(existing));
      const updated = { ...existing, start: parsed.event.start || existing.start, end: parsed.event.end || existing.end };
      await r.rpush(key, JSON.stringify(updated));
      updatedEvents = await getSchedule(userId, targetDate);
    }

  } else if (parsed.action === 'remove' && parsed.eventId) {
    const key = `schedule:${userId}:${targetDate}`;
    const existing = events.find(e => e.id === parsed.eventId);
    if (existing) { await r.lrem(key, 0, JSON.stringify(existing)); }
    updatedEvents = await getSchedule(userId, targetDate);

  } else if (parsed.action === 'resize' && parsed.eventId && parsed.event) {
    const key = `schedule:${userId}:${targetDate}`;
    const existing = events.find(e => e.id === parsed.eventId);
    if (existing) {
      await r.lrem(key, 0, JSON.stringify(existing));
      const updated = { ...existing, end: parsed.event.end || existing.end };
      await r.rpush(key, JSON.stringify(updated));
      updatedEvents = await getSchedule(userId, targetDate);
    }

  } else if (parsed.action === 'rebuild') {
    const rebuildRes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/schedule/rebuild`, {
      method: 'POST',
      headers: { 'cookie': req.headers.get('cookie') || '' },
    });
    if (rebuildRes.ok) {
      const data = await rebuildRes.json();
      updatedEvents = data.events || [];
    }
  }

  // Sort by start time
  updatedEvents.sort((a,b) => a.start.localeCompare(b.start));
  return NextResponse.json({ reply: parsed.reply, action: parsed.action, events: updatedEvents });
}
