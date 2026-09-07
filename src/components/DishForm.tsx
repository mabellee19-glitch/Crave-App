'use client';

import React, { useState } from 'react';
import { DISH_CATEGORIES, DISH_CATEGORY_LABEL, Dish, DishCategory, Recipe } from '@/lib/types';
import { blankIngredient } from '@/lib/store';
import { ConfirmDialog, Field, Sheet } from './ui';
import { IngredientEditor, aufgeraeumteZutaten } from './IngredientEditor';
import { IconTrash } from './Icons';

export function DishForm({
  initial,
  isNew,
  recipes,
  onSave,
  onDelete,
  onClose,
}: {
  initial: Dish;
  isNew: boolean;
  recipes: Recipe[];
  onSave: (dish: Dish) => void;
  onDelete?: () => void;
  onClose: () => void;
}) {
  // Gerichte aus aelteren Staenden haben noch gar keine Zutatenliste.
  const [draft, setDraft] = useState<Dish>(() => ({
    ...initial,
    ingredients: initial.ingredients?.length ? initial.ingredients : [blankIngredient()],
  }));
  const [confirming, setConfirming] = useState(false);

  const set = <K extends keyof Dish>(key: K, value: Dish[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  const nameValid = draft.name.trim().length > 0;

  return (
    <>
      <Sheet
        title={isNew ? 'Neues Gericht' : 'Gericht bearbeiten'}
        onClose={onClose}
        footer={
          <>
            <button className="btn btn--ghost" onClick={onClose}>
              Abbrechen
            </button>
            <button
              className="btn btn--primary"
              style={{ flex: 1 }}
              disabled={!nameValid}
              onClick={() =>
                nameValid &&
                onSave({
                  ...draft,
                  name: draft.name.trim(),
                  ingredients: aufgeraeumteZutaten(draft.ingredients),
                })
              }
            >
              Speichern
            </button>
          </>
        }
      >
        <div style={{ height: 16 }} />

        <Field label="Name" htmlFor="dish-name">
          <input
            id="dish-name"
            className="input"
            value={draft.name}
            placeholder="z. B. Skyr-Bowl mit Beeren"
            onChange={(event) => set('name', event.target.value)}
            autoComplete="off"
          />
        </Field>

        <Field label="Kategorie" htmlFor="dish-category">
          <select
            id="dish-category"
            className="select"
            value={draft.category}
            onChange={(event) => set('category', event.target.value as DishCategory)}
          >
            {DISH_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {DISH_CATEGORY_LABEL[category]}
              </option>
            ))}
          </select>
        </Field>

        <Field
          label="Verknüpftes Rezept"
          htmlFor="dish-recipe"
          hint="Ist ein Rezept hinterlegt, öffnet ein Tipp auf das Gericht direkt das Rezept."
        >
          <select
            id="dish-recipe"
            className="select"
            value={draft.recipeId ?? ''}
            onChange={(event) => set('recipeId', event.target.value || null)}
          >
            <option value="">Kein Rezept</option>
            {recipes.map((recipe) => (
              <option key={recipe.id} value={recipe.id}>
                {recipe.name}
              </option>
            ))}
          </select>
        </Field>

        <hr className="divider" />

        <div className="detail__sectionhead">
          <span className="detail__h">Zutaten</span>
          <span className="row__note">Menge · Einheit · Zutat</span>
        </div>

        {draft.recipeId ? (
          <p className="muted" style={{ fontSize: 14, lineHeight: 1.5, marginBottom: 12 }}>
            Für Cook Next und die Einkaufsliste zählen die Zutaten des verknüpften Rezepts. Was du
            hier einträgst, bleibt als Notiz am Gericht stehen.
          </p>
        ) : (
          <p className="muted" style={{ fontSize: 14, lineHeight: 1.5, marginBottom: 12 }}>
            Ohne hinterlegtes Rezept kommen diese Zutaten auf die Einkaufsliste, sobald du das
            Gericht auf Cook Next setzt.
          </p>
        )}

        <IngredientEditor
          ingredients={draft.ingredients}
          onChange={(next) => set('ingredients', next)}
        />

        <hr className="divider" />

        <Field label="Notiz" htmlFor="dish-notes">
          <textarea
            id="dish-notes"
            className="textarea"
            value={draft.notes}
            placeholder="Optional: Idee, Beilage, Erinnerung"
            onChange={(event) => set('notes', event.target.value)}
          />
        </Field>

        {onDelete && !isNew ? (
          <>
            <hr className="divider" />
            <button className="btn btn--danger btn--block" onClick={() => setConfirming(true)}>
              <IconTrash size={18} />
              Gericht löschen
            </button>
            <div style={{ height: 8 }} />
          </>
        ) : null}
      </Sheet>

      {confirming && onDelete ? (
        <ConfirmDialog
          title="Gericht löschen?"
          text={`„${draft.name}“ wird auf allen Geräten entfernt.`}
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
