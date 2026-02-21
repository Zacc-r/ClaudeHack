'use client';

import { VoiceIndicator } from './VoiceIndicator';

interface VideoCallProps {
  conversationUrl: string | null;
  isActive: boolean;
  isConnecting?: boolean;
  speaker: 'drako' | 'user' | 'idle';
  userName?: string;
  onStartConversation: () => void;
  onEndConversation?: () => void;
}

export function VideoCall({
  conversationUrl,
  isActive,
  isConnecting,
  speaker,
  userName,
  onStartConversation,
  onEndConversation,
}: VideoCallProps) {
  return (
    <div className="flex flex-col gap-4">
      <div
        className={`relative rounded-2xl overflow-hidden transition-all duration-300 ${
          isActive ? 'animate-pulse-glow' : ''
        }`}
        style={{
          backgroundColor: 'var(--bg-tertiary)',
          border: isActive
            ? '2px solid var(--accent-glow)'
            : '2px solid var(--border)',
          minHeight: '320px',
          aspectRatio: '16/9',
        }}
      >
        {conversationUrl && !isConnecting ? (
          <iframe
            src={conversationUrl}
            className="absolute inset-0 w-full h-full rounded-2xl"
            allow="camera; microphone; autoplay"
            style={{ border: 'none' }}
          />
        ) : isConnecting ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
            <span className="text-5xl animate-eyePulse">🐉</span>
            <span
              className="text-lg font-medium"
              style={{ color: 'var(--accent-primary)' }}
            >
              Connecting to DRAKO...
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
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 p-8">
            <span
              className="text-7xl"
              style={{ animation: 'float 3s ease-in-out infinite' }}
            >
              🐉
            </span>
            <p
              className="text-lg text-center"
              style={{ color: 'var(--text-secondary)' }}
            >
              {userName ? `Hey ${userName}! Ready to plan your day?` : 'Ready to plan your day?'}
            </p>
            <button
              onClick={onStartConversation}
              className="px-8 py-4 rounded-2xl text-lg font-semibold text-white transition-all hover:scale-105"
              style={{
                background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-glow))',
                boxShadow: '0 0 30px rgba(108, 92, 231, 0.3)',
              }}
            >
              🎙️ Start Talking to DRAKO
            </button>
            <p
              className="text-xs"
              style={{ color: 'var(--text-muted)' }}
            >
              Microphone + camera required
            </p>
          </div>
        )}
      </div>

      <VoiceIndicator active={isActive} speaker={speaker} />

      {conversationUrl && onEndConversation && (
        <button
          onClick={onEndConversation}
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
