/** Texte: Einstellungen und Abgleich. */

const de = {
  titel: 'Einstellungen & Sync',
  design: 'Design',
  designText: 'Such dir eine Farbwelt aus – sie gilt sofort und bleibt auf diesem Gerät gespeichert.',
  link: 'Dein Link',
  linkText:
    'Öffne diesen Link auf iPhone, iPad und Computer. Alle Geräte mit diesem Link sehen denselben Datenstand.',
  linkKopiert: 'Link kopiert',
  linkTeilen: 'Link teilen',
  sync: 'Synchronisation',
  jetztAbgleichen: 'Jetzt abgleichen',
  dbFehltTitel: 'Die hinterlegte Datenbank antwortet nicht.',
  dbFehltText1:
    ' Häufigste Ursache: eine Umgebungsvariable mit einer Verbindung, die es nicht gibt – etwa ein Platzhalter aus einer Beispieldatei. Unter ',
  dbFehltText2: ' steht, welche Variable genutzt wird und woran die Verbindung scheitert.',
  meldung: 'Meldung:',
  keineCloudTitel: 'Cloud-Datenbank nicht konfiguriert.',
  keineCloudText1:
    ' Der Server speichert die Daten momentan nur flüchtig. Für dauerhafte Synchronisation zwischen deinen Geräten muss die Umgebungsvariable ',
  keineCloudText2: ' gesetzt sein – siehe README.',
  cloudOk:
    'Änderungen werden automatisch gespeichert und mit allen Geräten abgeglichen, die diesen Link geöffnet haben.',
  pruefen: 'Verbindung zum Server wird geprüft…',
  zuletzt: (zeit: string) => `Zuletzt abgeglichen: ${zeit}`,
  zeitformat: 'de-CH',
  home: 'Zum Home-Bildschirm hinzufügen',
  homeText:
    'In Safari auf «Teilen» tippen und «Zum Home-Bildschirm» wählen. Danach startet Crave wie eine App im Vollbild.',
  start: 'Startinhalte',
  startText:
    'Neue mitgelieferte Rezepte und Ideen erscheinen von selbst, sobald du die App öffnest – Gelöschtes kommt dabei nicht zurück. Dieser Knopf ist für den Rest: wo einem vorhandenen Rezept die Zubereitung oder die Zutaten ganz fehlen, werden sie ergänzt. Eigenes bleibt unverändert.',
  nachtragen: 'Fehlende Rezepte und Ideen nachtragen',
  timer: 'Kochtimer',
  timerText:
    'Läuft ein Schritt mit Timer ab, klingelt Crave und vibriert. Während des Kochens zählt der Ton als Medienwiedergabe – er kommt also auch durch, wenn am iPhone der Schalter auf lautlos steht. Hier lässt er sich vorher ausprobieren.',
  timerTesten: 'Weckerton testen',
  gespeichert: 'Gespeichert',
  zaehlerRezepte: (n: number) => `${n} Rezepte`,
  zaehlerIdeen: (n: number) => `${n} Ideen`,
  zaehlerEinkauf: (n: number) => `${n} in der Beute`,
  zaehlerStandard: (n: number) => `${n} Standard-Zutaten`,
  offline: 'Offline – Änderungen werden gespeichert',
  gleichtAb: 'Wird abgeglichen…',
  synchron: 'Alles synchronisiert',
  bereit: 'Bereit',
};

export const einstellungen = de;
