'use client';

import { ScheduleCard, type ScheduleEvent } from './ScheduleCard';

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

export function ScheduleView({ events, newEventIds, onRemoveEvent }: ScheduleViewProps) {
  const nowOffset = getCurrentMinuteOffset();
  const showNowLine = nowOffset >= 0 && nowOffset <= HOURS.length * HOUR_HEIGHT;

  return (
    <div
      className="flex-1 overflow-y-auto scrollbar-thin"
      style={{ 
        background: 'linear-gradient(180deg, rgba(10, 10, 15, 0.95), rgba(15, 23, 42, 0.9))',
      }}
    >
      <div className="p-4 lg:p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">
            Today&apos;s Schedule
          </h2>
          <div className="flex items-center gap-2 text-sm text-[#94A3B8]">
            <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
            {events.length} event{events.length !== 1 ? 's' : ''}
          </div>
        </div>

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
              <div className="text-center p-8 rounded-2xl" style={{ backgroundColor: 'rgba(30, 41, 59, 0.4)' }}>
                <span className="text-5xl block mb-4">📅</span>
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
