import { NextRequest, NextResponse } from 'next/server';
import { getRedis, getUser, addEvent, type ScheduleEvent } from '@/lib/redis';
import { getClaude } from '@/lib/claude';
import { v4 as uuid } from 'uuid';

export const maxDuration = 30;

const COLORS = ['#6C5CE7','#10B981','#F59E0B','#3B82F6','#EC4899','#EF4444','#8B5CF6','#14B8A6'];
const DOW: Record<number,string> = {0:'Sun',1:'Mon',2:'Tue',3:'Wed',4:'Thu',5:'Fri',6:'Sat'};

type SlotEntry = { start:string; end:string; label:string; emoji:string; days?: string[]; };

export async function POST(req: NextRequest) {
  const userId = req.cookies.get('drako_user_id')?.value;
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const user = await getUser(userId);
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const today      = new Date().toISOString().split('T')[0];
  const now        = new Date();
  const dayOfWeek  = now.toLocaleDateString('en-US', { weekday: 'long' });
  const todayShort = DOW[now.getDay()]; // 'Mon', 'Tue', etc.

  const u = user as unknown as Record<string,unknown>;
  const allSlots = (u.timeSlots || {}) as Record<string, SlotEntry>;
  const wakeTime = (u.rhythm  as string) || '7am';
  const bedTime  = (u.bedtime as string) || '11pm';

  // Only include blocks scheduled for today
  const todaySlots = Object.entries(allSlots).filter(([,v]) =>
    !v.days || v.days.length === 0 || v.days.includes(todayShort)
  );

  const slotLines = todaySlots.length > 0
    ? todaySlots.map(([,v]) => `  ${v.emoji} ${v.label}: ${v.start} – ${v.end}`).join('\n')
    : `  No specific blocks — use sensible defaults for a ${user.type || 'professional'}`;

  let events: ScheduleEvent[] = [];
  try {
    const response = await getClaude().messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 1000,
      messages: [{ role: 'user', content:
`Build ${user.name}'s complete ${dayOfWeek} schedule (${today}).

BLOCKS FOR TODAY (${todayShort}) — include these at their exact times:
${slotLines}

Daily window: wake at ${wakeTime}, sleep by ${bedTime}
Role: ${user.type || 'professional'}

Rules:
- Include ALL blocks above at exact stated times
- Fill gaps: ☕ morning routine, 🍳 breakfast, 🥗 lunch ~12pm, transitions, 🌙 wind-down
- Stay within ${wakeTime} → ${bedTime} window
- No overlapping blocks — short emoji titles ≤25 chars
- 8-12 events total

Respond ONLY with JSON array:
[{"title":"...","start":"HH:MM","end":"HH:MM"}]`
      }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '[]';
    const match = text.match(/\[[\s\S]*\]/);
    const parsed: {title:string;start:string;end:string}[] = match ? JSON.parse(match[0]) : [];
    events = parsed.map((e,i) => ({
      id:`evt_${uuid().slice(0,8)}`, title:e.title, start:e.start, end:e.end,
      date:today, color:COLORS[i%COLORS.length],
    }));
  } catch (err) {
    console.error('[Rebuild] Claude failed, using slots directly:', err);
    events = todaySlots.map(([,v],i) => ({
      id:`evt_${uuid().slice(0,8)}`, title:`${v.emoji} ${v.label}`,
      start:v.start, end:v.end, date:today, color:COLORS[i%COLORS.length],
    }));
  }

  const r = getRedis();
  await r.del(`schedule:${userId}:${today}`);
  for (const event of events) await addEvent(userId, event);
  console.log(`[Rebuild] ${userId}: ${events.length} events for ${dayOfWeek} (${todayShort})`);
  return NextResponse.json({ success:true, events });
}
