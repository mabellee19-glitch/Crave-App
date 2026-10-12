/** Texte: essen (Liste der Rezepte und Ideen). Deutsch zuerst, Englisch mit derselben Form. */
import type { Form } from './form';

const de = {
  suchen: 'Gericht oder Zutat suchen',
  suchenLabel: 'Rezepte und Ideen durchsuchen',
  filtern: 'Gelüste filtern',
  alle: 'Alle',
  cookNext: 'Cook Next',
  leerTitel: 'Noch nichts gespeichert',
  nichtsGefunden: 'Nichts gefunden',
  leerText: 'Leg ein Rezept an oder halte eine Idee fest – mit dem Plus oben.',
  anpassen: 'Passe die Suche oder den Filter an.',
  neuAnlegen: 'Neu anlegen',
  /** Kurz auf der Karte: "4 Port." */
  portionenKurz: (n: number) => `${n} ${n === 1 ? 'Portion' : 'Port.'}`,
  ideeZutaten: (n: number) => `Idee · ${n} ${n === 1 ? 'Zutat' : 'Zutaten'}`,
  ideeOhneZutaten: 'Idee · noch ohne Zutaten',
  ausCookNextEntfernen: (name: string) => `${name} aus Cook Next entfernen`,
  zuCookNextHinzufuegen: (name: string) => `${name} zu Cook Next hinzufügen`,
  rezeptOeffnen: (name: string) => `Rezept ${name} öffnen`,
  ideeOeffnen: (name: string) => `Idee ${name} öffnen`,
};

const en: Form<typeof de> = {
  suchen: 'Search dishes or ingredients',
  suchenLabel: 'Search recipes and ideas',
  filtern: 'Filter cravings',
  alle: 'All',
  cookNext: 'Cook Next',
  leerTitel: 'Nothing saved yet',
  nichtsGefunden: 'Nothing found',
  leerText: 'Add a recipe or jot down an idea – just tap the plus at the top.',
  anpassen: 'Try a different search or filter.',
  neuAnlegen: 'Add new',
  portionenKurz: (n: number) => `${n} ${n === 1 ? 'serving' : 'servings'}`,
  ideeZutaten: (n: number) => `Idea · ${n} ${n === 1 ? 'ingredient' : 'ingredients'}`,
  ideeOhneZutaten: 'Idea · no ingredients yet',
  ausCookNextEntfernen: (name: string) => `Remove ${name} from Cook Next`,
  zuCookNextHinzufuegen: (name: string) => `Add ${name} to Cook Next`,
  rezeptOeffnen: (name: string) => `Open recipe ${name}`,
  ideeOeffnen: (name: string) => `Open idea ${name}`,
};

export const essen = { de, en };
