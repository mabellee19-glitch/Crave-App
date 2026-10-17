/** Texte: Zutatenliste im Formular. */

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

export const zutatenEditor = de;
