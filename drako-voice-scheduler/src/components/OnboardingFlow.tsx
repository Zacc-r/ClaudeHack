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
  direction: 'forward' | 'backward';
}

const ROLES = [
  { id: 'engineer', label: 'Engineer', emoji: '👨‍💻' },
  { id: 'designer', label: 'Designer', emoji: '🎨' },
  { id: 'pm', label: 'PM', emoji: '📋' },
  { id: 'founder', label: 'Founder', emoji: '🚀' },
  { id: 'student', label: 'Student', emoji: '📚' },
  { id: 'other', label: 'Other', emoji: '✨' },
];

const WAKE_TIMES = [
  { time: '06:00', label: '6:00 AM', emoji: '🌅' },
  { time: '07:00', label: '7:00 AM', emoji: '☀️' },
  { time: '08:00', label: '8:00 AM', emoji: '🌤️' },
  { time: '09:00', label: '9:00 AM', emoji: '😴' },
  { time: '10:00', label: '10:00 AM', emoji: '🦉' },
];

const PRIORITIES = [
  { id: 'focus', label: 'Deep focus work', emoji: '🎯' },
  { id: 'meetings', label: 'Meetings', emoji: '📞' },
  { id: 'exercise', label: 'Exercise', emoji: '🏃' },
  { id: 'creative', label: 'Creative time', emoji: '🎨' },
  { id: 'learning', label: 'Learning', emoji: '📖' },
  { id: 'wellness', label: 'Wellness', emoji: '🧘' },
];

const MOCK_USER: UserProfile = {
  id: 'usr_mock',
  name: 'Demo User',
  role: 'engineer',
  workStyle: 'flexible',
  priorities: ['focus', 'exercise'],
  wakeUpTime: '08:00',
};

const MOCK_EVENTS: ScheduleEvent[] = [
  { id: 'evt_1', title: 'Morning Standup', start: '09:00', end: '09:30', date: new Date().toISOString().split('T')[0], color: '#6C5CE7' },
  { id: 'evt_2', title: 'Deep Focus Block', start: '10:00', end: '12:00', date: new Date().toISOString().split('T')[0], color: '#3B82F6' },
  { id: 'evt_3', title: 'Lunch Break', start: '12:00', end: '13:00', date: new Date().toISOString().split('T')[0], color: '#10B981' },
  { id: 'evt_4', title: 'Exercise', start: '17:00', end: '18:00', date: new Date().toISOString().split('T')[0], color: '#F59E0B' },
];

function ProgressDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex gap-2 justify-center mb-8">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className="w-2 h-2 rounded-full transition-all duration-300"
          style={{
            backgroundColor: i <= current ? 'var(--accent-primary)' : 'var(--border)',
            transform: i === current ? 'scale(1.3)' : 'scale(1)',
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
    role: '',
    wakeUpTime: '',
    priorities: [],
    isSubmitting: false,
    direction: 'forward',
  });

  const nextStep = useCallback(() => {
    setState(prev => ({ ...prev, step: prev.step + 1, direction: 'forward' }));
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
    setState(prev => ({ ...prev, isSubmitting: true }));
    
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
          setTimeout(() => {
            onComplete(data.user, data.events);
          }, 1500);
          return;
        }
      }
    } catch {
      // API not ready, use mock
    }

    setTimeout(() => {
      const mockUser: UserProfile = {
        ...MOCK_USER,
        name: state.name || 'Demo User',
        role: state.role || 'engineer',
        priorities: state.priorities.length > 0 ? state.priorities : ['focus'],
        wakeUpTime: state.wakeUpTime || '08:00',
      };
      onComplete(mockUser, MOCK_EVENTS);
    }, 2000);
  }, [state, onComplete]);

  const handleNameSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (state.name.trim()) {
      nextStep();
    }
  }, [state.name, nextStep]);

  const renderStep = () => {
    const animationClass = state.direction === 'forward' ? 'animate-slideInRight' : 'animate-slideIn';

    switch (state.step) {
      case 0:
        return (
          <div key="step-0" className={animationClass}>
            <div className="text-center mb-8">
              <span className="text-6xl block mb-4" style={{ animation: 'float 3s ease-in-out infinite' }}>
                🐉
              </span>
              <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                Hey! I&apos;m DRAKO
              </h1>
              <p style={{ color: 'var(--text-secondary)' }}>
                Your AI schedule builder. Let&apos;s set up your perfect day in under 30 seconds.
              </p>
            </div>

            <form onSubmit={handleNameSubmit}>
              <label className="block text-sm mb-2" style={{ color: 'var(--text-muted)' }}>
                What&apos;s your name?
              </label>
              <input
                type="text"
                value={state.name}
                onChange={(e) => setState(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter your name"
                autoFocus
                className="w-full px-4 py-3 rounded-xl text-lg outline-none transition-all focus:ring-2"
                style={{
                  backgroundColor: 'var(--bg-tertiary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border)',
                }}
              />
              <button
                type="submit"
                disabled={!state.name.trim()}
                className="w-full mt-4 px-6 py-3 rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
          <div key="step-1" className={animationClass}>
            <div className="text-center mb-8">
              <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                Nice to meet you, {state.name}!
              </h2>
              <p style={{ color: 'var(--text-secondary)' }}>
                What&apos;s your role?
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {ROLES.map(({ id, label, emoji }) => (
                <button
                  key={id}
                  onClick={() => selectRole(id)}
                  className="px-4 py-3 rounded-xl font-medium transition-all hover:scale-105"
                  style={{
                    backgroundColor: state.role === id ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                    border: `1px solid ${state.role === id ? 'var(--accent-primary)' : 'var(--border)'}`,
                    color: 'var(--text-primary)',
                  }}
                >
                  <span className="mr-2">{emoji}</span>
                  {label}
                </button>
              ))}
            </div>
          </div>
        );

      case 2:
        return (
          <div key="step-2" className={animationClass}>
            <div className="text-center mb-8">
              <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                When do you start your day?
              </h2>
              <p style={{ color: 'var(--text-secondary)' }}>
                This helps me plan your schedule
              </p>
            </div>

            <div className="flex flex-wrap justify-center gap-3">
              {WAKE_TIMES.map(({ time, label, emoji }) => (
                <button
                  key={time}
                  onClick={() => selectWakeTime(time)}
                  className="px-4 py-3 rounded-full font-medium transition-all hover:scale-105"
                  style={{
                    backgroundColor: state.wakeUpTime === time ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                    border: `1px solid ${state.wakeUpTime === time ? 'var(--accent-primary)' : 'var(--border)'}`,
                    color: 'var(--text-primary)',
                  }}
                >
                  <span className="mr-1">{emoji}</span>
                  {label}
                </button>
              ))}
            </div>
          </div>
        );

      case 3:
        return (
          <div key="step-3" className={animationClass}>
            <div className="text-center mb-8">
              <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                What matters most in your day?
              </h2>
              <p style={{ color: 'var(--text-secondary)' }}>
                Pick all that apply
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-6">
              {PRIORITIES.map(({ id, label, emoji }) => (
                <button
                  key={id}
                  onClick={() => togglePriority(id)}
                  className="px-4 py-3 rounded-xl font-medium transition-all hover:scale-105"
                  style={{
                    backgroundColor: state.priorities.includes(id) ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                    border: `1px solid ${state.priorities.includes(id) ? 'var(--accent-primary)' : 'var(--border)'}`,
                    color: 'var(--text-primary)',
                  }}
                >
                  <span className="mr-2">{emoji}</span>
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
              className="w-full px-6 py-3 rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: state.priorities.length > 0 ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                color: 'var(--text-primary)',
              }}
            >
              Build My Schedule →
            </button>
          </div>
        );

      case 4:
        return (
          <div key="step-4" className={`${animationClass} text-center`}>
            <div className="mb-8">
              <div className="relative inline-block">
                <span className="text-6xl block animate-eyePulse">🐉</span>
              </div>
              <h2 className="text-xl font-bold mt-4 mb-2" style={{ color: 'var(--text-primary)' }}>
                Building your perfect day...
              </h2>
              <p style={{ color: 'var(--text-secondary)' }}>
                Analyzing your preferences
              </p>
            </div>

            <div
              className="h-2 rounded-full overflow-hidden mb-8"
              style={{ backgroundColor: 'var(--bg-tertiary)' }}
            >
              <div
                className="h-full rounded-full animate-buildSchedule"
                style={{ backgroundColor: 'var(--accent-primary)' }}
              />
            </div>

            <div className="animate-fadeInUp" style={{ animationDelay: '1.5s', opacity: 0 }}>
              <p className="text-lg mb-4" style={{ color: 'var(--accent-success)' }}>
                ✨ Your schedule is ready!
              </p>
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
        className="w-full max-w-md p-8 rounded-2xl"
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
