/** Texte: Einstieg, bevor der Datenraum geladen ist (Bootstrap). Deutsch zuerst, Englisch mit derselben Form. */
import type { Form } from './form';

const de = {
  laden: 'Küche wird vorbereitet…',
  ohneJavaScript: 'Bitte aktiviere JavaScript, um Crave zu benutzen.',
};

const en: Form<typeof de> = {
  laden: 'Getting the kitchen ready…',
  ohneJavaScript: 'Please enable JavaScript to use Crave.',
};

export const start = { de, en };
