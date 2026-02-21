import { NextRequest } from 'next/server';
import { createSubscriber } from '@/lib/redis';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const userId = req.cookies.get('drako_user_id')?.value || 'demo';
  const encoder = new TextEncoder();
  const subscriber = createSubscriber();

  console.log('[SSE Stream] New connection for user:', userId);

  const stream = new ReadableStream({
    start(controller) {
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': heartbeat\n\n'));
        } catch {
          clearInterval(heartbeat);
        }
      }, 30000);

      subscriber.subscribe('schedule:updates');

      subscriber.on('message', (channel: string, message: string) => {
        try {
          const update = JSON.parse(message);
          
          if (update.event) {
            const eventUserId = update.event.userId || extractUserIdFromEventId(update.event.id);
            if (eventUserId && eventUserId !== userId && eventUserId !== 'demo') {
              return;
            }
          }

          controller.enqueue(encoder.encode(`data: ${message}\n\n`));
        } catch {
          controller.enqueue(encoder.encode(`data: ${message}\n\n`));
        }
      });

      req.signal.addEventListener('abort', () => {
        console.log('[SSE Stream] Connection closed for user:', userId);
        clearInterval(heartbeat);
        subscriber.unsubscribe('schedule:updates');
        subscriber.disconnect();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}

function extractUserIdFromEventId(eventId: string): string | null {
  return null;
}
