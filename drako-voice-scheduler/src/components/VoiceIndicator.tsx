'use client';

interface VoiceIndicatorProps {
  active: boolean;
  speaker: 'drako' | 'user' | 'idle';
}

export function VoiceIndicator({ active, speaker }: VoiceIndicatorProps) {
  const config = {
    drako: {
      color: 'var(--accent-primary)',
      label: '🐉 DRAKO speaking',
    },
    user: {
      color: 'var(--accent-success)',
      label: '🎤 Listening...',
    },
    idle: {
      color: 'var(--text-muted)',
      label: 'Idle',
    },
  };

  const { color, label } = config[speaker];

  return (
    <div
      className="flex items-center gap-4 px-4 py-3 rounded-lg"
      style={{ backgroundColor: 'var(--bg-tertiary)' }}
    >
      <div className="flex items-end gap-1 h-6">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="w-1 rounded-full transition-all duration-150"
            style={{
              backgroundColor: color,
              height: active ? '100%' : '30%',
              animation: active ? `waveform 0.8s ease-in-out infinite` : 'none',
              animationDelay: `${i * 0.1}s`,
              opacity: active ? 1 : 0.4,
            }}
          />
        ))}
      </div>

      <span
        className="text-sm font-medium"
        style={{ color: active ? color : 'var(--text-muted)' }}
      >
        {label}
      </span>
    </div>
  );
}
