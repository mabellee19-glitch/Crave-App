/** Texte: kochen (Kochmodus). Deutsch zuerst, Englisch mit derselben Form. */
import type { Form } from './form';

const de = {
  beenden: 'Kochmodus beenden',
  keinSchritt: 'Kein Schritt hinterlegt',
  keineSchritte: 'Für dieses Rezept sind noch keine Zubereitungsschritte erfasst.',
  zurueckZumRezept: 'Zurück zum Rezept',
  /** Titel der Schlussanimation. */
  enGuete: 'En Guete!',
  zuSchrittMitTimer: (n: number) => `Zu Schritt ${n} mit laufendem Timer`,
  schritt: (n: number) => `Schritt ${n}`,
  /** Timer im Hintergrund, der abgelaufen ist. */
  timerFertig: 'fertig',
  vorbereitung: 'Vorbereitung',
  vorbereitungText: 'Erst schnibbeln und abmessen – dann geht’s am Herd ohne Hektik.',
  schneiden: 'Schneiden & bereitlegen',
  abmessen: 'Abmessen',
  schrittVon: (i: number, n: number) => `Schritt ${i} von ${n}`,
  zutatenSchritt: 'Zutaten für diesen Schritt',
  dafuer: 'Dafür brauchst du',
  zurueck: 'Zurück',
  fertigGekocht: 'Fertig gekocht',
  losGehts: 'Los geht’s',
  weiter: 'Weiter',
};

const en: Form<typeof de> = {
  beenden: 'Exit cook mode',
  keinSchritt: 'No steps yet',
  keineSchritte: 'This recipe doesn’t have any steps yet.',
  zurueckZumRezept: 'Back to recipe',
  enGuete: 'Enjoy!',
  zuSchrittMitTimer: (n: number) => `Go to step ${n} with running timer`,
  schritt: (n: number) => `Step ${n}`,
  timerFertig: 'done',
  vorbereitung: 'Prep',
  vorbereitungText: 'Chop and measure first – then there’s no rush at the stove.',
  schneiden: 'Chop & set out',
  abmessen: 'Measure',
  schrittVon: (i: number, n: number) => `Step ${i} of ${n}`,
  zutatenSchritt: 'Ingredients for this step',
  dafuer: 'You’ll need',
  zurueck: 'Back',
  fertigGekocht: 'Done cooking',
  losGehts: 'Let’s go',
  weiter: 'Next',
};

export const kochen = { de, en };
