'use client';

import React, { useMemo, useState } from 'react';
import { DISH_CATEGORIES, DISH_CATEGORY_LABEL, Dish, Recipe } from '@/lib/types';
import { Eintrag, eintraegeAus, kategorieKlasse } from '@/lib/essen';
import { normalizeName } from '@/lib/units';
import { SearchBar } from './SearchBar';
import { EmptyState } from './ui';
import { IconBook, IconCookNext, IconIdee, IconPlus } from './Icons';

/**
 * Alles, was man kochen kann, in einer Liste: Rezepte mit Anleitung und
 * Ideen ohne. Ein Symbol links sagt, was es ist – das Buch fuer ein Rezept,
 * die Gluehbirne fuer eine Idee.
 */
/*
 * Gemerkt (memo): oeffnet sich ein Rezept oder ein Blatt darueber, aendert
 * sich an der Liste nichts – sie wurde trotzdem jedes Mal ganz neu gebaut.
 */
export const EssenView = React.memo(function EssenView({
  recipes,
  ideen,
  onOpenRecipe,
  onOpenIdea,
  onNew,
  onToggleRecipeCookNext,
  onToggleIdeaCookNext,
}: {
  recipes: Recipe[];
  ideen: Dish[];
  onOpenRecipe: (id: string) => void;
  onOpenIdea: (id: string) => void;
  onNew: () => void;
  onToggleRecipeCookNext: (id: string) => void;
  onToggleIdeaCookNext: (id: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'cooknext' | string>('all');

  const eintraege = useMemo(() => eintraegeAus(recipes, ideen), [recipes, ideen]);

  /*
   * Die festen Sparten stehen immer da, auch leer – sonst waere "Dessert"
   * mal da und mal nicht. Eigene Kategorien aus Rezepten kommen dahinter.
   */
  const categories = useMemo(() => {
    const fest = DISH_CATEGORIES.map((key) => DISH_CATEGORY_LABEL[key]);
    const bekannt = new Set(fest.map((label) => label.toLowerCase()));
    const eigene = new Map<string, string>();
    for (const eintrag of eintraege) {
      const label = eintrag.kategorie;
      if (!label || bekannt.has(label.toLowerCase())) continue;
      eigene.set(label.toLowerCase(), label);
    }
    return [...fest, ...[...eigene.values()].sort((a, b) => a.localeCompare(b, 'de'))];
  }, [eintraege]);

  const geplant = eintraege.filter((eintrag) => eintrag.cookNext).length;

  const visible = useMemo(() => {
    const needle = normalizeName(query);
    return eintraege.filter((eintrag) => {
      if (filter === 'cooknext' && !eintrag.cookNext) return false;
      if (filter !== 'all' && filter !== 'cooknext') {
        if (eintrag.kategorie.toLowerCase() !== filter.toLowerCase()) return false;
      }
      if (!needle) return true;
      const zutaten =
        eintrag.art === 'rezept' ? eintrag.recipe.ingredients : (eintrag.dish.ingredients ?? []);
      const notiz = eintrag.art === 'idee' ? eintrag.dish.notes : '';
      return normalizeName(
        `${eintrag.name} ${eintrag.kategorie} ${notiz} ${zutaten.map((zutat) => zutat.name).join(' ')}`,
      ).includes(needle);
    });
  }, [eintraege, query, filter]);

  return (
    <section aria-labelledby="essen-heading">
      <h1 className="section-title" id="essen-heading">
        Cravings
      </h1>
      <p className="section-sub">
        {recipes.length} {recipes.length === 1 ? 'Rezept' : 'Rezepte'} · {ideen.length}{' '}
        {ideen.length === 1 ? 'Idee' : 'Ideen'}
      </p>

      <SearchBar
        value={query}
        onChange={setQuery}
        placeholder="Gericht oder Zutat suchen"
        label="Rezepte und Ideen durchsuchen"
      />

      <div className="chiprow" role="group" aria-label="Cravings filtern">
        <button
          className={`chip${filter === 'all' ? ' chip--active' : ''}`}
          onClick={() => setFilter('all')}
          aria-pressed={filter === 'all'}
        >
          Alle
        </button>
        <button
          className={`chip${filter === 'cooknext' ? ' chip--active' : ''}`}
          onClick={() => setFilter('cooknext')}
          aria-pressed={filter === 'cooknext'}
        >
          <IconCookNext size={15} filled={filter === 'cooknext'} />
          Cook Next
          {geplant > 0 ? <span className="chip__zahl">{geplant}</span> : null}
        </button>
        {categories.map((category) => {
          const klasse = kategorieKlasse(category);
          return (
            <button
              key={category}
              className={`chip${klasse === 'neutral' ? '' : ` chip--${klasse}`}${
                filter === category ? ' chip--active' : ''
              }`}
              onClick={() => setFilter(category)}
              aria-pressed={filter === category}
            >
              {category}
            </button>
          );
        })}
      </div>

      {visible.length === 0 ? (
        <EmptyState
          glyph="🍳"
          title={eintraege.length === 0 ? 'Noch nichts gespeichert' : 'Nichts gefunden'}
          text={
            eintraege.length === 0
              ? 'Leg ein Rezept an oder halte eine Idee fest – mit dem Plus oben.'
              : 'Passe die Suche oder den Filter an.'
          }
          action={
            eintraege.length === 0 ? (
              <button className="btn btn--primary" onClick={onNew}>
                <IconPlus size={18} />
                Neu anlegen
              </button>
            ) : null
          }
        />
      ) : (
        <div className="grid">
          {visible.map((eintrag) => (
            <EintragKarte
              key={`${eintrag.art}-${eintrag.id}`}
              eintrag={eintrag}
              onOpen={() =>
                eintrag.art === 'rezept' ? onOpenRecipe(eintrag.id) : onOpenIdea(eintrag.id)
              }
              onToggleCookNext={() =>
                eintrag.art === 'rezept'
                  ? onToggleRecipeCookNext(eintrag.id)
                  : onToggleIdeaCookNext(eintrag.id)
              }
            />
          ))}
        </div>
      )}
    </section>
  );
});

function EintragKarte({
  eintrag,
  onOpen,
  onToggleCookNext,
}: {
  eintrag: Eintrag;
  onOpen: () => void;
  onToggleCookNext: () => void;
}) {
  const klasse = kategorieKlasse(eintrag.kategorie);
  const rezept = eintrag.art === 'rezept';

  let meta: string;
  if (eintrag.art === 'rezept') {
    const teile = [
      eintrag.recipe.timeMin ? `${eintrag.recipe.timeMin} Min` : '',
      `${eintrag.recipe.servings} ${eintrag.recipe.servings === 1 ? 'Portion' : 'Port.'}`,
    ].filter(Boolean);
    meta = teile.join(' · ');
  } else {
    const zutaten = (eintrag.dish.ingredients ?? []).filter((zutat) => zutat.name.trim()).length;
    meta =
      zutaten > 0 ? `Idee · ${zutaten} ${zutaten === 1 ? 'Zutat' : 'Zutaten'}` : 'Idee · noch ohne Zutaten';
  }

  return (
    <article className="card">
      <div className="card__actions">
        <button
          className="card__fav"
          style={eintrag.cookNext ? { color: 'var(--plan)' } : undefined}
          onClick={onToggleCookNext}
          aria-label={
            eintrag.cookNext
              ? `${eintrag.name} aus Cook Next entfernen`
              : `${eintrag.name} zu Cook Next hinzufügen`
          }
          aria-pressed={eintrag.cookNext}
        >
          <IconCookNext size={19} filled={eintrag.cookNext} />
        </button>
      </div>

      <button
        className="card__open card__open--zeile"
        onClick={onOpen}
        aria-label={rezept ? `Rezept ${eintrag.name} öffnen` : `Idee ${eintrag.name} öffnen`}
      >
        <span className={`card__art card__art--${klasse}`} aria-hidden="true">
          {rezept ? <IconBook size={19} /> : <IconIdee size={19} />}
        </span>
        <span className="card__text">
          <h2 className="card__title">{eintrag.name}</h2>
          <span className="card__meta">
            {eintrag.kategorie ? (
              <span className={`tag${klasse === 'neutral' ? '' : ` tag--${klasse}`}`}>
                {eintrag.kategorie}
              </span>
            ) : null}
            <span className={rezept ? '' : 'card__idee'}>{meta}</span>
          </span>
        </span>
      </button>
    </article>
  );
}
