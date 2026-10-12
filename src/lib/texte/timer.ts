/** Texte: Schritt-Timer. Deutsch zuerst, Englisch mit derselben Form. */
import type { Form } from './form';

const de = {
  /** Beschriftung, wenn der Kochmodus keine eigene mitgibt. */
  timer: 'Timer',
  zeitUm: 'Zeit ist um',
  fertig: 'Fertig',
  zuruecksetzen: 'Timer zurücksetzen',
  pausieren: 'Timer pausieren',
  starten: 'Timer starten',
  pause: 'Pause',
  start: 'Start',
};

const en: Form<typeof de> = {
  timer: 'Timer',
  zeitUm: 'Time’s up',
  fertig: 'Done',
  zuruecksetzen: 'Reset timer',
  pausieren: 'Pause timer',
  starten: 'Start timer',
  pause: 'Pause',
  start: 'Start',
};

export const timer = { de, en };
