'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { DrakoRobot } from '@/components/DrakoRobot';
import type { ScheduleEvent } from '@/components/ScheduleCard';

// ─── Utils ──────────────────────────────────────────────────────────────────
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
function addDays(dateStr: string, n: number) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}
function isToday(d: string) { return d === new Date().toISOString().split('T')[0]; }
function dayLabel(dateStr: string, fmt: 'short'|'narrow' = 'short') {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { weekday: fmt });
}
function dateNum(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').getDate();
}
function getMondayWeek(): string[] {
  const t = new Date(); const dow = t.getDay();
  const mon = new Date(t); mon.setDate(t.getDate() - (dow === 0 ? 6 : dow - 1));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mon); d.setDate(mon.getDate() + i);
    return d.toISOString().split('T')[0];
  });
}

// ─── Timeline ───────────────────────────────────────────────────────────────
const HR_H = 56;      // px per hour — must fit ~15hrs in ~840px
const DAY_S = 6;      // 6 AM start
const DAY_E = 22;     // 10 PM end
const HOURS = Array.from({ length: DAY_E - DAY_S + 1 }, (_, i) => DAY_S + i);
const TOTAL_H = (DAY_E - DAY_S) * HR_H;

interface WeekDay { date: string; events: ScheduleEvent[]; }
interface Persona { archetype: string; archetypeEmoji: string; tagline: string; drakoGreeting: string; }
interface ChatMsg { role: 'user' | 'drako'; text: string; }

function EventBlock({ e, pxPerHr }: { e: ScheduleEvent; pxPerHr: number }) {
  const startM = toMins(e.start);
  const endM   = e.end ? toMins(e.end) : startM + 60;
  const top    = ((startM - DAY_S * 60) / 60) * pxPerHr;
  const height = Math.max(((endM - startM) / 60) * pxPerHr - 2, 18);
  return (
    <div className="absolute left-0.5 right-0.5 rounded-lg overflow-hidden cursor-default select-none"
      style={{ top, height, background: `${e.color}22`, border: `1px solid ${e.color}55` }}>
      <div className="px-1.5 pt-1">
        <p className="text-[10px] font-semibold leading-tight truncate" style={{ color: e.color }}>
          {e.title}
        </p>
        {height > 36 && (
          <p className="text-[9px] text-[#475569] leading-tight truncate">
            {fmtTime(e.start)}{e.end ? ` · ${fmtDur(e.start, e.end)}` : ''}
          </p>
        )}
      </div>
    </div>
  );
}

function ThreeDayGrid({
  dates, weekDays, onSelect, selectedDate,
}: {
  dates: string[]; weekDays: WeekDay[]; onSelect: (d: string) => void; selectedDate: string;
}) {
  const nowRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const now = new Date();
  const nowMins = now.getHours() * 60 + now.getMinutes();
  const nowTop  = ((nowMins - DAY_S * 60) / 60) * HR_H;
  const showNow = nowMins >= DAY_S * 60 && nowMins <= DAY_E * 60;

  useEffect(() => {
    const el = nowRef.current || scrollRef.current;
    if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'center' }), 200);
  }, []);

  const getEvents = (date: string) => weekDays.find(d => d.date === date)?.events || [];

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto overflow-x-hidden">
      <div className="flex" style={{ minHeight: TOTAL_H + 24 }}>
        {/* Hour labels */}
        <div className="flex-shrink-0 w-11 relative select-none pt-3">
          {HOURS.map(h => (
            <div key={h} className="absolute right-1 text-right leading-none"
              style={{ top: (h - DAY_S) * HR_H - 6 }}>
              <span className="text-[10px] text-[#3F5068]">
                {h === 12 ? '12p' : h > 12 ? `${h-12}p` : `${h}a`}
              </span>
            </div>
          ))}
        </div>

        {/* 3 day columns */}
        {dates.map(date => {
          const events = getEvents(date);
          const active = date === selectedDate;
          const today  = isToday(date);
          return (
            <div key={date} className="flex-1 relative border-l border-[#1E2940] pt-3"
              style={{ background: active ? 'rgba(56,189,248,0.02)' : 'transparent' }}>
              {/* Hour lines */}
              {HOURS.map(h => (
                <div key={h} className="absolute w-full border-t border-[#1E2940]"
                  style={{ top: (h - DAY_S) * HR_H }} />
              ))}
              {/* Now line */}
              {today && showNow && (
                <div ref={nowRef} className="absolute w-full z-20 flex items-center pointer-events-none"
                  style={{ top: nowTop }}>
                  <div className="w-2 h-2 rounded-full bg-[#EF4444] flex-shrink-0 -ml-1"
                    style={{ boxShadow: '0 0 6px #EF444480' }} />
                  <div className="flex-1 border-t border-[#EF4444] opacity-70" />
                </div>
              )}
              {/* Events */}
              {events.map(e => <EventBlock key={e.id} e={e} pxPerHr={HR_H} />)}
              {/* Tap to select */}
              {!active && (
                <div className="absolute inset-0 z-30 cursor-pointer"
                  onClick={() => onSelect(date)} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default function SchedulePage() {
  const router = useRouter();
  const today  = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(today);
  const [weekDays,   setWeekDays]   = useState<WeekDay[]>([]);
  const [persona,    setPersona]    = useState<Persona | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [chatOpen,   setChatOpen]   = useState(false);
  const [messages,   setMessages]   = useState<ChatMsg[]>([]);
  const [input,      setInput]      = useState('');
  const [sending,    setSending]    = useState(false);
  const [rebuilding, setRebuilding] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLInputElement>(null);
  const weekDates  = getMondayWeek();

  // Which 3 dates to show — center on selectedDate
  const threeDates = [addDays(selectedDate, -1), selectedDate, addDays(selectedDate, 1)];

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/user');
        const d = await res.json();
        if (!d.onboarded) { router.replace('/onboarding'); return; }
        const [wRes, pRes] = await Promise.all([fetch('/api/schedule/week'), fetch('/api/persona')]);
        if (wRes.ok) { const { week } = await wRes.json(); setWeekDays(week || []); }
        if (pRes.ok) { const { persona: p } = await pRes.json(); if (p) setPersona(p); }
      } catch { /* */ }
      setLoading(false);
    })();
  }, [router]);

  useEffect(() => {
    if (chatOpen) setTimeout(() => {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      inputRef.current?.focus();
    }, 150);
  }, [chatOpen, messages]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || sending) return;
    const msg = text.trim(); setInput(''); setSending(true);
    setMessages(prev => [...prev, { role: 'user', text: msg }]);
    try {
      const res = await fetch('/api/schedule/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, date: selectedDate }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'drako', text: data.reply || 'Done!' }]);
      if (data.events?.length) {
        setWeekDays(prev => prev.map(d => d.date === selectedDate ? { ...d, events: data.events } : d));
      }
    } catch {
      setMessages(prev => [...prev, { role: 'drako', text: 'Hmm, something went wrong. Try again?' }]);
    }
    setSending(false);
  }, [sending, selectedDate]);

  const rebuildWeek = async () => {
    setRebuilding(true);
    try {
      await fetch('/api/schedule/rebuild?week=true', { method: 'POST' });
      const res = await fetch('/api/schedule/week');
      if (res.ok) { const { week } = await res.json(); setWeekDays(week || []); }
    } catch { /* */ }
    setRebuilding(false);
  };

  const quickActions = ['Add lunch 12:30pm', 'Move gym to 7am', 'Add 30min walk at 5pm', 'Clear evening'];

  if (loading) return (
    <div className="fixed inset-0 flex items-center justify-center"
      style={{ background: '#0F172A' }}>
      <DrakoRobot size="lg" state="thinking" />
    </div>
  );

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden"
      style={{ background: 'linear-gradient(180deg,#0D1525 0%,#0A0F1E 100%)' }}>

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex-shrink-0 px-3 pt-3 pb-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <DrakoRobot size="sm" state="idle" />
            <div className="min-w-0">
              <p className="text-white font-bold text-sm leading-tight truncate">
                {persona?.archetype || 'DRAKO'} {persona?.archetypeEmoji || '🤖'}
              </p>
              <p className="text-[#3F5068] text-[11px] leading-tight truncate">
                {persona?.tagline || 'AI Schedule Builder'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button onClick={rebuildWeek} disabled={rebuilding}
              className="text-[11px] px-2.5 py-1.5 rounded-full font-medium transition-all"
              style={{ background: 'rgba(30,41,59,0.8)', border: '1px solid #334155', color: rebuilding ? '#475569' : '#64748B' }}>
              {rebuilding ? '⟳' : '↺'} Rebuild
            </button>
            <button onClick={() => setChatOpen(true)}
              className="text-[11px] px-3 py-1.5 rounded-full font-bold flex items-center gap-1"
              style={{ background: 'linear-gradient(135deg,#38BDF8,#818CF8)', color: 'white' }}>
              💬 Chat
            </button>
          </div>
        </div>
      </div>

      {/* ── Week tab strip ──────────────────────────────────── */}
      <div className="flex-shrink-0 flex px-2 gap-0.5 overflow-x-auto scrollbar-hide py-1.5">
        {weekDates.map(date => {
          const evtCount = weekDays.find(d => d.date === date)?.events.length || 0;
          const active   = date === selectedDate;
          const tod      = isToday(date);
          return (
            <button key={date} onClick={() => setSelectedDate(date)}
              className="flex-shrink-0 flex flex-col items-center px-2.5 py-1.5 rounded-xl transition-all min-w-[40px]"
              style={{
                background: active ? 'rgba(56,189,248,0.15)' : 'transparent',
                border: `1px solid ${active ? '#38BDF870' : 'transparent'}`,
              }}>
              <span className="text-[10px] font-bold uppercase tracking-wide"
                style={{ color: active ? '#38BDF8' : tod ? '#94A3B8' : '#3F5068' }}>
                {dayLabel(date, 'narrow').charAt(0)}
              </span>
              <span className="text-sm font-bold leading-tight"
                style={{ color: active ? 'white' : tod ? '#94A3B8' : '#3F5068' }}>
                {dateNum(date)}
              </span>
              {evtCount > 0 && (
                <div className="mt-0.5 rounded-full w-4 h-1.5"
                  style={{ background: active ? '#38BDF8' : '#1E3A5F' }} />
              )}
            </button>
          );
        })}
      </div>

      {/* ── 3-day column headers ─────────────────────────────── */}
      <div className="flex-shrink-0 flex border-b border-[#1E2940]">
        <div className="w-11 flex-shrink-0" />
        {threeDates.map(date => {
          const active = date === selectedDate;
          const tod    = isToday(date);
          return (
            <div key={date} className="flex-1 text-center py-1.5 cursor-pointer"
              onClick={() => setSelectedDate(date)}
              style={{ borderLeft: '1px solid #1E2940' }}>
              <p className="text-[10px] uppercase tracking-wider font-semibold"
                style={{ color: active ? '#38BDF8' : '#3F5068' }}>
                {dayLabel(date, 'short')}
              </p>
              <p className="text-sm font-bold leading-none mt-0.5"
                style={{ color: active ? 'white' : tod ? '#94A3B8' : '#3F5068' }}>
                {dateNum(date)}
              </p>
              {tod && <div className="mx-auto mt-0.5 w-1.5 h-1.5 rounded-full bg-[#38BDF8]" />}
            </div>
          );
        })}
      </div>

      {/* ── 3-day timeline (scrolls within its container) ──── */}
      <ThreeDayGrid
        dates={threeDates}
        weekDays={weekDays}
        onSelect={setSelectedDate}
        selectedDate={selectedDate}
      />

      {/* ── Chat drawer ──────────────────────────────────────── */}
      {chatOpen && (
        <div className="absolute inset-0 z-50 flex flex-col justify-end"
          style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}
          onClick={e => { if (e.target === e.currentTarget) setChatOpen(false); }}>
          <div className="flex flex-col rounded-t-2xl overflow-hidden"
            style={{ background: '#0D1525', border: '1px solid #1E293B', maxHeight: '72vh' }}>

            {/* drawer handle + header */}
            <div className="flex-shrink-0 flex justify-center pt-2 pb-1">
              <div className="w-10 h-1 rounded-full bg-[#334155]" />
            </div>
            <div className="flex-shrink-0 flex items-center justify-between px-4 pb-3">
              <div className="flex items-center gap-2">
                <DrakoRobot size="sm" state={sending ? 'thinking' : 'idle'} />
                <div>
                  <p className="text-white font-bold text-sm">Chat with DRAKO</p>
                  <p className="text-[#3F5068] text-[11px]">Plain English — I'll update your schedule</p>
                </div>
              </div>
              <button onClick={() => setChatOpen(false)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-[#475569] hover:text-white"
                style={{ background: '#1E293B' }}>
                ✕
              </button>
            </div>

            {/* messages */}
            <div className="flex-1 overflow-y-auto px-4 pb-2 space-y-2 min-h-[80px]">
              {messages.length === 0 && (
                <div className="py-2">
                  <p className="text-[#475569] text-xs text-center mb-3">Try saying:</p>
                  <div className="flex flex-wrap gap-2 justify-center">
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
                <div key={i} className={`flex gap-2 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {m.role === 'drako' && <span className="text-base mt-0.5 flex-shrink-0">🤖</span>}
                  <div className="max-w-[82%] px-3 py-2 rounded-2xl text-sm leading-snug"
                    style={{
                      background: m.role === 'user' ? 'rgba(56,189,248,0.12)' : '#1E293B',
                      border: `1px solid ${m.role === 'user' ? '#38BDF830' : '#334155'}`,
                      color: '#CBD5E1',
                    }}>
                    {m.text}
                  </div>
                </div>
              ))}
              {sending && (
                <div className="flex gap-2">
                  <span className="text-base">🤖</span>
                  <div className="px-3 py-2 rounded-2xl bg-[#1E293B] border border-[#334155]">
                    <span className="text-[#38BDF8] text-sm animate-pulse">thinking…</span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* input */}
            <form onSubmit={e => { e.preventDefault(); sendMessage(input); }}
              className="flex-shrink-0 px-3 py-3 border-t border-[#1E293B] flex gap-2">
              <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
                disabled={sending}
                placeholder={`e.g. add gym at 6am ${dayLabel(selectedDate, 'short')}…`}
                className="flex-1 px-3 py-2.5 rounded-xl text-sm outline-none min-w-0"
                style={{ background: '#1E293B', border: '1.5px solid #334155', color: 'white' }} />
              <button type="submit" disabled={!input.trim() || sending}
                className="flex-shrink-0 px-4 py-2.5 rounded-xl font-bold text-sm disabled:opacity-40"
                style={{ background: 'linear-gradient(135deg,#38BDF8,#818CF8)', color: 'white' }}>
                →
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Floating chat FAB ─────────────────────────────── */}
      {!chatOpen && (
        <button onClick={() => setChatOpen(true)}
          className="absolute bottom-5 right-4 z-40 w-12 h-12 rounded-full flex items-center justify-center text-xl shadow-2xl"
          style={{ background: 'linear-gradient(135deg,#38BDF8,#818CF8)', boxShadow: '0 4px 24px rgba(56,189,248,0.4)' }}>
          💬
        </button>
      )}
    </div>
  );
}
