'use client';

import { VoiceIndicator } from './VoiceIndicator';

interface VideoCallProps {
  conversationUrl: string | null;
  isActive: boolean;
  speaker: 'drako' | 'user' | 'idle';
  onStart: () => void;
}

export function VideoCall({ conversationUrl, isActive, speaker, onStart }: VideoCallProps) {
  return (
    <div className="flex flex-col gap-4">
      <div
        className={`relative aspect-video rounded-xl overflow-hidden transition-all duration-300 ${
          isActive ? 'animate-pulse-glow' : ''
        }`}
        style={{
          backgroundColor: 'var(--bg-tertiary)',
          border: isActive
            ? '2px solid var(--accent-glow)'
            : '2px solid var(--border)',
        }}
      >
        {conversationUrl ? (
          <iframe
            src={conversationUrl}
            className="absolute inset-0 w-full h-full"
            allow="camera; microphone; autoplay"
            style={{ border: 'none' }}
          />
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
              className="text-lg font-medium"
              style={{ color: 'var(--text-secondary)' }}
            >
              Click to start conversation
            </span>
            <div
              className="px-4 py-2 rounded-full transition-all group-hover:scale-105"
              style={{
                backgroundColor: 'var(--accent-primary)',
                color: 'var(--text-primary)',
              }}
            >
              Talk to DRAKO
            </div>
          </button>
        )}
      </div>

      <VoiceIndicator active={isActive} speaker={speaker} />
    </div>
  );
}
