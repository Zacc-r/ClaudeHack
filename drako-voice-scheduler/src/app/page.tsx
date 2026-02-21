'use client';

import { useState, useEffect, useCallback } from 'react';
import { useCopilotReadable, useCopilotAction } from '@copilotkit/react-core';
import { Header } from '@/components/Header';
import { VideoCall } from '@/components/VideoCall';
import { ScheduleView } from '@/components/ScheduleView';
import type { ScheduleEvent } from '@/components/ScheduleCard';

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

const MOCK_EVENTS: ScheduleEvent[] = [
  { id: 'evt_1', title: 'Team Standup', start: '09:00', end: '09:30', date: '2026-02-21', color: '#6C5CE7' },
  { id: 'evt_2', title: 'Lunch Break', start: '12:00', end: '13:00', date: '2026-02-21', color: '#10B981' },
  { id: 'evt_3', title: 'Focus Time', start: '14:00', end: '16:00', date: '2026-02-21', color: '#F59E0B' },
];

export default function Home() {
  const [events, setEvents] = useState<ScheduleEvent[]>(MOCK_EVENTS);
  const [conversationUrl, setConversationUrl] = useState<string | null>(null);
  const [newEventIds, setNewEventIds] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState<'active' | 'ready' | 'error'>('ready');
  const [speaker, setSpeaker] = useState<'drako' | 'user' | 'idle'>('idle');
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    const fetchSchedule = async () => {
      try {
        const res = await fetch('/api/schedule?date=' + new Date().toISOString().split('T')[0]);
        if (res.ok) {
          const data = await res.json();
          if (data.events && data.events.length > 0) {
            setEvents(data.events);
          }
        }
      } catch {
        // Use mock data if API unavailable
      }
    };
    fetchSchedule();
  }, []);

  useEffect(() => {
    const es = new EventSource('/api/schedule/stream');

    es.onopen = () => {
      setStatus('active');
    };

    es.onmessage = (e) => {
      try {
        const update = JSON.parse(e.data);
        if (update.type === 'add') {
          setEvents(prev =>
            [...prev, update.event].sort((a, b) =>
              timeToMinutes(a.start) - timeToMinutes(b.start)
            )
          );
          setNewEventIds(prev => new Set([...prev, update.event.id]));
          setTimeout(() => {
            setNewEventIds(prev => {
              const n = new Set(prev);
              n.delete(update.event.id);
              return n;
            });
          }, 600);
        } else if (update.type === 'remove') {
          setEvents(prev => prev.filter(ev => ev.id !== update.event.id));
        }
      } catch {
        // Ignore parse errors (heartbeats)
      }
    };

    es.onerror = () => {
      setStatus('error');
    };

    return () => es.close();
  }, []);

  const startConversation = useCallback(async () => {
    try {
      setStatus('ready');
      const res = await fetch('/api/tavus/start', { method: 'POST' });
      const data = await res.json();
      if (data.conversationUrl) {
        setConversationUrl(data.conversationUrl);
        setIsActive(true);
        setSpeaker('drako');
        setStatus('active');
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  }, []);

  const handleRemoveEvent = useCallback(async (id: string) => {
    const event = events.find(e => e.id === id);
    if (!event) return;

    setEvents(prev => prev.filter(e => e.id !== id));

    try {
      await fetch('/api/schedule', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId: id, date: event.date }),
      });
    } catch {
      setEvents(prev => [...prev, event].sort((a, b) =>
        timeToMinutes(a.start) - timeToMinutes(b.start)
      ));
    }
  }, [events]);

  useCopilotReadable({
    description: "The user's current schedule for today",
    value: events,
  });

  useCopilotAction({
    name: 'addScheduleEvent',
    description: 'Add a new event to the schedule',
    parameters: [
      { name: 'title', type: 'string', required: true },
      { name: 'startTime', type: 'string', required: true },
      { name: 'endTime', type: 'string' },
    ],
    handler: async ({ title, startTime, endTime }) => {
      await fetch('/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, start: startTime, end: endTime }),
      });
    },
  });

  return (
    <div className="flex flex-col h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <Header status={status} />

      <main className="flex-1 flex flex-col md:flex-row overflow-hidden">
        <section className="w-full md:w-1/2 p-6 flex flex-col">
          <VideoCall
            conversationUrl={conversationUrl}
            isActive={isActive}
            speaker={speaker}
            onStart={startConversation}
          />

          {conversationUrl && (
            <div className="mt-4 flex gap-3">
              <button
                onClick={() => setSpeaker(s => s === 'user' ? 'drako' : 'user')}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{
                  backgroundColor: 'var(--bg-tertiary)',
                  color: 'var(--text-secondary)',
                }}
              >
                Toggle Speaker (Demo)
              </button>
              <button
                onClick={() => {
                  setConversationUrl(null);
                  setIsActive(false);
                  setSpeaker('idle');
                }}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{
                  backgroundColor: 'var(--accent-danger)',
                  color: 'var(--text-primary)',
                }}
              >
                End Call
              </button>
            </div>
          )}
        </section>

        <section
          className="w-full md:w-1/2 flex flex-col border-l"
          style={{ borderColor: 'var(--border)' }}
        >
          <ScheduleView
            events={events}
            newEventIds={newEventIds}
            onRemoveEvent={handleRemoveEvent}
          />
        </section>
      </main>
    </div>
  );
}
