/** Texte, die ueberall vorkommen. Deutsch zuerst, Englisch mit derselben Form. */
import type { Form } from './form';

const de = {
  speichern: 'Speichern',
  abbrechen: 'Abbrechen',
  loeschen: 'Löschen',
  schliessen: 'Schliessen',
  hinzufuegen: 'Hinzufügen',
  /** Die beiden Bereiche der App. */
  bereichRezepte: 'Gelüste',
  bereichEinkauf: 'Beute',
  zutat: (n: number) => (n === 1 ? 'Zutat' : 'Zutaten'),
  rezepte: (n: number) => (n === 1 ? 'Rezept' : 'Rezepte'),
  ideen: (n: number) => (n === 1 ? 'Idee' : 'Ideen'),
  portionen: (n: number) => (n === 1 ? 'Portion' : 'Portionen'),
  schritte: (n: number) => (n === 1 ? 'Schritt' : 'Schritte'),
  minuten: 'Min',
  kategorie: {
    'high-protein': 'High-Protein',
    comfort: 'Comfort',
    vegi: 'Vegi',
    dessert: 'Dessert',
  } as Record<string, string>,
};

const en: Form<typeof de> = {
  speichern: 'Save',
  abbrechen: 'Cancel',
  loeschen: 'Delete',
  schliessen: 'Close',
  hinzufuegen: 'Add',
  bereichRezepte: 'Cravings',
  bereichEinkauf: 'Groceries',
  zutat: (n: number) => (n === 1 ? 'ingredient' : 'ingredients'),
  rezepte: (n: number) => (n === 1 ? 'recipe' : 'recipes'),
  ideen: (n: number) => (n === 1 ? 'idea' : 'ideas'),
  portionen: (n: number) => (n === 1 ? 'serving' : 'servings'),
  schritte: (n: number) => (n === 1 ? 'step' : 'steps'),
  minuten: 'min',
  kategorie: {
    'high-protein': 'High-Protein',
    comfort: 'Comfort',
    vegi: 'Veggie',
    dessert: 'Dessert',
  },
};

export const allgemein = { de, en };
