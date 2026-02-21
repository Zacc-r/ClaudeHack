'use client';

import { useEffect, useState } from 'react';
import { useQRCode } from 'next-qrcode';

export default function SharePage() {
  const { Canvas } = useQRCode();
  const [localUrl, setLocalUrl] = useState<string | null>(null);
  const [publicUrl, setPublicUrl] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      const port = window.location.port;
      
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        setLocalUrl(`http://${hostname}:${port}`);
      } else {
        setLocalUrl(window.location.origin);
      }

      if (process.env.NEXT_PUBLIC_VERCEL_URL) {
        setPublicUrl(`https://${process.env.NEXT_PUBLIC_VERCEL_URL}`);
      } else if (!hostname.includes('localhost') && !hostname.includes('127.0.0.1')) {
        setPublicUrl(window.location.origin);
      }
    }
  }, []);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-8"
      style={{ backgroundColor: 'var(--bg-primary)' }}
    >
      <div className="text-center mb-8">
        <span className="text-6xl block mb-4">🐉</span>
        <h1
          className="text-3xl font-bold mb-2"
          style={{ color: 'var(--text-primary)' }}
        >
          Try DRAKO
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Voice-powered schedule builder
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {localUrl && (
          <div
            className="p-6 rounded-2xl text-center"
            style={{
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
            }}
          >
            <h2
              className="text-lg font-semibold mb-4"
              style={{ color: 'var(--text-primary)' }}
            >
              📱 Same WiFi Network
            </h2>
            <div
              className="p-4 rounded-xl inline-block mb-4"
              style={{ backgroundColor: 'white' }}
            >
              <Canvas
                text={localUrl}
                options={{
                  errorCorrectionLevel: 'M',
                  margin: 2,
                  scale: 6,
                  width: 200,
                  color: {
                    dark: '#0A0A0F',
                    light: '#FFFFFF',
                  },
                }}
              />
            </div>
            <p
              className="text-sm font-mono"
              style={{ color: 'var(--text-muted)' }}
            >
              {localUrl}
            </p>
          </div>
        )}

        {publicUrl && publicUrl !== localUrl && (
          <div
            className="p-6 rounded-2xl text-center"
            style={{
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
            }}
          >
            <h2
              className="text-lg font-semibold mb-4"
              style={{ color: 'var(--text-primary)' }}
            >
              🌐 Public URL
            </h2>
            <div
              className="p-4 rounded-xl inline-block mb-4"
              style={{ backgroundColor: 'white' }}
            >
              <Canvas
                text={publicUrl}
                options={{
                  errorCorrectionLevel: 'M',
                  margin: 2,
                  scale: 6,
                  width: 200,
                  color: {
                    dark: '#6C5CE7',
                    light: '#FFFFFF',
                  },
                }}
              />
            </div>
            <p
              className="text-sm font-mono"
              style={{ color: 'var(--text-muted)' }}
            >
              {publicUrl}
            </p>
          </div>
        )}
      </div>

      <div
        className="mt-8 p-4 rounded-xl text-center max-w-md"
        style={{
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
        }}
      >
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          <strong style={{ color: 'var(--text-primary)' }}>Demo instructions:</strong>
          <br />
          1. Scan QR code with your phone camera
          <br />
          2. Complete the 45-second onboarding
          <br />
          3. Tap &quot;Talk to DRAKO&quot; to start voice conversation
          <br />
          4. Say things like &quot;Move my focus block to 2pm&quot;
        </p>
      </div>

      <a
        href="/"
        className="mt-6 px-6 py-3 rounded-xl font-medium transition-all hover:scale-105"
        style={{
          backgroundColor: 'var(--accent-primary)',
          color: 'white',
        }}
      >
        ← Back to App
      </a>
    </div>
  );
}
