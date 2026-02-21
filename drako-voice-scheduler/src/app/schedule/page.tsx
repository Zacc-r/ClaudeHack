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
function isToday(d: string) { return d === new Date().toISOString().split('T')[0]; }
function dayLabel(dateStr: string, fmt: 'short' | 'narrow' = 'short') {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { weekday: fmt });
}
function dateNum(dateStr: string) { return new Date(dateStr + 'T00:00:00').getDate(); }
function getMondayWeek(): string[] {
  const t = new Date(); const dow = t.getDay();
  const mon = new Date(t); mon.setDate(t.getDate() - (dow === 0 ? 6 : dow - 1));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mon); d.setDate(mon.getDate() + i);
    return d.toISOString().split('T')[0];
  });
}

const HR_H = 56;
const DAY_S = 6;
const DAY_E = 23;
const HOURS = Array.from({ length: DAY_E - DAY_S + 1 }, (_, i) => DAY_S + i);
const TOTAL_H = (DAY_E - DAY_S) * HR_H;

interface WeekDay { date: string; events: ScheduleEvent[]; }
interface Persona { archetype: string; archetypeEmoji: string; tagline: string; drakoGreeting: string; }
interface ChatMsg { role: 'user' | 'drako'; text: string; }

export default function SchedulePage() {
  const router = useRouter();
  const today = new Date().toISOString().split('T')[0];
  const [weekDays, setWeekDays] = useState<WeekDay[]>([]);
  const [persona, setPersona] = useState<Persona | null>(null);
  const [loading, setLoading] = useState(true);
  const [rebuilding, setRebuilding] = useState(false);
  const [viewMode, setViewMode] = useState<'3day' | 'week'>('3day');
  const [startIdx, setStartIdx] = useState(0);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const weekDates = getMondayWeek();

  const loadWeek = useCallback(async () => {
    const res = await fetch('/api/schedule/week');
    if (res.ok) { const { week } = await res.json(); return (week || []) as WeekDay[]; }
    return [];
  }, []);

  const rebuildWeek = useCallback(async () => {
    setRebuilding(true);
    try {
      await fetch('/api/schedule/rebuild?week=true', { method: 'POST' });
      const week = await loadWeek();
      setWeekDays(week);
    } catch { /* */ }
    setRebuilding(false);
  }, [loadWeek]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/user');
        const d = await res.json();
        if (!d.onboarded) { router.replace('/onboarding'); return; }

        const [pRes] = await Promise.all([fetch('/api/persona')]);
        if (pRes.ok) { const { persona: p } = await pRes.json(); if (p) setPersona(p); }

        const week = await loadWeek();
        setWeekDays(week);

        // Center on today
        const todayIdx = weekDates.findIndex(d2 => d2 === today);
        setStartIdx(Math.max(0, Math.min(todayIdx >= 0 ? todayIdx - 1 : 0, 4)));
        setLoading(false);

        // Auto-rebuild if any day is empty
        const hasEmpty = weekDates.some(date => {
          const day = week.find(w => w.date === date);
          return !day || day.events.length === 0;
        });
        if (hasEmpty) {
          setRebuilding(true);
          await fetch('/api/schedule/rebuild?week=true', { method: 'POST' });
          const freshWeek = await loadWeek();
          setWeekDays(freshWeek);
          setRebuilding(false);
        }
      } catch { /* */ }
      setLoading(false);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  useEffect(() => {
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  }, [messages]);

  useEffect(() => {
    if (!loading && scrollRef.current) {
      const now = new Date();
      const offset = ((now.getHours() * 60 + now.getMinutes() - DAY_S * 60) / 60) * HR_H;
      if (offset > 0) scrollRef.current.scrollTop = Math.max(0, offset - 100);
    }
  }, [loading, rebuilding]);

  useEffect(() => {
    if (!loading) setTimeout(() => inputRef.current?.focus(), 400);
  }, [loading]);

  const visibleDates = viewMode === '3day' ? weekDates.slice(startIdx, startIdx + 3) : weekDates;
  const canPrev = viewMode === '3day' && startIdx > 0;
  const canNext = viewMode === '3day' && startIdx + 3 < 7;

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || sending) return;
    const msg = text.trim(); setInput(''); setSending(true);
    setMessages(prev => [...prev, { role: 'user', text: msg }]);
    try {
      const res = await fetch('/api/schedule/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, date: today }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'drako', text: data.reply || 'Done!' }]);
      // Refresh entire week after any chat change
      const week = await loadWeek();
      setWeekDays(week);
    } catch {
      setMessages(prev => [...prev, { role: 'drako', text: 'Something went wrong. Try again?' }]);
    }
    setSending(false);
  }, [sending, today, loadWeek]);

  const quickActions = ['Add lunch 12:30pm', 'Move gym to 7am', 'Add 30min walk at 5pm', 'Clear the evening'];

  if (loading) return (
    <div className="h-screen flex items-center justify-center" style={{ background: '#0D1525' }}>
      <DrakoRobot size="lg" state="thinking" />
    </div>
  );

  return (
    <div className="h-screen flex overflow-hidden" style={{ background: 'linear-gradient(180deg,#0D1525 0%,#0A0F1E 100%)' }}>

      {/* ═══ LEFT: Chat Sidebar ═══ */}
      <div className="w-[320px] flex-shrink-0 flex flex-col h-full border-r border-[#1E293B]"
        style={{ background: 'rgba(10,12,24,0.95)' }}>

        {/* Header */}
        <div className="flex-shrink-0 px-4 py-3 border-b border-[#1E293B]">
          <div className="flex items-center gap-2.5">
            <DrakoRobot size="sm" state={sending ? 'thinking' : 'idle'} />
            <div className="min-w-0">
              <p className="text-sm font-bold text-white leading-tight truncate">
                {persona?.archetype || 'DRAKO'} {persona?.archetypeEmoji || '🤖'}
              </p>
              <p className="text-[10px] text-[#3F5068] truncate">Edit schedule in plain English</p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5">
          {messages.length === 0 && (
            <div className="py-4 text-center">
              <DrakoRobot size="md" state="greeting" className="mx-auto mb-3" />
              <p className="text-[#64748B] text-sm font-medium mb-1">What should I change?</p>
              <p className="text-[#3F5068] text-xs mb-4">Type below or try a quick action</p>
              <div className="flex flex-col gap-1.5">
                {quickActions.map(qa => (
                  <button key={qa} onClick={() => sendMessage(qa)}
                    className="w-full text-left text-xs px-3 py-2.5 rounded-xl border transition-all hover:border-[#38BDF8] hover:text-[#38BDF8]"
                    style={{ background: 'rgba(30,41,59,0.4)', borderColor: '#1E293B', color: '#94A3B8' }}>
                    {qa}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start gap-1.5'}`}>
              {m.role === 'drako' && <span className="text-sm mt-0.5 flex-shrink-0">🤖</span>}
              <div className="max-w-[88%] px-3 py-2 rounded-2xl text-sm leading-snug"
                style={{
                  background: m.role === 'user' ? 'rgba(56,189,248,0.12)' : '#1E293B',
                  border: `1px solid ${m.role === 'user' ? '#38BDF830' : '#334155'}`,
                  color: '#CBD5E1',
                  borderBottomRightRadius: m.role === 'user' ? 4 : 16,
                  borderBottomLeftRadius: m.role === 'drako' ? 4 : 16,
                }}>
                {m.text}
              </div>
            </div>
          ))}
          {sending && (
            <div className="flex gap-1.5">
              <span className="text-sm">🤖</span>
              <div className="px-3 py-2 rounded-2xl bg-[#1E293B] border border-[#334155]">
                <span className="text-[#38BDF8] text-sm animate-pulse">thinking...</span>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={e => { e.preventDefault(); sendMessage(input); }}
          className="flex-shrink-0 px-3 py-3 border-t border-[#1E293B] flex gap-2">
          <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
            disabled={sending} placeholder="e.g. move gym to 7am..."
            className="flex-1 px-3 py-2.5 rounded-xl text-sm outline-none min-w-0"
            style={{ background: '#1E293B', border: '1.5px solid #334155', color: 'white' }} />
          <button type="submit" disabled={!input.trim() || sending}
            className="flex-shrink-0 px-4 py-2.5 rounded-xl font-bold text-sm disabled:opacity-30"
            style={{ background: 'linear-gradient(135deg,#38BDF8,#818CF8)', color: 'white' }}>
            ↑
          </button>
        </form>
      </div>

      {/* ═══ RIGHT: Schedule ═══ */}
      <div className="flex-1 flex flex-col h-full min-w-0">

        {/* Top bar */}
        <div className="flex-shrink-0 px-3 pt-3 pb-1">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-base font-bold text-white">Your Week</h1>
            <div className="flex items-center gap-2">
              <button onClick={rebuildWeek} disabled={rebuilding}
                className="text-[11px] px-2.5 py-1 rounded-full font-medium transition-all"
                style={{ background: 'rgba(30,41,59,0.8)', border: '1px solid #334155', color: rebuilding ? '#38BDF8' : '#64748B' }}>
                {rebuilding ? '⟳ Building...' : '↺ Rebuild'}
              </button>
              <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid #334155' }}>
                <button onClick={() => setViewMode('3day')}
                  className="px-2.5 py-1 text-[11px] font-bold transition-all"
                  style={{ background: viewMode === '3day' ? '#38BDF820' : 'transparent', color: viewMode === '3day' ? '#38BDF8' : '#475569' }}>
                  3 Day
                </button>
                <button onClick={() => setViewMode('week')}
                  className="px-2.5 py-1 text-[11px] font-bold transition-all"
                  style={{ background: viewMode === 'week' ? '#38BDF820' : 'transparent', color: viewMode === 'week' ? '#38BDF8' : '#475569' }}>
                  Week
                </button>
              </div>
            </div>
          </div>

          {/* Day headers */}
          <div className="flex items-center gap-0.5">
            {viewMode === '3day' && (
              <button onClick={() => setStartIdx(i => Math.max(0, i - 1))} disabled={!canPrev}
                className="w-6 h-6 flex-shrink-0 rounded flex items-center justify-center text-xs font-bold disabled:opacity-20"
                style={{ color: '#64748B' }}>‹</button>
            )}
            <div className="flex-1 grid gap-0.5" style={{ gridTemplateColumns: `repeat(${visibleDates.length}, 1fr)` }}>
              {visibleDates.map(date => {
                const day = weekDays.find(d => d.date === date);
                const evtCount = day?.events.length || 0;
                const tod = isToday(date);
                return (
                  <div key={date} className="flex flex-col items-center py-1.5 rounded-lg"
                    style={{
                      background: tod ? 'rgba(56,189,248,0.1)' : 'rgba(30,41,59,0.25)',
                      border: tod ? '1px solid #38BDF830' : '1px solid transparent',
                    }}>
                    <span className="text-[10px] font-bold uppercase" style={{ color: tod ? '#38BDF8' : '#3F5068' }}>
                      {dayLabel(date)}
                    </span>
                    <span className="text-sm font-bold" style={{ color: tod ? 'white' : '#94A3B8' }}>
                      {dateNum(date)}
                    </span>
                    {evtCount > 0 && (
                      <span className="text-[8px] font-bold px-1 rounded-full"
                        style={{ background: tod ? '#38BDF820' : '#1E293B', color: tod ? '#38BDF8' : '#475569' }}>
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
                style={{ color: '#64748B' }}>›</button>
            )}
          </div>
        </div>

        {/* Rebuilding overlay */}
        {rebuilding && (
          <div className="flex-shrink-0 flex items-center justify-center gap-2 py-2 mx-3 rounded-lg"
            style={{ background: 'rgba(56,189,248,0.08)', border: '1px solid #38BDF820' }}>
            <DrakoRobot size="xs" state="thinking" />
            <span className="text-xs text-[#38BDF8] font-medium animate-pulse">Building all 7 days...</span>
          </div>
        )}

        {/* Timeline */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto overflow-x-hidden">
          <div className="flex" style={{ minHeight: TOTAL_H + 16 }}>
            {/* Hour gutter */}
            <div className="flex-shrink-0 w-10 relative select-none">
              {HOURS.map(h => (
                <div key={h} className="absolute right-1 text-[10px] text-[#3F5068] leading-none"
                  style={{ top: (h - DAY_S) * HR_H - 6 }}>
                  {h === 12 ? '12p' : h > 12 ? `${h - 12}p` : `${h}a`}
                </div>
              ))}
            </div>

            {/* Day columns */}
            <div className="flex-1 grid gap-px" style={{ gridTemplateColumns: `repeat(${visibleDates.length}, 1fr)` }}>
              {visibleDates.map(date => {
                const day = weekDays.find(d => d.date === date);
                const events = day?.events || [];
                const tod = isToday(date);
                const now = new Date();
                const nowMins = now.getHours() * 60 + now.getMinutes();
                const nowTop = ((nowMins - DAY_S * 60) / 60) * HR_H;
                const showNow = tod && nowTop >= 0 && nowTop <= TOTAL_H;
                const compact = visibleDates.length > 3;

                return (
                  <div key={date} className="relative border-l border-[#1E293B30]" style={{ minHeight: TOTAL_H }}>
                    {HOURS.map(h => (
                      <div key={h} className="absolute w-full border-t border-[#1E293B40]" style={{ top: (h - DAY_S) * HR_H }} />
                    ))}
                    {tod && <div className="absolute inset-0" style={{ background: 'rgba(56,189,248,0.025)' }} />}
                    {showNow && (
                      <div className="absolute w-full z-20 flex items-center pointer-events-none" style={{ top: nowTop }}>
                        <div className="w-2 h-2 rounded-full bg-[#EF4444] flex-shrink-0 -ml-1" style={{ boxShadow: '0 0 6px #EF444480' }} />
                        <div className="flex-1 border-t-2 border-[#EF4444] opacity-60" />
                      </div>
                    )}
                    {events.map(e => {
                      const startM = toMins(e.start);
                      const endM = e.end ? toMins(e.end) : startM + 60;
                      const top = ((startM - DAY_S * 60) / 60) * HR_H;
                      const height = Math.max(((endM - startM) / 60) * HR_H - 1, 20);
                      const color = e.color || '#38BDF8';
                      return (
                        <div key={e.id} className="absolute left-0.5 right-0.5 rounded-lg overflow-hidden z-10"
                          style={{ top, height, background: `${color}20`, borderLeft: `3px solid ${color}` }}>
                          <div className="px-1.5 py-0.5 h-full flex flex-col justify-center">
                            <p className="font-semibold leading-tight truncate" style={{ color, fontSize: compact ? 9 : 11 }}>
                              {e.title}
                            </p>
                            {!compact && height > 30 && (
                              <p className="text-[9px] text-[#475569] truncate">
                                {fmtTime(e.start)}{e.end ? ` · ${fmtDur(e.start, e.end)}` : ''}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
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
