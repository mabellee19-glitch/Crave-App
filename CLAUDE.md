# Hinweise für Claude

## Schreibweise

- **Niemals das deutsche Eszett (ß) verwenden – immer "ss".** Das gilt für
  Antworten im Chat, UI-Texte, Kommentare, Commit-Nachrichten, README und
  KI-Prompts (Schweizer Schreibweise: "Strasse", "gross", "Sauce", "Spass").
- Ausnahme ist nur Code, der eingehendes ß erkennen oder umwandeln muss
  (z. B. `normalizeName` in `src/lib/units.ts`, `spa(ss|ß)` in
  `src/lib/kuerzen.ts`, `szlig` in `src/lib/recipeImport.ts`), und
  Test-Fixtures, die Text von Webseiten nachbilden. Diese Stellen bleiben.
