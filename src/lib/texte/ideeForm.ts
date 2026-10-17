/** Texte: Formular fuer eine Idee (DishForm). */

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

export const ideeForm = de;
