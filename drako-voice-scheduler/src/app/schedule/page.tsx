'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useCopilotReadable, useCopilotAction } from '@copilotkit/react-core';
import { CopilotPopup } from '@copilotkit/react-ui';
import { Header } from '@/components/Header';
import { VideoCall } from '@/components/VideoCall';
import { ScheduleView } from '@/components/ScheduleView';
import type { UserProfile } from '@/components/OnboardingFlow';
import type { ScheduleEvent } from '@/components/ScheduleCard';

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

export default function SchedulePage() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [persona, setPersona] = useState<{ archetype: string; archetypeEmoji: string; tagline: string; drakoGreeting: string } | null>(null);
  const [conversationUrl, setConversationUrl] = useState<string | null>(null);
  const [newEventIds, setNewEventIds] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState<'active' | 'ready' | 'error'>('ready');
  const [speaker, setSpeaker] = useState<'drako' | 'user' | 'idle'>('idle');
  const [isActive, setIsActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        // Check for user via cookie
        const res = await fetch('/api/user');
        if (res.ok) {
          const data = await res.json();
          if (data.onboarded && data.user) {
            setUser(data.user);
            const today = new Date().toISOString().split('T')[0];
            const [schedRes, personaRes] = await Promise.all([
              fetch(`/api/schedule?date=${today}`),
              fetch('/api/persona'),
            ]);
            if (schedRes.ok) {
              const sd = await schedRes.json();
              if (sd.events) setEvents(sd.events);
            }
            if (personaRes.ok) {
              const pd = await personaRes.json();
              if (pd.persona) setPersona(pd.persona);
            }
          } else {
            router.replace('/onboarding');
            return;
          }
        } else {
          router.replace('/onboarding');
          return;
        }
      } catch {
        router.replace('/onboarding');
        return;
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [router]);

  // SSE for real-time updates with reconnection
  useEffect(() => {
    if (!user) return;
    
    let es: EventSource | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let reconnectAttempts = 0;
    const MAX_RECONNECT_DELAY = 30000;
    
    const connect = () => {
      es = new EventSource('/api/schedule/stream');
      
      es.onopen = () => {
        setStatus('ready');
        reconnectAttempts = 0;
      };
      
      es.onmessage = (e) => {
        try {
          const update = JSON.parse(e.data);
          if (update.type === 'conversation_started') { setStatus('active'); return; }
          if (update.type === 'conversation_ended') {
            setStatus('ready'); setConversationUrl(null); setIsActive(false); setSpeaker('idle'); setConnectionError(null); return;
          }
          if (update.type === 'speaker_change' && update.speaker) {
            setSpeaker(update.speaker as 'drako' | 'user' | 'idle'); return;
          }
          if (update.type === 'add' && update.event) {
            setEvents(prev => {
              if (prev.some(ev => ev.id === update.event.id)) return prev;
              return [...prev, update.event].sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));
            });
            setNewEventIds(prev => new Set([...prev, update.event.id]));
            setTimeout(() => setNewEventIds(prev => { const n = new Set(prev); n.delete(update.event.id); return n; }), 800);
          }
          if (update.type === 'remove' && update.event) {
            setEvents(prev => prev.filter(ev => ev.id !== update.event.id));
          }
          if (update.type === 'move' && update.event) {
            setEvents(prev => {
              const filtered = prev.filter(ev => ev.id !== update.event.id);
              return [...filtered, update.event].sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));
            });
            setNewEventIds(prev => new Set([...prev, update.event.id]));
            setTimeout(() => setNewEventIds(prev => { const n = new Set(prev); n.delete(update.event.id); return n; }), 800);
          }
        } catch { /* heartbeat or invalid JSON */ }
      };
      
      es.onerror = () => {
        es?.close();
        setStatus('error');
        reconnectAttempts++;
        const delay = Math.min(3000 * Math.pow(2, reconnectAttempts - 1), MAX_RECONNECT_DELAY);
        reconnectTimer = setTimeout(connect, delay);
      };
    };
    
    connect();
    
    return () => {
      es?.close();
      if (reconnectTimer) clearTimeout(reconnectTimer);
    };
  }, [user]);

  const startConversation = useCallback(async () => {
    setIsConnecting(true);
    setConnectionError(null);
    try {
      const res = await fetch('/api/tavus/start', { method: 'POST' });
      const data = await res.json();
      if (data.success && data.conversationUrl) {
        setConversationUrl(data.conversationUrl);
        setConnectionError(null);
        setIsActive(true);
        setSpeaker('drako');
        setStatus('active');
      } else {
        setConnectionError(data.error || data.hint || 'Failed to connect to DRAKO. Please try again.');
        setStatus('error');
      }
    } catch (err) {
      setConnectionError(`Connection failed: ${err instanceof Error ? err.message : 'Unknown error'}. Check your internet and try again.`);
      setStatus('error');
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const endConversation = useCallback(() => {
    setConversationUrl(null); setIsActive(false); setSpeaker('idle');
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
      setEvents(prev => [...prev, event].sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start)));
    }
  }, [events]);

  const resetDemo = useCallback(() => {
    document.cookie = 'drako_user_id=; path=/; max-age=0';
    router.replace('/');
  }, [router]);

  useCopilotReadable({ description: "User's schedule for today", value: events });
  useCopilotReadable({ description: "User's profile", value: user });
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
      <div className="flex min-h-screen items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #0F172A 0%, #1E1B4B 50%, #0F172A 100%)' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="text-6xl animate-pulse">🐉</div>
          <div className="text-lg text-[#38BDF8] animate-pulse">Loading your day...</div>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex flex-col min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <Header status={status} userName={user.name} onReset={resetDemo} />

      {/* Persona strip */}
      {persona && (
        <div className="flex items-center gap-3 px-4 py-2 border-b"
          style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
          <span className="text-xl">{persona.archetypeEmoji}</span>
          <div>
            <span className="text-sm font-semibold text-white">{persona.archetype}</span>
            <span className="text-xs text-[#64748B] ml-2">{persona.tagline}</span>
          </div>
        </div>
      )}

      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        <section className="w-full lg:w-1/2 p-4 lg:p-6 flex flex-col relative"
          style={{ background: 'linear-gradient(135deg, rgba(15,23,42,0.8), rgba(30,27,75,0.6))' }}>
          <VideoCall
            conversationUrl={conversationUrl}
            isActive={isActive}
            isConnecting={isConnecting}
            connectionError={connectionError}
            speaker={speaker}
            userName={user.name}
            onStartConversation={startConversation}
            onEndConversation={endConversation}
          />
        </section>

        <div className="hidden lg:block w-px" style={{ backgroundColor: 'var(--border)' }} />

        <section className="w-full lg:w-1/2 flex flex-col border-t lg:border-t-0 overflow-y-auto"
          style={{ borderColor: 'var(--border)', maxHeight: '100vh' }}>
          <ScheduleView
            events={events}
            newEventIds={newEventIds}
            onRemoveEvent={handleRemoveEvent}
          />
        </section>
      </main>

      <footer className="flex items-center justify-center gap-2 py-2 text-xs"
        style={{ backgroundColor: 'rgba(15,23,42,0.9)', borderTop: '1px solid var(--border)', color: 'var(--text-muted)' }}>
        <span>Powered by</span>
        <span className="font-semibold text-[#38BDF8]">Claude</span>
        <span>+</span>
        <span className="font-semibold text-[#818CF8]">Tavus</span>
        <span className="mx-1">•</span>
        <span className="font-semibold text-[#A855F7]">CopilotKit</span>
      </footer>

      <CopilotPopup
        instructions={`You are DRAKO's text assistant. User: ${user.name} (${user.type}). Persona: ${persona?.archetype || 'focused builder'}. Help modify their schedule concisely.`}
        labels={{ title: '💬 Chat with DRAKO', initial: 'Need to adjust your schedule?' }}
      />
    </div>
  );
}
