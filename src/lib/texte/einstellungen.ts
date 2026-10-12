/** Texte: Einstellungen und Abgleich. Deutsch zuerst, Englisch mit derselben Form. */
import type { Form } from './form';

const de = {
  titel: 'Einstellungen & Sync',
  sprache: 'Sprache',
  spracheText: 'Gilt für die ganze App, auch für alle Rezepte – auf diesem Gerät.',
  deutsch: 'Deutsch',
  englisch: 'English',
  design: 'Design',
  designText: 'Such dir eine Farbwelt aus – sie gilt sofort und bleibt auf diesem Gerät gespeichert.',
  themes: {} as Record<string, { name: string; beschreibung: string }>,
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

const en: Form<typeof de> = {
  titel: 'Settings & Sync',
  sprache: 'Language',
  spracheText: 'Applies to the whole app, recipes included – on this device.',
  deutsch: 'Deutsch',
  englisch: 'English',
  design: 'Look',
  designText: 'Pick a color scheme – it applies right away and is saved on this device.',
  themes: {
    diner: { name: 'Diner', beschreibung: 'Like the logo: tomato red, mustard, espresso' },
    creme: { name: 'Cream', beschreibung: 'Warm and calm, copper accent' },
    salbei: { name: 'Sage', beschreibung: 'Fresh and green, lots of white' },
    pfirsich: { name: 'Peach', beschreibung: 'Cheerful and warm, coral accent' },
    himmel: { name: 'Sky', beschreibung: 'Light and airy, blue accent' },
    klar: { name: 'Clear', beschreibung: 'Pure white and modern, tomato red' },
    dunkel: { name: 'Dark', beschreibung: 'The night version for evenings' },
  },
  link: 'Your link',
  linkText: 'Open this link on your iPhone, iPad and computer. Every device with this link sees the same data.',
  linkKopiert: 'Link copied',
  linkTeilen: 'Share link',
  sync: 'Sync',
  jetztAbgleichen: 'Sync now',
  dbFehltTitel: 'The configured database is not responding.',
  dbFehltText1:
    ' Most common cause: an environment variable pointing to a connection that doesn’t exist – such as a placeholder from an example file. ',
  dbFehltText2: ' shows which variable is used and why the connection fails.',
  meldung: 'Message:',
  keineCloudTitel: 'No cloud database configured.',
  keineCloudText1:
    ' The server only keeps your data temporarily. For lasting sync between your devices, set the environment variable ',
  keineCloudText2: ' – see the README.',
  cloudOk: 'Changes are saved automatically and synced with every device that has opened this link.',
  pruefen: 'Checking the connection to the server…',
  zuletzt: (zeit: string) => `Last synced: ${zeit}`,
  zeitformat: 'en-GB',
  home: 'Add to Home Screen',
  homeText: 'In Safari, tap “Share” and choose “Add to Home Screen”. Crave then opens like an app, full screen.',
  start: 'Built-in content',
  startText:
    'New built-in recipes and ideas appear by themselves when you open the app – anything you deleted stays gone. This button covers the rest: where an existing recipe has no directions or ingredients at all, they are filled in. Your own entries stay as they are.',
  nachtragen: 'Fill in missing recipes and ideas',
  timer: 'Cooking timer',
  timerText:
    'When a step’s timer runs out, Crave rings and vibrates. While cooking, the sound counts as media playback – so you hear it even when your iPhone is on silent. Try it out here.',
  timerTesten: 'Test the alarm',
  gespeichert: 'Saved',
  zaehlerRezepte: (n: number) => `${n} ${n === 1 ? 'recipe' : 'recipes'}`,
  zaehlerIdeen: (n: number) => `${n} ${n === 1 ? 'idea' : 'ideas'}`,
  zaehlerEinkauf: (n: number) => `${n} on Groceries`,
  zaehlerStandard: (n: number) => `${n} ${n === 1 ? 'staple' : 'staples'}`,
  offline: 'Offline – changes are saved',
  gleichtAb: 'Syncing…',
  synchron: 'All synced',
  bereit: 'Ready',
};

export const einstellungen = { de, en };
