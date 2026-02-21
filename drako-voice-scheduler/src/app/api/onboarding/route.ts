import { NextRequest, NextResponse } from 'next/server';
import { createUser, seedScheduleFromSurvey, type OnboardingSurvey } from '@/lib/redis';

export async function POST(req: NextRequest) {
  try {
    const survey: OnboardingSurvey = await req.json();

    if (!survey.name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const user = await createUser(survey);
    const events = await seedScheduleFromSurvey(user.id, survey);

    const response = NextResponse.json({
      success: true,
      user,
      events,
      message: `Welcome ${user.name}! DRAKO has set up your day based on your preferences. Start a conversation to customize it!`,
    });

    response.cookies.set('drako_user_id', user.id, {
      httpOnly: false,
      maxAge: 60 * 60 * 24,
      path: '/',
      sameSite: 'lax',
    });

    return response;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Onboarding error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
