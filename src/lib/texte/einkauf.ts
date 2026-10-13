/** Texte: Einkaufsliste (Beute / Groceries). Deutsch zuerst, Englisch mit derselben Form. */
import type { Form } from './form';

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
  /** Die Rubriken der Grundliste, wie sie gespeichert sind. */
  rubriken: {} as Record<string, string>,
};

const en: Form<typeof de> = {
  offen: (n: number) =>
    n === 0 ? 'Nothing left – tap a staple below.' : `${n} ${n === 1 ? 'item' : 'items'} to buy`,
  geplant: (n: number) => `${n} ${n === 1 ? 'meal' : 'meals'} planned`,
  eingabe: 'Add an item to Groceries',
  eingabePlatzhalter: 'e.g. 400 g chicken',
  hinzufuegen: 'Add',
  alleErledigt: 'All done',
  leer: 'Your list is empty. Items land here when you type them above, tap a staple below or add a recipe.',
  fuer: (namen: string) => `for ${namen}`,
  standard: 'Staples',
  standardSub: (n: number) =>
    n === 0 ? 'All of them are on Groceries right now' : `${n} ready – tap one to add it to Groceries`,
  standardKurz: 'Staple',
  verwalten: 'Manage',
  grundlisteHinweis:
    'Add the things you buy again and again. Tap one to put it on your Groceries – once checked off, it comes back here.',
  alleInListe: 'All your staples are on Groceries right now.',
  inListe: (name: string) => `Add ${name} to Groceries`,
  leerTitel: 'Nothing set up yet',
  leerText: 'Add an item above or set up your staples.',
  abhakenTitel: 'Check off everything?',
  abhakenText: 'Everything on the list is marked as bought. Staples go back to your staples list.',
  verwaltenTitel: 'Manage staples',
  verwaltenHinweis: 'These stay saved for good – no matter what is on Groceries right now.',
  neueStandard: 'New staple',
  rubrikNeu: 'Section for the new staple',
  ohneRubrik: 'No section',
  vorschlagsliste: 'Add suggested staples',
  vorschlagslisteHinweis:
    'Adds missing suggested staples and sorts existing ones without a section. Nothing you have is changed.',
  nochKeine: 'No staples yet.',
  einheitPlatzhalter: 'Unit',
  menge: 'Amount',
  name: 'Name',
  rubrik: 'Section',
  loeschen: 'Delete',
  fertig: 'Done',
  bearbeiten: (name: string) => `Edit ${name}`,
  mengeVon: (name: string) => `Amount for ${name}`,
  einheitVon: (name: string) => `Unit for ${name}`,
  nameVon: (name: string) => `Name of ${name}`,
  rubrikVon: (name: string) => `Section of ${name}`,
  loeschenAus: (name: string) => `Delete ${name} from staples`,
  rubriken: {
    Protein: 'Protein',
    'Frisches Gemüse/Früchte': 'Fresh produce',
    Dosenware: 'Canned',
    'Im Glas': 'Jars',
    Zmorge: 'Breakfast',
    Einfrieren: 'Freezer',
    Carbs: 'Carbs',
    Vorrat: 'Pantry',
    Weitere: 'Other',
  },
};

export const einkauf = { de, en };
