'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DrakoRobot } from '@/components/DrakoRobot';

/* ─── Activity catalog ───────────────────────────────────────────── */
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

/* ─── Smart time defaults (heuristics) ──────────────────────────────
   Basic laws:
   - work/school  = 9 AM–5 PM / 8 AM–3 PM
   - commute      = 45 min before work/school start
   - gym: early risers (≤6 AM) → morning; everyone else → evening
   - deep focus / creative → morning peak (right after wake)
   - meals/cooking → evening
   - social/family/leisure → 6-9 PM evening block
   - meditation/reading → at wake or bedtime
─────────────────────────────────────────────────────────────────── */
function smartDefault(
  id: string, userType: string, wakeHour: number,
  hasWork: boolean, hasSchool: boolean,
): { startMinutes: number; durationMinutes: number } {
  const anchorStart = hasSchool ? 8 * 60 : 9 * 60;
  const isEarlyBird = wakeHour <= 6;
  const isAthlete = userType === 'athlete';

  switch (id) {
    case 'work':        return { startMinutes: 9 * 60,              durationMinutes: 480 };
    case 'school':      return { startMinutes: 8 * 60,              durationMinutes: 420 };
    case 'commute':     return { startMinutes: anchorStart - 45,    durationMinutes: 45  };
    case 'gym':
      return (isEarlyBird || isAthlete)
        ? { startMinutes: (wakeHour + 1) * 60,  durationMinutes: 60 }
        : { startMinutes: 18 * 60,              durationMinutes: 60 };
    case 'running':
      return isEarlyBird
        ? { startMinutes: wakeHour * 60 + 30,   durationMinutes: 30 }
        : { startMinutes: 7 * 60,               durationMinutes: 30 };
    case 'meditation':  return { startMinutes: wakeHour * 60,       durationMinutes: 20  };
    case 'cooking':     return { startMinutes: 18 * 60 + 30,        durationMinutes: 60  };
    case 'errands':     return { startMinutes: 17 * 60 + 30,        durationMinutes: 60  };
    case 'deep_work':   return { startMinutes: (wakeHour + 1) * 60, durationMinutes: 120 };
    case 'learning':    return { startMinutes: 20 * 60,             durationMinutes: 60  };
    case 'creative':
      return isEarlyBird
        ? { startMinutes: (wakeHour + 1) * 60,  durationMinutes: 90 }
        : { startMinutes: 10 * 60,              durationMinutes: 90 };
    case 'side_project': return { startMinutes: 20 * 60,            durationMinutes: 90  };
    case 'reading':     return { startMinutes: 21 * 60,             durationMinutes: 30  };
    case 'social':      return { startMinutes: 19 * 60,             durationMinutes: 120 };
    case 'family':      return { startMinutes: 18 * 60,             durationMinutes: 120 };
    case 'gaming':      return { startMinutes: 20 * 60,             durationMinutes: 90  };
    case 'shows':       return { startMinutes: 20 * 60 + 30,        durationMinutes: 90  };
    default:            return { startMinutes: 19 * 60,             durationMinutes: 60  };
  }
}

/* ─── Helpers ────────────────────────────────────────────────────── */
const TL_START = 6 * 60;   // 6 AM
const TL_END   = 23 * 60;  // 11 PM
const TL_SPAN  = TL_END - TL_START;

function toDisplay(min: number) {
  const h = Math.floor(min / 60) % 24;
  const m = min % 60;
  const p = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${p}`;
}
function toHHMM(min: number) {
  return `${String(Math.floor(min / 60) % 24).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
}
function parseWakeHour(rhythm: string) {
  const m = rhythm.match(/^(\d+)/);
  return m ? parseInt(m[1]) : 7;
}

interface Slot {
  id: string; emoji: string; label: string; color: string;
  startMinutes: number; durationMinutes: number;
}

function TimeBar({ slot }: { slot: Slot }) {
  const leftPct  = Math.max(0, (slot.startMinutes - TL_START) / TL_SPAN) * 100;
  const widthPct = Math.min(slot.durationMinutes / TL_SPAN * 100, 100 - leftPct);
  return (
    <div className="w-full mt-3">
      <div className="flex justify-between text-xs text-[#475569] mb-1">
        <span>6 AM</span><span>12 PM</span><span>11 PM</span>
      </div>
      <div className="relative h-2.5 rounded-full overflow-hidden bg-[#1E293B]">
        <div className="absolute top-0 bottom-0 w-px bg-[#334155]"
          style={{ left: `${((12*60-TL_START)/TL_SPAN)*100}%` }} />
        <div className="absolute top-0 h-full rounded-full transition-all duration-150"
          style={{ left: `${leftPct}%`, width: `${widthPct}%`, backgroundColor: slot.color }} />
      </div>
    </div>
  );
}

const DEFAULT_ACTIVITIES = ['work', 'gym', 'deep_work', 'social'];

export default function PlayPage() {
  const router = useRouter();
  const [slots, setSlots]     = useState<Slot[]>([]);
  const [cardIdx, setCardIdx] = useState(0);
  const [dragX, setDragX]     = useState(0);
  const [dragging, setDragging] = useState(false);
  const [flying, setFlying]   = useState(false);
  const [done, setDone]       = useState(false);
  const [saving, setSaving]   = useState(false);
  const [userName, setUserName] = useState('');
  const dragStart = useRef<{x:number;y:number}|null>(null);
  const baseMin   = useRef(0);

  /* ── Auth + build slots from sessionStorage ── */
  useEffect(() => {
    fetch('/api/user').then(r => r.json()).then(d => {
      if (!d.onboarded) { router.replace('/onboarding'); return; }
      const raw  = typeof window !== 'undefined' ? sessionStorage.getItem('drako_user') : null;
      const user = raw ? JSON.parse(raw) : d.user;
      setUserName(user?.name || '');

      const activities: string[] = (user?.selectedActivities?.length > 0)
        ? user.selectedActivities : DEFAULT_ACTIVITIES;

      const wakeHour  = parseWakeHour(user?.rhythm || '7am');
      const userType  = user?.type || 'professional';
      const hasWork   = activities.includes('work');
      const hasSchool = activities.includes('school');

      setSlots(activities.map(id => {
        const meta = CATALOG[id] || { emoji: '📌', label: id, color: '#64748B' };
        const { startMinutes, durationMinutes } = smartDefault(id, userType, wakeHour, hasWork, hasSchool);
        return { id, ...meta, startMinutes, durationMinutes };
      }));
    }).catch(() => router.replace('/onboarding'));
  }, [router]);

  const current = slots[cardIdx];

  /* ── Drag handlers ── */
  const onDown = useCallback((e: React.PointerEvent) => {
    dragStart.current = { x: e.clientX, y: e.clientY };
    baseMin.current   = current?.startMinutes ?? 0;
    setDragging(true);
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  }, [current]);

  const accept = useCallback(() => {
    setFlying(true);
    setTimeout(() => {
      setFlying(false); setDragX(0);
      if (cardIdx + 1 >= slots.length) setDone(true);
      else setCardIdx(i => i + 1);
    }, 380);
  }, [cardIdx, slots.length]);

  const onMove = useCallback((e: React.PointerEvent) => {
    if (!dragStart.current || !dragging || !current) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setDragX(dx);
    // Shift time: 40px = 30 min
    const steps   = Math.round(dx / 40);
    const newStart = Math.max(TL_START, Math.min(TL_END - current.durationMinutes, baseMin.current + steps * 30));
    setSlots(prev => prev.map((s, i) => i === cardIdx ? { ...s, startMinutes: newStart } : s));
    // Upward swipe = accept
    if (dy < -80 && Math.abs(dx) < 60) {
      dragStart.current = null; setDragging(false); setDragX(0);
      accept();
    }
  }, [dragging, current, cardIdx, accept]);

  const onUp = useCallback((e: React.PointerEvent) => {
    if (!dragStart.current) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    if (Math.abs(dx) < 8 && Math.abs(dy) < 8) accept();
    else if (dy < -60 && Math.abs(dx) < 80) accept();
    dragStart.current = null; setDragging(false); setDragX(0);
  }, [accept]);

  /* ── Save & continue ── */
  const handleFinish = useCallback(async () => {
    setSaving(true);
    try {
      const timeSlots: Record<string, {start:string;end:string;label:string;emoji:string}> = {};
      slots.forEach(s => {
        timeSlots[s.id] = { start: toHHMM(s.startMinutes), end: toHHMM(s.startMinutes + s.durationMinutes), label: s.label, emoji: s.emoji };
      });
      await fetch('/api/user', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timeSlots }),
      });
      if (typeof window !== 'undefined') {
        const raw = sessionStorage.getItem('drako_user');
        if (raw) sessionStorage.setItem('drako_user', JSON.stringify({ ...JSON.parse(raw), timeSlots }));
      }
    } catch { /* non-blocking */ }
    router.push('/schedule');
  }, [slots, router]);

  /* ── Loading ── */
  if (slots.length === 0) return (
    <div className="min-h-screen flex items-center justify-center"
      style={{ background: 'linear-gradient(135deg,#0F172A 0%,#1E1B4B 50%,#0F172A 100%)' }}>
      <DrakoRobot size="xl" state="thinking" />
    </div>
  );

  /* ── Done screen ── */
  if (done) return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center"
      style={{ background: 'linear-gradient(135deg,#0F172A 0%,#1E1B4B 50%,#0F172A 100%)' }}>
      <DrakoRobot size="xl" state="greeting" className="mb-8" />
      <h2 className="text-3xl font-bold mb-3 bg-gradient-to-r from-[#10B981] to-[#38BDF8] bg-clip-text text-transparent">
        {userName ? `Perfect, ${userName}!` : 'Day mapped!'} 🗓️
      </h2>
      <p className="text-[#94A3B8] mb-8">
        {slots.length} block{slots.length !== 1 ? 's' : ''} placed in your day
      </p>
      <div className="w-full max-w-xs space-y-2 mb-10">
        {slots.map(s => (
          <div key={s.id} className="flex items-center justify-between px-4 py-2.5 rounded-xl"
            style={{ background: `${s.color}15`, border: `1px solid ${s.color}30` }}>
            <span className="text-sm font-medium" style={{ color: s.color }}>{s.emoji} {s.label}</span>
            <span className="text-xs text-[#64748B]">
              {toDisplay(s.startMinutes)} – {toDisplay(s.startMinutes + s.durationMinutes)}
            </span>
          </div>
        ))}
      </div>
      <button onClick={handleFinish} disabled={saving}
        className="w-full max-w-xs px-8 py-5 rounded-2xl font-bold text-xl text-white transition-all hover:scale-[1.02] disabled:opacity-50"
        style={{ background: 'linear-gradient(135deg,#38BDF8,#818CF8)', boxShadow: '0 0 40px rgba(56,189,248,0.3)' }}>
        {saving ? 'Building...' : '🎙️ Talk to DRAKO →'}
      </button>
    </div>
  );

  /* ── Card ── */
  const shiftSteps = Math.round(dragX / 40);
  const shiftLabel = shiftSteps !== 0 ? `${Math.abs(shiftSteps)*30}m ${shiftSteps > 0 ? 'later' : 'earlier'}` : null;

  return (
    <div className="min-h-screen flex flex-col py-8 px-4 select-none"
      style={{ background: 'linear-gradient(135deg,#0F172A 0%,#1E1B4B 50%,#0F172A 100%)' }}
      onPointerMove={onMove} onPointerUp={onUp}>

      {/* Progress */}
      <div className="w-full max-w-sm mx-auto mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-[#475569] text-sm">{cardIdx + 1} / {slots.length}</span>
          <span className="text-[#38BDF8] text-sm font-medium">
            {slots.length - cardIdx - 1 > 0 ? `${slots.length - cardIdx - 1} left` : 'last one!'}
          </span>
        </div>
        <div className="w-full h-1 rounded-full bg-[#1E293B]">
          <div className="h-full rounded-full transition-all duration-500"
            style={{ width: `${(cardIdx/slots.length)*100}%`, background: 'linear-gradient(90deg,#38BDF8,#818CF8)' }} />
        </div>
        <p className="text-[#94A3B8] text-center mt-3 text-sm">When should this happen?</p>
      </div>

      {/* Card */}
      <div className="flex-1 flex items-center justify-center w-full">
        <div className="relative w-80 cursor-grab active:cursor-grabbing"
          style={{
            transform: flying ? 'translateY(-110vh) scale(0.85)' : `translateX(${dragX}px) rotate(${dragX/18}deg)`,
            transition: flying ? 'transform 0.38s ease' : dragging ? 'none' : 'transform 0.3s ease',
          }}
          onPointerDown={onDown}>

          {/* Shift badge */}
          {shiftLabel && (
            <div className="absolute left-1/2 -translate-x-1/2 -top-10 z-20 px-3 py-1.5 rounded-full text-xs font-bold"
              style={{
                color: shiftSteps > 0 ? '#38BDF8' : '#818CF8',
                background: shiftSteps > 0 ? 'rgba(56,189,248,0.15)' : 'rgba(129,140,248,0.15)',
                border: `1px solid ${shiftSteps > 0 ? 'rgba(56,189,248,0.4)' : 'rgba(129,140,248,0.4)'}`,
              }}>
              {shiftSteps > 0 ? '→' : '←'} {shiftLabel}
            </div>
          )}

          {/* Direction tint */}
          {dragX > 30 && (
            <div className="absolute inset-0 rounded-3xl pointer-events-none z-10"
              style={{ background: `rgba(56,189,248,${Math.min(Math.abs(dragX)/200,0.25)})`, borderRadius: 24 }} />
          )}
          {dragX < -30 && (
            <div className="absolute inset-0 rounded-3xl pointer-events-none z-10"
              style={{ background: `rgba(129,140,248,${Math.min(Math.abs(dragX)/200,0.25)})`, borderRadius: 24 }} />
          )}

          {current && (
            <div className="rounded-3xl p-8 flex flex-col items-center text-center"
              style={{
                background: 'rgba(15,23,42,0.95)',
                border: `2px solid ${current.color}50`,
                boxShadow: `0 0 60px ${current.color}15, 0 20px 60px rgba(0,0,0,0.5)`,
              }}>
              <span className="text-7xl mb-4" style={{ filter: `drop-shadow(0 0 20px ${current.color}60)` }}>
                {current.emoji}
              </span>
              <h2 className="text-2xl font-bold text-white mb-4">{current.label}</h2>

              {/* Time window */}
              <div className="w-full px-3 py-3 rounded-2xl mb-1"
                style={{ background: `${current.color}12`, border: `1px solid ${current.color}30` }}>
                <div className="text-xl font-black" style={{ color: current.color }}>
                  {toDisplay(current.startMinutes)}
                  <span className="text-[#475569] font-normal mx-2 text-base">→</span>
                  {toDisplay(current.startMinutes + current.durationMinutes)}
                </div>
                <div className="text-xs text-[#64748B] mt-1">
                  {current.durationMinutes >= 60
                    ? `${Math.floor(current.durationMinutes/60)}h${current.durationMinutes%60 > 0 ? ` ${current.durationMinutes%60}m` : ''}`
                    : `${current.durationMinutes}m`} · drag to shift
                </div>
              </div>

              <TimeBar slot={current} />
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="w-full max-w-sm mx-auto mt-6 flex flex-col items-center gap-3">
        <div className="flex justify-between w-full text-xs text-[#475569] px-2">
          <span>← earlier</span><span>↑ swipe to accept</span><span>later →</span>
        </div>
        <button onClick={accept}
          className="w-full py-4 rounded-2xl font-bold text-lg text-white transition-all hover:scale-[1.02]"
          style={{ background: current ? `linear-gradient(135deg,${current.color},${current.color}99)` : '#334155' }}>
          ✓ Looks good
        </button>
      </div>
    </div>
  );
}
