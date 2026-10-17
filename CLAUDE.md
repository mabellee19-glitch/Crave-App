# Hinweise für Claude

## Schreibweise

- **Niemals das deutsche Eszett (ß) verwenden – immer "ss".** Das gilt für
  Antworten im Chat, UI-Texte, Kommentare, Commit-Nachrichten, README und
  KI-Prompts (Schweizer Schreibweise: "Strasse", "gross", "Sauce", "Spass").
- Ausnahme ist nur Code, der eingehendes ß erkennen oder umwandeln muss
  (z. B. `ohneEszett` in `src/lib/aufraeumen.ts`, `normalizeName` in
  `src/lib/units.ts`, `spa(ss|ß)` in `src/lib/kuerzen.ts`, `szlig` in
  `src/lib/recipeImport.ts`), und
  Test-Fixtures, die Text von Webseiten nachbilden. Diese Stellen bleiben.

## Rezepte

- Englische Rezepte werden immer auf Deutsch übersetzt, mit metrischen Massen
  (siehe README, «Englische Rezepte auf Deutsch»).

## Nur Deutsch

- Die App gibt es nur auf Deutsch – keinen Sprachumschalter, keine englische
  Ansicht. Englische Rezepte werden beim Übernehmen ins Deutsche übersetzt.
- Jeder sichtbare Text gehoert in `src/lib/texte/<bildschirm>.ts` – keine
  festen Texte in Komponenten.
- Die Bereiche heissen «Gelüste» und «Beute».
