/**
 * Vorschlaege beim Tippen eines Zutatennamens: "bas" → Basilikum.
 *
 * Zwei Quellen:
 * - **Eigene Zutaten** – was in den eigenen Rezepten, Ideen, der Grundliste
 *   und der Einkaufsliste schon vorkommt, genau so geschrieben. Was oft
 *   vorkommt, steht weiter oben.
 * - **Zutatenwissen** (lib/zutaten) – gut 230 gelaeufige Zutaten.
 *
 * Verglichen wird ohne Gross/Klein und ohne Umlaute ("rue" findet Rüebli).
 * Zuerst kommt, was mit dem Getippten beginnt, dann was ein Wort darin damit
 * beginnt ("tom" → Cherrytomaten erst danach), zuletzt Treffer mitten im Wort.
 * Innerhalb davon: oft Gebrauchtes zuerst, dann das Kuerzere.
 */

import { WORT_EINHEITEN, unitInfo } from './units';
import { Vorschlag, alleZutaten, norm } from './zutaten';

export interface NameVorschlag {
  name: string;
  /** Die uebliche Menge, wenn die App die Zutat kennt – als Hinweis. */
  menge?: Vorschlag;
}

/** Wie viele Vorschlaege hoechstens dastehen. */
const MAX = 6;

/** 0: beginnt damit, 1: ein Wort beginnt damit, 3: steckt darin, -1: nein. */
function rang(name: string, suche: string): number {
  const n = norm(name).trim();
  if (n.startsWith(suche)) return 0;
  if (n.split(' ').some((wort) => wort.startsWith(suche))) return 1;
  if (suche.length >= 3 && n.replace(/ /g, '').includes(suche.replace(/ /g, ''))) return 3;
  return -1;
}

/**
 * Vorschlaege fuer `suche`. `eigene` zaehlt, wie oft ein eigener Name
 * vorkommt (Name → Anzahl).
 */
export function namenVorschlagen(suche: string, eigene: Map<string, number>): NameVorschlag[] {
  const s = norm(suche).trim();
  if (s.length < 2) return [];

  const kandidaten = new Map<string, { name: string; rang: number; oft: number; menge?: Vorschlag }>();
  let fertig = false;
  const merken = (name: string, r: number, oft: number, menge?: Vorschlag) => {
    if (r < 0) return;
    const schluessel = norm(name).trim();
    if (!schluessel) return;
    if (schluessel === s) {
      fertig = true;
      return;
    }
    const bisher = kandidaten.get(schluessel);
    if (!bisher) {
      kandidaten.set(schluessel, { name, rang: r, oft, menge });
      return;
    }
    // Derselbe Name aus beiden Quellen: die eigene Schreibweise und
    // Haeufigkeit, der beste Rang, die uebliche Menge aus dem Wissen.
    kandidaten.set(schluessel, {
      name: bisher.oft >= oft ? bisher.name : name,
      rang: Math.min(r, bisher.rang),
      oft: Math.max(oft, bisher.oft),
      menge: bisher.menge ?? menge,
    });
  };

  for (const [name, oft] of eigene) merken(name, rang(name, s), oft);

  for (const eintrag of alleZutaten()) {
    const name = eintrag.de;
    let r = rang(name, s);
    // Auch ueber die Schluesselwoerter: "basil" findet Basilikum.
    if (r < 0 && eintrag.woerter.some((wort) => wort.startsWith(s))) r = 2;
    merken(name, r, 0, eintrag.vorschlaege[0]);
  }

  // Steht schon eine bekannte Zutat genau so da, ist man fertig: keine Liste,
  // die ueber dem naechsten Knopf liegt und den Tipp darauf abfaengt.
  if (fertig) return [];

  // Was man oft braucht, kommt nach vorne; ein einzelner Eintrag aus der
  // Grundliste ("Tomatensauce Pasta") aber nicht vor "Tomaten".
  const gewicht = (oft: number) => (oft >= 2 ? oft : 0);
  return [...kandidaten.values()]
    .sort(
      (a, b) =>
        a.rang - b.rang ||
        gewicht(b.oft) - gewicht(a.oft) ||
        a.name.length - b.name.length ||
        a.name.localeCompare(b.name, 'de'),
    )
    .slice(0, MAX)
    .map(({ name, menge }) => (menge ? { name, menge } : { name }));
}

/** Englische Einheiten, die man in der Schnelleingabe tippt. */
const EINHEITEN_EN = new Set(['tbsp', 'tsp', 'cup', 'cups', 'can', 'cans', 'jar', 'jars', 'pack', 'bunch', 'pinch', 'clove', 'cloves', 'oz', 'lb', 'lbs']);

/**
 * Die Schnelleingabe in der Beute ("400 g Pou") teilen: vorne Menge und
 * Einheit, hinten der Name, nach dem gesucht wird.
 */
export function eingabeTeilen(text: string): { vorne: string; suche: string } {
  const treffer = /^(\s*\d+(?:[.,]\d+)?\s*)(.*)$/.exec(text);
  if (!treffer) return { vorne: '', suche: text };
  let [, vorne, rest] = treffer;
  const einheit = /^([\p{L}]+\.?)(\s+)(.*)$/u.exec(rest);
  if (einheit) {
    const wort = einheit[1].toLowerCase().replace(/\.$/, '');
    if (unitInfo(wort) || WORT_EINHEITEN.has(wort) || EINHEITEN_EN.has(wort)) {
      vorne += einheit[1] + einheit[2];
      rest = einheit[3];
    }
  }
  return { vorne, suche: rest };
}

/** Alle Zutatennamen aus den eigenen Daten, mit Anzahl. */
export function eigeneNamen(listen: Array<Array<{ name: string }>>): Map<string, number> {
  const anzahl = new Map<string, number>();
  for (const liste of listen) {
    for (const { name } of liste) {
      const sauber = name?.trim();
      if (!sauber || sauber.length > 60) continue;
      anzahl.set(sauber, (anzahl.get(sauber) ?? 0) + 1);
    }
  }
  return anzahl;
}
