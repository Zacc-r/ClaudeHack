import { NextRequest, NextResponse } from 'next/server';
import { getUser, getRedis } from '@/lib/redis';

export async function GET(req: NextRequest) {
  const userId = req.cookies.get('drako_user_id')?.value;

  if (!userId) {
    return NextResponse.json({ user: null, onboarded: false });
  }

  const user = await getUser(userId);
  if (!user) {
    return NextResponse.json({ user: null, onboarded: false });
  }

  return NextResponse.json({ user, onboarded: true });
}

export async function PATCH(req: NextRequest) {
  const userId = req.cookies.get('drako_user_id')?.value;
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const user = await getUser(userId);
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const updates = await req.json();
  const allowed = ['name', 'rhythm', 'bedtime', 'nonNegotiables', 'selectedActivities', 'struggle', 'timeAllocations', 'timeSlots', 'sleepTime', 'peakFocusWindow'];
  const safeUpdates = Object.fromEntries(Object.entries(updates).filter(([k]) => allowed.includes(k)));

  const updated = { ...user, ...safeUpdates };
  const r = getRedis();
  await r.set(`user:${userId}`, JSON.stringify(updated));

  return NextResponse.json({ success: true, user: updated });
}
