/** Texte: essen (Liste der Rezepte und Ideen). */

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

export const essen = de;
