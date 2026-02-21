import { NextRequest, NextResponse } from 'next/server';
import { getRedis, getUser, addEvent, type ScheduleEvent } from '@/lib/redis';
import { getClaude } from '@/lib/claude';
import { v4 as uuid } from 'uuid';

export const maxDuration = 60;

const COLORS = ['#6C5CE7','#10B981','#F59E0B','#3B82F6','#EC4899','#EF4444','#8B5CF6','#14B8A6'];
const DOW: Record<number,string> = {0:'Sun',1:'Mon',2:'Tue',3:'Wed',4:'Thu',5:'Fri',6:'Sat'};
const DOW_LONG: Record<number,string> = {0:'Sunday',1:'Monday',2:'Tuesday',3:'Wednesday',4:'Thursday',5:'Friday',6:'Saturday'};

type SlotEntry = { start:string;end:string;label:string;emoji:string;days?:string[]; };

async function buildDaySchedule(
  userId: string,
  user: Record<string,unknown>,
  date: string,
  dayIdx: number,
  allSlots: Record<string,SlotEntry>
): Promise<ScheduleEvent[]> {
  const dayShort  = DOW[dayIdx];
  const dayOfWeek = DOW_LONG[dayIdx];
  const wakeTime  = (user.rhythm  as string) || '7am';
  const bedTime   = (user.bedtime as string) || '11pm';

  const todaySlots = Object.entries(allSlots).filter(([,v]) =>
    !v.days || v.days.length === 0 || v.days.includes(dayShort)
  );

  const slotLines = todaySlots.length > 0
    ? todaySlots.map(([,v]) => `  ${v.emoji} ${v.label}: ${v.start} – ${v.end}`).join('\n')
    : `  Use sensible defaults for a ${user.type || 'professional'}`;

  try {
    const response = await getClaude().messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 900,
      messages: [{ role: 'user', content:
`Build ${user.name as string}'s complete ${dayOfWeek} schedule (${date}).

SCHEDULED BLOCKS FOR ${dayShort.toUpperCase()} — include at exact times:
${slotLines}

Daily window: wake at ${wakeTime}, sleep by ${bedTime}
Role: ${user.type || 'professional'}

Rules:
- Include ALL blocks above at exact stated times
- Fill gaps: ☕ morning routine, 🍳 breakfast, 🥗 lunch ~12pm, transitions, 🌙 wind-down
- Stay within ${wakeTime} → ${bedTime} window — no overlapping blocks
- Short emoji titles ≤25 chars, 8-12 events total

Respond ONLY with JSON array:
[{"title":"...","start":"HH:MM","end":"HH:MM"}]`
      }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '[]';
    const match = text.match(/\[[\s\S]*\]/);
    const parsed: {title:string;start:string;end:string}[] = match ? JSON.parse(match[0]) : [];
    return parsed.map((e,i) => ({
      id:`evt_${uuid().slice(0,8)}`, title:e.title, start:e.start, end:e.end,
      date, color:COLORS[i%COLORS.length],
    }));
  } catch {
    return todaySlots.map(([,v],i) => ({
      id:`evt_${uuid().slice(0,8)}`, title:`${v.emoji} ${v.label}`,
      start:v.start, end:v.end, date, color:COLORS[i%COLORS.length],
    }));
  }
}

export async function POST(req: NextRequest) {
  const userId = req.cookies.get('drako_user_id')?.value;
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const url   = new URL(req.url);
  const doWeek = url.searchParams.get('week') === 'true';

  const user = await getUser(userId);
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const u = user as unknown as Record<string,unknown>;
  const allSlots = (u.timeSlots || {}) as Record<string,SlotEntry>;
  const r = getRedis();

  if (doWeek) {
    // Generate Mon–Sun of current week in parallel
    const today = new Date();
    const dayOfWeek = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));

    const week: {date:string;events:ScheduleEvent[]}[] = [];
    const promises = Array.from({length:7}, (_,i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const date = d.toISOString().split('T')[0];
      const dayIdx = d.getDay();
      return buildDaySchedule(userId, u, date, dayIdx, allSlots).then(events => ({ date, events }));
    });

    const results = await Promise.allSettled(promises);
    for (const result of results) {
      if (result.status === 'fulfilled') {
        const { date, events } = result.value;
        await r.del(`schedule:${userId}:${date}`);
        for (const event of events) await addEvent(userId, event);
        week.push({ date, events });
      }
    }

    console.log(`[Rebuild] week generated: ${week.reduce((s,d)=>s+d.events.length,0)} events total`);
    return NextResponse.json({ success:true, week });
  }

  // Single day (today)
  const today = new Date();
  const date     = today.toISOString().split('T')[0];
  const dayIdx   = today.getDay();
  const events   = await buildDaySchedule(userId, u, date, dayIdx, allSlots);

  await r.del(`schedule:${userId}:${date}`);
  for (const event of events) await addEvent(userId, event);

  console.log(`[Rebuild] ${userId}: ${events.length} events for ${DOW_LONG[dayIdx]}`);
  return NextResponse.json({ success:true, events });
}
