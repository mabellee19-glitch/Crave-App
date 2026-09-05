'use client';

import React, { useMemo, useState } from 'react';
import { DISH_CATEGORIES, DISH_CATEGORY_LABEL, Dish, DishCategory, Recipe } from '@/lib/types';
import { normalizeName } from '@/lib/units';
import { SearchBar } from './SearchBar';
import { EmptyState } from './ui';
import { IconCookNext, IconLink, IconPencil, IconPlus } from './Icons';

type Filter = 'all' | 'cooknext' | DishCategory;

export function DishesView({
  dishes,
  recipes,
  onOpenRecipe,
  onEditDish,
  onNew,
  onToggleCookNext,
}: {
  dishes: Dish[];
  recipes: Recipe[];
  onOpenRecipe: (recipeId: string) => void;
  onEditDish: (dish: Dish) => void;
  onNew: () => void;
  onToggleCookNext: (id: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const recipeById = useMemo(() => new Map(recipes.map((r) => [r.id, r])), [recipes]);

  const visible = useMemo(() => {
    const needle = normalizeName(query);
    return dishes.filter((dish) => {
      if (filter === 'cooknext' && !dish.cookNext) return false;
      if (filter !== 'all' && filter !== 'cooknext' && dish.category !== filter) return false;
      if (!needle) return true;
      return normalizeName(`${dish.name} ${dish.notes}`).includes(needle);
    });
  }, [dishes, query, filter]);

  const counts = useMemo(() => {
    const result: Record<string, number> = { all: dishes.length, cooknext: 0 };
    for (const category of DISH_CATEGORIES) result[category] = 0;
    for (const dish of dishes) {
      if (dish.cookNext) result.cooknext += 1;
      result[dish.category] = (result[dish.category] ?? 0) + 1;
    }
    return result;
  }, [dishes]);

  return (
    <section aria-labelledby="dishes-heading">
      <h1 className="section-title" id="dishes-heading">
        Gerichte
      </h1>
      <p className="section-sub">Meine Essensideen, nach Kategorie sortiert</p>

      <SearchBar
        value={query}
        onChange={setQuery}
        placeholder="Gericht suchen"
        label="Gerichte durchsuchen"
      />

      <div className="chiprow" role="group" aria-label="Gerichte filtern">
        <button
          className={`chip${filter === 'all' ? ' chip--active' : ''}`}
          onClick={() => setFilter('all')}
          aria-pressed={filter === 'all'}
        >
          Alle <span className="muted">{counts.all}</span>
        </button>
        <button
          className={`chip${filter === 'cooknext' ? ' chip--active' : ''}`}
          onClick={() => setFilter('cooknext')}
          aria-pressed={filter === 'cooknext'}
        >
          <IconCookNext size={15} filled={filter === 'cooknext'} />
          Cook Next <span className="muted">{counts.cooknext}</span>
        </button>
        {DISH_CATEGORIES.map((category) => (
          <button
            key={category}
            className={`chip chip--${category}${filter === category ? ' chip--active' : ''}`}
            onClick={() => setFilter(category)}
            aria-pressed={filter === category}
          >
            {DISH_CATEGORY_LABEL[category]} <span className="muted">{counts[category]}</span>
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <EmptyState
          glyph="🍽️"
          title={dishes.length === 0 ? 'Noch keine Gerichte' : 'Nichts gefunden'}
          text={
            dishes.length === 0
              ? 'Sammle hier deine Essensideen – mit oder ohne hinterlegtes Rezept.'
              : 'Passe die Suche oder den Filter an.'
          }
          action={
            dishes.length === 0 ? (
              <button className="btn btn--primary" onClick={onNew}>
                <IconPlus size={18} />
                Gericht anlegen
              </button>
            ) : null
          }
        />
      ) : (
        <div className="grid">
          {visible.map((dish) => {
            const recipe = dish.recipeId ? recipeById.get(dish.recipeId) : undefined;
            return (
              <DishCard
                key={dish.id}
                dish={dish}
                recipeName={recipe?.name ?? null}
                onPrimary={() => (recipe ? onOpenRecipe(recipe.id) : onEditDish(dish))}
                onEdit={() => onEditDish(dish)}
                onToggleCookNext={() => onToggleCookNext(dish.id)}
              />
            );
          })}
        </div>
      )}
    </section>
  );
}

function DishCard({
  dish,
  recipeName,
  onPrimary,
  onEdit,
  onToggleCookNext,
}: {
  dish: Dish;
  recipeName: string | null;
  onPrimary: () => void;
  onEdit: () => void;
  onToggleCookNext: () => void;
}) {
  const linked = recipeName !== null;
  return (
    <article className="card">
      <div className="card__actions">
        <button
          className="card__fav"
          style={dish.cookNext ? { color: 'var(--plan)' } : undefined}
          onClick={onToggleCookNext}
          aria-label={
            dish.cookNext
              ? `${dish.name} aus Cook Next entfernen`
              : `${dish.name} zu Cook Next hinzufügen`
          }
          aria-pressed={dish.cookNext}
        >
          <IconCookNext size={19} filled={dish.cookNext} />
        </button>
        <button className="card__fav" onClick={onEdit} aria-label={`${dish.name} bearbeiten`}>
          <IconPencil size={18} />
        </button>
      </div>

      <button
        className="card__open card__open--wide"
        onClick={onPrimary}
        aria-label={linked ? `Rezept zu ${dish.name} öffnen` : `${dish.name} bearbeiten`}
      >
        {/* Der Name bleibt schlicht: dass ein Rezept hinterlegt ist, sagt das
            Etikett darunter. */}
        <h2 className="card__title">{dish.name}</h2>
        <div className="card__meta">
          <span className={`tag tag--${dish.category}`}>{DISH_CATEGORY_LABEL[dish.category]}</span>
          {linked ? (
            <span className="tag tag--link">
              <IconLink size={12} />
              Rezept
            </span>
          ) : (
            <span className="muted">Kein Rezept</span>
          )}
        </div>
      </button>
    </article>
  );
}
