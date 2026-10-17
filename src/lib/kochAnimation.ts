/**
 * Welches Bild der Kochmodus zeigt – zum Start und am Schluss.
 *
 * - Aus dem Ofen: der Bräter fährt in den Ofen, am Schluss kommt er dampfend
 *   wieder heraus.
 * - Dessert: zum Start rührt ein Schwingbesen Creme im Bräter, am Schluss
 *   plumpst eine Sahnehaube mit Kirsche auf die Coupe. Wird es gebacken
 *   (Apfelwähe), geht am Schluss der Ofen auf.
 * - Alles andere: der Bräter mit Kochlöffel, am Schluss hebt sich der Deckel.
 *
 * Ein Ofen-Rezept ist eines, bei dem wirklich etwas im Ofen gart: ein Schritt
 * nennt Ofen, Backen oder Gratinieren und dauert mindestens zehn Minuten.
 * Brötchen vier Minuten aufbacken macht aus einem Burger kein Ofengericht.
 */

import { matchDishCategory, type Recipe } from './types';
import { durationFromText } from './recipeImport';

export type AnimationsMotiv = 'braeter' | 'ofen' | 'besen' | 'dessert';

const OFEN =
  /(back)?ofen|(?<!aus)backen|gebacken|gratinier|überback|umluft|ober-?\s*\/\s*unterhitze|\boven\b|\bbak(e|ing)\b|\broast/i;
const OFEN_MIN_SEKUNDEN = 10 * 60;

export function kommtAusDemOfen(recipe: Pick<Recipe, 'steps'>): boolean {
  return (recipe.steps ?? []).some(
    (step) => OFEN.test(step.text) && (step.durationSec ?? durationFromText(step.text) ?? 0) >= OFEN_MIN_SEKUNDEN,
  );
}

export function istDessert(recipe: Pick<Recipe, 'category'>): boolean {
  return matchDishCategory(recipe.category) === 'dessert';
}

export function animationsMotiv(
  recipe: Pick<Recipe, 'steps' | 'category'>,
  auftritt: 'start' | 'fertig',
): AnimationsMotiv {
  const ofen = kommtAusDemOfen(recipe);
  const dessert = istDessert(recipe);
  if (auftritt === 'start') return dessert ? 'besen' : ofen ? 'ofen' : 'braeter';
  return ofen ? 'ofen' : dessert ? 'dessert' : 'braeter';
}
