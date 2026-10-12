'use client';

import React from 'react';
import { DISH_CATEGORY_LABEL, Dish } from '@/lib/types';
import { useInhalt } from '@/lib/inhalt';
import { useT } from '@/lib/i18n';
import { Sheet } from './ui';
import { Notiz } from './Notiz';
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
  const t = useT();
  const zutaten = (dish.ingredients ?? []).filter((zutat) => zutat.name.trim());
  const inhalt = useInhalt();
  const name = inhalt.text(dish.name, dish.en);

  return (
    <Sheet
      title={name || t.idee.idee}
      onClose={onClose}
      actions={
        <button className="iconbtn iconbtn--plain" onClick={onEdit} aria-label={t.idee.bearbeiten}>
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
          {dish.cookNext ? t.idee.vonCookNext : t.idee.aufCookNext}
        </button>
      }
    >
      <h1 className="detail__title">{name || t.idee.ohneNamen}</h1>
      <div className="detail__meta">
        <span className="tag tag--idee">
          <IconIdee size={13} />
          {t.idee.idee}
        </span>
        <span className={`tag tag--${dish.category}`}>{inhalt.kategorie(DISH_CATEGORY_LABEL[dish.category])}</span>
      </div>

      {dish.notes ? (
        <Notiz className="muted detail__notiz" text={inhalt.text(dish.notes, dish.en)} />
      ) : null}

      <div className="detail__section">
        <div className="detail__sectionhead">
          <span className="detail__h">{t.idee.zutaten}</span>
        </div>
        {zutaten.length === 0 ? (
          <p className="muted" style={{ fontSize: 14.5 }}>
            {t.idee.keineZutaten}
          </p>
        ) : (
          <ul className="ingredients">
            {zutaten.map((zutat) => (
              <li className="ingredient" key={zutat.id}>
                <span className="ingredient__amount">{inhalt.menge(zutat.amount, zutat.unit)}</span>
                <span>{inhalt.zutat(zutat.name, zutat.amount, dish.en)}</span>
              </li>
            ))}
          </ul>
        )}
        {dish.cookNext ? (
          <p className="detail__planhint">
            <IconCookNext size={15} filled />
            {t.idee.geplant}
          </p>
        ) : null}
      </div>

      <div className="detail__section">
        <div className="notice">
          <strong>{t.idee.keineAnleitung}</strong> {t.idee.rezeptDaraus}
          <div style={{ height: 10 }} />
          <button className="btn btn--ghost" onClick={onMakeRecipe}>
            <IconBook size={18} />
            {t.idee.rezeptMachen}
          </button>
        </div>
      </div>
      <div style={{ height: 8 }} />
    </Sheet>
  );
}
