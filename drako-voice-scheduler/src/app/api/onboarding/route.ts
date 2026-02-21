import { NextRequest, NextResponse } from 'next/server';
import { getRedis, addEvent, type ScheduleEvent } from '@/lib/redis';
import { getClaude } from '@/lib/claude';
import { v4 as uuid } from 'uuid';

interface OnboardingSurvey {
  name: string;
  type: 'builder' | 'operator' | 'learner' | 'hustler';
  rhythm: 'early_bird' | 'morning' | 'mid_morning' | 'late_starter';
  nonNegotiables: string[];
  struggle: 'too_many_meetings' | 'context_switching' | 'no_focus_time' | 'no_boundaries';
}

interface UserProfile {
  id: string;
  name: string;
  type: string;
  rhythm: string;
  nonNegotiables: string[];
  struggle: string;
  createdAt: string;
}

const TYPE_DESCRIPTIONS: Record<string, string> = {
  builder: 'someone who codes, designs, or creates things',
  operator: 'someone who manages people, projects, or processes',
  learner: 'someone who is studying or upskilling',
  hustler: 'someone building a company or side project',
};

const RHYTHM_TIMES: Record<string, string> = {
  early_bird: '5-7 AM',
  morning: '7-9 AM',
  mid_morning: '9-11 AM',
  late_starter: '11 AM or later',
};

const NON_NEGOTIABLE_LABELS: Record<string, string> = {
  deep_focus: 'deep focus time (2+ hours uninterrupted)',
  meetings: 'meetings and calls',
  exercise: 'exercise or movement',
  meals: 'proper meal breaks',
  learning: 'learning time',
  breaks: 'breaks and recharge',
  creative: 'creative/brainstorming time',
  family: 'family or social time',
};

const STRUGGLE_LABELS: Record<string, string> = {
  too_many_meetings: 'having too many meetings',
  context_switching: 'constant context switching',
  no_focus_time: 'never having enough focus time',
  no_boundaries: 'poor work-life boundaries',
};

const COLORS = ['#6C5CE7', '#10B981', '#F59E0B', '#3B82F6', '#EC4899', '#EF4444', '#8B5CF6', '#14B8A6'];

export async function POST(req: NextRequest) {
  try {
    const survey: OnboardingSurvey = await req.json();

    if (!survey.name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const r = getRedis();
    const id = `usr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    
    const user: UserProfile = {
      id,
      name: survey.name,
      type: survey.type,
      rhythm: survey.rhythm,
      nonNegotiables: survey.nonNegotiables,
      struggle: survey.struggle,
      createdAt: new Date().toISOString(),
    };

    await r.set(`user:${id}`, JSON.stringify(user));
    await r.sadd('users:all', id);

    const today = new Date().toISOString().split('T')[0];
    const dayOfWeek = new Date().toLocaleDateString('en-US', { weekday: 'long' });

    const nonNegotiableText = survey.nonNegotiables
      .map(n => NON_NEGOTIABLE_LABELS[n] || n)
      .join(', ');

    const claude = getClaude();
    const response = await claude.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 800,
      messages: [{
        role: 'user',
        content: `Generate a realistic daily schedule for today (${today}, ${dayOfWeek}) for this person:

Name: ${survey.name}
Type: ${survey.type} (${TYPE_DESCRIPTIONS[survey.type]})
Brain turns on: ${survey.rhythm} (${RHYTHM_TIMES[survey.rhythm]})
Non-negotiables: ${nonNegotiableText}
Biggest struggle: ${STRUGGLE_LABELS[survey.struggle]}

Rules:
- Schedule should run from their wake time through evening
- Protect their non-negotiables with dedicated blocks
- Address their struggle (e.g., if "too many meetings", batch meetings into one block)
- Include transitions/breaks between intensive blocks
- Make it feel realistic, not aspirational
- Each event needs: title (with emoji), start (HH:MM), end (HH:MM)
- Use natural titles like "☕ Morning coffee + news" not "Morning Routine Block"
- Keep titles short (under 25 chars)
- Generate 5-8 events

Respond ONLY with a JSON array, no markdown, no explanation:
[{"title": "...", "start": "HH:MM", "end": "HH:MM"}]`,
      }],
    });

    let events: ScheduleEvent[] = [];
    
    try {
      const text = response.content[0].type === 'text' ? response.content[0].text : '[]';
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
      
      events = parsed.map((e: { title: string; start: string; end: string }, i: number) => ({
        id: `evt_${uuid().slice(0, 8)}`,
        title: e.title,
        start: e.start,
        end: e.end,
        date: today,
        color: COLORS[i % COLORS.length],
      }));
    } catch (parseError) {
      console.error('[Onboarding] Failed to parse Claude response, using fallback:', parseError);
      events = generateFallbackSchedule(survey, today);
    }

    for (const event of events) {
      await addEvent(id, event);
    }

    console.log(`[Onboarding] Created user ${id} with ${events.length} events`);

    const res = NextResponse.json({
      success: true,
      user,
      events,
      message: `Welcome ${user.name}! DRAKO has built your personalized schedule.`,
    });

    res.cookies.set('drako_user_id', id, {
      httpOnly: false,
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
      sameSite: 'lax',
    });

    return res;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Onboarding] Error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function generateFallbackSchedule(survey: OnboardingSurvey, today: string): ScheduleEvent[] {
  const events: ScheduleEvent[] = [];
  
  const startHours: Record<string, number> = {
    early_bird: 6,
    morning: 7,
    mid_morning: 9,
    late_starter: 10,
  };
  
  let hour = startHours[survey.rhythm] || 8;

  events.push({
    id: `evt_${uuid().slice(0, 8)}`,
    title: '☕ Morning routine',
    start: `${String(hour).padStart(2, '0')}:00`,
    end: `${String(hour).padStart(2, '0')}:30`,
    date: today,
    color: COLORS[0],
  });
  hour++;

  if (survey.nonNegotiables.includes('deep_focus')) {
    events.push({
      id: `evt_${uuid().slice(0, 8)}`,
      title: '🧠 Deep focus block',
      start: `${String(hour).padStart(2, '0')}:00`,
      end: `${String(hour + 2).padStart(2, '0')}:00`,
      date: today,
      color: COLORS[1],
    });
    hour += 2;
  }

  if (survey.nonNegotiables.includes('exercise') && survey.rhythm === 'early_bird') {
    events.push({
      id: `evt_${uuid().slice(0, 8)}`,
      title: '🏋️ Exercise',
      start: '06:00',
      end: '06:45',
      date: today,
      color: COLORS[2],
    });
  }

  events.push({
    id: `evt_${uuid().slice(0, 8)}`,
    title: '🍽️ Lunch break',
    start: '12:00',
    end: '12:45',
    date: today,
    color: COLORS[3],
  });

  if (survey.nonNegotiables.includes('meetings')) {
    events.push({
      id: `evt_${uuid().slice(0, 8)}`,
      title: '📞 Meeting block',
      start: '14:00',
      end: '15:30',
      date: today,
      color: COLORS[4],
    });
  }

  if (survey.nonNegotiables.includes('exercise') && survey.rhythm !== 'early_bird') {
    events.push({
      id: `evt_${uuid().slice(0, 8)}`,
      title: '🏋️ Exercise',
      start: '17:00',
      end: '17:45',
      date: today,
      color: COLORS[2],
    });
  }

  events.push({
    id: `evt_${uuid().slice(0, 8)}`,
    title: '📝 Wrap-up + tomorrow',
    start: '17:30',
    end: '18:00',
    date: today,
    color: COLORS[5],
  });

  return events;
}
