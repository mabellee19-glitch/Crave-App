'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  AppData,
  Dish,
  Ingredient,
  PantryItem,
  Recipe,
  ShoppingItem,
  emptyData,
} from './types';
import { mergeData, pruneTombstones, sameData } from './merge';
import { randomId } from './id';
import { PANTRY_CATALOGUE, PANTRY_CATEGORY_RENAMES, buildSeedData } from './seed';
import {
  addAmounts,
  sameIngredient,
  scaleAmount,
  subtractAmounts,
  unitsCompatible,
} from './units';

export type SyncState = 'idle' | 'syncing' | 'synced' | 'offline' | 'error';

export interface SyncInfo {
  state: SyncState;
  /** true, sobald der Server bestaetigt hat, dass eine echte Cloud-DB dahintersteht. */
  cloud: boolean | null;
  /**
   * Eine Datenbank ist konfiguriert, antwortet aber nicht. Das ist ein anderer
   * Fall als "keine Datenbank" und braucht einen anderen Hinweis: hier ist
   * etwas falsch eingerichtet, statt noch gar nicht eingerichtet.
   */
  dbUnreachable: boolean;
  lastSyncedAt: number | null;
  pending: boolean;
  error: string | null;
}

interface StoreValue {
  spaceId: string;
  data: AppData;
  ready: boolean;
  sync: SyncInfo;
  syncNow: () => void;

  recipes: Recipe[];
  dishes: Dish[];
  shopping: ShoppingItem[];
  pantry: PantryItem[];

  getRecipe: (id: string | null | undefined) => Recipe | null;

  saveRecipe: (recipe: Recipe) => void;
  deleteRecipe: (id: string) => void;
  /** "Cook Next" umschalten – die Zutaten wandern dabei auf die Einkaufsliste und zurueck. */
  toggleRecipeCookNext: (id: string, servings?: number) => void;

  saveDish: (dish: Dish) => void;
  deleteDish: (id: string) => void;
  toggleDishCookNext: (id: string) => void;

  addShoppingItem: (input: { name: string; amount?: number | null; unit?: string }) => void;
  updateShoppingItem: (item: ShoppingItem) => void;
  checkOffShoppingItem: (id: string) => void;
  clearShoppingList: () => void;
  addRecipeToShopping: (recipe: Recipe, servings: number) => number;

  savePantryItem: (item: PantryItem) => void;
  addPantryItem: (input: {
    name: string;
    amount?: number | null;
    unit?: string;
    category?: string;
  }) => void;
  /** Vorschlagsliste nachtragen; gibt zurück, was tatsächlich passiert ist. */
  addPantrySuggestions: () => { added: number; categorised: number };
  /** Fehlende Startrezepte nachtragen; vorhandene bleiben unangetastet. */
  addMissingRecipes: () => { added: number; completed: number };
  deletePantryItem: (id: string) => void;
  movePantryItemToCart: (id: string) => void;

  undo: (() => void) | null;
  setUndo: (fn: (() => void) | null) => void;
}

const StoreContext = createContext<StoreValue | null>(null);

const PUSH_DEBOUNCE_MS = 700;
const POLL_INTERVAL_MS = 7000;

/* -------------------------------------------------------------------------- */

function localKey(spaceId: string): string {
  return `crave:data:${spaceId}`;
}

function readLocal(spaceId: string): AppData | null {
  try {
    const raw = window.localStorage.getItem(localKey(spaceId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return { ...emptyData(), ...parsed };
  } catch {
    return null;
  }
}

function writeLocal(spaceId: string, data: AppData): void {
  try {
    window.localStorage.setItem(localKey(spaceId), JSON.stringify(data));
  } catch {
    // Speicher voll oder privater Modus – die Cloud bleibt die Quelle der Wahrheit.
  }
}

/** Monoton steigende Zeitstempel, auch wenn die Systemuhr springt. */
let lastStamp = 0;
function stamp(): number {
  const now = Date.now();
  lastStamp = now > lastStamp ? now : lastStamp + 1;
  return lastStamp;
}

/**
 * Rubriken der Grundliste auf ihre heutigen Namen bringen.
 *
 * Gibt `null` zurück, wenn nichts anzupassen war – dann bleibt der Stand
 * unberührt und es wird auch nichts zum Server geschickt.
 */
function renameCategories(data: AppData, now: number): AppData | null {
  const updated: Record<string, PantryItem> = {};
  let changed = false;
  for (const [id, item] of Object.entries(data.pantry)) {
    const neu = item.category ? PANTRY_CATEGORY_RENAMES[item.category] : undefined;
    if (neu) {
      updated[id] = { ...item, category: neu, updatedAt: now };
      changed = true;
    } else {
      updated[id] = item;
    }
  }
  return changed ? { ...data, pantry: updated } : null;
}

function isEmpty(data: AppData): boolean {
  return (
    Object.keys(data.recipes).length === 0 &&
    Object.keys(data.dishes).length === 0 &&
    Object.keys(data.shopping).length === 0 &&
    Object.keys(data.pantry).length === 0
  );
}

function activeList<T extends { deleted?: boolean }>(map: Record<string, T>): T[] {
  return Object.values(map).filter((entry) => !entry?.deleted);
}

/**
 * Eine Sammlung auf einen frueheren Stand zuruecksetzen – aber mit neuen
 * Zeitstempeln, damit die Ruecknahme beim Abgleich gewinnt.
 */
function restoreCollection<K extends 'shopping' | 'pantry'>(
  draft: AppData,
  key: K,
  previous: AppData[K],
): void {
  const current = draft[key] as Record<string, { deleted?: boolean; updatedAt: number }>;
  const prev = previous as Record<string, { deleted?: boolean; updatedAt: number }>;
  const ids = new Set([...Object.keys(current), ...Object.keys(prev)]);
  for (const id of ids) {
    const old = prev[id];
    if (old) {
      current[id] = { ...old, updatedAt: stamp() };
    } else if (current[id] && !current[id].deleted) {
      current[id] = { ...current[id], deleted: true, updatedAt: stamp() };
    }
  }
}

/* -------------------------------------------------------------------------- */

export function StoreProvider({ spaceId, children }: { spaceId: string; children: React.ReactNode }) {
  const [data, setDataState] = useState<AppData>(() => emptyData());
  const [ready, setReady] = useState(false);
  const [sync, setSync] = useState<SyncInfo>({
    state: 'idle',
    cloud: null,
    dbUnreachable: false,
    lastSyncedAt: null,
    pending: false,
    error: null,
  });
  const [undo, setUndo] = useState<(() => void) | null>(null);

  const dataRef = useRef<AppData>(data);
  const dirtyRef = useRef(false);
  const inFlightRef = useRef(false);
  const pushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  const commit = useCallback(
    (next: AppData, options: { dirty?: boolean } = {}) => {
      dataRef.current = next;
      setDataState(next);
      writeLocal(spaceId, next);
      if (options.dirty) dirtyRef.current = true;
    },
    [spaceId],
  );

  /** Zustand veraendern: der Mutator erhaelt eine flache Kopie und darf sie anpassen. */
  const mutate = useCallback(
    (mutator: (draft: AppData) => void) => {
      const draft: AppData = {
        recipes: { ...dataRef.current.recipes },
        dishes: { ...dataRef.current.dishes },
        shopping: { ...dataRef.current.shopping },
        pantry: { ...dataRef.current.pantry },
      };
      mutator(draft);
      commit(draft, { dirty: true });
      schedulePush();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [commit],
  );

  /* ---------------------------- Synchronisation --------------------------- */

  /**
   * Aus einer Fehlerantwort ablesen, ob eine Datenbank konfiguriert ist. Nur
   * dann ist der Ausfall ein Einrichtungsfehler und keine fehlende Verbindung.
   */
  const noteFailure = useCallback((body: { storage?: string; error?: string } | null) => {
    if (!mountedRef.current) return;
    if (body?.storage === 'postgres') {
      setSync((s) => ({ ...s, cloud: true, dbUnreachable: true, error: body.error ?? null }));
    }
  }, []);

  const pull = useCallback(
    async (silent = false) => {
      if (!silent) setSync((s) => ({ ...s, state: 'syncing' }));
      try {
        const res = await fetch(`/api/space/${spaceId}`, { cache: 'no-store' });
        const body = await res.json().catch(() => null);
        if (!body?.ok) {
          noteFailure(body);
          throw new Error(body?.error ?? `HTTP ${res.status}`);
        }
        if (!mountedRef.current) return;
        const serverData: AppData = { ...emptyData(), ...(body.data ?? {}) };
        const merged = pruneTombstones(mergeData(dataRef.current, serverData));
        if (!sameData(merged, dataRef.current)) commit(merged);
        if (!sameData(merged, serverData)) dirtyRef.current = true;
        setSync((s) => ({
          ...s,
          state: dirtyRef.current ? 'syncing' : 'synced',
          cloud: body.storage === 'postgres',
          dbUnreachable: false,
          lastSyncedAt: Date.now(),
          error: null,
        }));
        return true;
      } catch (err) {
        if (mountedRef.current) {
          setSync((s) => ({
            ...s,
            state: 'offline',
            error: err instanceof Error ? err.message : 'offline',
          }));
        }
        return false;
      }
    },
    [spaceId, commit, noteFailure],
  );

  const push = useCallback(async () => {
    if (inFlightRef.current) return;
    if (!dirtyRef.current) return;
    inFlightRef.current = true;
    dirtyRef.current = false;
    const snapshot = dataRef.current;
    setSync((s) => ({ ...s, state: 'syncing', pending: true }));
    try {
      const res = await fetch(`/api/space/${spaceId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: snapshot }),
        cache: 'no-store',
      });
      const body = await res.json().catch(() => null);
      if (!body?.ok) {
        noteFailure(body);
        throw new Error(body?.error ?? `HTTP ${res.status}`);
      }
      if (!mountedRef.current) return;
      const serverData: AppData = { ...emptyData(), ...(body.data ?? {}) };
      const merged = pruneTombstones(mergeData(dataRef.current, serverData));
      if (!sameData(merged, dataRef.current)) commit(merged);
      if (!sameData(merged, serverData)) dirtyRef.current = true;
      setSync((s) => ({
        ...s,
        state: dirtyRef.current ? 'syncing' : 'synced',
        cloud: body.storage === 'postgres',
        dbUnreachable: false,
        lastSyncedAt: Date.now(),
        pending: false,
        error: null,
      }));
    } catch (err) {
      dirtyRef.current = true; // beim naechsten Versuch erneut senden
      if (mountedRef.current) {
        setSync((s) => ({
          ...s,
          state: 'offline',
          pending: false,
          error: err instanceof Error ? err.message : 'offline',
        }));
      }
    } finally {
      inFlightRef.current = false;
      if (dirtyRef.current && mountedRef.current) schedulePushRef.current?.();
    }
  }, [spaceId, commit, noteFailure]);

  const schedulePushRef = useRef<(() => void) | null>(null);

  const schedulePush = useCallback(() => {
    if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
    pushTimerRef.current = setTimeout(() => {
      pushTimerRef.current = null;
      void push();
    }, PUSH_DEBOUNCE_MS);
  }, [push]);

  schedulePushRef.current = schedulePush;

  const syncNow = useCallback(() => {
    void (async () => {
      await pull();
      if (dirtyRef.current) await push();
    })();
  }, [pull, push]);

  /* -------------------------------- Start --------------------------------- */

  useEffect(() => {
    mountedRef.current = true;
    let cancelled = false;

    (async () => {
      const local = readLocal(spaceId);
      if (local && !cancelled) commit(local);

      const res = await fetch(`/api/space/${spaceId}`, { cache: 'no-store' })
        .then((r) => r.json())
        .catch(() => null);

      if (cancelled) return;
      if (!res?.ok) noteFailure(res);

      let next = dataRef.current;
      let cloud: boolean | null = null;

      if (res?.ok) {
        cloud = res.storage === 'postgres';
        const serverData: AppData = { ...emptyData(), ...(res.data ?? {}) };
        next = pruneTombstones(mergeData(next, serverData));
        // Startinhalte nur, wenn der Datenraum auf dem Server noch gar nicht
        // existiert. Ein vorhandener, aber leerer Datenraum wurde bewusst
        // leergeraeumt und darf nicht wieder aufgefuellt werden.
        if (!res.exists && isEmpty(next)) {
          next = buildSeedData();
          dirtyRef.current = true;
        } else if (!sameData(next, serverData)) {
          dirtyRef.current = true;
        }
      }
      // Ohne Antwort vom Server wird bewusst nicht vorbefuellt: sonst kaeme
      // auf einem Geraet ohne Netz Startinhalt in einen laengst genutzten
      // Datenraum.

      // Einmalig beim Start: alte Rubriknamen angleichen.
      const umbenannt = renameCategories(next, stamp());
      if (umbenannt) {
        next = umbenannt;
        dirtyRef.current = true;
      }

      commit(next);
      setReady(true);
      setSync((s) => ({
        ...s,
        cloud,
        state: res?.ok ? (dirtyRef.current ? 'syncing' : 'synced') : 'offline',
        lastSyncedAt: res?.ok ? Date.now() : null,
        // Eine bereits erkannte Ursache nicht durch das pauschale "offline"
        // ersetzen – sie ist das einzige, was bei der Fehlersuche hilft.
        error: res?.ok ? null : (res?.error ?? s.error ?? 'offline'),
      }));
      if (dirtyRef.current) void push();
    })();

    return () => {
      cancelled = true;
      mountedRef.current = false;
      if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spaceId]);

  /* ------------------------- Regelmaessiger Abgleich ------------------------ */

  useEffect(() => {
    if (!ready) return;

    const tick = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      if (dirtyRef.current) void push();
      else void pull(true);
    };

    const interval = setInterval(tick, POLL_INTERVAL_MS);

    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        void pull(true).then(() => {
          if (dirtyRef.current) void push();
        });
      } else if (dirtyRef.current) {
        void push();
      }
    };
    const onOnline = () => syncNow();

    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    window.addEventListener('online', onOnline);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
      window.removeEventListener('online', onOnline);
    };
  }, [ready, pull, push, syncNow]);

  /* ------------------------------- Aktionen -------------------------------- */

  const getRecipe = useCallback(
    (id: string | null | undefined): Recipe | null => {
      if (!id) return null;
      const recipe = data.recipes[id];
      return recipe && !recipe.deleted ? recipe : null;
    },
    [data.recipes],
  );

  const saveRecipe = useCallback(
    (recipe: Recipe) => {
      mutate((draft) => {
        draft.recipes[recipe.id] = { ...recipe, updatedAt: stamp(), deleted: false };
      });
    },
    [mutate],
  );

  const deleteRecipe = useCallback(
    (id: string) => {
      mutate((draft) => {
        const existing = draft.recipes[id];
        if (!existing) return;
        draft.recipes[id] = { ...existing, deleted: true, updatedAt: stamp() };
        // Verknuepfungen aus Gerichten loesen, damit keine toten Links bleiben.
        for (const [dishId, dish] of Object.entries(draft.dishes)) {
          if (dish.recipeId === id && !dish.deleted) {
            draft.dishes[dishId] = { ...dish, recipeId: null, updatedAt: stamp() };
          }
        }
      });
    },
    [mutate],
  );

  /**
   * "Cook Next" fuer ein Rezept umschalten.
   *
   * Die Planung und die Einkaufsliste haengen zusammen: einschalten legt die
   * Zutaten in die Liste, ausschalten nimmt genau diesen Anteil wieder heraus.
   * Verknuepfte Gerichte werden mitgezogen, damit beide Bereiche dasselbe
   * zeigen.
   */
  const toggleRecipeCookNext = useCallback(
    (id: string, servings?: number) => {
      mutate((draft) => {
        const existing = draft.recipes[id];
        if (!existing) return;
        const kuenftig = !existing.cookNext;
        draft.recipes[id] = { ...existing, cookNext: kuenftig, updatedAt: stamp() };

        if (kuenftig) legeGeplantAn(draft, existing, servings ?? existing.servings);
        else nimmGeplantZurueck(draft, id);

        for (const dish of activeList(draft.dishes)) {
          if (dish.recipeId === id && dish.cookNext !== kuenftig) {
            draft.dishes[dish.id] = { ...dish, cookNext: kuenftig, updatedAt: stamp() };
          }
        }
      });
    },
    [mutate],
  );

  const saveDish = useCallback(
    (dish: Dish) => {
      mutate((draft) => {
        draft.dishes[dish.id] = { ...dish, updatedAt: stamp(), deleted: false };
      });
    },
    [mutate],
  );

  const deleteDish = useCallback(
    (id: string) => {
      mutate((draft) => {
        const existing = draft.dishes[id];
        if (!existing) return;
        draft.dishes[id] = { ...existing, deleted: true, updatedAt: stamp() };
      });
    },
    [mutate],
  );

  /**
   * "Cook Next" fuer ein Gericht. Haengt ein Rezept daran, wird es mitgeplant –
   * die Zutaten kommen dann von dort. Gerichte ohne Rezept lassen sich
   * trotzdem vormerken, sie bringen nur nichts auf die Einkaufsliste.
   */
  const toggleDishCookNext = useCallback(
    (id: string) => {
      mutate((draft) => {
        const existing = draft.dishes[id];
        if (!existing) return;
        const kuenftig = !existing.cookNext;
        draft.dishes[id] = { ...existing, cookNext: kuenftig, updatedAt: stamp() };

        const recipe = existing.recipeId ? draft.recipes[existing.recipeId] : null;
        if (!recipe || recipe.deleted || recipe.cookNext === kuenftig) return;

        draft.recipes[recipe.id] = { ...recipe, cookNext: kuenftig, updatedAt: stamp() };
        if (kuenftig) legeGeplantAn(draft, recipe, recipe.servings);
        else nimmGeplantZurueck(draft, recipe.id);

        for (const dish of activeList(draft.dishes)) {
          if (dish.id !== id && dish.recipeId === recipe.id && dish.cookNext !== kuenftig) {
            draft.dishes[dish.id] = { ...dish, cookNext: kuenftig, updatedAt: stamp() };
          }
        }
      });
    },
    [mutate],
  );

  /** Zutat in die aktive Liste legen – vorhandene Eintraege werden zusammengefasst. */
  function putIntoCart(
    draft: AppData,
    input: {
      name: string;
      amount?: number | null;
      unit?: string;
      fromRecipe?: string | null;
      /** Id des geplanten Rezepts, wenn der Eintrag aus "Cook Next" kommt. */
      plannedFor?: string;
      /** true, wenn der Eintrag auch ohne Planung bestehen bleiben soll. */
      manual?: boolean;
    },
  ): void {
    const name = input.name.trim();
    if (!name) return;
    const amount = input.amount ?? null;
    const unit = (input.unit ?? '').trim();

    const existing = activeList(draft.shopping).find((item) => sameIngredient(item.name, name));
    if (existing && (amount == null || existing.amount == null || unitsCompatible(existing.unit, unit))) {
      const summed = addAmounts(existing.amount, existing.unit, amount, unit);
      draft.shopping[existing.id] = {
        ...existing,
        amount: summed.amount,
        unit: summed.unit,
        fromRecipe: existing.fromRecipe ?? input.fromRecipe ?? null,
        plannedFrom: mitAnteil(existing.plannedFrom, input.plannedFor, amount, unit),
        manual: existing.manual || input.manual === true,
        updatedAt: stamp(),
      };
      return;
    }

    // Passenden Grundlisten-Eintrag finden, damit der Weg zurueck funktioniert.
    const pantryMatch = activeList(draft.pantry).find((item) => sameIngredient(item.name, name));
    if (pantryMatch && !pantryMatch.inCart) {
      draft.pantry[pantryMatch.id] = { ...pantryMatch, inCart: true, updatedAt: stamp() };
    }

    const id = randomId();
    const now = stamp();
    draft.shopping[id] = {
      id,
      name: pantryMatch ? pantryMatch.name : name,
      amount,
      unit,
      pantryId: pantryMatch ? pantryMatch.id : null,
      fromRecipe: input.fromRecipe ?? null,
      plannedFrom: mitAnteil(undefined, input.plannedFor, amount, unit),
      manual: input.manual === true,
      createdAt: now,
      updatedAt: now,
    };
  }

  /** Den Anteil eines geplanten Rezepts in die Buchhaltung eines Eintrags schreiben. */
  function mitAnteil(
    bisher: ShoppingItem['plannedFrom'],
    recipeId: string | undefined,
    amount: number | null,
    unit: string,
  ): ShoppingItem['plannedFrom'] {
    if (!recipeId) return bisher;
    const vorher = bisher?.[recipeId];
    // Zweimal dasselbe Rezept geplant: die Anteile summieren sich.
    const summe = vorher ? addAmounts(vorher.amount, vorher.unit, amount, unit) : { amount, unit };
    return { ...(bisher ?? {}), [recipeId]: summe };
  }

  /**
   * Alles zuruecknehmen, was ein geplantes Rezept auf die Einkaufsliste
   * gebracht hat – und nur das. Eintraege, die es auch ohne die Planung gibt
   * (von Hand, aus der Grundliste, von einem zweiten geplanten Rezept),
   * bleiben stehen und verlieren nur den Anteil dieses Rezepts.
   */
  function nimmGeplantZurueck(draft: AppData, recipeId: string): void {
    for (const item of activeList(draft.shopping)) {
      const anteil = item.plannedFrom?.[recipeId];
      if (!anteil) continue;

      const rest = { ...(item.plannedFrom ?? {}) };
      delete rest[recipeId];
      const keineAnteileMehr = Object.keys(rest).length === 0;

      if (keineAnteileMehr && !item.manual) {
        draft.shopping[item.id] = { ...item, deleted: true, updatedAt: stamp() };
        if (item.pantryId) {
          const pantryItem = draft.pantry[item.pantryId];
          if (pantryItem) {
            draft.pantry[item.pantryId] = { ...pantryItem, inCart: false, updatedAt: stamp() };
          }
        }
        continue;
      }

      const uebrig = subtractAmounts(item.amount, item.unit, anteil.amount, anteil.unit);
      draft.shopping[item.id] = {
        ...item,
        amount: uebrig.amount,
        unit: uebrig.unit,
        plannedFrom: keineAnteileMehr ? undefined : rest,
        updatedAt: stamp(),
      };
    }
  }

  /** Die Zutaten eines Rezepts als Anteil dieser Planung eintragen. */
  function legeGeplantAn(draft: AppData, recipe: Recipe, servings: number): void {
    const factor = recipe.servings > 0 ? servings / recipe.servings : 1;
    for (const ingredient of recipe.ingredients) {
      if (!ingredient.name.trim()) continue;
      putIntoCart(draft, {
        name: ingredient.name,
        amount: scaleAmount(ingredient.amount, factor, ingredient.noScale),
        unit: ingredient.unit,
        fromRecipe: recipe.name,
        plannedFor: recipe.id,
      });
    }
  }

  const addShoppingItem = useCallback(
    (input: { name: string; amount?: number | null; unit?: string }) => {
      mutate((draft) => putIntoCart(draft, { ...input, manual: true }));
    },
    [mutate],
  );

  const updateShoppingItem = useCallback(
    (item: ShoppingItem) => {
      mutate((draft) => {
        draft.shopping[item.id] = { ...item, updatedAt: stamp() };
      });
    },
    [mutate],
  );

  const checkOffShoppingItem = useCallback(
    (id: string) => {
      const before = dataRef.current;
      mutate((draft) => {
        const item = draft.shopping[id];
        if (!item || item.deleted) return;
        draft.shopping[id] = { ...item, deleted: true, updatedAt: stamp() };
        if (item.pantryId) {
          const pantryItem = draft.pantry[item.pantryId];
          if (pantryItem) {
            draft.pantry[item.pantryId] = { ...pantryItem, inCart: false, updatedAt: stamp() };
          }
        }
      });
      const item = before.shopping[id];
      setUndo(() => () => {
        mutate((draft) => {
          const current = draft.shopping[id];
          draft.shopping[id] = { ...(current ?? item), deleted: false, updatedAt: stamp() };
          if (item?.pantryId) {
            const pantryItem = draft.pantry[item.pantryId];
            if (pantryItem) {
              draft.pantry[item.pantryId] = { ...pantryItem, inCart: true, updatedAt: stamp() };
            }
          }
        });
        setUndo(null);
      });
    },
    [mutate],
  );

  const clearShoppingList = useCallback(() => {
    mutate((draft) => {
      for (const item of activeList(draft.shopping)) {
        draft.shopping[item.id] = { ...item, deleted: true, updatedAt: stamp() };
        if (item.pantryId) {
          const pantryItem = draft.pantry[item.pantryId];
          if (pantryItem) {
            draft.pantry[item.pantryId] = { ...pantryItem, inCart: false, updatedAt: stamp() };
          }
        }
      }
    });
  }, [mutate]);

  const addRecipeToShopping = useCallback(
    (recipe: Recipe, servings: number) => {
      const factor = recipe.servings > 0 ? servings / recipe.servings : 1;
      const usable = recipe.ingredients.filter((i) => i.name.trim().length > 0);
      const before = dataRef.current;
      mutate((draft) => {
        for (const ingredient of usable) {
          putIntoCart(draft, {
            name: ingredient.name,
            amount: scaleAmount(ingredient.amount, factor, ingredient.noScale),
            unit: ingredient.unit,
            fromRecipe: recipe.name,
            // Von Hand uebernommen: bleibt liegen, auch wenn die Planung faellt.
            manual: true,
          });
        }
      });
      setUndo(() => () => {
        // Nicht den alten Snapshot zurueckschreiben: sonst haetten die alten
        // Eintraege aeltere Zeitstempel als der Serverstand und der Merge
        // wuerde die Aenderung wieder herstellen. Stattdessen der alte
        // Zustand mit frischen Zeitstempeln.
        mutate((draft) => {
          restoreCollection(draft, 'shopping', before.shopping);
          restoreCollection(draft, 'pantry', before.pantry);
        });
        setUndo(null);
      });
      return usable.length;
    },
    [mutate],
  );

  const savePantryItem = useCallback(
    (item: PantryItem) => {
      mutate((draft) => {
        draft.pantry[item.id] = { ...item, updatedAt: stamp(), deleted: false };
      });
    },
    [mutate],
  );

  const addPantryItem = useCallback(
    (input: { name: string; amount?: number | null; unit?: string; category?: string }) => {
      const name = input.name.trim();
      if (!name) return;
      mutate((draft) => {
        const existing = activeList(draft.pantry).find((item) => sameIngredient(item.name, name));
        if (existing) return;
        const id = randomId();
        const now = stamp();
        draft.pantry[id] = {
          id,
          name,
          amount: input.amount ?? null,
          unit: (input.unit ?? '').trim(),
          category: input.category,
          inCart: false,
          createdAt: now,
          updatedAt: now,
        };
      });
    },
    [mutate],
  );

  /**
   * Vorschlagsliste in die Grundliste übernehmen.
   *
   * Rein ergänzend: was es schon gibt, bleibt wie es ist. Nur eine noch leere
   * Rubrik wird gefüllt, wenn die Vorschlagsliste eine dafür kennt – sonst
   * lägen die alten Einträge dauerhaft unter "Weitere".
   */
  const addPantrySuggestions = useCallback(() => {
    const result = { added: 0, categorised: 0 };
    mutate((draft) => {
      for (const group of PANTRY_CATALOGUE) {
        for (const entry of group.items) {
          const existing = activeList(draft.pantry).find((item) =>
            sameIngredient(item.name, entry.name),
          );
          if (existing) {
            if (!existing.category) {
              draft.pantry[existing.id] = {
                ...existing,
                category: group.category,
                updatedAt: stamp(),
              };
              result.categorised += 1;
            }
            continue;
          }
          const id = randomId();
          const now = stamp();
          draft.pantry[id] = {
            id,
            name: entry.name,
            amount: entry.amount ?? null,
            unit: entry.unit ?? '',
            category: group.category,
            inCart: false,
            createdAt: now,
            updatedAt: now,
          };
          result.added += 1;
        }
      }
    });
    return result;
  }, [mutate]);

  /**
   * Startrezepte nachtragen, die in diesem Datenraum fehlen.
   *
   * Angelegt wird nur, was es unter dieser Id noch nie gab – ein gelöschtes
   * Rezept bleibt gelöscht. Ein vorhandenes Rezept wird nicht überschrieben;
   * einzige Ausnahme sind Zubereitungsschritte, die dort noch ganz fehlen.
   */
  const addMissingRecipes = useCallback(() => {
    const result = { added: 0, completed: 0 };
    const startInhalte = buildSeedData();
    mutate((draft) => {
      for (const recipe of Object.values(startInhalte.recipes)) {
        const existing = draft.recipes[recipe.id];
        if (!existing) {
          const now = stamp();
          draft.recipes[recipe.id] = { ...recipe, createdAt: now, updatedAt: now };
          result.added += 1;
          continue;
        }
        if (!existing.deleted && existing.steps.length === 0 && recipe.steps.length > 0) {
          draft.recipes[recipe.id] = {
            ...existing,
            steps: recipe.steps,
            timeMin: existing.timeMin ?? recipe.timeMin,
            notes: existing.notes || recipe.notes,
            updatedAt: stamp(),
          };
          result.completed += 1;
        }
      }
    });
    return result;
  }, [mutate]);

  const deletePantryItem = useCallback(
    (id: string) => {
      mutate((draft) => {
        const existing = draft.pantry[id];
        if (!existing) return;
        draft.pantry[id] = { ...existing, deleted: true, updatedAt: stamp() };
        for (const item of activeList(draft.shopping)) {
          if (item.pantryId === id) {
            draft.shopping[item.id] = { ...item, pantryId: null, updatedAt: stamp() };
          }
        }
      });
    },
    [mutate],
  );

  const movePantryItemToCart = useCallback(
    (id: string) => {
      mutate((draft) => {
        const pantryItem = draft.pantry[id];
        if (!pantryItem || pantryItem.deleted) return;
        const existing = activeList(draft.shopping).find(
          (item) => item.pantryId === id || sameIngredient(item.name, pantryItem.name),
        );
        draft.pantry[id] = { ...pantryItem, inCart: true, updatedAt: stamp() };
        if (existing) {
          // Von Hand geholt: der Eintrag bleibt, auch wenn eine Planung faellt.
          draft.shopping[existing.id] = {
            ...existing,
            pantryId: id,
            manual: true,
            updatedAt: stamp(),
          };
          return;
        }
        const itemId = randomId();
        const now = stamp();
        draft.shopping[itemId] = {
          id: itemId,
          name: pantryItem.name,
          amount: pantryItem.amount,
          unit: pantryItem.unit,
          pantryId: id,
          fromRecipe: null,
          manual: true,
          createdAt: now,
          updatedAt: now,
        };
      });
    },
    [mutate],
  );

  /* ------------------------------ Abgeleitetes ------------------------------ */

  const recipes = useMemo(
    () => activeList(data.recipes).sort((a, b) => a.name.localeCompare(b.name, 'de')),
    [data.recipes],
  );
  const dishes = useMemo(
    () => activeList(data.dishes).sort((a, b) => a.name.localeCompare(b.name, 'de')),
    [data.dishes],
  );
  const shopping = useMemo(
    () => activeList(data.shopping).sort((a, b) => b.createdAt - a.createdAt),
    [data.shopping],
  );
  const pantry = useMemo(
    () =>
      activeList(data.pantry)
        .filter((item) => !item.inCart)
        .sort((a, b) => a.name.localeCompare(b.name, 'de')),
    [data.pantry],
  );

  const value: StoreValue = {
    spaceId,
    data,
    ready,
    sync,
    syncNow,
    recipes,
    dishes,
    shopping,
    pantry,
    getRecipe,
    saveRecipe,
    deleteRecipe,
    toggleRecipeCookNext,
    saveDish,
    deleteDish,
    toggleDishCookNext,
    addShoppingItem,
    updateShoppingItem,
    checkOffShoppingItem,
    clearShoppingList,
    addRecipeToShopping,
    savePantryItem,
    addPantryItem,
    addPantrySuggestions,
    addMissingRecipes,
    deletePantryItem,
    movePantryItemToCart,
    undo,
    setUndo,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore muss innerhalb von <StoreProvider> verwendet werden.');
  return ctx;
}

/** Leeres Rezept fuer das Formular. */
export function blankRecipe(): Recipe {
  const now = stamp();
  return {
    id: randomId(),
    name: '',
    category: '',
    servings: 2,
    timeMin: 30,
    ingredients: [blankIngredient()],
    steps: [blankStep()],
    cookNext: false,
    notes: '',
    createdAt: now,
    updatedAt: now,
  };
}

export function blankIngredient(): Ingredient {
  return { id: randomId(), name: '', amount: null, unit: '' };
}

export function blankStep() {
  return { id: randomId(), text: '', durationSec: null };
}

export function blankDish(): Dish {
  const now = stamp();
  return {
    id: randomId(),
    name: '',
    category: 'high-protein',
    recipeId: null,
    cookNext: false,
    notes: '',
    createdAt: now,
    updatedAt: now,
  };
}
