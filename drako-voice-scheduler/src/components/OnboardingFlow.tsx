'use client';

import { useState, useCallback, useEffect } from 'react';
import { DrakoRobot } from './DrakoRobot';
import type { ScheduleEvent } from './ScheduleCard';

export interface UserProfile {
  id: string; name: string; type: string; rhythm: string; bedtime?: string;
  nonNegotiables: string[]; selectedActivities?: string[]; struggle: string; createdAt: string;
}

interface OnboardingFlowProps { onComplete: (user: UserProfile, events: ScheduleEvent[]) => void; }

interface OnboardingState {
  step: number; name: string; type: string; rhythm: string; bedtime: string;
  selectedActivities: string[]; struggle: string;
  isSubmitting: boolean; error: string | null; buildingStep: number;
  robotState: 'idle' | 'greeting' | 'thinking' | 'listening';
}

const ROLES = [
  { id: 'student', label: 'Student', icon: '🎓' },
  { id: 'professional', label: 'Professional', icon: '💼' },
  { id: 'creative', label: 'Creative', icon: '🎨' },
  { id: 'athlete', label: 'Athlete', icon: '🏃' },
  { id: 'other', label: 'Other', icon: '✨' },
];

const WAKE_TIMES = ['6am', '7am', '8am', '9am', '10am'] as const;
const BED_TIMES  = ['9pm', '10pm', '11pm', '12am', '1am'] as const;

const ACTIVITY_OPTIONS = [
  { id: 'work',         emoji: '💼', label: 'Work',           color: '#3B82F6',  group: 'Core' },
  { id: 'school',       emoji: '🎓', label: 'School/Classes', color: '#6366F1',  group: 'Core' },
  { id: 'commute',      emoji: '🚌', label: 'Commute',        color: '#64748B',  group: 'Core' },
  { id: 'gym',          emoji: '🏋️', label: 'Gym',            color: '#EF4444',  group: 'Health' },
  { id: 'running',      emoji: '🏃', label: 'Running/Walk',   color: '#F97316',  group: 'Health' },
  { id: 'meditation',   emoji: '🧘', label: 'Meditation',     color: '#8B5CF6',  group: 'Health' },
  { id: 'cooking',      emoji: '🍳', label: 'Cooking',        color: '#F59E0B',  group: 'Life' },
  { id: 'errands',      emoji: '🛒', label: 'Errands',        color: '#94A3B8',  group: 'Life' },
  { id: 'deep_work',    emoji: '🧠', label: 'Deep Focus',     color: '#14B8A6',  group: 'Focus' },
  { id: 'learning',     emoji: '📖', label: 'Learning',       color: '#10B981',  group: 'Focus' },
  { id: 'creative',     emoji: '🎨', label: 'Creative',       color: '#EC4899',  group: 'Focus' },
  { id: 'side_project', emoji: '🚀', label: 'Side Project',   color: '#8B5CF6',  group: 'Focus' },
  { id: 'reading',      emoji: '📚', label: 'Reading',        color: '#22D3EE',  group: 'Focus' },
  { id: 'social',       emoji: '👥', label: 'Friends/Social', color: '#A855F7',  group: 'Social' },
  { id: 'family',       emoji: '🏠', label: 'Family Time',    color: '#84CC16',  group: 'Social' },
  { id: 'gaming',       emoji: '🎮', label: 'Gaming/Fun',     color: '#F97316',  group: 'Leisure' },
  { id: 'shows',        emoji: '📺', label: 'Shows/Movies',   color: '#38BDF8',  group: 'Leisure' },
];

const STRUGGLES = [
  { id: 'too_many_meetings', emoji: '😵', label: 'Too many meetings' },
  { id: 'context_switching', emoji: '🔀', label: 'Context switching' },
  { id: 'no_focus_time',     emoji: '⏰', label: 'Never enough focus time' },
  { id: 'no_boundaries',     emoji: '🫠', label: 'No work-life boundaries' },
];

const BUILDING_STEPS = ['Analyzing your rhythm...', 'Protecting focus blocks...', 'Optimizing your day...'];

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
    step: 0, name: '', type: '', rhythm: '', bedtime: '',
    selectedActivities: [], struggle: '', isSubmitting: false,
    error: null, buildingStep: 0, robotState: 'greeting',
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

  const selectRole = useCallback((type: string) => {
    setState(prev => ({ ...prev, type }));
    setTimeout(() => nextStep(), 300);
  }, [nextStep]);

  const toggleActivity = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      selectedActivities: prev.selectedActivities.includes(id)
        ? prev.selectedActivities.filter(a => a !== id)
        : [...prev.selectedActivities, id],
    }));
  }, []);

  const submitOnboarding = useCallback(async (struggle: string, currentState: OnboardingState) => {
    setState(prev => ({ ...prev, isSubmitting: true, error: null, robotState: 'thinking' }));
    try {
      const survey = {
        name: currentState.name, type: currentState.type,
        rhythm: currentState.rhythm, bedtime: currentState.bedtime,
        nonNegotiables: currentState.selectedActivities.length > 0 ? currentState.selectedActivities : ['deep_work'],
        selectedActivities: currentState.selectedActivities,
        struggle: struggle || 'no_focus_time',
      };
      const res = await fetch('/api/onboarding', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(survey),
      });
      const data = await res.json();
      if (data.success) { setSavedData({ user: data.user, events: data.events || [], persona: data.persona }); return; }
      throw new Error(data.error || 'Failed');
    } catch (err) {
      setState(prev => ({ ...prev, isSubmitting: false, robotState: 'idle', error: err instanceof Error ? err.message : 'Something went wrong.' }));
    }
  }, []);

  const handleNameSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (state.name.trim()) nextStep();
  }, [state.name, nextStep]);

  const selectStruggle = useCallback((id: string) => {
    const newState = { ...state, struggle: id };
    setState(prev => ({ ...prev, struggle: id }));
    setTimeout(() => { nextStep(); submitOnboarding(id, newState); }, 400);
  }, [state, nextStep, submitOnboarding]);

  const handleRetry = useCallback(() => setState(prev => ({ ...prev, error: null, step: 4, robotState: 'idle' })), []);

  useEffect(() => {
    if (state.step === 5 && !savedData && !state.error) {
      const interval = setInterval(() => {
        setState(prev => prev.buildingStep < BUILDING_STEPS.length - 1 ? { ...prev, buildingStep: prev.buildingStep + 1 } : prev);
      }, 800);
      return () => clearInterval(interval);
    }
  }, [state.step, savedData, state.error]);

  const renderStep = () => {
    switch (state.step) {
      /* Step 0: Name */
      case 0: return (
        <div key="s0" className="animate-fadeInUp flex flex-col items-center text-center px-6">
          <DrakoRobot size="md" state={state.robotState} className="mb-4" />
          <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-[#38BDF8] to-[#818CF8] bg-clip-text text-transparent">Hey! I'm DRAKO 🤖</h1>
          <p className="text-base text-[#94A3B8] mb-6 max-w-md">Your AI scheduling companion. Let's build your perfect day.</p>
          <form onSubmit={handleNameSubmit} className="w-full max-w-sm">
            <input type="text" value={state.name} autoFocus
              onChange={e => setState(prev => ({ ...prev, name: e.target.value }))}
              placeholder="What's your name?"
              className="w-full px-5 py-4 rounded-xl text-lg outline-none transition-all bg-[#1E293B]/50 text-white placeholder:text-[#475569] border-2 border-[#334155] focus:border-[#38BDF8]" />
            <button type="submit" disabled={!state.name.trim()} className="w-full mt-4 px-6 py-4 rounded-xl font-bold text-base transition-all disabled:opacity-30 hover:scale-[1.02]"
              style={{ background: state.name.trim() ? 'linear-gradient(135deg,#38BDF8,#818CF8)' : '#1E293B', color: 'white' }}>
              Let's go →
            </button>
          </form>
        </div>
      );

      /* Step 1: Role */
      case 1: return (
        <div key="s1" className="animate-fadeInUp flex flex-col items-center text-center px-6">
          <DrakoRobot size="md" state={state.robotState} className="mb-4" />
          <h2 className="text-2xl font-bold mb-2 text-white">Nice to meet you, {state.name}!</h2>
          <p className="text-[#94A3B8] mb-8">What best describes you?</p>
          <div className="flex flex-wrap justify-center gap-3 max-w-md">
            {ROLES.map(({ id, label, icon }) => (
              <button key={id} onClick={() => selectRole(id)} className="px-6 py-3 rounded-full font-medium transition-all hover:scale-105"
                style={{ background: state.type === id ? 'linear-gradient(135deg,#38BDF8,#818CF8)' : 'rgba(30,41,59,0.8)', color: 'white', border: `2px solid ${state.type === id ? '#38BDF8' : '#334155'}` }}>
                {icon} {label}
              </button>
            ))}
          </div>
        </div>
      );

      /* Step 2: Wake + Bedtime */
      case 2: {
        const canContinue = !!state.rhythm && !!state.bedtime;
        return (
          <div key="s2" className="animate-fadeInUp flex flex-col items-center text-center px-6">
            <DrakoRobot size="md" state={state.robotState} className="mb-4" />
            <h2 className="text-2xl font-bold mb-1 text-white">What's your daily rhythm?</h2>
            <p className="text-[#94A3B8] mb-6 text-sm">I'll build your schedule inside your window</p>

            {/* Wake time */}
            <p className="text-xs text-[#475569] uppercase tracking-wider font-semibold mb-3">🌅 Wake up</p>
            <div className="flex flex-wrap justify-center gap-3 mb-6">
              {WAKE_TIMES.map(time => (
                <button key={time} onClick={() => setState(prev => ({ ...prev, rhythm: time }))}
                  className="w-16 h-16 rounded-xl font-bold text-base transition-all hover:scale-105 flex flex-col items-center justify-center"
                  style={{ background: state.rhythm === time ? 'linear-gradient(135deg,#38BDF8,#818CF8)' : 'rgba(30,41,59,0.8)', color: 'white', border: `2px solid ${state.rhythm === time ? '#38BDF8' : '#334155'}` }}>
                  <span className="text-xl mb-0.5">{parseInt(time) <= 6 ? '🌙' : parseInt(time) <= 8 ? '🌅' : '☀️'}</span>
                  <span className="text-xs uppercase">{time}</span>
                </button>
              ))}
            </div>

            {/* Bed time */}
            <p className="text-xs text-[#475569] uppercase tracking-wider font-semibold mb-3">🌙 Bed by</p>
            <div className="flex flex-wrap justify-center gap-3 mb-8">
              {BED_TIMES.map(time => (
                <button key={time} onClick={() => setState(prev => ({ ...prev, bedtime: time }))}
                  className="w-16 h-16 rounded-xl font-bold text-base transition-all hover:scale-105 flex flex-col items-center justify-center"
                  style={{ background: state.bedtime === time ? 'linear-gradient(135deg,#818CF8,#A855F7)' : 'rgba(30,41,59,0.8)', color: 'white', border: `2px solid ${state.bedtime === time ? '#818CF8' : '#334155'}` }}>
                  <span className="text-xl mb-0.5">{'⭐'}</span>
                  <span className="text-xs uppercase">{time}</span>
                </button>
              ))}
            </div>

            <button onClick={nextStep} disabled={!canContinue}
              className="w-full max-w-sm py-4 rounded-2xl font-bold text-lg transition-all hover:scale-[1.02] disabled:opacity-30 disabled:cursor-not-allowed"
              style={{ background: canContinue ? 'linear-gradient(135deg,#38BDF8,#818CF8)' : '#1E293B', color: 'white', boxShadow: canContinue ? '0 0 40px rgba(56,189,248,0.3)' : 'none' }}>
              {canContinue ? `${state.rhythm} → ${state.bedtime} ✓ Continue` : 'Pick wake + bed time'}
            </button>
          </div>
        );
      }

      /* Step 3: Activity multi-select */
      case 3: {
        const sel = state.selectedActivities;
        const groups = ['Core', 'Health', 'Life', 'Focus', 'Social', 'Leisure'];
        return (
          <div key="s3" className="animate-fadeInUp flex flex-col items-center px-4 w-full max-w-lg">
            <div className="text-center mb-5">
              <h2 className="text-2xl font-bold text-white mb-1">What's in your day?</h2>
              <p className="text-[#94A3B8] text-sm">Pick everything that's part of your life
                {sel.length > 0 && <span className="ml-2 text-[#38BDF8] font-medium">· {sel.length} picked</span>}
              </p>
            </div>
            <div className="w-full space-y-4 mb-6">
              {groups.map(g => {
                const items = ACTIVITY_OPTIONS.filter(a => a.group === g);
                return (
                  <div key={g}>
                    <p className="text-xs text-[#475569] uppercase tracking-wider font-semibold mb-2 px-1">{g}</p>
                    <div className="flex flex-wrap gap-2">
                      {items.map(a => {
                        const on = sel.includes(a.id);
                        return (
                          <button key={a.id} onClick={() => toggleActivity(a.id)}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium transition-all hover:scale-105"
                            style={{ background: on ? `${a.color}22` : 'rgba(30,41,59,0.7)', color: on ? a.color : '#94A3B8', border: `1.5px solid ${on ? a.color : '#334155'}`, boxShadow: on ? `0 0 10px ${a.color}30` : 'none' }}>
                            <span>{a.emoji}</span><span>{a.label}</span>{on && <span className="text-xs opacity-60">✓</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
            <button onClick={() => sel.length > 0 && nextStep()} disabled={sel.length === 0}
              className="w-full py-4 rounded-2xl font-bold text-lg transition-all hover:scale-[1.02] disabled:opacity-30 sticky bottom-20"
              style={{ background: sel.length > 0 ? 'linear-gradient(135deg,#38BDF8,#818CF8)' : '#1E293B', color: 'white', boxShadow: sel.length > 0 ? '0 0 40px rgba(56,189,248,0.3)' : 'none' }}>
              {sel.length > 0 ? `Continue with ${sel.length} activit${sel.length === 1 ? 'y' : 'ies'} →` : 'Pick at least 1'}
            </button>
          </div>
        );
      }

      /* Step 4: Struggle */
      case 4: return (
        <div key="s4" className="animate-fadeInUp flex flex-col items-center text-center px-6">
          <DrakoRobot size="md" state={state.robotState} className="mb-4" />
          <h2 className="text-2xl font-bold mb-2 text-white">What's your biggest struggle?</h2>
          <p className="text-[#94A3B8] mb-8">I'll help you tackle it</p>
          <div className="grid grid-cols-2 gap-4 w-full max-w-md">
            {STRUGGLES.map(({ id, emoji, label }) => (
              <button key={id} onClick={() => selectStruggle(id)}
                className="p-5 rounded-2xl transition-all hover:scale-[1.02] text-center"
                style={{ background: state.struggle === id ? 'linear-gradient(135deg,#38BDF8,#818CF8)' : 'rgba(30,41,59,0.8)', color: 'white', border: `2px solid ${state.struggle === id ? '#38BDF8' : '#334155'}` }}>
                <span className="text-3xl block mb-2">{emoji}</span>
                <span className="font-medium text-sm">{label}</span>
              </button>
            ))}
          </div>
        </div>
      );

      /* Step 5: Building / Done */
      case 5:
        if (state.error) return (
          <div key="s-err" className="animate-fadeInUp flex flex-col items-center text-center px-6">
            <DrakoRobot size="lg" state="idle" className="mb-6 opacity-60" />
            <h2 className="text-2xl font-bold mb-3 text-white">Something went wrong</h2>
            <p className="text-[#94A3B8] mb-8 max-w-md">{state.error}</p>
            <button onClick={handleRetry} className="px-8 py-4 rounded-2xl font-bold text-lg" style={{ background: 'linear-gradient(135deg,#38BDF8,#818CF8)', color: 'white' }}>Try Again →</button>
          </div>
        );

        if (savedData) {
          const p = savedData.persona;
          return (
            <div key="s-done" className="animate-fadeInUp flex flex-col items-center text-center px-6">
              {p?.archetypeEmoji ? <span className="text-7xl mb-4 block">{p.archetypeEmoji}</span>
                : <DrakoRobot size="xl" state="greeting" className="mb-6" />}
              <h2 className="text-3xl font-bold mb-2 bg-gradient-to-r from-[#38BDF8] to-[#818CF8] bg-clip-text text-transparent">
                {p?.archetype || `Your day is ready, ${state.name}!`}
              </h2>
              {p?.drakoGreeting && (
                <div className="mt-4 mb-6 max-w-sm rounded-2xl px-6 py-4" style={{ background: 'rgba(30,41,59,0.9)', border: '1px solid #334155' }}>
                  <p className="text-[#E2E8F0] text-lg italic">"{p.drakoGreeting}"</p>
                </div>
              )}
              <p className="text-sm text-[#94A3B8] mb-6">{savedData.events.length} events · now place your blocks in time</p>
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
              {BUILDING_STEPS.map((s, i) => (
                <p key={i} className="transition-all duration-500 flex items-center gap-3"
                  style={{ color: i <= state.buildingStep ? '#F8FAFC' : '#475569', opacity: i <= state.buildingStep ? 1 : 0.4 }}>
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-sm"
                    style={{ background: i < state.buildingStep ? '#10B981' : i === state.buildingStep ? '#38BDF8' : '#334155', color: 'white' }}>
                    {i < state.buildingStep ? '✓' : i === state.buildingStep ? '•' : '○'}
                  </span>
                  {s}
                </p>
              ))}
            </div>
          </div>
        );

      default: return null;
    }
  };

  return (
    <div className="fixed inset-0 overflow-y-auto" style={{ background: 'linear-gradient(135deg,#0F172A 0%,#1E1B4B 50%,#0F172A 100%)' }}>
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl opacity-20"
          style={{ background: 'radial-gradient(circle,#38BDF8,transparent)', animation: 'orbDrift1 12s ease-in-out infinite' }} />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full blur-3xl opacity-20"
          style={{ background: 'radial-gradient(circle,#818CF8,transparent)', animation: 'orbDrift2 15s ease-in-out infinite' }} />
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle,rgba(255,255,255,0.03) 1px,transparent 1px)', backgroundSize: '24px 24px' }} />
      </div>
      <div className="relative z-10 min-h-full flex items-start justify-center py-10 px-4">
        <div className="w-full max-w-lg pt-4">{renderStep()}</div>
      </div>
      <ProgressDots current={state.step} total={5} />
    </div>
  );
}
