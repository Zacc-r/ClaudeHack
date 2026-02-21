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
function getMonthLabel(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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
  const [chatOpen, setChatOpen] = useState(false);
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
    if (chatOpen) {
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [chatOpen, messages]);

  // Scroll to now on load
  useEffect(() => {
    if (!isLoading && scrollRef.current) {
      const now = new Date();
      const nowMins = now.getHours() * 60 + now.getMinutes();
      const offset = ((nowMins - DAY_START * 60) / 60) * HOUR_H;
      if (offset > 0) scrollRef.current.scrollTop = Math.max(0, offset - 120);
    }
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

  const quickActions = ["Move lunch to 1pm", "Add a 30min walk at 5pm", "Make my workout shorter", "Clear afternoon meetings"];

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#0F172A 0%,#1E1B4B 50%,#0F172A 100%)' }}>
      <DrakoRobot size="xl" state="thinking" />
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col overflow-hidden" style={{ background: 'linear-gradient(135deg,#0F172A 0%,#1E1B4B 50%,#0F172A 100%)' }}>

      {/* ─── Header ─── */}
      <div className="flex-shrink-0 px-4 pt-4 pb-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <DrakoRobot size="sm" state="idle" />
            <div>
              <h1 className="text-lg font-bold text-white leading-none">{persona?.archetype || 'DRAKO Schedule'}</h1>
              <p className="text-[#475569] text-xs mt-0.5">{persona?.tagline || 'Your AI scheduling assistant'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid #334155' }}>
              <button onClick={() => setViewMode('3day')}
                className="px-3 py-1.5 text-xs font-bold transition-all"
                style={{ background: viewMode === '3day' ? '#38BDF820' : 'transparent', color: viewMode === '3day' ? '#38BDF8' : '#475569' }}>
                3 Day
              </button>
              <button onClick={() => setViewMode('week')}
                className="px-3 py-1.5 text-xs font-bold transition-all"
                style={{ background: viewMode === 'week' ? '#38BDF820' : 'transparent', color: viewMode === 'week' ? '#38BDF8' : '#475569' }}>
                Week
              </button>
            </div>
            <button onClick={() => setChatOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full font-semibold text-xs transition-all hover:scale-105"
              style={{ background: 'linear-gradient(135deg,#38BDF8,#818CF8)', color: 'white' }}>
              💬 Chat
            </button>
          </div>
        </div>

        {/* ─── Day headers ─── */}
        <div className="flex items-center gap-1">
          {viewMode === '3day' && (
            <button onClick={() => setStartIdx(i => Math.max(0, i - 1))} disabled={!canPrev}
              className="w-7 h-7 flex-shrink-0 rounded-lg flex items-center justify-center text-xs font-bold disabled:opacity-20 transition-all"
              style={{ background: 'rgba(30,41,59,0.8)', color: '#94A3B8', border: '1px solid #334155' }}>‹</button>
          )}
          <div className="flex-1 grid gap-1" style={{ gridTemplateColumns: `repeat(${visibleDates.length}, 1fr)` }}>
            {visibleDates.map(date => {
              const day = weekDays.find(d => d.date === date);
              const evtCount = day?.events.length || 0;
              const today = isToday(date);
              return (
                <div key={date} className="flex flex-col items-center py-2 rounded-xl transition-all"
                  style={{
                    background: today ? 'linear-gradient(135deg,#38BDF815,#818CF810)' : 'rgba(30,41,59,0.4)',
                    border: today ? '1.5px solid #38BDF840' : '1.5px solid transparent',
                  }}>
                  <span className="text-[10px] font-bold uppercase" style={{ color: today ? '#38BDF8' : '#475569' }}>
                    {getDayLabel(date, 'short')}
                  </span>
                  <span className="text-base font-bold mt-0.5" style={{ color: today ? 'white' : '#94A3B8' }}>
                    {getDateNum(date)}
                  </span>
                  {evtCount > 0 && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full mt-0.5"
                      style={{ background: today ? '#38BDF820' : '#1E293B', color: today ? '#38BDF8' : '#475569' }}>
                      {evtCount}
                    </span>
                  )}
                  {today && <div className="mt-0.5 w-1 h-1 rounded-full bg-[#38BDF8]" />}
                </div>
              );
            })}
          </div>
          {viewMode === '3day' && (
            <button onClick={() => setStartIdx(i => Math.min(4, i + 1))} disabled={!canNext}
              className="w-7 h-7 flex-shrink-0 rounded-lg flex items-center justify-center text-xs font-bold disabled:opacity-20 transition-all"
              style={{ background: 'rgba(30,41,59,0.8)', color: '#94A3B8', border: '1px solid #334155' }}>›</button>
          )}
        </div>
      </div>

      {/* ─── Multi-day timeline ─── */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto overflow-x-hidden pb-24">
        <div className="flex" style={{ minHeight: TOTAL_H + 32 }}>
          {/* Hour gutter */}
          <div className="flex-shrink-0 w-12 relative">
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
                  {/* Hour gridlines */}
                  {HOURS.map(h => (
                    <div key={h} className="absolute w-full border-t" style={{ top: (h - DAY_START) * HOUR_H, borderColor: '#1E293B60' }} />
                  ))}

                  {/* Today column highlight */}
                  {today && <div className="absolute inset-0" style={{ background: 'rgba(56,189,248,0.03)' }} />}

                  {/* Now line */}
                  {showNow && (
                    <div className="absolute w-full z-20 flex items-center" style={{ top: nowOffset }}>
                      <div className="w-2 h-2 rounded-full bg-[#EF4444] flex-shrink-0 -ml-1" style={{ boxShadow: '0 0 8px #EF444460' }} />
                      <div className="flex-1 border-t-2 border-[#EF4444] opacity-70" />
                    </div>
                  )}

                  {/* Events */}
                  {events.map(e => {
                    const startM = toMins(e.start);
                    const endM = e.end ? toMins(e.end) : startM + 60;
                    const top = ((startM - DAY_START * 60) / 60) * HOUR_H;
                    const height = Math.max(((endM - startM) / 60) * HOUR_H, 24);
                    const color = e.color || '#38BDF8';
                    const compact = visibleDates.length > 3;
                    return (
                      <div key={e.id} className="absolute left-0.5 right-0.5 rounded-lg overflow-hidden z-10 group"
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

                  {/* Empty day indicator */}
                  {events.length === 0 && (
                    <div className="absolute inset-x-1 top-1/3 text-center">
                      <span className="text-2xl opacity-30">😴</span>
                      <p className="text-[9px] text-[#475569] mt-1">No events</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ─── Chat drawer ─── */}
      {chatOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          onClick={e => { if (e.target === e.currentTarget) setChatOpen(false); }}>
          <div className="rounded-t-3xl flex flex-col overflow-hidden"
            style={{ background: '#0F172A', border: '1.5px solid #1E293B', maxHeight: '75vh' }}>

            <div className="flex items-center justify-between px-5 py-4 border-b border-[#1E293B]">
              <div className="flex items-center gap-3">
                <DrakoRobot size="sm" state={sending ? 'thinking' : 'idle'} />
                <div>
                  <p className="font-bold text-white text-sm">Chat with DRAKO</p>
                  <p className="text-xs text-[#475569]">Edit your schedule in plain English</p>
                </div>
              </div>
              <button onClick={() => setChatOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-[#64748B] hover:text-white hover:bg-[#1E293B]">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-[100px]">
              {messages.length === 0 && (
                <div className="text-center py-3">
                  <p className="text-[#475569] text-sm mb-3">What do you want to change?</p>
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
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {m.role === 'drako' && <span className="mr-2 mt-1 text-sm flex-shrink-0">🤖</span>}
                  <div className="max-w-[80%] px-3 py-2 rounded-2xl text-sm"
                    style={{
                      background: m.role === 'user' ? 'linear-gradient(135deg,#38BDF820,#818CF820)' : 'rgba(30,41,59,0.9)',
                      border: `1px solid ${m.role === 'user' ? '#38BDF840' : '#334155'}`,
                      color: m.role === 'user' ? '#E2E8F0' : '#CBD5E1',
                    }}>
                    {m.text}
                  </div>
                </div>
              ))}
              {sending && (
                <div className="flex justify-start">
                  <span className="mr-2 mt-1 text-sm">🤖</span>
                  <div className="px-3 py-2 rounded-2xl bg-[#1E293B] border border-[#334155]">
                    <span className="text-[#38BDF8] animate-pulse text-sm">thinking...</span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <form onSubmit={handleSubmit} className="px-4 py-3 border-t border-[#1E293B] flex gap-2">
              <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
                placeholder="e.g. move gym to 7am..."
                disabled={sending}
                className="flex-1 px-4 py-3 rounded-2xl text-sm outline-none"
                style={{ background: 'rgba(30,41,59,0.8)', border: '1.5px solid #334155', color: 'white' }} />
              <button type="submit" disabled={!input.trim() || sending}
                className="px-5 py-3 rounded-2xl font-bold text-sm transition-all hover:scale-105 disabled:opacity-40"
                style={{ background: 'linear-gradient(135deg,#38BDF8,#818CF8)', color: 'white' }}>
                Send
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Floating chat button */}
      {!chatOpen && (
        <div className="fixed bottom-6 left-4 z-40">
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
