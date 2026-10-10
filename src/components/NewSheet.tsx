'use client';

import React from 'react';
import { Sheet } from './ui';
import { IconChevronRight, IconIdee, IconLink, IconPencil } from './Icons';

export type NeuArt = 'link' | 'rezept' | 'idee';

/**
 * Was kommt dazu? Drei Wege, ein Knopf. Vorher musste man wissen, ob etwas
 * ein Rezept oder ein Gericht ist, bevor man den richtigen Bereich fand.
 */
export function NewSheet({ onPick, onClose }: { onPick: (art: NeuArt) => void; onClose: () => void }) {
  const wege: Array<{ art: NeuArt; titel: string; text: string; icon: React.ReactNode }> = [
    {
      art: 'link',
      titel: 'Rezept über Link',
      text: 'Adresse einer Rezeptseite einfügen – die KI macht die Schritte kurz und einfach.',
      icon: <IconLink size={22} />,
    },
    {
      art: 'rezept',
      titel: 'Rezept selbst schreiben',
      text: 'Zutaten, Vorbereitung und Schritte – mit Timern.',
      icon: <IconPencil size={22} />,
    },
    {
      art: 'idee',
      titel: 'Nur eine Idee',
      text: 'Name und ein paar Zutaten. Kommt auf Cook Next und die Einkaufsliste.',
      icon: <IconIdee size={22} />,
    },
  ];

  return (
    <Sheet title="Was kommt dazu?" onClose={onClose}>
      <div style={{ height: 16 }} />
      <div className="stack">
        {wege.map((weg) => (
          <button key={weg.art} className={`wahl wahl--${weg.art}`} onClick={() => onPick(weg.art)}>
            <span className="wahl__icon" aria-hidden="true">
              {weg.icon}
            </span>
            <span className="wahl__text">
              <span className="wahl__titel">{weg.titel}</span>
              <span className="wahl__info">{weg.text}</span>
            </span>
            <IconChevronRight size={18} />
          </button>
        ))}
      </div>
      <p className="row__note" style={{ margin: '14px 2px 8px' }}>
        Eine Idee lässt sich später mit einem Tipp zum Rezept ausbauen – sie bleibt dabei derselbe
        Eintrag.
      </p>
    </Sheet>
  );
}
