/** Texte: rezept (Rezeptblatt). Deutsch zuerst, Englisch mit derselben Form. */
import type { Form } from './form';

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

const en: Form<typeof de> = {
  rezept: 'Recipe',
  ohneNamen: 'Untitled',
  startCooking: 'Start Cooking',
  ausCookNextEntfernen: 'Remove from Cook Next',
  zuCookNextHinzufuegen: 'Add to Cook Next',
  bearbeiten: 'Edit recipe',
  basis: (n: number) => `Serves ${n}`,
  zutaten: 'Ingredients',
  portionWeniger: 'One fewer serving',
  portionMehr: 'One more serving',
  keineZutaten: 'No ingredients yet.',
  geplant: 'Planned for the next few days – the ingredients are in Groceries.',
  zumEinkauf: 'Add to Groceries',
  zubereitung: 'Directions',
  vorbereitungPlus: 'Prep + ',
  vorbereitung: 'Prep',
  abmessen: 'Measure and set out all ingredients',
  keineSchritte: 'No steps yet.',
  keineSchritteText:
    'That’s why cook mode can’t start. The built-in recipes come with steps and ingredients – anything missing here can be filled in from them. Your own entries stay as they are; otherwise use',
  keineSchritteKnopf: 'Edit',
  keineSchritteSchluss: ' to add them yourself.',
  ausVorlage: 'Fill in from template',
  uebersetzt: 'Translated from English.',
  englischNichtUebersetzt: 'This recipe is in English. The AI couldn’t translate it.',
  englischWirdUebersetzt:
    'This recipe is in English. The app will translate it automatically once the AI is available.',
  gekuerztKi: 'The steps were shortened with AI.',
  gekuerztRegeln: 'Long steps were split into shorter ones.',
  originalWiederherstellen: 'Restore original',
  loeschen: 'Delete recipe',
  loeschenFrage: 'Delete recipe?',
  loeschenText: (name: string) =>
    `“${name}” will be removed from all devices. This can’t be undone.`,
};

export const rezept = { de, en };
