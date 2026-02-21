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
            const scheduleRes = await fetch(`/api/schedule?date=${new Date().toISOString().split('T')[0]}`);
            if (scheduleRes.ok) {
              const scheduleData = await scheduleRes.json();
              if (scheduleData.events) {
                setEvents(scheduleData.events);
              }
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

    const es = new EventSource('/api/schedule/stream');

    es.onopen = () => {
      setStatus('active');
    };

    es.onmessage = (e) => {
      try {
        const update = JSON.parse(e.data);

        if (update.type === 'add' && update.event) {
          setEvents(prev => {
            if (prev.some(ev => ev.id === update.event.id)) return prev;
            const next = [...prev, update.event];
            next.sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));
            return next;
          });
          setNewEventIds(prev => new Set([...prev, update.event.id]));
          setTimeout(() => {
            setNewEventIds(prev => {
              const n = new Set(prev);
              n.delete(update.event.id);
              return n;
            });
          }, 800);
        }

        if (update.type === 'remove' && update.event) {
          setEvents(prev => prev.filter(ev => ev.id !== update.event.id));
        }

        if (update.type === 'move' && update.event) {
          setEvents(prev => {
            const filtered = prev.filter(ev => ev.id !== update.event.id);
            const next = [...filtered, update.event];
            next.sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));
            return next;
          });
          setNewEventIds(prev => new Set([...prev, update.event.id]));
          setTimeout(() => {
            setNewEventIds(prev => {
              const n = new Set(prev);
              n.delete(update.event.id);
              return n;
            });
          }, 800);
        }
      } catch {
        // Ignore heartbeat or malformed
      }
    };

    es.onerror = () => {
      setStatus('error');
      console.warn('SSE connection lost, will reconnect...');
    };

    return () => es.close();
  }, [user]);

  const startConversation = useCallback(async () => {
    setIsConnecting(true);
    try {
      const res = await fetch('/api/tavus/start', { method: 'POST' });
      const data = await res.json();
      if (data.success && data.conversationUrl) {
        setConversationUrl(data.conversationUrl);
        setIsActive(true);
        setSpeaker('drako');
        setStatus('active');
      } else {
        console.error('Failed to start conversation:', data);
        alert(`Failed to start: ${data.error || 'Unknown error'}`);
        setStatus('error');
      }
    } catch (err) {
      console.error('Start conversation error:', err);
      alert(`Connection error: ${err instanceof Error ? err.message : 'Unknown error'}`);
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

  const resetDemo = useCallback(() => {
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
        style={{ background: 'var(--bg-primary, #0A0A0F)' }}
      >
        <div className="text-4xl animate-pulse">🐉</div>
      </div>
    );
  }

  if (!user) {
    return <OnboardingFlow onComplete={handleOnboardingComplete} />;
  }

  return (
    <div className="flex flex-col min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <Header status={status} userName={user.name} onReset={resetDemo} />

      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        <section className="w-full lg:w-1/2 p-4 lg:p-6 flex flex-col">
          <VideoCall
            conversationUrl={conversationUrl}
            isActive={isActive}
            isConnecting={isConnecting}
            speaker={speaker}
            userName={user.name}
            onStartConversation={startConversation}
            onEndConversation={endConversation}
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
          className="w-full lg:w-1/2 flex flex-col border-t lg:border-t-0 lg:border-l overflow-y-auto"
          style={{ borderColor: 'var(--border)', maxHeight: '100vh' }}
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
