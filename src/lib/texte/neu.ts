/** Texte: Was kommt dazu? (NewSheet). Deutsch zuerst, Englisch mit derselben Form. */
import type { Form } from './form';

const de = {
  titel: 'Was kommt dazu?',
  /** Die vier Wege, in der Reihenfolge des Blatts. */
  wege: {
    link: {
      titel: 'Rezept über Link',
      text: 'Link einer Rezeptseite einfügen. Die Schritte werden kurz und einfach.',
    },
    text: {
      titel: 'Rezept aus Text',
      text: 'Text aus Claude, ChatGPT, einer Nachricht oder Notiz einfügen – Crave macht ein Rezept daraus.',
    },
    rezept: {
      titel: 'Rezept selbst schreiben',
      text: 'Zutaten, Vorbereitung und Schritte – mit Timern.',
    },
    idee: {
      titel: 'Nur eine Idee',
      text: 'Name und ein paar Zutaten. Kommt auf Cook Next und in die Beute.',
    },
  },
  ausbauen:
    'Eine Idee lässt sich später mit einem Tipp zum Rezept ausbauen – sie bleibt dabei derselbe Eintrag.',
};

const en: Form<typeof de> = {
  titel: 'What are you adding?',
  wege: {
    link: {
      titel: 'Recipe from a link',
      text: 'Paste a link to a recipe page. The steps are kept short and simple.',
    },
    text: {
      titel: 'Recipe from text',
      text: 'Paste text from Claude, ChatGPT, a message or a note – Crave turns it into a recipe.',
    },
    rezept: {
      titel: 'Write your own recipe',
      text: 'Ingredients, prep and steps – with timers.',
    },
    idee: {
      titel: 'Just an idea',
      text: 'A name and a few ingredients. Goes on Cook Next and into Groceries.',
    },
  },
  ausbauen: 'An idea can be turned into a full recipe later with one tap – it stays the same entry.',
};

export const neu = { de, en };
