'use client';

/**
 * Gespeicherte Inhalte so zeigen, wie die App schreibt.
 *
 * Crave ist nur deutsch. Eine Zutat, die jemand auf Englisch eingetippt hat
 * ("basil"), steht trotzdem deutsch da, wenn die App sie kennt – aus dem
 * Zutatenwissen (lib/zutaten) oder aus dem, was die KI zu einer unbekannten
 * Zutat gesagt hat (lib/zutatKi). Deutsch Eingetipptes bleibt Wort fuer Wort.
 */

import { useMemo, useSyncExternalStore } from 'react';
import { englischerName, zutatenName } from './zutaten';
import { abonnieren, gelernt, lernstand } from './zutatKi';
import { formatQuantity } from './units';

export interface Inhalt {
  /** Ein Zutatenname, englisch Eingetipptes auf Deutsch. */
  zutat: (name: string, menge?: number | null) => string;
  /** Menge und Einheit, z. B. "2 EL". */
  menge: (amount: number | null, unit: string) => string;
}

export function zutatAufDeutsch(name: string, menge?: number | null): string {
  if (!name) return name;
  const sauber = name.trim();
  if (englischerName(sauber)) return zutatenName(sauber, 'de', menge) ?? name;
  const ki = gelernt(sauber);
  if (ki?.de && ki.en && ki.en.trim().toLowerCase() === sauber.toLowerCase()) return ki.de;
  return name;
}

/** Zutaten und Mengen, wie die App sie zeigt. */
export function useInhalt(): Inhalt {
  // Lernt die KI eine Zutat dazu, zeigt die Ansicht sie gleich richtig.
  const stand = useSyncExternalStore(abonnieren, lernstand, () => 0);
  return useMemo(
    () => ({
      zutat: (name, menge) => zutatAufDeutsch(name, menge),
      menge: (amount, unit) => formatQuantity(amount, unit),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [stand],
  );
}
