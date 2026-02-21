import { NextRequest, NextResponse } from 'next/server';
import { getSchedule, addEvent, removeEvent, type ScheduleEvent } from '@/lib/redis';
import { validateScheduleChange } from '@/lib/claude';
import { v4 as uuid } from 'uuid';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { function_name, arguments: args } = body;
  const userId = 'demo';
  const today = new Date().toISOString().split('T')[0];

  try {
    switch (function_name) {
      case 'get_schedule': {
        const date = args?.date || today;
        const events = await getSchedule(userId, date);
        return NextResponse.json({
          result: events.length > 0
            ? `Schedule for ${date}: ${events.map(e => `${e.start} - ${e.title}`).join(', ')}`
            : `No events scheduled for ${date}. The day is wide open!`
        });
      }

      case 'add_event': {
        const date = args.date || today;
        const currentSchedule = await getSchedule(userId, date);

        const validation = await validateScheduleChange(
          currentSchedule,
          'add',
          `Adding "${args.title}" at ${args.start_time}${args.end_time ? ' to ' + args.end_time : ''}`
        );

        if (!validation.ok) {
          return NextResponse.json({
            result: `Conflict: ${validation.conflict}. ${validation.suggestion || 'Would you like to pick a different time?'}`
          });
        }

        const colors = ['#6C5CE7', '#10B981', '#F59E0B', '#3B82F6', '#EC4899'];
        const event: ScheduleEvent = {
          id: `evt_${uuid().slice(0, 8)}`,
          title: args.title,
          start: args.start_time,
          end: args.end_time || null,
          date,
          color: colors[Math.floor(Math.random() * colors.length)],
        };

        await addEvent(userId, event);
        return NextResponse.json({
          result: `Done! Added "${args.title}" at ${args.start_time}${args.end_time ? ' to ' + args.end_time : ''}.`
        });
      }

      case 'move_event': {
        const date = args.new_date || today;
        const removed = await removeEvent(userId, date, args.event_id);
        if (!removed) {
          return NextResponse.json({ result: `Couldn't find that event to move.` });
        }
        const moved: ScheduleEvent = {
          ...removed,
          start: args.new_start_time,
          end: args.new_end_time || removed.end,
          date,
        };
        await addEvent(userId, moved);
        return NextResponse.json({
          result: `Moved "${moved.title}" to ${args.new_start_time}.`
        });
      }

      case 'remove_event': {
        const date = today;
        const removed = await removeEvent(userId, date, args.event_id);
        return NextResponse.json({
          result: removed
            ? `Removed "${removed.title}" from your schedule.`
            : `Couldn't find that event.`
        });
      }

      default:
        return NextResponse.json({ result: `Unknown function: ${function_name}` }, { status: 400 });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Tool handler error:', error);
    return NextResponse.json({ result: `Something went wrong: ${message}` }, { status: 500 });
  }
}
