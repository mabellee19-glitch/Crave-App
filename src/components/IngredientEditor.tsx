'use client';

import React from 'react';
import { Ingredient } from '@/lib/types';
import { blankIngredient } from '@/lib/store';
import { NumberInput } from './ui';
import { IconPlus, IconTrash } from './Icons';

/**
 * Zutatenliste zum Bearbeiten – eine Zeile je Zutat, Menge · Einheit · Name.
 *
 * Rezepte und Gerichte fuehren beide eine Zutatenliste, deshalb liegt sie
 * hier und nicht im Rezeptformular. Es bleibt immer mindestens eine Zeile
 * stehen, damit nie ein leerer Block dasteht, in den man nichts eintragen
 * kann.
 */
export function IngredientEditor({
  ingredients,
  onChange,
}: {
  ingredients: Ingredient[];
  onChange: (next: Ingredient[]) => void;
}) {
  const patch = (id: string, teil: Partial<Ingredient>) =>
    onChange(ingredients.map((item) => (item.id === id ? { ...item, ...teil } : item)));

  const entfernen = (id: string) =>
    onChange(
      ingredients.length > 1 ? ingredients.filter((item) => item.id !== id) : [blankIngredient()],
    );

  return (
    <>
      {ingredients.map((ingredient, index) => (
        <div className="editrow" key={ingredient.id}>
          <NumberInput
            className="input editrow__amount"
            value={ingredient.amount}
            onChange={(value) => patch(ingredient.id, { amount: value })}
            placeholder="400"
            ariaLabel={`Menge für Zutat ${index + 1}`}
          />
          <input
            className="input editrow__unit"
            value={ingredient.unit}
            placeholder="g"
            aria-label={`Einheit für Zutat ${index + 1}`}
            onChange={(event) => patch(ingredient.id, { unit: event.target.value })}
            autoComplete="off"
          />
          <input
            className="input editrow__grow"
            value={ingredient.name}
            placeholder="Zutat"
            aria-label={`Name für Zutat ${index + 1}`}
            onChange={(event) => patch(ingredient.id, { name: event.target.value })}
            autoComplete="off"
          />
          <button
            className="iconbtn iconbtn--plain"
            aria-label={`Zutat ${index + 1} entfernen`}
            onClick={() => entfernen(ingredient.id)}
          >
            <IconTrash size={19} />
          </button>
        </div>
      ))}

      <button
        className="btn btn--ghost btn--block"
        onClick={() => onChange([...ingredients, blankIngredient()])}
      >
        <IconPlus size={18} />
        Zutat hinzufügen
      </button>
    </>
  );
}

/** Zutaten fuers Speichern aufraeumen: Leerzeilen weg, Rest getrimmt. */
export function aufgeraeumteZutaten(ingredients: Ingredient[]): Ingredient[] {
  return ingredients
    .filter((item) => item.name.trim().length > 0)
    .map((item) => ({ ...item, name: item.name.trim(), unit: item.unit.trim() }));
}
