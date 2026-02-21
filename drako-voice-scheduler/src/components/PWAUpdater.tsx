'use client';

import { useEffect, useState } from 'react';

export function PWAUpdater() {
  const [showBanner, setShowBanner] = useState(false);
  const [reg, setReg] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    // Register service worker
    navigator.serviceWorker.register('/sw.js').then(registration => {
      setReg(registration);

      // New SW found while app is running
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            setShowBanner(true);
          }
        });
      });

      // Already a waiting SW (user came back after a while)
      if (registration.waiting) setShowBanner(true);

      // Periodically check for updates (every 5 min)
      setInterval(() => registration.update(), 5 * 60 * 1000);
    });

    // Reload when new SW takes control
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload();
    });
  }, []);

  const handleUpdate = () => {
    if (reg?.waiting) {
      reg.waiting.postMessage({ type: 'SKIP_WAITING' });
    } else {
      window.location.reload();
    }
  };

  if (!showBanner) return null;

  return (
    <div
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl"
      style={{
        background: 'linear-gradient(135deg, rgba(56,189,248,0.95), rgba(129,140,248,0.95))',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.2)',
        animation: 'fadeInUp 0.3s ease',
      }}
    >
      <span className="text-white text-sm font-semibold">✨ Update available</span>
      <button
        onClick={handleUpdate}
        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white/20 hover:bg-white/30 text-white transition-all"
      >
        Tap to update
      </button>
    </div>
  );
}
