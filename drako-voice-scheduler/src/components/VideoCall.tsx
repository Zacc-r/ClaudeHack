'use client';

import { VoiceIndicator } from './VoiceIndicator';

interface VideoCallProps {
  conversationUrl: string | null;
  isActive: boolean;
  isConnecting?: boolean;
  speaker: 'drako' | 'user' | 'idle';
  userName?: string;
  onStart: () => void;
  onEnd?: () => void;
}

export function VideoCall({
  conversationUrl,
  isActive,
  isConnecting,
  speaker,
  userName,
  onStart,
  onEnd,
}: VideoCallProps) {
  return (
    <div className="flex flex-col gap-4">
      <div
        className={`relative aspect-video rounded-2xl overflow-hidden transition-all duration-300 ${
          isActive ? 'animate-pulse-glow' : ''
        }`}
        style={{
          backgroundColor: 'var(--bg-tertiary)',
          border: isActive
            ? '2px solid var(--accent-glow)'
            : '2px solid var(--border)',
          minHeight: '320px',
        }}
      >
        {conversationUrl ? (
          <iframe
            src={conversationUrl}
            className="absolute inset-0 w-full h-full rounded-2xl"
            allow="camera; microphone; autoplay"
            style={{ border: 'none' }}
          />
        ) : isConnecting ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
            <span
              className="text-6xl animate-eyePulse"
            >
              🐉
            </span>
            <span
              className="text-lg font-medium"
              style={{ color: 'var(--text-secondary)' }}
            >
              Connecting...
            </span>
            <div
              className="w-32 h-1 rounded-full overflow-hidden"
              style={{ backgroundColor: 'var(--bg-secondary)' }}
            >
              <div
                className="h-full rounded-full animate-buildSchedule"
                style={{
                  backgroundColor: 'var(--accent-primary)',
                  animationDuration: '3s',
                }}
              />
            </div>
          </div>
        ) : (
          <button
            onClick={onStart}
            className="absolute inset-0 flex flex-col items-center justify-center gap-4 group cursor-pointer transition-all hover:bg-[var(--bg-secondary)]"
          >
            <span
              className="text-7xl transition-transform group-hover:scale-110"
              style={{ animation: 'float 3s ease-in-out infinite' }}
            >
              🐉
            </span>
            <span
              className="text-lg font-medium text-center px-4"
              style={{ color: 'var(--text-secondary)' }}
            >
              {userName ? `Hey ${userName}! Ready to plan your day?` : 'Ready to plan your day?'}
            </span>
            <div
              className="flex items-center gap-2 px-6 py-3 rounded-full transition-all group-hover:scale-105"
              style={{
                backgroundColor: 'var(--accent-primary)',
                color: 'var(--text-primary)',
              }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
              <span className="font-medium">Start Talking</span>
            </div>
            <span
              className="text-xs"
              style={{ color: 'var(--text-muted)' }}
            >
              Mic + Camera required
            </span>
          </button>
        )}
      </div>

      <VoiceIndicator active={isActive} speaker={speaker} />

      {conversationUrl && onEnd && (
        <button
          onClick={onEnd}
          className="px-4 py-2 rounded-xl text-sm font-medium transition-all hover:opacity-80"
          style={{
            backgroundColor: 'var(--accent-danger)',
            color: 'var(--text-primary)',
          }}
        >
          End Conversation
        </button>
      )}
    </div>
  );
}
