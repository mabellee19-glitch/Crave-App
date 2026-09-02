'use client';

import React, { useEffect } from 'react';
import { StoreProvider } from '@/lib/store';
import { AppShell } from './AppShell';

const LAST_SPACE_KEY = 'crave:space';

export function SpaceApp({ spaceId }: { spaceId: string }) {
  // Merken, damit ein Aufruf der Startseite direkt hierher zurueckfuehrt.
  useEffect(() => {
    try {
      window.localStorage.setItem(LAST_SPACE_KEY, spaceId);
    } catch {
      /* privater Modus */
    }
  }, [spaceId]);

  // Service Worker fuer den Offline-Betrieb registrieren.
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') return;
    const register = () => navigator.serviceWorker.register('/sw.js').catch(() => {});
    if (document.readyState === 'complete') register();
    else window.addEventListener('load', register, { once: true });
  }, []);

  return (
    <StoreProvider spaceId={spaceId}>
      <AppShell />
    </StoreProvider>
  );
}
