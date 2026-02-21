'use client';

import { useEffect, useState } from 'react';

export function PWAUpdater() {
  const [showBanner, setShowBanner] = useState(false);
  const [reg, setReg] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    navigator.serviceWorker.ready.then(registration => {
      setReg(registration);

      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New version available
            setShowBanner(true);
          }
        });
      });
    });

    // Also check if there's already a waiting SW
    navigator.serviceWorker.getRegistration().then(r => {
      if (r?.waiting) setShowBanner(true);
    });
  }, []);

  const handleUpdate = () => {
    if (reg?.waiting) {
      reg.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
    window.location.reload();
  };

  if (!showBanner) return null;

  return (
    <div
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl"
      style={{
        background: 'linear-gradient(135deg, rgba(56,189,248,0.95), rgba(129,140,248,0.95))',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.2)',
      }}
    >
      <span className="text-white text-sm font-semibold">✨ New version available</span>
      <button
        onClick={handleUpdate}
        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white/20 hover:bg-white/30 text-white transition-all"
      >
        Update now
      </button>
    </div>
  );
}
