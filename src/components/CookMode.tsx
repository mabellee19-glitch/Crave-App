'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Recipe } from '@/lib/types';
import { formatClock, scaleAmount } from '@/lib/units';
import { useInhalt } from '@/lib/inhalt';
import { zutatenProSchritt } from '@/lib/stepIngredients';
import { playAlarm, setAlarmSession, stopAlarm, unlockAudio } from '@/lib/audio';
import { useT } from '@/lib/i18n';
import { Portal, useBodyScrollLock, useVerdeckt } from './ui';
import { Timer, TimerState, initialTimerState, remainingSeconds } from './Timer';
import { IconCheck, IconChevronLeft, IconChevronRight, IconClose, IconKnife, IconTimer } from './Icons';
import { CookAnimation, animationErwuenscht } from './CookAnimation';
import { animationsMotiv } from '@/lib/kochAnimation';

/**
 * Kochmodus: ein Schritt pro Bildschirm, gross gesetzt, ohne Ablenkung.
 * Das Display bleibt waehrend des Kochens nach Moeglichkeit an.
 */
export function CookMode({
  recipe: rezeptJetzt,
  servings,
  onClose,
}: {
  recipe: Recipe;
  servings: number;
  onClose: () => void;
}) {
  const t = useT();
  const inhalt = useInhalt();
  /*
   * Das Rezept so, wie es beim Start war. Kuerzt die KI es im Hintergrund
   * oder kommt eine Aenderung von einem anderen Geraet, wechseln sonst Text
   * und Schritte unter den Haenden – und ein laufender Timer haengt an einem
   * Schritt, den es nicht mehr gibt, und klingelt ohne Knopf zum Abstellen.
   */
  const [recipe] = useState(rezeptJetzt);
  const steps = useMemo(
    () => recipe.steps.filter((step) => step.text.trim().length > 0),
    [recipe.steps],
  );
  // Der Kochmodus legt sich über die ganze App: die Seite dahinter darf nicht
  // mitscrollen, sonst tauchen beim Scrollen die Rezepte darunter auf.
  useBodyScrollLock(true);

  // Kurzer Vorspann: im Topf wird geruehrt (beim Dessert mit dem
  // Schwingbesen, beim Ofengericht faehrt der Braeter in den Ofen), dann
  // steht Schritt 1 da. Der Schritt ist die ganze Zeit schon gerendert, der
  // Vorspann legt sich nur darueber. Am Schluss hebt sich der Deckel – oder
  // der Ofen geht auf, oder die Sahnehaube kommt auf das Dessert.
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

  /*
   * Der Knopf unten rechts wechselt seine Bedeutung an derselben Stelle:
   * "Start Cooking" wird zu "Los geht's", "Weiter" zu "Fertig gekocht". Ein
   * schneller Doppeltipp uebersprang so die Vorbereitung oder beendete das
   * Kochen samt Timern. Nach jedem solchen Wechsel nimmt er deshalb einen
   * Moment lang nichts an.
   */
  const letzterBildschirm = index >= screens - 1;
  const [kurzGesperrt, setKurzGesperrt] = useState(true);
  // Noch im selben Render sperren, nicht erst danach: ein schneller zweiter
  // Tipp kaeme sonst durch, bevor ein Effekt laeuft.
  const [bisherLetzter, setBisherLetzter] = useState(letzterBildschirm);
  if (bisherLetzter !== letzterBildschirm) {
    setBisherLetzter(letzterBildschirm);
    setKurzGesperrt(true);
  }
  useEffect(() => {
    if (!kurzGesperrt) return;
    const handle = setTimeout(() => setKurzGesperrt(false), 350);
    return () => clearTimeout(handle);
  }, [kurzGesperrt, letzterBildschirm]);
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
    // Der Druck auf "Timer starten" ist das sicherste Tippen, um den Ton freizugeben.
    unlockAudio();
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

  const verdeckt = useVerdeckt();

  // Pfeiltasten auf dem iPad mit Tastatur / Desktop.
  useEffect(() => {
    if (verdeckt) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') setIndex((i) => Math.min(i + 1, screens - 1));
      if (event.key === 'ArrowLeft') setIndex((i) => Math.max(i - 1, 0));
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [screens, onClose, verdeckt]);

  if (total === 0) {
    return (
      <Portal>
        <div className="cook">
          <div className="cook__head">
            <button className="iconbtn" onClick={onClose} aria-label={t.kochen.beenden}>
              <IconClose />
            </button>
            <div className="cook__progress" />
          </div>
          <div className="cook__body">
            <div className="cook__count">{t.kochen.keinSchritt}</div>
            <p className="cook__text">{t.kochen.keineSchritte}</p>
          </div>
          <div className="cook__foot">
            <button className="btn btn--primary btn--lg btn--block" onClick={onClose}>
              {t.kochen.zurueckZumRezept}
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
      <div className={`cook${verdeckt ? ' cook--verdeckt' : ''}`}>
        {intro ? (
          <CookAnimation
            variante="start"
            motiv={animationsMotiv(recipe, 'start')}
            title={recipe.name}
            onDone={introFertig}
          />
        ) : null}
        {abschluss ? (
          <CookAnimation
            variante="fertig"
            motiv={animationsMotiv(recipe, 'fertig')}
            title={t.kochen.enGuete}
            onDone={onClose}
          />
        ) : null}
        <div className="cook__head">
          <button className="iconbtn" onClick={onClose} aria-label={t.kochen.beenden}>
            <IconClose />
          </button>
          <div className="cook__progress">
            <div className="cook__progressbar" style={{ transform: `scaleX(${progress / 100})` }} />
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
                aria-label={t.kochen.zuSchrittMitTimer(position + 1)}
              >
                <IconTimer size={15} />
                {t.kochen.schritt(position + 1)}
                <strong>
                  {state!.ringing ? t.kochen.timerFertig : formatClock(remainingSeconds(state!))}
                </strong>
              </button>
            ))}
          </div>
        ) : null}

        {/*
          Jeder Bildschirm bekommt eine eigene Flaeche (key): sonst behielte
          Schritt 1 die Scrollposition der langen Vorbereitung, und der Text
          stuende oben ausserhalb des Bildes.
        */}
        {istVorbereitung ? (
          <div className="cook__body" key="vorbereitung">
            <div className="cook__count">{t.kochen.vorbereitung}</div>
            <p className="cook__text cook__text--klein">{t.kochen.vorbereitungText}</p>

            {prep.length > 0 ? (
              <section>
                <div className="cook__subhead">{t.kochen.schneiden}</div>
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
                <div className="cook__subhead">{t.kochen.abmessen}</div>
                <ul className="checklist">
                  {ingredients.map((ingredient) => {
                    const key = `z${ingredient.id}`;
                    const fertig = erledigt.has(key);
                    const menge = scaleAmount(ingredient.amount, factor, ingredient.noScale);
                    const quantity = inhalt.menge(menge, ingredient.unit);
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
                            {inhalt.zutat(ingredient.name, menge)}
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
          <div className="cook__body" key={step.id}>
            <div className="cook__count">{t.kochen.schrittVon(stepIndex + 1, total)}</div>
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
              <section className="cook__zutaten" aria-label={t.kochen.zutatenSchritt}>
                <div className="cook__subhead">{t.kochen.dafuer}</div>
                <ul className="zutatenliste">
                  {schrittZutaten[stepIndex].map((ingredient) => {
                    const menge = scaleAmount(ingredient.amount, factor, ingredient.noScale);
                    const quantity = inhalt.menge(menge, ingredient.unit);
                    return (
                      <li key={ingredient.id}>
                        {quantity ? <strong>{quantity}</strong> : null}
                        <span>{inhalt.zutat(ingredient.name, menge)}</span>
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
            {t.kochen.zurueck}
          </button>
          {isLast ? (
            <button
              className="btn btn--primary btn--lg btn--ruhig"
              style={{ flex: 1 }}
              onClick={beenden}
              disabled={kurzGesperrt}
            >
              {t.kochen.fertigGekocht}
            </button>
          ) : (
            <button
              className="btn btn--primary btn--lg btn--ruhig"
              style={{ flex: 1 }}
              onClick={() => setIndex((i) => Math.min(i + 1, screens - 1))}
              disabled={kurzGesperrt && index === 0}
            >
              {istVorbereitung ? t.kochen.losGehts : t.kochen.weiter}
              <IconChevronRight size={18} />
            </button>
          )}
        </div>
      </div>
    </Portal>
  );
}
