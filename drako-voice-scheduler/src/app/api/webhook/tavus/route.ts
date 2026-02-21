import { NextRequest, NextResponse } from 'next/server';
import { getClaude } from '@/lib/claude';
import { addEvent, type ScheduleEvent } from '@/lib/redis';
import { v4 as uuid } from 'uuid';

export async function POST(req: NextRequest) {
  const body = await req.json();

  console.log(`[Tavus Webhook] ${body.event_type}`, body.conversation_id);

  if (body.event_type === 'application.transcription_ready') {
    const transcript = body.properties?.transcript;
    if (!transcript) return NextResponse.json({ ok: true });

    try {
      const claude = getClaude();
      const extraction = await claude.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 500,
        messages: [{
          role: 'user',
          content: `Extract ALL schedule changes discussed in this conversation.
Return a JSON array of actions. If no schedule changes were discussed, return [].
Format: [{ "action": "add", "title": "...", "start": "HH:MM", "end": "HH:MM", "date": "YYYY-MM-DD" }]
Only include confirmed changes, not suggestions that were rejected.

Transcript:
${JSON.stringify(transcript)}`
        }]
      });

      const text = extraction.content[0].type === 'text' ? extraction.content[0].text : '[]';
      const actions = JSON.parse(text);

      for (const action of actions) {
        if (action.action === 'add') {
          const event: ScheduleEvent = {
            id: `evt_${uuid().slice(0, 8)}`,
            title: action.title,
            start: action.start,
            end: action.end || null,
            date: action.date || new Date().toISOString().split('T')[0],
          };
          await addEvent('demo', event);
        }
      }

      return NextResponse.json({ processed: actions.length });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('Transcript processing error:', error);
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
