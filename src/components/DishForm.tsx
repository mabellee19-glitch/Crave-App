'use client';

import React, { useMemo, useState } from 'react';
import { DISH_CATEGORIES, DISH_CATEGORY_LABEL, Dish, DishCategory, matchDishCategory } from '@/lib/types';
import { blankIngredient } from '@/lib/store';
import { kategorieErkennen } from '@/lib/category';
import { ConfirmDialog, Field, Sheet } from './ui';
import { IngredientEditor, aufgeraeumteZutaten } from './IngredientEditor';
import { IconTrash } from './Icons';

/**
 * Formular fuer eine Idee – ein Gericht ohne Anleitung. Zum Rezept wird sie
 * ueber "Rezept daraus machen" in ihrer Ansicht, nicht hier.
 */
export function DishForm({
  initial,
  isNew,
  onSave,
  onDelete,
  onClose,
}: {
  initial: Dish;
  isNew: boolean;
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

  // Wie beim Rezept: eine neue Idee bekommt ihre Kategorie aus den Zutaten,
  // bis jemand selbst eine waehlt.
  const [kategorieAuto, setKategorieAuto] = useState(isNew);
  const erkennung = useMemo(
    () => kategorieErkennen({ name: draft.name, servings: 2, ingredients: draft.ingredients }),
    [draft.name, draft.ingredients],
  );
  const erkannt = matchDishCategory(erkennung?.kategorie);
  const kategorie: DishCategory = kategorieAuto && erkannt ? erkannt : draft.category;

  return (
    <>
      <Sheet
        title={isNew ? 'Neue Idee' : 'Idee bearbeiten'}
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
                  category: kategorie,
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

        <Field
          label="Kategorie"
          htmlFor="dish-category"
          hint={kategorieAuto && erkennung && erkannt ? `Automatisch erkannt: ${erkennung.grund}` : undefined}
        >
          <select
            id="dish-category"
            className="select"
            value={kategorie}
            onChange={(event) => {
              setKategorieAuto(false);
              set('category', event.target.value as DishCategory);
            }}
          >
            {DISH_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {DISH_CATEGORY_LABEL[category]}
              </option>
            ))}
          </select>
        </Field>

        <hr className="divider" />

        <div className="detail__sectionhead">
          <span className="detail__h">Zutaten</span>
          <span className="row__note">Menge · Einheit · Zutat</span>
        </div>
        <p className="muted" style={{ fontSize: 14, lineHeight: 1.5, marginBottom: 12 }}>
          Kommt die Idee auf Cook Next, wandern diese Zutaten auf die Einkaufsliste.
        </p>

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
              Idee löschen
            </button>
            <div style={{ height: 8 }} />
          </>
        ) : null}
      </Sheet>

      {confirming && onDelete ? (
        <ConfirmDialog
          title="Idee löschen?"
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
