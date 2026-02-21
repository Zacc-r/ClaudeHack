'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { DrakoRobot } from './DrakoRobot';
import type { ScheduleEvent } from './ScheduleCard';

export interface UserProfile {
  id: string;
  name: string;
  type: string;
  rhythm: string;
  nonNegotiables: string[];
  selectedActivities?: string[];
  struggle: string;
  createdAt: string;
}

export interface OnboardingSurvey {
  name: string;
  type: 'student' | 'professional' | 'creative' | 'athlete' | 'other';
  rhythm: '5am' | '6am' | '7am' | '8am' | '9am' | '10am' | '11am';
  nonNegotiables: string[];
  selectedActivities: string[];
  struggle: 'too_many_meetings' | 'context_switching' | 'no_focus_time' | 'no_boundaries';
}

interface OnboardingFlowProps {
  onComplete: (user: UserProfile, events: ScheduleEvent[]) => void;
}

interface OnboardingState {
  step: number;
  name: string;
  type: OnboardingSurvey['type'] | '';
  rhythm: OnboardingSurvey['rhythm'] | '';
  selectedActivities: string[];
  swipeIndex: number;
  timeAllocations: Record<string, number>;
  struggle: OnboardingSurvey['struggle'] | '';
  isSubmitting: boolean;
  error: string | null;
  buildingStep: number;
  robotState: 'idle' | 'greeting' | 'thinking' | 'listening';
}

const ROLES = [
  { id: 'student',      label: 'Student',       icon: '🎓' },
  { id: 'professional', label: 'Professional',  icon: '💼' },
  { id: 'creative',     label: 'Creative',      icon: '🎨' },
  { id: 'athlete',      label: 'Athlete',       icon: '🏃' },
  { id: 'other',        label: 'Other',         icon: '✨' },
];

const WAKE_TIMES = ['6am', '7am', '8am', '9am', '10am'] as const;

const STRUGGLES = [
  { id: 'too_many_meetings', emoji: '😵', label: 'Too many meetings' },
  { id: 'context_switching', emoji: '🔀', label: 'Context switching' },
  { id: 'no_focus_time',     emoji: '⏰', label: 'Never enough focus time' },
  { id: 'no_boundaries',     emoji: '🫠', label: 'No work-life boundaries' },
];

const BUILDING_STEPS = [
  'Analyzing your rhythm...',
  'Protecting focus blocks...',
  'Optimizing your day...',
];

const SWIPE_CATEGORIES = [
  { id: 'exercise',   name: 'Exercise',      emoji: '🏋️', color: '#EF4444' },
  { id: 'deep_work',  name: 'Deep Work',     emoji: '🧠', color: '#14B8A6' },
  { id: 'learning',   name: 'Learning',      emoji: '📚', color: '#F59E0B' },
  { id: 'creative',   name: 'Creative Time', emoji: '🎨', color: '#EC4899' },
  { id: 'social',     name: 'Social',        emoji: '👥', color: '#8B5CF6' },
  { id: 'meditation', name: 'Meditation',    emoji: '🧘', color: '#6366F1' },
];

interface SwipeCardProps {
  category: typeof SWIPE_CATEGORIES[number];
  minutes: number;
  onTimeChange: (delta: number) => void;
  onLockIn: () => void;
}

function SwipeCard({ category, minutes, onTimeChange, onLockIn }: SwipeCardProps) {
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const [delta, setDelta] = useState({ x: 0, y: 0 });
  const [flyOut, setFlyOut] = useState(false);
  const [settling, setSettling] = useState(false);

  const onStart = (x: number, y: number) => { startRef.current = { x, y }; setSettling(false); };
  const onMove = (x: number, y: number) => {
    if (!startRef.current) return;
    setDelta({ x: x - startRef.current.x, y: y - startRef.current.y });
  };
  const onEnd = () => {
    if (!startRef.current) return;
    if (delta.x > 100) onTimeChange(30);
    else if (delta.x < -100) onTimeChange(-30);

    if (delta.y < -80) {
      setFlyOut(true);
      setTimeout(() => onLockIn(), 350);
    } else {
      setSettling(true);
      setDelta({ x: 0, y: 0 });
    }
    startRef.current = null;
  };

  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const timeLabel = hrs > 0 ? `${hrs}h ${mins > 0 ? `${mins}m` : ''}`.trim() : `${mins}m`;
  const rotDeg = delta.x * 0.08;
  const greenOp = Math.min(Math.max(delta.x / 200, 0), 0.4);
  const redOp = Math.min(Math.max(-delta.x / 200, 0), 0.4);

  return (
    <div
      className="relative w-72 h-96 rounded-3xl select-none touch-none cursor-grab active:cursor-grabbing"
      style={{
        background: `linear-gradient(135deg, ${category.color}33, ${category.color}11)`,
        border: `2px solid ${category.color}66`,
        transform: flyOut
          ? 'translateY(-120vh) scale(0.8)'
          : `translate(${delta.x}px, ${delta.y}px) rotate(${rotDeg}deg)`,
        transition: flyOut
          ? 'transform 0.35s ease-in'
          : settling
            ? 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)'
            : 'none',
        opacity: flyOut ? 0 : 1,
      }}
      onMouseDown={e => onStart(e.clientX, e.clientY)}
      onMouseMove={e => onMove(e.clientX, e.clientY)}
      onMouseUp={onEnd}
      onMouseLeave={onEnd}
      onTouchStart={e => onStart(e.touches[0].clientX, e.touches[0].clientY)}
      onTouchMove={e => onMove(e.touches[0].clientX, e.touches[0].clientY)}
      onTouchEnd={onEnd}
    >
      {/* Green tint overlay — swipe right */}
      <div className="absolute inset-0 rounded-3xl pointer-events-none"
        style={{ background: `rgba(16,185,129,${greenOp})` }} />
      {/* Red tint overlay — swipe left */}
      <div className="absolute inset-0 rounded-3xl pointer-events-none"
        style={{ background: `rgba(239,68,68,${redOp})` }} />

      <div className="relative z-10 flex flex-col items-center justify-center h-full p-6">
        <span className="text-7xl mb-4">{category.emoji}</span>
        <h3 className="text-2xl font-bold text-white mb-2">{category.name}</h3>
        <p className="text-5xl font-black mb-1" style={{ color: category.color }}>{timeLabel}</p>
        <p className="text-xs text-[#94A3B8] mb-4">per day</p>

        {/* Hints */}
        {delta.x > 50 && <p className="absolute top-6 right-6 text-green-400 font-bold text-lg rotate-12">+30 min</p>}
        {delta.x < -50 && <p className="absolute top-6 left-6 text-red-400 font-bold text-lg -rotate-12">-30 min</p>}
        {delta.y < -40 && <p className="absolute bottom-6 text-[#38BDF8] font-bold text-lg">⬆ Lock in!</p>}

        <div className="mt-auto space-y-1 text-center">
          <p className="text-xs text-[#475569]">← less · more →</p>
          <p className="text-xs text-[#475569]">↑ swipe up to lock in</p>
        </div>
      </div>
    </div>
  );
}

function ProgressDots({ current, total }: { current: number; total: number }) {
  if (current >= total) return null;
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 z-50">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className="transition-all duration-500" style={{
          width: i === current ? 24 : 8, height: 8, borderRadius: 4,
          backgroundColor: i <= current ? '#38BDF8' : 'rgba(255,255,255,0.2)',
          boxShadow: i === current ? '0 0 12px rgba(56,189,248,0.6)' : 'none',
        }} />
      ))}
    </div>
  );
}

export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [state, setState] = useState<OnboardingState>({
    step: 0, name: '', type: '', rhythm: '', selectedActivities: [],
    swipeIndex: 0, timeAllocations: {},
    struggle: '', isSubmitting: false, error: null, buildingStep: 0, robotState: 'greeting',
  });

  const [savedData, setSavedData] = useState<{
    user: UserProfile; events: ScheduleEvent[];
    persona?: { archetype?: string; archetypeEmoji?: string; drakoGreeting?: string; tagline?: string };
  } | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setState(prev => ({ ...prev, robotState: 'idle' })), 1000);
    return () => clearTimeout(t);
  }, []);

  const nextStep = useCallback(() => {
    setState(prev => ({ ...prev, step: prev.step + 1, error: null, robotState: 'greeting' }));
    setTimeout(() => setState(prev => ({ ...prev, robotState: 'idle' })), 800);
  }, []);

  const selectRole = useCallback((type: OnboardingSurvey['type']) => {
    setState(prev => ({ ...prev, type }));
    setTimeout(() => nextStep(), 300);
  }, [nextStep]);

  const selectWakeTime = useCallback((rhythm: OnboardingSurvey['rhythm']) => {
    setState(prev => ({ ...prev, rhythm }));
    setTimeout(() => nextStep(), 300);
  }, [nextStep]);

  const handleSwipeTimeChange = useCallback((catId: string, delta: number) => {
    setState(prev => {
      const cur = prev.timeAllocations[catId] || 30;
      const next = Math.max(0, Math.min(240, cur + delta));
      return { ...prev, timeAllocations: { ...prev.timeAllocations, [catId]: next } };
    });
  }, []);

  const handleSwipeLockIn = useCallback(() => {
    setState(prev => {
      const cat = SWIPE_CATEGORIES[prev.swipeIndex];
      const mins = prev.timeAllocations[cat.id] || 30;
      const activities = mins > 0
        ? [...new Set([...prev.selectedActivities, cat.id])]
        : prev.selectedActivities;
      return { ...prev, swipeIndex: prev.swipeIndex + 1, selectedActivities: activities };
    });
  }, []);

  const handleSwipeDone = useCallback(() => {
    nextStep();
  }, [nextStep]);

  const submitOnboarding = useCallback(async () => {
    setState(prev => ({ ...prev, isSubmitting: true, error: null, robotState: 'thinking' }));
    try {
      const survey = {
        name: state.name, type: state.type, rhythm: state.rhythm,
        nonNegotiables: state.selectedActivities.length > 0 ? state.selectedActivities : ['deep_work'],
        selectedActivities: state.selectedActivities,
        timeAllocations: state.timeAllocations,
        struggle: state.struggle || 'no_focus_time',
      };
      const res = await fetch('/api/onboarding', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(survey),
      });
      const data = await res.json();
      if (data.success) {
        setSavedData({ user: data.user, events: data.events || [], persona: data.persona || undefined });
        return;
      }
      throw new Error(data.error || 'Failed to create schedule');
    } catch (err) {
      setState(prev => ({
        ...prev, isSubmitting: false, robotState: 'idle',
        error: err instanceof Error ? err.message : 'Something went wrong.',
      }));
    }
  }, [state]);

  const handleNameSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (state.name.trim()) nextStep();
  }, [state.name, nextStep]);

  const selectStruggle = useCallback((id: OnboardingSurvey['struggle']) => {
    setState(prev => ({ ...prev, struggle: id }));
    setTimeout(() => { nextStep(); submitOnboarding(); }, 400);
  }, [nextStep, submitOnboarding]);

  const handleRetry = useCallback(() => {
    setState(prev => ({ ...prev, error: null, step: 4, robotState: 'idle' }));
  }, []);

  useEffect(() => {
    if (state.step === 5 && !savedData && !state.error) {
      const interval = setInterval(() => {
        setState(prev => prev.buildingStep < BUILDING_STEPS.length - 1
          ? { ...prev, buildingStep: prev.buildingStep + 1 } : prev);
      }, 800);
      return () => clearInterval(interval);
    }
  }, [state.step, savedData, state.error]);

  const renderStep = () => {
    switch (state.step) {
      /* ── Step 0: Name ─────────────────────────────────── */
      case 0:
        return (
          <div key="s0" className="animate-fadeInUp flex flex-col items-center text-center px-6">
            <DrakoRobot size="md" state={state.robotState} className="mb-4" />
            <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-[#38BDF8] to-[#818CF8] bg-clip-text text-transparent">
              Hey! I&apos;m DRAKO 🤖
            </h1>
            <p className="text-base text-[#94A3B8] mb-6 max-w-md">
              Your AI scheduling companion. Let&apos;s build your perfect day.
            </p>
            <form onSubmit={handleNameSubmit} className="w-full max-w-sm">
              <input type="text" value={state.name} autoFocus
                onChange={e => setState(prev => ({ ...prev, name: e.target.value }))}
                placeholder="What's your name?"
                className="w-full px-5 py-4 rounded-xl text-lg outline-none transition-all bg-[#1E293B]/50 text-white placeholder:text-[#475569] border-2 border-[#334155] focus:border-[#38BDF8]" />
              <button type="submit" disabled={!state.name.trim()}
                className="w-full mt-4 px-6 py-4 rounded-xl font-bold text-base transition-all disabled:opacity-30 hover:scale-[1.02]"
                style={{ background: state.name.trim() ? 'linear-gradient(135deg,#38BDF8,#818CF8)' : '#1E293B', color: 'white' }}>
                Let&apos;s go →
              </button>
            </form>
          </div>
        );

      /* ── Step 1: Role ─────────────────────────────────── */
      case 1:
        return (
          <div key="s1" className="animate-fadeInUp flex flex-col items-center text-center px-6">
            <DrakoRobot size="md" state={state.robotState} className="mb-4" />
            <h2 className="text-2xl font-bold mb-2 text-white">Nice to meet you, {state.name}!</h2>
            <p className="text-[#94A3B8] mb-8">What best describes you?</p>
            <div className="flex flex-wrap justify-center gap-3 max-w-md">
              {ROLES.map(({ id, label, icon }) => {
                const isSelected = state.type === id;
                return (
                  <button key={id} onClick={() => selectRole(id as OnboardingSurvey['type'])}
                    className="px-6 py-3 rounded-full font-medium transition-all hover:scale-105 min-h-[44px]"
                    style={{
                      background: isSelected ? 'linear-gradient(135deg,#38BDF8,#818CF8)' : 'rgba(30,41,59,0.8)',
                      color: 'white',
                      border: `2px solid ${isSelected ? '#38BDF8' : '#334155'}`,
                      boxShadow: isSelected ? '0 0 20px rgba(56,189,248,0.4), 0 4px 16px rgba(0,0,0,0.3)' : 'none',
                    }}>
                    {icon} {label}
                  </button>
                );
              })}
            </div>
          </div>
        );

      /* ── Step 2: Wake time ────────────────────────────── */
      case 2:
        return (
          <div key="s2" className="animate-fadeInUp flex flex-col items-center text-center px-6">
            <DrakoRobot size="md" state={state.robotState} className="mb-4" />
            <h2 className="text-2xl font-bold mb-2 text-white">When do you wake up?</h2>
            <p className="text-[#94A3B8] mb-8">I&apos;ll build your day around this</p>
            <div className="flex flex-wrap justify-center gap-3 max-w-lg">
              {WAKE_TIMES.map(time => (
                <button key={time} onClick={() => selectWakeTime(time)}
                  className="w-16 h-16 rounded-xl font-bold text-base transition-all hover:scale-105 flex flex-col items-center justify-center"
                  style={{
                    background: state.rhythm === time ? 'linear-gradient(135deg,#38BDF8,#818CF8)' : 'rgba(30,41,59,0.8)',
                    color: 'white', border: `2px solid ${state.rhythm === time ? '#38BDF8' : '#334155'}`,
                  }}>
                  <span className="text-xl mb-0.5">{parseInt(time) <= 6 ? '🌙' : parseInt(time) <= 8 ? '🌅' : '☀️'}</span>
                  <span className="text-xs uppercase">{time}</span>
                </button>
              ))}
            </div>
          </div>
        );

      /* ── Step 3: Tinder-style swipe cards ──────────────── */
      case 3: {
        const done = state.swipeIndex >= SWIPE_CATEGORIES.length;
        if (done) {
          const locked = SWIPE_CATEGORIES.filter(c => (state.timeAllocations[c.id] || 0) > 0);
          return (
            <div key="s3-summary" className="animate-fadeInUp flex flex-col items-center text-center px-6">
              <DrakoRobot size="md" state="greeting" className="mb-4" />
              <h2 className="text-2xl font-bold mb-2 text-white">Your time budget</h2>
              <p className="text-[#94A3B8] mb-6">Here&apos;s how you want to spend your day</p>
              <div className="w-full max-w-sm space-y-3 mb-8">
                {locked.map(cat => {
                  const mins = state.timeAllocations[cat.id] || 0;
                  const hrs = Math.floor(mins / 60);
                  const m = mins % 60;
                  const label = hrs > 0 ? `${hrs}h ${m > 0 ? `${m}m` : ''}`.trim() : `${m}m`;
                  return (
                    <div key={cat.id} className="flex items-center gap-3 px-4 py-3 rounded-xl"
                      style={{ background: `${cat.color}22`, border: `1px solid ${cat.color}44` }}>
                      <span className="text-2xl">{cat.emoji}</span>
                      <span className="text-white font-medium flex-1 text-left">{cat.name}</span>
                      <span className="font-bold" style={{ color: cat.color }}>{label}</span>
                    </div>
                  );
                })}
                {locked.length === 0 && (
                  <p className="text-[#475569] text-sm">No activities selected — defaults will be used</p>
                )}
              </div>
              <button onClick={handleSwipeDone}
                className="w-full max-w-sm py-4 rounded-2xl font-bold text-lg transition-all hover:scale-[1.02]"
                style={{ background: 'linear-gradient(135deg,#38BDF8,#818CF8)', color: 'white', boxShadow: '0 0 40px rgba(56,189,248,0.3)' }}>
                Looks good — next →
              </button>
            </div>
          );
        }

        const cat = SWIPE_CATEGORIES[state.swipeIndex];
        const mins = state.timeAllocations[cat.id] ?? 30;
        return (
          <div key="s3-swipe" className="animate-fadeInUp flex flex-col items-center text-center px-6">
            <p className="text-xs text-[#475569] uppercase tracking-wider font-semibold mb-4">
              {state.swipeIndex + 1} / {SWIPE_CATEGORIES.length}
            </p>
            <h2 className="text-xl font-bold text-white mb-1">How much time for…</h2>
            <p className="text-[#94A3B8] mb-6">Swipe to set, swipe up to lock in</p>
            <SwipeCard
              key={cat.id}
              category={cat}
              minutes={mins}
              onTimeChange={(d) => handleSwipeTimeChange(cat.id, d)}
              onLockIn={handleSwipeLockIn}
            />
          </div>
        );
      }

      /* ── Step 4: Struggle ────────────────────────────── */
      case 4:
        return (
          <div key="s4" className="animate-fadeInUp flex flex-col items-center text-center px-6">
            <DrakoRobot size="md" state={state.robotState} className="mb-4" />
            <h2 className="text-2xl font-bold mb-2 text-white">What&apos;s your biggest struggle?</h2>
            <p className="text-[#94A3B8] mb-8">I&apos;ll help you tackle it</p>
            <div className="grid grid-cols-2 gap-4 w-full max-w-md">
              {STRUGGLES.map(({ id, emoji, label }) => (
                <button key={id} onClick={() => selectStruggle(id as OnboardingSurvey['struggle'])}
                  className="p-5 rounded-2xl transition-all hover:scale-[1.02] text-center"
                  style={{
                    background: state.struggle === id ? 'linear-gradient(135deg,#38BDF8,#818CF8)' : 'rgba(30,41,59,0.8)',
                    color: 'white', border: `2px solid ${state.struggle === id ? '#38BDF8' : '#334155'}`,
                  }}>
                  <span className="text-3xl block mb-2">{emoji}</span>
                  <span className="font-medium text-sm">{label}</span>
                </button>
              ))}
            </div>
          </div>
        );

      /* ── Step 5: Building / Done ─────────────────────── */
      case 5:
        if (state.error) return (
          <div key="s-err" className="animate-fadeInUp flex flex-col items-center text-center px-6">
            <DrakoRobot size="lg" state="idle" className="mb-6 opacity-60" />
            <h2 className="text-2xl font-bold mb-3 text-white">Something went wrong</h2>
            <p className="text-[#94A3B8] mb-8 max-w-md">{state.error}</p>
            <button onClick={handleRetry} className="px-8 py-4 rounded-2xl font-bold text-lg"
              style={{ background: 'linear-gradient(135deg,#38BDF8,#818CF8)', color: 'white' }}>
              Try Again →
            </button>
          </div>
        );

        if (savedData) {
          const p = savedData.persona;
          return (
            <div key="s-done" className="animate-fadeInUp flex flex-col items-center text-center px-6">
              {p?.archetypeEmoji
                ? <span className="text-7xl mb-4 block">{p.archetypeEmoji}</span>
                : <DrakoRobot size="xl" state="greeting" className="mb-6" />}
              <h2 className="text-3xl font-bold mb-2 bg-gradient-to-r from-[#38BDF8] to-[#818CF8] bg-clip-text text-transparent">
                {p?.archetype || `Your day is ready, ${state.name}!`}
              </h2>
              {p?.drakoGreeting && (
                <div className="mt-4 mb-6 max-w-sm rounded-2xl px-6 py-4"
                  style={{ background: 'rgba(30,41,59,0.9)', border: '1px solid #334155' }}>
                  <p className="text-[#E2E8F0] text-lg italic">&ldquo;{p.drakoGreeting}&rdquo;</p>
                </div>
              )}
              <p className="text-sm text-[#94A3B8] mb-6">
                {savedData.events.length} events · now let&apos;s place your blocks in time
              </p>
              <button onClick={() => onComplete(savedData.user, savedData.events)}
                className="px-10 py-5 rounded-2xl font-bold text-xl transition-all hover:scale-105"
                style={{ background: 'linear-gradient(135deg,#38BDF8,#818CF8)', color: 'white', boxShadow: '0 0 40px rgba(56,189,248,0.4)' }}>
                🗓️ Place My Blocks →
              </button>
            </div>
          );
        }

        return (
          <div key="s-build" className="animate-fadeInUp flex flex-col items-center text-center px-6">
            <DrakoRobot size="xl" state="thinking" className="mb-8" />
            <h2 className="text-2xl font-bold mb-3 text-white">Building your perfect day...</h2>
            <p className="text-[#38BDF8] mb-8 animate-pulse">🤖 Claude is analyzing your schedule</p>
            <div className="w-full max-w-sm mb-8">
              <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(30,41,59,0.8)' }}>
                <div className="h-full rounded-full transition-all duration-700"
                  style={{ background: 'linear-gradient(90deg,#38BDF8,#818CF8)', width: `${((state.buildingStep+1)/BUILDING_STEPS.length)*100}%` }} />
              </div>
            </div>
            <div className="space-y-3">
              {BUILDING_STEPS.map((step, i) => (
                <p key={i} className="transition-all duration-500 flex items-center gap-3"
                  style={{ color: i <= state.buildingStep ? '#F8FAFC' : '#475569', opacity: i <= state.buildingStep ? 1 : 0.4 }}>
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-sm"
                    style={{ background: i < state.buildingStep ? '#10B981' : i === state.buildingStep ? '#38BDF8' : '#334155', color: 'white' }}>
                    {i < state.buildingStep ? '✓' : i === state.buildingStep ? '•' : '○'}
                  </span>
                  {step}
                </p>
              ))}
            </div>
          </div>
        );

      default: return null;
    }
  };

  return (
    <div className="fixed inset-0 overflow-y-auto"
      style={{ background: 'linear-gradient(135deg,#0F172A 0%,#1E1B4B 50%,#0F172A 100%)' }}>
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl opacity-20"
          style={{ background: 'radial-gradient(circle,#38BDF8,transparent)', animation: 'orbDrift1 12s ease-in-out infinite' }} />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full blur-3xl opacity-20"
          style={{ background: 'radial-gradient(circle,#818CF8,transparent)', animation: 'orbDrift2 15s ease-in-out infinite' }} />
        <div className="absolute inset-0"
          style={{ backgroundImage: 'radial-gradient(circle,rgba(255,255,255,0.03) 1px,transparent 1px)', backgroundSize: '24px 24px' }} />
      </div>
      <div className="relative z-10 min-h-full flex items-start justify-center py-10 px-4">
        <div className="w-full max-w-lg pt-4">{renderStep()}</div>
      </div>
      <ProgressDots current={state.step} total={5} />
    </div>
  );
}
