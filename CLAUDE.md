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

## Zweisprachig

- Die App gibt es auf Deutsch und Englisch. Jeder sichtbare Text gehoert in
  `src/lib/texte/<bildschirm>.ts`, mit `de` und `en` in derselben Form –
  keine festen Texte in Komponenten.
- Die Bereiche heissen auf Deutsch «Gelüste» und «Beute», auf Englisch
  «Cravings» und «Groceries».
- Gespeichert wird auf Deutsch; die englische Ansicht uebersetzt beim Zeigen
  (`src/lib/inhalt.tsx`). Neue mitgelieferte Inhalte brauchen einen Eintrag
  in `src/lib/seedEn.ts`.
