/**
 * Englische Rezepte auf Deutsch – ohne KI.
 *
 * Solange die KI nicht erreichbar ist (keine Zahlungsangabe beim Anbieter,
 * kein Schluessel), bliebe ein englisches Rezept englisch. Dafuer gibt es
 * diesen Ersatzweg:
 *
 * 1. Masse werden metrisch: Tassen Mehl in Gramm, Unzen in Gramm, °F in °C,
 *    Inch in cm, Loeffel in EL und TL (lib/recipeImport).
 * 2. Bekannte Zutaten kommen aus dem Zutatenwissen ("garlic" → Knoblauch).
 * 3. Der Rest – Name, Schritte, unbekannte Zutaten – geht an MyMemory, einen
 *    freien Uebersetzungsdienst ohne Schluessel. Mit MYMEMORY_EMAIL in der
 *    Umgebung gilt ein groesseres Tageskontingent.
 *
 * Nur auf dem Server. Die Form ist dieselbe wie bei der KI (Uebersetzung):
 * gleich viele Eintraege, an denselben Stellen.
 */

import type { Uebersetzung } from './uebersetzen';
import { einheitenImText, parseIngredientLine, zutatenZeileAufDeutsch } from './recipeImport';
import { englischerName, zutatenName } from './zutaten';
import { ohneEszett } from './aufraeumen';

/** In den Tests zeigt MYMEMORY_URL ins Leere – dann gilt: kein Dienst erreichbar. */
const dienst = () => process.env.MYMEMORY_URL || 'https://api.mymemory.translated.net/get';
/** MyMemory nimmt hoechstens 500 Byte pro Anfrage. */
const MAX_BYTE = 450;
const GLEICHZEITIG = 4;

/** Ein Text in Stuecke an Satzgrenzen, keines laenger als MAX_BYTE. */
function stuecke(text: string): string[] {
  const saetze = text.match(/[^.!?]+[.!?]*\s*/g) ?? [text];
  const heraus: string[] = [];
  let aktuell = '';
  const passt = (teil: string) => new TextEncoder().encode(teil).length <= MAX_BYTE;
  for (const satz of saetze) {
    if (passt(aktuell + satz)) {
      aktuell += satz;
      continue;
    }
    if (aktuell.trim()) heraus.push(aktuell.trim());
    aktuell = '';
    // Ein einzelner Satz, der allein zu lang ist: an Kommas, sonst hart teilen.
    let rest = satz;
    while (!passt(rest)) {
      let schnitt = rest.lastIndexOf(', ', 300);
      if (schnitt < 50) schnitt = 300;
      heraus.push(rest.slice(0, schnitt + 1).trim());
      rest = rest.slice(schnitt + 1);
    }
    aktuell = rest;
  }
  if (aktuell.trim()) heraus.push(aktuell.trim());
  return heraus;
}

function entitaeten(text: string): string {
  return text
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

async function stueckUebersetzen(text: string): Promise<string> {
  const email = process.env.MYMEMORY_EMAIL;
  const url = `${dienst()}?q=${encodeURIComponent(text)}&langpair=en|de${email ? `&de=${encodeURIComponent(email)}` : ''}`;
  let antwort: Response;
  try {
    antwort = await fetch(url, { signal: AbortSignal.timeout(15_000), cache: 'no-store' });
  } catch {
    throw new Error('mt_unavailable');
  }
  if (antwort.status === 429) throw new Error('mt_quota');
  if (!antwort.ok) throw new Error('mt_unavailable');
  const daten = (await antwort.json().catch(() => null)) as {
    responseStatus?: number | string;
    quotaFinished?: boolean;
    responseData?: { translatedText?: string };
  } | null;
  if (!daten) throw new Error('mt_unavailable');
  if (daten.quotaFinished || Number(daten.responseStatus) === 429) throw new Error('mt_quota');
  const uebersetzt = String(daten.responseData?.translatedText ?? '').trim();
  if (Number(daten.responseStatus) !== 200 || !uebersetzt || /MYMEMORY WARNING|QUERY LENGTH LIMIT/i.test(uebersetzt)) {
    throw new Error('mt_unavailable');
  }
  return entitaeten(uebersetzt);
}

/** Mehrere Texte, je hoechstens GLEICHZEITIG Anfragen auf einmal. Gleiche Texte nur einmal. */
export async function maschinellUebersetzen(texte: string[]): Promise<string[]> {
  const einmalig = [...new Set(texte.map((text) => text.trim()).filter(Boolean))];
  const ergebnis = new Map<string, string>();
  const auftraege = einmalig.map((text) => async () => {
    const teile = stuecke(text);
    const uebersetzt: string[] = [];
    for (const teil of teile) uebersetzt.push(await stueckUebersetzen(teil));
    ergebnis.set(text, ohneEszett(uebersetzt.join(' ').replace(/\s+/g, ' ').trim()));
  });
  for (let i = 0; i < auftraege.length; i += GLEICHZEITIG) {
    await Promise.all(auftraege.slice(i, i + GLEICHZEITIG).map((auftrag) => auftrag()));
  }
  return texte.map((text) => ergebnis.get(text.trim()) ?? text);
}

/** "2 cups flour" → Menge, Einheit metrisch, Name noch englisch. */
function zutatVorbereiten(zeile: string): { amount: number | null; unit: string; name: string } {
  return parseIngredientLine(zutatenZeileAufDeutsch(zeile));
}

/** Eine Zutatenzeile wieder zusammensetzen, wie sie parseIngredientLine liest. */
function zeile(zutat: { amount: number | null; unit: string; name: string }): string {
  const menge = zutat.amount == null ? '' : String(Math.round(zutat.amount * 1000) / 1000);
  return [menge, zutat.unit, zutat.name].join(' ').replace(/\s+/g, ' ').trim();
}

/** Ein ganzes Rezept, in derselben Form wie bei der KI. */
export async function ohneKiUebersetzen(eingabe: Uebersetzung): Promise<Uebersetzung> {
  const zutaten = eingabe.zutaten.map(zutatVorbereiten);
  // Was das Zutatenwissen kennt, braucht keinen Dienst – solange kein Zusatz
  // dabeisteht ("butter, softened" geht ganz an den Dienst).
  const bekannt = zutaten.map((zutat) =>
    englischerName(zutat.name) && !/[,(]/.test(zutat.name) ? zutatenName(zutat.name, 'de', zutat.amount) : null,
  );

  const listen = ['schritte', 'vorbereitung', 'originalSchritte', 'originalVorbereitung'] as const;
  const texte: string[] = [
    eingabe.name,
    ...zutaten.map((zutat, i) => (bekannt[i] ? '' : zutat.name)),
    ...listen.flatMap((liste) => eingabe[liste].map(einheitenImText)),
  ];
  const deutsch = await maschinellUebersetzen(texte);

  let i = 0;
  const name = deutsch[i++] || eingabe.name;
  const zutatenDeutsch = zutaten.map((zutat, index) => {
    const uebersetzt = deutsch[i++];
    return zeile({ ...zutat, name: bekannt[index] ?? (uebersetzt || zutat.name) });
  });
  const heraus: Uebersetzung = { ...eingabe, name, zutaten: zutatenDeutsch };
  for (const liste of listen) {
    heraus[liste] = eingabe[liste].map(() => deutsch[i++]);
  }
  return heraus;
}
