/**
 * Texte: Bausteine aus ui.tsx und die Suchleiste. Schliessen und Abbrechen
 * kommen aus allgemein. Deutsch zuerst, Englisch mit derselben Form.
 */
import type { Form } from './form';

const de = {
  sucheLoeschen: 'Suche löschen',
};

const en: Form<typeof de> = {
  sucheLoeschen: 'Clear search',
};

export const ui = { de, en };
