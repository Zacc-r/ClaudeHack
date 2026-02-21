'use client';

interface HeaderProps {
  status: 'active' | 'ready' | 'error';
  userName?: string;
  onReset?: () => void;
}

export function Header({ status, userName, onReset }: HeaderProps) {
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const statusConfig = {
    active: { color: '#10B981', bgTint: 'rgba(16,185,129,0.12)', label: 'Connected' },
    ready: { color: '#F59E0B', bgTint: 'rgba(245,158,11,0.12)', label: 'Ready' },
    error: { color: '#EF4444', bgTint: 'rgba(239,68,68,0.12)', label: 'Error' },
  };

  const { color, bgTint, label } = statusConfig[status];

  return (
    <header
      className="relative flex items-center justify-between px-4 lg:px-6 py-4"
      style={{
        backgroundColor: 'var(--bg-secondary)',
      }}
    >
      <div className="flex items-center gap-3">
        <span className="text-2xl lg:text-3xl">🐉</span>
        <div>
          <h1
            className="text-lg lg:text-xl font-bold tracking-tight bg-gradient-to-r from-[#38BDF8] to-[#818CF8] bg-clip-text text-transparent"
          >
            DRAKO
          </h1>
          <p
            className="text-xs lg:text-sm hidden sm:block"
            style={{ color: 'var(--text-secondary)' }}
          >
            Voice Schedule Builder
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 lg:gap-6">
        <span
          className="text-xs lg:text-sm font-mono-time hidden md:block"
          style={{ color: 'var(--text-secondary)' }}
        >
          {today}
        </span>

        {userName && (
          <span
            className="text-sm font-medium hidden sm:block"
            style={{ color: 'var(--text-primary)' }}
          >
            Hey, {userName}!
          </span>
        )}

        {/* Status pill badge with tinted background */}
        <div
          className="flex items-center gap-2 px-3 py-1 rounded-full"
          style={{ backgroundColor: bgTint }}
        >
          <div
            className="w-2 h-2 rounded-full animate-status-pulse"
            style={{ backgroundColor: color }}
          />
          <span
            className="text-xs uppercase tracking-wider font-medium hidden sm:block"
            style={{ color }}
          >
            {label}
          </span>
        </div>

        {onReset && (
          <button
            onClick={onReset}
            className="text-xs px-3 py-1 rounded-full transition-all hover:bg-[var(--bg-tertiary)]"
            style={{
              color: 'var(--text-muted)',
              border: '1px solid var(--border)',
            }}
            title="Reset demo"
          >
            Reset Demo
          </button>
        )}
      </div>

      {/* Gradient accent line at bottom */}
      <div
        className="absolute bottom-0 left-0 right-0 h-px"
        style={{
          background: 'linear-gradient(90deg, transparent, #38BDF8, #818CF8, transparent)',
        }}
      />
    </header>
  );
}
