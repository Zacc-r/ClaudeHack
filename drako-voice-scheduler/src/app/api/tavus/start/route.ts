import { NextResponse } from 'next/server';
import { createPersona, createConversation } from '@/lib/tavus';
import { getSchedule } from '@/lib/redis';

const DRAKO_SYSTEM_PROMPT = `You are DRAKO 🐉, a friendly and efficient voice AI scheduling assistant.
Be warm, energetic, slightly playful. Concise and action-oriented.
Have opinions about scheduling — suggest better time slots, flag overpacked days.
Always confirm changes before making them.
Keep responses under 3 sentences unless asked for detail.`;

const DRAKO_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'get_schedule',
      description: 'Get the user\'s current schedule for today or a specific date',
      parameters: {
        type: 'object',
        properties: {
          date: { type: 'string', description: 'Date in YYYY-MM-DD format. Defaults to today.' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'add_event',
      description: 'Add a new event to the schedule',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Event title' },
          start_time: { type: 'string', description: 'Start time in HH:MM 24h format' },
          end_time: { type: 'string', description: 'End time in HH:MM 24h format' },
          date: { type: 'string', description: 'Date in YYYY-MM-DD' }
        },
        required: ['title', 'start_time']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'move_event',
      description: 'Move an existing event to a new time',
      parameters: {
        type: 'object',
        properties: {
          event_id: { type: 'string' },
          new_start_time: { type: 'string' },
          new_end_time: { type: 'string' },
          new_date: { type: 'string' }
        },
        required: ['event_id', 'new_start_time']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'remove_event',
      description: 'Remove an event from the schedule',
      parameters: {
        type: 'object',
        properties: {
          event_id: { type: 'string', description: 'The event ID to remove' }
        },
        required: ['event_id']
      }
    }
  }
];

export async function POST() {
  try {
    const today = new Date().toISOString().split('T')[0];
    const schedule = await getSchedule('demo', today);
    const scheduleContext = schedule.length > 0
      ? `Current schedule for today (${today}): ${schedule.map(e => `${e.start}${e.end ? '-' + e.end : ''} ${e.title}`).join(', ')}`
      : `No events scheduled for today (${today}). Clean slate!`;

    const persona = await createPersona({
      name: 'DRAKO',
      systemPrompt: DRAKO_SYSTEM_PROMPT,
      context: scheduleContext,
      tools: DRAKO_TOOLS,
    });

    if (!persona.persona_id) {
      return NextResponse.json({ error: 'Failed to create persona', details: persona }, { status: 500 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const conversation = await createConversation({
      personaId: persona.persona_id,
      context: scheduleContext,
      callbackUrl: `${appUrl}/api/webhook/tavus`,
    });

    return NextResponse.json({
      success: true,
      conversationUrl: conversation.conversation_url,
      conversationId: conversation.conversation_id,
      personaId: persona.persona_id,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Start conversation error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
