/** Texte: Vorschlaege beim Tippen eines Zutatennamens. Deutsch zuerst, Englisch mit derselben Form. */
import type { Form } from './form';

const de = {
  liste: 'Vorschläge',
};

const en: Form<typeof de> = {
  liste: 'Suggestions',
};

export const autocomplete = { de, en };
