/**
 * Rezepte aus einer Webseite lesen.
 *
 * Die allermeisten Rezeptseiten legen ihre Daten als schema.org-Rezept im
 * Quelltext ab – dasselbe, woraus Google seine Rezeptkarten baut. Damit geht
 * das Einlesen ohne Modell, ohne Schluessel und ohne Kosten. Gelesen wird in
 * dieser Reihenfolge, und was einer Quelle fehlt, fuellt die naechste:
 *
 * 1. JSON-LD: ein Recipe-Objekt, auch verschachtelt; daneben ein HowTo, das
 *    manche Seiten fuer die Schritte ausliefern.
 * 2. Microdata: dieselben Felder als Attribute direkt im HTML (Swissmilk).
 * 3. Die Seite selbst: Listen unter Ueberschriften wie "Zutaten" und
 *    "Zubereitung" – fuer Blogs ohne strukturierte Daten.
 *
 * Bleibt danach nichts, kann die Route noch die KI fragen (recipeAi.ts).
 *
 * Dieses Modul rechnet nur; es holt nichts aus dem Netz. Das macht die Route.
 */

import { WORT_EINHEITEN, canonicalUnit, unitInfo } from './units';
import { Knoten, finde, leseHtml, rohtext } from './htmlBaum';

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
  /**
   * Wie es gelesen wurde, wenn nicht aus strukturierten Daten: `seite` aus
   * Ueberschriften wie "Zutaten" und "Zubereitung", `ki` vom Modell. Dann
   * lohnt sich ein pruefender Blick.
   */
  herkunft?: 'seite' | 'ki';
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
  if (bekannt) return { name: rest, amount, unit: canonicalUnit(einheit) };

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

/** ISO-8601-Dauer, wie sie in schema.org steht: "PT1H30M". Manche Seiten schreiben nur Minuten. */
function minutenAusIso(wert: unknown): number | null {
  if (typeof wert === 'number') return wert > 0 && wert < 10_000 ? Math.round(wert) : null;
  if (typeof wert !== 'string') return null;
  const nurZahl = /^\s*(\d+)\s*$/.exec(wert);
  if (nurZahl) return minutenAusIso(Number(nurZahl[1]));
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
/* Zutaten in Gruppen                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Ob eine Zeile eine Gruppe ankuendigt: "Teig:", "Für den Guss",
 * "Zutaten für die Sauce:". Liefert den Namen der Gruppe, `null` fuer eine
 * allgemeine Ueberschrift ("Zutaten", "Für 4 Personen"), die eine laufende
 * Gruppe beendet – und `undefined`, wenn die Zeile gar keine Gruppe ist.
 */
export function gruppenTitel(roh: string): string | null | undefined {
  const text = saubererText(roh);
  if (!text || text.length > 40) return undefined;
  const doppelpunkt = /:\s*$/.test(text);
  const fuer = /^(zutaten\s+)?für\s/i.test(text);
  if (!doppelpunkt && !fuer) return undefined;

  const kern = text
    .replace(/:\s*$/, '')
    .replace(/^(zutaten\s+)?für\s+((den|die|das|einen|eine|ein)\s+)?/i, '')
    .trim();
  if (!kern || /zutat|\d|portion|person|stück/i.test(kern)) return null;
  if (!/^\p{L}[\p{L}\s&/-]*$/u.test(kern) || kern.split(/\s+/).length > 4) return undefined;
  return kern[0].toUpperCase() + kern.slice(1);
}

/**
 * Die Gruppe an den Namen haengen: "Milch (Guss)". So unterscheidet die App
 * die Milch fuer den Teig von der fuer den Guss, und ein Schritt "Guss: alle
 * Zutaten verruehren" findet genau seine. Auf der Einkaufsliste zaehlt die
 * Klammer nicht – dort ist es einfach Milch.
 */
function mitGruppe(zutat: ImportedIngredient, gruppe: string | null): ImportedIngredient {
  if (!gruppe || zutat.name.toLowerCase().includes(gruppe.toLowerCase())) return zutat;
  const name = zutat.name.endsWith(')')
    ? zutat.name.replace(/\)$/, `, ${gruppe})`)
    : `${zutat.name} (${gruppe})`;
  return { ...zutat, name };
}

/** "(oder Fertig-Butterkuchenteig)": ein Hinweis zur Zeile davor, keine eigene Zutat. */
function nurHinweis(zutat: ImportedIngredient): boolean {
  return zutat.amount == null && /^\(.*\)$/.test(zutat.name.trim());
}

/** Zutatenzeilen lesen; Zeilen wie "Für den Teig:" werden zur Gruppe der folgenden. */
export function zutatenAusZeilen(zeilen: string[]): ImportedIngredient[] {
  const heraus: ImportedIngredient[] = [];
  let gruppe: string | null = null;
  for (const zeile of zeilen) {
    const zutat = parseIngredientLine(zeile);
    if (!zutat.name || nurHinweis(zutat)) continue;
    if (zutat.amount == null) {
      const titel = gruppenTitel(zeile);
      if (titel !== undefined) {
        gruppe = titel;
        continue;
      }
    }
    heraus.push(mitGruppe(zutat, gruppe));
  }
  return heraus;
}

/* -------------------------------------------------------------------------- */
/* Schritte                                                                    */
/* -------------------------------------------------------------------------- */

function schrittAusText(text: string): ImportedStep | null {
  // "1. Als Erstes …", "Schritt 2: …" – die Nummer zeigt die App selbst.
  const sauber = saubererText(text).replace(/^(schritt\s*)?\d{1,2}\s*[.:)]\s+/i, '');
  if (sauber.length < 2) return null;
  return { text: sauber, durationSec: durationFromText(sauber) };
}

/** Schritte aus HTML-Text: Listenpunkte, sonst Absaetze, sonst Zeilen. */
function schritteAusHtml(html: string): ImportedStep[] {
  const baum = leseHtml(html);
  const punkte = finde(baum, (k) => k.tag === 'li');
  const absaetze = finde(baum, (k) => k.tag === 'p');
  const teile = punkte.length ? punkte.map(rohtext) : absaetze.length > 1 ? absaetze.map(rohtext) : rohtext(baum).split(/\n+/);
  return teile.map(schrittAusText).filter((schritt): schritt is ImportedStep => schritt !== null);
}

/** Schritte aus recipeInstructions holen – die Form unterscheidet sich je Seite. */
function schritte(wert: unknown): ImportedStep[] {
  const heraus: ImportedStep[] = [];

  const gehe = (eintrag: unknown) => {
    if (typeof eintrag === 'string') {
      if (/<(li|p|br|ol|ul)\b/i.test(eintrag)) {
        heraus.push(...schritteAusHtml(eintrag));
        return;
      }
      // Manche Seiten legen alles in einen Text mit Zeilenumbruechen.
      for (const teil of eintrag.split(/\r?\n|(?<=\.)\s{2,}/)) {
        const schritt = schrittAusText(teil);
        if (schritt) heraus.push(schritt);
      }
      return;
    }
    if (Array.isArray(eintrag)) {
      for (const teil of eintrag) gehe(teil);
      return;
    }
    if (!eintrag || typeof eintrag !== 'object') return;

    const objekt = eintrag as Record<string, unknown>;
    // HowToSection buendelt weitere Schritte, ein HowToStep manchmal seine Anweisung.
    if (objekt.itemListElement) {
      gehe(objekt.itemListElement);
      return;
    }
    if (typeof objekt.text === 'string') gehe(objekt.text);
    else if (typeof objekt.name === 'string') gehe(objekt.name);
  };

  gehe(wert);
  return heraus;
}

/* -------------------------------------------------------------------------- */
/* 1. JSON-LD                                                                  */
/* -------------------------------------------------------------------------- */

/** Ein Teilergebnis aus einer Quelle; was fehlt, ergaenzt die naechste. */
interface Teil {
  name: string;
  servings: number | null;
  timeMin: number | null;
  ingredients: ImportedIngredient[];
  steps: ImportedStep[];
}

function typIst(knoten: unknown, gesucht: string): boolean {
  const typ = (knoten as { '@type'?: unknown })?.['@type'];
  const typen = Array.isArray(typ) ? typ : [typ];
  // "Recipe", "schema:Recipe", "http://schema.org/Recipe"
  return typen.some((t) => typeof t === 'string' && t.toLowerCase().replace(/^.*[/:]/, '') === gesucht);
}

/** Alle Objekte eines JSON-LD-Blocks, auch tief verschachtelte (mainEntity, @graph, hasPart …). */
function sammleKnoten(wert: unknown, hinein: unknown[] = [], tiefe = 0): unknown[] {
  if (tiefe > 8 || !wert || typeof wert !== 'object') return hinein;
  if (Array.isArray(wert)) {
    for (const eintrag of wert) sammleKnoten(eintrag, hinein, tiefe + 1);
    return hinein;
  }
  hinein.push(wert);
  for (const kind of Object.values(wert as Record<string, unknown>)) {
    if (kind && typeof kind === 'object') sammleKnoten(kind, hinein, tiefe + 1);
  }
  return hinein;
}

function jsonBloecke(html: string): unknown[] {
  const heraus: unknown[] = [];
  const bloecke = html.matchAll(
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  );
  for (const block of bloecke) {
    const roh = block[1].trim().replace(/^<!--|-->$/g, '');
    try {
      heraus.push(JSON.parse(roh));
    } catch {
      // Haeufigster Fehler: echte Zeilenumbrueche in Texten.
      try {
        heraus.push(JSON.parse(roh.replace(/[\u0000-\u001f]+/g, ' ')));
      } catch {
        /* nicht zu retten */
      }
    }
  }
  return heraus;
}

function ausJsonLd(html: string): Teil[] {
  const knoten = jsonBloecke(html).flatMap((block) => sammleKnoten(block));
  const heraus: Teil[] = [];

  for (const rezept of knoten.filter((k) => typIst(k, 'recipe')) as Array<Record<string, unknown>>) {
    const zeilen = Array.isArray(rezept.recipeIngredient)
      ? rezept.recipeIngredient
      : Array.isArray(rezept.ingredients)
        ? rezept.ingredients
        : typeof rezept.recipeIngredient === 'string'
          ? [rezept.recipeIngredient]
          : [];
    const teilzeiten = (minutenAusIso(rezept.prepTime) ?? 0) + (minutenAusIso(rezept.cookTime) ?? 0);
    heraus.push({
      name: saubererText(String(rezept.name ?? rezept.headline ?? '')),
      servings: portionen(rezept.recipeYield ?? rezept.yield),
      timeMin: minutenAusIso(rezept.totalTime) ?? (teilzeiten > 0 ? teilzeiten : null),
      ingredients: zutatenAusZeilen(zeilen.filter((zeile): zeile is string => typeof zeile === 'string')),
      steps: schritte(rezept.recipeInstructions),
    });
  }

  // Ein HowTo traegt nur Schritte – Swissmilk liefert die Zutaten als Microdata.
  for (const anleitung of knoten.filter((k) => typIst(k, 'howto')) as Array<Record<string, unknown>>) {
    heraus.push({
      name: saubererText(String(anleitung.name ?? '')),
      servings: null,
      timeMin: minutenAusIso(anleitung.totalTime),
      ingredients: [],
      steps: schritte(anleitung.step ?? anleitung.steps),
    });
  }
  return heraus;
}

/* -------------------------------------------------------------------------- */
/* 2. Microdata                                                                */
/* -------------------------------------------------------------------------- */

function propsVon(knoten: Knoten): string[] {
  return (knoten.attrs.itemprop ?? '').toLowerCase().split(/\s+/).filter(Boolean);
}

function istScope(knoten: Knoten): boolean {
  return 'itemscope' in knoten.attrs;
}

/** Die itemprop-Elemente, die direkt zu diesem Scope gehoeren, in Dokumentreihenfolge. */
function eigeneProps(scope: Knoten): Array<{ name: string; knoten: Knoten }> {
  const heraus: Array<{ name: string; knoten: Knoten }> = [];
  const gehe = (knoten: Knoten) => {
    for (const kind of knoten.kinder) {
      if (kind.tag === '#text') continue;
      for (const name of propsVon(kind)) heraus.push({ name, knoten: kind });
      if (!istScope(kind)) gehe(kind);
    }
  };
  gehe(scope);
  return heraus;
}

function propWert(knoten: Knoten): string {
  if (knoten.attrs.content != null) return knoten.attrs.content;
  if (knoten.tag === 'time' && knoten.attrs.datetime) return knoten.attrs.datetime;
  return rohtext(knoten);
}

/** Inline-Elemente, die eine Gruppen-Ueberschrift umschliessen duerfen. */
const INLINE = new Set(['b', 'strong', 'em', 'i', 'span', 'u', 'small']);

function nurText(knoten: Knoten): boolean {
  return knoten.kinder.every((kind) => kind.tag === '#text' || (INLINE.has(kind.tag) && nurText(kind)));
}

/**
 * Zutaten eines Microdata-Rezepts, mit ihren Gruppen. Die Gruppentitel stehen
 * nicht in den Daten, sondern als Text zwischen den Zutaten ("Teig:").
 */
function microdataZutaten(scope: Knoten): ImportedIngredient[] {
  const heraus: ImportedIngredient[] = [];
  let gruppe: string | null = null;
  let angekuendigt: string | null | undefined;

  const gehe = (knoten: Knoten) => {
    for (const kind of knoten.kinder) {
      if (kind.tag === '#text') continue;
      const props = propsVon(kind);
      if (props.includes('recipeingredient') || props.includes('ingredients')) {
        if (angekuendigt !== undefined) {
          gruppe = angekuendigt;
          angekuendigt = undefined;
        }
        const zutat = parseIngredientLine(propWert(kind));
        if (zutat.name && !nurHinweis(zutat)) heraus.push(mitGruppe(zutat, gruppe));
        continue;
      }
      if (props.length === 0 && nurText(kind)) {
        const titel = gruppenTitel(rohtext(kind));
        if (titel !== undefined) angekuendigt = titel;
        continue;
      }
      if (!istScope(kind) || props.length === 0) gehe(kind);
    }
  };
  gehe(scope);
  return heraus;
}

function microdataSchritte(elemente: Knoten[]): ImportedStep[] {
  const heraus: ImportedStep[] = [];
  for (const element of elemente) {
    const texte = finde(element, (k) => propsVon(k).includes('text'));
    const punkte = texte.length ? texte : finde(element, (k) => k.tag === 'li');
    const teile = punkte.length ? punkte.map(propWert) : [propWert(element)];
    for (const teil of teile) {
      const schritt = schrittAusText(teil);
      if (schritt) heraus.push(schritt);
    }
  }
  return heraus;
}

function ausMicrodata(baum: Knoten): Teil[] {
  const scopes = finde(
    baum,
    (k) => istScope(k) && /schema\.org\/recipe$/i.test((k.attrs.itemtype ?? '').trim()),
  );
  return scopes.map((scope) => {
    const props = eigeneProps(scope);
    const erster = (name: string) => props.find((p) => p.name === name)?.knoten;
    const wert = (name: string) => {
      const knoten = erster(name);
      return knoten ? saubererText(propWert(knoten)) : '';
    };
    const teilzeiten = (minutenAusIso(wert('preptime')) ?? 0) + (minutenAusIso(wert('cooktime')) ?? 0);
    return {
      name: wert('name'),
      servings: portionen(wert('recipeyield')),
      timeMin: minutenAusIso(wert('totaltime')) ?? (teilzeiten > 0 ? teilzeiten : null),
      ingredients: microdataZutaten(scope),
      steps: microdataSchritte(
        props.filter((p) => p.name === 'recipeinstructions').map((p) => p.knoten),
      ),
    };
  });
}

/* -------------------------------------------------------------------------- */
/* 3. Die Seite selbst                                                         */
/* -------------------------------------------------------------------------- */

const ZUTATEN_TITEL =
  /^(die\s+)?(zutaten|zutatenliste|einkaufsliste|das brauchst du|du brauchst|was du brauchst|ingredients?)\b/i;
const SCHRITTE_TITEL =
  /^(die\s+)?(zubereitung|zubereitungsschritte|so geht'?s|so geht es|und so geht'?s|so wird'?s gemacht|anleitung|schritt für schritt|instructions?|directions?|method|preparation)\b/i;

/** Was auf einer Seite nicht zum Rezept gehoert. */
const RAHMEN = new Set(['nav', 'header', 'footer', 'aside', 'form', 'button', 'select', 'dialog']);

type Ereignis =
  | { art: 'titel'; ebene: number; text: string }
  | { art: 'punkt'; text: string }
  | { art: 'absatz'; text: string };

/** Die Seite als Folge von Ueberschriften, Listenpunkten und Absaetzen. */
function ereignisse(baum: Knoten): Ereignis[] {
  const heraus: Ereignis[] = [];
  const gehe = (knoten: Knoten) => {
    for (const kind of knoten.kinder) {
      if (kind.tag === '#text' || RAHMEN.has(kind.tag)) continue;
      const ebene = /^h([1-6])$/.exec(kind.tag)?.[1];
      if (ebene) {
        heraus.push({ art: 'titel', ebene: Number(ebene), text: saubererText(rohtext(kind)) });
      } else if (kind.tag === 'li' || kind.tag === 'tr') {
        heraus.push({ art: 'punkt', text: saubererText(rohtext(kind)) });
      } else if (kind.tag === 'p') {
        heraus.push({ art: 'absatz', text: saubererText(rohtext(kind)) });
      } else {
        gehe(kind);
      }
    }
  };
  gehe(baum);
  return heraus.filter((ereignis) => ereignis.text.length > 0);
}

/** Was unter einer Ueberschrift steht, bis zur naechsten gleich hohen oder hoeheren. */
function abschnitt(alle: Ereignis[], start: number): Ereignis[] {
  const kopf = alle[start] as { ebene: number };
  const heraus: Ereignis[] = [];
  for (let i = start + 1; i < alle.length; i++) {
    const ereignis = alle[i];
    if (ereignis.art === 'titel') {
      if (ereignis.ebene <= kopf.ebene) break;
      if (ZUTATEN_TITEL.test(ereignis.text) || SCHRITTE_TITEL.test(ereignis.text)) break;
    }
    heraus.push(ereignis);
  }
  return heraus;
}

/** Der Name des Gerichts, wenn die Daten keinen nennen: Hauptueberschrift, sonst Seitentitel. */
function seitenTitel(baum: Knoten, html: string): string {
  const h1 = finde(baum, (k) => k.tag === 'h1').map((k) => saubererText(rohtext(k))).find(Boolean);
  const og = /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i.exec(html)?.[1];
  const titel = /<title[^>]*>([^<]+)<\/title>/i.exec(html)?.[1]?.split(/\s[|–-]\s/)[0];
  return saubererText(h1 || og || titel || '');
}

function ausDerSeite(baum: Knoten): Teil | null {
  const alle = ereignisse(baum);

  let zutaten: ImportedIngredient[] = [];
  let servings: number | null = null;
  for (let i = 0; i < alle.length && zutaten.length < 2; i++) {
    const kopf = alle[i];
    if (kopf.art !== 'titel' || !ZUTATEN_TITEL.test(kopf.text)) continue;
    const inhalt = abschnitt(alle, i);
    const zeilen: string[] = [];
    for (const ereignis of inhalt) {
      if (ereignis.art === 'punkt') zeilen.push(ereignis.text);
      // Unterueberschriften wie "Für den Teig" werden zu Gruppen.
      else if (ereignis.art === 'titel') zeilen.push(/:$/.test(ereignis.text) ? ereignis.text : `${ereignis.text}:`);
      else if (/:$/.test(ereignis.text) && ereignis.text.length <= 40) zeilen.push(ereignis.text);
    }
    zutaten = zutatenAusZeilen(zeilen);
    const portionenText = [kopf.text, ...inhalt.slice(0, 2).map((e) => e.text)].find((text) =>
      /\d+\s*(portionen|personen|stück|stk)/i.test(text),
    );
    servings = portionenText ? portionen(/(\d+)\s*(portionen|personen|stück|stk)/i.exec(portionenText)?.[1]) : null;
  }

  let steps: ImportedStep[] = [];
  for (let i = 0; i < alle.length && steps.length === 0; i++) {
    const kopf = alle[i];
    if (kopf.art !== 'titel' || !SCHRITTE_TITEL.test(kopf.text)) continue;
    const inhalt = abschnitt(alle, i);
    const punkte = inhalt.filter((e) => e.art === 'punkt');
    const quelle = punkte.length ? punkte : inhalt.filter((e) => e.art === 'absatz' && e.text.length >= 15);
    steps = quelle.map((e) => schrittAusText(e.text)).filter((s): s is ImportedStep => s !== null);
  }

  if (zutaten.length < 2) zutaten = [];
  if (zutaten.length === 0 && steps.length === 0) return null;

  return {
    name: '',
    servings,
    timeMin: null,
    ingredients: zutaten,
    steps,
  };
}

/* -------------------------------------------------------------------------- */
/* Zusammenfuehren                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Ein Rezept aus dem Quelltext einer Seite lesen. `null`, wenn sich weder
 * Zutaten noch Schritte finden.
 */
export function extractRecipe(html: string, quelle: string): ImportedRecipe | null {
  const baum = leseHtml(html);
  const strukturiert = [...ausJsonLd(html), ...ausMicrodata(baum)];

  // Ein vollstaendiges Rezept aus einer Quelle geht vor; sonst Stueck fuer Stueck.
  const ganz = strukturiert.find((teil) => teil.name && teil.ingredients.length && teil.steps.length);
  const teile = ganz ? [ganz, ...strukturiert] : strukturiert;

  const hatZutaten = teile.some((teil) => teil.ingredients.length);
  const hatSchritte = teile.some((teil) => teil.steps.length);
  const seite = !hatZutaten || !hatSchritte ? ausDerSeite(baum) : null;
  // Steht gar nichts in Rezeptdaten, muss die Seite beides liefern – sonst
  // ist es eher eine Uebersicht mit einer Liste darauf.
  const seiteGenuegt = seite && (hatZutaten || hatSchritte || (seite.ingredients.length && seite.steps.length));
  if (seite && seiteGenuegt) teile.push(seite);

  const ingredients = teile.find((teil) => teil.ingredients.length)?.ingredients ?? [];
  const steps = teile.find((teil) => teil.steps.length)?.steps ?? [];
  if (ingredients.length === 0 && steps.length === 0) return null;
  // "Kürbis-Lasagne Rezept" – dass es ein Rezept ist, weiss man.
  const name = (teile.find((teil) => teil.name)?.name || seitenTitel(baum, html))
    .replace(/\s*[-–|:]?\s*rezept$/i, '')
    .trim();
  if (!name) return null;
  const herkunft: ImportedRecipe['herkunft'] =
    seite && (ingredients === seite.ingredients || steps === seite.steps) ? 'seite' : undefined;

  return {
    name,
    servings: teile.find((teil) => teil.servings != null)?.servings ?? null,
    timeMin: teile.find((teil) => teil.timeMin != null)?.timeMin ?? null,
    ingredients,
    steps,
    source: quelle,
    ...(herkunft ? { herkunft } : {}),
  };
}

/* -------------------------------------------------------------------------- */
/* Eingefuegter Text                                                           */
/* -------------------------------------------------------------------------- */

/** Wo nach den Schritten nichts mehr zum Rezept gehoert. */
const ENDE_TITEL =
  /^(tipps?|hinweis|nährwerte|naehrwerte|kommentare?|bewertungen?|das könnte dich auch interessieren|weitere rezepte|ähnliche rezepte|guten appetit|viel spass|viel spaß)\b/i;

function titelZeile(zeile: string, muster: RegExp): boolean {
  return zeile.length <= 60 && muster.test(zeile.replace(/^[#*\s]+/, ''));
}

/** Beginnt mit einer Menge: "200 g", "½ TL", "2–3". */
const MIT_MENGE = /^([\d½¼¾⅓⅔]|ca\.?\s*\d|eine?\s|etwas\s|1\/2)/i;

/**
 * Ein Rezept aus kopiertem Text lesen – fuer Seiten, die den Abruf vom Server
 * sperren, und fuer Rezepte aus Nachrichten oder Notizen. Erkannt werden die
 * Ueberschriften "Zutaten" und "Zubereitung"; fehlen sie, gelten Zeilen mit
 * einer Menge vorne als Zutaten und laengere Zeilen danach als Schritte.
 */
export function ausEingefuegtemText(text: string, quelle = ''): ImportedRecipe | null {
  const zeilen = (text ?? '')
    .split(/\r?\n/)
    .map((zeile) => zeile.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  if (zeilen.length < 3) return null;

  let zutatenZeilen: string[] = [];
  let schrittZeilen: string[] = [];
  let servings: number | null = null;
  let nameVor = 0;

  const zi = zeilen.findIndex((zeile) => titelZeile(zeile, ZUTATEN_TITEL));
  const si = zeilen.findIndex((zeile, i) => i > zi && titelZeile(zeile, SCHRITTE_TITEL));
  if (zi >= 0 && si > zi) {
    zutatenZeilen = zeilen.slice(zi + 1, si);
    const ende = zeilen.findIndex((zeile, i) => i > si && titelZeile(zeile, ENDE_TITEL));
    schrittZeilen = zeilen.slice(si + 1, ende > si ? ende : undefined);
    servings = portionen(/(\d+)\s*(portionen|personen|stück|stk)/i.exec(zeilen[zi])?.[1]);
    nameVor = zi;
  } else {
    // Ohne Ueberschriften: der erste Block mit Mengen vorne sind die Zutaten.
    const start = zeilen.findIndex((zeile) => MIT_MENGE.test(zeile));
    if (start < 0) return null;
    let ende = start;
    while (ende < zeilen.length && (MIT_MENGE.test(zeilen[ende]) || zeilen[ende].length <= 40)) ende++;
    zutatenZeilen = zeilen.slice(start, ende);
    schrittZeilen = zeilen.slice(ende).filter((zeile) => zeile.length >= 25);
    nameVor = start;
  }

  const ingredients = zutatenAusZeilen(
    zutatenZeilen.map((zeile) => zeile.replace(/^[-•*–·]\s*/, '')).filter((zeile) => zeile.length <= 120),
  );
  const steps = schrittZeilen
    // Eine Nummer allein auf der Zeile ("1", "Schritt 2") ist keine Anweisung.
    .filter((zeile) => !/^(schritt\s*)?\d{1,2}[.:)]?$/i.test(zeile))
    .map((zeile) => schrittAusText(zeile.replace(/^[-•*–·]\s*/, '')))
    .filter((schritt): schritt is ImportedStep => schritt !== null);
  if (ingredients.length < 2 || steps.length === 0) return null;

  // Der Name steht ueber den Zutaten: die letzte kurze Zeile davor, die
  // nicht nach Angabe aussieht ("Portionen: 4", "Werbung" weiter oben).
  const name =
    zeilen
      .slice(0, nameVor)
      .reverse()
      .find((zeile) => zeile.length >= 3 && zeile.length <= 60 && !/[\d:]/.test(zeile)) ?? '';

  return {
    name: saubererText(name).replace(/\s*[-–|:]?\s*rezept$/i, ''),
    servings,
    timeMin: null,
    ingredients,
    steps,
    source: quelle,
    herkunft: 'seite',
  };
}

/**
 * Der lesbare Text einer Seite, fuer die KI: ohne Navigation, Kopf- und
 * Fusszeile, Skripte. Bevorzugt der Hauptinhalt (main, article).
 */
export function seitentext(html: string, maxZeichen = 30_000): string {
  const baum = leseHtml(html);
  const haupt =
    finde(baum, (k) => k.tag === 'main')[0] ??
    finde(baum, (k) => k.tag === 'article')[0] ??
    finde(baum, (k) => k.tag === 'body')[0] ??
    baum;
  const ohneRahmen = (knoten: Knoten): string => {
    if (knoten.tag === '#text') return knoten.text ?? '';
    if (RAHMEN.has(knoten.tag)) return '';
    if (knoten.tag === 'br') return '\n';
    const innen = knoten.kinder.map(ohneRahmen).join('');
    return /^(p|div|li|tr|h[1-6]|section|article|ul|ol|table|dt|dd)$/.test(knoten.tag) ? `\n${innen}\n` : innen;
  };
  return ohneRahmen(haupt)
    .split('\n')
    .map((zeile) => saubererText(zeile))
    .filter(Boolean)
    .join('\n')
    .slice(0, maxZeichen);
}
