'use client';

import { useEffect } from 'react';
import { isValidSpaceId, newSpaceId } from '@/lib/id';

const LAST_SPACE_KEY = 'crave:space';

/**
 * Einstiegspunkt: leitet auf den zuletzt genutzten Datenraum weiter und legt
 * beim allerersten Besuch einen neuen an. Der Datenraum steckt in der URL –
 * genau dieser Link wird zwischen iPhone, iPad und Computer geteilt.
 */
export function Bootstrap() {
  useEffect(() => {
    let id: string | null = null;
    try {
      const stored = window.localStorage.getItem(LAST_SPACE_KEY);
      if (stored && isValidSpaceId(stored)) id = stored;
    } catch {
      /* privater Modus */
    }
    if (!id) {
      id = newSpaceId();
      try {
        window.localStorage.setItem(LAST_SPACE_KEY, id);
      } catch {
        /* privater Modus – der Link in der Adresszeile bleibt trotzdem gueltig */
      }
    }
    window.location.replace(`/s/${id}`);
  }, []);

  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'grid',
        placeItems: 'center',
        padding: 24,
        textAlign: 'center',
      }}
    >
      <div>
        <div className="brand" style={{ fontSize: 30, marginBottom: 10 }}>
          Cr<em>a</em>ve
        </div>
        <p className="muted">Küche wird vorbereitet…</p>
        <noscript>
          <p className="muted">Bitte aktiviere JavaScript, um CRAVE zu benutzen.</p>
        </noscript>
      </div>
    </div>
  );
}
