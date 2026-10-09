'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Recipe } from '@/lib/types';
import { formatClock, formatQuantity, scaleAmount } from '@/lib/units';
import { zutatenProSchritt } from '@/lib/stepIngredients';
import { playAlarm, setAlarmSession, stopAlarm } from '@/lib/audio';
import { Portal, useBodyScrollLock } from './ui';
import { Timer, TimerState, initialTimerState, remainingSeconds } from './Timer';
import { IconCheck, IconChevronLeft, IconChevronRight, IconClose, IconKnife, IconTimer } from './Icons';
import { CookAnimation, animationErwuenscht } from './CookAnimation';

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

  // Kurzer Vorspann: im Topf wird geruehrt, dann steht Schritt 1 da. Der
  // Schritt ist die ganze Zeit schon gerendert, der Vorspann legt sich nur
  // darueber. Am Schluss hebt sich der Deckel – dasselbe Bauteil, andere Rolle.
  const [intro, setIntro] = useState(animationErwuenscht);
  const introFertig = useCallback(() => setIntro(false), []);
  const [abschluss, setAbschluss] = useState(false);

  // "Fertig gekocht": erst der Deckel, dann zurueck zum Rezept.
  const beenden = useCallback(() => {
    if (animationErwuenscht()) setAbschluss(true);
    else onClose();
  }, [onClose]);

  const factor = recipe.servings > 0 ? servings / recipe.servings : 1;
  const ingredients = useMemo(
    () => recipe.ingredients.filter((i) => i.name.trim().length > 0),
    [recipe.ingredients],
  );
  const prep = useMemo(
    () => (recipe.prep ?? []).filter((task) => task.trim().length > 0),
    [recipe.prep],
  );
  // Unter jedem Schritt nur das, was er braucht – aus dem Text gelesen.
  const schrittZutaten = useMemo(() => zutatenProSchritt(steps, ingredients), [steps, ingredients]);

  /*
   * Vor dem ersten Schritt kommt die Vorbereitung: schneiden, abmessen,
   * bereitlegen. Sie ist ein eigener Bildschirm vor Schritt 1, damit am Herd
   * niemand mehr zum Brett muss. Abgemessen wird immer – die Zutaten stehen
   * dort mit den Mengen fuer die gewaehlte Portionenzahl.
   */
  const total = steps.length;
  const hatVorbereitung = total > 0 && (prep.length > 0 || ingredients.length > 0);
  const offset = hatVorbereitung ? 1 : 0;
  const screens = total + offset;

  const [index, setIndex] = useState(0);
  const istVorbereitung = hatVorbereitung && index === 0;
  const stepIndex = Math.min(Math.max(index - offset, 0), Math.max(total - 1, 0));
  const step = steps[stepIndex];

  // Abgehakt wird nur fuer diesen Kochgang – beim naechsten Mal ist alles frisch.
  const [erledigt, setErledigt] = useState<Set<string>>(() => new Set());
  const umschalten = (key: string) =>
    setErledigt((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

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

  /*
   * Der Wecker darf nicht im State-Updater ausgeloest werden: React fuehrt den
   * verzoegert und unter Umstaenden mehrfach aus. Erkannt wird der Ablauf
   * deshalb hier, aus einem Ref, und je Timer nur einmal.
   */
  const timersRef = useRef(timers);
  timersRef.current = timers;
  const geklungen = useRef<Set<string>>(new Set());

  useEffect(() => {
    const tick = () => {
      const now = Date.now();

      let abgelaufen = false;
      for (const [id, state] of Object.entries(timersRef.current)) {
        if (state.endsAt === null) continue;
        if (state.endsAt - now > 0) {
          // Neu gestartet: darf spaeter wieder klingeln.
          geklungen.current.delete(id);
          continue;
        }
        if (geklungen.current.has(id)) continue;
        geklungen.current.add(id);
        abgelaufen = true;
      }
      if (abgelaufen) playAlarm();

      setTimers((current) => {
        let changed = false;
        const next: Record<string, TimerState> = { ...current };
        for (const [id, state] of Object.entries(current)) {
          if (state.endsAt === null) continue;
          const left = Math.round((state.endsAt - now) / 1000);
          if (left <= 0) {
            next[id] = { endsAt: null, remaining: 0, ringing: true };
            changed = true;
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

  /*
   * Waehrend des Kochens gilt der Ton als Medienwiedergabe – sonst bliebe der
   * Wecker stumm, wenn am iPhone der Klingelschalter auf lautlos steht.
   */
  useEffect(() => {
    setAlarmSession(true);
    return () => {
      setAlarmSession(false);
      stopAlarm();
    };
  }, []);

  /** Timer, die laufen oder klingeln und nicht zum angezeigten Schritt gehören. */
  const backgroundTimers = useMemo(() => {
    const angezeigt = istVorbereitung ? -1 : stepIndex;
    return steps
      .map((entry, position) => ({ entry, position, state: timers[entry.id] }))
      .filter(
        ({ entry, position, state }) =>
          position !== angezeigt &&
          state &&
          (state.endsAt !== null || state.ringing) &&
          entry.durationSec,
      );
  }, [steps, timers, stepIndex, istVorbereitung]);

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
      if (event.key === 'ArrowRight') setIndex((i) => Math.min(i + 1, screens - 1));
      if (event.key === 'ArrowLeft') setIndex((i) => Math.max(i - 1, 0));
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [screens, onClose]);

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

  const isLast = index >= screens - 1;
  const progress = ((index + 1) / screens) * 100;

  return (
    <Portal>
      <div className="cook">
        {intro ? (
          <CookAnimation variante="start" title={recipe.name} onDone={introFertig} />
        ) : null}
        {abschluss ? (
          <CookAnimation variante="fertig" title="En Guete!" onDone={onClose} />
        ) : null}
        <div className="cook__head">
          <button className="iconbtn" onClick={onClose} aria-label="Kochmodus beenden">
            <IconClose />
          </button>
          <div className="cook__progress">
            <div className="cook__progressbar" style={{ width: `${progress}%` }} />
          </div>
          <span className="syncdot" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {istVorbereitung ? <IconKnife size={16} /> : `${stepIndex + 1}/${total}`}
          </span>
        </div>

        {backgroundTimers.length > 0 ? (
          <div className="cook__timers">
            {backgroundTimers.map(({ entry, position, state }) => (
              <button
                key={entry.id}
                className={`cook__timerchip${state!.ringing ? ' cook__timerchip--ringing' : ''}`}
                onClick={() => setIndex(position + offset)}
                aria-label={`Zu Schritt ${position + 1} mit laufendem Timer`}
              >
                <IconTimer size={15} />
                Schritt {position + 1}
                <strong>{state!.ringing ? 'fertig' : formatClock(remainingSeconds(state!))}</strong>
              </button>
            ))}
          </div>
        ) : null}

        {istVorbereitung ? (
          <div className="cook__body">
            <div className="cook__count">Vorbereitung</div>
            <p className="cook__text cook__text--klein">
              Erst schnibbeln und abmessen – dann geht’s am Herd ohne Hektik.
            </p>

            {prep.length > 0 ? (
              <section>
                <div className="cook__subhead">Schneiden &amp; bereitlegen</div>
                <ul className="checklist">
                  {prep.map((task, position) => {
                    const key = `p${position}`;
                    const fertig = erledigt.has(key);
                    return (
                      <li key={key}>
                        <button
                          className={`checklist__item${fertig ? ' checklist__item--done' : ''}`}
                          onClick={() => umschalten(key)}
                          aria-pressed={fertig}
                        >
                          <span className={`checkbox${fertig ? ' checkbox--on' : ''}`}>
                            <IconCheck size={16} />
                          </span>
                          <span>{task}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ) : null}

            {ingredients.length > 0 ? (
              <section>
                <div className="cook__subhead">Abmessen</div>
                <ul className="checklist">
                  {ingredients.map((ingredient) => {
                    const key = `z${ingredient.id}`;
                    const fertig = erledigt.has(key);
                    const quantity = formatQuantity(
                      scaleAmount(ingredient.amount, factor, ingredient.noScale),
                      ingredient.unit,
                    );
                    return (
                      <li key={key}>
                        <button
                          className={`checklist__item${fertig ? ' checklist__item--done' : ''}`}
                          onClick={() => umschalten(key)}
                          aria-pressed={fertig}
                        >
                          <span className={`checkbox${fertig ? ' checkbox--on' : ''}`}>
                            <IconCheck size={16} />
                          </span>
                          <span>
                            {quantity ? <strong>{quantity} </strong> : null}
                            {ingredient.name}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ) : null}
          </div>
        ) : (
          <div className="cook__body">
            <div className="cook__count">
              Schritt {stepIndex + 1} von {total}
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

            {schrittZutaten[stepIndex]?.length ? (
              <section className="cook__zutaten" aria-label="Zutaten für diesen Schritt">
                <div className="cook__subhead">Dafür brauchst du</div>
                <ul className="zutatenliste">
                  {schrittZutaten[stepIndex].map((ingredient) => {
                    const quantity = formatQuantity(
                      scaleAmount(ingredient.amount, factor, ingredient.noScale),
                      ingredient.unit,
                    );
                    return (
                      <li key={ingredient.id}>
                        {quantity ? <strong>{quantity}</strong> : null}
                        <span>{ingredient.name}</span>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ) : null}
          </div>
        )}

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
            <button className="btn btn--primary btn--lg" style={{ flex: 1 }} onClick={beenden}>
              Fertig gekocht
            </button>
          ) : (
            <button
              className="btn btn--primary btn--lg"
              style={{ flex: 1 }}
              onClick={() => setIndex((i) => Math.min(i + 1, screens - 1))}
            >
              {istVorbereitung ? 'Los geht’s' : 'Weiter'}
              <IconChevronRight size={18} />
            </button>
          )}
        </div>
      </div>
    </Portal>
  );
}
