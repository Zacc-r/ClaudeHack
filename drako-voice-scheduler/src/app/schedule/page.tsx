'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { DrakoRobot } from '@/components/DrakoRobot';
import type { ScheduleEvent } from '@/components/ScheduleCard';

// ─── Helpers ────────────────────────────────────────────────────────────────

function toMins(t: string) { const [h, m] = t.split(':').map(Number); return h * 60 + m; }
function fmtTime(t: string) {
  const [h, m] = t.split(':').map(Number);
  const p = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${p}`;
}
function fmtDur(start: string, end: string) {
  const d = toMins(end) - toMins(start);
  if (d <= 0) return '';
  const h = Math.floor(d / 60), m = d % 60;
  return h > 0 ? `${h}h${m > 0 ? ` ${m}m` : ''}` : `${m}m`;
}
function getDayLabel(dateStr: string, short = false) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: short ? 'short' : 'long' });
}
function getMonthLabel(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
function isToday(dateStr: string) {
  return dateStr === new Date().toISOString().split('T')[0];
}
function getMondayDates(): string[] {
  const today = new Date();
  const dow = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d.toISOString().split('T')[0];
  });
}

// ─── Timeline ───────────────────────────────────────────────────────────────

const HOUR_H = 64; // pixels per hour
const DAY_START = 6; // 6am
const DAY_END = 23;  // 11pm

function TimelineView({ events, date }: { events: ScheduleEvent[]; date: string }) {
  const nowRef = useRef<HTMLDivElement>(null);
  const now = new Date();
  const nowMins = now.getHours() * 60 + now.getMinutes();
  const nowOffset = ((nowMins - DAY_START * 60) / 60) * HOUR_H;
  const showNow = isToday(date) && nowOffset >= 0 && nowOffset <= (DAY_END - DAY_START) * HOUR_H;

  useEffect(() => {
    nowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [date]);

  const hours = Array.from({ length: DAY_END - DAY_START + 1 }, (_, i) => DAY_START + i);
  const totalH = (DAY_END - DAY_START) * HOUR_H;

  if (events.length === 0) return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <span className="text-5xl mb-4">😴</span>
      <p className="text-[#64748B] font-medium">No schedule yet for {getDayLabel(date)}</p>
      <p className="text-[#475569] text-sm mt-2">Chat with DRAKO to add events</p>
    </div>
  );

  return (
    <div className="relative flex" style={{ minHeight: totalH + 32 }}>
      {/* Hour labels */}
      <div className="flex-shrink-0 w-14 relative">
        {hours.map(h => (
          <div key={h} className="absolute right-2 text-xs text-[#475569] leading-none"
            style={{ top: (h - DAY_START) * HOUR_H - 7 }}>
            {h === 12 ? '12pm' : h > 12 ? `${h-12}pm` : h === 0 ? '12am' : `${h}am`}
          </div>
        ))}
      </div>

      {/* Grid + events */}
      <div className="flex-1 relative">
        {/* Hour lines */}
        {hours.map(h => (
          <div key={h} className="absolute w-full border-t border-[#1E293B]"
            style={{ top: (h - DAY_START) * HOUR_H }} />
        ))}

        {/* Now line */}
        {showNow && (
          <div ref={nowRef} className="absolute w-full z-20 flex items-center"
            style={{ top: nowOffset }}>
            <div className="w-2.5 h-2.5 rounded-full bg-[#EF4444] flex-shrink-0 -ml-1.5"
              style={{ boxShadow: '0 0 8px #EF444460' }} />
            <div className="flex-1 border-t-2 border-[#EF4444] opacity-80" />
          </div>
        )}

        {/* Events */}
        {events.map(e => {
          const startMins = toMins(e.start);
          const endMins   = e.end ? toMins(e.end) : startMins + 60;
          const top    = ((startMins - DAY_START * 60) / 60) * HOUR_H;
          const height = Math.max(((endMins - startMins) / 60) * HOUR_H, 28);
          return (
            <div key={e.id} className="absolute left-1 right-1 rounded-xl px-3 py-2 z-10 overflow-hidden"
              style={{
                top, height, backgroundColor: `${e.color}20`,
                border: `1.5px solid ${e.color}50`,
                boxShadow: `0 2px 12px ${e.color}15`,
              }}>
              <p className="font-semibold text-xs leading-tight truncate" style={{ color: e.color }}>
                {e.title}
              </p>
              {height > 36 && (
                <p className="text-xs text-[#64748B] mt-0.5 truncate">
                  {fmtTime(e.start)}{e.end ? ` · ${fmtDur(e.start, e.end)}` : ''}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

interface ChatMessage { role: 'user' | 'drako'; text: string; }
interface WeekDay { date: string; events: ScheduleEvent[]; }
interface Persona { archetype: string; archetypeEmoji: string; tagline: string; drakoGreeting: string; }

export default function SchedulePage() {
  const router = useRouter();
  const [weekDays, setWeekDays] = useState<WeekDay[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [persona, setPersona] = useState<Persona | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const weekDates = getMondayDates();

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const res = await fetch('/api/user');
        if (!res.ok || !(await res.clone().json().then((d: {onboarded:boolean}) => d.onboarded))) {
          router.replace('/onboarding'); return;
        }

        const [weekRes, personaRes] = await Promise.all([
          fetch('/api/schedule/week'),
          fetch('/api/persona'),
        ]);

        if (weekRes.ok) {
          const { week } = await weekRes.json();
          setWeekDays(week || []);
        }
        if (personaRes.ok) {
          const { persona: p } = await personaRes.json();
          if (p) setPersona(p);
        }
      } catch (e) {
        console.error(e);
      }
      setIsLoading(false);
    };
    load();
  }, [router]);

  useEffect(() => {
    if (chatOpen) {
      setTimeout(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, 100);
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [chatOpen, messages]);

  const selectedDay = weekDays.find(d => d.date === selectedDate);
  const selectedEvents = selectedDay?.events || [];

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || sending) return;
    const msg = text.trim();
    setInput('');
    setSending(true);
    setMessages(prev => [...prev, { role: 'user', text: msg }]);

    try {
      const res = await fetch('/api/schedule/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, date: selectedDate }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'drako', text: data.reply || "Done!" }]);
      if (data.events && data.events.length > 0) {
        setWeekDays(prev => prev.map(d =>
          d.date === selectedDate ? { ...d, events: data.events } : d
        ));
      }
    } catch {
      setMessages(prev => [...prev, { role: 'drako', text: "Hmm, something went wrong. Try again?" }]);
    }
    setSending(false);
  }, [sending, selectedDate]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  }, [input, sendMessage]);

  // Quick-actions
  const quickActions = [
    "Move my lunch to 1pm",
    "Add a 30min walk at 5pm",
    "Make my workout shorter",
    "Clear all afternoon meetings",
  ];

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center"
      style={{ background: 'linear-gradient(135deg,#0F172A 0%,#1E1B4B 50%,#0F172A 100%)' }}>
      <DrakoRobot size="xl" state="thinking" />
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col overflow-hidden"
      style={{ background: 'linear-gradient(135deg,#0F172A 0%,#1E1B4B 50%,#0F172A 100%)' }}>

      {/* Header */}
      <div className="flex-shrink-0 px-4 pt-4 pb-2">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <DrakoRobot size="sm" state="idle" />
            <div>
              <h1 className="text-lg font-bold text-white leading-none">
                {persona?.archetype || 'DRAKO Schedule'}
              </h1>
              <p className="text-[#475569] text-xs mt-0.5">
                {persona?.tagline || 'Your AI scheduling assistant'}
              </p>
            </div>
          </div>
          <button onClick={() => setChatOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-full font-semibold text-sm transition-all hover:scale-105"
            style={{ background: 'linear-gradient(135deg,#38BDF8,#818CF8)', color: 'white', boxShadow: '0 0 20px rgba(56,189,248,0.3)' }}>
            💬 Chat
          </button>
        </div>

        {/* Week tab strip */}
        <div className="flex gap-1 overflow-x-auto scrollbar-hide pb-1">
          {weekDates.map(date => {
            const day = weekDays.find(d => d.date === date);
            const evtCount = day?.events.length || 0;
            const active = date === selectedDate;
            const today  = isToday(date);
            return (
              <button key={date} onClick={() => setSelectedDate(date)}
                className="flex-shrink-0 flex flex-col items-center px-3 py-2 rounded-xl transition-all"
                style={{
                  background: active ? 'linear-gradient(135deg,#38BDF860,#818CF840)' : 'rgba(30,41,59,0.6)',
                  border: `1.5px solid ${active ? '#38BDF8' : today ? '#334155' : 'transparent'}`,
                }}>
                <span className="text-xs font-bold" style={{ color: active ? '#38BDF8' : today ? '#94A3B8' : '#475569' }}>
                  {getDayLabel(date, true).toUpperCase()}
                </span>
                <span className="text-xs font-medium mt-0.5" style={{ color: active ? 'white' : '#64748B' }}>
                  {getMonthLabel(date).split(' ')[1]}
                </span>
                {evtCount > 0 && (
                  <span className="mt-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{ background: active ? '#38BDF820' : '#1E293B', color: active ? '#38BDF8' : '#475569' }}>
                    {evtCount}
                  </span>
                )}
                {today && <div className="mt-1 w-1.5 h-1.5 rounded-full bg-[#38BDF8]" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Day header */}
      <div className="flex-shrink-0 px-4 py-2 flex items-center justify-between">
        <h2 className="text-base font-semibold text-white">
          {getDayLabel(selectedDate)} <span className="text-[#475569] font-normal text-sm">·</span>
          <span className="text-[#475569] text-sm font-normal ml-1">{getMonthLabel(selectedDate)}</span>
          {isToday(selectedDate) && <span className="ml-2 text-xs text-[#38BDF8] font-bold bg-[#38BDF815] px-2 py-0.5 rounded-full">TODAY</span>}
        </h2>
        <span className="text-xs text-[#475569]">{selectedEvents.length} events</span>
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-y-auto px-4 pb-32">
        <TimelineView events={selectedEvents} date={selectedDate} />
      </div>

      {/* Chat drawer overlay */}
      {chatOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          onClick={e => { if (e.target === e.currentTarget) setChatOpen(false); }}>
          <div className="rounded-t-3xl flex flex-col overflow-hidden"
            style={{ background: '#0F172A', border: '1.5px solid #1E293B', maxHeight: '80vh' }}>

            {/* Drawer header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#1E293B]">
              <div className="flex items-center gap-3">
                <DrakoRobot size="sm" state={sending ? 'thinking' : 'idle'} />
                <div>
                  <p className="font-bold text-white">Chat with DRAKO</p>
                  <p className="text-xs text-[#475569]">Tell me what to change in plain English</p>
                </div>
              </div>
              <button onClick={() => setChatOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-[#64748B] hover:text-white hover:bg-[#1E293B]">
                ✕
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-[120px]">
              {messages.length === 0 && (
                <div className="text-center py-4">
                  <p className="text-[#475569] text-sm">Tell me what to change! For example:</p>
                  <div className="mt-3 flex flex-wrap gap-2 justify-center">
                    {quickActions.map(qa => (
                      <button key={qa} onClick={() => sendMessage(qa)}
                        className="text-xs px-3 py-2 rounded-full border border-[#334155] text-[#64748B] hover:border-[#38BDF8] hover:text-[#38BDF8] transition-all">
                        {qa}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {m.role === 'drako' && (
                    <span className="mr-2 mt-1 text-base flex-shrink-0">🤖</span>
                  )}
                  <div className="max-w-[80%] px-4 py-3 rounded-2xl text-sm"
                    style={{
                      background: m.role === 'user'
                        ? 'linear-gradient(135deg,#38BDF820,#818CF820)'
                        : 'rgba(30,41,59,0.9)',
                      border: `1px solid ${m.role === 'user' ? '#38BDF840' : '#334155'}`,
                      color: m.role === 'user' ? '#E2E8F0' : '#CBD5E1',
                    }}>
                    {m.text}
                  </div>
                </div>
              ))}
              {sending && (
                <div className="flex justify-start">
                  <span className="mr-2 mt-1 text-base">🤖</span>
                  <div className="px-4 py-3 rounded-2xl bg-[#1E293B] border border-[#334155]">
                    <span className="text-[#38BDF8] animate-pulse text-sm">thinking...</span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSubmit} className="px-4 py-3 border-t border-[#1E293B] flex gap-2">
              <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
                placeholder="e.g. move gym to 7am, add lunch at 1pm..."
                disabled={sending}
                className="flex-1 px-4 py-3 rounded-2xl text-sm outline-none"
                style={{
                  background: 'rgba(30,41,59,0.8)',
                  border: '1.5px solid #334155',
                  color: 'white',
                }} />
              <button type="submit" disabled={!input.trim() || sending}
                className="px-5 py-3 rounded-2xl font-bold text-sm transition-all hover:scale-105 disabled:opacity-40"
                style={{ background: 'linear-gradient(135deg,#38BDF8,#818CF8)', color: 'white' }}>
                Send
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Floating chat button (when drawer closed) */}
      {!chatOpen && (
        <div className="fixed bottom-6 right-4 z-40">
          <button onClick={() => setChatOpen(true)}
            className="w-14 h-14 rounded-full flex items-center justify-center text-2xl shadow-2xl transition-all hover:scale-110"
            style={{ background: 'linear-gradient(135deg,#38BDF8,#818CF8)', boxShadow: '0 0 30px rgba(56,189,248,0.4)' }}>
            💬
          </button>
        </div>
      )}
    </div>
  );
}
