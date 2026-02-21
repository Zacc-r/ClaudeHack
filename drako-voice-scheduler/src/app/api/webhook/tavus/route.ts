import { NextRequest, NextResponse } from 'next/server';
import { getClaude } from '@/lib/claude';
import { addEvent, getRedis, type ScheduleEvent } from '@/lib/redis';
import { v4 as uuid } from 'uuid';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const eventType = body.event_type || body.type;
  const conversationId = body.conversation_id;

  console.log(`[Tavus Webhook] ${eventType} | conversation: ${conversationId}`);

  const r = getRedis();
  const userId = conversationId
    ? (await r.get(`conversation:${conversationId}:userId`)) || 'demo'
    : 'demo';

  switch (eventType) {
    case 'conversation.started':
      console.log(`[Webhook] Conversation started for user ${userId}`);
      await r.publish(`schedule:updates:${userId}`, JSON.stringify({
        type: 'conversation_started',
        conversationId,
        timestamp: new Date().toISOString(),
      }));
      await r.publish(`schedule:updates:${userId}`, JSON.stringify({
        type: 'speaker_change',
        speaker: 'drako',
        timestamp: new Date().toISOString(),
      }));
      break;

    case 'conversation.ended':
      console.log(`[Webhook] Conversation ended for user ${userId}`);
      await r.publish(`schedule:updates:${userId}`, JSON.stringify({
        type: 'speaker_change',
        speaker: 'idle',
        timestamp: new Date().toISOString(),
      }));
      await r.publish(`schedule:updates:${userId}`, JSON.stringify({
        type: 'conversation_ended',
        conversationId,
        timestamp: new Date().toISOString(),
      }));
      await r.expire(`conversation:${conversationId}:userId`, 3600);
      break;

    case 'participant.joined':
      console.log(`[Webhook] Participant joined: ${body.participant_id || 'unknown'}`);
      break;

    case 'participant.left':
      console.log(`[Webhook] Participant left: ${body.participant_id || 'unknown'}`);
      break;

    case 'replica.start_talking':
    case 'replica.started_talking':
    case 'agent.start_talking':
    case 'agent.started_talking': {
      console.log(`[Webhook] DRAKO started speaking for user ${userId}`);
      await r.publish(`schedule:updates:${userId}`, JSON.stringify({
        type: 'speaker_change',
        speaker: 'drako',
        timestamp: new Date().toISOString(),
      }));
      break;
    }

    case 'replica.stop_talking':
    case 'replica.stopped_talking':
    case 'agent.stop_talking':
    case 'agent.stopped_talking': {
      console.log(`[Webhook] DRAKO stopped speaking for user ${userId}`);
      await r.publish(`schedule:updates:${userId}`, JSON.stringify({
        type: 'speaker_change',
        speaker: 'idle',
        timestamp: new Date().toISOString(),
      }));
      break;
    }

    case 'user.start_talking':
    case 'user.started_talking':
    case 'participant.start_talking':
    case 'participant.started_talking': {
      console.log(`[Webhook] User started speaking for user ${userId}`);
      await r.publish(`schedule:updates:${userId}`, JSON.stringify({
        type: 'speaker_change',
        speaker: 'user',
        timestamp: new Date().toISOString(),
      }));
      break;
    }

    case 'user.stop_talking':
    case 'user.stopped_talking':
    case 'participant.stop_talking':
    case 'participant.stopped_talking': {
      console.log(`[Webhook] User stopped speaking for user ${userId}`);
      await r.publish(`schedule:updates:${userId}`, JSON.stringify({
        type: 'speaker_change',
        speaker: 'idle',
        timestamp: new Date().toISOString(),
      }));
      break;
    }

    case 'application.utterance':
    case 'transcript.utterance': {
      const role = body.properties?.role || body.role;
      const speaker = role === 'replica' || role === 'agent' || role === 'assistant' ? 'drako' : 'user';
      
      console.log(`[Webhook] Utterance from ${speaker} for user ${userId}`);
      await r.publish(`schedule:updates:${userId}`, JSON.stringify({
        type: 'speaker_change',
        speaker,
        timestamp: new Date().toISOString(),
      }));
      break;
    }

    case 'application.transcription_ready': {
      const transcript = body.properties?.transcript;
      if (!transcript) {
        console.log('[Webhook] No transcript in transcription_ready event');
        break;
      }

      console.log(`[Webhook] Processing transcript for user: ${userId}`);

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
        const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        
        let actions = [];
        try {
          const jsonMatch = cleaned.match(/\[[\s\S]*\]/);
          actions = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
        } catch {
          console.error('[Webhook] Failed to parse actions:', cleaned);
          actions = [];
        }

        const colors = ['#6C5CE7', '#10B981', '#F59E0B', '#3B82F6', '#EC4899'];
        for (const action of actions) {
          if (action.action === 'add') {
            const event: ScheduleEvent = {
              id: `evt_wh_${uuid().slice(0, 8)}`,
              title: action.title,
              start: action.start,
              end: action.end || undefined,
              date: action.date || new Date().toISOString().split('T')[0],
              color: colors[Math.floor(Math.random() * colors.length)],
            };
            await addEvent(userId, event);
            console.log(`[Webhook] Added event from transcript: ${event.title}`);
          }
        }

        console.log(`[Webhook] Processed ${actions.length} schedule changes for user ${userId}`);
        return NextResponse.json({ processed: actions.length, userId, event_type: eventType });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('[Webhook] Transcript processing error:', error);
        return NextResponse.json({ error: message, event_type: eventType }, { status: 500 });
      }
    }

    default:
      console.log(`[Webhook] Unhandled event type: ${eventType}`);
  }

  return NextResponse.json({ ok: true, event_type: eventType });
}
