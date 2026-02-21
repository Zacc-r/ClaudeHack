'use client';

export interface ScheduleEvent {
  id: string;
  title: string;
  start: string;
  end?: string;
  date: string;
  color?: string;
  category?: string;
  priority?: boolean;
}

interface ScheduleCardProps {
  event: ScheduleEvent;
  isNew: boolean;
  onRemove: (id: string) => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  exercise: '#EF4444',
  'deep work': '#14B8A6',
  creative: '#EC4899',
  social: '#8B5CF6',
  learning: '#F59E0B',
  meditation: '#6366F1',
  entertainment: '#10B981',
  finance: '#F97316',
};

function getCategoryColor(event: ScheduleEvent): string {
  if (event.color) return event.color;
  
  if (event.category) {
    const normalizedCategory = event.category.toLowerCase();
    if (CATEGORY_COLORS[normalizedCategory]) {
      return CATEGORY_COLORS[normalizedCategory];
    }
  }
  
  const titleLower = event.title.toLowerCase();
  for (const [category, color] of Object.entries(CATEGORY_COLORS)) {
    if (titleLower.includes(category)) {
      return color;
    }
  }
  
  return 'var(--accent-primary)';
}

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

const HOUR_HEIGHT = 60;
const START_HOUR = 7;

export function ScheduleCard({ event, isNew, onRemove }: ScheduleCardProps) {
  const startMinutes = timeToMinutes(event.start);
  const endMinutes = event.end ? timeToMinutes(event.end) : startMinutes + 30;
  const duration = endMinutes - startMinutes;

  const top = (startMinutes - START_HOUR * 60) * (HOUR_HEIGHT / 60);
  const height = Math.max(duration * (HOUR_HEIGHT / 60), 28);

  const color = getCategoryColor(event);

  return (
    <div
      className={`absolute left-12 right-2 rounded-r-lg cursor-pointer group transition-all duration-200 hover:scale-[1.02] hover:z-10 ${
        isNew ? 'animate-slideIn' : ''
      }`}
      style={{
        top: `${top}px`,
        height: `${height}px`,
        backgroundColor: 'var(--bg-tertiary)',
        borderLeft: `4px solid ${color}`,
      }}
      onClick={() => onRemove(event.id)}
    >
      <div className="flex items-start justify-between h-full p-2 overflow-hidden">
        <div className="flex flex-col min-w-0">
          <span
            className="text-sm font-medium truncate"
            style={{ color: 'var(--text-primary)' }}
          >
            {event.title}
          </span>
          <span
            className="text-xs font-mono-time"
            style={{ color: 'var(--text-secondary)' }}
          >
            {event.start}
            {event.end && ` – ${event.end}`}
          </span>
        </div>

        <div className="flex items-center gap-1">
          {event.priority && (
            <span className="text-sm" title="Priority">⭐</span>
          )}
          
          <button
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-[var(--accent-danger)]/20"
            onClick={(e) => {
              e.stopPropagation();
              onRemove(event.id);
            }}
            aria-label="Remove event"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="var(--accent-danger)"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
