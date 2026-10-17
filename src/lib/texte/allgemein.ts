/** Texte, die ueberall vorkommen. */

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

export const allgemein = de;
