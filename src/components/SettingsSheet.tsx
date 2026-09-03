'use client';

import React, { useEffect, useState } from 'react';
import { SyncInfo } from '@/lib/store';
import { Sheet } from './ui';
import { IconCheck, IconLink, IconRefresh, IconShare } from './Icons';

export function SettingsSheet({
  spaceId,
  sync,
  counts,
  onSyncNow,
  onClose,
}: {
  spaceId: string;
  sync: SyncInfo;
  counts: { recipes: number; dishes: number; shopping: number; pantry: number };
  onSyncNow: () => void;
  onClose: () => void;
}) {
  const [url, setUrl] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setUrl(`${window.location.origin}/s/${spaceId}`);
  }, [spaceId]);

  const share = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: 'CRAVE', url });
        return;
      }
    } catch {
      /* Abbruch durch die Nutzerin ist kein Fehler */
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2400);
    } catch {
      /* Zwischenablage nicht verfuegbar – der Link steht ja sichtbar da */
    }
  };

  return (
    <Sheet title="Einstellungen & Sync" onClose={onClose}>
      <div style={{ height: 16 }} />

      <div className="detail__h">Dein Link</div>
      <p className="muted" style={{ fontSize: 14.5, margin: '8px 0 12px' }}>
        Öffne diesen Link auf iPhone, iPad und Computer. Alle Geräte mit diesem Link sehen
        denselben Datenstand.
      </p>
      <div className="linkbox">
        <IconLink size={16} />
        <span>{url}</span>
      </div>
      <div className="rowline" style={{ marginTop: 10 }}>
        <button className="btn btn--primary" onClick={share}>
          {copied ? <IconCheck size={18} /> : <IconShare size={18} />}
          {copied ? 'Link kopiert' : 'Link teilen'}
        </button>
      </div>

      <hr className="divider" />

      <div className="detail__h">Synchronisation</div>
      <div className="notice" style={{ marginTop: 10 }}>
        <div className="rowline" style={{ marginBottom: 8 }}>
          <SyncBadge sync={sync} />
          <span className="spacer" />
          <button className="btn btn--ghost" style={{ minHeight: 38 }} onClick={onSyncNow}>
            <IconRefresh size={17} />
            Jetzt abgleichen
          </button>
        </div>
        {sync.dbUnreachable ? (
          <p>
            <strong>Die hinterlegte Datenbank antwortet nicht.</strong> Häufigste Ursache: eine
            Umgebungsvariable mit einer Verbindung, die es nicht gibt – etwa ein Platzhalter aus
            einer Beispieldatei. Unter <code>/api/status</code> steht, welche Variable genutzt wird
            und woran die Verbindung scheitert.
            {sync.error ? (
              <>
                {' '}
                Meldung: <code>{sync.error}</code>
              </>
            ) : null}
          </p>
        ) : sync.cloud === false ? (
          <p>
            <strong>Cloud-Datenbank nicht konfiguriert.</strong> Der Server speichert die Daten
            momentan nur flüchtig. Für dauerhafte Synchronisation zwischen deinen Geräten muss die
            Umgebungsvariable <code>DATABASE_URL</code> gesetzt sein – siehe README.
          </p>
        ) : sync.cloud === true ? (
          <p>
            Änderungen werden automatisch gespeichert und mit allen Geräten abgeglichen, die diesen
            Link geöffnet haben.
          </p>
        ) : (
          <p>Verbindung zum Server wird geprüft…</p>
        )}
        {sync.lastSyncedAt ? (
          <p className="row__note" style={{ marginTop: 8 }}>
            Zuletzt abgeglichen: {new Date(sync.lastSyncedAt).toLocaleTimeString('de-CH')}
          </p>
        ) : null}
      </div>

      <hr className="divider" />

      <div className="detail__h">Zum Home-Bildschirm hinzufügen</div>
      <p className="muted" style={{ fontSize: 14.5, marginTop: 8 }}>
        In Safari auf «Teilen» tippen und «Zum Home-Bildschirm» wählen. Danach startet CRAVE wie
        eine App im Vollbild.
      </p>

      <hr className="divider" />

      <div className="detail__h">Gespeichert</div>
      <div className="rowline" style={{ marginTop: 10, gap: 8 }}>
        <span className="tag">{counts.recipes} Rezepte</span>
        <span className="tag">{counts.dishes} Gerichte</span>
        <span className="tag">{counts.shopping} auf der Liste</span>
        <span className="tag">{counts.pantry} Standard-Zutaten</span>
      </div>
      <div style={{ height: 16 }} />
    </Sheet>
  );
}

export function SyncBadge({ sync }: { sync: SyncInfo }) {
  const label =
    sync.state === 'offline'
      ? 'Offline – Änderungen werden gespeichert'
      : sync.state === 'syncing'
        ? 'Wird abgeglichen…'
        : sync.state === 'synced'
          ? 'Alles synchronisiert'
          : 'Bereit';
  const modifier =
    sync.state === 'offline' ? ' syncdot__led--offline' : sync.state === 'syncing' ? ' syncdot__led--syncing' : '';

  return (
    <span className="syncdot">
      <span className={`syncdot__led${modifier}`} />
      {label}
    </span>
  );
}
