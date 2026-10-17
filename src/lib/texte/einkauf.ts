/** Texte: Einkaufsliste (Beute). */

const de = {
  offen: (n: number) =>
    n === 0 ? 'Nichts offen – tippe unten auf eine Standard-Zutat.' : `${n} ${n === 1 ? 'Zutat' : 'Zutaten'} offen`,
  geplant: (n: number) => `${n} ${n === 1 ? 'Gericht' : 'Gerichte'} geplant`,
  eingabe: 'Zutat zur Beute hinzufügen',
  eingabePlatzhalter: 'z. B. 400 g Poulet',
  hinzufuegen: 'Hinzufügen',
  alleErledigt: 'Alle erledigt',
  leer: 'Die Liste ist leer. Zutaten kommen hierher, wenn du sie oben eingibst, unten aus der Grundliste antippst oder ein Rezept hinzufügst.',
  fuer: (namen: string) => `für ${namen}`,
  standard: 'Standard-Zutaten',
  standardSub: (n: number) =>
    n === 0 ? 'Alle liegen gerade in der Beute' : `${n} bereit – ein Tipp legt sie in die Beute`,
  standardKurz: 'Standard',
  verwalten: 'Verwalten',
  grundlisteHinweis:
    'Lege Zutaten an, die du immer wieder kaufst. Ein Tipp darauf legt sie in die Beute – nach dem Abhaken sind sie wieder hier.',
  alleInListe: 'Alle Standard-Zutaten liegen gerade in der Beute.',
  inListe: (name: string) => `${name} zur Beute`,
  leerTitel: 'Noch nichts eingerichtet',
  leerText: 'Füge oben eine Zutat hinzu oder lege deine Standard-Zutaten an.',
  abhakenTitel: 'Alles abhaken?',
  abhakenText:
    'Alle Zutaten der aktiven Liste werden als gekauft markiert. Standard-Zutaten wandern zurück in die Grundliste.',
  verwaltenTitel: 'Grundliste verwalten',
  verwaltenHinweis:
    'Diese Zutaten bleiben dauerhaft gespeichert – unabhängig davon, was gerade in der Beute steht.',
  neueStandard: 'Neue Standard-Zutat',
  rubrikNeu: 'Rubrik für die neue Zutat',
  ohneRubrik: 'Ohne Rubrik',
  vorschlagsliste: 'Vorschlagsliste ergänzen',
  vorschlagslisteHinweis:
    'Trägt fehlende Standard-Zutaten nach und ordnet vorhandene ohne Rubrik ein. Was schon da ist, bleibt unverändert.',
  nochKeine: 'Noch keine Standard-Zutaten.',
  einheitPlatzhalter: 'Einheit',
  menge: 'Menge',
  name: 'Name',
  rubrik: 'Rubrik',
  loeschen: 'Löschen',
  fertig: 'Fertig',
  bearbeiten: (name: string) => `${name} bearbeiten`,
  mengeVon: (name: string) => `Menge für ${name}`,
  einheitVon: (name: string) => `Einheit für ${name}`,
  nameVon: (name: string) => `Name von ${name}`,
  rubrikVon: (name: string) => `Rubrik von ${name}`,
  loeschenAus: (name: string) => `${name} aus der Grundliste löschen`,
};

export const einkauf = de;
