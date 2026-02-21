'use client';

interface VoiceIndicatorProps {
  active: boolean;
  speaker: 'drako' | 'user' | 'idle';
}

const BAR_COLORS_DRAKO = ['#38BDF8', '#5BA8F5', '#7B93F2', '#818CF8', '#9B7EF5', '#A875F2', '#6C5CE7'];
const BAR_COLORS_USER = ['#10B981', '#1AC98D', '#24D999', '#2EE9A5', '#24D999', '#1AC98D', '#10B981'];
const BAR_COLORS_IDLE = Array(7).fill('var(--text-muted)');

export function VoiceIndicator({ active, speaker }: VoiceIndicatorProps) {
  const config = {
    drako: {
      colors: BAR_COLORS_DRAKO,
      label: '🐉 DRAKO speaking',
    },
    user: {
      colors: BAR_COLORS_USER,
      label: '🎤 Listening...',
    },
    idle: {
      colors: BAR_COLORS_IDLE,
      label: 'Idle',
    },
  };

  const { colors, label } = config[speaker];

  return (
    <div
      className="flex items-center gap-4 px-4 py-3 rounded-lg"
      style={{ backgroundColor: 'var(--bg-tertiary)' }}
    >
      <div className="flex items-end gap-1 h-6">
        {colors.map((color, i) => (
          <div
            key={i}
            className="w-1 rounded-full transition-all duration-150"
            style={{
              backgroundColor: color,
              height: active ? '100%' : '30%',
              animation: active ? `waveform 0.8s ease-in-out infinite` : 'none',
              animationDelay: `${i * 0.08}s`,
              opacity: active ? 1 : 0.4,
            }}
          />
        ))}
      </div>

      <span
        className="text-sm font-medium"
        style={{ color: active ? colors[0] : 'var(--text-muted)' }}
      >
        {label}
      </span>
    </div>
  );
}
