/** Texte: rezeptForm. Deutsch zuerst, Englisch mit derselben Form. */
import type { Form } from './form';

const de = {
  titelNeu: 'Neues Rezept',
  titelBearbeiten: 'Rezept bearbeiten',

  /* Import ueber Link oder eingefuegten Text */
  linkLabel: 'Rezept über Link hinzufügen',
  linkHinweis:
    'Adresse einer Rezeptseite einfügen – Zutaten und Zubereitung werden übernommen, samt Timern. Danach lässt sich alles noch ändern.',
  holen: 'Holen',
  laedt: 'Lädt…',
  textLabel: 'Rezepttext einfügen',
  textHinweis:
    'Auf der Seite das Rezept markieren und kopieren – mit Zutaten und Zubereitung. Auch aus Nachrichten oder Notizen.',
  textPlatzhalter: 'Zutaten\n200 g Mehl\n…\n\nZubereitung\nMehl und …',
  textUebernehmen: 'Text übernehmen',
  textLabelFrei: 'Rezept als Text einfügen',
  textHinweisFrei:
    'Den ganzen Text einfügen, zum Beispiel aus Claude, ChatGPT oder einer Nachricht – mit Titel, Zutaten und Zubereitung, gern mit Tipps. Crave erkennt Portionen, Mengen, Timer und Notizen, auch auf Englisch. Danach lässt sich alles noch ändern.',
  textPlatzhalterFrei:
    'Leichte Lasagne-Röllchen\nFür 4 Personen\n\nZutaten\n• 8 Lasagneblätter\n• 1 EL Olivenöl\n…\n\nZubereitung\n1. Olivenöl erhitzen …\n\nTipps\n…',
  umwandeln: 'In Rezept umwandeln',
  liest: 'Liest…',
  oderText: 'Oder Rezepttext einfügen',
  andererText: 'Anderen Text einfügen',
  keineVerbindungImport: 'Keine Verbindung zum Server. Prüfe die Verbindung.',

  /** Hinweise nach dem Import, werden zu einem Absatz zusammengesetzt. */
  importHinweis: {
    vonKi: 'Die KI hat das Rezept aus dem Text gelesen.',
    vonSeite: 'Zutaten und Schritte sind aus dem Text gelesen, nicht aus Rezeptdaten.',
    vonText: 'Aus deinem Text gelesen: Zutaten, Schritte, Timer und Notiz.',
    uebersetzt: 'Aus dem Englischen übersetzt, Mengen in Gramm, Deziliter und Grad Celsius.',
    pruefen: 'Bitte kurz prüfen, ob alles stimmt.',
    aufEnglisch: (grund: string) =>
      `Das Rezept ist auf Englisch. Die App übersetzt es von selbst, sobald die KI erreichbar ist. ${grund}`,
  },

  /** Fehler der Import-Route. */
  importFehler: {
    einfuegen: 'Kopiere den Text des Rezepts und füge ihn unten ein.',
    keinRezeptImText: (grund: string) =>
      `Im Text war kein Rezept zu erkennen – am besten mit den Überschriften «Zutaten» und «Zubereitung» einfügen. ${grund}`,
    keinRezeptAufSeite: (grund: string, einfuegen: string) =>
      `Auf dieser Seite steht das Rezept in keiner Form, die die App lesen kann. ${grund} ${einfuegen}`,
    nichtGefunden: 'Die Seite gibt es nicht (404). Stimmt die Adresse?',
    gesperrt: (einfuegen: string) => `Die Seite lässt keinen Abruf durch Apps zu. ${einfuegen}`,
    keineWebseite: 'Das ist keine Webseite, sondern eine Datei.',
    zuGross: 'Die Seite ist zu gross.',
    nichtAbrufbar: 'Diese Adresse lässt sich nicht abrufen.',
    adresseFehlt: 'Bitte eine Adresse einfügen.',
    /** `einfuegen` kommt kleingeschrieben, mitten im Satz. */
    nichtGeladen: (einfuegen: string) => `Die Seite liess sich nicht laden. Versuch es nochmal – oder ${einfuegen}`,
  },

  /** Was die KI beim Lesen einer Seite verhindert hat – als halber Satz. */
  kiGrund: {
    billing: 'Mit KI ginge es auch so – dafür fehlt beim Anbieter die Zahlungsangabe (Vercel → AI Gateway).',
    no_key: 'Mit eingerichteter KI ginge es auch so.',
    not_found: 'Auch die KI hat darin kein Rezept gefunden.',
    rate_limit: 'Die KI ist gerade ausgelastet – gleich nochmal versuchen.',
  },

  /** Warum ein englisches Rezept (noch) nicht uebersetzt ist. */
  uebersetzenGrund: {
    billing: 'Dafür fehlt beim Anbieter noch die Zahlungsangabe (Vercel → AI Gateway).',
    no_key: 'Dafür muss die KI eingerichtet sein.',
  },

  /* Vereinfachen mit KI */
  kiFehler: {
    no_key: 'Auf dem Server ist kein Zugang zum Modell eingerichtet.',
    billing: 'Beim Anbieter fehlt die Zahlungsangabe (Vercel → AI Gateway).',
    auth: 'Der hinterlegte Schlüssel wird nicht akzeptiert.',
    rate_limit: 'Gerade zu viele Anfragen. Kurz warten und nochmal versuchen.',
    too_large: 'Das Rezept ist zu lang zum Vereinfachen.',
    unbekannt: 'Vereinfachen hat nicht geklappt.',
    geaendert: 'Die Schritte wurden in der Zwischenzeit geändert – deshalb bleibt deine Fassung stehen.',
    keineVerbindung: 'Keine Verbindung zum Server.',
  },
  ohneKiGeteilt: 'Lange Schritte sind schon in kurze aufgeteilt. Umformuliert wird, sobald die KI erreichbar ist.',
  ohneKi: 'Die Schritte bleiben, wie sie sind.',
  kiLaeuft: 'Die Schritte werden mit KI vereinfacht …',
  nochmal: 'Nochmal versuchen',
  kiFertig: 'Mit KI vereinfacht.',
  kiFertigText:
    'Kürzere Schritte, das Schnibbeln steht jetzt in der Vorbereitung. Zutaten, Mengen und Reihenfolge bleiben gleich.',
  kiFehlend: (liste: string) => `Bitte kurz prüfen: im Original stand noch ${liste}.`,
  original: 'Original wiederherstellen',
  mitKiVereinfachen: 'Mit KI vereinfachen',

  /* Felder */
  name: 'Name',
  namePlatzhalter: 'z. B. Poulet mit Brokkoli',
  kategorie: 'Kategorie',
  kategorieErkannt: (grund: string) => `Automatisch erkannt: ${grund}`,
  kategorieVorschlag: (kategorie: string) => `Vorschlag aus den Zutaten: ${kategorie}`,
  kategorieAutoPlatzhalter: 'Wird aus den Zutaten erkannt',
  kategoriePlatzhalter: 'z. B. High-Protein',
  portionen: 'Portionen',
  zeit: 'Zubereitungszeit (Min)',
  zutaten: 'Zutaten',
  zutatenSpalten: 'Menge · Einheit · Zutat',
  vorbereitung: 'Vorbereitung',
  vorbereitungZeilen: 'eine Aufgabe pro Zeile',
  vorbereitungPlatzhalter: 'z. B. Zwiebel fein hacken\nZucchini würfeln\nCherrytomaten halbieren',
  vorbereitungErklaerung:
    'Was vor dem Kochen geschnitten und bereitgelegt wird. Das Abmessen der Zutaten kommt im Kochmodus von selbst dazu.',
  vorbereitungNichts: 'In den Schritten steht nichts, was vorher geschnitten werden müsste.',
  vorschlagen: 'Aus den Schritten vorschlagen',
  zubereitung: 'Zubereitung',
  schrittHoch: (n: number) => `Schritt ${n} nach oben`,
  schrittEntfernen: (n: number) => `Schritt ${n} entfernen`,
  schrittPlatzhalter: 'Was ist in diesem Schritt zu tun?',
  schrittText: (n: number) => `Text für Schritt ${n}`,
  timer: 'Timer (Min)',
  timerFuer: (n: number) => `Timer für Schritt ${n} in Minuten`,
  schrittHinzufuegen: 'Schritt hinzufügen',
  notiz: 'Notiz',
  notizPlatzhalter: 'Optional: Hinweise, Beilagen, Varianten',
};

const en: Form<typeof de> = {
  titelNeu: 'New recipe',
  titelBearbeiten: 'Edit recipe',

  linkLabel: 'Add recipe from a link',
  linkHinweis:
    'Paste the address of a recipe page – ingredients and directions are imported, timers included. You can still change everything afterward.',
  holen: 'Import',
  laedt: 'Loading…',
  textLabel: 'Paste recipe text',
  textHinweis:
    'Select and copy the recipe on the page, including ingredients and directions. Works with messages and notes too.',
  textPlatzhalter: 'Ingredients\n200 g flour\n…\n\nDirections\nMix the flour and …',
  textUebernehmen: 'Use text',
  textLabelFrei: 'Paste a recipe as text',
  textHinweisFrei:
    'Paste the whole text, for example from Claude, ChatGPT or a message – with title, ingredients and directions, tips welcome. Crave picks up servings, amounts, timers and notes, in English too. You can still change everything afterwards.',
  textPlatzhalterFrei:
    'Light Lasagna Roll-Ups\nServes 4\n\nIngredients\n• 8 lasagna sheets\n• 1 tbsp olive oil\n…\n\nDirections\n1. Heat the olive oil …\n\nNotes\n…',
  umwandeln: 'Turn into a recipe',
  liest: 'Reading…',
  oderText: 'Or paste recipe text',
  andererText: 'Paste different text',
  keineVerbindungImport: 'Can’t reach the server. Check your connection.',

  importHinweis: {
    vonKi: 'The AI read the recipe from the text.',
    vonSeite: 'Ingredients and steps were read from the text, not from recipe data.',
    vonText: 'Read from your text: ingredients, steps, timers and notes.',
    uebersetzt: 'Translated from English, with amounts in grams, deciliters and degrees Celsius.',
    pruefen: 'Please check that everything looks right.',
    aufEnglisch: (grund: string) =>
      `This recipe is in English. The app will translate it automatically once the AI is available. ${grund}`,
  },

  importFehler: {
    einfuegen: 'Copy the recipe text and paste it below.',
    keinRezeptImText: (grund: string) =>
      `No recipe found in the text. It works best with the headings “Ingredients” and “Directions”. ${grund}`,
    keinRezeptAufSeite: (grund: string, einfuegen: string) =>
      `This page doesn’t have the recipe in a format the app can read. ${grund} ${einfuegen}`,
    nichtGefunden: 'This page doesn’t exist (404). Is the address right?',
    gesperrt: (einfuegen: string) => `This site doesn’t allow apps to load its pages. ${einfuegen}`,
    keineWebseite: 'That’s a file, not a web page.',
    zuGross: 'The page is too large.',
    nichtAbrufbar: 'This address can’t be loaded.',
    adresseFehlt: 'Please paste an address.',
    nichtGeladen: (einfuegen: string) => `Couldn’t load the page. Try again, or ${einfuegen}`,
  },

  kiGrund: {
    billing: 'AI could still read it, but the provider is missing payment details (Vercel → AI Gateway).',
    no_key: 'With AI set up, it would still work.',
    not_found: 'The AI couldn’t find a recipe in it either.',
    rate_limit: 'The AI is busy right now. Try again in a moment.',
  },

  uebersetzenGrund: {
    billing: 'For that, the provider still needs payment details (Vercel → AI Gateway).',
    no_key: 'For that, AI needs to be set up.',
  },

  kiFehler: {
    no_key: 'No access to the AI model is set up on the server.',
    billing: 'The provider is missing payment details (Vercel → AI Gateway).',
    auth: 'The saved API key was rejected.',
    rate_limit: 'Too many requests right now. Wait a moment and try again.',
    too_large: 'The recipe is too long to simplify.',
    unbekannt: 'Couldn’t simplify the recipe.',
    geaendert: 'The steps were changed in the meantime, so your version stays.',
    keineVerbindung: 'Can’t reach the server.',
  },
  ohneKiGeteilt: 'Long steps are already split into shorter ones. They’ll be reworded once the AI is available.',
  ohneKi: 'The steps stay as they are.',
  kiLaeuft: 'Simplifying the steps with AI…',
  nochmal: 'Try again',
  kiFertig: 'Simplified with AI.',
  kiFertigText:
    'Shorter steps, and the chopping has moved to Prep. Ingredients, amounts and order stay the same.',
  kiFehlend: (liste: string) => `Please double-check: the original also mentioned ${liste}.`,
  original: 'Restore original',
  mitKiVereinfachen: 'Simplify with AI',

  name: 'Name',
  namePlatzhalter: 'e.g. Chicken with broccoli',
  kategorie: 'Category',
  kategorieErkannt: (grund: string) => `Detected automatically: ${grund}`,
  kategorieVorschlag: (kategorie: string) => `Suggested from the ingredients: ${kategorie}`,
  kategorieAutoPlatzhalter: 'Detected from the ingredients',
  kategoriePlatzhalter: 'e.g. High-Protein',
  portionen: 'Servings',
  zeit: 'Cooking time (min)',
  zutaten: 'Ingredients',
  zutatenSpalten: 'Amount · Unit · Ingredient',
  vorbereitung: 'Prep',
  vorbereitungZeilen: 'one task per line',
  vorbereitungPlatzhalter: 'e.g. Finely chop the onion\nDice the zucchini\nHalve the cherry tomatoes',
  vorbereitungErklaerung:
    'What gets chopped and set out before cooking. Measuring the ingredients is added automatically in cooking mode.',
  vorbereitungNichts: 'Nothing in the steps needs to be chopped beforehand.',
  vorschlagen: 'Suggest from the steps',
  zubereitung: 'Directions',
  schrittHoch: (n: number) => `Move step ${n} up`,
  schrittEntfernen: (n: number) => `Remove step ${n}`,
  schrittPlatzhalter: 'What happens in this step?',
  schrittText: (n: number) => `Text for step ${n}`,
  timer: 'Timer (min)',
  timerFuer: (n: number) => `Timer for step ${n} in minutes`,
  schrittHinzufuegen: 'Add step',
  notiz: 'Notes',
  notizPlatzhalter: 'Optional: tips, sides, variations',
};

export const rezeptForm = { de, en };
