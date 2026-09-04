'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Recipe } from '@/lib/types';
import { formatClock, formatQuantity, scaleAmount } from '@/lib/units';
import { playAlarm, stopAlarm, vibrate } from '@/lib/audio';
import { Portal, useBodyScrollLock } from './ui';
import { Timer, TimerState, initialTimerState, remainingSeconds } from './Timer';
import { IconChevronLeft, IconChevronRight, IconClose, IconTimer } from './Icons';
import { CookIntro, introErwuenscht } from './CookIntro';

/**
 * Kochmodus: ein Schritt pro Bildschirm, gross gesetzt, ohne Ablenkung.
 * Das Display bleibt waehrend des Kochens nach Moeglichkeit an.
 */
export function CookMode({
  recipe,
  servings,
  onClose,
}: {
  recipe: Recipe;
  servings: number;
  onClose: () => void;
}) {
  const steps = useMemo(
    () => recipe.steps.filter((step) => step.text.trim().length > 0),
    [recipe.steps],
  );
  // Der Kochmodus legt sich über die ganze App: die Seite dahinter darf nicht
  // mitscrollen, sonst tauchen beim Scrollen die Rezepte darunter auf.
  useBodyScrollLock(true);

  // Kurzer Vorspann: die Cocotte, dann steht Schritt 1 da. Der Schritt ist
  // die ganze Zeit schon gerendert, der Vorspann legt sich nur darueber.
  const [intro, setIntro] = useState(introErwuenscht);
  const introFertig = useCallback(() => setIntro(false), []);

  const [index, setIndex] = useState(0);
  const total = steps.length;
  const step = steps[Math.min(index, Math.max(total - 1, 0))];

  /**
   * Timer aller Schritte an einem Ort.
   *
   * Wichtig für den Ablauf am Herd: wer den Reis aufsetzt und dann zum
   * nächsten Schritt weitergeht, will den Timer weiterlaufen sehen. Läge der
   * Zustand in der Timer-Komponente, würde er beim Schrittwechsel verworfen.
   * Deshalb liegt er hier, und es dürfen auch mehrere gleichzeitig laufen.
   */
  const [timers, setTimers] = useState<Record<string, TimerState>>({});

  const timerFor = useCallback(
    (id: string, duration: number): TimerState => timers[id] ?? initialTimerState(duration),
    [timers],
  );

  const patchTimer = useCallback(
    (id: string, duration: number, change: (state: TimerState) => TimerState) => {
      setTimers((current) => ({
        ...current,
        [id]: change(current[id] ?? initialTimerState(duration)),
      }));
    },
    [],
  );

  const startTimer = (id: string, duration: number) => {
    stopAlarm();
    patchTimer(id, duration, (state) => ({
      endsAt: Date.now() + remainingSeconds(state) * 1000,
      remaining: remainingSeconds(state),
      ringing: false,
    }));
  };

  const pauseTimer = (id: string, duration: number) =>
    patchTimer(id, duration, (state) => ({
      endsAt: null,
      remaining: remainingSeconds(state),
      ringing: false,
    }));

  const resetTimer = (id: string, duration: number) => {
    stopAlarm();
    patchTimer(id, duration, () => initialTimerState(duration));
  };

  // Alle laufenden Timer in einem Takt, unabhängig vom angezeigten Schritt.
  const stepsRef = useRef(steps);
  stepsRef.current = steps;

  useEffect(() => {
    const tick = () => {
      const now = Date.now();
      setTimers((current) => {
        let changed = false;
        const next: Record<string, TimerState> = { ...current };
        for (const [id, state] of Object.entries(current)) {
          if (state.endsAt === null) continue;
          const left = Math.round((state.endsAt - now) / 1000);
          if (left <= 0) {
            next[id] = { endsAt: null, remaining: 0, ringing: true };
            changed = true;
            playAlarm();
            vibrate([300, 150, 300, 150, 500]);
          } else if (left !== state.remaining) {
            next[id] = { ...state, remaining: left };
            changed = true;
          }
        }
        return changed ? next : current;
      });
    };

    const handle = setInterval(tick, 250);
    const onVisible = () => tick();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(handle);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  useEffect(() => () => stopAlarm(), []);

  /** Timer, die laufen oder klingeln und nicht zum angezeigten Schritt gehören. */
  const backgroundTimers = useMemo(() => {
    return steps
      .map((entry, position) => ({ entry, position, state: timers[entry.id] }))
      .filter(
        ({ entry, position, state }) =>
          position !== index && state && (state.endsAt !== null || state.ringing) && entry.durationSec,
      );
  }, [steps, timers, index]);

  const factor = recipe.servings > 0 ? servings / recipe.servings : 1;
  const ingredients = useMemo(
    () => recipe.ingredients.filter((i) => i.name.trim().length > 0),
    [recipe.ingredients],
  );

  // Bildschirm wachhalten (Safari ab 16.4, Chrome, Edge). Fehler sind egal.
  useEffect(() => {
    let sentinel: { release: () => Promise<void> } | null = null;
    let released = false;

    const request = async () => {
      try {
        const wakeLock = (
          navigator as unknown as {
            wakeLock?: { request: (type: 'screen') => Promise<{ release: () => Promise<void> }> };
          }
        ).wakeLock;
        if (!wakeLock) return;
        sentinel = await wakeLock.request('screen');
        if (released) void sentinel.release().catch(() => {});
      } catch {
        /* z. B. abgelehnt oder nicht unterstuetzt */
      }
    };

    void request();
    const onVisible = () => {
      if (document.visibilityState === 'visible') void request();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      released = true;
      document.removeEventListener('visibilitychange', onVisible);
      void sentinel?.release().catch(() => {});
    };
  }, []);

  // Pfeiltasten auf dem iPad mit Tastatur / Desktop.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') setIndex((i) => Math.min(i + 1, total - 1));
      if (event.key === 'ArrowLeft') setIndex((i) => Math.max(i - 1, 0));
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [total, onClose]);

  if (total === 0) {
    return (
      <Portal>
        <div className="cook">
          <div className="cook__head">
            <button className="iconbtn" onClick={onClose} aria-label="Kochmodus beenden">
              <IconClose />
            </button>
            <div className="cook__progress" />
          </div>
          <div className="cook__body">
            <div className="cook__count">Kein Schritt hinterlegt</div>
            <p className="cook__text">
              Für dieses Rezept sind noch keine Zubereitungsschritte erfasst.
            </p>
          </div>
          <div className="cook__foot">
            <button className="btn btn--primary btn--lg btn--block" onClick={onClose}>
              Zurück zum Rezept
            </button>
          </div>
        </div>
      </Portal>
    );
  }

  const isLast = index >= total - 1;
  const progress = ((index + 1) / total) * 100;

  return (
    <Portal>
      <div className="cook">
        {intro ? <CookIntro title={recipe.name} onDone={introFertig} /> : null}
        <div className="cook__head">
          <button className="iconbtn" onClick={onClose} aria-label="Kochmodus beenden">
            <IconClose />
          </button>
          <div className="cook__progress">
            <div className="cook__progressbar" style={{ width: `${progress}%` }} />
          </div>
          <span className="syncdot" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {index + 1}/{total}
          </span>
        </div>

        {backgroundTimers.length > 0 ? (
          <div className="cook__timers">
            {backgroundTimers.map(({ entry, position, state }) => (
              <button
                key={entry.id}
                className={`cook__timerchip${state!.ringing ? ' cook__timerchip--ringing' : ''}`}
                onClick={() => setIndex(position)}
                aria-label={`Zu Schritt ${position + 1} mit laufendem Timer`}
              >
                <IconTimer size={15} />
                Schritt {position + 1}
                <strong>{state!.ringing ? 'fertig' : formatClock(remainingSeconds(state!))}</strong>
              </button>
            ))}
          </div>
        ) : null}

        <div className="cook__body">
          <div className="cook__count">
            Schritt {index + 1} von {total}
          </div>
          <p className="cook__text">{step.text}</p>

          {step.durationSec ? (
            <Timer
              duration={step.durationSec}
              state={timerFor(step.id, step.durationSec)}
              onStart={() => startTimer(step.id, step.durationSec!)}
              onPause={() => pauseTimer(step.id, step.durationSec!)}
              onReset={() => resetTimer(step.id, step.durationSec!)}
              onDismiss={() => resetTimer(step.id, step.durationSec!)}
            />
          ) : null}

          {index === 0 && ingredients.length > 0 ? (
            <div className="cook__ing">
              {ingredients.map((ingredient) => {
                const quantity = formatQuantity(
                  scaleAmount(ingredient.amount, factor, ingredient.noScale),
                  ingredient.unit,
                );
                return (
                  <span key={ingredient.id}>
                    {quantity ? <strong>{quantity} </strong> : null}
                    {ingredient.name}
                  </span>
                );
              })}
            </div>
          ) : null}
        </div>

        <div className="cook__foot">
          <button
            className="btn btn--ghost btn--lg"
            onClick={() => setIndex((i) => Math.max(i - 1, 0))}
            disabled={index === 0}
          >
            <IconChevronLeft size={18} />
            Zurück
          </button>
          {isLast ? (
            <button className="btn btn--primary btn--lg" style={{ flex: 1 }} onClick={onClose}>
              Fertig gekocht
            </button>
          ) : (
            <button
              className="btn btn--primary btn--lg"
              style={{ flex: 1 }}
              onClick={() => setIndex((i) => Math.min(i + 1, total - 1))}
            >
              Weiter
              <IconChevronRight size={18} />
            </button>
          )}
        </div>
      </div>
    </Portal>
  );
}
