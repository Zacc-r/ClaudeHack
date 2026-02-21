'use client';

import { useState, useEffect, useCallback } from 'react';
import { useCopilotReadable, useCopilotAction } from '@copilotkit/react-core';
import { CopilotPopup } from '@copilotkit/react-ui';
import { Header } from '@/components/Header';
import { VideoCall } from '@/components/VideoCall';
import { ScheduleView } from '@/components/ScheduleView';
import { OnboardingFlow } from '@/components/OnboardingFlow';
import type { UserProfile } from '@/components/OnboardingFlow';
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

        if (update.type === 'conversation_started') {
          setStatus('active');
          return;
        }

        if (update.type === 'conversation_ended') {
          setStatus('ready');
          setConversationUrl(null);
          setIsActive(false);
          setSpeaker('idle');
          return;
        }

        if (update.type === 'speaker_change' && update.speaker) {
          setSpeaker(update.speaker as 'drako' | 'user' | 'idle');
          return;
        }

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
        style={{ background: 'linear-gradient(135deg, #0F172A 0%, #1E1B4B 50%, #0F172A 100%)' }}
      >
        <div className="flex flex-col items-center gap-4">
          <div className="text-6xl animate-robotIdle">🤖</div>
          <div className="text-lg text-[#38BDF8] animate-pulse">Loading DRAKO...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <OnboardingFlow onComplete={handleOnboardingComplete} />;
  }

  return (
    <div className="flex flex-col min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <Header status={status} userName={user.name} onReset={resetDemo} />

      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        {/* Video Call Panel - Left Side */}
        <section className="w-full lg:w-1/2 p-4 lg:p-6 flex flex-col relative">
          <div 
            className="absolute inset-0 backdrop-blur-glass"
            style={{ 
              background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.8), rgba(30, 27, 75, 0.6))',
              zIndex: -1,
            }}
          />
          <VideoCall
            conversationUrl={conversationUrl}
            isActive={isActive}
            isConnecting={isConnecting}
            speaker={speaker}
            userName={user.name}
            onStartConversation={startConversation}
            onEndConversation={endConversation}
          />
        </section>

        {/* Gradient Divider */}
        <div className="hidden lg:block w-1 gradient-divider" />

        {/* Schedule Panel - Right Side */}
        <section
          className="w-full lg:w-1/2 flex flex-col border-t lg:border-t-0 overflow-y-auto relative"
          style={{ borderColor: 'var(--border)', maxHeight: '100vh' }}
        >
          <ScheduleView
            events={events}
            newEventIds={newEventIds}
            onRemoveEvent={handleRemoveEvent}
          />
        </section>
      </main>

      {/* Powered By Badge */}
      <footer 
        className="flex items-center justify-center gap-2 py-3 text-xs"
        style={{ 
          backgroundColor: 'rgba(15, 23, 42, 0.9)',
          borderTop: '1px solid var(--border)',
          color: 'var(--text-muted)',
        }}
      >
        <span>Powered by</span>
        <span className="font-semibold text-[#38BDF8]">Claude</span>
        <span>+</span>
        <span className="font-semibold text-[#818CF8]">Tavus</span>
        <span className="mx-2">•</span>
        <span className="font-semibold text-[#A855F7]">CopilotKit</span>
      </footer>

      {/* CopilotKit Popup */}
      <CopilotPopup
        instructions={`You are DRAKO's text assistant. The user's name is ${user.name}. They are a ${user.type}. Help them modify their schedule. You can add, move, or remove events. Be concise and friendly.`}
        labels={{
          title: "💬 Chat with DRAKO",
          initial: "Need to adjust your schedule? Type here!",
        }}
      />
    </div>
  );
}
