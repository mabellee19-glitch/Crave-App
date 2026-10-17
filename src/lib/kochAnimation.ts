/**
 * Welches Bild der Kochmodus zeigt – zum Start und am Schluss.
 *
 * - Aus dem Ofen: der Retro-Herd geht an, am Schluss klappt die Tür auf und
 *   es dampft heraus.
 * - Gebraten (Saltimbocca, Schnitzel, Gyoza): die Bratpfanne brutzelt, am
 *   Schluss wird ein Plätzli gewendet.
 * - Dessert: zum Start die Rührschüssel mit Schwingbesen, am Schluss
 *   Puderzucker über der Wähe. Wird es gebacken, geht am Schluss der Ofen auf.
 * - Alles andere – Saucen, Suppen, Currys, Eintöpfe: der Bräter mit
 *   Kochlöffel, am Schluss hebt sich der Deckel.
 *
 * Ein Ofen-Rezept ist eines, bei dem wirklich etwas im Ofen gart: ein Schritt
 * nennt Ofen, Backen oder Gratinieren und dauert mindestens zehn Minuten.
 * Brötchen vier Minuten aufbacken macht aus einem Burger kein Ofengericht.
 *
 * Ob gebraten oder gekocht wird, zählen die Wörter in den Schritten: Pfanne,
 * braten, wenden gegen Topf, köcheln, Sauce, Suppe. Der Name gibt den
 * Ausschlag, wenn er es sagt – eine Suppe bleibt im Bräter, auch wenn die
 * Zwiebeln vorher angebraten werden.
 */

import { matchDishCategory, type Recipe } from './types';
import { durationFromText } from './recipeImport';

export type AnimationsMotiv = 'braeter' | 'pfanne' | 'ofen' | 'besen' | 'dessert';

const OFEN =
  /(back)?ofen|(?<!aus)backen|gebacken|gratinier|überback|umluft|ober-?\s*\/\s*unterhitze|\boven\b|\bbak(e|ing)\b|\broast/i;
const OFEN_MIN_SEKUNDEN = 10 * 60;

const PFANNE_WORTE = /pfanne|braten|brutzel|sautier|wenden|goldbraun|knusprig|kross|\bfry|\bfried|\bsear|skillet/gi;
const TOPF_WORTE =
  /topf|bräter|cocotte|köcheln|simmer|aufkochen|einkochen|schmoren|suppe|sauce|sosse|brühe|bouillon|eintopf|\bcurry\b|risotto|\bdal\b|kochen lassen|\bboil|\bstew|\bsoup/gi;
const PFANNE_IM_NAMEN =
  /saltimbocca|schnitzel|plätzli|steak|burger|rösti|omelett|spiegelei|rührei|pfannkuchen|crêpe|bratkartoffel|gebraten|tätschli|frikadelle|gyoza|halloumi|pfanne|fried|pancake/i;
// "mit Honig-Senf-Sauce" sagt nichts – gebraten wird der Halloumi trotzdem.
const TOPF_IM_NAMEN =
  /suppe|curry|\bdal\b|eintopf|risotto|gulasch|ragout|chili|orzo|stroganoff|geschnetzeltes|shakshuka|mac and cheese|pasta|nudeln|spaghetti|penne|soup|stew/i;

export function kommtAusDemOfen(recipe: Pick<Recipe, 'steps'>): boolean {
  return (recipe.steps ?? []).some(
    (step) => OFEN.test(step.text) && (step.durationSec ?? durationFromText(step.text) ?? 0) >= OFEN_MIN_SEKUNDEN,
  );
}

/** Wird es vor allem in der Pfanne gebraten – und nicht in Sauce oder Suppe gekocht? */
export function wirdGebraten(recipe: Pick<Recipe, 'steps' | 'name'>): boolean {
  const name = recipe.name ?? '';
  if (TOPF_IM_NAMEN.test(name)) return false;
  if (PFANNE_IM_NAMEN.test(name)) return true;
  const text = (recipe.steps ?? []).map((step) => step.text).join(' ');
  const pfanne = text.match(PFANNE_WORTE)?.length ?? 0;
  const topf = text.match(TOPF_WORTE)?.length ?? 0;
  return pfanne > topf;
}

export function istDessert(recipe: Pick<Recipe, 'category'>): boolean {
  return matchDishCategory(recipe.category) === 'dessert';
}

export function animationsMotiv(
  recipe: Pick<Recipe, 'steps' | 'category'> & { name?: string },
  auftritt: 'start' | 'fertig',
): AnimationsMotiv {
  const ofen = kommtAusDemOfen(recipe);
  const dessert = istDessert(recipe);
  const pfanne = !ofen && wirdGebraten({ steps: recipe.steps, name: recipe.name ?? '' });
  if (auftritt === 'start') return dessert ? 'besen' : ofen ? 'ofen' : pfanne ? 'pfanne' : 'braeter';
  return ofen ? 'ofen' : dessert ? 'dessert' : pfanne ? 'pfanne' : 'braeter';
}
