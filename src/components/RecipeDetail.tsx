'use client';

import React, { useEffect, useState } from 'react';
import { Recipe, matchDishCategory } from '@/lib/types';
import { formatQuantity, scaleAmount } from '@/lib/units';
import { Sheet, ConfirmDialog } from './ui';
import { TimerHint } from './Timer';
import {
  IconCart,
  IconClock,
  IconFlame,
  IconHeart,
  IconMinus,
  IconPencil,
  IconPlus,
  IconServings,
  IconTrash,
} from './Icons';

export function RecipeDetail({
  recipe,
  onClose,
  onEdit,
  onDelete,
  onToggleFavorite,
  onStartCooking,
  onAddToShopping,
}: {
  recipe: Recipe;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleFavorite: () => void;
  onStartCooking: (servings: number) => void;
  onAddToShopping: (servings: number) => void;
}) {
  const base = recipe.servings > 0 ? recipe.servings : 1;
  const [servings, setServings] = useState(base);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    setServings(recipe.servings > 0 ? recipe.servings : 1);
  }, [recipe.id, recipe.servings]);

  const factor = servings / base;
  const ingredients = recipe.ingredients.filter((i) => i.name.trim().length > 0);
  const steps = recipe.steps.filter((s) => s.text.trim().length > 0);

  return (
    <>
      <Sheet
        title={recipe.name || 'Rezept'}
        onClose={onClose}
        footer={
          <button
            className="btn btn--primary btn--lg btn--block"
            onClick={() => onStartCooking(servings)}
            disabled={steps.length === 0}
          >
            <IconFlame size={19} />
            Start Cooking
          </button>
        }
        actions={
          <>
            <button
              className={`iconbtn iconbtn--plain${recipe.favorite ? ' iconbtn--active' : ''}`}
              onClick={onToggleFavorite}
              aria-label={recipe.favorite ? 'Aus Favoriten entfernen' : 'Zu Favoriten hinzufügen'}
              aria-pressed={recipe.favorite}
            >
              <IconHeart filled={recipe.favorite} />
            </button>
            <button className="iconbtn iconbtn--plain" onClick={onEdit} aria-label="Rezept bearbeiten">
              <IconPencil />
            </button>
          </>
        }
      >
        <h1 className="detail__title">{recipe.name || 'Ohne Namen'}</h1>

        <div className="detail__meta">
          {recipe.category ? (
            <span className={`tag${categoryTag(recipe.category)}`}>
              <IconFlame size={13} />
              {recipe.category}
            </span>
          ) : null}
          {recipe.timeMin ? (
            <span className="tag">
              <IconClock size={13} />
              {recipe.timeMin} Min
            </span>
          ) : null}
          <span className="tag">
            <IconServings size={13} />
            Basis: {base} {base === 1 ? 'Portion' : 'Portionen'}
          </span>
        </div>

        {recipe.notes ? (
          <p className="muted" style={{ fontSize: 14.5, marginBottom: 4 }}>
            {recipe.notes}
          </p>
        ) : null}

        <div className="detail__section">
          <div className="detail__sectionhead">
            <span className="detail__h">Zutaten</span>
            <div className="stepper">
              <button
                className="stepper__btn"
                onClick={() => setServings((s) => Math.max(1, s - 1))}
                disabled={servings <= 1}
                aria-label="Eine Portion weniger"
              >
                <IconMinus size={18} />
              </button>
              <span className="stepper__value" aria-live="polite">
                {servings} {servings === 1 ? 'Portion' : 'Portionen'}
              </span>
              <button
                className="stepper__btn"
                onClick={() => setServings((s) => Math.min(50, s + 1))}
                disabled={servings >= 50}
                aria-label="Eine Portion mehr"
              >
                <IconPlus size={18} />
              </button>
            </div>
          </div>

          {ingredients.length === 0 ? (
            <p className="muted" style={{ fontSize: 14.5 }}>
              Noch keine Zutaten erfasst.
            </p>
          ) : (
            <ul className="ingredients">
              {ingredients.map((ingredient) => (
                <li className="ingredient" key={ingredient.id}>
                  <span className="ingredient__amount">
                    {formatQuantity(
                      scaleAmount(ingredient.amount, factor, ingredient.noScale),
                      ingredient.unit,
                    )}
                  </span>
                  <span>{ingredient.name}</span>
                </li>
              ))}
            </ul>
          )}

          <button
            className="btn btn--ghost btn--block"
            style={{ marginTop: 12 }}
            onClick={() => onAddToShopping(servings)}
            disabled={ingredients.length === 0}
          >
            <IconCart size={18} />
            Zur Einkaufsliste hinzufügen
          </button>
        </div>

        <div className="detail__section">
          <div className="detail__sectionhead">
            <span className="detail__h">Zubereitung</span>
            <span className="row__note">{steps.length} Schritte</span>
          </div>
          {steps.length === 0 ? (
            <p className="muted" style={{ fontSize: 14.5 }}>
              Noch keine Zubereitungsschritte erfasst.
            </p>
          ) : (
            <ol className="steps">
              {steps.map((step, index) => (
                <li className="step" key={step.id}>
                  <span className="step__num">{index + 1}</span>
                  <div>
                    <div className="step__text">{step.text}</div>
                    {step.durationSec ? <TimerHint seconds={step.durationSec} /> : null}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>

        <hr className="divider" />

        <button className="btn btn--danger btn--block" onClick={() => setConfirming(true)}>
          <IconTrash size={18} />
          Rezept löschen
        </button>

        <div style={{ height: 8 }} />
      </Sheet>

      {confirming ? (
        <ConfirmDialog
          title="Rezept löschen?"
          text={`„${recipe.name}“ wird auf allen Geräten entfernt. Das lässt sich nicht rückgängig machen.`}
          confirmLabel="Löschen"
          onCancel={() => setConfirming(false)}
          onConfirm={() => {
            setConfirming(false);
            onDelete();
          }}
        />
      ) : null}
    </>
  );
}

/** Klassenzusatz, damit Rezepte dieselben Kategoriefarben tragen wie Gerichte. */
function categoryTag(category: string): string {
  const match = matchDishCategory(category);
  return match ? ` tag--${match}` : '';
}
