'use client';

import React from 'react';
import { useT } from '@/lib/i18n';
import { Sheet } from './ui';
import { IconChevronRight, IconIdee, IconLink, IconPencil } from './Icons';

export type NeuArt = 'link' | 'rezept' | 'idee';

/**
 * Was kommt dazu? Drei Wege, ein Knopf. Vorher musste man wissen, ob etwas
 * ein Rezept oder ein Gericht ist, bevor man den richtigen Bereich fand.
 */
export function NewSheet({ onPick, onClose }: { onPick: (art: NeuArt) => void; onClose: () => void }) {
  const t = useT();
  const wege: Array<{ art: NeuArt; titel: string; text: string; icon: React.ReactNode }> = [
    {
      art: 'link',
      titel: t.neu.wege.link.titel,
      text: t.neu.wege.link.text,
      icon: <IconLink size={22} />,
    },
    {
      art: 'rezept',
      titel: t.neu.wege.rezept.titel,
      text: t.neu.wege.rezept.text,
      icon: <IconPencil size={22} />,
    },
    {
      art: 'idee',
      titel: t.neu.wege.idee.titel,
      text: t.neu.wege.idee.text,
      icon: <IconIdee size={22} />,
    },
  ];

  return (
    <Sheet title={t.neu.titel} onClose={onClose}>
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
        {t.neu.ausbauen}
      </p>
    </Sheet>
  );
}
