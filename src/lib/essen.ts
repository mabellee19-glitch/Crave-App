/**
 * "Essen": Rezepte und Gerichte in einer Liste.
 *
 * Frueher gab es zwei Bereiche, und fast jedes Gericht stand doppelt da –
 * einmal unter Gerichte, einmal als Rezept. Jetzt gibt es nur noch Eintraege:
 * ein Rezept (mit Anleitung) oder eine Idee (ein Gericht ohne Rezept, nur
 * Name und Zutaten). Gespeichert wird weiter wie bisher; zusammengefuehrt
 * wird nur in der Anzeige. So bleiben aeltere Staende und andere Geraete
 * gueltig, und nichts muss umgeschrieben werden.
 */

import { DISH_CATEGORY_LABEL, Dish, Recipe, matchDishCategory } from './types';
import { normalizeName } from './units';

/**
 * Die Gerichte, die als eigene Idee erscheinen. Ein Gericht mit hinterlegtem
 * Rezept ist dasselbe wie das Rezept und faellt weg – ebenso eines, das genau
 * so heisst wie ein Rezept: sonst stuende es wieder doppelt da.
 */
export function ideenAus(recipes: Recipe[], dishes: Dish[]): Dish[] {
  const rezeptIds = new Set(recipes.map((recipe) => recipe.id));
  const rezeptNamen = new Set(recipes.map((recipe) => normalizeName(recipe.name)));
  return dishes.filter(
    (dish) =>
      !(dish.recipeId && rezeptIds.has(dish.recipeId)) &&
      !rezeptNamen.has(normalizeName(dish.name)),
  );
}

export type Eintrag =
  | { art: 'rezept'; id: string; name: string; kategorie: string; cookNext: boolean; recipe: Recipe }
  | { art: 'idee'; id: string; name: string; kategorie: string; cookNext: boolean; dish: Dish };

export function eintraegeAus(recipes: Recipe[], ideen: Dish[]): Eintrag[] {
  return [
    ...recipes.map(
      (recipe): Eintrag => ({
        art: 'rezept',
        id: recipe.id,
        name: recipe.name,
        kategorie: recipe.category.trim(),
        cookNext: recipe.cookNext,
        recipe,
      }),
    ),
    ...ideen.map(
      (dish): Eintrag => ({
        art: 'idee',
        id: dish.id,
        name: dish.name,
        kategorie: DISH_CATEGORY_LABEL[dish.category] ?? '',
        cookNext: dish.cookNext,
        dish,
      }),
    ),
  ].sort((a, b) => a.name.localeCompare(b.name, 'de'));
}

/** Klassenzusatz fuer die Kategoriefarbe – fuer Rezepte und Ideen gleich. */
export function kategorieKlasse(kategorie: string): string {
  return matchDishCategory(kategorie) ?? 'neutral';
}
