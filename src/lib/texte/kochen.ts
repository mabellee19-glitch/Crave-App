/** Texte: kochen (Kochmodus). */

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

export const kochen = de;
