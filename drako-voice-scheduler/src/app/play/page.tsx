'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DrakoRobot } from '@/components/DrakoRobot';

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

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
type Day = typeof DAYS[number];

const DEFAULT_DAYS: Record<string, Day[]> = {
  work: ['Mon','Tue','Wed','Thu','Fri'], school: ['Mon','Tue','Wed','Thu','Fri'],
  commute: ['Mon','Tue','Wed','Thu','Fri'], gym: ['Mon','Wed','Fri'],
  running: ['Mon','Wed','Fri','Sat'], meditation: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],
  cooking: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'], errands: ['Sat','Sun'],
  deep_work: ['Mon','Tue','Wed','Thu','Fri'], learning: ['Mon','Tue','Wed','Thu','Fri','Sat'],
  creative: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'], side_project: ['Mon','Tue','Wed','Thu','Sat'],
  reading: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'], social: ['Thu','Fri','Sat','Sun'],
  family: ['Sat','Sun'], gaming: ['Fri','Sat','Sun'], shows: ['Fri','Sat','Sun'],
};

function smartDefault(id: string, userType: string, wakeHour: number, hasWork: boolean, hasSchool: boolean) {
  const anchor = hasSchool ? 8*60 : 9*60;
  const early = wakeHour <= 6, ath = userType === 'athlete';
  switch (id) {
    case 'work':        return { startMinutes:9*60,  durationMinutes:480 };
    case 'school':      return { startMinutes:8*60,  durationMinutes:420 };
    case 'commute':     return { startMinutes:anchor-45, durationMinutes:45 };
    case 'gym':         return (early||ath)?{startMinutes:(wakeHour+1)*60,durationMinutes:60}:{startMinutes:18*60,durationMinutes:60};
    case 'running':     return early?{startMinutes:wakeHour*60+30,durationMinutes:30}:{startMinutes:7*60,durationMinutes:30};
    case 'meditation':  return { startMinutes:wakeHour*60, durationMinutes:20 };
    case 'cooking':     return { startMinutes:18*60+30, durationMinutes:60 };
    case 'errands':     return { startMinutes:17*60+30, durationMinutes:60 };
    case 'deep_work':   return { startMinutes:(wakeHour+1)*60, durationMinutes:120 };
    case 'learning':    return { startMinutes:20*60, durationMinutes:60 };
    case 'creative':    return early?{startMinutes:(wakeHour+1)*60,durationMinutes:90}:{startMinutes:10*60,durationMinutes:90};
    case 'side_project':return { startMinutes:20*60, durationMinutes:90 };
    case 'reading':     return { startMinutes:21*60, durationMinutes:30 };
    case 'social':      return { startMinutes:19*60, durationMinutes:120 };
    case 'family':      return { startMinutes:18*60, durationMinutes:120 };
    case 'gaming':      return { startMinutes:20*60, durationMinutes:90 };
    case 'shows':       return { startMinutes:20*60+30, durationMinutes:90 };
    default:            return { startMinutes:19*60, durationMinutes:60 };
  }
}

const TL_START = 6*60, TL_END = 24*60;
function toDisplay(m: number) { const h = Math.floor(m/60)%24, mn = m%60, p = h >= 12 ? 'PM' : 'AM'; return `${h%12||12}:${String(mn).padStart(2,'0')} ${p}`; }
function toHHMM(m: number) { return `${String(Math.floor(m/60)%24).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`; }
function parseWakeHour(r: string) { const m = r.match(/^(\d+)/); return m ? parseInt(m[1]) : 7; }
function fmtDur(m: number) { if (m < 60) return `${m}m`; const h = Math.floor(m/60), r = m%60; return r > 0 ? `${h}h ${r}m` : `${h}h`; }

interface Slot { id: string; emoji: string; label: string; color: string; startMinutes: number; durationMinutes: number; days: Day[] }

const STEP = 30;
const DEFAULT_ACTIVITIES = ['work','gym','deep_work','social'];

export default function PlayPage() {
  const router = useRouter();
  const [slots, setSlots] = useState<Slot[]>([]);
  const [cardIdx, setCardIdx] = useState(0);
  const [saving, setSaving] = useState(false);
  const [userName, setUserName] = useState('');

  useEffect(() => {
    fetch('/api/user').then(r => r.json()).then(d => {
      if (!d.onboarded) { router.replace('/onboarding'); return; }
      const raw = typeof window !== 'undefined' ? sessionStorage.getItem('drako_user') : null;
      const user = raw ? JSON.parse(raw) : d.user;
      setUserName(user?.name || '');
      const activities: string[] = user?.selectedActivities?.length > 0 ? user.selectedActivities : DEFAULT_ACTIVITIES;
      const wakeHour = parseWakeHour(user?.rhythm || '7am');
      const userType = user?.type || 'professional';
      const hasWork = activities.includes('work'), hasSchool = activities.includes('school');
      setSlots(activities.map(id => {
        const meta = CATALOG[id] || { emoji: '📌', label: id, color: '#64748B' };
        const { startMinutes, durationMinutes } = smartDefault(id, userType, wakeHour, hasWork, hasSchool);
        const days: Day[] = [...(DEFAULT_DAYS[id] || ['Mon','Tue','Wed','Thu','Fri'])];
        return { id, ...meta, startMinutes, durationMinutes, days };
      }));
    }).catch(() => router.replace('/onboarding'));
  }, [router]);

  const current = slots[cardIdx];
  const done = cardIdx >= slots.length;

  const shiftStart = useCallback((delta: number) => {
    setSlots(prev => prev.map((s, i) => {
      if (i !== cardIdx) return s;
      const next = Math.max(TL_START, Math.min(TL_END - s.durationMinutes, s.startMinutes + delta));
      return { ...s, startMinutes: next };
    }));
  }, [cardIdx]);

  const shiftDuration = useCallback((delta: number) => {
    setSlots(prev => prev.map((s, i) => {
      if (i !== cardIdx) return s;
      const next = Math.max(15, Math.min(480, s.durationMinutes + delta));
      return { ...s, durationMinutes: next };
    }));
  }, [cardIdx]);

  const toggleDay = useCallback((day: Day) => {
    setSlots(prev => prev.map((s, i) => {
      if (i !== cardIdx) return s;
      const days = s.days.includes(day) ? s.days.filter(d => d !== day) : [...s.days, day];
      return { ...s, days };
    }));
  }, [cardIdx]);

  const confirm = useCallback(() => {
    setCardIdx(i => i + 1);
  }, []);

  const handleFinish = useCallback(async () => {
    setSaving(true);
    try {
      const timeSlots: Record<string, { start: string; end: string; label: string; emoji: string; days: string[] }> = {};
      slots.forEach(s => { timeSlots[s.id] = { start: toHHMM(s.startMinutes), end: toHHMM(s.startMinutes + s.durationMinutes), label: s.label, emoji: s.emoji, days: s.days }; });
      await fetch('/api/user', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ timeSlots }) });
      await fetch('/api/schedule/rebuild', { method: 'POST' });
      if (typeof window !== 'undefined') {
        const raw = sessionStorage.getItem('drako_user');
        if (raw) sessionStorage.setItem('drako_user', JSON.stringify({ ...JSON.parse(raw), timeSlots }));
      }
    } catch (e) { console.error(e); }
    router.push('/schedule');
  }, [slots, router]);

  // Loading
  if (slots.length === 0) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#0F172A 0%,#1E1B4B 50%,#0F172A 100%)' }}>
      <DrakoRobot size="xl" state="thinking" />
    </div>
  );

  // Done — summary
  if (done) return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center" style={{ background: 'linear-gradient(135deg,#0F172A 0%,#1E1B4B 50%,#0F172A 100%)' }}>
      <DrakoRobot size="xl" state="greeting" className="mb-6" />
      <h2 className="text-3xl font-bold mb-3 bg-gradient-to-r from-[#10B981] to-[#38BDF8] bg-clip-text text-transparent">
        {userName ? `Perfect, ${userName}!` : 'Day mapped!'} 🗓️
      </h2>
      <p className="text-[#94A3B8] mb-6">{slots.length} block{slots.length !== 1 ? 's' : ''} placed</p>
      <div className="w-full max-w-sm space-y-2 mb-8">
        {slots.map(s => (
          <div key={s.id} className="flex items-center justify-between px-4 py-2.5 rounded-xl" style={{ background: `${s.color}15`, border: `1px solid ${s.color}30` }}>
            <span className="text-sm font-medium" style={{ color: s.color }}>{s.emoji} {s.label}</span>
            <span className="text-xs text-[#64748B]">{toDisplay(s.startMinutes)} – {toDisplay(s.startMinutes + s.durationMinutes)}</span>
          </div>
        ))}
      </div>
      <button onClick={handleFinish} disabled={saving}
        className="w-full max-w-sm px-8 py-5 rounded-2xl font-bold text-xl text-white transition-all hover:scale-[1.02] disabled:opacity-50"
        style={{ background: 'linear-gradient(135deg,#38BDF8,#818CF8)', boxShadow: '0 0 40px rgba(56,189,248,0.3)' }}>
        {saving ? 'Building schedule...' : '🎙️ Talk to DRAKO →'}
      </button>
    </div>
  );

  // --- Active card ---
  return (
    <div className="min-h-screen flex flex-col px-4 py-6" style={{ background: 'linear-gradient(135deg,#0F172A 0%,#1E1B4B 50%,#0F172A 100%)' }}>

      {/* Progress header */}
      <div className="w-full max-w-sm mx-auto mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-[#94A3B8] text-sm font-medium">{cardIdx + 1} / {slots.length}</span>
          <span className="text-[#38BDF8] text-sm">{slots.length - cardIdx - 1 > 0 ? `${slots.length - cardIdx - 1} left` : 'last one!'}</span>
        </div>
        <div className="w-full h-1.5 rounded-full bg-[#1E293B]">
          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${((cardIdx + 1) / slots.length) * 100}%`, background: 'linear-gradient(90deg,#38BDF8,#818CF8)' }} />
        </div>
      </div>

      {/* Card */}
      <div className="flex-1 flex items-center justify-center">
        {current && (
          <div className="w-full max-w-sm rounded-3xl p-6" style={{ background: 'rgba(15,23,42,0.95)', border: `2px solid ${current.color}40`, boxShadow: `0 0 40px ${current.color}10, 0 16px 48px rgba(0,0,0,0.4)` }}>

            {/* Emoji + label */}
            <div className="text-center mb-5">
              <span className="text-5xl block mb-2" style={{ filter: `drop-shadow(0 0 16px ${current.color}50)` }}>{current.emoji}</span>
              <h2 className="text-xl font-bold text-white">{current.label}</h2>
            </div>

            {/* Start time controls */}
            <div className="mb-4">
              <p className="text-xs text-[#475569] uppercase tracking-wider mb-2 text-center">Start Time</p>
              <div className="flex items-center justify-center gap-3">
                <button onClick={() => shiftStart(-STEP)} className="w-11 h-11 rounded-xl flex items-center justify-center text-xl font-bold text-white" style={{ background: 'rgba(30,41,59,0.8)', border: '1px solid #334155' }}>←</button>
                <div className="px-5 py-2.5 rounded-xl min-w-[140px] text-center" style={{ background: `${current.color}15`, border: `1px solid ${current.color}30` }}>
                  <span className="text-lg font-bold" style={{ color: current.color }}>{toDisplay(current.startMinutes)}</span>
                </div>
                <button onClick={() => shiftStart(STEP)} className="w-11 h-11 rounded-xl flex items-center justify-center text-xl font-bold text-white" style={{ background: 'rgba(30,41,59,0.8)', border: '1px solid #334155' }}>→</button>
              </div>
            </div>

            {/* Duration controls */}
            <div className="mb-4">
              <p className="text-xs text-[#475569] uppercase tracking-wider mb-2 text-center">Duration</p>
              <div className="flex items-center justify-center gap-3">
                <button onClick={() => shiftDuration(-STEP)} className="w-11 h-11 rounded-xl flex items-center justify-center text-xl font-bold text-white" style={{ background: 'rgba(30,41,59,0.8)', border: '1px solid #334155' }}>−</button>
                <div className="px-5 py-2.5 rounded-xl min-w-[140px] text-center" style={{ background: `${current.color}15`, border: `1px solid ${current.color}30` }}>
                  <span className="text-lg font-bold" style={{ color: current.color }}>{fmtDur(current.durationMinutes)}</span>
                </div>
                <button onClick={() => shiftDuration(STEP)} className="w-11 h-11 rounded-xl flex items-center justify-center text-xl font-bold text-white" style={{ background: 'rgba(30,41,59,0.8)', border: '1px solid #334155' }}>+</button>
              </div>
            </div>

            {/* End time display */}
            <p className="text-center text-sm text-[#64748B] mb-4">
              Ends at <span className="font-bold" style={{ color: current.color }}>{toDisplay(current.startMinutes + current.durationMinutes)}</span>
            </p>

            {/* Day selector */}
            <div className="mb-5">
              <p className="text-xs text-[#475569] uppercase tracking-wider mb-2 text-center">Which days?</p>
              <div className="flex justify-between gap-1.5">
                {DAYS.map(day => {
                  const on = current.days.includes(day);
                  return (
                    <button key={day} onClick={() => toggleDay(day)}
                      className="flex-1 py-2 rounded-lg text-xs font-bold transition-all"
                      style={{ background: on ? `${current.color}30` : 'rgba(30,41,59,0.8)', color: on ? current.color : '#475569', border: `1.5px solid ${on ? current.color : '#334155'}` }}>
                      {day.charAt(0)}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Confirm button */}
            <button onClick={confirm}
              className="w-full py-4 rounded-2xl font-bold text-lg text-white transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{ background: `linear-gradient(135deg, ${current.color}, ${current.color}CC)`, boxShadow: `0 0 24px ${current.color}40` }}>
              {cardIdx + 1 < slots.length ? `Lock In ${current.label} ✓` : `Finish — ${current.label} ✓`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
