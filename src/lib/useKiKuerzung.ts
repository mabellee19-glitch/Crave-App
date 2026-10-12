'use client';

/**
 * Rezepte im Hintergrund von der KI nacharbeiten lassen: englische zuerst
 * auf Deutsch uebersetzen, dann lange Schritte kuerzen.
 *
 * Die Uebersetzung kommt zuerst, weil die Kuerzung danach den deutschen
 * Text liest. Sie trifft jedes englische Rezept, auch eines, das beim Import
 * auf Englisch blieb, weil die KI da nicht erreichbar war.
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
import { Uebersetzung, brauchtUebersetzung, rezeptAuftrag } from './uebersetzen';

/**
 * Der laufende Durchgang. Die englische Fassung (useKiEnglisch) wartet darauf:
 * sie aendert die Rezepte ebenfalls, und ein Kuerzen, das waehrenddessen
 * fertig wuerde, passte nicht mehr zum Stand und waere verloren.
 */
export let kiDurchgang: Promise<void> | null = null;

/** Hoechstens so viele Rezepte je Start; der Rest kommt beim naechsten Mal. */
const PRO_START = 12;

/** Antworten, bei denen das Rezept selbst das Problem ist: nicht nochmal fragen. */
const REZEPT_PROBLEM = new Set(['no_result', 'refused', 'too_large', 'no_steps', 'incomplete']);

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

    const zuUebersetzen = aktuell.current.recipes
      .filter(brauchtUebersetzung)
      .slice(0, PRO_START)
      .map((recipe) => recipe.id);
    if (zuUebersetzen.length === 0 && !aktuell.current.recipes.some(brauchtKi)) return;

    /** Gibt `false` zurueck, wenn der Zugang fehlt – dann lohnt auch das Kuerzen nicht. */
    const uebersetzen = async (): Promise<boolean> => {
      for (const id of zuUebersetzen) {
        if (vorbei.current) return false;
        const recipe = aktuell.current.getRecipe(id);
        if (!recipe || !brauchtUebersetzung(recipe)) continue;

        let antwort: Response;
        let daten: { ok?: boolean; error?: string; recipe?: Uebersetzung } | null;
        try {
          antwort = await fetch('/api/translate', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ recipe: rezeptAuftrag(recipe) }),
          });
          daten = await antwort.json().catch(() => null);
        } catch {
          return false; // keine Verbindung – beim naechsten Start
        }
        if (vorbei.current) return false;

        if (antwort.ok && daten?.ok && daten.recipe) {
          aktuell.current.uebersetzungUebernehmen(id, recipe.updatedAt, daten.recipe);
          continue;
        }
        if (REZEPT_PROBLEM.has(String(daten?.error))) {
          aktuell.current.uebersetzungUebernehmen(id, recipe.updatedAt, null);
          continue;
        }
        return false; // Zugang fehlt oder Anbieter ueberlastet: beim naechsten Start
      }
      return true;
    };

    kiDurchgang = (async () => {
      if (!(await uebersetzen())) return;
      // Die Uebersetzungen sind eben gespeichert; einen Moment warten, bis
      // die App sie gezeichnet hat – erst dann sieht `aktuell` sie. Kommt sie
      // nicht nach, lehnt der Store die Kuerzung ab (Stand passt nicht), und
      // sie folgt beim naechsten Start.
      if (zuUebersetzen.length) await new Promise((weiter) => setTimeout(weiter, 50));

      const kandidaten = aktuell.current.recipes
        .filter(brauchtKi)
        .slice(0, PRO_START)
        .map((recipe) => recipe.id);
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
