/** Texte: Hinweis zum Speicherort (CloudNotice). Deutsch zuerst, Englisch mit derselben Form. */
import type { Form } from './form';

const de = {
  /** Datenbank hinterlegt, aber nicht erreichbar. */
  kaputtTitel: 'Datenbank antwortet nicht.',
  kaputtText:
    'Es ist eine Datenbank hinterlegt, die Verbindung schlägt aber fehl. Deine Änderungen bleiben auf diesem Gerät gespeichert und werden nachgeholt, sobald die Verbindung steht.',
  /** Gar keine Datenbank: alles nur lokal. */
  lokalTitel: 'Geräte-Abgleich noch nicht aktiv.',
  lokalText:
    'Diese Installation hat noch keine Datenbank. Alles funktioniert, deine Daten liegen aber nur auf diesem Gerät und können noch nicht verlässlich mit iPhone und iPad geteilt werden.',
  ausblenden: 'Hinweis ausblenden',
  details: 'Details anzeigen',
  wasFehlt: 'Was jetzt fehlt',
};

const en: Form<typeof de> = {
  kaputtTitel: 'Database isn’t responding.',
  kaputtText:
    'A database is configured, but the connection fails. Your changes stay saved on this device and will sync as soon as the connection is back.',
  lokalTitel: 'Device sync isn’t active yet.',
  lokalText:
    'This installation doesn’t have a database yet. Everything works, but your data only lives on this device and can’t be reliably shared with iPhone and iPad yet.',
  ausblenden: 'Hide notice',
  details: 'Show details',
  wasFehlt: 'What’s missing',
};

export const cloud = { de, en };
