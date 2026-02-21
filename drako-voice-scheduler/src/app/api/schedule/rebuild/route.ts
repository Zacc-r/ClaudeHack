import { NextRequest, NextResponse } from 'next/server';
import { getRedis, getUser, addEvent, type ScheduleEvent } from '@/lib/redis';
import { getClaude } from '@/lib/claude';
import { v4 as uuid } from 'uuid';

export const maxDuration = 30;

const COLORS = ['#6C5CE7', '#10B981', '#F59E0B', '#3B82F6', '#EC4899', '#EF4444', '#8B5CF6', '#14B8A6'];

export async function POST(req: NextRequest) {
  const userId = req.cookies.get('drako_user_id')?.value;
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const user = await getUser(userId);
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const today = new Date().toISOString().split('T')[0];
  const dayOfWeek = new Date().toLocaleDateString('en-US', { weekday: 'long' });

  const timeSlots: Record<string, { start: string; end: string; label: string; emoji: string }> =
    ((user as unknown as Record<string, unknown>).timeSlots as Record<string, { start: string; end: string; label: string; emoji: string }>) || {};

  const slotLines = Object.entries(timeSlots)
    .map(([, v]) => `  ${v.emoji} ${v.label}: ${v.start} – ${v.end}`)
    .join('\n');

  const claude = getClaude();
  let events: ScheduleEvent[] = [];

  try {
    const response = await claude.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 900,
      messages: [{
        role: 'user',
        content: `Build a realistic ${dayOfWeek} schedule for ${user.name} (${today}).

Their confirmed activity blocks (include these at exact times):
${slotLines || '  Use sensible defaults for a working professional'}

Wake time: ${user.rhythm || '7am'}
Role: ${user.type || 'professional'}

Instructions:
- Honour every activity block above at its exact time
- Fill gaps with: morning routine ☕, breakfast 🍳, lunch 🥗, transitions, evening wind-down 🌙
- No overlapping blocks
- Short emoji titles ≤25 chars
- Generate 8-12 events total covering wake through bedtime

Respond ONLY with a JSON array, no explanation:
[{"title":"...","start":"HH:MM","end":"HH:MM"}]`,
      }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '[]';
    const match = text.match(/\[[\s\S]*\]/);
    const parsed: { title: string; start: string; end: string }[] = match ? JSON.parse(match[0]) : [];
    events = parsed.map((e, i) => ({
      id: `evt_${uuid().slice(0, 8)}`,
      title: e.title, start: e.start, end: e.end,
      date: today, color: COLORS[i % COLORS.length],
    }));
  } catch (err) {
    console.error('[Rebuild] Claude failed, using direct slots:', err);
    events = Object.entries(timeSlots).map(([, v], i) => ({
      id: `evt_${uuid().slice(0, 8)}`,
      title: `${v.emoji} ${v.label}`, start: v.start, end: v.end,
      date: today, color: COLORS[i % COLORS.length],
    }));
  }

  // Clear old schedule, write new
  const r = getRedis();
  await r.del(`schedule:${userId}:${today}`);
  for (const event of events) await addEvent(userId, event);

  console.log(`[Rebuild] ${userId}: ${events.length} events`);
  return NextResponse.json({ success: true, events });
}
