'use client';

import React, { useEffect, useState } from 'react';
import { IconClose } from './Icons';

const DISMISS_KEY = 'crave:cloud-notice-dismissed';

/**
 * Sichtbarer Hinweis, solange der Server keine Datenbank hat.
 *
 * Ohne Datenbank funktioniert die App vollstaendig, der Abgleich zwischen
 * Geraeten ist aber nicht verlaesslich. Das gehoert nach vorne und nicht nur
 * in die Einstellungen – sonst verlaesst sich jemand darauf.
 */
export function CloudNotice({ onOpenSettings }: { onOpenSettings: () => void }) {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    try {
      setDismissed(window.localStorage.getItem(DISMISS_KEY) === '1');
    } catch {
      setDismissed(false);
    }
  }, []);

  if (dismissed) return null;

  return (
    <div className="notice notice--warn" role="status">
      <div className="rowline" style={{ alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <strong>Geräte-Abgleich noch nicht aktiv.</strong> Diese Installation hat noch keine
          Datenbank. Alles funktioniert, deine Daten liegen aber nur auf diesem Gerät und können
          noch nicht verlässlich mit iPhone und iPad geteilt werden.
        </div>
        <button
          className="iconbtn iconbtn--plain"
          aria-label="Hinweis ausblenden"
          onClick={() => {
            setDismissed(true);
            try {
              window.localStorage.setItem(DISMISS_KEY, '1');
            } catch {
              /* privater Modus */
            }
          }}
        >
          <IconClose size={18} />
        </button>
      </div>
      <button className="btn btn--ghost" style={{ marginTop: 10 }} onClick={onOpenSettings}>
        Was jetzt fehlt
      </button>
    </div>
  );
}
