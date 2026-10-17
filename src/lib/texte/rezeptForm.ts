/** Texte: rezeptForm. */

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
    aufEnglisch:
      'Das Rezept ist noch auf Englisch – die Übersetzung war gerade nicht erreichbar. Die App übersetzt es von selbst, sobald es geht.',
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

export const rezeptForm = de;
