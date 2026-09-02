import { AppData, COLLECTIONS, Syncable, emptyData } from './types';

/**
 * Zusammenfuehren zweier Datenstaende (Last-Write-Wins pro Eintrag).
 *
 * Es wird bewusst pro Entitaet gemergt und nicht pro Dokument: wenn das iPhone
 * ein Rezept aendert waehrend das iPad eine Zutat abhakt, bleiben beide
 * Aenderungen erhalten. Bei identischem `updatedAt` entscheidet ein stabiler
 * Vergleich (JSON-String), damit alle Geraete zum selben Ergebnis kommen.
 */
export function mergeData(a: AppData, b: AppData): AppData {
  const out = emptyData();
  for (const key of COLLECTIONS) {
    const left = (a?.[key] ?? {}) as Record<string, Syncable>;
    const right = (b?.[key] ?? {}) as Record<string, Syncable>;
    const target = out[key] as Record<string, Syncable>;
    const ids = new Set([...Object.keys(left), ...Object.keys(right)]);
    for (const id of ids) {
      const l = left[id];
      const r = right[id];
      target[id] = pickNewer(l, r);
    }
  }
  return out;
}

function pickNewer<T extends Syncable>(l: T | undefined, r: T | undefined): T {
  if (!l) return r as T;
  if (!r) return l;
  const lu = l.updatedAt ?? 0;
  const ru = r.updatedAt ?? 0;
  if (lu > ru) return l;
  if (ru > lu) return r;
  // Gleichstand: deterministisch entscheiden, damit kein Ping-Pong entsteht.
  return JSON.stringify(l) <= JSON.stringify(r) ? l : r;
}

/** Grobe Gleichheitspruefung, um unnoetige Schreibvorgaenge zu vermeiden. */
export function sameData(a: AppData, b: AppData): boolean {
  return stableStringify(a) === stableStringify(b);
}

export function stableStringify(value: unknown): string {
  return JSON.stringify(sortKeys(value));
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === 'object') {
    const src = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(src).sort()) out[k] = sortKeys(src[k]);
    return out;
  }
  return value;
}

/**
 * Alte Tombstones entfernen, damit die Datenmenge nicht unbegrenzt waechst.
 * 60 Tage sind lang genug, dass ein selten genutztes Geraet nichts
 * "wiederbelebt", und kurz genug, dass die Nutzlast klein bleibt.
 */
const TOMBSTONE_TTL_MS = 60 * 24 * 60 * 60 * 1000;

export function pruneTombstones(data: AppData, now = Date.now()): AppData {
  const out = emptyData();
  for (const key of COLLECTIONS) {
    const src = (data[key] ?? {}) as Record<string, Syncable>;
    const target = out[key] as Record<string, Syncable>;
    for (const [id, entry] of Object.entries(src)) {
      if (entry?.deleted && now - (entry.updatedAt ?? 0) > TOMBSTONE_TTL_MS) continue;
      target[id] = entry;
    }
  }
  return out;
}
