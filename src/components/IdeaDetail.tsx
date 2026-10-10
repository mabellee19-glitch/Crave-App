'use client';

import React from 'react';
import { DISH_CATEGORY_LABEL, Dish } from '@/lib/types';
import { formatQuantity } from '@/lib/units';
import { Sheet } from './ui';
import { IconBook, IconCookNext, IconIdee, IconPencil } from './Icons';

/**
 * Eine Idee: ein Gericht ohne Anleitung. Sie kann auf Cook Next – dann kommen
 * ihre Zutaten auf die Einkaufsliste – und sie kann zum Rezept werden. Dabei
 * bleibt sie derselbe Eintrag; es entsteht kein zweiter.
 */
export function IdeaDetail({
  dish,
  onClose,
  onEdit,
  onToggleCookNext,
  onMakeRecipe,
}: {
  dish: Dish;
  onClose: () => void;
  onEdit: () => void;
  onToggleCookNext: () => void;
  onMakeRecipe: () => void;
}) {
  const zutaten = (dish.ingredients ?? []).filter((zutat) => zutat.name.trim());

  return (
    <Sheet
      title={dish.name || 'Idee'}
      onClose={onClose}
      actions={
        <button className="iconbtn iconbtn--plain" onClick={onEdit} aria-label="Idee bearbeiten">
          <IconPencil />
        </button>
      }
      footer={
        <button
          className={`btn btn--lg btn--block ${dish.cookNext ? 'btn--ghost' : 'btn--primary'}`}
          onClick={onToggleCookNext}
          aria-pressed={dish.cookNext}
        >
          <IconCookNext size={19} filled={dish.cookNext} />
          {dish.cookNext ? 'Von Cook Next nehmen' : 'Auf Cook Next'}
        </button>
      }
    >
      <h1 className="detail__title">{dish.name || 'Ohne Namen'}</h1>
      <div className="detail__meta">
        <span className="tag tag--idee">
          <IconIdee size={13} />
          Idee
        </span>
        <span className={`tag tag--${dish.category}`}>{DISH_CATEGORY_LABEL[dish.category]}</span>
      </div>

      {dish.notes ? (
        <p className="muted" style={{ fontSize: 14.5, marginBottom: 4 }}>
          {dish.notes}
        </p>
      ) : null}

      <div className="detail__section">
        <div className="detail__sectionhead">
          <span className="detail__h">Zutaten</span>
        </div>
        {zutaten.length === 0 ? (
          <p className="muted" style={{ fontSize: 14.5 }}>
            Noch keine Zutaten – über den Stift oben lassen sie sich eintragen.
          </p>
        ) : (
          <ul className="ingredients">
            {zutaten.map((zutat) => (
              <li className="ingredient" key={zutat.id}>
                <span className="ingredient__amount">{formatQuantity(zutat.amount, zutat.unit)}</span>
                <span>{zutat.name}</span>
              </li>
            ))}
          </ul>
        )}
        {dish.cookNext ? (
          <p className="detail__planhint">
            <IconCookNext size={15} filled />
            Für die nächsten Tage geplant – die Zutaten stehen auf der Einkaufsliste.
          </p>
        ) : null}
      </div>

      <div className="detail__section">
        <div className="notice">
          <strong>Noch keine Anleitung.</strong> Mach ein Rezept daraus: Name und Zutaten sind
          schon eingetragen, es fehlen nur noch die Schritte – oder ein Link zu einer Rezeptseite.
          <div style={{ height: 10 }} />
          <button className="btn btn--ghost" onClick={onMakeRecipe}>
            <IconBook size={18} />
            Rezept daraus machen
          </button>
        </div>
      </div>
      <div style={{ height: 8 }} />
    </Sheet>
  );
}
