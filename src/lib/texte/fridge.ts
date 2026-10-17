/** Texte: Was kann ich kochen? (Kuehlschrankfoto). */

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

export const fridge = de;
