'use client';

import { useState, useEffect, useCallback } from 'react';

export function ServiceWorkerRegistration() {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [showUpdate, setShowUpdate] = useState(false);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    navigator.serviceWorker
      .register('/Kidsbank/sw.js')
      .then((registration) => {
        if (registration.waiting) {
          setWaitingWorker(registration.waiting);
          setShowUpdate(true);
          return;
        }

        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              setWaitingWorker(newWorker);
              setShowUpdate(true);
            }
          });
        });
      })
      .catch(() => {
        // Service worker registration failed - ignore silently
      });

    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });
  }, []);

  const handleUpdate = useCallback(() => {
    if (waitingWorker) {
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    }
  }, [waitingWorker]);

  if (!showUpdate) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 flex items-center justify-between bg-emerald-600 text-white px-4 py-3 rounded-2xl shadow-lg">
      <span className="text-sm font-medium">A new version is available</span>
      <button
        onClick={handleUpdate}
        className="ml-4 bg-white text-emerald-700 font-semibold px-4 py-1.5 rounded-xl text-sm hover:bg-emerald-50 transition-colors"
      >
        Update
      </button>
    </div>
  );
}
