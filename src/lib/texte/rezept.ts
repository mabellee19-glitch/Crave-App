/** Texte: rezept (Rezeptblatt). */

const de = {
  /** Titel des Blatts, wenn das Rezept keinen Namen hat. */
  rezept: 'Rezept',
  ohneNamen: 'Ohne Namen',
  startCooking: 'Start Cooking',
  ausCookNextEntfernen: 'Aus Cook Next entfernen',
  zuCookNextHinzufuegen: 'Zu Cook Next hinzufügen',
  bearbeiten: 'Rezept bearbeiten',
  basis: (n: number) => `Basis: ${n} ${n === 1 ? 'Portion' : 'Portionen'}`,
  zutaten: 'Zutaten',
  portionWeniger: 'Eine Portion weniger',
  portionMehr: 'Eine Portion mehr',
  keineZutaten: 'Noch keine Zutaten erfasst.',
  geplant: 'Für die nächsten Tage geplant – die Zutaten stehen in der Beute.',
  zumEinkauf: 'Zur Beute hinzufügen',
  zubereitung: 'Zubereitung',
  vorbereitungPlus: 'Vorbereitung + ',
  vorbereitung: 'Vorbereitung',
  /** Gleich wie ABMESSEN in lib/prep.ts – dort bleibt der Wert fuer die Logik. */
  abmessen: 'Alle Zutaten abmessen und bereitstellen',
  /** Hinweis ohne Schritte: fett, Text, dann der Knopfname kursiv und der Rest. */
  keineSchritte: 'Noch keine Zubereitungsschritte erfasst.',
  keineSchritteText:
    'Deshalb lässt sich der Kochmodus nicht starten. Für die mitgelieferten Rezepte sind Zubereitung und Zutaten hinterlegt – was hier fehlt, lässt sich daraus nachtragen. Eigenes bleibt unverändert; sonst über',
  keineSchritteKnopf: 'Bearbeiten',
  keineSchritteSchluss: ' selbst eintragen.',
  ausVorlage: 'Aus der Vorlage nachtragen',
  uebersetzt: 'Aus dem Englischen übersetzt.',
  englischNichtUebersetzt: 'Dieses Rezept ist auf Englisch. Die KI konnte es nicht übersetzen.',
  englischWirdUebersetzt:
    'Dieses Rezept ist auf Englisch. Die App übersetzt es von selbst, sobald die KI erreichbar ist.',
  gekuerztKi: 'Die Schritte wurden mit KI gekürzt.',
  gekuerztRegeln: 'Lange Schritte wurden in kurze aufgeteilt.',
  originalWiederherstellen: 'Original wiederherstellen',
  loeschen: 'Rezept löschen',
  loeschenFrage: 'Rezept löschen?',
  loeschenText: (name: string) =>
    `„${name}“ wird auf allen Geräten entfernt. Das lässt sich nicht rückgängig machen.`,
};

export const rezept = de;
