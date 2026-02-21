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
      style={{ backgroundColor: 'var(--bg-primary)' }}
    >
      <div className="p-4">
        <h2
          className="text-lg font-semibold mb-4"
          style={{ color: 'var(--text-primary)' }}
        >
          Today&apos;s Schedule
        </h2>

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
                className="w-10 text-xs font-mono-time text-right pr-2 -translate-y-2"
                style={{ color: 'var(--text-muted)' }}
              >
                {formatHour(hour)}
              </span>
              <div
                className="flex-1 border-t"
                style={{ borderColor: 'var(--border)' }}
              />
            </div>
          ))}

          {showNowLine && (
            <div
              className="absolute left-10 right-0 flex items-center z-20 pointer-events-none"
              style={{ top: `${nowOffset}px` }}
            >
              <div
                className="w-2 h-2 rounded-full -ml-1"
                style={{ backgroundColor: 'var(--accent-danger)' }}
              />
              <div
                className="flex-1 h-0.5"
                style={{ backgroundColor: 'var(--accent-danger)' }}
              />
            </div>
          )}

          {events.map((event) => (
            <ScheduleCard
              key={event.id}
              event={event}
              isNew={newEventIds.has(event.id)}
              onRemove={onRemoveEvent}
            />
          ))}

          {events.length === 0 && (
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{ color: 'var(--text-muted)' }}
            >
              <div className="text-center">
                <span className="text-4xl block mb-2">📅</span>
                <p>No events scheduled</p>
                <p className="text-sm">Talk to DRAKO to add some!</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
