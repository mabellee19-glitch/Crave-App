'use client';

/**
 * Deutsch oder Englisch – die Wahl gilt fuer dieses Geraet.
 *
 * Die Texte der Oberflaeche stehen in lib/texte.ts, einmal pro Sprache. Was
 * gespeichert ist (Rezepte, Zutaten), bleibt auf Deutsch; die englische
 * Ansicht zeigt es uebersetzt (lib/inhalt.ts).
 *
 * Die Sprache ist ein kleiner Speicher ausserhalb von React, damit der
 * Umschalter oben und alle Ansichten im selben Moment wechseln, ohne dass
 * jeder Teil sie selbst aus localStorage liest.
 */

import { useSyncExternalStore } from 'react';
import { TEXTE, Texte } from './texte';

export type Sprache = 'de' | 'en';

const SPEICHER = 'crave:sprache';

let aktuell: Sprache | null = null;
const zuhoerer = new Set<() => void>();

function gelesen(): Sprache {
  if (aktuell) return aktuell;
  aktuell = 'de';
  try {
    if (window.localStorage.getItem(SPEICHER) === 'en') aktuell = 'en';
  } catch {
    /* privater Modus: Deutsch */
  }
  return aktuell;
}

export function spracheJetzt(): Sprache {
  return typeof window === 'undefined' ? 'de' : gelesen();
}

export function setzeSprache(sprache: Sprache) {
  aktuell = sprache;
  try {
    window.localStorage.setItem(SPEICHER, sprache);
  } catch {
    /* privater Modus: gilt bis zum Neuladen */
  }
  document.documentElement.lang = sprache === 'en' ? 'en' : 'de-CH';
  for (const zuhoeren of zuhoerer) zuhoeren();
}

function abonnieren(zuhoeren: () => void) {
  zuhoerer.add(zuhoeren);
  return () => zuhoerer.delete(zuhoeren);
}

export function useSprache(): Sprache {
  return useSyncExternalStore(abonnieren, spracheJetzt, () => 'de');
}

/** Die Texte der Oberflaeche in der gewaehlten Sprache. */
export function useT(): Texte {
  return TEXTE[useSprache()];
}

/** Fuer Stellen ausserhalb von Komponenten (Meldungen aus Rueckrufen). */
export function texteJetzt(): Texte {
  return TEXTE[spracheJetzt()];
}

/** Beim Start: das lang-Attribut zur gespeicherten Sprache. */
export function spracheAnwenden() {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = spracheJetzt() === 'en' ? 'en' : 'de-CH';
}
