'use client';

import React, { useEffect, useState } from 'react';
import { SyncInfo } from '@/lib/store';
import { IconClose } from './Icons';

const DISMISS_KEY = 'crave:cloud-notice-dismissed';

/**
 * Sichtbarer Hinweis zum Speicherort.
 *
 * Zwei Faelle, die sich deutlich unterscheiden muessen:
 * - Es ist keine Datenbank eingerichtet. Alles funktioniert, aber nur lokal.
 * - Es ist eine eingerichtet, sie antwortet aber nicht. Dann ist etwas falsch
 *   konfiguriert, und das darf nicht wie ein harmloser Zustand aussehen.
 */
export function CloudNotice({
  sync,
  onOpenSettings,
}: {
  sync: SyncInfo;
  onOpenSettings: () => void;
}) {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    try {
      setDismissed(window.localStorage.getItem(DISMISS_KEY) === '1');
    } catch {
      setDismissed(false);
    }
  }, []);

  const broken = sync.dbUnreachable;

  // Eine kaputte Datenbank laesst sich nicht wegklicken – sie muss repariert
  // werden, sonst geht bei jedem Abgleich etwas schief.
  if (dismissed && !broken) return null;

  return (
    <div className={`notice ${broken ? 'notice--error' : 'notice--warn'}`} role="status">
      <div className="rowline" style={{ alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {broken ? (
            <>
              <strong>Datenbank antwortet nicht.</strong> Es ist eine Datenbank hinterlegt, die
              Verbindung schlägt aber fehl. Deine Änderungen bleiben auf diesem Gerät gespeichert
              und werden nachgeholt, sobald die Verbindung steht.
            </>
          ) : (
            <>
              <strong>Geräte-Abgleich noch nicht aktiv.</strong> Diese Installation hat noch keine
              Datenbank. Alles funktioniert, deine Daten liegen aber nur auf diesem Gerät und
              können noch nicht verlässlich mit iPhone und iPad geteilt werden.
            </>
          )}
        </div>
        {broken ? null : (
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
        )}
      </div>
      <button className="btn btn--ghost" style={{ marginTop: 10 }} onClick={onOpenSettings}>
        {broken ? 'Details anzeigen' : 'Was jetzt fehlt'}
      </button>
    </div>
  );
}
