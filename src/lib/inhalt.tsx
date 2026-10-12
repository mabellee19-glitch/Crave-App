'use client';

/**
 * Gespeicherte Inhalte in der gewaehlten Sprache zeigen.
 *
 * Gespeichert wird auf Deutsch (siehe CLAUDE.md). Fuer die englische Ansicht
 * wird jeder Text in dieser Reihenfolge nachgeschlagen:
 *
 * 1. die Uebersetzungen am Rezept oder Gericht selbst (`en`, von der KI),
 * 2. die mitgelieferten Inhalte (lib/seedEn, von Hand uebersetzt),
 * 3. bei Zutaten das Zutatenwissen (lib/zutaten) und was die KI zu einer
 *    unbekannten Zutat gesagt hat (lib/zutatKi).
 *
 * Findet sich nichts, steht der deutsche Text da – die KI uebersetzt ihn im
 * Hintergrund, sobald sie erreichbar ist (lib/useKiKuerzung).
 *
 * Umgekehrt zeigt die deutsche Ansicht eine englisch eingetippte Zutat
 * ("basil") auf Deutsch, wenn die App sie kennt.
 */

import { useMemo, useSyncExternalStore } from 'react';
import { Sprache, useSprache } from './i18n';
import { SEED_EN } from './seedEn';
import { einheitIn, englischerName, zutatenName } from './zutaten';
import { abonnieren, gelernt, lernstand } from './zutatKi';
import { formatQuantity } from './units';
import { ABMESSEN } from './prep';
import { matchDishCategory } from './types';

/** Woerterbuch eines Rezepts oder Gerichts: deutscher Text → englischer. */
export type Woerterbuch = Record<string, string> | undefined;

export interface Inhalt {
  sprache: Sprache;
  /** Ein Text aus einem Rezept (Name, Schritt, Vorbereitung, Notiz). */
  text: (deutsch: string, woerter?: Woerterbuch) => string;
  /** Ein Zutatenname; die Menge waehlt im Englischen Einzahl oder Mehrzahl. */
  zutat: (name: string, menge?: number | null, woerter?: Woerterbuch) => string;
  /** Menge und Einheit, z. B. "2 EL" oder "2 tbsp". */
  menge: (amount: number | null, unit: string) => string;
  /** Eine Einheit allein. */
  einheit: (unit: string, amount?: number | null) => string;
  /** Eine Kategorie, wie sie am Rezept steht ("Vegi" → "Veggie"). */
  kategorie: (kategorie: string) => string;
}

/** Freie Kategorien, die oft vorkommen. Die vier festen kommen aus matchDishCategory. */
const KATEGORIE_EN: Record<string, string> = {
  'high-protein': 'High-Protein',
  comfort: 'Comfort',
  vegi: 'Veggie',
  dessert: 'Dessert',
  frühstück: 'Breakfast',
  fruehstueck: 'Breakfast',
  zmorge: 'Breakfast',
  snack: 'Snack',
  suppe: 'Soup',
  salat: 'Salad',
  beilage: 'Side',
  hauptgericht: 'Main',
  vorspeise: 'Starter',
  backen: 'Baking',
  brot: 'Bread',
  getränk: 'Drink',
  getränke: 'Drinks',
};

export function kategorieIn(sprache: Sprache, kategorie: string): string {
  if (sprache === 'de' || !kategorie) return kategorie;
  const fest = matchDishCategory(kategorie);
  return KATEGORIE_EN[fest ?? kategorie.trim().toLowerCase()] ?? kategorie;
}

export function textIn(sprache: Sprache, deutsch: string, woerter?: Woerterbuch): string {
  if (sprache === 'de' || !deutsch) return deutsch;
  const sauber = deutsch.trim();
  if (sauber === ABMESSEN) return 'Measure and set out all ingredients';
  const bekannt = woerter?.[sauber] ?? SEED_EN[sauber];
  if (bekannt) return bekannt;
  // Die Notiz beim Import: "Übernommen von https://…" – die Adresse bleibt.
  if (sauber.startsWith('Übernommen von ')) return `From ${sauber.slice('Übernommen von '.length)}`;
  return deutsch;
}

export function zutatIn(
  sprache: Sprache,
  name: string,
  menge?: number | null,
  woerter?: Woerterbuch,
): string {
  if (!name) return name;
  const sauber = name.trim();
  if (sprache === 'en') {
    return (
      woerter?.[sauber] ??
      SEED_EN[sauber] ??
      zutatenName(sauber, 'en', menge) ??
      (gelernt(sauber)?.en || null) ??
      name
    );
  }
  // Auf Englisch eingetippt, deutsch gezeigt – nur was die App sicher als
  // englisch erkennt. Deutsch Eingetipptes bleibt Wort fuer Wort stehen.
  if (englischerName(sauber)) return zutatenName(sauber, 'de', menge) ?? name;
  const ki = gelernt(sauber);
  if (ki?.de && ki.en && ki.en.trim().toLowerCase() === sauber.toLowerCase()) return ki.de;
  return name;
}

export function mengeIn(sprache: Sprache, amount: number | null, unit: string): string {
  if (sprache === 'de') return formatQuantity(amount, unit);
  return formatQuantity(amount, einheitIn(unit, 'en', amount));
}

/** Texte, Zutaten und Mengen in der gewaehlten Sprache. */
export function useInhalt(): Inhalt {
  const sprache = useSprache();
  // Lernt die KI eine Zutat dazu, zeigt die Ansicht sie gleich richtig.
  const stand = useSyncExternalStore(abonnieren, lernstand, () => 0);
  return useMemo(
    () => ({
      sprache,
      text: (deutsch, woerter) => textIn(sprache, deutsch, woerter),
      zutat: (name, menge, woerter) => zutatIn(sprache, name, menge, woerter),
      menge: (amount, unit) => mengeIn(sprache, amount, unit),
      einheit: (unit, amount) => (sprache === 'en' ? einheitIn(unit, 'en', amount) : unit),
      kategorie: (kategorie) => kategorieIn(sprache, kategorie),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sprache, stand],
  );
}
