/**
 * Englische Rezepte auf Deutsch – was rund um die KI passiert.
 *
 * Die KI (recipeAi.ts) bekommt Listen von Texten und gibt sie in derselben
 * Form zurueck. Hier wird ein Rezept in diese Listen zerlegt und die
 * Uebersetzung wieder an genau die Stellen gesetzt, von denen sie kam: die
 * dritte Zutat bleibt die dritte, mit ihrer Id. So bleibt alles, was am
 * Rezept haengt – Cook Next, Timer, "Original wiederherstellen" – stehen.
 *
 * Laeuft auf dem Server (Import) wie im Browser (Durchgang beim Start).
 */

import type { Recipe } from './types';
import { ImportedRecipe, durationFromText, parseIngredientLine } from './recipeImport';
import { istEnglisch, rezeptTexte } from './sprache';
import { ohneEszett } from './aufraeumen';

/** Was uebersetzt wird – und in derselben Form zurueckkommt. */
export interface Uebersetzung {
  name: string;
  /** Eine Zeile pro Zutat, z. B. "2 cups flour". */
  zutaten: string[];
  schritte: string[];
  vorbereitung: string[];
  /** Die Schritte vor dem Kuerzen, falls es sie gibt – fuer "Original wiederherstellen". */
  originalSchritte: string[];
  originalVorbereitung: string[];
}

/** "2 cups flour" – Menge, Einheit, Name, wie es in einem Rezept stuende. */
export function zutatAlsZeile(zutat: { amount: number | null; unit: string; name: string }): string {
  const menge = zutat.amount == null ? '' : String(Math.round(zutat.amount * 1000) / 1000);
  return [menge, zutat.unit, zutat.name].join(' ').replace(/\s+/g, ' ').trim();
}

/** Eine uebersetzte Zeile wieder in Menge, Einheit und Name. */
function zutatAusZeile(zeile: string): { name: string; amount: number | null; unit: string } {
  return parseIngredientLine(zeile);
}

/* ------------------------------- Import ---------------------------------- */

export function importAuftrag(rezept: ImportedRecipe): Uebersetzung {
  return {
    name: rezept.name,
    zutaten: rezept.ingredients.map(zutatAlsZeile),
    schritte: rezept.steps.map((schritt) => schritt.text),
    vorbereitung: [],
    originalSchritte: [],
    originalVorbereitung: [],
  };
}

export function importUebersetzt(rezept: ImportedRecipe, ergebnis: Uebersetzung): ImportedRecipe {
  return {
    ...rezept,
    name: ergebnis.name,
    ingredients: ergebnis.zutaten.map(zutatAusZeile).filter((zutat) => zutat.name),
    steps: ergebnis.schritte.map((text, index) => ({
      text,
      durationSec: durationFromText(text) ?? rezept.steps[index]?.durationSec ?? null,
    })),
    uebersetztAus: 'en',
    sprache: undefined,
    kiFehler: undefined,
  };
}

export function importIstEnglisch(rezept: ImportedRecipe): boolean {
  return istEnglisch(rezeptTexte(rezept));
}

/* ------------------------- Gespeicherte Rezepte -------------------------- */

/**
 * Ein englisches Rezept, das noch auf seine Uebersetzung wartet. Hat die KI
 * es schon einmal versucht und kein brauchbares Ergebnis geliefert, wird
 * nicht nochmal gefragt.
 */
export function brauchtUebersetzung(recipe: Recipe): boolean {
  if (recipe.deleted || recipe.uebersetztAus || recipe.uebersetzungVersuch) return false;
  return istEnglisch(rezeptTexte(recipe));
}

const mitText = <T extends { text: string }>(liste: T[]): T[] => liste.filter((eintrag) => eintrag.text.trim());

export function rezeptAuftrag(recipe: Recipe): Uebersetzung {
  return {
    name: recipe.name,
    zutaten: recipe.ingredients.filter((zutat) => zutat.name.trim()).map(zutatAlsZeile),
    schritte: mitText(recipe.steps).map((step) => step.text),
    vorbereitung: (recipe.prep ?? []).filter((aufgabe) => aufgabe.trim()),
    originalSchritte: mitText(recipe.vorKuerzen?.steps ?? []).map((step) => step.text),
    originalVorbereitung: (recipe.vorKuerzen?.prep ?? []).filter((aufgabe) => aufgabe.trim()),
  };
}

/**
 * Die Uebersetzung an das Rezept setzen. `null`, wenn sie nicht zum Rezept
 * passt – dann hat sich das Rezept seit der Anfrage geaendert.
 */
export function uebersetzungAnwenden(recipe: Recipe, ergebnis: Uebersetzung): Recipe | null {
  const auftrag = rezeptAuftrag(recipe);
  const passt = (['zutaten', 'schritte', 'vorbereitung', 'originalSchritte', 'originalVorbereitung'] as const).every(
    (liste) => ergebnis[liste].length === auftrag[liste].length,
  );
  if (!passt) return null;

  let zutat = 0;
  const ingredients = recipe.ingredients.map((eintrag) => {
    if (!eintrag.name.trim()) return eintrag;
    const neu = zutatAusZeile(ergebnis.zutaten[zutat++]);
    return { ...eintrag, name: neu.name || eintrag.name, amount: neu.amount, unit: neu.unit };
  });

  const schritteMit = <T extends { text: string; durationSec: number | null }>(liste: T[], texte: string[]): T[] => {
    let index = 0;
    return liste.map((step) => {
      if (!step.text.trim()) return step;
      const text = texte[index++];
      return { ...step, text, durationSec: step.durationSec ?? durationFromText(text) };
    });
  };

  return {
    ...recipe,
    name: ohneEszett(ergebnis.name),
    ingredients,
    steps: schritteMit(recipe.steps, ergebnis.schritte),
    prep: recipe.prep ? ergebnis.vorbereitung : recipe.prep,
    vorKuerzen: recipe.vorKuerzen
      ? {
          steps: schritteMit(recipe.vorKuerzen.steps, ergebnis.originalSchritte),
          prep: ergebnis.originalVorbereitung,
        }
      : recipe.vorKuerzen,
    uebersetztAus: 'en',
  };
}
