'use client';

import React, { useMemo, useState } from 'react';
import { DISH_CATEGORIES, DISH_CATEGORY_LABEL, Dish, DishCategory, Recipe } from '@/lib/types';
import { normalizeName } from '@/lib/units';
import { SearchBar } from './SearchBar';
import { EmptyState } from './ui';
import { IconHeart, IconLink, IconPencil, IconPlus } from './Icons';

type Filter = 'all' | 'favorites' | DishCategory;

export function DishesView({
  dishes,
  recipes,
  onOpenRecipe,
  onEditDish,
  onNew,
  onToggleFavorite,
}: {
  dishes: Dish[];
  recipes: Recipe[];
  onOpenRecipe: (recipeId: string) => void;
  onEditDish: (dish: Dish) => void;
  onNew: () => void;
  onToggleFavorite: (id: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const recipeById = useMemo(() => new Map(recipes.map((r) => [r.id, r])), [recipes]);

  const visible = useMemo(() => {
    const needle = normalizeName(query);
    return dishes.filter((dish) => {
      if (filter === 'favorites' && !dish.favorite) return false;
      if (filter !== 'all' && filter !== 'favorites' && dish.category !== filter) return false;
      if (!needle) return true;
      return normalizeName(`${dish.name} ${dish.notes}`).includes(needle);
    });
  }, [dishes, query, filter]);

  const counts = useMemo(() => {
    const result: Record<string, number> = { all: dishes.length, favorites: 0 };
    for (const category of DISH_CATEGORIES) result[category] = 0;
    for (const dish of dishes) {
      if (dish.favorite) result.favorites += 1;
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
          className={`chip${filter === 'favorites' ? ' chip--active' : ''}`}
          onClick={() => setFilter('favorites')}
          aria-pressed={filter === 'favorites'}
        >
          <IconHeart size={15} filled={filter === 'favorites'} />
          Favoriten <span className="muted">{counts.favorites}</span>
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
                onToggleFavorite={() => onToggleFavorite(dish.id)}
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
  onToggleFavorite,
}: {
  dish: Dish;
  recipeName: string | null;
  onPrimary: () => void;
  onEdit: () => void;
  onToggleFavorite: () => void;
}) {
  const linked = recipeName !== null;
  return (
    <article className="card">
      <div style={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 6, zIndex: 2 }}>
        <button
          className="card__fav"
          style={{ position: 'static', ...(dish.favorite ? { color: 'var(--berry)' } : {}) }}
          onClick={onToggleFavorite}
          aria-label={dish.favorite ? `${dish.name} aus Favoriten entfernen` : `${dish.name} zu Favoriten hinzufügen`}
          aria-pressed={dish.favorite}
        >
          <IconHeart size={19} filled={dish.favorite} />
        </button>
        <button
          className="card__fav"
          style={{ position: 'static' }}
          onClick={onEdit}
          aria-label={`${dish.name} bearbeiten`}
        >
          <IconPencil size={18} />
        </button>
      </div>

      <button
        onClick={onPrimary}
        style={{ display: 'flex', flexDirection: 'column', flex: 1, textAlign: 'left' }}
        aria-label={linked ? `Rezept zu ${dish.name} öffnen` : `${dish.name} bearbeiten`}
      >
        <div className="card__media">
          {dish.image ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={dish.image} alt="" loading="lazy" />
          ) : (
            <span className="card__glyph">{initials(dish.name)}</span>
          )}
        </div>
        <div className="card__body">
          <h2
            className="card__title"
            style={
              linked
                ? { color: 'var(--accent)', textDecoration: 'underline', textUnderlineOffset: '3px' }
                : undefined
            }
          >
            {dish.name}
          </h2>
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
        </div>
      </button>
    </article>
  );
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '·';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}
