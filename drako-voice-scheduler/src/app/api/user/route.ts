import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/redis';

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
