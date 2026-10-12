'use client';

import React, { useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '@/lib/store';
import { useT } from '@/lib/i18n';
import { useInhalt } from '@/lib/inhalt';
import { NameVorschlag, eigeneNamen, eingabeTeilen, namenVorschlagen } from '@/lib/autocomplete';

/**
 * Alle Zutatennamen aus den eigenen Daten – Rezepte, Ideen, Grundliste,
 * Einkaufsliste –, in der gewaehlten Sprache. Gerechnet nur, wenn sich die
 * Daten oder die Sprache aendern, nicht bei jedem Buchstaben.
 */
function useEigeneNamen(): Map<string, number> {
  const { data } = useStore();
  const inhalt = useInhalt();
  return useMemo(() => {
    const roh = eigeneNamen([
      ...Object.values(data.recipes)
        .filter((recipe) => !recipe.deleted)
        .map((recipe) => recipe.ingredients),
      ...Object.values(data.dishes)
        .filter((dish) => !dish.deleted)
        .map((dish) => dish.ingredients ?? []),
      Object.values(data.pantry).filter((item) => !item.deleted),
      Object.values(data.shopping).filter((item) => !item.deleted),
    ]);
    if (inhalt.sprache === 'de') return roh;
    const uebersetzt = new Map<string, number>();
    for (const [name, anzahl] of roh) {
      const anzeige = inhalt.zutat(name);
      const gross = anzeige.charAt(0).toLocaleUpperCase() + anzeige.slice(1);
      uebersetzt.set(gross, (uebersetzt.get(gross) ?? 0) + anzahl);
    }
    return uebersetzt;
  }, [data, inhalt]);
}

/** Kleinschrift ohne Akzente – gleich lang wie das Original, damit die Stellen passen. */
const flach = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

/** Den getippten Teil im Vorschlag fett: "**Bas**ilikum". */
function Hervorgehoben({ name, suche }: { name: string; suche: string }) {
  const s = flach(suche.trim());
  const n = flach(name);
  let start = n.startsWith(s) ? 0 : -1;
  if (start < 0 && s) {
    const wortanfang = new RegExp(`[^a-z0-9]${s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`).exec(n);
    if (wortanfang) start = wortanfang.index + 1;
  }
  if (start < 0 || !s) return <>{name}</>;
  return (
    <>
      {name.slice(0, start)}
      <strong>{name.slice(start, start + s.length)}</strong>
      {name.slice(start + s.length)}
    </>
  );
}

/**
 * Ein Eingabefeld fuer Zutaten mit Vorschlaegen beim Tippen: "bas" bietet
 * Basilikum an. Pfeiltasten waehlen, Enter oder Tippen uebernimmt, Escape
 * schliesst. In der Schnelleingabe der Beute (`schnell`) gilt die Suche nur
 * dem Namen hinter Menge und Einheit: "400 g pou" bietet Poulet an und
 * behaelt "400 g".
 */
export function ZutatenFeld({
  value,
  onChange,
  schnell = false,
  className = 'input',
  wrapperClassName,
  placeholder,
  ariaLabel,
  enterKeyHint,
  onFocus,
}: {
  value: string;
  onChange: (value: string) => void;
  schnell?: boolean;
  className?: string;
  wrapperClassName?: string;
  placeholder?: string;
  ariaLabel?: string;
  enterKeyHint?: React.InputHTMLAttributes<HTMLInputElement>['enterKeyHint'];
  onFocus?: () => void;
}) {
  const t = useT().autocomplete;
  const inhalt = useInhalt();
  const eigene = useEigeneNamen();
  const listId = useId();
  const [offen, setOffen] = useState(false);
  const [aktiv, setAktiv] = useState(-1);

  const { vorne, suche } = schnell ? eingabeTeilen(value) : { vorne: '', suche: value };
  const vorschlaege = useMemo(
    () => (offen ? namenVorschlagen(suche, inhalt.sprache, eigene) : []),
    [offen, suche, inhalt.sprache, eigene],
  );
  const sichtbar = offen && vorschlaege.length > 0;

  /*
   * Unten im Blatt, und auf dem iPhone mit der Tastatur darunter, ist unter
   * dem Feld oft kein Platz: dann klappt die Liste nach oben auf.
   */
  const feld = useRef<HTMLInputElement>(null);
  const [nachOben, setNachOben] = useState(false);
  useLayoutEffect(() => {
    if (!sichtbar || !feld.current) return;
    const rand = feld.current.getBoundingClientRect();
    const hoehe = window.visualViewport?.height ?? window.innerHeight;
    const unten = hoehe - rand.bottom;
    setNachOben(unten < 240 && rand.top > unten);
  }, [sichtbar, vorschlaege.length]);

  const nehmen = (vorschlag: NameVorschlag) => {
    onChange(`${vorne}${vorschlag.name}`);
    setOffen(false);
    setAktiv(-1);
  };

  return (
    <div className={`zutatenfeld${wrapperClassName ? ` ${wrapperClassName}` : ''}`}>
      <input
        ref={feld}
        className={className}
        value={value}
        placeholder={placeholder}
        aria-label={ariaLabel}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={sichtbar}
        aria-controls={listId}
        aria-activedescendant={sichtbar && aktiv >= 0 ? `${listId}-${aktiv}` : undefined}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        enterKeyHint={enterKeyHint}
        onChange={(event) => {
          onChange(event.target.value);
          setOffen(true);
          setAktiv(-1);
        }}
        onFocus={() => {
          setOffen(true);
          onFocus?.();
        }}
        onBlur={() => {
          setOffen(false);
          setAktiv(-1);
        }}
        onKeyDown={(event) => {
          if (!sichtbar) return;
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            setAktiv((index) => (index + 1) % vorschlaege.length);
          } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            setAktiv((index) => (index <= 0 ? vorschlaege.length - 1 : index - 1));
          } else if (event.key === 'Enter' && aktiv >= 0) {
            // Enter nimmt den gewaehlten Vorschlag – und schickt noch nichts ab.
            event.preventDefault();
            nehmen(vorschlaege[aktiv]);
          } else if (event.key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            setOffen(false);
          }
        }}
      />
      {sichtbar ? (
        <ul
          className={`zutatenfeld__liste${nachOben ? ' zutatenfeld__liste--oben' : ''}`}
          role="listbox"
          id={listId}
          aria-label={t.liste}
        >
          {vorschlaege.map((vorschlag, index) => (
            <li
              key={vorschlag.name}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={index === aktiv}
              className={`zutatenfeld__option${index === aktiv ? ' zutatenfeld__option--aktiv' : ''}`}
              // Vor dem Blur des Feldes: sonst schloesse sich die Liste vor dem Tipp.
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => nehmen(vorschlag)}
            >
              <span className="zutatenfeld__name">
                <Hervorgehoben name={vorschlag.name} suche={suche} />
              </span>
              {vorschlag.menge ? (
                <span className="zutatenfeld__menge" aria-hidden="true">
                  {inhalt.menge(vorschlag.menge.amount, vorschlag.menge.unit)}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
