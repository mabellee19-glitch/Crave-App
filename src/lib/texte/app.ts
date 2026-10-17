/** Texte: die App-Huelle – Kopf, Navigation, Meldungen. */

const de = {
  bereiche: 'Bereiche',
  hauptnavigation: 'Hauptnavigation',
  foto: 'Foto vom Kühlschrank aufnehmen',
  neu: 'Neu anlegen',
  zutatHinzufuegen: 'Zutat hinzufügen',
  einstellungen: 'Einstellungen und Synchronisation',
  laedt: 'Daten werden geladen',
  hinzugefuegt: (name: string) => `${name} hinzugefügt`,
  erledigt: (name: string) => `${name} erledigt`,
  zutat: 'Zutat',
  rueckgaengig: 'Rückgängig',
  allesVorhanden: 'Alles schon vorhanden',
  vorschlaegeErgaenzt: (ergaenzt: number, eingeordnet: number) =>
    `${ergaenzt} ${ergaenzt === 1 ? 'Zutat' : 'Zutaten'} ergänzt` + (eingeordnet > 0 ? `, ${eingeordnet} eingeordnet` : ''),
  vorlageNachgetragen: 'Aus der Vorlage nachgetragen',
  keineVorlage: 'Für dieses Rezept ist keine Vorlage hinterlegt',
  originalZurueck: 'Ursprüngliche Schritte wiederhergestellt',
  rezeptGeloescht: 'Rezept gelöscht',
  inDerBeute: (n: number) => `${n} ${n === 1 ? 'Zutat' : 'Zutaten'} in der Beute`,
  vonCookNext: (name: string) => `${name} von Cook Next genommen`,
  aufCookNext: (name: string) => `${name} auf Cook Next – Zutaten stehen in der Beute`,
  nachgetragen: (n: number) => `${n} nachgetragen`,
  ergaenzt: (n: number) => `${n} ergänzt`,
  gespeichert: (name: string) => `„${name}“ gespeichert`,
  ausIdee: 'Aus der Idee ist ein Rezept geworden',
  rezeptAngelegt: 'Rezept angelegt',
  rezeptGespeichert: 'Rezept gespeichert',
  ideeAngelegt: 'Idee angelegt',
  ideeGespeichert: 'Idee gespeichert',
  ideeGeloescht: 'Idee gelöscht',
};

export const app = de;
