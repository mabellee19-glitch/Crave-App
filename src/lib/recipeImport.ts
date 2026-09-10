/**
 * Rezepte aus einer Webseite lesen.
 *
 * Die allermeisten Rezeptseiten legen ihre Daten als schema.org-Rezept im
 * Quelltext ab – dasselbe, woraus Google seine Rezeptkarten baut. Damit geht
 * das Einlesen ohne Modell, ohne Schluessel und ohne Kosten. Nur wenn das
 * fehlt, muss man von Hand tippen.
 *
 * Dieses Modul rechnet nur; es holt nichts aus dem Netz. Das macht die Route.
 */

import { unitInfo } from './units';

export interface ImportedIngredient {
  name: string;
  amount: number | null;
  unit: string;
}

export interface ImportedStep {
  text: string;
  /** Dauer in Sekunden, `null` wenn im Text keine steht. */
  durationSec: number | null;
}

export interface ImportedRecipe {
  name: string;
  servings: number | null;
  timeMin: number | null;
  ingredients: ImportedIngredient[];
  steps: ImportedStep[];
  /** Woher es stammt – landet als Notiz am Rezept. */
  source: string;
}

/* -------------------------------------------------------------------------- */
/* Text aufraeumen                                                             */
/* -------------------------------------------------------------------------- */

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  szlig: 'ß',
  auml: 'ä',
  ouml: 'ö',
  uuml: 'ü',
  Auml: 'Ä',
  Ouml: 'Ö',
  Uuml: 'Ü',
  deg: '°',
  frac12: '½',
  frac14: '¼',
  frac34: '¾',
};

function saubererText(roh: string): string {
  return roh
    .replace(/<[^>]*>/g, ' ')
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&([a-z]+);/gi, (ganz, name) => ENTITIES[name] ?? ganz)
    .replace(/\s+/g, ' ')
    .trim();
}

/* -------------------------------------------------------------------------- */
/* Mengen, Dauern                                                              */
/* -------------------------------------------------------------------------- */

const BRUECHE: Record<string, number> = {
  '½': 0.5,
  '¼': 0.25,
  '¾': 0.75,
  '⅓': 1 / 3,
  '⅔': 2 / 3,
};

/**
 * Woerter, die in Rezepten als Einheit gemeint sind. Ohne diese Liste wuerde
 * aus "1 rote Zwiebel" die Einheit "rote" – kurze Woerter sehen nun einmal
 * aus wie Einheiten.
 */
const WORT_EINHEITEN = new Set([
  'stück',
  'stk',
  'bund',
  'dose',
  'dosen',
  'packung',
  'pck',
  'päckchen',
  'becher',
  'glas',
  'gläser',
  'zehe',
  'zehen',
  'prise',
  'knolle',
  'blatt',
  'blätter',
  'zweig',
  'zweige',
  'scheibe',
  'scheiben',
  'stange',
  'stangen',
  'kopf',
  'tasse',
  'tassen',
  'msp',
  'portion',
  'portionen',
]);

/** Eine Zutatenzeile wie "500 g Halloumi" oder "4 Blätter Radicchio" zerlegen. */
export function parseIngredientLine(zeile: string): ImportedIngredient {
  const text = saubererText(zeile);
  if (!text) return { name: '', amount: null, unit: '' };

  // Bereiche wie "3 – 5" auf den unteren Wert bringen: lieber zu frueh
  // nachschauen als zu spaet.
  const ohneBereich = text.replace(
    /^(\d+(?:[.,]\d+)?)\s*[-–—]\s*\d+(?:[.,]\d+)?/,
    (_, erste) => erste,
  );

  const match = ohneBereich.match(/^([\d.,]+|[½¼¾⅓⅔])\s*([\p{L}]+\.?)?\s+(.+)$/u);
  if (!match) return { name: ohneBereich, amount: null, unit: '' };

  const [, mengeRoh, einheitRoh, restRoh] = match;
  const amount = BRUECHE[mengeRoh] ?? Number(mengeRoh.replace(',', '.'));
  if (!Number.isFinite(amount)) return { name: ohneBereich, amount: null, unit: '' };

  const einheit = (einheitRoh ?? '').trim();
  const rest = restRoh.trim();
  if (!einheit) return { name: rest, amount, unit: '' };

  const schluessel = einheit.toLowerCase().replace(/\.$/, '');
  const bekannt = unitInfo(einheit) !== null || WORT_EINHEITEN.has(schluessel);
  if (bekannt) return { name: rest, amount, unit: einheit };

  // Unbekanntes Wort gehoert zum Namen, nicht zur Einheit.
  return { name: `${einheit} ${rest}`.trim(), amount, unit: '' };
}

/**
 * Dauer aus einem Schritttext lesen, damit der Timer von selbst dasteht.
 *
 * Bei Bereichen ("3 – 5 Min.") gilt der untere Wert: ein Wecker, der zu frueh
 * klingelt, kostet einen Blick in die Pfanne – einer, der zu spaet klingelt,
 * das Essen.
 */
export function durationFromText(text: string): number | null {
  const treffer =
    /(\d+(?:[.,]\d+)?)\s*(?:[-–—]\s*\d+(?:[.,]\d+)?\s*)?(sekunden|sekunde|sek|minuten|minute|min|stunden|stunde|std)\b\.?/i.exec(
      text,
    );
  if (!treffer) return null;

  const wert = Number(treffer[1].replace(',', '.'));
  if (!Number.isFinite(wert) || wert <= 0) return null;

  const einheit = treffer[2].toLowerCase();
  if (einheit.startsWith('sek')) return Math.round(wert);
  if (einheit.startsWith('std') || einheit.startsWith('stunde')) return Math.round(wert * 3600);
  return Math.round(wert * 60);
}

/** ISO-8601-Dauer, wie sie in schema.org steht: "PT1H30M". */
function minutenAusIso(wert: unknown): number | null {
  if (typeof wert !== 'string') return null;
  const treffer = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(wert.trim());
  if (!treffer) return null;
  const [, tage, stunden, minuten, sekunden] = treffer;
  const gesamt =
    Number(tage ?? 0) * 1440 +
    Number(stunden ?? 0) * 60 +
    Number(minuten ?? 0) +
    Number(sekunden ?? 0) / 60;
  return gesamt > 0 ? Math.round(gesamt) : null;
}

/** Portionenzahl aus recipeYield, das mal Zahl, mal Text, mal Liste ist. */
function portionen(wert: unknown): number | null {
  const kandidaten = Array.isArray(wert) ? wert : [wert];
  for (const eintrag of kandidaten) {
    if (typeof eintrag === 'number' && eintrag > 0) return Math.round(eintrag);
    if (typeof eintrag !== 'string') continue;
    const zahl = /(\d+)/.exec(eintrag);
    if (zahl) {
      const n = Number(zahl[1]);
      if (n > 0 && n <= 99) return n;
    }
  }
  return null;
}

/* -------------------------------------------------------------------------- */
/* schema.org auslesen                                                         */
/* -------------------------------------------------------------------------- */

function istRezept(knoten: unknown): boolean {
  const typ = (knoten as { '@type'?: unknown })?.['@type'];
  if (typeof typ === 'string') return typ.toLowerCase() === 'recipe';
  if (Array.isArray(typ)) return typ.some((t) => String(t).toLowerCase() === 'recipe');
  return false;
}

/** Alle Knoten eines JSON-LD-Blocks durchgehen, auch verschachtelte. */
function sammleKnoten(wert: unknown, hinein: unknown[] = []): unknown[] {
  if (Array.isArray(wert)) {
    for (const eintrag of wert) sammleKnoten(eintrag, hinein);
    return hinein;
  }
  if (!wert || typeof wert !== 'object') return hinein;

  hinein.push(wert);
  const objekt = wert as Record<string, unknown>;
  // "@graph" ist der uebliche Sammelplatz; mehr muss nicht durchsucht werden.
  if (objekt['@graph']) sammleKnoten(objekt['@graph'], hinein);
  return hinein;
}

/** Schritte aus recipeInstructions holen – die Form unterscheidet sich je Seite. */
function schritte(wert: unknown): ImportedStep[] {
  const heraus: ImportedStep[] = [];

  const eintragen = (text: string) => {
    const sauber = saubererText(text);
    if (sauber.length < 2) return;
    heraus.push({ text: sauber, durationSec: durationFromText(sauber) });
  };

  const gehe = (eintrag: unknown) => {
    if (typeof eintrag === 'string') {
      // Manche Seiten legen alles in einen Text mit Zeilenumbruechen.
      for (const teil of eintrag.split(/\r?\n|(?<=\.)\s{2,}/)) eintragen(teil);
      return;
    }
    if (Array.isArray(eintrag)) {
      for (const teil of eintrag) gehe(teil);
      return;
    }
    if (!eintrag || typeof eintrag !== 'object') return;

    const objekt = eintrag as Record<string, unknown>;
    // HowToSection buendelt weitere Schritte.
    if (objekt.itemListElement) {
      gehe(objekt.itemListElement);
      return;
    }
    if (typeof objekt.text === 'string') eintragen(objekt.text);
    else if (typeof objekt.name === 'string') eintragen(objekt.name);
  };

  gehe(wert);
  return heraus;
}

/**
 * Ein Rezept aus dem Quelltext einer Seite lesen. `null`, wenn die Seite kein
 * schema.org-Rezept enthaelt.
 */
export function extractRecipe(html: string, quelle: string): ImportedRecipe | null {
  const bloecke = html.matchAll(
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  );

  for (const block of bloecke) {
    let daten: unknown;
    try {
      daten = JSON.parse(block[1].trim());
    } catch {
      continue;
    }

    const rezept = sammleKnoten(daten).find(istRezept) as Record<string, unknown> | undefined;
    if (!rezept) continue;

    const name = saubererText(String(rezept.name ?? ''));
    if (!name) continue;

    const zutaten = (Array.isArray(rezept.recipeIngredient) ? rezept.recipeIngredient : [])
      .filter((zeile): zeile is string => typeof zeile === 'string')
      .map(parseIngredientLine)
      .filter((zutat) => zutat.name.length > 0);

    const teilzeiten = (minutenAusIso(rezept.prepTime) ?? 0) + (minutenAusIso(rezept.cookTime) ?? 0);
    const zeit = minutenAusIso(rezept.totalTime) ?? (teilzeiten > 0 ? teilzeiten : null);

    return {
      name,
      servings: portionen(rezept.recipeYield),
      timeMin: zeit,
      ingredients: zutaten,
      steps: schritte(rezept.recipeInstructions),
      source: quelle,
    };
  }

  return null;
}
