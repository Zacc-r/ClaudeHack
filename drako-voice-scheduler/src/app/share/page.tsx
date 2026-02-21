'use client';

import { useEffect, useState } from 'react';
import { useQRCode } from 'next-qrcode';

interface ShareUrls {
  local: string;
  public: string | null;
  primary: string;
}

export default function SharePage() {
  const { Canvas } = useQRCode();
  const [urls, setUrls] = useState<ShareUrls>({
    local: 'http://localhost:3000',
    public: null,
    primary: 'http://localhost:3000',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/share')
      .then(res => res.json())
      .then(data => {
        setUrls({
          local: data.local || 'http://localhost:3000',
          public: data.public || null,
          primary: data.primary || data.local || 'http://localhost:3000',
        });
      })
      .catch(() => {
        if (typeof window !== 'undefined') {
          const origin = window.location.origin;
          setUrls({ local: origin, public: null, primary: origin });
        }
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: 'var(--bg-primary)' }}
      >
        <span className="text-4xl animate-pulse">🐉</span>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-8"
      style={{ backgroundColor: 'var(--bg-primary)' }}
    >
      <h1
        className="text-4xl font-bold mb-2"
        style={{ color: 'var(--text-primary)' }}
      >
        🐉 Try DRAKO
      </h1>
      <p
        className="text-lg mb-8"
        style={{ color: 'var(--text-secondary)' }}
      >
        Voice-powered AI schedule builder
      </p>

      <div
        className="p-6 rounded-3xl mb-6"
        style={{ backgroundColor: 'white' }}
      >
        <Canvas
          text={urls.primary}
          options={{
            errorCorrectionLevel: 'M',
            margin: 2,
            scale: 6,
            width: 250,
            color: { dark: '#0A0A0F', light: '#FFFFFF' },
          }}
        />
      </div>

      <div className="text-center mb-6">
        <p
          className="text-sm mb-2"
          style={{ color: 'var(--text-muted)' }}
        >
          Scan with your phone camera
        </p>
        <p
          className="font-mono text-sm px-4 py-2 rounded-lg inline-block"
          style={{
            color: 'var(--accent-primary)',
            background: 'rgba(108, 92, 231, 0.1)',
            border: '1px solid rgba(108, 92, 231, 0.2)',
          }}
        >
          {urls.primary}
        </p>
      </div>

      <div className="max-w-sm text-center space-y-2 mb-8">
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          📱 Make sure you&apos;re on the same WiFi network
        </p>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          🎙️ Allow microphone + camera when prompted
        </p>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          ⏱️ Onboarding takes ~30 seconds
        </p>
      </div>

      {urls.public && urls.public !== urls.local && (
        <div
          className="p-4 rounded-2xl text-center mb-8"
          style={{
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
          }}
        >
          <p
            className="text-xs mb-2"
            style={{ color: 'var(--text-muted)' }}
          >
            Remote access (any network):
          </p>
          <p
            className="font-mono text-sm"
            style={{ color: 'var(--accent-primary)' }}
          >
            {urls.public}
          </p>
        </div>
      )}

      <a
        href="/"
        className="px-6 py-3 rounded-xl font-medium transition-all hover:scale-105"
        style={{
          backgroundColor: 'var(--accent-primary)',
          color: 'white',
        }}
      >
        ← Back to App
      </a>

      <div className="mt-12 text-center">
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          Built at the AI Interfaces Hackathon • Feb 21, 2026
        </p>
        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
          Powered by Tavus CVI + Claude + Redis
        </p>
      </div>
    </div>
  );
}
