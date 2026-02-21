'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { DrakoRobot } from '@/components/DrakoRobot';

const CATALOG: Record<string, { emoji: string; label: string; color: string }> = {
  work:         { emoji: '💼', label: 'Work',           color: '#3B82F6' },
  school:       { emoji: '🎓', label: 'School/Classes', color: '#6366F1' },
  commute:      { emoji: '🚌', label: 'Commute',        color: '#64748B' },
  gym:          { emoji: '🏋️', label: 'Gym',            color: '#EF4444' },
  running:      { emoji: '🏃', label: 'Running/Walk',   color: '#F97316' },
  meditation:   { emoji: '🧘', label: 'Meditation',     color: '#8B5CF6' },
  cooking:      { emoji: '🍳', label: 'Cooking',        color: '#F59E0B' },
  errands:      { emoji: '🛒', label: 'Errands',        color: '#94A3B8' },
  deep_work:    { emoji: '🧠', label: 'Deep Focus',     color: '#14B8A6' },
  learning:     { emoji: '📖', label: 'Learning',       color: '#10B981' },
  creative:     { emoji: '🎨', label: 'Creative',       color: '#EC4899' },
  side_project: { emoji: '🚀', label: 'Side Project',   color: '#8B5CF6' },
  reading:      { emoji: '📚', label: 'Reading',        color: '#22D3EE' },
  social:       { emoji: '👥', label: 'Friends/Social', color: '#A855F7' },
  family:       { emoji: '🏠', label: 'Family Time',    color: '#84CC16' },
  gaming:       { emoji: '🎮', label: 'Gaming/Fun',     color: '#F97316' },
  shows:        { emoji: '📺', label: 'Shows/Movies',   color: '#38BDF8' },
};

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
type Day = typeof DAYS[number];

const DEFAULT_DAYS: Record<string, Day[]> = {
  work: ['Mon','Tue','Wed','Thu','Fri'], school: ['Mon','Tue','Wed','Thu','Fri'],
  commute: ['Mon','Tue','Wed','Thu','Fri'], gym: ['Mon','Wed','Fri'],
  running: ['Mon','Wed','Fri','Sat'], meditation: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],
  cooking: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'], errands: ['Sat','Sun'],
  deep_work: ['Mon','Tue','Wed','Thu','Fri'], learning: ['Mon','Tue','Wed','Thu','Fri','Sat'],
  creative: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'], side_project: ['Mon','Tue','Wed','Thu','Sat'],
  reading: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'], social: ['Thu','Fri','Sat','Sun'],
  family: ['Sat','Sun'], gaming: ['Fri','Sat','Sun'], shows: ['Fri','Sat','Sun'],
};

function smartDefault(id: string, userType: string, wakeHour: number, hasWork: boolean, hasSchool: boolean) {
  const anchor = hasSchool ? 8*60 : 9*60;
  const early = wakeHour <= 6, ath = userType === 'athlete';
  switch (id) {
    case 'work':        return { startMinutes:9*60,  durationMinutes:480 };
    case 'school':      return { startMinutes:8*60,  durationMinutes:420 };
    case 'commute':     return { startMinutes:anchor-45, durationMinutes:45 };
    case 'gym':         return (early||ath)?{startMinutes:(wakeHour+1)*60,durationMinutes:60}:{startMinutes:18*60,durationMinutes:60};
    case 'running':     return early?{startMinutes:wakeHour*60+30,durationMinutes:30}:{startMinutes:7*60,durationMinutes:30};
    case 'meditation':  return { startMinutes:wakeHour*60, durationMinutes:20 };
    case 'cooking':     return { startMinutes:18*60+30, durationMinutes:60 };
    case 'errands':     return { startMinutes:17*60+30, durationMinutes:60 };
    case 'deep_work':   return { startMinutes:(wakeHour+1)*60, durationMinutes:120 };
    case 'learning':    return { startMinutes:20*60, durationMinutes:60 };
    case 'creative':    return early?{startMinutes:(wakeHour+1)*60,durationMinutes:90}:{startMinutes:10*60,durationMinutes:90};
    case 'side_project':return { startMinutes:20*60, durationMinutes:90 };
    case 'reading':     return { startMinutes:21*60, durationMinutes:30 };
    case 'social':      return { startMinutes:19*60, durationMinutes:120 };
    case 'family':      return { startMinutes:18*60, durationMinutes:120 };
    case 'gaming':      return { startMinutes:20*60, durationMinutes:90 };
    case 'shows':       return { startMinutes:20*60+30, durationMinutes:90 };
    default:            return { startMinutes:19*60, durationMinutes:60 };
  }
}

const TL_START = 6*60, TL_END = 24*60;
function toDisplay(m: number) { const h = Math.floor(m/60)%24, mn = m%60, p = h >= 12 ? 'PM' : 'AM'; return `${h%12||12}:${String(mn).padStart(2,'0')} ${p}`; }
function toHHMM(m: number) { return `${String(Math.floor(m/60)%24).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`; }
function parseWakeHour(r: string) { const m = r.match(/^(\d+)/); return m ? parseInt(m[1]) : 7; }
function fmtDur(m: number) { if (m < 60) return `${m}m`; const h = Math.floor(m/60), r = m%60; return r > 0 ? `${h}h ${r}m` : `${h}h`; }

interface Slot { id: string; emoji: string; label: string; color: string; startMinutes: number; durationMinutes: number; days: Day[] }

const STEP = 30;
const HOLD_DURATION = 1800; // 1.8 seconds
const DEFAULT_ACTIVITIES = ['work','gym','deep_work','social'];

// --- Hold-to-confirm button ---
function HoldButton({ onConfirm, label, color }: { onConfirm: () => void; label: string; color: string }) {
  const [progress, setProgress] = useState(0);
  const [holding, setHolding] = useState(false);
  const startRef = useRef(0);
  const rafRef = useRef(0);
  const doneRef = useRef(false);

  const tick = useCallback(() => {
    const elapsed = Date.now() - startRef.current;
    const pct = Math.min(elapsed / HOLD_DURATION, 1);
    setProgress(pct);
    if (pct >= 1 && !doneRef.current) {
      doneRef.current = true;
      setHolding(false);
      onConfirm();
      return;
    }
    if (pct < 1) rafRef.current = requestAnimationFrame(tick);
  }, [onConfirm]);

  const start = useCallback(() => {
    doneRef.current = false;
    startRef.current = Date.now();
    setHolding(true);
    setProgress(0);
    rafRef.current = requestAnimationFrame(tick);
  }, [tick]);

  const cancel = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    setHolding(false);
    setProgress(0);
  }, []);

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  const circum = 2 * Math.PI * 22;

  return (
    <button
      onPointerDown={start}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onPointerCancel={cancel}
      className="relative w-full py-4 rounded-2xl font-bold text-lg text-white transition-all select-none touch-manipulation"
      style={{
        background: holding
          ? `linear-gradient(135deg, ${color}, ${color}CC)`
          : 'rgba(30,41,59,0.9)',
        border: `2px solid ${holding ? color : '#334155'}`,
        boxShadow: holding ? `0 0 30px ${color}50` : 'none',
      }}
    >
      <div className="flex items-center justify-center gap-3">
        {/* Progress ring */}
        <svg width="28" height="28" className="shrink-0 -rotate-90">
          <circle cx="14" cy="14" r="11" fill="none" stroke="#334155" strokeWidth="2.5" />
          <circle cx="14" cy="14" r="11" fill="none" stroke={color} strokeWidth="2.5"
            strokeDasharray={`${circum}`}
            strokeDashoffset={`${circum * (1 - progress)}`}
            strokeLinecap="round"
            style={{ transition: holding ? 'none' : 'stroke-dashoffset 0.2s' }}
          />
          {progress >= 1 && <text x="14" y="14" textAnchor="middle" dominantBaseline="central" fill="white" fontSize="14" className="rotate-90 origin-center">✓</text>}
        </svg>
        <span>{holding ? 'Keep holding...' : label}</span>
      </div>
    </button>
  );
}

// --- Weekly calendar grid for the summary ---
function WeeklyCalendar({ slots }: { slots: Slot[] }) {
  const hours = [6, 8, 10, 12, 14, 16, 18, 20, 22];
  const dayLetters = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="grid gap-0" style={{ gridTemplateColumns: '32px repeat(7, 1fr)' }}>
        {/* Header */}
        <div />
        {dayLetters.map((d, i) => (
          <div key={i} className="text-center text-xs font-bold text-[#64748B] pb-2">{d}</div>
        ))}

        {/* Time rows */}
        {hours.map(hour => (
          <div key={hour} className="contents">
            <div className="text-[10px] text-[#475569] text-right pr-2 leading-[40px]">
              {hour % 12 || 12}{hour >= 12 ? 'p' : 'a'}
            </div>
            {DAYS.map((day, di) => {
              const blocksHere = slots.filter(s =>
                s.days.includes(day) &&
                s.startMinutes < (hour + 2) * 60 &&
                s.startMinutes + s.durationMinutes > hour * 60
              );
              return (
                <div key={di} className="relative h-10 border-t border-[#1E293B]">
                  {blocksHere.map(b => {
                    const cellStart = hour * 60;
                    const cellEnd = (hour + 2) * 60;
                    const blockStart = Math.max(b.startMinutes, cellStart);
                    const blockEnd = Math.min(b.startMinutes + b.durationMinutes, cellEnd);
                    const topPct = ((blockStart - cellStart) / (cellEnd - cellStart)) * 100;
                    const heightPct = ((blockEnd - blockStart) / (cellEnd - cellStart)) * 100;
                    return (
                      <div key={b.id} className="absolute inset-x-0.5 rounded-sm overflow-hidden"
                        style={{ top: `${topPct}%`, height: `${Math.max(heightPct, 20)}%`, background: `${b.color}40`, borderLeft: `2px solid ${b.color}` }}
                        title={`${b.emoji} ${b.label}\n${toDisplay(b.startMinutes)} – ${toDisplay(b.startMinutes + b.durationMinutes)}`}
                      >
                        <span className="text-[8px] px-0.5 truncate block" style={{ color: b.color }}>{b.emoji}</span>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2 mt-4 justify-center">
        {slots.map(s => (
          <div key={s.id} className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium"
            style={{ background: `${s.color}15`, color: s.color, border: `1px solid ${s.color}30` }}>
            {s.emoji} {s.label}
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Chat input to modify schedule ---
interface ChatMsg { role: 'user' | 'assistant'; text: string }

function ScheduleChat({ slots, onSlotsChange }: { slots: Slot[]; onSlotsChange: (slots: Slot[]) => void }) {
  const [messages, setMessages] = useState<ChatMsg[]>([
    { role: 'assistant', text: "Tell me what to change. Try: \"move gym to 7am\", \"make work shorter\", or \"add reading on weekends\"" }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const send = useCallback(async () => {
    const msg = input.trim();
    if (!msg || loading) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: msg }]);
    setLoading(true);

    try {
      const resp = await fetch('/api/schedule/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: msg,
          slots: slots.map(s => ({ id: s.id, label: s.label, emoji: s.emoji, startMinutes: s.startMinutes, durationMinutes: s.durationMinutes, days: s.days })),
        }),
      });
      const data = await resp.json();
      setMessages(prev => [...prev, { role: 'assistant', text: data.reply || 'Done!' }]);

      if (data.slots) {
        onSlotsChange(slots.map(s => {
          const updated = data.slots.find((u: { id: string }) => u.id === s.id);
          if (!updated) return s;
          return { ...s, startMinutes: updated.startMinutes, durationMinutes: updated.durationMinutes, days: updated.days as Day[] };
        }));
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', text: "Something went wrong. Try again?" }]);
    }
    setLoading(false);
  }, [input, loading, slots, onSlotsChange]);

  return (
    <div className="w-full max-w-md mx-auto mt-6 rounded-2xl overflow-hidden" style={{ background: 'rgba(15,23,42,0.9)', border: '1px solid #1E293B' }}>
      {/* Chat messages */}
      <div ref={scrollRef} className="max-h-48 overflow-y-auto p-4 space-y-3">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className="max-w-[85%] px-3 py-2 rounded-2xl text-sm"
              style={{
                background: m.role === 'user' ? 'linear-gradient(135deg,#38BDF8,#818CF8)' : 'rgba(30,41,59,0.8)',
                color: 'white',
                borderBottomRightRadius: m.role === 'user' ? 4 : 16,
                borderBottomLeftRadius: m.role === 'assistant' ? 4 : 16,
              }}>
              {m.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="px-4 py-2 rounded-2xl text-sm" style={{ background: 'rgba(30,41,59,0.8)', color: '#64748B' }}>
              <span className="animate-pulse">Thinking...</span>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="flex gap-2 p-3 border-t border-[#1E293B]">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder="e.g. move gym to 7am..."
          className="flex-1 px-4 py-3 rounded-xl bg-[#0F172A] text-white text-sm border border-[#334155] focus:border-[#38BDF8] focus:outline-none transition-colors"
        />
        <button onClick={send} disabled={loading || !input.trim()}
          className="px-4 py-3 rounded-xl font-bold text-sm text-white disabled:opacity-30 transition-all"
          style={{ background: 'linear-gradient(135deg,#38BDF8,#818CF8)' }}>
          Send
        </button>
      </div>
    </div>
  );
}

// ===== Main page =====
export default function PlayPage() {
  const router = useRouter();
  const [slots, setSlots] = useState<Slot[]>([]);
  const [cardIdx, setCardIdx] = useState(0);
  const [saving, setSaving] = useState(false);
  const [userName, setUserName] = useState('');

  useEffect(() => {
    fetch('/api/user').then(r => r.json()).then(d => {
      if (!d.onboarded) { router.replace('/onboarding'); return; }
      const raw = typeof window !== 'undefined' ? sessionStorage.getItem('drako_user') : null;
      const user = raw ? JSON.parse(raw) : d.user;
      setUserName(user?.name || '');
      const activities: string[] = user?.selectedActivities?.length > 0 ? user.selectedActivities : DEFAULT_ACTIVITIES;
      const wakeHour = parseWakeHour(user?.rhythm || '7am');
      const userType = user?.type || 'professional';
      const hasWork = activities.includes('work'), hasSchool = activities.includes('school');
      setSlots(activities.map(id => {
        const meta = CATALOG[id] || { emoji: '📌', label: id, color: '#64748B' };
        const { startMinutes, durationMinutes } = smartDefault(id, userType, wakeHour, hasWork, hasSchool);
        const days: Day[] = [...(DEFAULT_DAYS[id] || ['Mon','Tue','Wed','Thu','Fri'])];
        return { id, ...meta, startMinutes, durationMinutes, days };
      }));
    }).catch(() => router.replace('/onboarding'));
  }, [router]);

  const current = slots[cardIdx];
  const done = cardIdx >= slots.length;

  const shiftStart = useCallback((delta: number) => {
    setSlots(prev => prev.map((s, i) => {
      if (i !== cardIdx) return s;
      const next = Math.max(TL_START, Math.min(TL_END - s.durationMinutes, s.startMinutes + delta));
      return { ...s, startMinutes: next };
    }));
  }, [cardIdx]);

  const shiftDuration = useCallback((delta: number) => {
    setSlots(prev => prev.map((s, i) => {
      if (i !== cardIdx) return s;
      const next = Math.max(15, Math.min(480, s.durationMinutes + delta));
      return { ...s, durationMinutes: next };
    }));
  }, [cardIdx]);

  const toggleDay = useCallback((day: Day) => {
    setSlots(prev => prev.map((s, i) => {
      if (i !== cardIdx) return s;
      const days = s.days.includes(day) ? s.days.filter(d => d !== day) : [...s.days, day];
      return { ...s, days };
    }));
  }, [cardIdx]);

  const confirm = useCallback(() => {
    setCardIdx(i => i + 1);
  }, []);

  const handleFinish = useCallback(async () => {
    setSaving(true);
    try {
      const timeSlots: Record<string, { start: string; end: string; label: string; emoji: string; days: string[] }> = {};
      slots.forEach(s => { timeSlots[s.id] = { start: toHHMM(s.startMinutes), end: toHHMM(s.startMinutes + s.durationMinutes), label: s.label, emoji: s.emoji, days: s.days }; });
      await fetch('/api/user', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ timeSlots }) });
      await fetch('/api/schedule/rebuild?week=true', { method: 'POST' });
      if (typeof window !== 'undefined') {
        const raw = sessionStorage.getItem('drako_user');
        if (raw) sessionStorage.setItem('drako_user', JSON.stringify({ ...JSON.parse(raw), timeSlots }));
      }
    } catch (e) { console.error(e); }
    router.push('/schedule');
  }, [slots, router]);

  // Loading
  if (slots.length === 0) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#0F172A 0%,#1E1B4B 50%,#0F172A 100%)' }}>
      <DrakoRobot size="xl" state="thinking" />
    </div>
  );

  // ===== DONE — Calendar + Chat =====
  if (done) return (
    <div className="min-h-screen flex flex-col items-center px-4 py-8 overflow-y-auto" style={{ background: 'linear-gradient(135deg,#0F172A 0%,#1E1B4B 50%,#0F172A 100%)' }}>
      <DrakoRobot size="lg" state="greeting" className="mb-4" />

      <h2 className="text-2xl font-bold mb-1 bg-gradient-to-r from-[#10B981] to-[#38BDF8] bg-clip-text text-transparent">
        {userName ? `${userName}'s Week` : 'Your Week'} 🗓️
      </h2>
      <p className="text-[#64748B] text-sm mb-6">{slots.length} blocks placed — tap a change below or chat to adjust</p>

      {/* Weekly calendar */}
      <WeeklyCalendar slots={slots} />

      {/* Slot list with inline times */}
      <div className="w-full max-w-md mx-auto mt-4 space-y-1.5">
        {slots.map(s => (
          <div key={s.id} className="flex items-center justify-between px-4 py-2.5 rounded-xl" style={{ background: `${s.color}10`, border: `1px solid ${s.color}20` }}>
            <span className="text-sm font-medium" style={{ color: s.color }}>{s.emoji} {s.label}</span>
            <div className="text-right">
              <div className="text-xs" style={{ color: `${s.color}CC` }}>{toDisplay(s.startMinutes)} – {toDisplay(s.startMinutes + s.durationMinutes)}</div>
              <div className="text-[10px] text-[#475569]">{s.days.join(', ')}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Chat to modify */}
      <ScheduleChat slots={slots} onSlotsChange={setSlots} />

      {/* Build button */}
      <button onClick={handleFinish} disabled={saving}
        className="w-full max-w-md mt-6 px-8 py-5 rounded-2xl font-bold text-lg text-white transition-all hover:scale-[1.02] disabled:opacity-50"
        style={{ background: 'linear-gradient(135deg,#38BDF8,#818CF8)', boxShadow: '0 0 40px rgba(56,189,248,0.3)' }}>
        {saving ? 'Building schedule...' : 'Build My Schedule →'}
      </button>
    </div>
  );

  // ===== ACTIVE CARD =====
  return (
    <div className="min-h-screen flex flex-col px-4 py-6" style={{ background: 'linear-gradient(135deg,#0F172A 0%,#1E1B4B 50%,#0F172A 100%)' }}>

      {/* Progress header */}
      <div className="w-full max-w-sm mx-auto mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-[#94A3B8] text-sm font-medium">{cardIdx + 1} / {slots.length}</span>
          <span className="text-[#38BDF8] text-sm">{slots.length - cardIdx - 1 > 0 ? `${slots.length - cardIdx - 1} left` : 'last one!'}</span>
        </div>
        <div className="w-full h-1.5 rounded-full bg-[#1E293B]">
          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${((cardIdx + 1) / slots.length) * 100}%`, background: 'linear-gradient(90deg,#38BDF8,#818CF8)' }} />
        </div>
      </div>

      {/* Card */}
      <div className="flex-1 flex items-center justify-center">
        {current && (
          <div className="w-full max-w-sm rounded-3xl p-6" style={{ background: 'rgba(15,23,42,0.95)', border: `2px solid ${current.color}40`, boxShadow: `0 0 40px ${current.color}10, 0 16px 48px rgba(0,0,0,0.4)` }}>

            <div className="text-center mb-5">
              <span className="text-5xl block mb-2" style={{ filter: `drop-shadow(0 0 16px ${current.color}50)` }}>{current.emoji}</span>
              <h2 className="text-xl font-bold text-white">{current.label}</h2>
            </div>

            {/* Start time */}
            <div className="mb-4">
              <p className="text-xs text-[#475569] uppercase tracking-wider mb-2 text-center">Start Time</p>
              <div className="flex items-center justify-center gap-3">
                <button onClick={() => shiftStart(-STEP)} className="w-11 h-11 rounded-xl flex items-center justify-center text-xl font-bold text-white" style={{ background: 'rgba(30,41,59,0.8)', border: '1px solid #334155' }}>←</button>
                <div className="px-5 py-2.5 rounded-xl min-w-[140px] text-center" style={{ background: `${current.color}15`, border: `1px solid ${current.color}30` }}>
                  <span className="text-lg font-bold" style={{ color: current.color }}>{toDisplay(current.startMinutes)}</span>
                </div>
                <button onClick={() => shiftStart(STEP)} className="w-11 h-11 rounded-xl flex items-center justify-center text-xl font-bold text-white" style={{ background: 'rgba(30,41,59,0.8)', border: '1px solid #334155' }}>→</button>
              </div>
            </div>

            {/* Duration */}
            <div className="mb-4">
              <p className="text-xs text-[#475569] uppercase tracking-wider mb-2 text-center">Duration</p>
              <div className="flex items-center justify-center gap-3">
                <button onClick={() => shiftDuration(-STEP)} className="w-11 h-11 rounded-xl flex items-center justify-center text-xl font-bold text-white" style={{ background: 'rgba(30,41,59,0.8)', border: '1px solid #334155' }}>−</button>
                <div className="px-5 py-2.5 rounded-xl min-w-[140px] text-center" style={{ background: `${current.color}15`, border: `1px solid ${current.color}30` }}>
                  <span className="text-lg font-bold" style={{ color: current.color }}>{fmtDur(current.durationMinutes)}</span>
                </div>
                <button onClick={() => shiftDuration(STEP)} className="w-11 h-11 rounded-xl flex items-center justify-center text-xl font-bold text-white" style={{ background: 'rgba(30,41,59,0.8)', border: '1px solid #334155' }}>+</button>
              </div>
            </div>

            <p className="text-center text-sm text-[#64748B] mb-4">
              Ends at <span className="font-bold" style={{ color: current.color }}>{toDisplay(current.startMinutes + current.durationMinutes)}</span>
            </p>

            {/* Day selector */}
            <div className="mb-5">
              <p className="text-xs text-[#475569] uppercase tracking-wider mb-2 text-center">Which days?</p>
              <div className="flex justify-between gap-1.5">
                {DAYS.map(day => {
                  const on = current.days.includes(day);
                  return (
                    <button key={day}
                      onPointerUp={(e) => { e.preventDefault(); e.stopPropagation(); toggleDay(day); }}
                      className="flex-1 py-2.5 rounded-lg text-xs font-bold transition-colors select-none touch-manipulation"
                      style={{
                        background: on ? current.color : 'rgba(30,41,59,0.8)',
                        color: on ? '#FFFFFF' : '#475569',
                        border: `1.5px solid ${on ? current.color : '#334155'}`,
                        boxShadow: on ? `0 0 12px ${current.color}50` : 'none',
                      }}>
                      {day.charAt(0)}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Hold to confirm */}
            <HoldButton
              onConfirm={confirm}
              label={cardIdx + 1 < slots.length ? `Hold to Lock In ${current.label}` : `Hold to Finish — ${current.label}`}
              color={current.color}
            />
            <p className="text-center text-[10px] text-[#475569] mt-2">Press and hold for ~2 seconds</p>
          </div>
        )}
      </div>
    </div>
  );
}
