'use client';

import { useState, useCallback, useEffect } from 'react';
import { DrakoRobot } from './DrakoRobot';
import type { ScheduleEvent } from './ScheduleCard';

export interface UserProfile {
  id: string;
  name: string;
  type: string;
  rhythm: string;
  nonNegotiables: string[];
  struggle: string;
  createdAt: string;
}

export interface OnboardingSurvey {
  name: string;
  type: 'student' | 'professional' | 'creative' | 'athlete' | 'other';
  rhythm: '5am' | '6am' | '7am' | '8am' | '9am' | '10am' | '11am';
  nonNegotiables: string[];
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
  { id: 'student', label: 'Student', icon: '📚' },
  { id: 'professional', label: 'Professional', icon: '💼' },
  { id: 'creative', label: 'Creative', icon: '🎨' },
  { id: 'athlete', label: 'Athlete', icon: '🏃' },
  { id: 'other', label: 'Other', icon: '✨' },
];

const WAKE_TIMES = ['6am', '7am', '8am', '9am', '10am'] as const;

const CATEGORIES = [
  { id: 'exercise', label: 'Exercise', emoji: '🏋️', color: '#EF4444' },
  { id: 'deep_work', label: 'Deep Work', emoji: '🧠', color: '#14B8A6' },
  { id: 'learning', label: 'Learning', emoji: '📖', color: '#F59E0B' },
  { id: 'creative', label: 'Creative', emoji: '🎨', color: '#EC4899' },
  { id: 'social', label: 'Social', emoji: '👥', color: '#8B5CF6' },
  { id: 'wellness', label: 'Wellness', emoji: '🧘', color: '#6366F1' },
];

const STRUGGLES = [
  { id: 'too_many_meetings', emoji: '😵', label: 'Too many meetings' },
  { id: 'context_switching', emoji: '🔀', label: 'Context switching' },
  { id: 'no_focus_time', emoji: '⏰', label: 'Never enough focus time' },
  { id: 'no_boundaries', emoji: '🫠', label: 'No work-life boundaries' },
];

const BUILDING_STEPS = [
  'Analyzing your rhythm...',
  'Protecting focus blocks...',
  'Optimizing your day...',
];

function ProgressDots({ current, total }: { current: number; total: number }) {
  if (current >= total) return null;
  
  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 z-50">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className="transition-all duration-500"
          style={{
            width: i === current ? 24 : 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: i <= current ? '#38BDF8' : 'rgba(255,255,255,0.2)',
            boxShadow: i === current ? '0 0 12px rgba(56, 189, 248, 0.6)' : 'none',
          }}
        />
      ))}
    </div>
  );
}

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

  const [savedData, setSavedData] = useState<{ user: UserProfile; events: ScheduleEvent[] } | null>(null);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setState(prev => ({ ...prev, robotState: 'idle' }));
    }, 1000);
    return () => clearTimeout(timeout);
  }, []);

  const nextStep = useCallback(() => {
    setState(prev => ({ ...prev, step: prev.step + 1, error: null, robotState: 'greeting' }));
    setTimeout(() => {
      setState(prev => ({ ...prev, robotState: 'idle' }));
    }, 800);
  }, []);

  const selectRole = useCallback((type: OnboardingSurvey['type']) => {
    setState(prev => ({ ...prev, type }));
    setTimeout(() => nextStep(), 300);
  }, [nextStep]);

  const selectWakeTime = useCallback((rhythm: OnboardingSurvey['rhythm']) => {
    setState(prev => ({ ...prev, rhythm }));
    setTimeout(() => nextStep(), 300);
  }, [nextStep]);

  const toggleCategory = useCallback((id: string) => {
    setState(prev => {
      const current = prev.nonNegotiables;
      if (current.includes(id)) {
        return { ...prev, nonNegotiables: current.filter(n => n !== id) };
      }
      if (current.length >= 4) {
        return { ...prev, nonNegotiables: [...current.slice(1), id] };
      }
      return { ...prev, nonNegotiables: [...current, id] };
    });
  }, []);

  const submitOnboarding = useCallback(async () => {
    setState(prev => ({ ...prev, isSubmitting: true, error: null, robotState: 'thinking' }));
    
    try {
      const survey = {
        name: state.name,
        type: state.type,
        rhythm: state.rhythm,
        nonNegotiables: state.nonNegotiables,
        struggle: state.struggle || 'no_focus_time',
      };

      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(survey),
      });

      const data = await res.json();

      if (data.success) {
        setSavedData({ user: data.user, events: data.events || [] });
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
  }, [state]);

  const handleNameSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (state.name.trim()) {
      nextStep();
    }
  }, [state.name, nextStep]);

  const handleCategoriesNext = useCallback(() => {
    if (state.nonNegotiables.length > 0) {
      nextStep();
    }
  }, [state.nonNegotiables.length, nextStep]);

  const selectStruggle = useCallback((id: OnboardingSurvey['struggle']) => {
    setState(prev => ({ ...prev, struggle: id }));
    setTimeout(() => {
      nextStep();
      submitOnboarding();
    }, 400);
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
              <div className="relative">
                <input
                  type="text"
                  value={state.name}
                  onChange={(e) => setState(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="What's your name?"
                  autoFocus
                  className="w-full px-5 py-4 rounded-xl text-lg outline-none transition-all bg-[#1E293B]/50 text-white placeholder:text-[#475569] border-2 border-[#334155] focus:border-[#38BDF8] focus:shadow-[0_0_30px_rgba(56,189,248,0.2)]"
                />
              </div>
              <button
                type="submit"
                disabled={!state.name.trim()}
                className="w-full mt-4 px-6 py-4 rounded-xl font-bold text-base transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  background: state.name.trim() 
                    ? 'linear-gradient(135deg, #38BDF8, #818CF8)' 
                    : '#1E293B',
                  color: 'white',
                  boxShadow: state.name.trim() ? '0 0 40px rgba(56, 189, 248, 0.3)' : 'none',
                }}
              >
                Let&apos;s go →
              </button>
            </form>
          </div>
        );

      case 1:
        return (
          <div key="step-1" className="animate-fadeInUp flex flex-col items-center text-center px-6">
            <DrakoRobot size="md" state={state.robotState} className="mb-4" />
            
            <h2 className="text-2xl font-bold mb-2 text-white">
              Nice to meet you, {state.name}!
            </h2>
            <p className="text-[#94A3B8] mb-8">What do you do?</p>

            <div className="flex flex-wrap justify-center gap-3 max-w-md">
              {ROLES.map(({ id, label, icon }) => {
                const isSelected = state.type === id;
                return (
                  <button
                    key={id}
                    onClick={() => selectRole(id as OnboardingSurvey['type'])}
                    className="px-6 py-3 rounded-full font-medium transition-all hover:scale-105 active:scale-95"
                    style={{
                      background: isSelected 
                        ? 'linear-gradient(135deg, #38BDF8, #818CF8)' 
                        : 'rgba(30, 41, 59, 0.8)',
                      color: 'white',
                      border: `2px solid ${isSelected ? '#38BDF8' : '#334155'}`,
                      boxShadow: isSelected ? '0 0 20px rgba(56, 189, 248, 0.4)' : 'none',
                    }}
                  >
                    {icon} {label}
                  </button>
                );
              })}
            </div>
          </div>
        );

      case 2:
        return (
          <div key="step-2" className="animate-fadeInUp flex flex-col items-center text-center px-6">
            <DrakoRobot size="md" state={state.robotState} className="mb-4" />
            
            <h2 className="text-2xl font-bold mb-2 text-white">
              When do you wake up?
            </h2>
            <p className="text-[#94A3B8] mb-8">I&apos;ll optimize your schedule around this</p>

            <div className="flex flex-wrap justify-center gap-3 max-w-lg">
              {WAKE_TIMES.map((time) => {
                const isSelected = state.rhythm === time;
                return (
                  <button
                    key={time}
                    onClick={() => selectWakeTime(time)}
                    className="w-16 h-16 rounded-xl font-bold text-base transition-all hover:scale-105 active:scale-95 flex flex-col items-center justify-center"
                    style={{
                      background: isSelected 
                        ? 'linear-gradient(135deg, #38BDF8, #818CF8)' 
                        : 'rgba(30, 41, 59, 0.8)',
                      color: 'white',
                      border: `2px solid ${isSelected ? '#38BDF8' : '#334155'}`,
                      boxShadow: isSelected ? '0 0 20px rgba(56, 189, 248, 0.4)' : 'none',
                    }}
                  >
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

      case 3:
        return (
          <div key="step-3" className="animate-fadeInUp flex flex-col items-center text-center px-4">
            <DrakoRobot size="md" state={state.robotState} className="mb-4" />
            
            <h2 className="text-2xl font-bold mb-2 text-white">
              What matters most today?
            </h2>
            <p className="text-[#94A3B8] mb-6">Pick up to 4 priorities</p>

            <div className="grid grid-cols-3 gap-2 w-full max-w-sm mb-6">
              {CATEGORIES.map(({ id, label, emoji, color }) => {
                const isSelected = state.nonNegotiables.includes(id);
                return (
                  <button
                    key={id}
                    onClick={() => toggleCategory(id)}
                    className="p-3 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] flex flex-col items-center justify-center relative min-h-[72px]"
                    style={{
                      background: isSelected 
                        ? `linear-gradient(135deg, ${color}20, ${color}10)` 
                        : 'rgba(30, 41, 59, 0.6)',
                      border: `2px solid ${isSelected ? color : '#334155'}`,
                      boxShadow: isSelected ? `0 0 16px ${color}30` : 'none',
                    }}
                  >
                    <span className="text-2xl mb-1">{emoji}</span>
                    <span className="font-medium text-white text-xs text-center leading-tight">{label}</span>
                    {isSelected && (
                      <div 
                        className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white"
                        style={{ backgroundColor: color }}
                      >
                        ✓
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            <button
              onClick={handleCategoriesNext}
              disabled={state.nonNegotiables.length === 0}
              className="w-full max-w-md px-8 py-5 rounded-2xl font-bold text-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98]"
              style={{
                background: state.nonNegotiables.length > 0 
                  ? 'linear-gradient(135deg, #38BDF8, #818CF8)' 
                  : '#1E293B',
                color: 'white',
                boxShadow: state.nonNegotiables.length > 0 ? '0 0 40px rgba(56, 189, 248, 0.3)' : 'none',
              }}
            >
              Continue →
            </button>
          </div>
        );

      case 4:
        return (
          <div key="step-4" className="animate-fadeInUp flex flex-col items-center text-center px-6">
            <DrakoRobot size="md" state={state.robotState} className="mb-4" />
            
            <h2 className="text-2xl font-bold mb-2 text-white">
              What&apos;s your biggest struggle?
            </h2>
            <p className="text-[#94A3B8] mb-8">I&apos;ll help you tackle it</p>

            <div className="grid grid-cols-2 gap-4 w-full max-w-md">
              {STRUGGLES.map(({ id, emoji, label }) => {
                const isSelected = state.struggle === id;
                return (
                  <button
                    key={id}
                    onClick={() => selectStruggle(id as OnboardingSurvey['struggle'])}
                    className="p-5 rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98] text-center"
                    style={{
                      background: isSelected 
                        ? 'linear-gradient(135deg, #38BDF8, #818CF8)' 
                        : 'rgba(30, 41, 59, 0.8)',
                      color: 'white',
                      border: `2px solid ${isSelected ? '#38BDF8' : '#334155'}`,
                      boxShadow: isSelected ? '0 0 20px rgba(56, 189, 248, 0.4)' : 'none',
                    }}
                  >
                    <span className="text-3xl block mb-2">{emoji}</span>
                    <span className="font-medium text-sm">{label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        );

      case 5:
        if (state.error) {
          return (
            <div key="step-error" className="animate-fadeInUp flex flex-col items-center text-center px-6">
              <DrakoRobot size="lg" state="idle" className="mb-6 opacity-60" />
              
              <h2 className="text-2xl font-bold mb-3 text-white">
                Hmm, something went wrong
              </h2>
              <p className="text-[#94A3B8] mb-8 max-w-md">{state.error}</p>
              
              <button
                onClick={handleRetry}
                className="px-8 py-4 rounded-2xl font-bold text-lg transition-all hover:scale-105"
                style={{
                  background: 'linear-gradient(135deg, #38BDF8, #818CF8)',
                  color: 'white',
                }}
              >
                Try Again →
              </button>
            </div>
          );
        }

        if (savedData) {
          return (
            <div key="step-done" className="animate-fadeInUp flex flex-col items-center text-center px-6">
              <DrakoRobot size="xl" state="greeting" className="mb-8" />
              
              <h2 className="text-3xl font-bold mb-3 bg-gradient-to-r from-[#10B981] to-[#38BDF8] bg-clip-text text-transparent">
                Your day is ready, {state.name}!
              </h2>
              <p className="text-[#94A3B8] mb-10 max-w-md">
                I&apos;ve created a personalized schedule based on your preferences. Let&apos;s fine-tune it together.
              </p>
              
              <button
                onClick={() => onComplete(savedData.user, savedData.events)}
                className="px-10 py-5 rounded-2xl font-bold text-xl transition-all hover:scale-105 active:scale-95 animate-glowPulse"
                style={{
                  background: 'linear-gradient(135deg, #38BDF8, #818CF8)',
                  color: 'white',
                }}
              >
                🎙️ Start Talking to DRAKO
              </button>
            </div>
          );
        }

        return (
          <div key="step-building" className="animate-fadeInUp flex flex-col items-center text-center px-6">
            <DrakoRobot size="xl" state="thinking" className="mb-8" />
            
            <h2 className="text-2xl font-bold mb-3 text-white">
              Building your perfect day...
            </h2>
            <p className="text-[#38BDF8] mb-8 animate-pulse">
              🤖 Claude is analyzing your preferences
            </p>
            
            <div className="w-full max-w-sm mb-8">
              <div 
                className="h-2 rounded-full overflow-hidden"
                style={{ backgroundColor: 'rgba(30, 41, 59, 0.8)' }}
              >
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    background: 'linear-gradient(90deg, #38BDF8, #818CF8)',
                    width: `${((state.buildingStep + 1) / BUILDING_STEPS.length) * 100}%`,
                  }}
                />
              </div>
            </div>

            <div className="space-y-3">
              {BUILDING_STEPS.map((step, i) => (
                <p
                  key={i}
                  className="transition-all duration-500 flex items-center gap-3"
                  style={{
                    color: i <= state.buildingStep ? '#F8FAFC' : '#475569',
                    opacity: i <= state.buildingStep ? 1 : 0.4,
                  }}
                >
                  <span 
                    className="w-6 h-6 rounded-full flex items-center justify-center text-sm"
                    style={{
                      background: i < state.buildingStep ? '#10B981' : i === state.buildingStep ? '#38BDF8' : '#334155',
                      color: 'white',
                    }}
                  >
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
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{
        background: 'linear-gradient(135deg, #0F172A 0%, #1E1B4B 50%, #0F172A 100%)',
      }}
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl opacity-20"
          style={{ background: 'radial-gradient(circle, #38BDF8, transparent)' }}
        />
        <div 
          className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full blur-3xl opacity-20"
          style={{ background: 'radial-gradient(circle, #818CF8, transparent)' }}
        />
      </div>

      <div className="relative z-10 w-full max-w-lg px-4 max-h-[90vh] overflow-y-auto">
        {renderStep()}
      </div>
      
      <ProgressDots current={state.step} total={5} />
    </div>
  );
}
