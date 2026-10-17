'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Ingredient } from '@/lib/types';
import { blankIngredient } from '@/lib/store';
import { canonicalUnit } from '@/lib/units';
import { Vorschlag, einheitenVorschlaege } from '@/lib/zutaten';
import { gelernt, zutatLernen } from '@/lib/zutatKi';
import { useT } from '@/lib/i18n';
import { useInhalt } from '@/lib/inhalt';
import { NumberInput } from './ui';
import { ZutatenFeld } from './ZutatenFeld';
import { IconPlus, IconSpark, IconTrash } from './Icons';

/** So lange nach dem letzten Buchstaben, bis die KI gefragt wird. */
const KI_PAUSE_MS = 700;

/** Was die App fuer eine Zutat vorschlaegt: erst das eigene Wissen, dann das der KI. */
function vorschlaegeFuer(name: string): Vorschlag[] {
  const eigene = einheitenVorschlaege(name);
  if (eigene.length) return eigene;
  return gelernt(name)?.vorschlaege ?? [];
}

const gleich = (zutat: Ingredient, vorschlag: Vorschlag) =>
  zutat.amount === vorschlag.amount && canonicalUnit(zutat.unit) === canonicalUnit(vorschlag.unit);

/**
 * Zutatenliste zum Bearbeiten – eine Zeile je Zutat, Menge · Einheit · Name.
 *
 * Rezepte und Gerichte fuehren beide eine Zutatenliste, deshalb liegt sie
 * hier und nicht im Rezeptformular. Es bleibt immer mindestens eine Zeile
 * stehen, damit nie ein leerer Block dasteht, in den man nichts eintragen
 * kann.
 *
 * Wer nur den Namen tippt, bekommt Menge und Einheit dazu: "Basilikum" wird
 * "1 Bund", "Tomatensauce" "1 Dose" – mit den anderen ueblichen Mengen als
 * Knoepfe darunter ("1 Glas", "400 g"). Kennt die App die Zutat nicht, fragt
 * sie nach einer kurzen Pause die KI. Was man selbst bei Menge oder Einheit
 * eintraegt, wird nie ueberschrieben.
 */
export function IngredientEditor({
  ingredients,
  onChange,
}: {
  ingredients: Ingredient[];
  onChange: (next: Ingredient[]) => void;
}) {
  const t = useT().zutatenEditor;
  const inhalt = useInhalt();
  // Zeilen, deren Menge und Einheit von der App stammen – die darf sie weiter anpassen.
  const [automatisch, setAutomatisch] = useState<Set<string>>(() => new Set());
  // Dasselbe fuer Rueckrufe, die erst nach der KI-Antwort laufen.
  const autoRef = useRef(automatisch);
  autoRef.current = automatisch;
  // Die Zeile, deren Name gerade getippt wurde: nur dort stehen die Knoepfe.
  const [aktiv, setAktiv] = useState<string | null>(null);
  const [kiSucht, setKiSucht] = useState<string | null>(null);
  const kiTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const aktuell = useRef(ingredients);
  aktuell.current = ingredients;

  useEffect(() => () => {
    if (kiTimer.current) clearTimeout(kiTimer.current);
  }, []);

  const patch = (id: string, teil: Partial<Ingredient>) =>
    onChange(aktuell.current.map((item) => (item.id === id ? { ...item, ...teil } : item)));

  const markieren = (id: string, an: boolean) =>
    setAutomatisch((vorher) => {
      if (vorher.has(id) === an) return vorher;
      const neu = new Set(vorher);
      if (an) neu.add(id);
      else neu.delete(id);
      autoRef.current = neu;
      return neu;
    });

  /** Menge und Einheit setzen, solange die Zeile leer ist oder von der App stammt. */
  const vorschlagAnwenden = (id: string, name: string, vorschlaege: Vorschlag[]) => {
    const zeile = aktuell.current.find((item) => item.id === id);
    if (!zeile || zeile.name !== name) return;
    const leer = zeile.amount == null && !zeile.unit.trim();
    if (!leer && !autoRef.current.has(id)) return;
    const erster = vorschlaege[0];
    if (!erster) {
      if (autoRef.current.has(id)) {
        patch(id, { amount: null, unit: '' });
        markieren(id, false);
      }
      return;
    }
    if (!gleich(zeile, erster)) patch(id, { amount: erster.amount, unit: erster.unit });
    markieren(id, true);
  };

  const nameAendern = (id: string, name: string) => {
    const zeile = aktuell.current.find((item) => item.id === id);
    const vorschlaege = vorschlaegeFuer(name);
    const leer = zeile ? zeile.amount == null && !zeile.unit.trim() : true;
    const darf = leer || autoRef.current.has(id);
    const erster = vorschlaege[0];
    if (darf && erster) {
      patch(id, { name, amount: erster.amount, unit: erster.unit });
      markieren(id, true);
    } else if (darf && autoRef.current.has(id)) {
      // Die Zutat passt nicht mehr zur Menge von vorhin.
      patch(id, { name, amount: null, unit: '' });
      markieren(id, false);
    } else {
      patch(id, { name });
    }
    setAktiv(id);

    if (kiTimer.current) clearTimeout(kiTimer.current);
    setKiSucht(null);
    if (!vorschlaege.length && name.trim().length >= 3 && gelernt(name) === undefined) {
      kiTimer.current = setTimeout(() => {
        setKiSucht(id);
        void zutatLernen(name).then((antwort) => {
          setKiSucht((wer) => (wer === id ? null : wer));
          if (antwort?.vorschlaege.length) vorschlagAnwenden(id, name, antwort.vorschlaege);
        });
      }, KI_PAUSE_MS);
    }
  };

  const entfernen = (id: string) =>
    onChange(
      ingredients.length > 1 ? ingredients.filter((item) => item.id !== id) : [blankIngredient()],
    );

  return (
    <>
      {ingredients.map((ingredient, index) => {
        const vorschlaege = aktiv === ingredient.id && ingredient.name.trim() ? vorschlaegeFuer(ingredient.name) : [];
        return (
          <div key={ingredient.id} className="zutatzeile">
            <div className="editrow">
              <NumberInput
                className="input editrow__amount"
                value={ingredient.amount}
                onChange={(value) => {
                  markieren(ingredient.id, false);
                  patch(ingredient.id, { amount: value });
                }}
                placeholder={t.platzhalterMenge}
                ariaLabel={t.menge(index + 1)}
              />
              <input
                className="input editrow__unit"
                value={ingredient.unit}
                placeholder={t.platzhalterEinheit}
                aria-label={t.einheit(index + 1)}
                onChange={(event) => {
                  markieren(ingredient.id, false);
                  patch(ingredient.id, { unit: event.target.value });
                }}
                autoComplete="off"
              />
              <ZutatenFeld
                wrapperClassName="editrow__grow"
                value={ingredient.name}
                placeholder={t.platzhalterName}
                ariaLabel={t.name(index + 1)}
                onChange={(name) => nameAendern(ingredient.id, name)}
                onFocus={() => setAktiv(ingredient.id)}
              />
              <button
                className="iconbtn iconbtn--plain"
                aria-label={t.entfernen(index + 1)}
                onClick={() => entfernen(ingredient.id)}
              >
                <IconTrash size={19} />
              </button>
            </div>
            {vorschlaege.length > 1 ? (
              <div className="mengenwahl" role="group" aria-label={t.vorschlaege(ingredient.name)}>
                {vorschlaege.map((vorschlag) => {
                  const text = inhalt.menge(vorschlag.amount, vorschlag.unit);
                  const gewaehlt = gleich(ingredient, vorschlag);
                  return (
                    <button
                      key={`${vorschlag.amount}-${vorschlag.unit}`}
                      type="button"
                      className={`mengenwahl__chip${gewaehlt ? ' mengenwahl__chip--aktiv' : ''}`}
                      aria-pressed={gewaehlt}
                      aria-label={t.nehmen(text)}
                      onClick={() => {
                        patch(ingredient.id, { amount: vorschlag.amount, unit: vorschlag.unit });
                        markieren(ingredient.id, true);
                      }}
                    >
                      {text}
                    </button>
                  );
                })}
              </div>
            ) : kiSucht === ingredient.id ? (
              <p className="mengenwahl__ki">
                <IconSpark size={14} />
                {t.kiDenkt}
              </p>
            ) : null}
          </div>
        );
      })}

      <button
        className="btn btn--ghost btn--block"
        onClick={() => onChange([...ingredients, blankIngredient()])}
      >
        <IconPlus size={18} />
        {t.hinzufuegen}
      </button>
    </>
  );
}

/** Zutaten fuers Speichern aufraeumen: Leerzeilen weg, Rest getrimmt. */
export function aufgeraeumteZutaten(ingredients: Ingredient[]): Ingredient[] {
  return ingredients
    .filter((item) => item.name.trim().length > 0)
    .map((item) => ({ ...item, name: item.name.trim(), unit: canonicalUnit(item.unit) }));
}
