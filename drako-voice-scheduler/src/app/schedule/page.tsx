'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { DrakoRobot } from '@/components/DrakoRobot';
import type { ScheduleEvent } from '@/components/ScheduleCard';

function toMins(t: string) { const [h, m] = t.split(':').map(Number); return h * 60 + m; }
function fmtTime(t: string) {
  const [h, m] = t.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}
function fmtDur(start: string, end: string) {
  const d = toMins(end) - toMins(start);
  if (d <= 0) return '';
  const h = Math.floor(d / 60), m = d % 60;
  return h > 0 ? `${h}h${m > 0 ? ` ${m}m` : ''}` : `${m}m`;
}
function getDayLabel(dateStr: string, style: 'long' | 'short' | 'narrow' = 'long') {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { weekday: style });
}
function getDateNum(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').getDate();
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
function getTodayIdx(dates: string[]) {
  const t = new Date().toISOString().split('T')[0];
  const idx = dates.findIndex(d => d === t);
  return idx >= 0 ? idx : 0;
}

const HOUR_H = 56;
const DAY_START = 6;
const DAY_END = 23;
const HOURS = Array.from({ length: DAY_END - DAY_START + 1 }, (_, i) => DAY_START + i);
const TOTAL_H = (DAY_END - DAY_START) * HOUR_H;

interface WeekDay { date: string; events: ScheduleEvent[]; }
interface ChatMessage { role: 'user' | 'drako'; text: string; }
interface Persona { archetype: string; archetypeEmoji: string; tagline: string; drakoGreeting: string; }

export default function SchedulePage() {
  const router = useRouter();
  const [weekDays, setWeekDays] = useState<WeekDay[]>([]);
  const [persona, setPersona] = useState<Persona | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'3day' | 'week'>('3day');
  const [startIdx, setStartIdx] = useState(0);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const weekDates = getMondayDates();

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const res = await fetch('/api/user');
        if (!res.ok || !(await res.clone().json().then((d: { onboarded: boolean }) => d.onboarded))) {
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
        setStartIdx(Math.max(0, Math.min(getTodayIdx(weekDates), 4)));
      } catch (e) { console.error(e); }
      setIsLoading(false);
    };
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  useEffect(() => {
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  }, [messages]);

  useEffect(() => {
    if (!isLoading && scrollRef.current) {
      const now = new Date();
      const nowMins = now.getHours() * 60 + now.getMinutes();
      const offset = ((nowMins - DAY_START * 60) / 60) * HOUR_H;
      if (offset > 0) scrollRef.current.scrollTop = Math.max(0, offset - 120);
    }
  }, [isLoading]);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 500);
  }, [isLoading]);

  const visibleDates = viewMode === '3day'
    ? weekDates.slice(startIdx, startIdx + 3)
    : weekDates;

  const canPrev = viewMode === '3day' && startIdx > 0;
  const canNext = viewMode === '3day' && startIdx + 3 < 7;

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
        body: JSON.stringify({ message: msg, date: new Date().toISOString().split('T')[0] }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'drako', text: data.reply || "Done!" }]);
      if (data.events?.length > 0) {
        const today = new Date().toISOString().split('T')[0];
        setWeekDays(prev => prev.map(d => d.date === today ? { ...d, events: data.events } : d));
      }
    } catch {
      setMessages(prev => [...prev, { role: 'drako', text: "Something went wrong. Try again?" }]);
    }
    setSending(false);
  }, [sending]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  }, [input, sendMessage]);

  const quickActions = ["Move lunch to 1pm", "Add a 30min walk", "Shorter workout", "Clear afternoon"];

  if (isLoading) return (
    <div className="h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#0F172A 0%,#1E1B4B 50%,#0F172A 100%)' }}>
      <DrakoRobot size="xl" state="thinking" />
    </div>
  );

  return (
    <div className="h-screen flex overflow-hidden" style={{ background: 'linear-gradient(135deg,#0F172A 0%,#1E1B4B 50%,#0F172A 100%)' }}>

      {/* ═══════════ LEFT: Chat Sidebar ═══════════ */}
      <div className="w-[340px] flex-shrink-0 flex flex-col h-screen border-r border-[#1E293B]"
        style={{ background: 'rgba(10,10,20,0.7)' }}>

        {/* Chat header */}
        <div className="flex-shrink-0 px-4 py-4 border-b border-[#1E293B]">
          <div className="flex items-center gap-3">
            <DrakoRobot size="sm" state={sending ? 'thinking' : 'idle'} />
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-white leading-tight truncate">{persona?.archetype || 'DRAKO'}</h2>
              <p className="text-[10px] text-[#475569] truncate">{persona?.tagline || 'Edit your schedule in plain English'}</p>
            </div>
          </div>
        </div>

        {/* Chat messages */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
          {messages.length === 0 && (
            <div className="py-6 text-center">
              <DrakoRobot size="md" state="greeting" className="mx-auto mb-4" />
              <p className="text-[#64748B] text-sm mb-1 font-medium">What should I change?</p>
              <p className="text-[#475569] text-xs mb-4">Type below or try a quick action</p>
              <div className="flex flex-col gap-1.5">
                {quickActions.map(qa => (
                  <button key={qa} onClick={() => sendMessage(qa)}
                    className="w-full text-left text-xs px-3 py-2.5 rounded-xl border transition-all hover:border-[#38BDF8] hover:text-[#38BDF8]"
                    style={{ background: 'rgba(30,41,59,0.5)', borderColor: '#1E293B', color: '#94A3B8' }}>
                    {qa}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {m.role === 'drako' && <span className="mr-1.5 mt-1 text-sm flex-shrink-0">🤖</span>}
              <div className="max-w-[85%] px-3 py-2 rounded-2xl text-sm"
                style={{
                  background: m.role === 'user' ? 'linear-gradient(135deg,#38BDF820,#818CF820)' : 'rgba(30,41,59,0.9)',
                  border: `1px solid ${m.role === 'user' ? '#38BDF840' : '#334155'}`,
                  color: m.role === 'user' ? '#E2E8F0' : '#CBD5E1',
                  borderBottomRightRadius: m.role === 'user' ? 4 : 16,
                  borderBottomLeftRadius: m.role === 'drako' ? 4 : 16,
                }}>
                {m.text}
              </div>
            </div>
          ))}
          {sending && (
            <div className="flex justify-start">
              <span className="mr-1.5 mt-1 text-sm">🤖</span>
              <div className="px-3 py-2 rounded-2xl bg-[#1E293B] border border-[#334155]">
                <span className="text-[#38BDF8] animate-pulse text-sm">thinking...</span>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Chat input */}
        <form onSubmit={handleSubmit} className="flex-shrink-0 px-3 py-3 border-t border-[#1E293B]">
          <div className="flex gap-2">
            <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
              placeholder="e.g. move gym to 7am..."
              disabled={sending}
              className="flex-1 px-3 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: 'rgba(30,41,59,0.8)', border: '1.5px solid #334155', color: 'white' }} />
            <button type="submit" disabled={!input.trim() || sending}
              className="px-4 py-2.5 rounded-xl font-bold text-sm transition-all hover:scale-105 disabled:opacity-30"
              style={{ background: 'linear-gradient(135deg,#38BDF8,#818CF8)', color: 'white' }}>
              ↑
            </button>
          </div>
        </form>
      </div>

      {/* ═══════════ RIGHT: Schedule ═══════════ */}
      <div className="flex-1 flex flex-col h-screen min-w-0">

        {/* Schedule header */}
        <div className="flex-shrink-0 px-4 pt-3 pb-2">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-base font-bold text-white">Your Week</h1>
            <div className="flex items-center gap-2">
              <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid #334155' }}>
                <button onClick={() => setViewMode('3day')}
                  className="px-3 py-1 text-xs font-bold transition-all"
                  style={{ background: viewMode === '3day' ? '#38BDF820' : 'transparent', color: viewMode === '3day' ? '#38BDF8' : '#475569' }}>
                  3 Day
                </button>
                <button onClick={() => setViewMode('week')}
                  className="px-3 py-1 text-xs font-bold transition-all"
                  style={{ background: viewMode === 'week' ? '#38BDF820' : 'transparent', color: viewMode === 'week' ? '#38BDF8' : '#475569' }}>
                  Week
                </button>
              </div>
            </div>
          </div>

          {/* Day headers */}
          <div className="flex items-center gap-1">
            {viewMode === '3day' && (
              <button onClick={() => setStartIdx(i => Math.max(0, i - 1))} disabled={!canPrev}
                className="w-6 h-6 flex-shrink-0 rounded flex items-center justify-center text-xs font-bold disabled:opacity-20"
                style={{ background: 'rgba(30,41,59,0.8)', color: '#94A3B8' }}>‹</button>
            )}
            <div className="flex-1 grid gap-0.5" style={{ gridTemplateColumns: `repeat(${visibleDates.length}, 1fr)` }}>
              {visibleDates.map(date => {
                const day = weekDays.find(d => d.date === date);
                const evtCount = day?.events.length || 0;
                const today = isToday(date);
                return (
                  <div key={date} className="flex flex-col items-center py-1.5 rounded-lg transition-all"
                    style={{
                      background: today ? 'linear-gradient(135deg,#38BDF815,#818CF810)' : 'rgba(30,41,59,0.3)',
                      border: today ? '1px solid #38BDF830' : '1px solid transparent',
                    }}>
                    <span className="text-[10px] font-bold uppercase" style={{ color: today ? '#38BDF8' : '#475569' }}>
                      {getDayLabel(date, 'short')}
                    </span>
                    <span className="text-sm font-bold" style={{ color: today ? 'white' : '#94A3B8' }}>
                      {getDateNum(date)}
                    </span>
                    {evtCount > 0 && (
                      <span className="text-[8px] font-bold px-1 rounded-full"
                        style={{ background: today ? '#38BDF820' : '#1E293B', color: today ? '#38BDF8' : '#475569' }}>
                        {evtCount}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
            {viewMode === '3day' && (
              <button onClick={() => setStartIdx(i => Math.min(4, i + 1))} disabled={!canNext}
                className="w-6 h-6 flex-shrink-0 rounded flex items-center justify-center text-xs font-bold disabled:opacity-20"
                style={{ background: 'rgba(30,41,59,0.8)', color: '#94A3B8' }}>›</button>
            )}
          </div>
        </div>

        {/* Multi-day timeline */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto overflow-x-hidden">
          <div className="flex" style={{ minHeight: TOTAL_H + 16 }}>
            {/* Hour gutter */}
            <div className="flex-shrink-0 w-10 relative">
              {HOURS.map(h => (
                <div key={h} className="absolute right-1 text-[10px] text-[#475569] leading-none"
                  style={{ top: (h - DAY_START) * HOUR_H - 6 }}>
                  {h === 12 ? '12p' : h > 12 ? `${h - 12}p` : `${h}a`}
                </div>
              ))}
            </div>

            {/* Day columns */}
            <div className="flex-1 grid gap-px" style={{ gridTemplateColumns: `repeat(${visibleDates.length}, 1fr)` }}>
              {visibleDates.map(date => {
                const day = weekDays.find(d => d.date === date);
                const events = day?.events || [];
                const today = isToday(date);
                const now = new Date();
                const nowMins = now.getHours() * 60 + now.getMinutes();
                const nowOffset = ((nowMins - DAY_START * 60) / 60) * HOUR_H;
                const showNow = today && nowOffset >= 0 && nowOffset <= TOTAL_H;

                return (
                  <div key={date} className="relative" style={{ minHeight: TOTAL_H }}>
                    {HOURS.map(h => (
                      <div key={h} className="absolute w-full border-t" style={{ top: (h - DAY_START) * HOUR_H, borderColor: '#1E293B50' }} />
                    ))}
                    {today && <div className="absolute inset-0" style={{ background: 'rgba(56,189,248,0.03)' }} />}
                    {showNow && (
                      <div className="absolute w-full z-20 flex items-center" style={{ top: nowOffset }}>
                        <div className="w-2 h-2 rounded-full bg-[#EF4444] flex-shrink-0 -ml-1" style={{ boxShadow: '0 0 8px #EF444460' }} />
                        <div className="flex-1 border-t-2 border-[#EF4444] opacity-70" />
                      </div>
                    )}
                    {events.map(e => {
                      const startM = toMins(e.start);
                      const endM = e.end ? toMins(e.end) : startM + 60;
                      const top = ((startM - DAY_START * 60) / 60) * HOUR_H;
                      const height = Math.max(((endM - startM) / 60) * HOUR_H, 24);
                      const color = e.color || '#38BDF8';
                      const compact = visibleDates.length > 3;
                      return (
                        <div key={e.id} className="absolute left-0.5 right-0.5 rounded-lg overflow-hidden z-10"
                          style={{ top, height, background: `${color}20`, borderLeft: `3px solid ${color}`, boxShadow: `0 1px 6px ${color}10` }}>
                          <div className={`px-1.5 py-1 h-full flex flex-col justify-center ${compact ? '' : 'gap-0.5'}`}>
                            <p className="font-semibold leading-tight truncate" style={{ color, fontSize: compact ? 9 : 11 }}>
                              {e.title}
                            </p>
                            {!compact && height > 32 && (
                              <p className="text-[9px] text-[#64748B] truncate">
                                {fmtTime(e.start)}{e.end ? ` · ${fmtDur(e.start, e.end)}` : ''}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {events.length === 0 && (
                      <div className="absolute inset-x-1 top-1/3 text-center">
                        <span className="text-xl opacity-30">😴</span>
                        <p className="text-[8px] text-[#475569] mt-1">No events</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
