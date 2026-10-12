/** Texte: Was kann ich kochen? (Kuehlschrankfoto). Deutsch zuerst, Englisch mit derselben Form. */
import type { Form } from './form';

const de = {
  titel: 'Was kann ich kochen?',
  neuesFoto: 'Neues Foto',
  nichtEingerichtet: 'Bilderkennung nicht eingerichtet.',
  /** Stuecke rund um <em>AI Gateway</em> und die beiden <code>-Namen; Leerzeichen gehoeren dazu. */
  einrichten: {
    vor: ' Am einfachsten über Vercel: dort unter ',
    alsSchluessel: ' einen Schlüssel anlegen und ihn als ',
    oderDirekt:
      ' beim Projekt hinterlegen – ein Konto beim Modellanbieter braucht es dafür nicht. Wer lieber direkt abrechnet, setzt stattdessen ',
    ende: '. Siehe README.',
  },
  einleitung:
    'Mach ein Foto vom offenen Kühlschrank. Crave liest heraus, was darin ist, sucht passende Rezepte aus deiner Sammlung und schlägt zusätzlich neue Gerichte vor.',
  fotoAufnehmen: 'Foto aufnehmen',
  datenschutz:
    'Das Foto wird zur Auswertung an Anthropic geschickt und dort nicht gespeichert. Es landet weder in deinen Daten noch in der Beute.',
  wirdAusgewertet: 'Foto wird ausgewertet…',
  dauert: 'Das dauert einen Moment.',
  nochmal: 'Nochmal versuchen',
  erkannt: 'Erkannt',
  nichtsErkannt:
    'Auf dem Foto war nichts eindeutig zu erkennen. Versuch es mit mehr Licht oder näher dran.',
  ausRezepten: 'Aus deinen Rezepten',
  zutatenDa: (vorhanden: number, gesamt: number) => `${vorhanden} von ${gesamt} Zutaten da`,
  fehlt: (namen: string) => `fehlt: ${namen}`,
  neueIdeen: 'Neue Ideen',
  vorbereitung: 'Vorbereitung',
  fehltNoch: (namen: string) => `Fehlt noch: ${namen}`,
  alsRezept: 'Als Rezept speichern',
  fehlendesEinkaufen: 'Fehlendes einkaufen',
  /** Meldungen, wenn die Auswertung scheitert: Titel fett, dahinter was zu tun ist. */
  fehler: {
    keinZugang: 'Auf dem Server fehlt der Zugang zum Modell, siehe README.',
    zahlung: {
      titel: 'Beim Anbieter fehlt die Zahlungsangabe.',
      text: 'Bei Vercel unter AI Gateway eine Zahlungskarte hinterlegen – damit werden auch die Freikontingente freigeschaltet. Ein neues Deployment braucht es dafür nicht.',
    },
    schluessel: {
      titel: 'Der hinterlegte Schlüssel wird nicht akzeptiert.',
      text: 'Vermutlich wurde der Schlüssel beim Anbieter gelöscht oder ist abgelaufen. Neuen anlegen und in den Umgebungsvariablen ersetzen.',
    },
    zuViele: {
      titel: 'Gerade zu viele Anfragen.',
      text: 'Kurz warten und nochmal versuchen.',
    },
    zuGross: {
      titel: 'Das Foto ist zu gross.',
      text: 'Versuch es mit einem kleineren Ausschnitt.',
    },
    nichts: {
      titel: 'Damit konnte ich nichts anfangen.',
      text: 'Versuch ein anderes Foto, am besten hell und von vorne.',
    },
    sonst: {
      titel: 'Auswertung fehlgeschlagen.',
      text: 'Prüfe die Verbindung und versuch es nochmal.',
    },
  },
};

const en: Form<typeof de> = {
  titel: 'What can I cook?',
  neuesFoto: 'New photo',
  nichtEingerichtet: 'Image recognition isn’t set up.',
  einrichten: {
    vor: ' The easiest way is through Vercel: under ',
    alsSchluessel: ', create a key and add it to the project as ',
    oderDirekt:
      ' – no account with the model provider needed. If you’d rather pay the provider directly, set ',
    ende: ' instead. See README.',
  },
  einleitung:
    'Take a photo of your open fridge. Crave figures out what’s inside, finds matching recipes from your collection and suggests new dishes too.',
  fotoAufnehmen: 'Take photo',
  datenschutz:
    'The photo is sent to Anthropic for analysis and isn’t stored there. It won’t end up in your data or in Groceries.',
  wirdAusgewertet: 'Analyzing photo…',
  dauert: 'This takes a moment.',
  nochmal: 'Try again',
  erkannt: 'Spotted',
  nichtsErkannt: 'Nothing in the photo was clear enough to recognize. Try more light or get closer.',
  ausRezepten: 'From your recipes',
  zutatenDa: (vorhanden: number, gesamt: number) => `${vorhanden} of ${gesamt} ingredients on hand`,
  fehlt: (namen: string) => `missing: ${namen}`,
  neueIdeen: 'New ideas',
  vorbereitung: 'Prep',
  fehltNoch: (namen: string) => `Still missing: ${namen}`,
  alsRezept: 'Save as recipe',
  fehlendesEinkaufen: 'Buy missing items',
  fehler: {
    keinZugang: 'The server has no access to the model, see README.',
    zahlung: {
      titel: 'Payment details are missing at the provider.',
      text: 'Add a payment card under AI Gateway in Vercel – this also unlocks the free credits. No new deployment needed.',
    },
    schluessel: {
      titel: 'The stored key isn’t accepted.',
      text: 'The key was probably deleted at the provider or has expired. Create a new one and replace it in the environment variables.',
    },
    zuViele: {
      titel: 'Too many requests right now.',
      text: 'Wait a moment and try again.',
    },
    zuGross: {
      titel: 'The photo is too large.',
      text: 'Try a smaller crop.',
    },
    nichts: {
      titel: 'I couldn’t make anything of that.',
      text: 'Try another photo, ideally well lit and taken from the front.',
    },
    sonst: {
      titel: 'Analysis failed.',
      text: 'Check your connection and try again.',
    },
  },
};

export const fridge = { de, en };
