'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Recipe } from '@/lib/types';
import { formatQuantity, scaleAmount } from '@/lib/units';
import { Timer } from './Timer';
import { IconChevronLeft, IconChevronRight, IconClose } from './Icons';

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
  const [index, setIndex] = useState(0);
  const total = steps.length;
  const step = steps[Math.min(index, Math.max(total - 1, 0))];

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
    );
  }

  const isLast = index >= total - 1;
  const progress = ((index + 1) / total) * 100;

  return (
    <div className="cook">
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

      <div className="cook__body">
        <div className="cook__count">
          Schritt {index + 1} von {total}
        </div>
        <p className="cook__text">{step.text}</p>

        {step.durationSec ? (
          <Timer key={`${step.id}-${step.durationSec}`} durationSec={step.durationSec} />
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
  );
}
