'use client';

import { useState, useCallback, useEffect } from 'react';
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
  type: 'builder' | 'operator' | 'learner' | 'hustler';
  rhythm: 'early_bird' | 'morning' | 'mid_morning' | 'late_starter';
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
}

const TYPES = [
  { id: 'builder', label: 'Builder', emoji: '💻', desc: 'I code, design, or create things' },
  { id: 'operator', label: 'Operator', emoji: '📋', desc: 'I manage people, projects, or processes' },
  { id: 'learner', label: 'Learner', emoji: '📚', desc: "I'm studying or upskilling" },
  { id: 'hustler', label: 'Hustler', emoji: '🚀', desc: "I'm building a company or side project" },
];

const RHYTHMS = [
  { id: 'early_bird', label: 'Early bird', emoji: '🌅', time: '5-7 AM' },
  { id: 'morning', label: 'Morning', emoji: '☀️', time: '7-9 AM' },
  { id: 'mid_morning', label: 'Mid-morning', emoji: '🌤️', time: '9-11 AM' },
  { id: 'late_starter', label: 'Late starter', emoji: '🦉', time: '11 AM+' },
];

const NON_NEGOTIABLES = [
  { id: 'deep_focus', label: 'Deep focus time', emoji: '🧠', desc: '2+ hours uninterrupted' },
  { id: 'meetings', label: 'Meetings/calls', emoji: '📞', desc: 'Syncs, standups, 1:1s' },
  { id: 'exercise', label: 'Exercise', emoji: '🏋️', desc: 'Gym, run, yoga, walk' },
  { id: 'meals', label: 'Proper meals', emoji: '🍽️', desc: 'Not eating at desk' },
  { id: 'learning', label: 'Learning', emoji: '📖', desc: 'Reading, courses, podcasts' },
  { id: 'breaks', label: 'Breaks/recharge', emoji: '🧘', desc: 'Meditation, naps, downtime' },
  { id: 'creative', label: 'Creative time', emoji: '🎨', desc: 'Writing, brainstorming' },
  { id: 'family', label: 'Family/social', emoji: '👨‍👩‍👧', desc: 'Pickup, dinner, hanging out' },
];

const STRUGGLES = [
  { id: 'too_many_meetings', label: 'Too many meetings', emoji: '😵' },
  { id: 'context_switching', label: 'Context switching', emoji: '🔀' },
  { id: 'no_focus_time', label: 'Never enough focus time', emoji: '⏰' },
  { id: 'no_boundaries', label: 'No work-life boundaries', emoji: '🫠' },
];

const BUILDING_STEPS = [
  'Understanding your rhythm...',
  'Protecting your focus time...',
  'Balancing your priorities...',
];

function ProgressDots({ current, total }: { current: number; total: number }) {
  if (current >= total) return null;
  
  return (
    <div className="flex items-center justify-center gap-1 mb-8">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className="flex items-center">
          <div
            className="w-2 h-2 rounded-full transition-all duration-300"
            style={{
              backgroundColor: i <= current ? 'var(--accent-primary)' : 'var(--border)',
              transform: i === current ? 'scale(1.3)' : 'scale(1)',
            }}
          />
          {i < total - 1 && (
            <div
              className="w-4 h-0.5 transition-all duration-300"
              style={{
                backgroundColor: i < current ? 'var(--accent-primary)' : 'var(--border)',
              }}
            />
          )}
        </div>
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
  });

  const [savedData, setSavedData] = useState<{ user: UserProfile; events: ScheduleEvent[] } | null>(null);

  const nextStep = useCallback(() => {
    setState(prev => ({ ...prev, step: prev.step + 1, error: null }));
  }, []);

  const selectType = useCallback((type: OnboardingSurvey['type']) => {
    setState(prev => ({ ...prev, type }));
    setTimeout(() => nextStep(), 400);
  }, [nextStep]);

  const selectRhythm = useCallback((rhythm: OnboardingSurvey['rhythm']) => {
    setState(prev => ({ ...prev, rhythm }));
    setTimeout(() => nextStep(), 400);
  }, [nextStep]);

  const toggleNonNegotiable = useCallback((id: string) => {
    setState(prev => {
      const current = prev.nonNegotiables;
      if (current.includes(id)) {
        return { ...prev, nonNegotiables: current.filter(n => n !== id) };
      }
      if (current.length >= 3) {
        return { ...prev, nonNegotiables: [...current.slice(1), id] };
      }
      return { ...prev, nonNegotiables: [...current, id] };
    });
  }, []);

  const selectStruggle = useCallback((struggle: OnboardingSurvey['struggle']) => {
    setState(prev => ({ ...prev, struggle }));
    setTimeout(() => {
      nextStep();
      submitOnboarding(struggle);
    }, 400);
  }, [nextStep]);

  const submitOnboarding = useCallback(async (struggleOverride?: OnboardingSurvey['struggle']) => {
    setState(prev => ({ ...prev, isSubmitting: true, error: null }));
    
    try {
      const survey: OnboardingSurvey = {
        name: state.name,
        type: state.type as OnboardingSurvey['type'],
        rhythm: state.rhythm as OnboardingSurvey['rhythm'],
        nonNegotiables: state.nonNegotiables,
        struggle: (struggleOverride || state.struggle) as OnboardingSurvey['struggle'],
      };

      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(survey),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setSavedData({ user: data.user, events: data.events || [] });
          return;
        }
      }
      
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to create schedule');
    } catch (err) {
      setState(prev => ({
        ...prev,
        isSubmitting: false,
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

  const handleRetry = useCallback(() => {
    setState(prev => ({ ...prev, error: null, step: 4 }));
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
      }, 600);
      return () => clearInterval(interval);
    }
  }, [state.step, savedData, state.error]);

  const renderStep = () => {
    switch (state.step) {
      case 0:
        return (
          <div key="step-0" className="animate-slideInRight">
            <div className="text-center mb-8">
              <span className="text-8xl block mb-6" style={{ animation: 'float 3s ease-in-out infinite' }}>
                🐉
              </span>
              <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                Hey! I&apos;m DRAKO.
              </h1>
              <p className="text-lg" style={{ color: 'var(--text-secondary)' }}>
                I build your perfect day through conversation.
                <br />
                Let&apos;s start with a quick setup.
              </p>
            </div>

            <form onSubmit={handleNameSubmit}>
              <input
                type="text"
                value={state.name}
                onChange={(e) => setState(prev => ({ ...prev, name: e.target.value }))}
                placeholder="What's your first name?"
                autoFocus
                className="w-full px-5 py-4 rounded-xl text-xl outline-none transition-all focus:ring-2"
                style={{
                  backgroundColor: 'var(--bg-tertiary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border)',
                }}
              />
              <button
                type="submit"
                disabled={!state.name.trim()}
                className="w-full mt-4 px-6 py-4 rounded-xl font-semibold text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02]"
                style={{
                  backgroundColor: state.name.trim() ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                  color: 'white',
                }}
              >
                Let&apos;s go →
              </button>
            </form>
          </div>
        );

      case 1:
        return (
          <div key="step-1" className="animate-slideInRight">
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
                Nice to meet you, {state.name}!
              </h2>
              <p style={{ color: 'var(--text-secondary)' }}>
                What best describes your day-to-day?
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {TYPES.map(({ id, label, emoji, desc }) => (
                <button
                  key={id}
                  onClick={() => selectType(id as OnboardingSurvey['type'])}
                  className="p-4 rounded-xl text-left transition-all hover:scale-[1.02]"
                  style={{
                    backgroundColor: state.type === id ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                    border: `2px solid ${state.type === id ? 'var(--accent-primary)' : 'var(--border)'}`,
                  }}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{emoji}</span>
                    <div>
                      <div className="font-semibold" style={{ color: state.type === id ? 'white' : 'var(--text-primary)' }}>
                        {label}
                      </div>
                      <div className="text-sm" style={{ color: state.type === id ? 'rgba(255,255,255,0.8)' : 'var(--text-secondary)' }}>
                        {desc}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        );

      case 2:
        return (
          <div key="step-2" className="animate-slideInRight">
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
                When does your brain turn on?
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {RHYTHMS.map(({ id, label, emoji, time }) => (
                <button
                  key={id}
                  onClick={() => selectRhythm(id as OnboardingSurvey['rhythm'])}
                  className="p-4 rounded-xl text-center transition-all hover:scale-[1.02]"
                  style={{
                    backgroundColor: state.rhythm === id ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                    border: `2px solid ${state.rhythm === id ? 'var(--accent-primary)' : 'var(--border)'}`,
                  }}
                >
                  <span className="text-2xl block mb-1">{emoji}</span>
                  <div className="font-semibold" style={{ color: state.rhythm === id ? 'white' : 'var(--text-primary)' }}>
                    {label}
                  </div>
                  <div className="text-xs" style={{ color: state.rhythm === id ? 'rgba(255,255,255,0.8)' : 'var(--text-muted)' }}>
                    {time}
                  </div>
                </button>
              ))}
            </div>
          </div>
        );

      case 3:
        return (
          <div key="step-3" className="animate-slideInRight">
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
                What MUST happen in your day?
              </h2>
              <p style={{ color: 'var(--text-secondary)' }}>
                Pick your top 3
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-6">
              {NON_NEGOTIABLES.map(({ id, label, emoji, desc }) => {
                const selected = state.nonNegotiables.includes(id);
                const order = state.nonNegotiables.indexOf(id) + 1;
                return (
                  <button
                    key={id}
                    onClick={() => toggleNonNegotiable(id)}
                    className="p-3 rounded-xl text-left transition-all hover:scale-[1.01] relative"
                    style={{
                      backgroundColor: selected ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                      border: `2px solid ${selected ? 'var(--accent-primary)' : 'var(--border)'}`,
                      boxShadow: selected ? '0 0 20px rgba(108, 92, 231, 0.3)' : 'none',
                    }}
                  >
                    {selected && (
                      <div
                        className="absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                        style={{ backgroundColor: 'var(--accent-glow)', color: 'white' }}
                      >
                        {order}
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{emoji}</span>
                      <div>
                        <div className="font-medium text-sm" style={{ color: selected ? 'white' : 'var(--text-primary)' }}>
                          {label}
                        </div>
                        <div className="text-xs" style={{ color: selected ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)' }}>
                          {desc}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <button
              onClick={nextStep}
              disabled={state.nonNegotiables.length === 0}
              className="w-full px-6 py-4 rounded-xl font-semibold text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02]"
              style={{
                backgroundColor: state.nonNegotiables.length > 0 ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                color: 'white',
              }}
            >
              Next →
            </button>
          </div>
        );

      case 4:
        return (
          <div key="step-4" className="animate-slideInRight">
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
                What&apos;s your #1 scheduling struggle?
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {STRUGGLES.map(({ id, label, emoji }) => (
                <button
                  key={id}
                  onClick={() => selectStruggle(id as OnboardingSurvey['struggle'])}
                  className="p-4 rounded-xl transition-all hover:scale-[1.02] flex items-center gap-4"
                  style={{
                    backgroundColor: state.struggle === id ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                    border: `2px solid ${state.struggle === id ? 'var(--accent-primary)' : 'var(--border)'}`,
                  }}
                >
                  <span className="text-2xl">{emoji}</span>
                  <span className="font-medium" style={{ color: state.struggle === id ? 'white' : 'var(--text-primary)' }}>
                    {label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        );

      case 5:
        if (state.error) {
          return (
            <div key="step-error" className="animate-slideInRight text-center">
              <span className="text-6xl block mb-4">😔</span>
              <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                Hmm, something went wrong
              </h2>
              <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>
                {state.error}
              </p>
              <button
                onClick={handleRetry}
                className="px-8 py-4 rounded-xl font-semibold text-lg transition-all hover:scale-105"
                style={{ backgroundColor: 'var(--accent-primary)', color: 'white' }}
              >
                Try Again →
              </button>
            </div>
          );
        }

        if (savedData) {
          return (
            <div key="step-done" className="animate-slideInRight text-center">
              <span className="text-6xl block mb-4">✨</span>
              <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--accent-success)' }}>
                Here&apos;s your starting point, {state.name}.
              </h2>
              <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>
                DRAKO built this based on your preferences.
                <br />
                Now let&apos;s fine-tune it together.
              </p>
              <button
                onClick={() => onComplete(savedData.user, savedData.events)}
                className="px-8 py-4 rounded-2xl font-semibold text-lg transition-all hover:scale-105"
                style={{
                  background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-glow))',
                  color: 'white',
                  boxShadow: '0 0 30px rgba(108, 92, 231, 0.4)',
                }}
              >
                🎙️ Talk to DRAKO
              </button>
            </div>
          );
        }

        return (
          <div key="step-building" className="animate-slideInRight text-center">
            <div className="relative inline-block mb-4">
              <span className="text-6xl block animate-robotThinking">🐉</span>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex gap-2 mt-2">
                  <span className="w-2 h-2 rounded-full bg-[var(--accent-primary)] animate-robotEyeGlow" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 rounded-full bg-[var(--accent-glow)] animate-robotEyeGlow" style={{ animationDelay: '150ms' }} />
                </div>
              </div>
            </div>
            <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
              Building your perfect day...
            </h2>
            <p className="text-sm mb-6 animate-pulse" style={{ color: 'var(--accent-glow)' }}>
              🤖 Claude is thinking...
            </p>
            
            <div
              className="h-2 rounded-full overflow-hidden mb-6"
              style={{ backgroundColor: 'var(--bg-tertiary)' }}
            >
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  backgroundColor: 'var(--accent-primary)',
                  width: `${((state.buildingStep + 1) / BUILDING_STEPS.length) * 100}%`,
                }}
              />
            </div>

            <div className="space-y-2">
              {BUILDING_STEPS.map((step, i) => (
                <p
                  key={i}
                  className="transition-all duration-300"
                  style={{
                    color: i <= state.buildingStep ? 'var(--text-primary)' : 'var(--text-muted)',
                    opacity: i <= state.buildingStep ? 1 : 0.3,
                  }}
                >
                  {i < state.buildingStep ? '✓' : i === state.buildingStep ? '→' : '○'} {step}
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
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: 'var(--bg-primary)' }}
    >
      <div
        className="w-full max-w-lg p-6 sm:p-8 rounded-2xl"
        style={{
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
        }}
      >
        <ProgressDots current={state.step} total={5} />
        {renderStep()}
      </div>
    </div>
  );
}
