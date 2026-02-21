import { NextRequest, NextResponse } from 'next/server';
import { getRedis, getSchedule, addEvent, removeEvent, type ScheduleEvent } from '@/lib/redis';
import { validateScheduleChange } from '@/lib/claude';
import { v4 as uuid } from 'uuid';

interface TavusToolCall {
  function_name?: string;
  name?: string;
  arguments?: string | Record<string, unknown>;
  tool_calls?: Array<{
    function?: {
      name: string;
      arguments: string | Record<string, unknown>;
    };
    name?: string;
    arguments?: string | Record<string, unknown>;
  }>;
  conversation_id?: string;
}

function parseArgs(args: unknown): Record<string, unknown> {
  if (!args) return {};
  if (typeof args === 'string') {
    try {
      return JSON.parse(args);
    } catch {
      return {};
    }
  }
  return args as Record<string, unknown>;
}

function parseToolCall(body: TavusToolCall): { functionName: string; args: Record<string, unknown> } | null {
  if (body.function_name) {
    return {
      functionName: body.function_name,
      args: parseArgs(body.arguments),
    };
  }

  if (body.name) {
    return {
      functionName: body.name,
      args: parseArgs(body.arguments),
    };
  }

  if (body.tool_calls && body.tool_calls.length > 0) {
    const call = body.tool_calls[0];
    const funcName = call.function?.name || call.name;
    const funcArgs = call.function?.arguments || call.arguments;
    if (funcName) {
      return {
        functionName: funcName,
        args: parseArgs(funcArgs),
      };
    }
  }

  return null;
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  
  console.log('[Tavus Tool Call] Raw payload:', JSON.stringify(body, null, 2));

  const parsed = parseToolCall(body);
  if (!parsed) {
    console.error('[Tavus Tool Call] Could not parse tool call from body:', body);
    return NextResponse.json({ result: 'Could not parse tool call' }, { status: 400 });
  }

  const { functionName, args } = parsed;
  const today = new Date().toISOString().split('T')[0];

  // Tavus calls from their servers — no cookies. Use conversation→userId mapping from Redis.
  const conversationId = body.conversation_id;
  let userId = 'demo';
  if (conversationId) {
    const r = getRedis();
    const mapped = await r.get(`conversation:${conversationId}:userId`);
    if (mapped) userId = mapped;
  }
  // Fallback to cookie only for non-Tavus callers (manual testing)
  if (userId === 'demo') {
    userId = req.cookies.get('drako_user_id')?.value || 'demo';
  }
  console.log(`[Tavus Tools] conversation=${conversationId} → userId=${userId}, function=${functionName}`);

  try {
    switch (functionName) {
      case 'get_schedule': {
        const date = (args.date as string) || today;
        const events = await getSchedule(userId, date);
        const result = events.length > 0
          ? `You have ${events.length} thing${events.length > 1 ? 's' : ''} scheduled for ${date}: ${events.map(e => `${e.start} - ${e.title}`).join(', ')}`
          : `No events scheduled for ${date}. The day is wide open!`;
        console.log('[Tavus Tool Call] get_schedule result:', result);
        return NextResponse.json({ result });
      }

      case 'add_event': {
        const date = (args.date as string) || today;
        const title = args.title as string;
        const startTime = args.start_time as string;
        const endTime = args.end_time as string | undefined;

        if (!title || !startTime) {
          return NextResponse.json({
            result: 'I need at least a title and start time to add an event.'
          });
        }

        const currentSchedule = await getSchedule(userId, date);

        const validation = await validateScheduleChange(
          currentSchedule,
          'add',
          `Adding "${title}" at ${startTime}${endTime ? ' to ' + endTime : ''}`
        );

        if (!validation.ok) {
          return NextResponse.json({
            result: `There's a conflict: ${validation.conflict}. ${validation.suggestion || 'Would you like to pick a different time?'}`
          });
        }

        const colors = ['#6C5CE7', '#10B981', '#F59E0B', '#3B82F6', '#EC4899'];
        const event: ScheduleEvent = {
          id: `evt_${uuid().slice(0, 8)}`,
          title,
          start: startTime,
          end: endTime,
          date,
          color: colors[Math.floor(Math.random() * colors.length)],
        };

        await addEvent(userId, event);
        const result = `Done! Added "${title}" at ${startTime}${endTime ? ' to ' + endTime : ''}.`;
        console.log('[Tavus Tool Call] add_event result:', result);
        return NextResponse.json({ result });
      }

      case 'move_event': {
        const eventId = args.event_id as string;
        const newStartTime = args.new_start_time as string;
        const newEndTime = args.new_end_time as string | undefined;
        const newDate = (args.new_date as string) || today;

        if (!eventId || !newStartTime) {
          return NextResponse.json({
            result: 'I need the event ID and new start time to move an event.'
          });
        }

        const schedule = await getSchedule(userId, today);
        const existingEvent = schedule.find(e => e.id === eventId);

        if (!existingEvent) {
          const eventsList = schedule.map(e => `"${e.title}" (id: ${e.id})`).join(', ');
          return NextResponse.json({
            result: `Couldn't find that event. Here are your events: ${eventsList || 'None scheduled'}`
          });
        }

        const removed = await removeEvent(userId, existingEvent.date, eventId);
        if (!removed) {
          return NextResponse.json({ result: `Couldn't find that event to move.` });
        }

        const moved: ScheduleEvent = {
          ...removed,
          start: newStartTime,
          end: newEndTime || removed.end,
          date: newDate,
        };
        await addEvent(userId, moved);

        const result = `Moved "${moved.title}" to ${newStartTime}.`;
        console.log('[Tavus Tool Call] move_event result:', result);
        return NextResponse.json({ result });
      }

      case 'remove_event': {
        const eventId = args.event_id as string;

        if (!eventId) {
          return NextResponse.json({
            result: 'I need the event ID to remove an event.'
          });
        }

        const schedule = await getSchedule(userId, today);
        const existingEvent = schedule.find(e => e.id === eventId);

        if (!existingEvent) {
          const eventsList = schedule.map(e => `"${e.title}" (id: ${e.id})`).join(', ');
          return NextResponse.json({
            result: `Couldn't find that event. Here are your events: ${eventsList || 'None scheduled'}`
          });
        }

        const removed = await removeEvent(userId, existingEvent.date, eventId);
        const result = removed
          ? `Removed "${removed.title}" from your schedule.`
          : `Couldn't find that event.`;
        console.log('[Tavus Tool Call] remove_event result:', result);
        return NextResponse.json({ result });
      }

      default:
        console.error('[Tavus Tool Call] Unknown function:', functionName);
        return NextResponse.json({ result: `Unknown function: ${functionName}` }, { status: 400 });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Tavus Tool Call] Error:', error);
    return NextResponse.json({ result: `Something went wrong: ${message}` }, { status: 500 });
  }
}
