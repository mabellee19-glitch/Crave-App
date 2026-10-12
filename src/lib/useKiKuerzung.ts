'use client';

/**
 * Lange Rezepte im Hintergrund von der KI umschreiben lassen.
 *
 * Die Kuerzung nach Regeln (lib/kuerzen) teilt nur und streicht Verweise;
 * richtig kuerzer und einfacher wird ein Schritt erst durch die KI. Sobald
 * sie erreichbar ist, geht sie nach dem ersten Abgleich die Rezepte durch,
 * die urspruenglich lange Schritte hatten – eines nach dem anderen, mit dem
 * Original als Vorlage.
 *
 * Uebernommen wird nur, was die Gegenprobe besteht: keine Zahl aus dem
 * Original darf fehlen, und das Rezept darf sich in der Zwischenzeit nicht
 * geaendert haben. Fehlt der Zugang (kein Schluessel, keine Zahlungsangabe),
 * hoert der Durchgang beim ersten Rezept auf und versucht es beim naechsten
 * Start wieder – das kostet eine einzige Anfrage.
 */

import { useEffect, useRef } from 'react';
import { useStore, useSync } from './store';
import { brauchtKi } from './kuerzen';

/** Hoechstens so viele Rezepte je Start; der Rest kommt beim naechsten Mal. */
const PRO_START = 12;

/** Antworten, bei denen das Rezept selbst das Problem ist: nicht nochmal fragen. */
const REZEPT_PROBLEM = new Set(['no_result', 'refused', 'too_large', 'no_steps']);

export function useKiKuerzung(): void {
  const store = useStore();
  const aktuell = useRef(store);
  aktuell.current = store;
  const gestartet = useRef(false);
  const vorbei = useRef(false);

  useEffect(
    () => () => {
      vorbei.current = true;
    },
    [],
  );

  const ersterAbgleich = useSync().lastSyncedAt;

  useEffect(() => {
    if (gestartet.current || !ersterAbgleich) return;
    gestartet.current = true;

    const kandidaten = aktuell.current.recipes
      .filter(brauchtKi)
      .slice(0, PRO_START)
      .map((recipe) => recipe.id);
    if (kandidaten.length === 0) return;

    void (async () => {
      for (const id of kandidaten) {
        if (vorbei.current) return;
        const recipe = aktuell.current.getRecipe(id);
        if (!recipe || !brauchtKi(recipe)) continue;

        const vorlage = recipe.vorKuerzen?.steps?.length ? recipe.vorKuerzen.steps : recipe.steps;
        let antwort: Response;
        let daten: {
          ok?: boolean;
          error?: string;
          prep?: string[];
          steps?: Array<{ text: string; durationSec: number | null }>;
          missingNumbers?: string[];
        } | null;
        try {
          antwort = await fetch('/api/simplify', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              recipe: {
                name: recipe.name,
                servings: recipe.servings,
                ingredients: recipe.ingredients
                  .filter((zutat) => zutat.name.trim())
                  .map(({ name, amount, unit }) => ({ name, amount, unit })),
                steps: vorlage
                  .filter((step) => step.text.trim())
                  .map(({ text, durationSec }) => ({ text, durationSec })),
              },
            }),
          });
          daten = await antwort.json().catch(() => null);
        } catch {
          return; // keine Verbindung – beim naechsten Start
        }
        if (vorbei.current) return;

        if (antwort.ok && daten?.ok && Array.isArray(daten.steps) && daten.steps.length) {
          const vollstaendig = !(daten.missingNumbers ?? []).length;
          aktuell.current.kiKuerzungUebernehmen(
            id,
            recipe.updatedAt,
            vollstaendig ? { prep: daten.prep ?? [], steps: daten.steps } : null,
          );
          continue;
        }
        if (REZEPT_PROBLEM.has(String(daten?.error))) {
          aktuell.current.kiKuerzungUebernehmen(id, recipe.updatedAt, null);
          continue;
        }
        return; // Zugang fehlt oder Anbieter ueberlastet: beim naechsten Start
      }
    })();
  }, [ersterAbgleich]);
}

/**
 * Als eigene Komponente eingehaengt: sie liest den Abgleich, und nur sie
 * zeichnet bei dessen Wechseln neu – nicht die ganze App.
 */
export function KiKuerzung(): null {
  useKiKuerzung();
  return null;
}
