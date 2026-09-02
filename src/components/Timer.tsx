'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { formatClock } from '@/lib/units';
import { playAlarm, stopAlarm, vibrate } from '@/lib/audio';
import { IconPause, IconPlay, IconRestart, IconTimer } from './Icons';

/**
 * Kuechentimer fuer einen Zubereitungsschritt.
 *
 * Die Restzeit wird aus einem Ziel-Zeitstempel berechnet und nicht
 * heruntergezaehlt. Dadurch stimmt sie auch dann noch, wenn Safari den Tab im
 * Hintergrund drosselt oder das Display aus war.
 */
export function Timer({ durationSec, label }: { durationSec: number; label?: string }) {
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [remaining, setRemaining] = useState(durationSec);
  const [ringing, setRinging] = useState(false);
  const firedRef = useRef(false);

  const running = endsAt !== null;

  // Bei Schrittwechsel zuruecksetzen.
  useEffect(() => {
    setEndsAt(null);
    setRemaining(durationSec);
    setRinging(false);
    firedRef.current = false;
    stopAlarm();
  }, [durationSec]);

  const ring = useCallback(() => {
    if (firedRef.current) return;
    firedRef.current = true;
    setRinging(true);
    setEndsAt(null);
    setRemaining(0);
    playAlarm();
    vibrate([300, 150, 300, 150, 500]);
  }, []);

  useEffect(() => {
    if (endsAt == null) return;
    const tick = () => {
      const left = Math.round((endsAt - Date.now()) / 1000);
      if (left <= 0) ring();
      else setRemaining(left);
    };
    tick();
    const handle = setInterval(tick, 250);
    const onVisible = () => tick();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(handle);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [endsAt, ring]);

  useEffect(() => () => stopAlarm(), []);

  const start = () => {
    stopAlarm();
    setRinging(false);
    firedRef.current = false;
    setEndsAt(Date.now() + remaining * 1000);
  };

  const pause = () => {
    if (endsAt == null) return;
    setRemaining(Math.max(0, Math.round((endsAt - Date.now()) / 1000)));
    setEndsAt(null);
  };

  const reset = () => {
    stopAlarm();
    setRinging(false);
    firedRef.current = false;
    setEndsAt(null);
    setRemaining(durationSec);
  };

  const dismiss = () => {
    stopAlarm();
    setRinging(false);
    setRemaining(durationSec);
    firedRef.current = false;
  };

  return (
    <div className={`timer${ringing ? ' timer--ringing' : ''}`}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="timer__label">
          {ringing ? 'Zeit ist um' : (label ?? 'Timer')}
        </div>
        <div className="timer__clock" aria-live="off">
          {formatClock(remaining)}
        </div>
      </div>
      <div className="timer__actions">
        {ringing ? (
          <button className="btn btn--primary" onClick={dismiss}>
            Fertig
          </button>
        ) : (
          <>
            <button
              className="iconbtn"
              onClick={reset}
              aria-label="Timer zurücksetzen"
              disabled={!running && remaining === durationSec}
            >
              <IconRestart size={20} />
            </button>
            <button
              className="btn btn--primary"
              onClick={running ? pause : start}
              aria-label={running ? 'Timer pausieren' : 'Timer starten'}
            >
              {running ? <IconPause size={18} /> : <IconPlay size={18} />}
              {running ? 'Pause' : 'Start'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export function TimerHint({ seconds }: { seconds: number }) {
  return (
    <span className="step__timer">
      <IconTimer size={14} />
      {formatClock(seconds)}
    </span>
  );
}
