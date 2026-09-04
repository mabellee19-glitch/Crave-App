'use client';

import React from 'react';
import { formatClock } from '@/lib/units';
import { IconPause, IconPlay, IconRestart, IconTimer } from './Icons';

/**
 * Zustand eines Schritt-Timers.
 *
 * Gerechnet wird mit einem Ziel-Zeitpunkt statt mit einem Herunterzählen.
 * Dadurch stimmt die Restzeit auch dann noch, wenn Safari den Tab im
 * Hintergrund drosselt oder das Display aus war.
 */
export interface TimerState {
  /** Zeitpunkt des Ablaufs, `null` wenn der Timer steht. */
  endsAt: number | null;
  /** Verbleibende Sekunden, wenn der Timer steht bzw. beim letzten Takt. */
  remaining: number;
  ringing: boolean;
}

export function initialTimerState(durationSec: number): TimerState {
  return { endsAt: null, remaining: durationSec, ringing: false };
}

export function isTimerActive(state: TimerState | undefined): boolean {
  return Boolean(state && (state.endsAt !== null || state.ringing));
}

export function remainingSeconds(state: TimerState, now = Date.now()): number {
  if (state.endsAt === null) return state.remaining;
  return Math.max(0, Math.round((state.endsAt - now) / 1000));
}

/**
 * Anzeige und Bedienung eines Timers. Die Komponente hält keinen eigenen
 * Zustand: der liegt im Kochmodus, damit ein laufender Timer beim Wechsel auf
 * den nächsten Schritt weiterläuft.
 */
export function Timer({
  duration,
  state,
  onStart,
  onPause,
  onReset,
  onDismiss,
  label = 'Timer',
}: {
  duration: number;
  state: TimerState;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
  onDismiss: () => void;
  label?: string;
}) {
  const running = state.endsAt !== null;
  const seconds = remainingSeconds(state);

  return (
    <div className={`timer${state.ringing ? ' timer--ringing' : ''}`}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="timer__label">{state.ringing ? 'Zeit ist um' : label}</div>
        <div className="timer__clock">{formatClock(seconds)}</div>
      </div>
      <div className="timer__actions">
        {state.ringing ? (
          <button className="btn btn--primary" onClick={onDismiss}>
            Fertig
          </button>
        ) : (
          <>
            <button
              className="iconbtn"
              onClick={onReset}
              aria-label="Timer zurücksetzen"
              disabled={!running && seconds === duration}
            >
              <IconRestart size={20} />
            </button>
            <button
              className="btn btn--primary"
              onClick={running ? onPause : onStart}
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
