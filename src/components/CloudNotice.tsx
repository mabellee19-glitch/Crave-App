'use client';

import React, { useEffect, useState } from 'react';
import { useSync } from '@/lib/store';
import { useT } from '@/lib/i18n';
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
export function CloudNotice({ onOpenSettings }: { onOpenSettings: () => void }) {
  const sync = useSync();
  const t = useT();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    try {
      setDismissed(window.localStorage.getItem(DISMISS_KEY) === '1');
    } catch {
      setDismissed(false);
    }
  }, []);

  const broken = sync.dbUnreachable;

  // Nur, wenn es etwas zu sagen gibt: keine Datenbank oder eine, die nicht antwortet.
  if (sync.cloud !== false && !broken) return null;
  // Eine kaputte Datenbank laesst sich nicht wegklicken – sie muss repariert
  // werden, sonst geht bei jedem Abgleich etwas schief.
  if (dismissed && !broken) return null;

  return (
    <div style={{ paddingTop: 18 }}>
      <div className={`notice ${broken ? 'notice--error' : 'notice--warn'}`} role="status">
        <div className="rowline" style={{ alignItems: 'flex-start' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {broken ? (
              <>
                <strong>{t.cloud.kaputtTitel}</strong> {t.cloud.kaputtText}
              </>
            ) : (
              <>
                <strong>{t.cloud.lokalTitel}</strong> {t.cloud.lokalText}
              </>
            )}
          </div>
          {broken ? null : (
            <button
              className="iconbtn iconbtn--plain"
              aria-label={t.cloud.ausblenden}
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
          {broken ? t.cloud.details : t.cloud.wasFehlt}
        </button>
      </div>
    </div>
  );
}
