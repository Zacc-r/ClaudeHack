'use client';

import { useState, useCallback } from 'react';
import type { ScheduleEvent } from './ScheduleCard';

export interface UserProfile {
  id: string;
  name: string;
  role: string;
  workStyle: string;
  priorities: string[];
  wakeUpTime: string;
}

interface OnboardingFlowProps {
  onComplete: (user: UserProfile, events: ScheduleEvent[]) => void;
}

interface OnboardingState {
  step: number;
  name: string;
  role: string;
  wakeUpTime: string;
  priorities: string[];
  isSubmitting: boolean;
  error: string | null;
  success: boolean;
}

const ROLES = [
  { id: 'engineer', label: 'Engineer', emoji: '💻' },
  { id: 'designer', label: 'Designer', emoji: '🎨' },
  { id: 'pm', label: 'PM', emoji: '📋' },
  { id: 'founder', label: 'Founder', emoji: '🚀' },
  { id: 'student', label: 'Student', emoji: '📚' },
  { id: 'other', label: 'Other', emoji: '✨' },
];

const WAKE_TIMES = [
  { time: '06:00', label: '6:00', emoji: '🌅' },
  { time: '07:00', label: '7:00', emoji: '☀️' },
  { time: '08:00', label: '8:00', emoji: '🌤️' },
  { time: '09:00', label: '9:00', emoji: '😴' },
  { time: '10:00', label: '10:00', emoji: '🦉' },
];

const PRIORITIES = [
  { id: 'deep work', label: 'Deep focus', emoji: '🎯' },
  { id: 'meetings', label: 'Meetings', emoji: '📞' },
  { id: 'exercise', label: 'Exercise', emoji: '🏃' },
  { id: 'creative', label: 'Creative', emoji: '🎨' },
  { id: 'learning', label: 'Learning', emoji: '📖' },
  { id: 'wellness', label: 'Wellness', emoji: '🧘' },
];

function ProgressDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className="flex items-center">
          <div
            className="w-2.5 h-2.5 rounded-full transition-all duration-300"
            style={{
              backgroundColor: i < current ? 'var(--accent-primary)' : i === current ? 'var(--accent-primary)' : 'transparent',
              border: i <= current ? '2px solid var(--accent-primary)' : '2px solid var(--border)',
              transform: i === current ? 'scale(1.2)' : 'scale(1)',
            }}
          />
          {i < total - 1 && (
            <div
              className="w-6 h-0.5 mx-1 transition-all duration-300"
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
    role: '',
    wakeUpTime: '',
    priorities: [],
    isSubmitting: false,
    error: null,
    success: false,
  });

  const [savedData, setSavedData] = useState<{ user: UserProfile; events: ScheduleEvent[] } | null>(null);

  const nextStep = useCallback(() => {
    setState(prev => ({ ...prev, step: prev.step + 1, error: null }));
  }, []);

  const selectRole = useCallback((role: string) => {
    setState(prev => ({ ...prev, role }));
    setTimeout(() => nextStep(), 400);
  }, [nextStep]);

  const selectWakeTime = useCallback((time: string) => {
    setState(prev => ({ ...prev, wakeUpTime: time }));
    setTimeout(() => nextStep(), 400);
  }, [nextStep]);

  const togglePriority = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      priorities: prev.priorities.includes(id)
        ? prev.priorities.filter(p => p !== id)
        : [...prev.priorities, id],
    }));
  }, []);

  const submitOnboarding = useCallback(async () => {
    setState(prev => ({ ...prev, isSubmitting: true, error: null }));
    
    try {
      const workStyle = state.wakeUpTime <= '07:00'
        ? 'morning person'
        : state.wakeUpTime >= '10:00'
          ? 'night owl'
          : 'flexible';

      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: state.name,
          role: state.role,
          workStyle,
          priorities: state.priorities,
          wakeUpTime: state.wakeUpTime,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setSavedData({ user: data.user, events: data.events || [] });
          setState(prev => ({ ...prev, success: true, isSubmitting: false }));
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
    setState(prev => ({ ...prev, error: null }));
    submitOnboarding();
  }, [submitOnboarding]);

  const handleStartTalking = useCallback(() => {
    if (savedData) {
      onComplete(savedData.user, savedData.events);
    }
  }, [savedData, onComplete]);

  const renderStep = () => {
    switch (state.step) {
      case 0:
        return (
          <div key="step-0" className="animate-slideInRight">
            <div className="text-center mb-8">
              <span className="text-7xl block mb-4" style={{ animation: 'float 3s ease-in-out infinite' }}>
                🐉
              </span>
              <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                Hey! I&apos;m DRAKO 🐉
              </h1>
              <p style={{ color: 'var(--text-secondary)' }}>
                Let&apos;s build your perfect day in 30 seconds
              </p>
            </div>

            <form onSubmit={handleNameSubmit}>
              <input
                type="text"
                value={state.name}
                onChange={(e) => setState(prev => ({ ...prev, name: e.target.value }))}
                placeholder="What's your name?"
                autoFocus
                className="w-full px-5 py-4 rounded-xl text-xl outline-none transition-all focus:ring-2"
                style={{
                  backgroundColor: 'var(--bg-tertiary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border)',
                  '--tw-ring-color': 'var(--accent-primary)',
                } as React.CSSProperties}
              />
              <button
                type="submit"
                disabled={!state.name.trim()}
                className="w-full mt-4 px-6 py-4 rounded-xl font-semibold text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02]"
                style={{
                  backgroundColor: state.name.trim() ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                  color: 'var(--text-primary)',
                }}
              >
                Next →
              </button>
            </form>
          </div>
        );

      case 1:
        return (
          <div key="step-1" className="animate-slideInRight">
            <div className="text-center mb-8">
              <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                What do you do, {state.name}?
              </h2>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {ROLES.map(({ id, label, emoji }) => (
                <button
                  key={id}
                  onClick={() => selectRole(id)}
                  className="px-4 py-4 rounded-xl font-medium transition-all hover:scale-105"
                  style={{
                    backgroundColor: state.role === id ? 'var(--accent-primary)' : 'transparent',
                    border: `2px solid ${state.role === id ? 'var(--accent-primary)' : 'var(--border)'}`,
                    color: state.role === id ? 'white' : 'var(--text-secondary)',
                  }}
                >
                  <span className="text-xl block mb-1">{emoji}</span>
                  {label}
                </button>
              ))}
            </div>
          </div>
        );

      case 2:
        return (
          <div key="step-2" className="animate-slideInRight">
            <div className="text-center mb-8">
              <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                When do you start your day?
              </h2>
            </div>

            <div className="flex flex-wrap justify-center gap-3">
              {WAKE_TIMES.map(({ time, label, emoji }) => (
                <button
                  key={time}
                  onClick={() => selectWakeTime(time)}
                  className="px-5 py-3 rounded-full font-medium transition-all hover:scale-105"
                  style={{
                    backgroundColor: state.wakeUpTime === time ? 'var(--accent-primary)' : 'transparent',
                    border: `2px solid ${state.wakeUpTime === time ? 'var(--accent-primary)' : 'var(--border)'}`,
                    color: state.wakeUpTime === time ? 'white' : 'var(--text-secondary)',
                  }}
                >
                  {label} {emoji}
                </button>
              ))}
            </div>
          </div>
        );

      case 3:
        return (
          <div key="step-3" className="animate-slideInRight">
            <div className="text-center mb-8">
              <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                What matters most?
              </h2>
              <p style={{ color: 'var(--text-secondary)' }}>
                Pick all that apply
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
              {PRIORITIES.map(({ id, label, emoji }) => (
                <button
                  key={id}
                  onClick={() => togglePriority(id)}
                  className="px-4 py-3 rounded-xl font-medium transition-all hover:scale-105"
                  style={{
                    backgroundColor: state.priorities.includes(id) ? 'var(--accent-primary)' : 'transparent',
                    border: `2px solid ${state.priorities.includes(id) ? 'var(--accent-primary)' : 'var(--border)'}`,
                    color: state.priorities.includes(id) ? 'white' : 'var(--text-secondary)',
                  }}
                >
                  <span className="mr-1">{emoji}</span>
                  {label}
                </button>
              ))}
            </div>

            <button
              onClick={() => {
                nextStep();
                submitOnboarding();
              }}
              disabled={state.priorities.length === 0}
              className="w-full px-6 py-4 rounded-xl font-semibold text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02]"
              style={{
                backgroundColor: state.priorities.length > 0 ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                color: 'var(--text-primary)',
              }}
            >
              Build my day →
            </button>
          </div>
        );

      case 4:
        return (
          <div key="step-4" className="animate-slideInRight text-center">
            {state.error ? (
              <>
                <div className="mb-8">
                  <span className="text-6xl block mb-4">😔</span>
                  <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                    Hmm, something went wrong
                  </h2>
                  <p style={{ color: 'var(--text-secondary)' }}>
                    {state.error}
                  </p>
                </div>
                <button
                  onClick={handleRetry}
                  className="px-8 py-4 rounded-xl font-semibold text-lg transition-all hover:scale-105"
                  style={{
                    backgroundColor: 'var(--accent-primary)',
                    color: 'white',
                  }}
                >
                  Try Again →
                </button>
              </>
            ) : state.success ? (
              <>
                <div className="mb-8">
                  <span className="text-6xl block mb-4 animate-bounce">✨</span>
                  <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--accent-success)' }}>
                    Your schedule is ready!
                  </h2>
                  <p style={{ color: 'var(--text-secondary)' }}>
                    DRAKO has built your perfect day
                  </p>
                </div>
                <button
                  onClick={handleStartTalking}
                  className="px-8 py-4 rounded-2xl font-semibold text-lg transition-all hover:scale-105"
                  style={{
                    background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-glow))',
                    color: 'white',
                    boxShadow: '0 0 30px rgba(108, 92, 231, 0.4)',
                  }}
                >
                  🎙️ Start talking to DRAKO →
                </button>
              </>
            ) : (
              <>
                <div className="mb-8">
                  <span className="text-6xl block animate-eyePulse">🐉</span>
                  <h2 className="text-xl font-bold mt-4 mb-2" style={{ color: 'var(--text-primary)' }}>
                    Building your perfect day...
                  </h2>
                  <p style={{ color: 'var(--text-secondary)' }}>
                    Analyzing your preferences
                  </p>
                </div>

                <div
                  className="h-2 rounded-full overflow-hidden"
                  style={{ backgroundColor: 'var(--bg-tertiary)' }}
                >
                  <div
                    className="h-full rounded-full animate-buildSchedule"
                    style={{ backgroundColor: 'var(--accent-primary)' }}
                  />
                </div>
              </>
            )}
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
        className="w-full max-w-md p-8 rounded-2xl"
        style={{
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
        }}
      >
        {state.step < 4 && <ProgressDots current={state.step} total={4} />}
        {renderStep()}
      </div>
    </div>
  );
}
