import { NextRequest, NextResponse } from 'next/server';
import { getRedis, addEvent, type ScheduleEvent } from '@/lib/redis';
import { getClaude } from '@/lib/claude';
import { v4 as uuid } from 'uuid';

export const maxDuration = 30; // Vercel: allow up to 30s for Claude calls

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

interface LegacySurvey {
  name: string;
  role?: string;
  workStyle?: string;
  priorities?: string[];
  wakeUpTime?: string;
}

function convertLegacySurvey(legacy: LegacySurvey): OnboardingSurvey {
  const roleToType: Record<string, OnboardingSurvey['type']> = {
    engineer: 'builder',
    designer: 'builder',
    pm: 'operator',
    founder: 'hustler',
    student: 'learner',
    other: 'builder',
  };

  const wakeToRhythm: Record<string, OnboardingSurvey['rhythm']> = {
    '06:00': 'early_bird',
    '07:00': 'morning',
    '08:00': 'morning',
    '09:00': 'mid_morning',
    '10:00': 'late_starter',
  };

  const priorityMap: Record<string, string> = {
    'deep work': 'deep_focus',
    'focus': 'deep_focus',
    'meetings': 'meetings',
    'exercise': 'exercise',
    'creative': 'creative',
    'learning': 'learning',
    'wellness': 'breaks',
  };

  return {
    name: legacy.name,
    type: roleToType[legacy.role || ''] || 'builder',
    rhythm: wakeToRhythm[legacy.wakeUpTime || ''] || 'morning',
    nonNegotiables: (legacy.priorities || ['deep work']).map(p => priorityMap[p] || 'deep_focus'),
    struggle: 'no_focus_time',
  };
}

// Frontend → Backend value normalization
const TYPE_NORMALIZE: Record<string, string> = {
  builder: 'builder', operator: 'operator', learner: 'learner', hustler: 'hustler',
  engineer: 'builder', designer: 'builder', student: 'learner',
  pm: 'operator', founder: 'hustler', professional: 'operator',
  creative: 'builder', athlete: 'hustler', other: 'builder',
};

const RHYTHM_NORMALIZE: Record<string, string> = {
  early_bird: 'early_bird', morning: 'morning', mid_morning: 'mid_morning', late_starter: 'late_starter',
  '5am': 'early_bird', '6am': 'early_bird',
  '7am': 'morning', '7:00': 'morning',
  '8am': 'morning', '8:00': 'morning',
  '9am': 'mid_morning', '9:00': 'mid_morning',
  '10am': 'late_starter', '10:00': 'late_starter',
  '11am': 'late_starter', '11:00': 'late_starter',
  'morning person': 'morning', 'night owl': 'late_starter', 'flexible': 'morning',
};

const NON_NEG_NORMALIZE: Record<string, string> = {
  deep_focus: 'deep_focus', meetings: 'meetings', exercise: 'exercise',
  meals: 'meals', learning: 'learning', breaks: 'breaks',
  creative: 'creative', family: 'family',
  'deep work': 'deep_focus', 'focus': 'deep_focus', deep_work: 'deep_focus',
  'creative time': 'creative', 'social': 'family',
  meditation: 'breaks', side_project: 'creative', entertainment: 'breaks',
};

export async function POST(req: NextRequest) {
  try {
    const rawSurvey = await req.json();

    if (!rawSurvey.name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    // Normalize ALL values regardless of format
    const normalizedType = TYPE_NORMALIZE[rawSurvey.type] || TYPE_NORMALIZE[rawSurvey.role] || 'builder';
    const normalizedRhythm = RHYTHM_NORMALIZE[rawSurvey.rhythm] || RHYTHM_NORMALIZE[rawSurvey.wakeUpTime] || 'morning';
    const rawNonNegs = rawSurvey.nonNegotiables || rawSurvey.priorities || ['deep_focus'];
    const normalizedNonNegs = rawNonNegs.map((n: string) => NON_NEG_NORMALIZE[n] || n);
    const normalizedStruggle = rawSurvey.struggle || 'no_focus_time';

    const r = getRedis();
    const id = `usr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    
    const user: UserProfile = {
      id,
      name: rawSurvey.name,
      type: normalizedType,
      rhythm: normalizedRhythm,
      nonNegotiables: normalizedNonNegs,
      struggle: normalizedStruggle,
      createdAt: new Date().toISOString(),
    };

    await r.set(`user:${id}`, JSON.stringify(user));
    await r.sadd('users:all', id);

    const today = new Date().toISOString().split('T')[0];
    const dayOfWeek = new Date().toLocaleDateString('en-US', { weekday: 'long' });

    const nonNegotiableText = normalizedNonNegs
      .map((n: string) => NON_NEGOTIABLE_LABELS[n] || n)
      .join(', ');

    const typeDesc = TYPE_DESCRIPTIONS[normalizedType] || 'a professional';
    const rhythmDesc = RHYTHM_TIMES[normalizedRhythm] || '7-9 AM';
    const struggleDesc = STRUGGLE_LABELS[normalizedStruggle] || 'general time management';

    console.log(`[Onboarding] Normalized: type=${normalizedType}, rhythm=${normalizedRhythm}, struggle=${normalizedStruggle}`);

    const claude = getClaude();

    // Generate persona + schedule in parallel
    const personaPromise = claude.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 600,
      messages: [{
        role: 'user',
        content: `Analyze this person and generate their productivity persona as JSON.

Name: ${rawSurvey.name}, Type: ${normalizedType}, Brain turns on: ${normalizedRhythm}
Non-negotiables: ${nonNegotiableText}, Struggle: ${struggleDesc}

Respond ONLY with valid JSON:
{
  "archetype": "e.g. 'The Deep Work Machine'",
  "archetypeEmoji": "single emoji",
  "tagline": "one punchy sentence about how they work best",
  "peakWindow": "ideal 2-3 hour focus window e.g. '8:00–11:00 AM'",
  "coachingTone": "how DRAKO should talk to them, one sentence",
  "keyProtections": ["2-3 specific schedule rules to enforce"],
  "watchOuts": ["2 specific bad habits to watch for"],
  "drakoGreeting": "DRAKO's first spoken line, personalized, under 20 words, warm and direct"
}`,
      }],
    }).then(async (r) => {
      try {
        const text = r.content[0].type === 'text' ? r.content[0].text : '{}';
        const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const parsed = JSON.parse(clean);
        const persona = { userId: id, generatedAt: new Date().toISOString(), ...parsed };
        await getRedis().set(`persona:${id}`, JSON.stringify(persona), 'EX', 60 * 60 * 24 * 7);
        console.log(`[Onboarding] Persona generated: ${parsed.archetype}`);
        return persona;
      } catch {
        console.error('[Onboarding] Persona parse failed');
        return null;
      }
    }).catch(() => null); // never block onboarding if persona fails

    let events: ScheduleEvent[] = [];

    try {
      const response = await claude.messages.create({
        model: 'claude-haiku-4-5',
        max_tokens: 800,
        messages: [{
          role: 'user',
          content: `Generate a realistic daily schedule for today (${today}, ${dayOfWeek}) for this person:

Name: ${rawSurvey.name}
Type: ${normalizedType} (${typeDesc})
Brain turns on: ${normalizedRhythm} (${rhythmDesc})
Non-negotiables: ${nonNegotiableText}
Biggest struggle: ${struggleDesc}

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
    } catch (claudeError) {
      console.error('[Onboarding] Claude failed, using fallback schedule:', claudeError);
      events = generateFallbackSchedule({ rhythm: normalizedRhythm, nonNegotiables: normalizedNonNegs }, today);
    }

    for (const event of events) {
      await addEvent(id, event);
    }

    console.log(`[Onboarding] Created user ${id} with ${events.length} events`);

    // Wait for persona (runs in parallel — usually done by now)
    const persona = await personaPromise;

    const res = NextResponse.json({
      success: true,
      user,
      events,
      persona,
      message: persona
        ? `Welcome ${user.name}! You're ${persona.archetype} ${persona.archetypeEmoji}`
        : `Welcome ${user.name}! DRAKO has built your personalized schedule.`,
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

function generateFallbackSchedule(survey: { rhythm: string; nonNegotiables: string[] }, today: string): ScheduleEvent[] {
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
      start: '16:00',
      end: '16:45',
      date: today,
      color: COLORS[2],
    });
  }

  events.push({
    id: `evt_${uuid().slice(0, 8)}`,
    title: '📝 Wrap-up + tomorrow',
    start: '17:15',
    end: '17:45',
    date: today,
    color: COLORS[5],
  });

  return events;
}
