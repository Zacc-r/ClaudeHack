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
  nonNegotiables: string[];
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

const SWIPE_CATEGORIES = [
  { id: 'exercise', name: 'Exercise', emoji: '🏋️', color: '#EF4444' },
  { id: 'deep_work', name: 'Deep Work', emoji: '🧠', color: '#14B8A6' },
  { id: 'learning', name: 'Learning', emoji: '📚', color: '#F59E0B' },
  { id: 'creative', name: 'Creative Time', emoji: '🎨', color: '#EC4899' },
  { id: 'social', name: 'Social', emoji: '👥', color: '#8B5CF6' },
  { id: 'meditation', name: 'Meditation', emoji: '🧘', color: '#6366F1' },
];

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

function ProgressDots({ current, total }: { current: number; total: number }) {
  if (current >= total) return null;
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 z-50 pb-safe">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className="transition-all duration-500" style={{
          width: i === current ? 24 : 8, height: 8, borderRadius: 4,
          backgroundColor: i <= current ? '#38BDF8' : 'rgba(255,255,255,0.2)',
          boxShadow: i === current ? '0 0 12px rgba(56, 189, 248, 0.6)' : 'none',
        }} />
      ))}
    </div>
  );
}

/* ─── Swipe Card ─── */

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

  const handleStart = useCallback((clientX: number, clientY: number) => {
    startRef.current = { x: clientX, y: clientY };
    setDelta({ x: 0, y: 0 });
  }, []);

  const handleMove = useCallback((clientX: number, clientY: number) => {
    if (!startRef.current) return;
    setDelta({ x: clientX - startRef.current.x, y: clientY - startRef.current.y });
  }, []);

  const handleEnd = useCallback(() => {
    if (!startRef.current) return;
    const dx = delta.x;
    const dy = delta.y;
    startRef.current = null;

    if (dy < -80) {
      setFlyOut(true);
      setTimeout(() => {
        onLockIn();
        setFlyOut(false);
        setDelta({ x: 0, y: 0 });
      }, 300);
      return;
    }

    if (Math.abs(dx) > 100) {
      onTimeChange(dx > 0 ? 30 : -30);
      setSettling(true);
      setDelta({ x: 0, y: 0 });
      setTimeout(() => setSettling(false), 400);
      return;
    }

    setDelta({ x: 0, y: 0 });
  }, [delta, onTimeChange, onLockIn]);

  const isDragging = startRef.current !== null && !flyOut;
  const showRight = isDragging && delta.x > 50;
  const showLeft = isDragging && delta.x < -50;
  const showUp = isDragging && delta.y < -40;

  return (
    <div
      className="relative w-full max-w-sm mx-auto select-none touch-none cursor-grab active:cursor-grabbing"
      style={{
        transform: flyOut
          ? 'translateY(-100vh) scale(0.8)'
          : `translateX(${delta.x}px) rotate(${delta.x * 0.1}deg)`,
        opacity: flyOut ? 0 : 1,
        transition: (isDragging && !flyOut)
          ? 'none'
          : settling
            ? 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)'
            : 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s',
      }}
      onTouchStart={(e) => handleStart(e.touches[0].clientX, e.touches[0].clientY)}
      onTouchMove={(e) => handleMove(e.touches[0].clientX, e.touches[0].clientY)}
      onTouchEnd={handleEnd}
      onMouseDown={(e) => { e.preventDefault(); handleStart(e.clientX, e.clientY); }}
      onMouseMove={(e) => handleMove(e.clientX, e.clientY)}
      onMouseUp={handleEnd}
      onMouseLeave={() => { if (startRef.current) handleEnd(); }}
    >
      {/* Green tint overlay */}
      {showRight && (
        <div className="absolute inset-0 rounded-3xl z-10 pointer-events-none"
          style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)' }} />
      )}
      {/* Red tint overlay */}
      {showLeft && (
        <div className="absolute inset-0 rounded-3xl z-10 pointer-events-none"
          style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)' }} />
      )}

      {/* Swipe hints */}
      {showRight && (
        <div className="absolute top-6 right-6 z-20 text-[#10B981] font-bold text-xl animate-pulse">
          +30 min
        </div>
      )}
      {showLeft && (
        <div className="absolute top-6 left-6 z-20 text-[#EF4444] font-bold text-xl animate-pulse">
          {minutes > 0 ? '-30 min' : 'Skip'}
        </div>
      )}
      {showUp && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 text-[#38BDF8] font-bold text-sm animate-pulse">
          ↑ Lock in!
        </div>
      )}

      <div
        className="rounded-3xl p-10 flex flex-col items-center"
        style={{
          backgroundColor: 'rgba(30, 41, 59, 0.8)',
          border: `2px solid ${minutes > 0 ? category.color : '#334155'}`,
          boxShadow: minutes > 0
            ? `0 0 30px ${category.color}30, inset 0 0 20px ${category.color}10`
            : '0 4px 24px rgba(0,0,0,0.3)',
        }}
      >
        <span className="text-6xl mb-4" style={{ filter: `drop-shadow(0 0 12px ${category.color}40)` }}>
          {category.emoji}
        </span>
        <h3 className="text-2xl font-bold text-white mb-4">{category.name}</h3>
        <div
          className="text-3xl font-bold transition-all duration-300"
          style={{ color: minutes > 0 ? category.color : '#475569' }}
        >
          {minutes > 0 ? `${minutes} min` : 'Skip'}
        </div>
      </div>
    </div>
  );
}

/* ─── Main Flow ─── */

export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [state, setState] = useState<OnboardingState>({
    step: 0,
    name: '',
    type: '',
    rhythm: '',
    nonNegotiables: [],
    struggle: '',
    isSubmitting: false,
    error: null,
    buildingStep: 0,
    robotState: 'greeting',
  });

  const [savedData, setSavedData] = useState<{
    user: UserProfile;
    events: ScheduleEvent[];
    persona?: { archetype?: string; archetypeEmoji?: string; drakoGreeting?: string; tagline?: string };
  } | null>(null);

  // Swipe card state
  const [swipeIndex, setSwipeIndex] = useState(0);
  const [timeAllocations, setTimeAllocations] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    SWIPE_CATEGORIES.forEach(c => { init[c.id] = 0; });
    return init;
  });

  useEffect(() => {
    const timeout = setTimeout(() => setState(prev => ({ ...prev, robotState: 'idle' })), 1000);
    return () => clearTimeout(timeout);
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

  const handleSwipeTimeChange = useCallback((categoryId: string, delta: number) => {
    setTimeAllocations(prev => ({
      ...prev,
      [categoryId]: Math.max(0, Math.min(240, (prev[categoryId] || 0) + delta)),
    }));
  }, []);

  const handleSwipeLockIn = useCallback(() => {
    setSwipeIndex(prev => prev + 1);
  }, []);

  const handleSwipeDone = useCallback(() => {
    const active = Object.entries(timeAllocations)
      .filter(([, mins]) => mins > 0)
      .map(([id]) => id);
    setState(prev => ({ ...prev, nonNegotiables: active.length > 0 ? active : ['deep_work'] }));
    nextStep();
  }, [timeAllocations, nextStep]);

  const submitOnboarding = useCallback(async () => {
    setState(prev => ({ ...prev, isSubmitting: true, error: null, robotState: 'thinking' }));
    try {
      const active = Object.entries(timeAllocations)
        .filter(([, mins]) => mins > 0)
        .map(([id]) => id);
      const survey = {
        name: state.name,
        type: state.type,
        rhythm: state.rhythm,
        nonNegotiables: active.length > 0 ? active : ['deep_work'],
        selectedActivities: active,
        struggle: state.struggle || 'no_focus_time',
        timeAllocations,
      };

      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
        ...prev,
        isSubmitting: false,
        robotState: 'idle',
        error: err instanceof Error ? err.message : 'Something went wrong. Please try again.',
      }));
    }
  }, [state, timeAllocations]);

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
        setState(prev => {
          if (prev.buildingStep < BUILDING_STEPS.length - 1) {
            return { ...prev, buildingStep: prev.buildingStep + 1 };
          }
          return prev;
        });
      }, 800);
      return () => clearInterval(interval);
    }
  }, [state.step, savedData, state.error]);

  const renderStep = () => {
    switch (state.step) {
      // ─── Step 0: Name ───────────────────────────────────────────────
      case 0:
        return (
          <div key="step-0" className="animate-fadeInUp flex flex-col items-center text-center px-6">
            <DrakoRobot size="md" state={state.robotState} className="mb-4" />
            <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-[#38BDF8] to-[#818CF8] bg-clip-text text-transparent">
              Hey! I&apos;m DRAKO 🤖
            </h1>
            <p className="text-base text-[#94A3B8] mb-6 max-w-md">
              Your AI scheduling companion. Let&apos;s build your perfect day together.
            </p>
            <form onSubmit={handleNameSubmit} className="w-full max-w-sm">
              <input
                type="text"
                value={state.name}
                onChange={(e) => setState(prev => ({ ...prev, name: e.target.value }))}
                placeholder="What's your name?"
                autoFocus
                className="w-full px-5 py-4 rounded-xl text-lg outline-none transition-all bg-[#1E293B]/50 text-white placeholder:text-[#475569] border-2 border-[#334155] focus:border-[#38BDF8] focus:shadow-[0_0_30px_rgba(56,189,248,0.2)]"
              />
              <button
                type="submit"
                disabled={!state.name.trim()}
                className="w-full mt-4 px-6 py-4 rounded-xl font-bold text-base transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  background: state.name.trim() ? 'linear-gradient(135deg, #38BDF8, #818CF8)' : '#1E293B',
                  color: 'white',
                  boxShadow: state.name.trim() ? '0 0 40px rgba(56, 189, 248, 0.3)' : 'none',
                }}>
                Let&apos;s go →
              </button>
            </form>
          </div>
        );

      // ─── Step 1: Role ────────────────────────────────────────────────
      case 1:
        return (
          <div key="step-1" className="animate-fadeInUp flex flex-col items-center text-center px-6">
            <DrakoRobot size="md" state={state.robotState} className="mb-4" />
            <h2 className="text-2xl font-bold mb-2 text-white">Nice to meet you, {state.name}!</h2>
            <p className="text-[#94A3B8] mb-8">What best describes you?</p>
            <div className="flex flex-wrap justify-center gap-3 max-w-md">
              {ROLES.map(({ id, label, icon }) => {
                const isSelected = state.type === id;
                return (
                  <button key={id} onClick={() => selectRole(id as OnboardingSurvey['type'])}
                    className="px-6 py-3 rounded-full font-medium transition-all hover:scale-105 active:scale-95"
                    style={{
                      background: isSelected ? 'linear-gradient(135deg, #38BDF8, #818CF8)' : 'rgba(30, 41, 59, 0.8)',
                      color: 'white',
                      border: `2px solid ${isSelected ? '#38BDF8' : '#334155'}`,
                      boxShadow: isSelected ? '0 0 20px rgba(56, 189, 248, 0.4)' : 'none',
                    }}>
                    {icon} {label}
                  </button>
                );
              })}
            </div>
          </div>
        );

      // ─── Step 2: Wake time ───────────────────────────────────────────
      case 2:
        return (
          <div key="step-2" className="animate-fadeInUp flex flex-col items-center text-center px-6">
            <DrakoRobot size="md" state={state.robotState} className="mb-4" />
            <h2 className="text-2xl font-bold mb-2 text-white">When do you wake up?</h2>
            <p className="text-[#94A3B8] mb-8">I&apos;ll build your day around this</p>
            <div className="flex flex-wrap justify-center gap-3 max-w-lg">
              {WAKE_TIMES.map((time) => {
                const isSelected = state.rhythm === time;
                return (
                  <button key={time} onClick={() => selectWakeTime(time)}
                    className="w-16 h-16 rounded-xl font-bold text-base transition-all hover:scale-105 active:scale-95 flex flex-col items-center justify-center"
                    style={{
                      background: isSelected ? 'linear-gradient(135deg, #38BDF8, #818CF8)' : 'rgba(30, 41, 59, 0.8)',
                      color: 'white',
                      border: `2px solid ${isSelected ? '#38BDF8' : '#334155'}`,
                      boxShadow: isSelected ? '0 0 20px rgba(56, 189, 248, 0.4)' : 'none',
                    }}>
                    <span className="text-xl mb-0.5">
                      {parseInt(time) <= 6 ? '🌙' : parseInt(time) <= 8 ? '🌅' : '☀️'}
                    </span>
                    <span className="text-xs uppercase">{time}</span>
                  </button>
                );
              })}
            </div>
          </div>
        );

      // ─── Step 3: Swipe Cards ──────────────────────────────────────────
      case 3: {
        const swipeDone = swipeIndex >= SWIPE_CATEGORIES.length;

        if (swipeDone) {
          const totalMins = Object.values(timeAllocations).reduce((a, b) => a + b, 0);
          const activeCount = Object.values(timeAllocations).filter(m => m > 0).length;
          const hours = Math.floor(totalMins / 60);
          const mins = totalMins % 60;
          const timeStr = hours > 0
            ? `${hours}h${mins > 0 ? ` ${mins}m` : ''}`
            : totalMins > 0 ? `${mins}m` : '0m';

          return (
            <div key="step-3-summary" className="animate-fadeInUp flex flex-col items-center text-center px-6">
              <span className="text-5xl mb-4">✨</span>
              <h2 className="text-2xl font-bold mb-3 text-white">
                {activeCount > 0
                  ? `Nice! You allocated ${timeStr} across ${activeCount} ${activeCount === 1 ? 'activity' : 'activities'}`
                  : 'No time allocated — DRAKO will suggest defaults'}
              </h2>

              {activeCount > 0 && (
                <div className="flex flex-wrap justify-center gap-2 mb-6">
                  {SWIPE_CATEGORIES.filter(c => timeAllocations[c.id] > 0).map(c => (
                    <span
                      key={c.id}
                      className="px-3 py-1.5 rounded-full text-sm font-medium"
                      style={{
                        backgroundColor: `${c.color}20`,
                        color: c.color,
                        border: `1px solid ${c.color}40`,
                      }}
                    >
                      {c.emoji} {timeAllocations[c.id]}m
                    </span>
                  ))}
                </div>
              )}

              <button
                onClick={handleSwipeDone}
                className="w-full max-w-sm px-8 py-5 rounded-2xl font-bold text-lg transition-all hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  background: 'linear-gradient(135deg, #38BDF8, #818CF8)',
                  color: 'white',
                  boxShadow: '0 0 40px rgba(56, 189, 248, 0.3)',
                }}>
                Continue →
              </button>
            </div>
          );
        }

        const cat = SWIPE_CATEGORIES[swipeIndex];

        return (
          <div key={`step-3-${cat.id}`} className="animate-fadeInUp flex flex-col items-center text-center px-4">
            {/* Counter */}
            <div className="mb-6">
              <span
                className="text-sm font-bold px-3 py-1 rounded-full"
                style={{ backgroundColor: 'rgba(56, 189, 248, 0.15)', color: '#38BDF8' }}
              >
                {swipeIndex + 1} / {SWIPE_CATEGORIES.length}
              </span>
            </div>

            {/* Swipe card */}
            <SwipeCard
              key={cat.id}
              category={cat}
              minutes={timeAllocations[cat.id]}
              onTimeChange={(d) => handleSwipeTimeChange(cat.id, d)}
              onLockIn={handleSwipeLockIn}
            />

            {/* Hint */}
            <p className="mt-8 text-sm text-[#64748B]">
              ← less time &nbsp;|&nbsp; swipe up to lock &nbsp;|&nbsp; more time →
            </p>
          </div>
        );
      }

      // ─── Step 4: Struggle ────────────────────────────────────────────
      case 4:
        return (
          <div key="step-4" className="animate-fadeInUp flex flex-col items-center text-center px-6">
            <DrakoRobot size="md" state={state.robotState} className="mb-4" />
            <h2 className="text-2xl font-bold mb-2 text-white">What&apos;s your biggest struggle?</h2>
            <p className="text-[#94A3B8] mb-8">I&apos;ll help you tackle it</p>
            <div className="grid grid-cols-2 gap-4 w-full max-w-md">
              {STRUGGLES.map(({ id, emoji, label }) => {
                const isSelected = state.struggle === id;
                return (
                  <button key={id} onClick={() => selectStruggle(id as OnboardingSurvey['struggle'])}
                    className="p-5 rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98] text-center"
                    style={{
                      background: isSelected ? 'linear-gradient(135deg, #38BDF8, #818CF8)' : 'rgba(30, 41, 59, 0.8)',
                      color: 'white',
                      border: `2px solid ${isSelected ? '#38BDF8' : '#334155'}`,
                      boxShadow: isSelected ? '0 0 20px rgba(56, 189, 248, 0.4)' : 'none',
                    }}>
                    <span className="text-3xl block mb-2">{emoji}</span>
                    <span className="font-medium text-sm">{label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        );

      // ─── Step 5: Building / Done ─────────────────────────────────────
      case 5:
        if (state.error) {
          return (
            <div key="step-error" className="animate-fadeInUp flex flex-col items-center text-center px-6">
              <DrakoRobot size="lg" state="idle" className="mb-6 opacity-60" />
              <h2 className="text-2xl font-bold mb-3 text-white">Hmm, something went wrong</h2>
              <p className="text-[#94A3B8] mb-8 max-w-md">{state.error}</p>
              <button onClick={handleRetry}
                className="px-8 py-4 rounded-2xl font-bold text-lg transition-all hover:scale-105"
                style={{ background: 'linear-gradient(135deg, #38BDF8, #818CF8)', color: 'white' }}>
                Try Again →
              </button>
            </div>
          );
        }

        if (savedData) {
          const persona = savedData.persona;
          return (
            <div key="step-done" className="animate-fadeInUp flex flex-col items-center text-center px-6">
              {persona?.archetypeEmoji ? (
                <div className="relative mb-4 animate-celebrateBounceIn">
                  <div className="absolute inset-0 -m-8 rounded-full animate-pulse"
                    style={{ background: 'radial-gradient(circle, rgba(56,189,248,0.3) 0%, rgba(129,140,248,0.15) 40%, transparent 70%)' }} />
                  <span className="relative text-7xl block" style={{ filter: 'drop-shadow(0 0 24px rgba(56, 189, 248, 0.5))' }}>
                    {persona.archetypeEmoji}
                  </span>
                </div>
              ) : (
                <DrakoRobot size="xl" state="greeting" className="mb-6 animate-celebrateBounceIn" />
              )}

              <h2 className="text-3xl font-bold mb-2 bg-gradient-to-r from-[#38BDF8] to-[#818CF8] bg-clip-text text-transparent">
                {persona?.archetype || `Your day is ready, ${state.name}!`}
              </h2>

              {persona?.drakoGreeting ? (
                <div className="relative mt-4 mb-6 max-w-sm">
                  <div className="rounded-2xl px-6 py-4"
                    style={{ backgroundColor: 'rgba(30, 41, 59, 0.9)', border: '1px solid #334155' }}>
                    <p className="text-[#E2E8F0] text-lg italic">&ldquo;{persona.drakoGreeting}&rdquo;</p>
                  </div>
                </div>
              ) : (
                <p className="text-[#94A3B8] mb-8 max-w-md">
                  I&apos;ve built a personalized schedule based on your life.
                </p>
              )}

              <p className="text-sm text-[#94A3B8] mb-6">
                {savedData.events.length} events · now let&apos;s place your blocks
              </p>

              <button
                onClick={() => onComplete(savedData.user, savedData.events)}
                className="px-10 py-5 rounded-2xl font-bold text-xl transition-all hover:scale-105 active:scale-95"
                style={{ background: 'linear-gradient(135deg, #38BDF8, #818CF8)', color: 'white', boxShadow: '0 0 40px rgba(56,189,248,0.4)' }}>
                🗓️ Place My Blocks →
              </button>
            </div>
          );
        }

        return (
          <div key="step-building" className="animate-fadeInUp flex flex-col items-center text-center px-6">
            <DrakoRobot size="xl" state="thinking" className="mb-8" />
            <h2 className="text-2xl font-bold mb-3 text-white">Building your perfect day...</h2>
            <p className="text-[#38BDF8] mb-8 animate-pulse">🤖 Claude is analyzing your preferences</p>
            <div className="w-full max-w-sm mb-8">
              <div className="h-2 rounded-full overflow-hidden relative" style={{ backgroundColor: 'rgba(30, 41, 59, 0.8)' }}>
                <div className="h-full rounded-full transition-all duration-700 relative overflow-hidden"
                  style={{ background: 'linear-gradient(90deg, #38BDF8, #818CF8)', width: `${((state.buildingStep + 1) / BUILDING_STEPS.length) * 100}%` }}>
                  <div className="absolute inset-0" style={{
                    background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)',
                    animation: 'shimmerSweep 1.5s ease-in-out infinite',
                  }} />
                </div>
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

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 overflow-y-auto"
      style={{ background: 'linear-gradient(135deg, #0F172A 0%, #1E1B4B 50%, #0F172A 100%)' }}>
      {/* Animated background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl opacity-20"
          style={{ background: 'radial-gradient(circle, #38BDF8, transparent)', animation: 'orbDrift1 12s ease-in-out infinite' }} />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full blur-3xl opacity-20"
          style={{ background: 'radial-gradient(circle, #818CF8, transparent)', animation: 'orbDrift2 15s ease-in-out infinite' }} />
        <div className="absolute inset-0"
          style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
      </div>

      <div className="relative z-10 min-h-full flex items-center justify-center py-10 px-4">
        <div className="w-full max-w-lg">
          {renderStep()}
        </div>
      </div>

      <ProgressDots current={state.step} total={5} />
    </div>
  );
}
