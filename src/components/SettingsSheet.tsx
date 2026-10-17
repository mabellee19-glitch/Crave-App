'use client';

import React, { useEffect, useState } from 'react';
import { SyncInfo, useSync } from '@/lib/store';
import { Sheet } from './ui';
import { testAlarm } from '@/lib/audio';
import { STANDARD_THEME, THEMES, applyTheme, readTheme } from '@/lib/theme';
import { IconCheck, IconLink, IconPlus, IconRefresh, IconShare, IconTimer } from './Icons';
import { useT } from '@/lib/i18n';

export function SettingsSheet({
  spaceId,
  counts,
  onSyncNow,
  onAddMissingRecipes,
  onClose,
}: {
  spaceId: string;
  counts: { recipes: number; ideen: number; shopping: number; pantry: number };
  onSyncNow: () => void;
  onAddMissingRecipes: () => void;
  onClose: () => void;
}) {
  const sync = useSync();
  const t = useT().einstellungen;
  const [url, setUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [theme, setTheme] = useState(STANDARD_THEME);

  useEffect(() => {
    setTheme(readTheme());
  }, []);

  useEffect(() => {
    setUrl(`${window.location.origin}/s/${spaceId}`);
  }, [spaceId]);

  const share = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Crave', url });
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
    <Sheet title={t.titel} onClose={onClose}>
      <div style={{ height: 16 }} />

      <div className="detail__h" id="design-heading">
        {t.design}
      </div>
      <p className="muted" style={{ fontSize: 14.5, margin: '8px 0 12px' }}>
        {t.designText}
      </p>
      <div className="themegrid" role="radiogroup" aria-labelledby="design-heading">
        {THEMES.map((entry) => {
          const aktiv = theme === entry.id;
          const [grund, karte, akzent, zweit] = entry.vorschau;
          return (
            <button
              key={entry.id}
              role="radio"
              aria-checked={aktiv}
              className={`themecard${aktiv ? ' themecard--active' : ''}`}
              onClick={() => {
                applyTheme(entry.id);
                setTheme(entry.id);
              }}
            >
              <span className="themecard__preview" style={{ background: grund }} aria-hidden="true">
                <span className="themecard__card" style={{ background: karte }}>
                  <span className="themecard__line" style={{ background: akzent }} />
                  <span className="themecard__line themecard__line--short" style={{ background: zweit }} />
                </span>
                <span className="themecard__button" style={{ background: akzent }} />
              </span>
              <span className="themecard__name">
                {entry.name}
                {aktiv ? <IconCheck size={15} /> : null}
              </span>
              <span className="themecard__text">{entry.beschreibung}</span>
            </button>
          );
        })}
      </div>

      <hr className="divider" />

      <div className="detail__h">{t.link}</div>
      <p className="muted" style={{ fontSize: 14.5, margin: '8px 0 12px' }}>
        {t.linkText}
      </p>
      <div className="linkbox">
        <IconLink size={16} />
        <span>{url}</span>
      </div>
      <div className="rowline" style={{ marginTop: 10 }}>
        <button className="btn btn--primary" onClick={share}>
          {copied ? <IconCheck size={18} /> : <IconShare size={18} />}
          {copied ? t.linkKopiert : t.linkTeilen}
        </button>
      </div>

      <hr className="divider" />

      <div className="detail__h">{t.sync}</div>
      <div className="notice" style={{ marginTop: 10 }}>
        <div className="rowline" style={{ marginBottom: 8 }}>
          <SyncBadge />
          <span className="spacer" />
          <button className="btn btn--ghost" style={{ minHeight: 38 }} onClick={onSyncNow}>
            <IconRefresh size={17} />
            {t.jetztAbgleichen}
          </button>
        </div>
        {sync.dbUnreachable ? (
          <p>
            <strong>{t.dbFehltTitel}</strong>
            {t.dbFehltText1}
            <code>/api/status</code>
            {t.dbFehltText2}
            {sync.error ? (
              <>
                {' '}
                {t.meldung} <code>{sync.error}</code>
              </>
            ) : null}
          </p>
        ) : sync.cloud === false ? (
          <p>
            <strong>{t.keineCloudTitel}</strong>
            {t.keineCloudText1}
            <code>DATABASE_URL</code>
            {t.keineCloudText2}
          </p>
        ) : sync.cloud === true ? (
          <p>{t.cloudOk}</p>
        ) : (
          <p>{t.pruefen}</p>
        )}
        {sync.lastSyncedAt ? (
          <p className="row__note" style={{ marginTop: 8 }}>
            {t.zuletzt(new Date(sync.lastSyncedAt).toLocaleTimeString(t.zeitformat))}
          </p>
        ) : null}
      </div>

      <hr className="divider" />

      <div className="detail__h">{t.home}</div>
      <p className="muted" style={{ fontSize: 14.5, marginTop: 8 }}>
        {t.homeText}
      </p>

      <hr className="divider" />

      <div className="detail__h">{t.start}</div>
      <p className="muted" style={{ fontSize: 14.5, margin: '8px 0 12px' }}>
        {t.startText}
      </p>
      <button className="btn btn--ghost" onClick={onAddMissingRecipes}>
        <IconPlus size={18} />
        {t.nachtragen}
      </button>

      <hr className="divider" />

      <div className="detail__h">{t.timer}</div>
      <p className="muted" style={{ fontSize: 14.5, margin: '8px 0 12px' }}>
        {t.timerText}
      </p>
      <button className="btn btn--ghost" onClick={() => testAlarm()}>
        <IconTimer size={18} />
        {t.timerTesten}
      </button>

      <hr className="divider" />

      <div className="detail__h">{t.gespeichert}</div>
      <div className="rowline" style={{ marginTop: 10, gap: 8 }}>
        <span className="tag">{t.zaehlerRezepte(counts.recipes)}</span>
        <span className="tag">{t.zaehlerIdeen(counts.ideen)}</span>
        <span className="tag">{t.zaehlerEinkauf(counts.shopping)}</span>
        <span className="tag">{t.zaehlerStandard(counts.pantry)}</span>
      </div>
      <div style={{ height: 16 }} />
    </Sheet>
  );
}

/** Liest den Abgleich selbst – so zeichnet ein Wechsel nur diese Zeile neu. */
export function SyncBadge() {
  const sync: SyncInfo = useSync();
  const t = useT().einstellungen;
  const label =
    sync.state === 'offline'
      ? t.offline
      : sync.state === 'syncing'
        ? t.gleichtAb
        : sync.state === 'synced'
          ? t.synchron
          : t.bereit;
  const modifier =
    sync.state === 'offline' ? ' syncdot__led--offline' : sync.state === 'syncing' ? ' syncdot__led--syncing' : '';

  return (
    <span className="syncdot">
      <span className={`syncdot__led${modifier}`} />
      {label}
    </span>
  );
}
