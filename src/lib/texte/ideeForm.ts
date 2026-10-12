/** Texte: Formular fuer eine Idee (DishForm). Deutsch zuerst, Englisch mit derselben Form. */
import type { Form } from './form';

const de = {
  neu: 'Neue Idee',
  bearbeiten: 'Idee bearbeiten',
  name: 'Name',
  namePlatzhalter: 'z. B. Skyr-Bowl mit Beeren',
  kategorie: 'Kategorie',
  automatischErkannt: (grund: string) => `Automatisch erkannt: ${grund}`,
  zutaten: 'Zutaten',
  spalten: 'Menge · Einheit · Zutat',
  zutatenHinweis: 'Kommt die Idee auf Cook Next, wandern diese Zutaten in die Beute.',
  notiz: 'Notiz',
  notizPlatzhalter: 'Optional: Idee, Beilage, Erinnerung',
  loeschen: 'Idee löschen',
  loeschenFrage: 'Idee löschen?',
  loeschenText: (name: string) => `„${name}“ wird auf allen Geräten entfernt.`,
};

const en: Form<typeof de> = {
  neu: 'New idea',
  bearbeiten: 'Edit idea',
  name: 'Name',
  namePlatzhalter: 'e.g. Skyr bowl with berries',
  kategorie: 'Category',
  automatischErkannt: (grund: string) => `Detected automatically: ${grund}`,
  zutaten: 'Ingredients',
  spalten: 'Amount · Unit · Ingredient',
  zutatenHinweis: 'When the idea goes on Cook Next, these ingredients move to Groceries.',
  notiz: 'Note',
  notizPlatzhalter: 'Optional: idea, side dish, reminder',
  loeschen: 'Delete idea',
  loeschenFrage: 'Delete idea?',
  loeschenText: (name: string) => `“${name}” will be removed from all devices.`,
};

export const ideeForm = { de, en };
