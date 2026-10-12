/** Texte: Ansicht einer Idee (IdeaDetail). Deutsch zuerst, Englisch mit derselben Form. */
import type { Form } from './form';

const de = {
  idee: 'Idee',
  ohneNamen: 'Ohne Namen',
  bearbeiten: 'Idee bearbeiten',
  aufCookNext: 'Auf Cook Next',
  vonCookNext: 'Von Cook Next nehmen',
  zutaten: 'Zutaten',
  keineZutaten: 'Noch keine Zutaten – über den Stift oben lassen sie sich eintragen.',
  geplant: 'Für die nächsten Tage geplant – die Zutaten stehen in der Beute.',
  keineAnleitung: 'Noch keine Anleitung.',
  rezeptDaraus:
    'Mach ein Rezept daraus: Name und Zutaten sind schon eingetragen, es fehlen nur noch die Schritte – oder ein Link zu einer Rezeptseite.',
  rezeptMachen: 'Rezept daraus machen',
};

const en: Form<typeof de> = {
  idee: 'Idea',
  ohneNamen: 'Untitled',
  bearbeiten: 'Edit idea',
  aufCookNext: 'Add to Cook Next',
  vonCookNext: 'Remove from Cook Next',
  zutaten: 'Ingredients',
  keineZutaten: 'No ingredients yet – add them with the pencil above.',
  geplant: 'Planned for the next few days – the ingredients are in Groceries.',
  keineAnleitung: 'No instructions yet.',
  rezeptDaraus:
    'Turn it into a recipe: the name and ingredients are already filled in, only the steps are missing – or a link to a recipe page.',
  rezeptMachen: 'Make it a recipe',
};

export const idee = { de, en };
