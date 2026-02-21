'use client';

import { VoiceIndicator } from './VoiceIndicator';
import { DrakoRobot } from './DrakoRobot';

interface VideoCallProps {
  conversationUrl: string | null;
  isActive: boolean;
  isConnecting?: boolean;
  connectionError?: string | null;
  speaker: 'drako' | 'user' | 'idle';
  userName?: string;
  onStartConversation: () => void;
  onEndConversation?: () => void;
}

function CornerAccents() {
  const style = {
    position: 'absolute' as const,
    width: '20px',
    height: '20px',
    pointerEvents: 'none' as const,
  };
  return (
    <>
      <div style={{ ...style, top: 8, left: 8, borderTop: '2px solid #38BDF8', borderLeft: '2px solid #38BDF8' }} />
      <div style={{ ...style, top: 8, right: 8, borderTop: '2px solid #818CF8', borderRight: '2px solid #818CF8' }} />
      <div style={{ ...style, bottom: 8, left: 8, borderBottom: '2px solid #818CF8', borderLeft: '2px solid #818CF8' }} />
      <div style={{ ...style, bottom: 8, right: 8, borderBottom: '2px solid #38BDF8', borderRight: '2px solid #38BDF8' }} />
    </>
  );
}

export function VideoCall({
  conversationUrl,
  isActive,
  isConnecting,
  connectionError,
  speaker,
  userName,
  onStartConversation,
  onEndConversation,
}: VideoCallProps) {
  return (
    <div className="flex flex-col gap-4">
      <div
        className={`relative rounded-2xl overflow-hidden transition-all duration-500 ${
          isActive ? 'animate-glowPulse' : ''
        }`}
        style={{
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          border: isActive
            ? '2px solid #38BDF8'
            : '2px solid #334155',
          minHeight: '320px',
          aspectRatio: '16/9',
          backdropFilter: 'blur(20px)',
        }}
      >
        {/* Active call corner accent marks */}
        {isActive && <CornerAccents />}

        {connectionError && !isConnecting ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 p-8">
            <div className="text-5xl">😔</div>
            <div className="text-center">
              <p className="text-lg font-semibold text-white mb-2">Connection Failed</p>
              <p className="text-sm text-[#94A3B8] max-w-xs">{connectionError}</p>
            </div>
            <button
              onClick={onStartConversation}
              className="px-8 py-4 rounded-2xl font-bold text-white transition-all hover:scale-105 active:scale-95"
              style={{
                background: 'linear-gradient(135deg, #38BDF8, #818CF8)',
              }}
            >
              Try Again
            </button>
          </div>
        ) : conversationUrl && !isConnecting ? (
          <>
            <iframe
              src={conversationUrl}
              className="absolute inset-0 w-full h-full rounded-2xl"
              allow="camera; microphone; autoplay"
              style={{ border: 'none' }}
            />
            <CornerAccents />
          </>
        ) : isConnecting ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-6">
            <DrakoRobot size="xl" state="thinking" />
            <span
              className="text-lg font-semibold bg-gradient-to-r from-[#38BDF8] to-[#818CF8] bg-clip-text text-transparent animate-pulse"
            >
              Connecting to DRAKO...
            </span>
            <div
              className="w-40 h-1.5 rounded-full overflow-hidden"
              style={{ backgroundColor: 'rgba(30, 41, 59, 0.8)' }}
            >
              <div
                className="h-full rounded-full animate-buildSchedule"
                style={{
                  background: 'linear-gradient(90deg, #38BDF8, #818CF8)',
                  animationDuration: '3s',
                }}
              />
            </div>
          </div>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-8 p-8">
            <DrakoRobot size="xl" state="idle" />

            <div className="text-center">
              <p className="text-xl font-semibold text-white mb-2">
                {userName ? `Hey ${userName}!` : 'Hey there!'}
              </p>
              <p className="text-[#94A3B8]">
                Ready to plan your perfect day?
              </p>
            </div>

            {/* CTA button with pulsing ring */}
            <div className="relative">
              <div
                className="absolute inset-0 rounded-2xl"
                style={{
                  border: '2px solid rgba(56,189,248,0.4)',
                  animation: 'pulseRing 2s ease-out infinite',
                }}
              />
              <button
                onClick={onStartConversation}
                className="relative px-10 py-5 rounded-2xl text-lg font-bold text-white transition-all hover:scale-105 active:scale-95 btn-glow"
                style={{
                  background: 'linear-gradient(135deg, #38BDF8, #818CF8)',
                }}
              >
                🎙️ Start Talking to DRAKO
              </button>
            </div>

            <p className="text-xs text-[#475569] flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#38BDF8] animate-pulse" />
              Microphone + camera required
            </p>
          </div>
        )}
      </div>

      <VoiceIndicator active={isActive} speaker={speaker} />

      {conversationUrl && onEndConversation && (
        <button
          onClick={onEndConversation}
          className="px-4 py-3 rounded-xl text-sm font-semibold transition-all hover:opacity-80 hover:scale-[0.98]"
          style={{
            background: 'linear-gradient(135deg, #EF4444, #DC2626)',
            color: 'white',
          }}
        >
          End Conversation
        </button>
      )}
    </div>
  );
}
