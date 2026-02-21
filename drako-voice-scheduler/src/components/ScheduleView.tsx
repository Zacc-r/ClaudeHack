'use client';

import { ScheduleCard, type ScheduleEvent } from './ScheduleCard';
import { DrakoRobot } from './DrakoRobot';

interface ScheduleViewProps {
  events: ScheduleEvent[];
  newEventIds: Set<string>;
  onRemoveEvent: (id: string) => void;
}

const HOURS = Array.from({ length: 14 }, (_, i) => i + 7);
const HOUR_HEIGHT = 60;

function formatHour(hour: number): string {
  if (hour === 0) return '12 AM';
  if (hour === 12) return '12 PM';
  if (hour > 12) return `${hour - 12} PM`;
  return `${hour} AM`;
}

function getCurrentMinuteOffset(): number {
  const now = new Date();
  const minutes = now.getHours() * 60 + now.getMinutes();
  return (minutes - 7 * 60) * (HOUR_HEIGHT / 60);
}

function computeStats(events: ScheduleEvent[]) {
  let totalMinutes = 0;
  let focusCount = 0;
  let earliestStart = '';

  for (const e of events) {
    if (!e.end) continue;
    const [sh, sm] = e.start.split(':').map(Number);
    const [eh, em] = e.end.split(':').map(Number);
    totalMinutes += (eh * 60 + em) - (sh * 60 + sm);

    if (/focus|deep|brain|🧠/i.test(e.title)) focusCount++;

    if (!earliestStart || e.start < earliestStart) earliestStart = e.start;
  }

  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  const totalFormatted = hours > 0 ? `${hours}h ${mins > 0 ? `${mins}m` : ''}`.trim() : `${mins}m`;

  const formatTime = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    const suffix = h >= 12 ? 'PM' : 'AM';
    const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${hour12}:${String(m).padStart(2, '0')} ${suffix}`;
  };

  return {
    totalFormatted,
    focusCount,
    earliestStart: earliestStart ? formatTime(earliestStart) : '--',
  };
}

export function ScheduleView({ events, newEventIds, onRemoveEvent }: ScheduleViewProps) {
  const nowOffset = getCurrentMinuteOffset();
  const showNowLine = nowOffset >= 0 && nowOffset <= HOURS.length * HOUR_HEIGHT;
  const stats = events.length > 0 ? computeStats(events) : null;

  return (
    <div
      className="flex-1 overflow-y-auto scrollbar-thin"
      style={{
        background: 'linear-gradient(180deg, rgba(10, 10, 15, 0.95), rgba(15, 23, 42, 0.9))',
      }}
    >
      <div className="p-4 lg:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">
            Today&apos;s Schedule
          </h2>
          <div className="flex items-center gap-2 text-sm text-[#94A3B8]">
            <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
            {events.length} event{events.length !== 1 ? 's' : ''}
          </div>
        </div>

        {stats && (
          <div className="flex gap-2 mb-6 overflow-x-auto scrollbar-none">
            <div
              className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap"
              style={{ backgroundColor: 'rgba(56, 189, 248, 0.15)', color: '#38BDF8', border: '1px solid rgba(56, 189, 248, 0.3)' }}
            >
              <span>⏱</span> {stats.totalFormatted} scheduled
            </div>
            {stats.focusCount > 0 && (
              <div
                className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap"
                style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10B981', border: '1px solid rgba(16, 185, 129, 0.3)' }}
              >
                <span>🧠</span> {stats.focusCount} focus block{stats.focusCount !== 1 ? 's' : ''}
              </div>
            )}
            <div
              className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap"
              style={{ backgroundColor: 'rgba(129, 140, 248, 0.15)', color: '#818CF8', border: '1px solid rgba(129, 140, 248, 0.3)' }}
            >
              <span>🌅</span> Starts {stats.earliestStart}
            </div>
          </div>
        )}

        <div
          className="relative"
          style={{ height: `${HOURS.length * HOUR_HEIGHT}px` }}
        >
          {HOURS.map((hour) => (
            <div
              key={hour}
              className="absolute left-0 right-0 flex items-start"
              style={{ top: `${(hour - 7) * HOUR_HEIGHT}px` }}
            >
              <span
                className="w-12 text-xs font-mono-time text-right pr-3 -translate-y-2"
                style={{ color: 'var(--text-muted)' }}
              >
                {formatHour(hour)}
              </span>
              <div
                className="flex-1 border-t"
                style={{ borderColor: 'rgba(30, 41, 59, 0.6)' }}
              />
            </div>
          ))}

          {showNowLine && (
            <div
              className="absolute left-10 right-0 flex items-center z-20 pointer-events-none"
              style={{ top: `${nowOffset}px` }}
            >
              <div
                className="w-3 h-3 rounded-full -ml-1.5 animate-pulse"
                style={{ 
                  backgroundColor: '#EF4444',
                  boxShadow: '0 0 12px rgba(239, 68, 68, 0.6)',
                }}
              />
              <div
                className="flex-1 h-0.5"
                style={{ 
                  background: 'linear-gradient(90deg, #EF4444, transparent)',
                }}
              />
            </div>
          )}

          {events.map((event, index) => (
            <div
              key={event.id}
              className={newEventIds.has(event.id) ? 'animate-cardSlideIn' : ''}
              style={{ 
                animationDelay: newEventIds.has(event.id) ? `${index * 50}ms` : '0ms',
              }}
            >
              <ScheduleCard
                event={event}
                isNew={newEventIds.has(event.id)}
                onRemove={onRemoveEvent}
              />
            </div>
          ))}

          {events.length === 0 && (
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{ color: 'var(--text-muted)' }}
            >
              <div
                className="text-center p-8 rounded-2xl"
                style={{
                  backgroundColor: 'rgba(30, 41, 59, 0.4)',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
                }}
              >
                <DrakoRobot size="md" state="idle" className="mb-4 mx-auto" />
                <p className="text-lg font-medium text-white mb-2">No events yet</p>
                <p className="text-sm text-[#94A3B8]">Talk to DRAKO or use the chat to add events!</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
