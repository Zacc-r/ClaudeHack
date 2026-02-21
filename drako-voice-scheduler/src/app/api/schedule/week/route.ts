import { NextRequest, NextResponse } from 'next/server';
import { getSchedule } from '@/lib/redis';

export async function GET(req: NextRequest) {
  const userId = req.cookies.get('drako_user_id')?.value;
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  // Get Mon→Sun of the current week
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0=Sun
  const monday = new Date(today);
  monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));

  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    dates.push(d.toISOString().split('T')[0]);
  }

  const results = await Promise.all(
    dates.map(async (date) => {
      const events = await getSchedule(userId, date);
      events.sort((a, b) => a.start.localeCompare(b.start));
      return { date, events };
    })
  );

  return NextResponse.json({ week: results });
}
