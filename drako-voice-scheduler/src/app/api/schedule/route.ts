import { NextRequest, NextResponse } from 'next/server';
import { getSchedule, addEvent, removeEvent, type ScheduleEvent } from '@/lib/redis';
import { v4 as uuid } from 'uuid';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId') || req.cookies.get('drako_user_id')?.value || 'demo';
  const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

  const events = await getSchedule(userId, date);
  return NextResponse.json({ events, date, userId });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { title, start, end, date } = body;
  const userId = body.userId || req.cookies.get('drako_user_id')?.value || 'demo';

  if (!title || !start) {
    return NextResponse.json({ error: 'title and start are required' }, { status: 400 });
  }

  const colors = ['#6C5CE7', '#10B981', '#F59E0B', '#3B82F6', '#EC4899', '#EF4444'];
  const event: ScheduleEvent = {
    id: `evt_${uuid().slice(0, 8)}`,
    title,
    start,
    end: end || null,
    date: date || new Date().toISOString().split('T')[0],
    color: colors[Math.floor(Math.random() * colors.length)],
  };

  await addEvent(userId, event);
  return NextResponse.json({ success: true, event });
}

export async function DELETE(req: NextRequest) {
  const body = await req.json();
  const { eventId, date } = body;
  const userId = body.userId || req.cookies.get('drako_user_id')?.value || 'demo';

  if (!eventId || !date) {
    return NextResponse.json({ error: 'eventId and date are required' }, { status: 400 });
  }

  const removed = await removeEvent(userId, date, eventId);
  return NextResponse.json({ success: !!removed, removed });
}
