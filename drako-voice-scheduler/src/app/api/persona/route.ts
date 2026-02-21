import { NextRequest, NextResponse } from 'next/server';
import { getRedis, getUser } from '@/lib/redis';
import { getClaude } from '@/lib/claude';

export interface UserPersona {
  userId: string;
  generatedAt: string;

  // Core identity
  archetype: string;           // e.g. "The Deep Work Machine", "The Reactive Operator"
  archetypeEmoji: string;      // e.g. "🧠", "📡"
  tagline: string;             // 1-line description: "Builds best in long uninterrupted blocks"

  // Productivity DNA
  peakWindow: string;          // "6:00–10:00 AM"
  energyCurve: string;         // "High focus early, social/meeting-friendly afternoons"
  bestWorkStyle: string;       // "Deep dives. Doesn't like switching between tasks."

  // Schedule preferences
  idealDay: {
    morningAnchor: string;     // "Protect first 2 hours — no meetings, no slack"
    afternoonStyle: string;    // "Batch meetings 1–3pm, creative after"
    eveningBoundary: string;   // "Hard stop at 6:30 — family time is non-negotiable"
  };

  // DRAKO coaching voice
  coachingTone: string;        // "Direct and efficient. Doesn't need cheerleading."
  keyProtections: string[];    // ["Block 9–11 for focus", "No meetings before 10am"]
  watchOuts: string[];         // ["Will over-schedule meetings", "Skips breaks"]

  // One-line DRAKO intro (spoken aloud at start of conversation)
  drakoGreeting: string;
}

export async function GET(req: NextRequest) {
  const userId = req.cookies.get('drako_user_id')?.value;
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const r = getRedis();
  const cached = await r.get(`persona:${userId}`);
  if (cached) {
    return NextResponse.json({ persona: JSON.parse(cached as string) });
  }

  return NextResponse.json({ persona: null });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const userId = body.userId || req.cookies.get('drako_user_id')?.value;

    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

    const user = await getUser(userId);
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const userData = user as unknown as Record<string, unknown>;
    const name = userData.name as string;
    const type = userData.type as string || 'builder';
    const rhythm = userData.rhythm as string || 'morning';
    const nonNegotiables = (userData.nonNegotiables as string[]) || [];
    const struggle = userData.struggle as string || 'no_focus_time';

    const rhythmToTime: Record<string, string> = {
      early_bird: '5-7 AM', morning: '7-9 AM',
      mid_morning: '9-11 AM', late_starter: '11 AM or later',
    };
    const typeToDesc: Record<string, string> = {
      builder: 'builds things (code, design, creative work)',
      operator: 'manages people, projects, or processes',
      learner: 'studying or upskilling actively',
      hustler: 'building a company or side project',
    };
    const struggleToDesc: Record<string, string> = {
      too_many_meetings: 'gets overwhelmed by too many meetings',
      context_switching: 'struggles with constant context switching',
      no_focus_time: 'never has enough deep focus time',
      no_boundaries: 'has poor work-life boundaries',
    };

    const claude = getClaude();
    const response = await claude.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 600,
      messages: [{
        role: 'user',
        content: `You are a productivity psychologist. Analyze this person and generate their productivity persona.

Person: ${name}
What they do: ${typeToDesc[type] || type}
Brain turns on: ${rhythmToTime[rhythm] || rhythm}
Non-negotiables: ${nonNegotiables.join(', ')}
Biggest struggle: ${struggleToDesc[struggle] || struggle}

Generate a JSON persona. Be specific, insightful, and slightly opinionated. Make it feel like you KNOW this person.

Respond ONLY with valid JSON, no markdown:
{
  "archetype": "short archetype name like 'The Deep Work Machine' or 'The Reactive Operator'",
  "archetypeEmoji": "single emoji",
  "tagline": "one punchy sentence about how they work best",
  "peakWindow": "their ideal 2-3 hour focus window e.g. '8:00–11:00 AM'",
  "energyCurve": "one sentence about their energy pattern through the day",
  "bestWorkStyle": "one sentence about how they do their best work",
  "idealDay": {
    "morningAnchor": "what to protect in the morning",
    "afternoonStyle": "how to structure the afternoon",
    "eveningBoundary": "when/how to wind down"
  },
  "coachingTone": "one sentence on how DRAKO should talk to them",
  "keyProtections": ["2-3 specific schedule rules to enforce"],
  "watchOuts": ["2-3 specific bad habits to call out"],
  "drakoGreeting": "DRAKO's first spoken line, personalized, under 25 words, warm and direct"
}`,
      }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '{}';
    const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    let personaData: Partial<UserPersona> = {};
    try {
      personaData = JSON.parse(clean);
    } catch {
      console.error('[Persona] Failed to parse Claude response:', clean);
      // Fallback persona
      personaData = {
        archetype: 'The Focused Builder',
        archetypeEmoji: '🧠',
        tagline: 'Does best work in long, uninterrupted blocks',
        peakWindow: rhythmToTime[rhythm] || '8:00–11:00 AM',
        energyCurve: 'Energy peaks in the morning, steady through afternoon',
        bestWorkStyle: 'Deep focused sessions with minimal context switching',
        idealDay: {
          morningAnchor: 'Protect first 2 hours for deep work',
          afternoonStyle: 'Batch meetings and communications 1–3pm',
          eveningBoundary: 'Wind down by 6:30pm',
        },
        coachingTone: 'Direct and efficient, minimal small talk',
        keyProtections: ['Block mornings for focus', 'Batch meetings in afternoon', 'Hard stop time'],
        watchOuts: ['Over-scheduling', 'Skipping breaks', 'Late-night work creep'],
        drakoGreeting: `Hey ${name}! Ready to build your perfect day?`,
      };
    }

    const persona: UserPersona = {
      userId,
      generatedAt: new Date().toISOString(),
      archetype: personaData.archetype || 'The Focused Builder',
      archetypeEmoji: personaData.archetypeEmoji || '🧠',
      tagline: personaData.tagline || '',
      peakWindow: personaData.peakWindow || '8–11 AM',
      energyCurve: personaData.energyCurve || '',
      bestWorkStyle: personaData.bestWorkStyle || '',
      idealDay: personaData.idealDay || { morningAnchor: '', afternoonStyle: '', eveningBoundary: '' },
      coachingTone: personaData.coachingTone || '',
      keyProtections: personaData.keyProtections || [],
      watchOuts: personaData.watchOuts || [],
      drakoGreeting: personaData.drakoGreeting || `Hey ${name}! Let's build your day.`,
    };

    // Store in Redis — cache for 7 days
    const r = getRedis();
    await r.set(`persona:${userId}`, JSON.stringify(persona), 'EX', 60 * 60 * 24 * 7);
    console.log(`[Persona] Generated persona for ${name}: ${persona.archetype}`);

    return NextResponse.json({ persona });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Persona] Error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
