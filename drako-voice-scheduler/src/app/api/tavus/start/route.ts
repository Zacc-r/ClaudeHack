import { NextRequest, NextResponse } from 'next/server';
import { getSchedule, getUser, getRedis } from '@/lib/redis';

const TAVUS_BASE = 'https://tavusapi.com/v2';

const DRAKO_SYSTEM_PROMPT = `You are DRAKO 🐉, a friendly and efficient voice AI scheduling assistant.

PERSONALITY:
- Warm, energetic, slightly playful
- Concise and action-oriented — keep responses under 3 sentences
- Have opinions about scheduling — suggest better time slots, flag overpacked days
- Use the user's name naturally in conversation

RULES:
- Always confirm changes before making them: "I'll add [event] at [time], sound good?"
- After confirmation, call the appropriate function tool
- When showing the schedule, read it out naturally: "You've got 3 things today..."
- If there's a conflict, explain it and suggest an alternative
- IMPORTANT: Use the function tools to actually modify the schedule. Don't just say you'll do it — call the tool.

CONVERSATION STARTERS:
- If the schedule is empty: "Looks like a blank canvas today! What should we fill it with?"
- If pre-populated: "I see you've already got some things planned. Want to adjust anything?"`;

const DRAKO_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'get_schedule',
      description: 'Get the user\'s current schedule for a specific date. Call this when the user asks what they have planned or asks about their day.',
      parameters: {
        type: 'object',
        properties: {
          date: { type: 'string', description: 'Date in YYYY-MM-DD format. Defaults to today if not specified.' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'add_event',
      description: 'Add a new event to the schedule. Call this after the user confirms they want to add something.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Event title, e.g. "Meeting with Alex"' },
          start_time: { type: 'string', description: 'Start time in HH:MM 24-hour format, e.g. "14:00"' },
          end_time: { type: 'string', description: 'End time in HH:MM 24-hour format, e.g. "15:00"' },
          date: { type: 'string', description: 'Date in YYYY-MM-DD format. Defaults to today.' }
        },
        required: ['title', 'start_time']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'move_event',
      description: 'Move an existing event to a different time. Use when the user says "move X to Y time".',
      parameters: {
        type: 'object',
        properties: {
          event_id: { type: 'string', description: 'The ID of the event to move' },
          new_start_time: { type: 'string', description: 'New start time in HH:MM 24-hour format' },
          new_end_time: { type: 'string', description: 'New end time in HH:MM 24-hour format' },
          new_date: { type: 'string', description: 'New date in YYYY-MM-DD format' }
        },
        required: ['event_id', 'new_start_time']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'remove_event',
      description: 'Remove an event from the schedule. Use when the user says "cancel X" or "remove X".',
      parameters: {
        type: 'object',
        properties: {
          event_id: { type: 'string', description: 'The ID of the event to remove' }
        },
        required: ['event_id']
      }
    }
  }
];

async function createTavusPersona(config: {
  name: string;
  systemPrompt: string;
  context: string;
  tools: typeof DRAKO_TOOLS;
}) {
  const res = await fetch(`${TAVUS_BASE}/personas`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.TAVUS_API_KEY!,
    },
    body: JSON.stringify({
      persona_name: config.name,
      pipeline_mode: 'full',
      system_prompt: config.systemPrompt,
      context: config.context,
      default_replica_id: process.env.TAVUS_REPLICA_ID || 're8e740a42',
      layers: {
        llm: {
          tools: config.tools,
        },
        tts: {
          tts_engine: 'cartesia',
          tts_emotion_control: true,
        },
      },
    }),
  });
  return res.json();
}

async function createTavusConversation(config: {
  personaId: string;
  context: string;
  callbackUrl: string;
  toolsCallbackUrl: string;
}) {
  const res = await fetch(`${TAVUS_BASE}/conversations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.TAVUS_API_KEY!,
    },
    body: JSON.stringify({
      persona_id: config.personaId,
      replica_id: process.env.TAVUS_REPLICA_ID || 're8e740a42',
      conversational_context: config.context,
      callback_url: config.callbackUrl,
      properties: {
        max_call_duration: 600,
        participant_left_timeout: 30,
        tools_callback_url: config.toolsCallbackUrl,
      },
    }),
  });
  return res.json();
}

export async function POST(req: NextRequest) {
  try {
    const userId = req.cookies.get('drako_user_id')?.value || 'demo';
    const today = new Date().toISOString().split('T')[0];

    const user = await getUser(userId);
    const userName = user?.name || 'friend';

    const schedule = await getSchedule(userId, today);

    const typeDescriptions: Record<string, string> = {
      builder: 'someone who codes, designs, or creates things',
      operator: 'someone who manages people, projects, or processes',
      learner: 'someone who is studying or upskilling',
      hustler: 'someone building a company or side project',
    };

    const rhythmDescriptions: Record<string, string> = {
      early_bird: 'an early bird who starts at 5-7 AM',
      morning: 'a morning person who starts at 7-9 AM',
      mid_morning: 'someone who gets going around 9-11 AM',
      late_starter: 'a late starter who gets going around 11 AM or later',
    };

    const struggleCoaching: Record<string, string> = {
      too_many_meetings: 'They struggle with too many meetings. Protect their focus blocks. If they try to add meetings during focus time, suggest batching meetings together instead.',
      context_switching: 'They struggle with context switching. Group similar tasks together. Don\'t let them scatter meetings throughout the day.',
      no_focus_time: 'They never have enough focus time. Be aggressive about protecting long uninterrupted blocks. Push back if they try to fragment their focus.',
      no_boundaries: 'They have poor work-life boundaries. Help them set a hard stop time. Don\'t let work events creep past 6 PM.',
    };

    const nonNegotiableLabels: Record<string, string> = {
      deep_focus: 'deep focus time',
      meetings: 'meetings and calls',
      exercise: 'exercise',
      meals: 'proper meals',
      learning: 'learning',
      breaks: 'breaks',
      creative: 'creative time',
      family: 'family/social time',
    };

    let userContext: string;
    if (user) {
      const userData = user as unknown as Record<string, unknown>;
      const userType = userData.type as string | undefined;
      const userRhythm = userData.rhythm as string | undefined;
      const userStruggle = userData.struggle as string | undefined;
      const userNonNegotiables = userData.nonNegotiables as string[] | undefined;
      
      const typeDesc = userType ? typeDescriptions[userType] || userType : 'a professional';
      const rhythmDesc = userRhythm ? rhythmDescriptions[userRhythm] || userRhythm : 'flexible';
      const coaching = userStruggle ? struggleCoaching[userStruggle] : 'Help them stay organized.';
      const prioritiesText = userNonNegotiables?.map(n => nonNegotiableLabels[n] || n).join(', ') || 'general productivity';

      userContext = `Speaking with: ${user.name}
They are: ${typeDesc}
Their brain turns on: ${rhythmDesc}
Priorities: ${prioritiesText}
Coaching note: ${coaching}`;
    } else {
      userContext = `You're speaking with a new user.`;
    }

    const scheduleContext = schedule.length > 0
      ? `Current schedule for ${today}: ${schedule.map(e => `${e.start}${e.end ? '-' + e.end : ''} "${e.title}" (id: ${e.id})`).join(', ')}`
      : `No events scheduled for ${today}. Empty day!`;

    const fullContext = `Today is ${today}.\n${userContext}\n\n${scheduleContext}`;

    const appUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    console.log('[Tavus Start] Creating persona for user:', userId);
    console.log('[Tavus Start] App URL:', appUrl);

    const persona = await createTavusPersona({
      name: `DRAKO-${userId.slice(0, 8)}`,
      systemPrompt: DRAKO_SYSTEM_PROMPT,
      context: fullContext,
      tools: DRAKO_TOOLS,
    });

    if (!persona.persona_id) {
      console.error('[Tavus Start] Persona creation failed:', persona);
      return NextResponse.json({ error: 'Failed to create persona', details: persona }, { status: 500 });
    }

    console.log('[Tavus Start] Persona created:', persona.persona_id);

    const conversation = await createTavusConversation({
      personaId: persona.persona_id,
      context: fullContext,
      callbackUrl: `${appUrl}/api/webhook/tavus`,
      toolsCallbackUrl: `${appUrl}/api/tavus/tools`,
    });

    if (!conversation.conversation_url) {
      console.error('[Tavus Start] Conversation creation failed:', conversation);
      return NextResponse.json({ error: 'Failed to start conversation', details: conversation }, { status: 500 });
    }

    console.log('[Tavus Start] Conversation started:', conversation.conversation_id);

    const r = getRedis();
    await r.set(`conversation:${conversation.conversation_id}:userId`, userId, 'EX', 7200);
    console.log('[Tavus Start] Stored userId mapping for conversation:', conversation.conversation_id);

    return NextResponse.json({
      success: true,
      conversationUrl: conversation.conversation_url,
      conversationId: conversation.conversation_id,
      personaId: persona.persona_id,
      userName,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Tavus Start] Error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
