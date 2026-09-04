/**
 * CRAVE – Datenmodell
 *
 * Alle Entitaeten sind "syncbar": sie tragen `updatedAt` (ms seit Epoche) und
 * ein optionales `deleted`-Flag (Tombstone). Damit koennen zwei Geraete ihre
 * Staende zusammenfuehren, ohne dass Aenderungen verloren gehen.
 */

export type Id = string;

export interface Syncable {
  id: Id;
  updatedAt: number;
  deleted?: boolean;
}

/** Kategorien fuer Gerichte (Bereich "Gerichte"). */
export const DISH_CATEGORIES = ['high-protein', 'comfort', 'vegi'] as const;
export type DishCategory = (typeof DISH_CATEGORIES)[number];

export const DISH_CATEGORY_LABEL: Record<DishCategory, string> = {
  'high-protein': 'High-Protein',
  comfort: 'Comfort',
  vegi: 'Vegi',
};

export interface Ingredient {
  id: Id;
  /** Zutatenname, z. B. "Poulet" */
  name: string;
  /** Menge fuer die Basis-Portionenzahl des Rezepts. `null` = ohne Mengenangabe. */
  amount: number | null;
  /** Einheit, z. B. "g", "ml", "Stück". Leerstring erlaubt. */
  unit: string;
  /** Wird beim Skalieren der Portionen nicht veraendert (z. B. "Salz nach Geschmack"). */
  noScale?: boolean;
}

export interface Step {
  id: Id;
  text: string;
  /** Timer-Dauer in Sekunden, `null` wenn der Schritt keinen Timer braucht. */
  durationSec: number | null;
}

export interface Recipe extends Syncable {
  name: string;
  category: string;
  /** Basis-Portionenzahl, auf die sich die Mengen beziehen. */
  servings: number;
  /** Zubereitungszeit in Minuten. */
  timeMin: number | null;
  ingredients: Ingredient[];
  steps: Step[];
  favorite: boolean;
  notes: string;
  createdAt: number;
}

export interface Dish extends Syncable {
  name: string;
  category: DishCategory;
  /** Verknuepftes Rezept, `null` wenn (noch) keines hinterlegt ist. */
  recipeId: Id | null;
  favorite: boolean;
  notes: string;
  createdAt: number;
}

/** Ein Eintrag der aktiven Einkaufsliste. */
export interface ShoppingItem extends Syncable {
  name: string;
  amount: number | null;
  unit: string;
  /** Wenn der Eintrag aus der Grundliste stammt: dessen Id. Beim Abhaken
   *  wandert der Eintrag dorthin zurueck. */
  pantryId: Id | null;
  /** Herkunfts-Rezept (nur informativ, fuer die Anzeige). */
  fromRecipe: string | null;
  createdAt: number;
}

/** Ein Eintrag der Grundliste / Vorratsliste (Standard-Zutaten). */
export interface PantryItem extends Syncable {
  name: string;
  /** Vorgeschlagene Standardmenge, optional. */
  amount: number | null;
  unit: string;
  /**
   * Rubrik der Grundliste, z. B. "Protein" oder "Einfrieren". Leer oder
   * fehlend heisst: erscheint unter "Weitere".
   */
  category?: string;
  /** true, solange der Eintrag gerade in der aktiven Einkaufsliste liegt. */
  inCart: boolean;
  createdAt: number;
}

export interface AppData {
  recipes: Record<Id, Recipe>;
  dishes: Record<Id, Dish>;
  shopping: Record<Id, ShoppingItem>;
  pantry: Record<Id, PantryItem>;
}

export type CollectionName = keyof AppData;

export const COLLECTIONS: CollectionName[] = ['recipes', 'dishes', 'shopping', 'pantry'];

export function emptyData(): AppData {
  return { recipes: {}, dishes: {}, shopping: {}, pantry: {} };
}
