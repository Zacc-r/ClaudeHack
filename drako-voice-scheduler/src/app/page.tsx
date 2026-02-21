'use client';

import { useState, useEffect, useCallback } from 'react';
import { useCopilotReadable, useCopilotAction } from '@copilotkit/react-core';
import { Header } from '@/components/Header';
import { VideoCall } from '@/components/VideoCall';
import { ScheduleView } from '@/components/ScheduleView';
import { OnboardingFlow, type UserProfile } from '@/components/OnboardingFlow';
import type { ScheduleEvent } from '@/components/ScheduleCard';

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

export default function Home() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [conversationUrl, setConversationUrl] = useState<string | null>(null);
  const [newEventIds, setNewEventIds] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState<'active' | 'ready' | 'error'>('ready');
  const [speaker, setSpeaker] = useState<'drako' | 'user' | 'idle'>('idle');
  const [isActive, setIsActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      try {
        const res = await fetch('/api/user');
        if (res.ok) {
          const data = await res.json();
          if (data.onboarded && data.user) {
            setUser(data.user);
            if (data.events) {
              setEvents(data.events);
            }
          }
        }
      } catch {
        // No user yet
      } finally {
        setIsLoading(false);
      }
    };
    checkUser();
  }, []);

  useEffect(() => {
    if (!user) return;

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
        // Keep existing events
      }
    };
    fetchSchedule();
  }, [user]);

  useEffect(() => {
    if (!user) return;

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
  }, [user]);

  const startConversation = useCallback(async () => {
    setIsConnecting(true);
    try {
      const res = await fetch('/api/tavus/start', { method: 'POST' });
      const data = await res.json();
      if (data.conversationUrl) {
        setConversationUrl(data.conversationUrl);
        setIsActive(true);
        setSpeaker('drako');
        setStatus('active');
      } else {
        console.error('No conversation URL:', data);
        setStatus('error');
      }
    } catch (err) {
      console.error('Start conversation error:', err);
      setStatus('error');
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const endConversation = useCallback(() => {
    setConversationUrl(null);
    setIsActive(false);
    setSpeaker('idle');
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

  const handleOnboardingComplete = useCallback((newUser: UserProfile, newEvents: ScheduleEvent[]) => {
    setUser(newUser);
    setEvents(newEvents);
  }, []);

  const resetUser = useCallback(() => {
    document.cookie = 'drako_user_id=; path=/; max-age=0';
    setUser(null);
    setEvents([]);
    setConversationUrl(null);
    setIsActive(false);
  }, []);

  useCopilotReadable({
    description: "The user's current schedule for today",
    value: events,
  });

  useCopilotReadable({
    description: "The user's profile information",
    value: user,
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

  if (isLoading) {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        style={{ backgroundColor: 'var(--bg-primary)' }}
      >
        <span
          className="text-4xl animate-eyePulse"
          style={{ color: 'var(--accent-primary)' }}
        >
          🐉
        </span>
      </div>
    );
  }

  if (!user) {
    return <OnboardingFlow onComplete={handleOnboardingComplete} />;
  }

  return (
    <div className="flex flex-col h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <Header status={status} userName={user.name} onReset={resetUser} />

      <main className="flex-1 flex flex-col md:flex-row overflow-hidden">
        <section className="w-full md:w-1/2 p-6 flex flex-col">
          <VideoCall
            conversationUrl={conversationUrl}
            isActive={isActive}
            isConnecting={isConnecting}
            speaker={speaker}
            userName={user.name}
            onStart={startConversation}
            onEnd={endConversation}
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
