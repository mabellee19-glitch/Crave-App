'use client';

import React, { useMemo, useState } from 'react';
import { Ingredient, Recipe, Step } from '@/lib/types';
import { blankIngredient, blankStep } from '@/lib/store';
import { Field, NumberInput, Sheet } from './ui';
import { IconArrowUp, IconPlus, IconTrash } from './Icons';

const CATEGORY_SUGGESTIONS = ['High-Protein', 'Comfort', 'Vegi', 'Frühstück', 'Dessert', 'Snack'];

export function RecipeForm({
  initial,
  isNew,
  onSave,
  onClose,
}: {
  initial: Recipe;
  isNew: boolean;
  onSave: (recipe: Recipe) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<Recipe>(() => ({
    ...initial,
    ingredients: initial.ingredients.length ? initial.ingredients : [blankIngredient()],
    steps: initial.steps.length ? initial.steps : [blankStep()],
  }));

  const set = <K extends keyof Recipe>(key: K, value: Recipe[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  const nameValid = draft.name.trim().length > 0;

  const setIngredient = (id: string, patch: Partial<Ingredient>) =>
    set(
      'ingredients',
      draft.ingredients.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );

  const setStep = (id: string, patch: Partial<Step>) =>
    set(
      'steps',
      draft.steps.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );

  const move = <T,>(list: T[], from: number, to: number): T[] => {
    if (to < 0 || to >= list.length) return list;
    const copy = [...list];
    const [item] = copy.splice(from, 1);
    copy.splice(to, 0, item);
    return copy;
  };

  const listId = useMemo(() => `cats-${draft.id}`, [draft.id]);

  const submit = () => {
    if (!nameValid) return;
    onSave({
      ...draft,
      name: draft.name.trim(),
      category: draft.category.trim(),
      servings: draft.servings > 0 ? draft.servings : 1,
      ingredients: draft.ingredients
        .filter((item) => item.name.trim().length > 0)
        .map((item) => ({ ...item, name: item.name.trim(), unit: item.unit.trim() })),
      steps: draft.steps
        .filter((item) => item.text.trim().length > 0)
        .map((item) => ({ ...item, text: item.text.trim() })),
    });
  };

  return (
    <Sheet
      title={isNew ? 'Neues Rezept' : 'Rezept bearbeiten'}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn--ghost" onClick={onClose}>
            Abbrechen
          </button>
          <button className="btn btn--primary" style={{ flex: 1 }} onClick={submit} disabled={!nameValid}>
            Speichern
          </button>
        </>
      }
    >
      <div style={{ height: 16 }} />

      <Field label="Name" htmlFor="recipe-name">
        <input
          id="recipe-name"
          className="input"
          value={draft.name}
          placeholder="z. B. Poulet mit Brokkoli"
          onChange={(event) => set('name', event.target.value)}
          autoComplete="off"
        />
      </Field>

      <Field label="Kategorie" htmlFor="recipe-category">
        <input
          id="recipe-category"
          className="input"
          list={listId}
          value={draft.category}
          placeholder="z. B. High-Protein"
          onChange={(event) => set('category', event.target.value)}
          autoComplete="off"
        />
        <datalist id={listId}>
          {CATEGORY_SUGGESTIONS.map((option) => (
            <option value={option} key={option} />
          ))}
        </datalist>
      </Field>

      <div className="inputrow">
        <div style={{ flex: 1 }}>
          <Field label="Portionen" htmlFor="recipe-servings">
            <NumberInput
              id="recipe-servings"
              value={draft.servings}
              min={1}
              onChange={(value) => set('servings', value ?? 1)}
              placeholder="2"
            />
          </Field>
        </div>
        <div style={{ flex: 1 }}>
          <Field label="Zubereitungszeit (Min)" htmlFor="recipe-time">
            <NumberInput
              id="recipe-time"
              value={draft.timeMin}
              onChange={(value) => set('timeMin', value)}
              placeholder="30"
            />
          </Field>
        </div>
      </div>

      <hr className="divider" />

      <div className="detail__sectionhead">
        <span className="detail__h">Zutaten</span>
        <span className="row__note">Menge · Einheit · Zutat</span>
      </div>

      {draft.ingredients.map((ingredient, index) => (
        <div className="editrow" key={ingredient.id}>
          <NumberInput
            className="input editrow__amount"
            value={ingredient.amount}
            onChange={(value) => setIngredient(ingredient.id, { amount: value })}
            placeholder="400"
            ariaLabel={`Menge für Zutat ${index + 1}`}
          />
          <input
            className="input editrow__unit"
            value={ingredient.unit}
            placeholder="g"
            aria-label={`Einheit für Zutat ${index + 1}`}
            onChange={(event) => setIngredient(ingredient.id, { unit: event.target.value })}
            autoComplete="off"
          />
          <input
            className="input editrow__grow"
            value={ingredient.name}
            placeholder="Zutat"
            aria-label={`Name für Zutat ${index + 1}`}
            onChange={(event) => setIngredient(ingredient.id, { name: event.target.value })}
            autoComplete="off"
          />
          <button
            className="iconbtn iconbtn--plain"
            aria-label={`Zutat ${index + 1} entfernen`}
            onClick={() =>
              set(
                'ingredients',
                draft.ingredients.length > 1
                  ? draft.ingredients.filter((item) => item.id !== ingredient.id)
                  : [blankIngredient()],
              )
            }
          >
            <IconTrash size={19} />
          </button>
        </div>
      ))}

      <button
        className="btn btn--ghost btn--block"
        onClick={() => set('ingredients', [...draft.ingredients, blankIngredient()])}
      >
        <IconPlus size={18} />
        Zutat hinzufügen
      </button>

      <hr className="divider" />

      <div className="detail__sectionhead">
        <span className="detail__h">Zubereitung</span>
        <span className="row__note">Timer optional</span>
      </div>

      {draft.steps.map((step, index) => (
        <div className="editcard" key={step.id}>
          <div className="editcard__head">
            <span className="editcard__num">{index + 1}</span>
            <span className="spacer" />
            <button
              className="iconbtn iconbtn--plain"
              aria-label={`Schritt ${index + 1} nach oben`}
              disabled={index === 0}
              onClick={() => set('steps', move(draft.steps, index, index - 1))}
            >
              <IconArrowUp size={18} />
            </button>
            <button
              className="iconbtn iconbtn--plain"
              aria-label={`Schritt ${index + 1} entfernen`}
              onClick={() =>
                set(
                  'steps',
                  draft.steps.length > 1
                    ? draft.steps.filter((item) => item.id !== step.id)
                    : [blankStep()],
                )
              }
            >
              <IconTrash size={19} />
            </button>
          </div>
          <textarea
            className="textarea"
            value={step.text}
            placeholder="Was ist in diesem Schritt zu tun?"
            aria-label={`Text für Schritt ${index + 1}`}
            onChange={(event) => setStep(step.id, { text: event.target.value })}
          />
          <div className="rowline" style={{ marginTop: 8 }}>
            <span className="row__note" style={{ flex: 'none' }}>
              Timer (Min)
            </span>
            <NumberInput
              className="input editrow__amount"
              value={step.durationSec == null ? null : Math.round((step.durationSec / 60) * 10) / 10}
              onChange={(value) =>
                setStep(step.id, { durationSec: value == null ? null : Math.round(value * 60) })
              }
              placeholder="—"
              ariaLabel={`Timer für Schritt ${index + 1} in Minuten`}
            />
          </div>
        </div>
      ))}

      <button className="btn btn--ghost btn--block" onClick={() => set('steps', [...draft.steps, blankStep()])}>
        <IconPlus size={18} />
        Schritt hinzufügen
      </button>

      <hr className="divider" />

      <Field label="Notiz" htmlFor="recipe-notes">
        <textarea
          id="recipe-notes"
          className="textarea"
          value={draft.notes}
          placeholder="Optional: Hinweise, Beilagen, Varianten"
          onChange={(event) => set('notes', event.target.value)}
        />
      </Field>
    </Sheet>
  );
}
