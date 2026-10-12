'use client';

/**
 * Die englische Fassung eigener Rezepte im Hintergrund nachziehen.
 *
 * Die mitgelieferten Inhalte sind von Hand uebersetzt (lib/seedEn), bekannte
 * Zutaten kennt die App selbst (lib/zutaten). Was darueber hinaus geht –
 * eigene und uebernommene Rezepte, eigene Ideen – uebersetzt die KI, sobald
 * jemand die englische Ansicht waehlt: eines nach dem anderen, und nur die
 * Texte, die noch fehlen. Die Antwort haengt am Rezept und gilt damit auf
 * allen Geraeten.
 *
 * Fehlt der Zugang zur KI, hoert der Durchgang beim ersten Eintrag auf; bis
 * dahin steht in der englischen Ansicht der deutsche Text.
 */

import { useEffect, useRef } from 'react';
import { useStore, useSync } from './store';
import { useSprache } from './i18n';
import { brauchtEnglisch, fehlendeTexte } from './englisch';
import { kiDurchgang } from './useKiKuerzung';

const PRO_DURCHGANG = 15;
const REZEPT_PROBLEM = new Set(['no_result', 'refused', 'too_large', 'incomplete']);

export function useKiEnglisch(): void {
  const store = useStore();
  const aktuell = useRef(store);
  aktuell.current = store;
  const sprache = useSprache();
  const ersterAbgleich = useSync().lastSyncedAt;
  const laeuft = useRef(false);
  const gesperrt = useRef(false);
  const vorbei = useRef(false);

  useEffect(
    () => () => {
      vorbei.current = true;
    },
    [],
  );

  useEffect(() => {
    if (sprache !== 'en' || !ersterAbgleich || laeuft.current || gesperrt.current) return;
    laeuft.current = true;

    void (async () => {
      try {
        // Erst das Uebersetzen und Kuerzen fertig werden lassen.
        if (kiDurchgang) await kiDurchgang;

        const auftraege = [
          ...aktuell.current.recipes.filter(brauchtEnglisch).map((eintrag) => ({ sammlung: 'recipes' as const, id: eintrag.id })),
          ...aktuell.current.dishes.filter(brauchtEnglisch).map((eintrag) => ({ sammlung: 'dishes' as const, id: eintrag.id })),
        ].slice(0, PRO_DURCHGANG);

        for (const { sammlung, id } of auftraege) {
          if (vorbei.current) return;
          const eintrag =
            sammlung === 'recipes'
              ? aktuell.current.getRecipe(id)
              : aktuell.current.dishes.find((dish) => dish.id === id);
          if (!eintrag || !brauchtEnglisch(eintrag)) continue;
          const texte = fehlendeTexte(eintrag);

          let antwort: Response;
          let daten: { ok?: boolean; error?: string; texte?: string[] } | null;
          try {
            antwort = await fetch('/api/englisch', {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ texte }),
            });
            daten = await antwort.json().catch(() => null);
          } catch {
            return; // keine Verbindung – beim naechsten Wechsel oder Start
          }
          if (vorbei.current) return;

          if (antwort.ok && daten?.ok && Array.isArray(daten.texte) && daten.texte.length === texte.length) {
            const paare = Object.fromEntries(texte.map((deutsch, index) => [deutsch, daten!.texte![index]]));
            aktuell.current.englischUebernehmen(sammlung, id, paare);
            continue;
          }
          if (REZEPT_PROBLEM.has(String(daten?.error))) {
            aktuell.current.englischUebernehmen(sammlung, id, null);
            continue;
          }
          // Zugang fehlt oder Anbieter ueberlastet: in dieser Sitzung nicht weiter.
          gesperrt.current = true;
          return;
        }
      } finally {
        laeuft.current = false;
      }
    })();
  }, [sprache, ersterAbgleich]);
}

/** Als eigene Komponente eingehaengt, wie KiKuerzung. */
export function KiEnglisch(): null {
  useKiEnglisch();
  return null;
}
