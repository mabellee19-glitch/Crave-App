# CRAVE

Persönliche Koch- und Einkaufs-App. Mobile-first, läuft im Browser (Safari auf
iPhone und iPad, Chrome, Edge, Firefox) und lässt sich zum Home-Bildschirm
hinzufügen. Kein App Store nötig.

Zwei Bereiche:

- **Essen** – alles, was man kochen kann, in einer Liste: Rezepte mit
  Zutaten, Vorbereitung, Schritten und Kochmodus, und Ideen – Gerichte ohne
  Anleitung, nur mit Name und Zutaten.
- **Einkaufsliste** – aktive Liste plus dauerhafte Grundliste mit
  Standard-Zutaten.

## Was die App kann

| Bereich | Funktion |
| --- | --- |
| Rezepte | Anlegen, bearbeiten, löschen; Kategorie, Portionen, Zeit |
| Rezepte | `Rezept über Link hinzufügen`: Adresse einfügen, Zutaten und Zubereitung kommen mit – samt Timern |
| Rezepte | Übernommene Schritte werden mit KI kürzer und einfacher – Zutaten, Mengen und Reihenfolge bleiben, das Original lässt sich zurückholen |
| Rezepte | Die Kategorie (High-Protein, Comfort, Vegi, Dessert) wird beim Anlegen aus den Zutaten erkannt |
| Rezepte | Jedes Rezept hat eine **Vorbereitung**: was vorher geschnitten und bereitgelegt wird |
| Rezepte | Portionen ändern – die Zutatenmengen rechnen sich automatisch um |
| Rezepte | `Start Cooking`: zuerst die Vorbereitung zum Abhaken, dann ein Schritt pro Bildschirm |
| Rezepte | Unter jedem Schritt stehen nur die Zutaten, die er braucht – mit Mengen für die gewählten Portionen |
| Kochmodus | Timer pro Schritt: Weckerton und Vibration, Display bleibt an |
| Kochmodus | Der Weckerton kommt auch durch, wenn das iPhone auf lautlos steht |
| Kochmodus | Timer laufen beim Weiterblättern weiter, auch mehrere gleichzeitig |
| Essen | Rezepte und Ideen in einer Liste, Filter nach Kategorie und Cook Next, Suche über Namen und Zutaten |
| Essen | Das Plus fragt: Rezept über Link, Rezept selbst schreiben oder nur eine Idee |
| Ideen | Auf Cook Next setzen – ihre Zutaten kommen auf die Einkaufsliste |
| Ideen | `Rezept daraus machen`: Name und Zutaten sind schon eingetragen, es bleibt ein Eintrag |
| Einkaufsliste | Schnelleingabe erkennt Menge und Einheit (`400 g Poulet`) |
| Einkaufsliste | Abhaken lässt Standard-Zutaten in die Grundliste zurückwandern |
| Grundliste | Antippen legt eine Zutat in die aktive Liste |
| Grundliste | Rubriken zum Aufklappen, dazu eine Vorschlagsliste zum Nachtragen |
| Rezept → Liste | Zutaten werden mit Mengen übernommen und zusammengefasst |
| Kühlschrankfoto | Foto erkennt Lebensmittel, findet passende eigene Rezepte und schlägt neue vor |
| Cook Next | Vormerken, was in den nächsten Tagen gekocht wird – die Zutaten stehen dann auf der Einkaufsliste |
| Cook Next | Abwählen nimmt genau diese Zutaten wieder von der Liste |
| Überall | Suche, automatisches Speichern, Geräte-Abgleich |
| Überall | Sechs Farbwelten zur Auswahl unter `Einstellungen & Sync → Design` |
| Überall | Startet sofort mit dem Stand auf dem Gerät, der Abgleich läuft im Hintergrund |

## Rezepte und Ideen

Früher gab es zwei Bereiche, Rezepte und Gerichte, und fast jedes Gericht
stand doppelt da. Jetzt steht alles in `Essen`: ein Buch-Symbol für ein Rezept,
eine Glühbirne für eine Idee. Gespeichert wird weiter wie bisher – ein
Gericht mit hinterlegtem Rezept ist in der Liste einfach das Rezept, ein
Gericht ohne Rezept ist eine Idee (`src/lib/essen.ts`). Ältere Stände und
Geräte mit einer älteren Fassung der App bleiben damit gültig.

- `Rezept daraus machen` öffnet das Rezeptformular mit Name, Kategorie und
  Zutaten der Idee. Nach dem Speichern hängt das Rezept an der Idee, und in
  der Liste steht nur noch das Rezept. War die Idee auf Cook Next, übernimmt
  das Rezept die Planung – mit seinen Zutaten, ohne Doppel auf der Liste.
- Wird ein Rezept gelöscht, geht das Gericht, an dem es hängt, mit – sonst
  käme es als Idee wieder zum Vorschein.
- Auch neue Ideen bekommen ihre Kategorie aus den Zutaten.

## Startinhalte nachtragen

Neue mitgelieferte Rezepte und Ideen erscheinen beim Öffnen der App von
selbst. Nachgezogen wird dabei nur, was es in diesem Datenraum noch nie gab –
keine Spur unter der Id, kein Grabstein. Gelöschtes bleibt gelöscht, und an
vorhandenen Einträgen wird nichts verändert. Das läuft erst, wenn der
Serverstand da ist: vorher wären die Grabsteine unbekannt.

Für den Rest gibt es zwei Knöpfe in der App selbst:

- `Einstellungen & Sync → Fehlende Rezepte und Ideen nachtragen` legt an,
  was es noch nie gab. Vorhandenes bleibt unverändert, Gelöschtes kommt nicht
  zurück. Ergänzt wird nur, wo etwas komplett fehlt: Zubereitungsschritte oder
  Zutaten. Ideen werden dabei über den Namen abgeglichen, Rezepte über ihre
  Id und ersatzweise über den Namen.
- Dasselbe geht direkt im Rezept: hat es keine Zubereitungsschritte, steht der
  Knopf `Aus der Vorlage nachtragen` dort, wo man das Problem sieht – nämlich
  neben dem ausgegrauten `Start Cooking`.
- `Einkaufsliste → Verwalten → Vorschlagsliste ergänzen` trägt fehlende
  Standard-Zutaten nach und ordnet vorhandene ohne Rubrik ein.

Beide sind rein ergänzend und lassen sich gefahrlos mehrfach auslösen. Die
Vorlagen stehen in `src/lib/seed.ts` (`PANTRY_CATALOGUE` und die Rezeptliste).

Für den Weg über die Kommandozeile gibt es zusätzlich:

```bash
npm run add-recipes -- https://deine-app.vercel.app/s/DEINE-ID
```

## Vorbereitung

Viele Rezepte mischen Schneiden und Kochen: «Zwiebel fein hacken und glasig
dünsten» – die Pfanne ist heiss, und man steht noch am Brett. Deshalb hat jedes
Rezept eine Vorbereitung, eine Liste von Aufgaben wie «Zwiebel fein hacken»
oder «Cherrytomaten halbieren». Sie steht in der Rezeptansicht vor dem ersten
Schritt, und der Kochmodus beginnt damit: oben die Aufgaben, darunter alle
Zutaten mit den Mengen für die gewählte Portionenzahl – beides zum Abhaken.
Das Abmessen wird nicht extra notiert, es ergibt sich aus der Zutatenliste.

- **Mitgelieferte Rezepte** haben eine von Hand geschriebene Vorbereitung. Wer
  ein solches Rezept nie verändert hat, bekommt beim nächsten Öffnen auch die
  neuen Schritte, aus denen das Schneiden herausgenommen ist. Wer die Schritte
  selbst bearbeitet hat, behält sie; dort kommt nur die Vorbereitung dazu.
  Erkannt wird das an einem Fingerabdruck der ausgelieferten Schritte
  (`SCHRITTE_VOR_DER_VORBEREITUNG` in `src/lib/seed.ts`).
- **Eigene Rezepte** bekommen eine Vorbereitung, die aus Zutaten («Knoblauch
  (gehackt)») und Schritten gelesen wird. Ihre Schritte bleiben unverändert.
- **Neue Rezepte** – von Hand, über einen Link oder aus dem Kühlschrankfoto –
  bekommen sie immer. Im Formular steht sie als eigenes Feld, eine Aufgabe pro
  Zeile, mit dem Knopf `Aus den Schritten vorschlagen`.

Ergänzt wird jedes Rezept genau einmal. Wer die Vorbereitung leert, bekommt
sie nicht zurück.

## Zutaten pro Schritt

Im Kochmodus stehen unter jedem Schritt die Zutaten, die er braucht, mit den
Mengen für die gewählte Portionenzahl; in der Rezeptansicht klein unter dem
Schritttext. Gespeichert ist diese Zuordnung nirgends – sie wird beim Anzeigen
aus dem Text gelesen (`src/lib/stepIngredients.ts`). Deshalb gilt sie für jedes
Rezept, auch für alte und übernommene, ohne dass sich an den Daten etwas
ändert.

Verglichen wird grosszügig: «Hähnchen» findet «Hähnchenbrust», «Bouillon»
findet «Gemüsebouillon», «salzen» findet «Salz». Sammelwörter holen ihre
Gruppe – «die Gewürze dazugeben» zeigt Kurkuma, Kreuzkümmel und Co.,
«Gemüse» und «Kräuter» ebenso, «alle Zutaten» alles. Gleichnamige Zutaten
werden über ihren Zweck getrennt: dreimal Pflanzenöl – zum Braten, für die
Marinade, für die Sauce – erscheinen je beim passenden Schritt. Was «zum
Servieren» ist, steht beim letzten Schritt.

## Kategorie aus den Zutaten

Beim Anlegen füllt sich das Feld `Kategorie` von selbst, während die Zutaten
eingetragen werden, und darunter steht, warum («Pouletbrust, rund 200 g pro
Portion»). Die Regeln stehen in `src/lib/category.ts` und sind an den
mitgelieferten Rezepten geeicht – alle vierzehn werden so erkannt, wie sie
eingeordnet sind:

- Fleisch oder Fisch ab gut 100 g pro Portion: **High-Protein**. Weniger davon
  in Pasta oder Teig: **Comfort** (Thunfisch-Pasta, Gyoza).
- Ohne Fleisch: Pasta, Suppe, Rahm und Käse machen **Comfort**, sonst **Vegi**.
  Tofu, Skyr, Quark und Co. ohne Pasta machen **High-Protein**.
- Deutlich süss und nichts Herzhaftes darin: **Dessert**.

Wer selbst etwas eintippt, behält das; der Vorschlag bleibt als Knopf darunter
stehen. Das läuft im Browser, ohne Modell und ohne Netz.

## Rezepte über einen Link übernehmen

Beim Anlegen eines Rezepts steht oben das Feld `Rezept über Link hinzufügen`.
Die Adresse einer Rezeptseite einfügen, `Holen` – Name, Portionen, Zeit,
Zutaten und Zubereitungsschritte stehen danach im Formular und lassen sich vor
dem Speichern noch ändern. Timer werden dabei aus den Schritttexten gelesen
(«für ca. 3 – 5 Min. anbraten» wird zu drei Minuten – bei Bereichen gilt der
untere Wert, damit man eher zu früh als zu spät nachschaut).

Das braucht weder Schlüssel noch Guthaben: die meisten Rezeptseiten legen ihre
Daten als schema.org-Rezept im Quelltext ab, dasselbe, woraus Google seine
Rezeptkarten baut. Fehlt das – bei manchen Blogs und Videoseiten – sagt die App
das und man tippt von Hand.

### Mit KI vereinfacht

Ist der Zugang zum Modell eingerichtet (derselbe wie fürs Kühlschrankfoto,
siehe unten), werden die übernommenen Schritte gleich danach kürzer und
einfacher: höchstens zwei kurze Sätze pro Schritt, Befehlsform, kein
Drumherum. Das Schneiden wandert in die Vorbereitung. Am Rezept selbst ändert
sich nichts:

- Die Zutaten gehen gar nicht erst durchs Modell, sie bleiben wie übernommen.
- Jede Zahl aus den alten Schritten – Temperaturen, Minuten, Mengen – muss in
  der neuen Fassung wieder vorkommen. Fehlt eine, steht im Formular «Bitte kurz
  prüfen: im Original stand noch …».
- `Original wiederherstellen` holt die übernommenen Schritte zurück.

Der Knopf `Mit KI vereinfachen` über der Zubereitung macht dasselbe für jedes
andere Rezept, auch beim Bearbeiten. Ohne eingerichteten Zugang bleibt alles
wie übernommen; die App sagt das in einem Satz. Ein Aufruf kostet grob ein
bis zwei Rappen.

Gefragt wird Claude Opus 5.5 mit wenig Nachdenkzeit, damit die Wartezeit im
Formular kurz bleibt. Über Vercels Gateway versucht die App zuerst
`anthropic/claude-opus-5.5` und nimmt, falls das Gateway diese Fassung nicht
kennt, `anthropic/claude-opus-5` wie beim Foto. Direkt bei Anthropic springt
bei einer Ablehnung durch die Sicherheitsprüfung serverseitig ein anderes
Modell ein (`fallbacks: "default"`).

Die Adresse wird serverseitig abgerufen, deshalb prüft `src/lib/safeFetch.ts`
jede Adresse und jede Weiterleitung: Ziele im eigenen Netz (auch die
Metadaten-Adresse des Hosters) werden abgelehnt, ebenso andere Schemata als
http und https. Grösse und Dauer sind begrenzt.

## Kühlschrankfoto einrichten (optional)

Der Kamera-Knopf oben rechts wertet ein Foto aus: er listet die erkannten
Lebensmittel, sucht daraus passende Rezepte aus der eigenen Sammlung und
schlägt zusätzlich neue Gerichte vor, die sich als Rezept speichern lassen.

Dafür braucht der Server einen Zugang zum Modell. Es gibt zwei Wege; die App
nimmt automatisch den, der eingerichtet ist.

**Weg 1 – über Vercel (empfohlen, kein zweites Konto).** Vercels AI Gateway
reicht die Anfrage weiter und rechnet über die Vercel-Rechnung ab:

1. Im Vercel-Dashboard `AI Gateway → API Keys` öffnen und einen Schlüssel
   anlegen.
2. Ihn beim Projekt unter `Settings → Environment Variables` als
   `AI_GATEWAY_API_KEY` hinterlegen.
3. Neu deployen.

Auf Vercel geht es auch ganz ohne Schlüssel: ist für das Projekt OIDC aktiv
(`Settings → Security`), legt Vercel jeder Funktion ein kurzlebiges Token unter
`VERCEL_OIDC_TOKEN` bei, und die App nutzt es von selbst. Ein eigener Schlüssel
ist trotzdem die verlässlichere Variante, weil er unabhängig von dieser
Einstellung funktioniert. In beiden Fällen braucht das Gateway Guthaben
beziehungsweise eine hinterlegte Zahlungsart bei Vercel.

**Weg 2 – direkt bei Anthropic.** Schlüssel unter
[console.anthropic.com](https://console.anthropic.com) erstellen und als
`ANTHROPIC_API_KEY` hinterlegen – lokal in `.env.local`. Ist beides gesetzt,
gewinnt das Gateway.

Ohne beides bleibt der Rest der App unberührt; der Knopf erklärt dann, was
fehlt. Ob es eingerichtet ist, sagt `/api/status` im Feld `vision` – nur
ja oder nein, nie der Schlüssel selbst.

Ob der Weg zum Modell technisch stimmt, prüft `npm run build && npm run
check:vision`. Das Skript stellt eine Gegenstelle hin, die sich wie das Gateway
verhält, und schickt echte Anfragen der App dagegen – fürs Kühlschrankfoto und
fürs Vereinfachen von Rezepten. Es kostet also nichts und braucht keinen
Schlüssel.

Zum Ablauf: das Foto wird im Browser auf 1024 Pixel Kantenlänge verkleinert
und dann zur Auswertung weitergeschickt. Es wird nirgends gespeichert, weder in
der Datenbank noch in der Einkaufsliste. Ein Aufruf kostet je nach Foto grob
ein bis zwei Rappen.

Welche eigenen Rezepte passen, rechnet die App selbst aus – aus den erkannten
Lebensmitteln plus der Grundliste, denn Salz und Öl stehen zu Hause und nicht
im Kühlschrank. Das Modell schlägt nur neue Gerichte vor und kann deshalb
nichts empfehlen, was es gar nicht gibt.

## Die App durchsehen

```bash
npm run build && npm start &
BASE_URL=http://localhost:3000 npm run check:ui
```

Das Skript geht die ganze App durch – in drei Breiten (iPhone, Desktop,
320 px) und in allen Farbwelten – und meldet, was kein einzelner Test abdeckt:
Konsolenfehler, fehlgeschlagene Anfragen, seitlich überlaufende Seiten, zu
kleine Bedienelemente und Knöpfe ohne Beschriftung.

## Der Link ist der Datenraum

Beim ersten Aufruf legt die App einen Datenraum an und leitet auf
`https://…/s/<id>` weiter. **Dieser Link ist der Zugang zu den Daten.** Wer ihn
öffnet – iPhone, iPad, Computer – sieht denselben Stand. Den Link findest du
jederzeit unter `Einstellungen & Sync` und kannst ihn von dort teilen.

Der Datenraum ist nicht passwortgeschützt. Die Id ist lang und zufällig, aber
teile den Link nur mit Leuten, die die Daten sehen dürfen.

## Lokal starten

```bash
npm install
npm run dev
```

Die App läuft dann auf `http://localhost:3000`. Ohne `DATABASE_URL` legt der
Server die Daten als JSON-Dateien unter `./data` ab – gut zum Ausprobieren,
aber nicht für den Dauerbetrieb.

## Cloud-Datenbank einrichten (für den Geräte-Abgleich)

Die App braucht eine Postgres-Datenbank, damit iPhone und iPad denselben Stand
sehen. Jede Postgres-Datenbank funktioniert (Neon, Supabase, Vercel Postgres,
eigener Server). Die Tabelle wird beim ersten Zugriff selbst angelegt.

1. Datenbank anlegen und den Connection-String kopieren.
2. Als Umgebungsvariable `DATABASE_URL` hinterlegen, lokal in `.env.local`:

   ```bash
   DATABASE_URL="postgres://benutzer:passwort@host/datenbank?sslmode=require"
   ```

3. Neu starten. In `Einstellungen & Sync` steht danach, dass der Abgleich
   aktiv ist.

Der Variablenname ist dabei nicht kritisch. Gesucht wird zuerst nach den
üblichen Namen (`DATABASE_URL`, `POSTGRES_URL`, …) und danach nach jeder
Umgebungsvariable, deren Wert wie eine Postgres-URL aussieht. Wer beim Hoster
auf «Datenbank anlegen» klickt, muss hier also nichts anpassen. Welche
Variable genutzt wird, verrät `/api/status` — nur ihr Name, nie ihr Inhalt.

Es gibt bewusst keine Datei `.env.example` im Repository: Vercel liest sie beim
Import und legt daraus eine echte Umgebungsvariable mit dem Beispielwert an.
Die App hielte dann eine Verbindung für vorhanden, die es nicht gibt.

Ohne diese Variable funktioniert die App weiter, speichert serverseitig aber
nur flüchtig – der Abgleich zwischen Geräten ist dann nicht verlässlich. Die
App weist im Einstellungsdialog darauf hin.

## Auf Vercel veröffentlichen

1. Repository auf [vercel.com](https://vercel.com) importieren – Next.js wird
   automatisch erkannt, es sind keine Build-Einstellungen nötig.
2. Im Projekt unter `Storage` eine Postgres-Datenbank (Neon) anlegen und mit
   dem Projekt verbinden. Vercel setzt `DATABASE_URL` dann selbst.
3. Neu deployen. Fertig – der Link aus Schritt 1 ist die App.

Falls Vercel beim Verbinden meldet, es gebe bereits eine Variable
`DATABASE_URL`: diese Variable unter `Settings → Environment Variables`
löschen und erneut verbinden. Ein Prefix ist nicht nötig und wäre auch nicht
die Lösung, weil die vorhandene Variable Vorrang behielte.

Ob es geklappt hat, sagt `/api/status`: `"cloud": true` heisst, eine Datenbank
ist konfiguriert, `"reachable": true` heisst, sie antwortet auch. Bei einem
Fehler steht dort, welche Variable genutzt wird und woran es scheitert.

Optional: `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1` als Umgebungsvariable setzen,
dann lädt der Build die Test-Browser nicht mit herunter.

## Zum Home-Bildschirm hinzufügen (iPhone / iPad)

Link in Safari öffnen → «Teilen» → «Zum Home-Bildschirm». Die App startet
danach im Vollbild ohne Adressleiste und öffnet direkt den richtigen
Datenraum, weil jedes `/s/<id>` sein eigenes Web-App-Manifest ausliefert.

## Wie das Speichern funktioniert

Die App ist *local-first*:

1. Jede Änderung landet sofort im lokalen Speicher des Geräts – die Oberfläche
   wartet nie auf das Netz und funktioniert auch offline. Auch beim Öffnen
   steht der gespeicherte Stand sofort da; nur auf einem Gerät, das die App
   zum ersten Mal sieht, wird auf den Server gewartet.
2. Kurz darauf wird der Stand zum Server geschickt.
3. Der Server führt beide Stände zusammen und schickt das Ergebnis zurück.
4. Alle sieben Sekunden sowie beim Zurückkehren zur App wird erneut geholt.

Zusammengeführt wird **pro Eintrag**, nicht pro Dokument: Wenn das iPhone ein
Rezept ändert, während das iPad eine Zutat abhakt, bleiben beide Änderungen
erhalten. Gelöschtes bekommt einen Grabstein-Eintrag, damit ein länger nicht
benutztes Gerät nichts wiederbelebt.

## Tests

```bash
npm run test:unit                 # Erkennung der Datenbank-Verbindung
npx playwright install chromium   # einmalig
npm run test:e2e                  # Oberfläche und Abgleich
npm test                          # beides
```

Die Tests starten den Produktions-Build und prüfen Navigation, Rezept-CRUD,
Portionsrechnung, Kochmodus, Timer, Einkaufsliste, Grundliste, Favoriten,
Suche, Filter und den Abgleich zwischen zwei Geräten – je einmal in
iPhone-Grösse und einmal in Desktop-Grösse.

Eine bereits veröffentlichte Installation lässt sich gegen ihre echte
Datenbank prüfen:

```bash
BASE_URL=https://deine-app.vercel.app npm run check:live
```

Das prüft Statusmeldung, Datenbank-Erreichbarkeit, das Zusammenführen zweier
Geräte, Löschungen gegen veraltete Stände, gleichzeitige Schreibvorgänge und
das Manifest. Dieselben Oberflächentests laufen mit `BASE_URL` ebenfalls gegen
die veröffentlichte App statt gegen einen lokalen Server.

Safari lässt sich mit der WebKit-Engine prüfen:

```bash
npx playwright install webkit
# in playwright.config.ts im Projekt "iphone" browserName auf 'webkit' setzen
```

## Aufbau

```
src/
  app/
    page.tsx                  Einstiegspunkt, legt den Datenraum an
    s/[id]/page.tsx           die App
    s/[id]/manifest/route.ts  Web-App-Manifest pro Datenraum
    api/space/[id]/route.ts   Lesen und Zusammenführen der Daten
    globals.css               Design-System, Farbpalette ganz oben
  components/                 Oberfläche
  lib/
    vision.ts                 Auswertung des Kühlschrankfotos
    recipeAi.ts               Vereinfachen übernommener Rezepte mit KI
    prep.ts                   Vorbereitung: aus Text lesen, Fingerabdruck
    category.ts               Kategorie aus den Zutaten
    stepIngredients.ts        Welche Zutaten zu welchem Schritt gehören
    essen.ts                  Rezepte und Ideen in einer Liste
    theme.ts                  Farbwelten
    store.tsx                 lokaler Zustand und Abgleich
    merge.ts                  Zusammenführen zweier Stände
    db.ts                     Postgres bzw. Datei-Fallback
    connection.ts             Finden der Datenbank-Verbindung
    units.ts                  Mengen, Einheiten, Zutatenerkennung
    seed.ts                   Startinhalte
```

## Farbwelten

Unter `Einstellungen & Sync → Design` stehen sechs Farbwelten zur Wahl, jede
mit einer kleinen Vorschau. Die Wahl gilt sofort und wird pro Gerät gemerkt.

| Farbwelt | Charakter |
| --- | --- |
| Creme | warm und ruhig, Kupfer als Akzent – der Standard |
| Salbei | frisch und grün, viel Weiss |
| Pfirsich | fröhlich und warm, Koralle als Akzent |
| Himmel | hell und luftig, Blau als Akzent |
| Klar | reinweiss und modern, Tomatenrot |
| Dunkel | die bisherige Nachtfassung |

Die App ist immer hell, solange niemand `Dunkel` wählt – auch auf einem
iPhone im dunklen Modus. Gesetzt wird die Farbwelt von einem kleinen Skript
im Kopf der Seite, bevor etwas gezeichnet wird; so blitzt beim Öffnen keine
falsche Farbe auf. Alle Farbwelten haben mindestens den Kontrast der
Creme-Palette.

## Farben

Die Grundpalette, aus der Creme und Dunkel gebaut sind:

| Name | Hex | Verwendung |
| --- | --- | --- |
| Master Key | `#dccd8b` | High-Protein, Hintergründe und Linien |
| Prickly Pear | `#a7993c` | Vegi, erledigte Zutaten, Sync-Anzeige |
| Mozart | `#475480` | Ideen |
| Sunburn | `#b57056` | Favoriten, Comfort, Akzent im dunklen Modus |
| Roycroft Copper Red | `#7f3b25` | Knöpfe, Timer, App-Symbol |

Alle Farben stehen als CSS-Variablen am Anfang von `src/app/globals.css`:
oben Creme, darunter je ein Block `:root[data-theme=…]` für jede weitere
Farbwelt. Name, Beschreibung und Vorschau stehen in `src/lib/theme.ts`. Wer
eine Farbwelt dazubauen will, ergänzt beides. Für kleine Schrift auf hellem Grund sind
abgedunkelte Abstufungen hinterlegt, damit der Text lesbar bleibt.

## App-Symbol

`npm run icons` erzeugt die PNG-Symbole neu (`public/icons/`). Gezeichnet wird
der Schriftzug CRAVE aus Strecken und Kreisbögen, ganz ohne Schriftdatei oder
Bildbibliothek. Für den Browser-Tab entsteht zusätzlich ein kleines Zeichen mit
nur einem C, weil der Schriftzug bei 32 Pixeln nicht mehr lesbar wäre.
