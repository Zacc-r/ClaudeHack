'use client';

interface HeaderProps {
  status: 'active' | 'ready' | 'error';
}

export function Header({ status }: HeaderProps) {
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const statusConfig = {
    active: { color: 'bg-[var(--accent-success)]', label: 'Connected' },
    ready: { color: 'bg-[var(--accent-warning)]', label: 'Ready' },
    error: { color: 'bg-[var(--accent-danger)]', label: 'Error' },
  };

  const { color, label } = statusConfig[status];

  return (
    <header
      className="flex items-center justify-between px-6 py-4 border-b"
      style={{
        backgroundColor: 'var(--bg-secondary)',
        borderColor: 'var(--border)',
      }}
    >
      <div className="flex items-center gap-3">
        <span className="text-3xl">🐉</span>
        <div>
          <h1
            className="text-xl font-bold tracking-tight"
            style={{ color: 'var(--text-primary)' }}
          >
            DRAKO
          </h1>
          <p
            className="text-sm"
            style={{ color: 'var(--text-secondary)' }}
          >
            Voice Schedule Builder
          </p>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <span
          className="text-sm font-mono-time"
          style={{ color: 'var(--text-secondary)' }}
        >
          {today}
        </span>

        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${color} animate-status-pulse`}
          />
          <span
            className="text-xs uppercase tracking-wider"
            style={{ color: 'var(--text-muted)' }}
          >
            {label}
          </span>
        </div>
      </div>
    </header>
  );
}
