/**
 * Lange Schritte kuerzer machen – ohne Modell.
 *
 * Rezeptseiten packen gern fuenf Saetze in einen Schritt und haengen Hinweise
 * auf ihren Artikel an. Im Kochmodus steht das in grosser Schrift und fuellt
 * den ganzen Bildschirm. Hier wird ein langer Schritt an seinen Satzgrenzen
 * in mehrere kurze geteilt, und Saetze, die nur auf die Webseite verweisen,
 * fallen weg. Umformuliert wird nichts: jeder Satz, der etwas zum Kochen
 * sagt, steht danach noch genau so da.
 *
 * Richtig umschreiben kann nur die KI (recipeAi.ts). Das hier ist, was ohne
 * sie geht – sofort, auf jedem Geraet, ohne Kosten.
 */

import type { Recipe, Step } from './types';
import { durationFromText } from './recipeImport';

/** Ab hier gilt ein Schritt als lang. */
export const LANGER_SCHRITT = 160;

/** So lang darf ein Teil werden, wenn er mehr als einen Satz hat. */
const TEIL_MAX = 140;

/** Woerter, nach deren Punkt kein neuer Satz anfaengt. Einzelne Buchstaben ("z. B.") ohnehin nicht. */
const ABKUERZUNGEN = new Set([
  'ca',
  'bzw',
  'evtl',
  'ggf',
  'usw',
  'etc',
  'inkl',
  'zzgl',
  'vgl',
  'bspw',
  'sog',
  'ungef',
  'min',
  'std',
  'sek',
  'max',
  'mind',
  'nr',
  'stk',
  'pkg',
  'pck',
  'msp',
  'tl',
  'el',
  'gr',
  'kl',
  'gestr',
  'geh',
]);

/** Satzende: Punkt, Ausrufe- oder Fragezeichen, dann Leerraum und ein Grossbuchstabe oder eine Zahl. */
const SATZGRENZE = /[.!?…]+["'»«“”)]*\s+(?=["'»«„“(]?[A-ZÄÖÜ0-9])/g;

/** Einen Schritt in Saetze zerlegen. Zeilenumbrueche trennen immer. */
export function saetze(text: string): string[] {
  const heraus: string[] = [];
  for (const roh of (text ?? '').split(/\n+/)) {
    const zeile = roh.replace(/\s+/g, ' ').trim();
    if (!zeile) continue;
    let start = 0;
    for (const treffer of zeile.matchAll(SATZGRENZE)) {
      const index = treffer.index ?? 0;
      const davor = zeile.slice(start, index);
      if (treffer[0].startsWith('.')) {
        const wort = /([A-Za-zÄÖÜäöüß]+)$/.exec(davor)?.[1] ?? '';
        if (wort.length === 1 || ABKUERZUNGEN.has(wort.toLowerCase())) continue;
        // "1. Den Teig ..." – eine Aufzaehlung, kein Satz
        if (/^\d+$/.test(davor.trim())) continue;
      }
      const ende = index + treffer[0].length;
      heraus.push(zeile.slice(start, ende).trim());
      start = ende;
    }
    const rest = zeile.slice(start).trim();
    if (rest) heraus.push(rest);
  }
  return heraus;
}

const VERWEISE: RegExp[] = [
  /\b(artikel|blogbeitrag|blogpost|blog|beitrag|video|rezeptvideo|newsletter|instagram|pinterest|youtube|tiktok|facebook|kommentar|kommentaren|kommentare|webseite|website|homepage|affiliate|werbung|rezeptkarte|link)\b/i,
  /\b(siehe|wie)\s+(oben|unten)\b/i,
  /\b(oben|unten)\s+(im\s+(text|artikel|beitrag)|beschrieben|erklärt|erwähnt|verlinkt|gezeigt|aufgeführt)\b/i,
  // \b kennt kein ß und kein é, deshalb das Ende von Hand
  /^(guten appetit|viel spa(ss|ß)|lasst es euch|lass es dir|en guete|bon app[ée]tit|enjoy)(?=[\s!.,]|$)/i,
];

/**
 * Ein Satz, der nur auf die Webseite verweist oder sich verabschiedet.
 * Steht eine Zahl darin, bleibt er: dann sagt er vermutlich doch etwas zum Kochen.
 */
export function istVerweis(satz: string): boolean {
  if (/\d/.test(satz)) return false;
  return VERWEISE.some((muster) => muster.test(satz));
}

/** Ob ein Schritt im Kochmodus zu viel auf einmal ist. */
export function istLang(text: string): boolean {
  return (text ?? '').length > LANGER_SCHRITT || saetze(text).length > 2;
}

/**
 * Einen Schritt in kurze Teile zerlegen. Kurze Schritte bleiben, wie sie
 * sind; ein Schritt, der nur aus Verweisen besteht, faellt ganz weg.
 */
export function schrittTeilen(text: string): string[] {
  const alle = saetze(text);
  const behalten = alle.filter((satz) => !istVerweis(satz));
  if (behalten.length === alle.length && (text ?? '').trim().length <= LANGER_SCHRITT) {
    return [text];
  }

  const teile: string[] = [];
  let aktuell = '';
  for (const satz of behalten) {
    if (aktuell && aktuell.length + 1 + satz.length <= TEIL_MAX) {
      aktuell += ` ${satz}`;
    } else {
      if (aktuell) teile.push(aktuell);
      aktuell = satz;
    }
  }
  if (aktuell) teile.push(aktuell);
  return teile;
}

/**
 * Alle Schritte eines Rezepts kuerzen. Gibt `null` zurueck, wenn nichts zu
 * kuerzen war.
 *
 * Der erste Teil eines geteilten Schritts behaelt dessen Id. Der Timer
 * wandert zu dem Teil, in dessen Text die Zeit steht; nennen mehrere Teile
 * eine Zeit, bekommt jeder seinen eigenen.
 */
export function schritteKuerzen(steps: Step[], neueId: () => string): Step[] | null {
  let geaendert = false;
  const heraus: Step[] = [];

  for (const step of steps ?? []) {
    const teile = schrittTeilen(step.text);
    if (teile.length === 1 && teile[0] === step.text) {
      heraus.push(step);
      continue;
    }
    geaendert = true;
    if (teile.length === 0) continue;

    const dauern = teile.map((teil) => (step.durationSec == null ? null : durationFromText(teil)));
    if (step.durationSec != null && !dauern.includes(step.durationSec)) {
      const mitZeit = dauern.findIndex((dauer) => dauer != null);
      dauern[mitZeit >= 0 ? mitZeit : dauern.length - 1] = step.durationSec;
    }
    teile.forEach((text, index) => {
      heraus.push({ id: index === 0 ? step.id : neueId(), text, durationSec: dauern[index] });
    });
  }

  // Bliebe gar nichts uebrig, ist an der Erkennung etwas falsch – dann lieber nichts tun.
  if (!geaendert || heraus.length === 0) return null;
  return heraus;
}

/**
 * Ob die KI an diesem Rezept noch etwas verbessern kann: es wurde nur nach
 * Regeln gekuerzt, war urspruenglich lang (oder ist es noch), und die KI hat
 * es nicht schon einmal vergeblich versucht.
 */
export function brauchtKi(recipe: Recipe): boolean {
  if (recipe.deleted || recipe.kuerzung !== 'regeln' || recipe.kiVersuch) return false;
  if (recipe.vorKuerzen?.steps?.length) return true;
  return (recipe.steps ?? []).some((step) => istLang(step.text));
}
