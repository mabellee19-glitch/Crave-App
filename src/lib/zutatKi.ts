/**
 * Was die KI ueber Zutaten gesagt hat, die die App nicht selbst kennt.
 *
 * Fragt man nach "Kimchi", kommt Menge, Einheit, Abteilung und der Name in
 * beiden Sprachen zurueck (/api/einheiten). Die Antwort bleibt auf dem Geraet
 * gespeichert: dieselbe Zutat kostet nur einmal eine Anfrage, und die
 * Einkaufsliste nutzt sie mit.
 *
 * Fehlt der Zugang zur KI (keine Zahlungsangabe, kein Schluessel), wird in
 * dieser Sitzung nicht weiter gefragt.
 */

import { Abteilung, Vorschlag, norm } from './zutaten';

export interface Gelernt {
  vorschlaege: Vorschlag[];
  abteilung: Abteilung;
  de: string;
  en: string;
}

const SPEICHER = 'crave:zutaten-ki';
const MAX_EINTRAEGE = 400;

let wissen: Record<string, Gelernt | null> | null = null;
let gesperrt = false;
const laufend = new Map<string, Promise<Gelernt | null>>();
const zuhoerer = new Set<() => void>();
let stand = 0;

function schluessel(name: string): string {
  return norm(name.replace(/\(.*?\)/g, ' ').split(',')[0]).trim();
}

function geladen(): Record<string, Gelernt | null> {
  if (wissen) return wissen;
  wissen = {};
  try {
    const roh = window.localStorage.getItem(SPEICHER);
    if (roh) wissen = JSON.parse(roh) ?? {};
  } catch {
    /* privater Modus oder kaputter Eintrag – dann eben leer */
  }
  return wissen!;
}

function speichern() {
  const alles = geladen();
  const namen = Object.keys(alles);
  if (namen.length > MAX_EINTRAEGE) {
    for (const name of namen.slice(0, namen.length - MAX_EINTRAEGE)) delete alles[name];
  }
  try {
    window.localStorage.setItem(SPEICHER, JSON.stringify(alles));
  } catch {
    /* voll oder gesperrt – es bleibt im Speicher dieser Sitzung */
  }
}

/** `undefined`: noch nie gefragt. `null`: gefragt, keine Zutat. */
export function gelernt(name: string): Gelernt | null | undefined {
  if (typeof window === 'undefined') return undefined;
  const key = schluessel(name);
  if (!key) return undefined;
  return geladen()[key];
}

/** Fuer useSyncExternalStore: zeichnet neu, sobald etwas dazugelernt wurde. */
export function abonnieren(zuhoeren: () => void): () => void {
  zuhoerer.add(zuhoeren);
  return () => zuhoerer.delete(zuhoeren);
}

export function lernstand(): number {
  return stand;
}

/** Die KI fragen – einmal pro Zutat und nur, solange der Zugang da ist. */
export function zutatLernen(name: string): Promise<Gelernt | null> {
  const key = schluessel(name);
  if (!key || key.length < 3 || gesperrt) return Promise.resolve(null);
  const bekannt = gelernt(name);
  if (bekannt !== undefined) return Promise.resolve(bekannt);
  const offen = laufend.get(key);
  if (offen) return offen;

  const anfrage = (async () => {
    try {
      const antwort = await fetch('/api/einheiten', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ zutat: name.trim().slice(0, 80) }),
      });
      const daten = await antwort.json().catch(() => null);
      if (!antwort.ok || !daten?.ok) {
        // Kein Zugang: in dieser Sitzung nicht mehr fragen. Ein Fehler beim
        // Rezept selbst ("keine Zutat") wird gemerkt wie eine Antwort.
        if (daten?.error === 'no_result' || daten?.error === 'refused') {
          geladen()[key] = null;
          speichern();
        } else {
          gesperrt = true;
        }
        return null;
      }
      const ergebnis: Gelernt | null = daten.vorschlaege?.length
        ? {
            vorschlaege: daten.vorschlaege,
            abteilung: daten.abteilung ?? 'weitere',
            de: daten.de ?? '',
            en: daten.en ?? '',
          }
        : null;
      geladen()[key] = ergebnis;
      speichern();
      stand += 1;
      for (const zuhoeren of zuhoerer) zuhoeren();
      return ergebnis;
    } catch {
      return null; // keine Verbindung – beim naechsten Mal wieder
    } finally {
      laufend.delete(key);
    }
  })();
  laufend.set(key, anfrage);
  return anfrage;
}

/** Nur fuer Tests: den Zustand zuruecksetzen. */
export function _zuruecksetzen() {
  wissen = null;
  gesperrt = false;
  laufend.clear();
}
