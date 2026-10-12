/** Texte: Zutatenliste im Formular. Deutsch zuerst, Englisch mit derselben Form. */
import type { Form } from './form';

const de = {
  menge: (i: number) => `Menge für Zutat ${i}`,
  einheit: (i: number) => `Einheit für Zutat ${i}`,
  name: (i: number) => `Name für Zutat ${i}`,
  entfernen: (i: number) => `Zutat ${i} entfernen`,
  platzhalterMenge: '400',
  platzhalterEinheit: 'g',
  platzhalterName: 'Zutat',
  hinzufuegen: 'Zutat hinzufügen',
  vorschlaege: (name: string) => `Mengen für ${name}`,
  nehmen: (menge: string) => `${menge} nehmen`,
  kiDenkt: 'Die KI sucht eine passende Menge …',
};

const en: Form<typeof de> = {
  menge: (i: number) => `Amount for ingredient ${i}`,
  einheit: (i: number) => `Unit for ingredient ${i}`,
  name: (i: number) => `Name of ingredient ${i}`,
  entfernen: (i: number) => `Remove ingredient ${i}`,
  platzhalterMenge: '400',
  platzhalterEinheit: 'g',
  platzhalterName: 'Ingredient',
  hinzufuegen: 'Add ingredient',
  vorschlaege: (name: string) => `Amounts for ${name}`,
  nehmen: (menge: string) => `Use ${menge}`,
  kiDenkt: 'Finding a typical amount …',
};

export const zutatenEditor = { de, en };
