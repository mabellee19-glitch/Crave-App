'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Recipe, matchDishCategory } from '@/lib/types';
import { formatQuantity, scaleAmount } from '@/lib/units';
import { ABMESSEN } from '@/lib/prep';
import { zutatenProSchritt } from '@/lib/stepIngredients';
import { istEnglisch, rezeptTexte } from '@/lib/sprache';
import { Sheet, ConfirmDialog } from './ui';
import { TimerHint } from './Timer';
import { Notiz } from './Notiz';
import {
  IconCart,
  IconClock,
  IconFlame,
  IconCookNext,
  IconKnife,
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
  onToggleCookNext,
  onStartCooking,
  onAddToShopping,
  onFillSteps,
  onRestoreOriginal,
}: {
  recipe: Recipe;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleCookNext: (servings: number) => void;
  onStartCooking: (servings: number) => void;
  onAddToShopping: (servings: number) => void;
  /** Hinterlegte Zubereitungsschritte nachtragen, wenn das Rezept keine hat. */
  onFillSteps: () => void;
  /** Gekuerzte Schritte auf den Stand davor zuruecksetzen. */
  onRestoreOriginal: () => void;
}) {
  const base = recipe.servings > 0 ? recipe.servings : 1;
  const [servings, setServings] = useState(base);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    setServings(recipe.servings > 0 ? recipe.servings : 1);
  }, [recipe.id, recipe.servings]);

  const factor = servings / base;
  const ingredients = useMemo(
    () => recipe.ingredients.filter((i) => i.name.trim().length > 0),
    [recipe.ingredients],
  );
  const steps = useMemo(() => recipe.steps.filter((s) => s.text.trim().length > 0), [recipe.steps]);
  const prep = (recipe.prep ?? []).filter((task) => task.trim().length > 0);
  // Nur neu, wenn sich das Rezept aendert – nicht bei jedem Tipp auf die Portionen.
  const schrittZutaten = useMemo(() => zutatenProSchritt(steps, ingredients), [steps, ingredients]);
  // Abmessen gehoert immer dazu, sobald es Zutaten gibt.
  const hatVorbereitung = prep.length > 0 || ingredients.length > 0;
  // Englisch und noch nicht uebersetzt: das macht der Start, sobald die KI da ist.
  const nochEnglisch = useMemo(
    () => !recipe.uebersetztAus && istEnglisch(rezeptTexte(recipe)),
    [recipe],
  );

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
              className={`iconbtn iconbtn--plain${recipe.cookNext ? ' iconbtn--active' : ''}`}
              onClick={() => onToggleCookNext(servings)}
              aria-label={
                recipe.cookNext ? 'Aus Cook Next entfernen' : 'Zu Cook Next hinzufügen'
              }
              aria-pressed={recipe.cookNext}
            >
              <IconCookNext filled={recipe.cookNext} />
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
          <Notiz className="muted detail__notiz" text={recipe.notes} />
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

          {recipe.cookNext ? (
            <p className="detail__planhint">
              <IconCookNext size={15} filled />
              Für die nächsten Tage geplant – die Zutaten stehen auf der Einkaufsliste.
            </p>
          ) : null}

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
            <span className="row__note">
              {hatVorbereitung ? 'Vorbereitung + ' : ''}
              {steps.length} {steps.length === 1 ? 'Schritt' : 'Schritte'}
            </span>
          </div>
          {hatVorbereitung ? (
            <div className="step step--prep" style={{ marginBottom: 10 }}>
              <span className="step__num step__num--prep" aria-hidden="true">
                <IconKnife size={15} />
              </span>
              <div>
                <div className="step__title">Vorbereitung</div>
                <ul className="preplist">
                  {prep.map((task, index) => (
                    <li key={`${index}-${task}`}>{task}</li>
                  ))}
                  {ingredients.length > 0 ? <li>{ABMESSEN}</li> : null}
                </ul>
              </div>
            </div>
          ) : null}
          {steps.length === 0 ? (
            <div className="notice">
              <strong>Noch keine Zubereitungsschritte erfasst.</strong> Deshalb lässt sich der
              Kochmodus nicht starten. Für die mitgelieferten Rezepte sind Zubereitung und
              Zutaten hinterlegt – was hier fehlt, lässt sich daraus nachtragen. Eigenes bleibt
              unverändert; sonst über <em>Bearbeiten</em> selbst eintragen.
              <div style={{ height: 10 }} />
              <button className="btn btn--ghost" onClick={onFillSteps}>
                <IconPlus size={18} />
                Aus der Vorlage nachtragen
              </button>
            </div>
          ) : (
            <ol className="steps">
              {steps.map((step, index) => (
                <li className="step" key={step.id}>
                  <span className="step__num">{index + 1}</span>
                  <div>
                    <div className="step__text">{step.text}</div>
                    {schrittZutaten[index].length ? (
                      <div className="step__zutaten">
                        {schrittZutaten[index]
                          .map((ingredient) => {
                            const quantity = formatQuantity(
                              scaleAmount(ingredient.amount, factor, ingredient.noScale),
                              ingredient.unit,
                            );
                            return quantity ? `${quantity} ${ingredient.name}` : ingredient.name;
                          })
                          .join(' · ')}
                      </div>
                    ) : null}
                    {step.durationSec ? <TimerHint seconds={step.durationSec} /> : null}
                  </div>
                </li>
              ))}
            </ol>
          )}
          {recipe.uebersetztAus === 'en' ? (
            <p className="kuerzung">Aus dem Englischen übersetzt.</p>
          ) : nochEnglisch ? (
            <p className="kuerzung">
              {recipe.uebersetzungVersuch
                ? 'Dieses Rezept ist auf Englisch. Die KI konnte es nicht übersetzen.'
                : 'Dieses Rezept ist auf Englisch. Die App übersetzt es von selbst, sobald die KI erreichbar ist.'}
            </p>
          ) : null}
          {steps.length > 0 &&
          recipe.vorKuerzen &&
          (recipe.kuerzung === 'regeln' || recipe.kuerzung === 'ki') ? (
            <p className="kuerzung">
              {recipe.kuerzung === 'ki'
                ? 'Die Schritte wurden mit KI gekürzt.'
                : 'Lange Schritte wurden in kurze aufgeteilt.'}{' '}
              <button className="btn btn--quiet kuerzung__zurueck" onClick={onRestoreOriginal}>
                Original wiederherstellen
              </button>
            </p>
          ) : null}
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
