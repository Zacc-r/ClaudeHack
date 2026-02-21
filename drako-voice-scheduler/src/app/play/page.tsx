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

const TL_START = 6*60, TL_END = 24*60, TL_SPAN = TL_END - TL_START;
function toDisplay(m: number) { const h = Math.floor(m/60)%24, mn = m%60, p = h >= 12 ? 'PM' : 'AM'; return `${h%12||12}:${String(mn).padStart(2,'0')} ${p}`; }
function toHHMM(m: number) { return `${String(Math.floor(m/60)%24).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`; }
function parseWakeHour(r: string) { const m = r.match(/^(\d+)/); return m ? parseInt(m[1]) : 7; }
function fmtDur(m: number) { if (m < 60) return `${m}m`; const h = Math.floor(m/60), r = m%60; return r > 0 ? `${h}h ${r}m` : `${h}h`; }

interface Slot { id: string; emoji: string; label: string; color: string; startMinutes: number; durationMinutes: number; days: Day[] }

const STEP = 30;
const HOLD_DURATION = 1800;
const DRAG_THRESHOLD = 14;
const PX_PER_STEP = 50;
const DEFAULT_ACTIVITIES = ['work','gym','deep_work','social'];

function TimeBar({ slot }: { slot: Slot }) {
  const lp = Math.max(0, (slot.startMinutes - TL_START) / TL_SPAN) * 100;
  const wp = Math.min(slot.durationMinutes / TL_SPAN * 100, 100 - lp);
  return (
    <div className="w-full mt-2">
      <div className="flex justify-between text-[10px] text-[#475569] mb-1"><span>6 AM</span><span>12 PM</span><span>12 AM</span></div>
      <div className="relative h-2 rounded-full overflow-hidden bg-[#1E293B]">
        <div className="absolute top-0 bottom-0 w-px bg-[#334155]" style={{ left: `${((12*60 - TL_START) / TL_SPAN) * 100}%` }} />
        <div className="absolute top-0 h-full rounded-full transition-all duration-100" style={{ left: `${lp}%`, width: `${wp}%`, backgroundColor: slot.color }} />
      </div>
    </div>
  );
}

// ─── Chat for summary page ───
interface ChatMsg { role: 'user' | 'assistant'; text: string }
function ScheduleChat({ slots, onSlotsChange }: { slots: Slot[]; onSlotsChange: (s: Slot[]) => void }) {
  const [messages, setMessages] = useState<ChatMsg[]>([
    { role: 'assistant', text: "Tell me what to change — \"move gym to 7am\", \"make work shorter\", etc." }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }); }, [messages]);

  const send = useCallback(async () => {
    const msg = input.trim(); if (!msg || loading) return;
    setInput(''); setMessages(prev => [...prev, { role: 'user', text: msg }]); setLoading(true);
    try {
      const resp = await fetch('/api/schedule/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, slots: slots.map(s => ({ id: s.id, label: s.label, emoji: s.emoji, startMinutes: s.startMinutes, durationMinutes: s.durationMinutes, days: s.days })) }) });
      const data = await resp.json();
      setMessages(prev => [...prev, { role: 'assistant', text: data.reply || 'Done!' }]);
      if (data.slots) onSlotsChange(slots.map(s => { const u = data.slots.find((x: { id: string }) => x.id === s.id); return u ? { ...s, startMinutes: u.startMinutes, durationMinutes: u.durationMinutes, days: u.days as Day[] } : s; }));
    } catch { setMessages(prev => [...prev, { role: 'assistant', text: "Something went wrong. Try again?" }]); }
    setLoading(false);
  }, [input, loading, slots, onSlotsChange]);

  return (
    <div className="w-full max-w-md mx-auto mt-6 rounded-2xl overflow-hidden" style={{ background: 'rgba(15,23,42,0.9)', border: '1px solid #1E293B' }}>
      <div ref={scrollRef} className="max-h-48 overflow-y-auto p-4 space-y-3">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className="max-w-[85%] px-3 py-2 rounded-2xl text-sm"
              style={{ background: m.role === 'user' ? 'linear-gradient(135deg,#38BDF8,#818CF8)' : 'rgba(30,41,59,0.8)', color: 'white',
                borderBottomRightRadius: m.role === 'user' ? 4 : 16, borderBottomLeftRadius: m.role === 'assistant' ? 4 : 16 }}>{m.text}</div>
          </div>
        ))}
        {loading && <div className="flex justify-start"><div className="px-4 py-2 rounded-2xl text-sm" style={{ background: 'rgba(30,41,59,0.8)', color: '#64748B' }}><span className="animate-pulse">Thinking...</span></div></div>}
      </div>
      <div className="flex gap-2 p-3 border-t border-[#1E293B]">
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()}
          placeholder="e.g. move gym to 7am..." className="flex-1 px-4 py-3 rounded-xl bg-[#0F172A] text-white text-sm border border-[#334155] focus:border-[#38BDF8] focus:outline-none" />
        <button onClick={send} disabled={loading || !input.trim()} className="px-4 py-3 rounded-xl font-bold text-sm text-white disabled:opacity-30" style={{ background: 'linear-gradient(135deg,#38BDF8,#818CF8)' }}>Send</button>
      </div>
    </div>
  );
}

// ═══════ Main page ═══════
export default function PlayPage() {
  const router = useRouter();
  const [slots, setSlots] = useState<Slot[]>([]);
  const [cardIdx, setCardIdx] = useState(0);
  const [saving, setSaving] = useState(false);
  const [userName, setUserName] = useState('');

  // Drag state
  const [dragX, setDragX] = useState(0);
  const [dragY, setDragY] = useState(0);
  const [axis, setAxis] = useState<'h' | 'v' | null>(null);
  const dragStart = useRef<{ x: number; y: number } | null>(null);
  const baseStart = useRef(0);
  const baseDur = useRef(0);
  const dragging = useRef(false);
  const axisRef = useRef<'h' | 'v' | null>(null);

  // Hold state
  const [holdProgress, setHoldProgress] = useState(0);
  const [holding, setHolding] = useState(false);
  const holdStartRef = useRef(0);
  const holdRafRef = useRef(0);
  const holdDoneRef = useRef(false);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const lockIn = useCallback(() => {
    setCardIdx(i => i + 1);
    setDragX(0); setDragY(0); setAxis(null); axisRef.current = null;
  }, []);

  // Hold tick
  const holdTick = useCallback(() => {
    const elapsed = Date.now() - holdStartRef.current;
    const pct = Math.min(elapsed / HOLD_DURATION, 1);
    setHoldProgress(pct);
    if (pct >= 1 && !holdDoneRef.current) {
      holdDoneRef.current = true;
      setHolding(false);
      lockIn();
      return;
    }
    if (pct < 1) holdRafRef.current = requestAnimationFrame(holdTick);
  }, [lockIn]);

  const startHold = useCallback(() => {
    holdDoneRef.current = false;
    holdStartRef.current = Date.now();
    setHolding(true);
    setHoldProgress(0);
    holdRafRef.current = requestAnimationFrame(holdTick);
  }, [holdTick]);

  const cancelHold = useCallback(() => {
    cancelAnimationFrame(holdRafRef.current);
    setHolding(false);
    setHoldProgress(0);
  }, []);

  useEffect(() => () => cancelAnimationFrame(holdRafRef.current), []);

  // Drag handlers — on the full page so drag continues outside card
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    dragStart.current = { x: e.clientX, y: e.clientY };
    baseStart.current = current?.startMinutes ?? 0;
    baseDur.current = current?.durationMinutes ?? 60;
    dragging.current = false;
    axisRef.current = null;
    setAxis(null);
    // Start hold timer — cancelled if drag detected
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    holdTimerRef.current = setTimeout(() => {
      if (!dragging.current) startHold();
    }, 200);
  }, [current, startHold]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragStart.current) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    if (!dragging.current && (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD)) {
      dragging.current = true;
      if (holdTimerRef.current) { clearTimeout(holdTimerRef.current); holdTimerRef.current = null; }
      cancelHold();
    }
    if (!dragging.current) return;
    setDragX(dx); setDragY(dy);
    if (!axisRef.current) {
      if (Math.abs(dx) > Math.abs(dy) + 8) { axisRef.current = 'h'; setAxis('h'); }
      else if (Math.abs(dy) > Math.abs(dx) + 8) { axisRef.current = 'v'; setAxis('v'); }
    }
    if (!axisRef.current || !current) return;
    if (axisRef.current === 'h') {
      const steps = Math.round(dx / PX_PER_STEP);
      const newStart = Math.max(TL_START, Math.min(TL_END - current.durationMinutes, baseStart.current + steps * STEP));
      setSlots(prev => prev.map((s, i) => i === cardIdx ? { ...s, startMinutes: newStart } : s));
    } else {
      const steps = Math.round(-dy / PX_PER_STEP);
      const newDur = Math.max(15, Math.min(480, baseDur.current + steps * STEP));
      setSlots(prev => prev.map((s, i) => i === cardIdx ? { ...s, durationMinutes: newDur } : s));
    }
  }, [current, cardIdx, cancelHold]);

  const onPointerUp = useCallback(() => {
    if (holdTimerRef.current) { clearTimeout(holdTimerRef.current); holdTimerRef.current = null; }
    cancelHold();
    dragStart.current = null;
    dragging.current = false;
    axisRef.current = null;
    setDragX(0); setDragY(0); setAxis(null);
  }, [cancelHold]);

  const toggleDay = useCallback((day: Day) => {
    setSlots(prev => prev.map((s, i) => {
      if (i !== cardIdx) return s;
      const days = s.days.includes(day) ? s.days.filter(d => d !== day) : [...s.days, day];
      return { ...s, days };
    }));
  }, [cardIdx]);

  const handleFinish = useCallback(async () => {
    setSaving(true);
    try {
      const timeSlots: Record<string, { start: string; end: string; label: string; emoji: string; days: string[] }> = {};
      slots.forEach(s => { timeSlots[s.id] = { start: toHHMM(s.startMinutes), end: toHHMM(s.startMinutes + s.durationMinutes), label: s.label, emoji: s.emoji, days: s.days }; });
      await fetch('/api/user', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ timeSlots }) });
      await fetch('/api/schedule/rebuild?week=true', { method: 'POST' });
      if (typeof window !== 'undefined') { const raw = sessionStorage.getItem('drako_user'); if (raw) sessionStorage.setItem('drako_user', JSON.stringify({ ...JSON.parse(raw), timeSlots })); }
    } catch (e) { console.error(e); }
    router.push('/schedule');
  }, [slots, router]);

  // Loading
  if (slots.length === 0) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#0F172A 0%,#1E1B4B 50%,#0F172A 100%)' }}>
      <DrakoRobot size="xl" state="thinking" />
    </div>
  );

  // Done — summary
  if (done) return (
    <div className="min-h-screen flex flex-col items-center px-4 py-8 overflow-y-auto" style={{ background: 'linear-gradient(135deg,#0F172A 0%,#1E1B4B 50%,#0F172A 100%)' }}>
      <DrakoRobot size="lg" state="greeting" className="mb-4" />
      <h2 className="text-2xl font-bold mb-1 bg-gradient-to-r from-[#10B981] to-[#38BDF8] bg-clip-text text-transparent">
        {userName ? `${userName}'s Week` : 'Your Week'} 🗓️
      </h2>
      <p className="text-[#64748B] text-sm mb-6">{slots.length} blocks placed — chat below to adjust</p>
      <div className="w-full max-w-md mx-auto space-y-1.5">
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
      <ScheduleChat slots={slots} onSlotsChange={setSlots} />
      <button onClick={handleFinish} disabled={saving}
        className="w-full max-w-md mt-6 px-8 py-5 rounded-2xl font-bold text-lg text-white transition-all hover:scale-[1.02] disabled:opacity-50"
        style={{ background: 'linear-gradient(135deg,#38BDF8,#818CF8)', boxShadow: '0 0 40px rgba(56,189,248,0.3)' }}>
        {saving ? 'Building schedule...' : 'Build My Schedule →'}
      </button>
    </div>
  );

  // ═══ Active card with drag ═══
  const hSteps = axis === 'h' ? Math.round(dragX / PX_PER_STEP) : 0;
  const vSteps = axis === 'v' ? Math.round(-dragY / PX_PER_STEP) : 0;
  const hLabel = hSteps !== 0 ? `${Math.abs(hSteps) * STEP}m ${hSteps > 0 ? 'later' : 'earlier'}` : null;
  const vLabel = vSteps !== 0 ? `${Math.abs(vSteps) * STEP}m ${vSteps > 0 ? 'longer' : 'shorter'}` : null;
  const rotation = axis === 'h' ? Math.max(-6, Math.min(6, dragX / 18)) : 0;
  const scaleY = axis === 'v' ? 1 + Math.max(-0.06, Math.min(0.06, -dragY / 500)) : 1;
  const circum = 2 * Math.PI * 22;

  return (
    <div className="min-h-screen flex flex-col select-none"
      style={{ background: 'linear-gradient(135deg,#0F172A 0%,#1E1B4B 50%,#0F172A 100%)', touchAction: 'none' }}
      onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>

      {/* Progress */}
      <div className="flex-shrink-0 w-full max-w-sm mx-auto px-4 pt-6 pb-2">
        <div className="flex justify-between items-center mb-2">
          <span className="text-[#94A3B8] text-sm font-medium">{cardIdx + 1} / {slots.length}</span>
          <span className="text-[#38BDF8] text-sm">{slots.length - cardIdx - 1 > 0 ? `${slots.length - cardIdx - 1} left` : 'last one!'}</span>
        </div>
        <div className="w-full h-1.5 rounded-full bg-[#1E293B]">
          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${((cardIdx + 1) / slots.length) * 100}%`, background: 'linear-gradient(90deg,#38BDF8,#818CF8)' }} />
        </div>
        <p className="text-[#475569] text-center mt-2 text-[11px]">
          ← → shift time &nbsp;·&nbsp; ↑ ↓ duration &nbsp;·&nbsp; <span className="text-[#38BDF8]">hold to confirm</span>
        </p>
      </div>

      {/* Card area */}
      <div className="flex-1 flex items-center justify-center px-4">
        {current && (
          <div className="relative w-full max-w-sm">

            {/* Drag badge */}
            {(hLabel || vLabel) && (
              <div className="absolute left-1/2 -translate-x-1/2 -top-10 z-20 px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap"
                style={{
                  color: hSteps > 0 || vSteps > 0 ? '#38BDF8' : '#818CF8',
                  background: hSteps > 0 || vSteps > 0 ? 'rgba(56,189,248,0.15)' : 'rgba(129,140,248,0.15)',
                  border: `1px solid ${hSteps > 0 || vSteps > 0 ? 'rgba(56,189,248,0.4)' : 'rgba(129,140,248,0.4)'}`,
                }}>
                {hLabel || (vSteps > 0 ? `+${Math.abs(vSteps) * STEP}m longer` : `-${Math.abs(vSteps) * STEP}m shorter`)}
              </div>
            )}

            {/* Card with transforms */}
            <div className="rounded-3xl p-6 cursor-grab active:cursor-grabbing"
              style={{
                background: 'rgba(15,23,42,0.95)',
                border: `2px solid ${holding ? current.color : `${current.color}40`}`,
                boxShadow: holding
                  ? `0 0 50px ${current.color}40, 0 16px 48px rgba(0,0,0,0.5)`
                  : `0 0 40px ${current.color}10, 0 16px 48px rgba(0,0,0,0.4)`,
                transform: `rotate(${rotation}deg) scaleY(${scaleY})`,
                transition: dragging.current ? 'box-shadow 0.2s' : 'all 0.2s ease',
                touchAction: 'none',
              }}
              onPointerDown={onPointerDown}>

              {/* Tint overlays */}
              {axis === 'h' && Math.abs(dragX) > 20 && (
                <div className="absolute inset-0 rounded-3xl pointer-events-none z-10"
                  style={{ background: dragX > 0 ? `rgba(56,189,248,${Math.min(Math.abs(dragX)/300, 0.2)})` : `rgba(129,140,248,${Math.min(Math.abs(dragX)/300, 0.2)})` }} />
              )}
              {axis === 'v' && Math.abs(dragY) > 20 && (
                <div className="absolute inset-0 rounded-3xl pointer-events-none z-10"
                  style={{ background: dragY < 0 ? `rgba(16,185,129,${Math.min(Math.abs(dragY)/300, 0.2)})` : `rgba(239,68,68,${Math.min(Math.abs(dragY)/300, 0.2)})` }} />
              )}

              {/* Emoji + label */}
              <div className="text-center mb-3 relative z-20">
                <span className="text-5xl block mb-2" style={{ filter: `drop-shadow(0 0 16px ${current.color}50)` }}>{current.emoji}</span>
                <h2 className="text-xl font-bold text-white">{current.label}</h2>
              </div>

              {/* Time window */}
              <div className="relative z-20 w-full px-3 py-3 rounded-2xl mb-2" style={{ background: `${current.color}12`, border: `1px solid ${current.color}30` }}>
                <div className="text-lg font-black text-center" style={{ color: current.color }}>
                  {toDisplay(current.startMinutes)}
                  <span className="text-[#475569] font-normal mx-2 text-sm">→</span>
                  {toDisplay(current.startMinutes + current.durationMinutes)}
                </div>
                <div className="text-xs text-[#64748B] mt-0.5 text-center">{fmtDur(current.durationMinutes)} · 30m steps</div>
              </div>

              <div className="relative z-20"><TimeBar slot={current} /></div>

              {/* Day selector */}
              <div className="relative z-20 mt-3" onPointerDown={e => e.stopPropagation()}>
                <p className="text-xs text-[#475569] mb-2 uppercase tracking-wider text-center">Which days?</p>
                <div className="flex justify-between gap-1">
                  {DAYS.map(day => {
                    const on = current.days.includes(day);
                    return (
                      <button key={day} onClick={() => toggleDay(day)}
                        className="flex-1 py-2 rounded-lg text-xs font-bold transition-colors"
                        style={{ background: on ? current.color : 'rgba(30,41,59,0.8)', color: on ? '#fff' : '#475569', border: `1.5px solid ${on ? current.color : '#334155'}`, boxShadow: on ? `0 0 10px ${current.color}40` : 'none' }}>
                        {day.charAt(0)}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Hold progress ring (bottom of card) */}
              <div className="relative z-20 mt-4 flex flex-col items-center">
                <div className="relative w-16 h-16">
                  <svg width="64" height="64" className="-rotate-90">
                    <circle cx="32" cy="32" r="28" fill="none" stroke="#1E293B" strokeWidth="3" />
                    <circle cx="32" cy="32" r="28" fill="none" stroke={current.color} strokeWidth="3"
                      strokeDasharray={`${2 * Math.PI * 28}`}
                      strokeDashoffset={`${2 * Math.PI * 28 * (1 - holdProgress)}`}
                      strokeLinecap="round"
                      style={{ transition: holding ? 'none' : 'stroke-dashoffset 0.3s' }} />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    {holdProgress >= 1
                      ? <span className="text-xl">✓</span>
                      : <span className="text-xs font-bold" style={{ color: holding ? current.color : '#475569' }}>
                          {holding ? `${Math.round(holdProgress * 100)}%` : 'Hold'}
                        </span>}
                  </div>
                </div>
                <p className="text-[10px] text-[#475569] mt-1">Hold card ~2s to lock in</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
