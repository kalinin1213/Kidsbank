'use client';

import { useEffect } from 'react';

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/Kidsbank/sw.js').catch(() => {
        // Service worker registration failed - ignore silently
      });
    }
  }, []);

  return null;
}
