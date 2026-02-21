'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DrakoRobot } from '@/components/DrakoRobot';

/* ─── Activity catalog (same IDs as OnboardingFlow) ─────────────── */
const ACTIVITY_CATALOG: Record<string, { emoji: string; label: string; color: string }> = {
  work:         { emoji: '💼', label: 'Work',           color: '#3B82F6' },
  school:       { emoji: '🎓', label: 'School/Classes', color: '#6366F1' },
  commute:      { emoji: '🚌', label: 'Commute',        color: '#64748B' },
  gym:          { emoji: '🏋️', label: 'Gym',            color: '#EF4444' },
  running:      { emoji: '🏃', label: 'Running/Walk',   color: '#F97316' },
  meditation:   { emoji: '🧘', label: 'Meditation',     color: '#6366F1' },
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

/* ─── Smart time defaults ─────────────────────────────────────────
   Returns { startMinutes, durationMinutes } from midnight.
   Rules encode basic life heuristics:
     - work/school = 9 AM–5 PM / 8 AM–3 PM
     - commute = 30–45 min before work/school
     - gym: early risers → morning; others → evening
     - meals/cooking → evening slot
     - deep focus/creative → morning peak window
     - social/family/leisure → evening
─────────────────────────────────────────────────────────────────── */
function getSmartDefault(
  activityId: string,
  userType: string,
  wakeHour: number, // 0-23
  hasWork: boolean,
  hasSchool: boolean,
): { startMinutes: number; durationMinutes: number } {
  const workStart = 9 * 60;   // 9:00 AM
  const schoolStart = 8 * 60; // 8:00 AM
  const anchorStart = hasSchool ? schoolStart : workStart;

  const isEarlyBird = wakeHour <= 6;
  const isAthlete = userType === 'athlete';

  switch (activityId) {
    case 'work':
      return { startMinutes: workStart, durationMinutes: 480 };        // 9 AM – 5 PM

    case 'school':
      return { startMinutes: schoolStart, durationMinutes: 420 };      // 8 AM – 3 PM

    case 'commute':
      return { startMinutes: anchorStart - 45, durationMinutes: 45 };  // 45 min before anchor

    case 'gym':
      return isEarlyBird || isAthlete
        ? { startMinutes: (wakeHour + 1) * 60, durationMinutes: 60 }   // morning gym
        : { startMinutes: 18 * 60, durationMinutes: 60 };              // evening gym

    case 'running':
      return isEarlyBird
        ? { startMinutes: wakeHour * 60 + 30, durationMinutes: 30 }    // early morning run
        : { startMinutes: 7 * 60, durationMinutes: 30 };               // morning run

    case 'meditation':
      return { startMinutes: wakeHour * 60, durationMinutes: 20 };     // right at wake-up

    case 'cooking':
      return { startMinutes: 18 * 60 + 30, durationMinutes: 60 };      // 6:30 PM dinner

    case 'errands':
      return { startMinutes: 17 * 60 + 30, durationMinutes: 60 };      // 5:30 PM after work

    case 'deep_work':
      return { startMinutes: (wakeHour + 1) * 60, durationMinutes: 120 }; // peak focus morning

    case 'learning':
      return { startMinutes: 20 * 60, durationMinutes: 60 };           // 8 PM evening

    case 'creative':
      return isEarlyBird
        ? { startMinutes: (wakeHour + 1) * 60, durationMinutes: 90 }   // morning creative
        : { startMinutes: 10 * 60, durationMinutes: 90 };              // late morning

    case 'side_project':
      return { startMinutes: 20 * 60, durationMinutes: 90 };           // 8–9:30 PM

    case 'reading':
      return { startMinutes: 21 * 60, durationMinutes: 30 };           // 9 PM bedtime

    case 'social':
      return { startMinutes: 19 * 60, durationMinutes: 120 };          // 7–9 PM

    case 'family':
      return { startMinutes: 18 * 60, durationMinutes: 120 };          // 6–8 PM

    case 'gaming':
      return { startMinutes: 20 * 60, durationMinutes: 90 };           // 8–9:30 PM

    case 'shows':
      return { startMinutes: 20 * 60 + 30, durationMinutes: 90 };      // 8:30–10 PM

    default:
      return { startMinutes: 19 * 60, durationMinutes: 60 };           // 7 PM fallback
  }
}

/* ─── Time formatting helpers ────────────────────────────────────── */
function minutesToDisplay(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

function minutesToHHMM(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function parseWakeHour(rhythm: string): number {
  const match = rhythm.match(/^(\d+)/);
  return match ? parseInt(match[1]) : 7;
}

/* ─── Activity card slot ─────────────────────────────────────────── */
interface ActivitySlot {
  id: string;
  emoji: string;
  label: string;
  color: string;
  startMinutes: number;    // adjustable
  durationMinutes: number; // fixed
}

/* ─── Mini timeline bar (6 AM → 11 PM) ──────────────────────────── */
const TIMELINE_START = 6 * 60;  // 6 AM
const TIMELINE_END   = 23 * 60; // 11 PM
const TIMELINE_SPAN  = TIMELINE_END - TIMELINE_START;

function TimelineBar({ slot }: { slot: ActivitySlot }) {
  const barStart = Math.max(0, slot.startMinutes - TIMELINE_START);
  const barWidth = slot.durationMinutes;
  const leftPct   = (barStart / TIMELINE_SPAN) * 100;
  const widthPct  = Math.min((barWidth / TIMELINE_SPAN) * 100, 100 - leftPct);

  return (
    <div className="w-full mt-3">
      <div className="flex justify-between text-xs text-[#475569] mb-1 px-0.5">
        <span>6 AM</span><span>12 PM</span><span>11 PM</span>
      </div>
      <div className="relative h-2.5 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(30,41,59,0.8)' }}>
        {/* Noon marker */}
        <div className="absolute top-0 bottom-0 w-px bg-[#334155]" style={{ left: `${((12*60 - TIMELINE_START) / TIMELINE_SPAN) * 100}%` }} />
        {/* Block */}
        <div className="absolute top-0 h-full rounded-full transition-all duration-200"
          style={{ left: `${leftPct}%`, width: `${widthPct}%`, backgroundColor: slot.color }} />
      </div>
    </div>
  );
}

/* ─── Default fallback activities if sessionStorage is empty ──────── */
const DEFAULT_ACTIVITIES = ['work', 'gym', 'deep_work', 'social'];

export default function PlayPage() {
  const router = useRouter();
  const [slots, setSlots] = useState<ActivitySlot[]>([]);
  const [cardIndex, setCardIndex] = useState(0);
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isFlying, setIsFlying] = useState(false);
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);
  const [userName, setUserName] = useState('');
  const [persona, setPersona] = useState<{
    archetype?: string;
    archetypeEmoji?: string;
    tagline?: string;
    drakoGreeting?: string;
  } | null>(null);
  const dragStart = useRef<{ x: number; y: number } | null>(null);
  const baseMinutes = useRef<number>(0);

  // ─── Auth + load activities from sessionStorage ──────────────────
  useEffect(() => {
    fetch('/api/user').then(r => r.json()).then(d => {
      if (!d.onboarded) { router.replace('/onboarding'); return; }

      const rawUser = typeof window !== 'undefined'
        ? sessionStorage.getItem('drako_user') : null;
      const user = rawUser ? JSON.parse(rawUser) : d.user;

      setUserName(user?.name || '');

      const activities: string[] = user?.selectedActivities?.length > 0
        ? user.selectedActivities
        : DEFAULT_ACTIVITIES;

      const wakeHour = parseWakeHour(user?.rhythm || '7am');
      const userType = user?.type || 'professional';
      const hasWork   = activities.includes('work');
      const hasSchool = activities.includes('school');

      const builtSlots: ActivitySlot[] = activities.map(id => {
        const meta = ACTIVITY_CATALOG[id] || { emoji: '📌', label: id, color: '#64748B' };
        const { startMinutes, durationMinutes } = getSmartDefault(id, userType, wakeHour, hasWork, hasSchool);
        return { id, ...meta, startMinutes, durationMinutes };
      });

      setSlots(builtSlots);
    }).catch(() => router.replace('/onboarding'));
  }, [router]);

  const current = slots[cardIndex];

  // ─── Pointer drag handlers ───────────────────────────────────────
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    dragStart.current = { x: e.clientX, y: e.clientY };
    baseMinutes.current = current?.startMinutes ?? 0;
    setIsDragging(true);
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  }, [current]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragStart.current || !isDragging || !current) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setDragX(dx);

    // Live time shift: each 40px = 30 min
    const steps = Math.round(dx / 40);
    const newStart = Math.max(TIMELINE_START, Math.min(TIMELINE_END - current.durationMinutes, baseMinutes.current + steps * 30));
    setSlots(prev => prev.map((s, i) => i === cardIndex ? { ...s, startMinutes: newStart } : s));

    // Upward swipe = accept
    if (dy < -80 && Math.abs(dx) < 60) {
      dragStart.current = null;
      setIsDragging(false);
      setDragX(0);
      acceptCard();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDragging, current, cardIndex]);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    if (!dragStart.current) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;

    if (Math.abs(dx) < 8 && Math.abs(dy) < 8) {
      // Tap — accept
      acceptCard();
    } else if (dy < -60 && Math.abs(dx) < 80) {
      acceptCard();
    }
    // else: drag already updated time live, just settle
    dragStart.current = null;
    setIsDragging(false);
    setDragX(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardIndex, slots]);

  const acceptCard = useCallback(() => {
    setIsFlying(true);
    setTimeout(() => {
      setIsFlying(false);
      setDragX(0);
      if (cardIndex + 1 >= slots.length) {
        setDone(true);
        // Fetch persona for the done screen
        fetch('/api/persona')
          .then(r => r.json())
          .then(d => { if (d.persona) setPersona(d.persona); })
          .catch(() => {});
      } else {
        setCardIndex(i => i + 1);
      }
    }, 380);
  }, [cardIndex, slots.length]);

  // ─── Save + continue ─────────────────────────────────────────────
  const handleFinish = useCallback(async () => {
    setSaving(true);
    try {
      const timeSlots: Record<string, { start: string; end: string; label: string; emoji: string }> = {};
      slots.forEach(s => {
        timeSlots[s.id] = {
          start: minutesToHHMM(s.startMinutes),
          end:   minutesToHHMM(s.startMinutes + s.durationMinutes),
          label: s.label,
          emoji: s.emoji,
        };
      });

      await fetch('/api/user', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timeSlots }),
      });

      // Persist to sessionStorage so /schedule can reference it
      if (typeof window !== 'undefined') {
        const raw = sessionStorage.getItem('drako_user');
        if (raw) {
          const u = JSON.parse(raw);
          sessionStorage.setItem('drako_user', JSON.stringify({ ...u, timeSlots }));
        }
      }
    } catch { /* non-blocking */ }
    router.push('/schedule');
  }, [slots, router]);

  // ─── Loading ─────────────────────────────────────────────────────
  if (slots.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #0F172A 0%, #1E1B4B 50%, #0F172A 100%)' }}>
        <DrakoRobot size="xl" state="thinking" />
      </div>
    );
  }

  // ─── Done screen ─────────────────────────────────────────────────
  if (done) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center"
        style={{ background: 'linear-gradient(135deg, #0F172A 0%, #1E1B4B 50%, #0F172A 100%)' }}>
        
        {/* Persona hero */}
        {persona?.archetypeEmoji ? (
          <div className="text-8xl mb-6 animate-bounce" style={{ filter: 'drop-shadow(0 0 30px rgba(56,189,248,0.5))' }}>
            {persona.archetypeEmoji}
          </div>
        ) : (
          <DrakoRobot size="xl" state="greeting" className="mb-6" />
        )}

        <h2 className="text-3xl font-bold mb-2"
          style={{
            background: 'linear-gradient(135deg, #38BDF8, #818CF8)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
          {persona?.archetype || `Perfect${userName ? `, ${userName}` : ''}!`}
        </h2>

        <p className="text-[#94A3B8] mb-4">
          {persona?.tagline || `Day mapped — ${slots.length} block${slots.length !== 1 ? 's' : ''} placed`}
        </p>

        {/* DRAKO greeting bubble */}
        {persona?.drakoGreeting && (
          <div className="mx-auto max-w-sm p-4 rounded-2xl italic mb-6"
            style={{
              background: 'rgba(30, 41, 59, 0.8)',
              border: '1px solid #334155',
              color: '#94A3B8',
            }}>
            &ldquo;{persona.drakoGreeting}&rdquo;
          </div>
        )}

        {/* Summary list */}
        <div className="w-full max-w-xs space-y-2 mb-8">
          {slots.map(s => (
            <div key={s.id} className="flex items-center justify-between px-4 py-2.5 rounded-xl"
              style={{ background: `${s.color}15`, border: `1px solid ${s.color}30` }}>
              <span className="text-sm font-medium" style={{ color: s.color }}>
                {s.emoji} {s.label}
              </span>
              <span className="text-xs text-[#64748B]">
                {minutesToDisplay(s.startMinutes)} – {minutesToDisplay(s.startMinutes + s.durationMinutes)}
              </span>
            </div>
          ))}
        </div>

        <button onClick={handleFinish} disabled={saving}
          className="w-full max-w-xs px-8 py-5 rounded-2xl font-bold text-xl text-white transition-all hover:scale-[1.02] disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, #38BDF8, #818CF8)', boxShadow: '0 0 40px rgba(56,189,248,0.3)' }}>
          {saving ? 'Building...' : '🎙️ Talk to DRAKO →'}
        </button>
      </div>
    );
  }

  // ─── Card ─────────────────────────────────────────────────────────
  const rotation = dragX / 18;
  const timeShiftLabel = (() => {
    if (!dragX || !current) return null;
    const steps = Math.round(dragX / 40);
    if (steps === 0) return null;
    const mins = Math.abs(steps) * 30;
    const dir = steps > 0 ? 'later' : 'earlier';
    return `${mins}m ${dir}`;
  })();

  return (
    <div
      className="min-h-screen flex flex-col items-between py-8 px-4 select-none"
      style={{ background: 'linear-gradient(135deg, #0F172A 0%, #1E1B4B 50%, #0F172A 100%)' }}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      {/* Progress */}
      <div className="w-full max-w-sm mx-auto mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-[#475569] text-sm">{cardIndex + 1} / {slots.length}</span>
          <span className="text-[#38BDF8] text-sm font-medium">
            {slots.length - cardIndex - 1 > 0 ? `${slots.length - cardIndex - 1} left` : 'last one!'}
          </span>
        </div>
        <div className="w-full h-1 rounded-full bg-[#1E293B]">
          <div className="h-full rounded-full transition-all duration-500"
            style={{ width: `${(cardIndex / slots.length) * 100}%`, background: 'linear-gradient(90deg, #38BDF8, #818CF8)' }} />
        </div>
        <p className="text-[#94A3B8] text-center mt-3 text-sm font-medium">
          When should this happen?
        </p>
      </div>

      {/* Card container */}
      <div className="flex-1 flex items-center justify-center w-full">
        <div
          className="relative w-80 cursor-grab active:cursor-grabbing"
          style={{
            transform: isFlying
              ? 'translateY(-110vh) scale(0.85)'
              : `translateX(${dragX}px) rotate(${rotation}deg)`,
            transition: isFlying
              ? 'transform 0.38s cubic-bezier(0.36,0.07,0.19,0.97)'
              : isDragging ? 'none' : 'transform 0.3s ease',
          }}
          onPointerDown={onPointerDown}
        >
          {/* Tint overlay */}
          {dragX > 30 && (
            <div className="absolute inset-0 rounded-3xl pointer-events-none z-10"
              style={{ background: `rgba(56,189,248,${Math.min(Math.abs(dragX) / 200, 0.3)})`, borderRadius: 24 }} />
          )}
          {dragX < -30 && (
            <div className="absolute inset-0 rounded-3xl pointer-events-none z-10"
              style={{ background: `rgba(99,102,241,${Math.min(Math.abs(dragX) / 200, 0.3)})`, borderRadius: 24 }} />
          )}

          {/* Shift label badges */}
          {dragX > 40 && (
            <div className="absolute left-1/2 -translate-x-1/2 -top-10 z-20 px-3 py-1.5 rounded-full text-xs font-bold text-[#38BDF8]"
              style={{ background: 'rgba(56,189,248,0.15)', border: '1px solid rgba(56,189,248,0.4)' }}>
              {timeShiftLabel || 'later →'}
            </div>
          )}
          {dragX < -40 && (
            <div className="absolute left-1/2 -translate-x-1/2 -top-10 z-20 px-3 py-1.5 rounded-full text-xs font-bold text-[#818CF8]"
              style={{ background: 'rgba(129,140,248,0.15)', border: '1px solid rgba(129,140,248,0.4)' }}>
              {timeShiftLabel || '← earlier'}
            </div>
          )}

          {/* Card body */}
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

              {/* Time display */}
              <div className="w-full px-2 py-3 rounded-2xl mb-2"
                style={{ background: `${current.color}12`, border: `1px solid ${current.color}30` }}>
                <div className="text-lg font-black" style={{ color: current.color }}>
                  {minutesToDisplay(current.startMinutes)}
                  <span className="text-[#475569] font-normal mx-2">→</span>
                  {minutesToDisplay(current.startMinutes + current.durationMinutes)}
                </div>
                <div className="text-xs text-[#64748B] mt-1">
                  {current.durationMinutes >= 60
                    ? `${Math.floor(current.durationMinutes / 60)}h${current.durationMinutes % 60 > 0 ? ` ${current.durationMinutes % 60}m` : ''}`
                    : `${current.durationMinutes}m`} block
                </div>
              </div>

              {/* Mini 24h timeline bar */}
              <TimelineBar slot={current} />
            </div>
          )}
        </div>
      </div>

      {/* Bottom controls */}
      <div className="w-full max-w-sm mx-auto mt-6 flex flex-col items-center gap-3">
        <div className="flex justify-between w-full text-xs text-[#475569] px-2">
          <span>← earlier</span>
          <span>↑ accept</span>
          <span>later →</span>
        </div>
        <button onClick={acceptCard}
          className="w-full py-4 rounded-2xl font-bold text-lg text-white transition-all hover:scale-[1.02] active:scale-[0.98]"
          style={{ background: current ? `linear-gradient(135deg, ${current.color}, ${current.color}99)` : '#334155' }}>
          ✓ Looks good
        </button>
      </div>
    </div>
  );
}
