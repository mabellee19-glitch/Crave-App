# CRAVE

Persönliche Koch- und Einkaufs-App. Mobile-first, läuft im Browser (Safari auf
iPhone und iPad, Chrome, Edge, Firefox) und lässt sich zum Home-Bildschirm
hinzufügen. Kein App Store nötig.

Drei Bereiche:

- **Rezepte** – Sammlung mit Zutaten, Zubereitungsschritten und Kochmodus.
- **Gerichte** – Essensideen in den Kategorien High-Protein, Comfort und Vegi,
  optional mit einem Rezept verknüpft.
- **Einkaufsliste** – aktive Liste plus dauerhafte Grundliste mit
  Standard-Zutaten.

## Was die App kann

| Bereich | Funktion |
| --- | --- |
| Rezepte | Anlegen, bearbeiten, löschen; Kategorie, Portionen, Zeit |
| Rezepte | Portionen ändern – die Zutatenmengen rechnen sich automatisch um |
| Rezepte | `Start Cooking`: ein Schritt pro Bildschirm, gross gesetzt |
| Kochmodus | Timer pro Schritt mit Ton und Vibration, Display bleibt an |
| Kochmodus | Timer laufen beim Weiterblättern weiter, auch mehrere gleichzeitig |
| Gerichte | Filter nach Kategorie und Favoriten, Suche |
| Gerichte | Verknüpfte Gerichte öffnen direkt das hinterlegte Rezept |
| Einkaufsliste | Schnelleingabe erkennt Menge und Einheit (`400 g Poulet`) |
| Einkaufsliste | Abhaken lässt Standard-Zutaten in die Grundliste zurückwandern |
| Grundliste | Antippen legt eine Zutat in die aktive Liste |
| Grundliste | Rubriken zum Aufklappen, dazu eine Vorschlagsliste zum Nachtragen |
| Rezept → Liste | Zutaten werden mit Mengen übernommen und zusammengefasst |
| Kühlschrankfoto | Foto erkennt Lebensmittel, findet passende eigene Rezepte und schlägt neue vor |
| Überall | Favoriten, Suche, automatisches Speichern, Geräte-Abgleich |

## Startinhalte nachtragen

Startinhalte bekommt ein Datenraum nur beim allerersten Öffnen. Wer die App
schon benutzt, sieht später ergänzte Inhalte deshalb nicht automatisch. Dafür
gibt es zwei Knöpfe in der App selbst:

- `Einstellungen & Sync → Fehlende Rezepte nachtragen` legt Rezepte an, die es
  unter ihrer Id noch nie gab. Vorhandene bleiben unverändert, gelöschte
  kommen nicht zurück. Einzige Ausnahme: fehlen einem vorhandenen Rezept die
  Zubereitungsschritte komplett, werden sie ergänzt.
- `Einkaufsliste → Verwalten → Vorschlagsliste ergänzen` trägt fehlende
  Standard-Zutaten nach und ordnet vorhandene ohne Rubrik ein.

Beide sind rein ergänzend und lassen sich gefahrlos mehrfach auslösen. Die
Vorlagen stehen in `src/lib/seed.ts` (`PANTRY_CATALOGUE` und die Rezeptliste).

Für den Weg über die Kommandozeile gibt es zusätzlich:

```bash
npm run add-recipes -- https://deine-app.vercel.app/s/DEINE-ID
```

## Kühlschrankfoto einrichten (optional)

Der Kamera-Knopf oben rechts wertet ein Foto aus: er listet die erkannten
Lebensmittel, sucht daraus passende Rezepte aus der eigenen Sammlung und
schlägt zusätzlich neue Gerichte vor, die sich als Rezept speichern lassen.

Dafür braucht der Server einen API-Schlüssel von Anthropic:

1. Schlüssel unter [console.anthropic.com](https://console.anthropic.com)
   erstellen.
2. Als Umgebungsvariable `ANTHROPIC_API_KEY` hinterlegen – auf Vercel unter
   `Settings → Environment Variables`, lokal in `.env.local`.
3. Neu deployen.

Ohne Schlüssel bleibt der Rest der App unberührt; der Knopf erklärt dann, was
fehlt. Ob es eingerichtet ist, sagt `/api/status` im Feld `vision` – nur
ja oder nein, nie der Schlüssel selbst.

Zum Ablauf: das Foto wird im Browser auf 1024 Pixel Kantenlänge verkleinert
und dann zur Auswertung an die Anthropic-API geschickt. Es wird nirgends
gespeichert, weder in der Datenbank noch in der Einkaufsliste. Ein Aufruf
kostet je nach Foto grob ein bis zwei Rappen.

Welche eigenen Rezepte passen, rechnet die App selbst aus – aus den erkannten
Lebensmitteln plus der Grundliste, denn Salz und Öl stehen zu Hause und nicht
im Kühlschrank. Das Modell schlägt nur neue Gerichte vor und kann deshalb
nichts empfehlen, was es gar nicht gibt.

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
   wartet nie auf das Netz und funktioniert auch offline.
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
    store.tsx                 lokaler Zustand und Abgleich
    merge.ts                  Zusammenführen zweier Stände
    db.ts                     Postgres bzw. Datei-Fallback
    connection.ts             Finden der Datenbank-Verbindung
    units.ts                  Mengen, Einheiten, Zutatenerkennung
    seed.ts                   Startinhalte
```

## Farben

| Name | Hex | Verwendung |
| --- | --- | --- |
| Master Key | `#dccd8b` | High-Protein, Hintergründe und Linien |
| Prickly Pear | `#a7993c` | Vegi, erledigte Zutaten, Sync-Anzeige |
| Mozart | `#475480` | Verknüpfungen zwischen Gericht und Rezept |
| Sunburn | `#b57056` | Favoriten, Comfort, Akzent im dunklen Modus |
| Roycroft Copper Red | `#7f3b25` | Knöpfe, Timer, App-Symbol |

Alle Farben stehen als CSS-Variablen am Anfang von `src/app/globals.css`,
jeweils einmal für hell und einmal für dunkel. Wer die Palette austauschen
will, ändert nur diesen Block. Für kleine Schrift auf hellem Grund sind
abgedunkelte Abstufungen hinterlegt, damit der Text lesbar bleibt.

## App-Symbol

`npm run icons` erzeugt die PNG-Symbole neu (`public/icons/`). Gezeichnet wird
der Schriftzug CRAVE aus Strecken und Kreisbögen, ganz ohne Schriftdatei oder
Bildbibliothek. Für den Browser-Tab entsteht zusätzlich ein kleines Zeichen mit
nur einem C, weil der Schriftzug bei 32 Pixeln nicht mehr lesbar wäre.
