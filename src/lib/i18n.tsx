/**
 * Die Texte der Oberflaeche. Crave gibt es nur auf Deutsch; die Texte stehen
 * trotzdem gesammelt in lib/texte.ts statt verstreut in den Komponenten.
 */

import { TEXTE, Texte } from './texte';

/** Die Texte der Oberflaeche. */
export function useT(): Texte {
  return TEXTE;
}

/** Fuer Stellen ausserhalb von Komponenten (Meldungen aus Rueckrufen). */
export function texteJetzt(): Texte {
  return TEXTE;
}
