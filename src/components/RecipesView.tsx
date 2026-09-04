'use client';

import React, { useMemo, useState } from 'react';
import { Recipe } from '@/lib/types';
import { normalizeName } from '@/lib/units';
import { SearchBar } from './SearchBar';
import { EmptyState } from './ui';
import { IconClock, IconHeart, IconPlus, IconServings } from './Icons';

export function RecipesView({
  recipes,
  onOpen,
  onNew,
  onToggleFavorite,
}: {
  recipes: Recipe[];
  onOpen: (id: string) => void;
  onNew: () => void;
  onToggleFavorite: (id: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'favorites' | string>('all');

  const categories = useMemo(() => {
    const seen = new Map<string, string>();
    for (const recipe of recipes) {
      const label = recipe.category.trim();
      if (label) seen.set(label.toLowerCase(), label);
    }
    return [...seen.values()].sort((a, b) => a.localeCompare(b, 'de'));
  }, [recipes]);

  const visible = useMemo(() => {
    const needle = normalizeName(query);
    return recipes.filter((recipe) => {
      if (filter === 'favorites' && !recipe.favorite) return false;
      if (filter !== 'all' && filter !== 'favorites') {
        if (recipe.category.trim().toLowerCase() !== filter.toLowerCase()) return false;
      }
      if (!needle) return true;
      const haystack = normalizeName(
        `${recipe.name} ${recipe.category} ${recipe.ingredients.map((i) => i.name).join(' ')}`,
      );
      return haystack.includes(needle);
    });
  }, [recipes, query, filter]);

  return (
    <section aria-labelledby="recipes-heading">
      <h1 className="section-title" id="recipes-heading">
        Rezepte
      </h1>
      <p className="section-sub">
        {recipes.length} {recipes.length === 1 ? 'Rezept' : 'Rezepte'} gespeichert
      </p>

      <SearchBar
        value={query}
        onChange={setQuery}
        placeholder="Rezept oder Zutat suchen"
        label="Rezepte durchsuchen"
      />

      <div className="chiprow" role="group" aria-label="Rezepte filtern">
        <button
          className={`chip${filter === 'all' ? ' chip--active' : ''}`}
          onClick={() => setFilter('all')}
          aria-pressed={filter === 'all'}
        >
          Alle
        </button>
        <button
          className={`chip${filter === 'favorites' ? ' chip--active' : ''}`}
          onClick={() => setFilter('favorites')}
          aria-pressed={filter === 'favorites'}
        >
          <IconHeart size={15} filled={filter === 'favorites'} />
          Favoriten
        </button>
        {categories.map((category) => (
          <button
            key={category}
            className={`chip${filter === category ? ' chip--active' : ''}`}
            onClick={() => setFilter(category)}
            aria-pressed={filter === category}
          >
            {category}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <EmptyState
          glyph="🍳"
          title={recipes.length === 0 ? 'Noch keine Rezepte' : 'Nichts gefunden'}
          text={
            recipes.length === 0
              ? 'Leg dein erstes Rezept an – mit Zutaten, Schritten und Timern.'
              : 'Passe die Suche oder den Filter an.'
          }
          action={
            recipes.length === 0 ? (
              <button className="btn btn--primary" onClick={onNew}>
                <IconPlus size={18} />
                Rezept anlegen
              </button>
            ) : null
          }
        />
      ) : (
        <div className="grid">
          {visible.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              onOpen={() => onOpen(recipe.id)}
              onToggleFavorite={() => onToggleFavorite(recipe.id)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function RecipeCard({
  recipe,
  onOpen,
  onToggleFavorite,
}: {
  recipe: Recipe;
  onOpen: () => void;
  onToggleFavorite: () => void;
}) {
  return (
    <article className="card">
      <div className="card__actions">
        <button
          className="card__fav"
          style={recipe.favorite ? { color: 'var(--berry)' } : undefined}
          onClick={onToggleFavorite}
          aria-label={
            recipe.favorite
              ? `${recipe.name} aus Favoriten entfernen`
              : `${recipe.name} zu Favoriten hinzufügen`
          }
          aria-pressed={recipe.favorite}
        >
          <IconHeart size={19} filled={recipe.favorite} />
        </button>
      </div>

      <button className="card__open" onClick={onOpen} aria-label={`Rezept ${recipe.name} öffnen`}>
        <h2 className="card__title">{recipe.name}</h2>
        <div className="card__meta">
          {recipe.category ? <span className="tag">{recipe.category}</span> : null}
          {recipe.timeMin ? (
            <span className="card__metaitem">
              <IconClock size={13} />
              {recipe.timeMin} Min
            </span>
          ) : null}
          <span className="card__metaitem">
            <IconServings size={13} />
            {recipe.servings}
          </span>
        </div>
      </button>
    </article>
  );
}
