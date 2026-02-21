'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DrakoRobot } from '@/components/DrakoRobot';

const ACTIVITIES = [
  { id: 'deep_focus',    emoji: '🧠', label: 'Deep Focus',    color: '#14B8A6', defaultMins: 120 },
  { id: 'exercise',      emoji: '🏋️', label: 'Exercise',      color: '#EF4444', defaultMins: 60  },
  { id: 'learning',      emoji: '📖', label: 'Learning',      color: '#F59E0B', defaultMins: 60  },
  { id: 'creative',      emoji: '🎨', label: 'Creative Time', color: '#EC4899', defaultMins: 60  },
  { id: 'social',        emoji: '👥', label: 'Social',        color: '#8B5CF6', defaultMins: 30  },
  { id: 'meditation',    emoji: '🧘', label: 'Meditation',    color: '#6366F1', defaultMins: 0   },
  { id: 'side_project',  emoji: '🚀', label: 'Side Project',  color: '#10B981', defaultMins: 0   },
  { id: 'entertainment', emoji: '🎮', label: 'Fun & Rest',    color: '#F97316', defaultMins: 30  },
];

function formatTime(mins: number): string {
  if (mins === 0) return 'Skip';
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export default function PlayPage() {
  const router = useRouter();
  const [cardIndex, setCardIndex] = useState(0);
  const [allocations, setAllocations] = useState<Record<string, number>>(
    Object.fromEntries(ACTIVITIES.map(a => [a.id, a.defaultMins]))
  );
  const [currentMins, setCurrentMins] = useState(ACTIVITIES[0].defaultMins);
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isFlying, setIsFlying] = useState(false);
  const [flyDir, setFlyDir] = useState<'up' | null>(null);
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);
  const dragStart = useRef<{ x: number; y: number } | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const activity = ACTIVITIES[cardIndex];
  const STEP = 30;
  const MAX = 240;

  // Sync currentMins when card changes
  useEffect(() => {
    if (!done) setCurrentMins(allocations[ACTIVITIES[cardIndex]?.id] ?? 0);
  }, [cardIndex, done, allocations]);

  const lockIn = useCallback(() => {
    setAllocations(prev => ({ ...prev, [activity.id]: currentMins }));
    setIsFlying(true);
    setFlyDir('up');
    setTimeout(() => {
      setIsFlying(false);
      setFlyDir(null);
      setDragX(0);
      if (cardIndex + 1 >= ACTIVITIES.length) {
        setDone(true);
      } else {
        setCardIndex(i => i + 1);
      }
    }, 400);
  }, [activity.id, currentMins, cardIndex]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    dragStart.current = { x: e.clientX, y: e.clientY };
    setIsDragging(true);
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragStart.current || !isDragging) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setDragX(dx);

    // Live time update while dragging
    const steps = Math.round(dx / 40);
    const base = allocations[activity.id] ?? 0;
    const newMins = Math.max(0, Math.min(MAX, base + steps * STEP));
    setCurrentMins(newMins);

    // Upward swipe check
    if (dy < -80 && Math.abs(dx) < 60) {
      dragStart.current = null;
      setIsDragging(false);
      setDragX(0);
      lockIn();
    }
  }, [isDragging, allocations, activity.id, lockIn]);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    if (!dragStart.current) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;

    if (Math.abs(dx) < 10 && Math.abs(dy) < 10) {
      // Tap — just lock in current value
      lockIn();
    } else if (dy < -60 && Math.abs(dx) < 80) {
      lockIn();
    } else {
      // Commit the drag value
      const steps = Math.round(dx / 40);
      const base = allocations[activity.id] ?? 0;
      const newMins = Math.max(0, Math.min(MAX, base + steps * STEP));
      setCurrentMins(newMins);
      setAllocations(prev => ({ ...prev, [activity.id]: newMins }));
      setDragX(0);
    }
    dragStart.current = null;
    setIsDragging(false);
  }, [allocations, activity.id, lockIn]);

  const handleFinish = async () => {
    setSaving(true);
    try {
      await fetch('/api/user', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timeAllocations: allocations }),
      });
    } catch { /* non-blocking */ }
    router.push('/schedule');
  };

  const totalHours = Object.values(allocations).reduce((a, b) => a + b, 0) / 60;
  const pickedCount = Object.values(allocations).filter(v => v > 0).length;

  if (done) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center"
        style={{ background: 'linear-gradient(135deg, #0F172A 0%, #1E1B4B 50%, #0F172A 100%)' }}>
        <DrakoRobot size="xl" state="greeting" className="mb-8" />
        <h2 className="text-3xl font-bold mb-3 bg-gradient-to-r from-[#10B981] to-[#38BDF8] bg-clip-text text-transparent">
          Nice plan, {pickedCount} priorities locked!
        </h2>
        <p className="text-[#94A3B8] mb-4">
          You allocated <span className="text-white font-semibold">{totalHours.toFixed(1)} hours</span> of intentional time
        </p>

        {/* Summary pills */}
        <div className="flex flex-wrap justify-center gap-2 mb-10">
          {ACTIVITIES.filter(a => allocations[a.id] > 0).map(a => (
            <span key={a.id}
              className="px-3 py-1 rounded-full text-sm font-medium"
              style={{ background: `${a.color}20`, color: a.color, border: `1px solid ${a.color}40` }}>
              {a.emoji} {formatTime(allocations[a.id])}
            </span>
          ))}
        </div>

        <button
          onClick={handleFinish}
          disabled={saving}
          className="w-full max-w-xs px-8 py-5 rounded-2xl font-bold text-xl text-white transition-all hover:scale-[1.02] disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, #38BDF8, #818CF8)', boxShadow: '0 0 40px rgba(56,189,248,0.3)' }}>
          {saving ? 'Building...' : '🎙️ Talk to DRAKO →'}
        </button>
      </div>
    );
  }

  const rotation = dragX / 20;
  const tint = dragX > 40 ? `rgba(16,185,129,${Math.min(dragX / 200, 0.4)})` :
               dragX < -40 ? `rgba(239,68,68,${Math.min(-dragX / 200, 0.4)})` : 'transparent';

  return (
    <div className="min-h-screen flex flex-col items-center justify-between py-10 px-4 select-none"
      style={{ background: 'linear-gradient(135deg, #0F172A 0%, #1E1B4B 50%, #0F172A 100%)' }}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}>

      {/* Top: progress + question */}
      <div className="w-full max-w-sm">
        <div className="flex justify-between items-center mb-2">
          <span className="text-[#475569] text-sm">{cardIndex + 1} / {ACTIVITIES.length}</span>
          <span className="text-[#38BDF8] text-sm font-medium">
            {cardIndex < ACTIVITIES.length ? `${ACTIVITIES.length - cardIndex - 1} left` : ''}
          </span>
        </div>
        <div className="w-full h-1 rounded-full bg-[#1E293B]">
          <div className="h-full rounded-full transition-all duration-500"
            style={{ width: `${((cardIndex) / ACTIVITIES.length) * 100}%`, background: 'linear-gradient(90deg, #38BDF8, #818CF8)' }} />
        </div>
        <p className="text-[#94A3B8] text-center mt-4 text-sm">
          How much time for this today?
        </p>
      </div>

      {/* Card */}
      <div className="flex-1 flex items-center justify-center w-full">
        <div
          ref={cardRef}
          className="relative w-72 cursor-grab active:cursor-grabbing"
          style={{
            transform: isFlying ? 'translateY(-110vh)' : `translateX(${dragX}px) rotate(${rotation}deg)`,
            transition: isFlying ? 'transform 0.4s cubic-bezier(0.36,0.07,0.19,0.97)' : isDragging ? 'none' : 'transform 0.3s ease',
          }}
          onPointerDown={onPointerDown}
        >
          {/* Tint overlay */}
          <div className="absolute inset-0 rounded-3xl pointer-events-none z-10 transition-all"
            style={{ background: tint, borderRadius: '24px' }} />

          {/* Left/right hints */}
          {dragX > 40 && (
            <div className="absolute left-4 top-1/2 -translate-y-1/2 z-20 text-2xl font-black text-[#10B981] opacity-80">＋</div>
          )}
          {dragX < -40 && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2 z-20 text-2xl font-black text-[#EF4444] opacity-80">−</div>
          )}

          <div className="rounded-3xl p-8 flex flex-col items-center text-center"
            style={{
              background: 'rgba(30,41,59,0.9)',
              border: `2px solid ${activity.color}40`,
              boxShadow: `0 0 40px ${activity.color}20, 0 20px 60px rgba(0,0,0,0.4)`,
            }}>
            <span className="text-8xl mb-5" style={{ filter: 'drop-shadow(0 0 20px rgba(255,255,255,0.2))' }}>
              {activity.emoji}
            </span>
            <h2 className="text-2xl font-bold text-white mb-2">{activity.label}</h2>

            {/* Time display */}
            <div className="mt-4 mb-2">
              <span className="text-5xl font-black"
                style={{ color: currentMins === 0 ? '#475569' : activity.color }}>
                {formatTime(currentMins)}
              </span>
            </div>

            {/* Time bar */}
            <div className="w-full h-2 rounded-full bg-[#1E293B] mt-3">
              <div className="h-full rounded-full transition-all duration-150"
                style={{ width: `${(currentMins / MAX) * 100}%`, backgroundColor: activity.color }} />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom hints + lock button */}
      <div className="w-full max-w-sm flex flex-col items-center gap-4">
        <div className="flex justify-between w-full text-xs text-[#475569] px-2">
          <span>← less time</span>
          <span>↑ lock it in</span>
          <span>more time →</span>
        </div>
        <button
          onClick={lockIn}
          className="w-full py-4 rounded-2xl font-bold text-lg text-white transition-all hover:scale-[1.02] active:scale-[0.98]"
          style={{ background: `linear-gradient(135deg, ${activity.color}, ${activity.color}99)` }}>
          ✓ Lock it in
        </button>
        <button onClick={() => { setCurrentMins(0); lockIn(); }}
          className="text-[#475569] text-sm underline">
          Skip this one
        </button>
      </div>
    </div>
  );
}
