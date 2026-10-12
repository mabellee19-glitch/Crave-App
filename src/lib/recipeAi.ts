/**
 * Uebernommene Rezepte einfacher machen.
 *
 * Rezeptseiten schreiben gern fuenf Saetze, wo einer reicht, und mischen das
 * Schneiden mitten ins Kochen. Das Modell kuerzt die Schritte und zieht die
 * Vorbereitung nach vorne – ohne am Rezept selbst etwas zu aendern: Zutaten
 * fasst es gar nicht an, und jede Zahl aus den Schritten (Temperaturen,
 * Zeiten, Mengen) muss danach noch dastehen. Fehlt eine, sagt die App das.
 *
 * Der Zugang zum Modell ist derselbe wie fuer das Kuehlschrankfoto.
 */

import type Anthropic from '@anthropic-ai/sdk';

type Antwort = Anthropic.Message | Anthropic.Beta.BetaMessage;
import { einordnen, istFeldFehler, visionAccess } from './vision';
import { ImportedRecipe, durationFromText, zutatenAusZeilen } from './recipeImport';
import { ohneEszett } from './aufraeumen';
import type { Uebersetzung } from './uebersetzen';

export interface SimplifyInput {
  name: string;
  servings: number | null;
  ingredients: Array<{ name: string; amount: number | null; unit: string }>;
  steps: Array<{ text: string; durationSec: number | null }>;
}

export interface SimplifyResult {
  prep: string[];
  steps: Array<{ text: string; durationSec: number | null }>;
  /** Zahlen aus den Original-Schritten, die in der neuen Fassung fehlen. */
  missingNumbers: string[];
}

const SYSTEM = `Du hilfst in einer privaten Koch-App. Du bekommst ein Rezept, das
von einer Webseite übernommen wurde. Die Schritte sind dort oft lang und
verschachtelt. Mach sie kürzer und einfacher – ohne das Rezept zu verändern.

Du lieferst zwei Dinge:

1. "vorbereitung": alles, was man vor dem eigentlichen Kochen erledigt –
   schneiden, hacken, reiben, schälen, waschen, abtropfen lassen, auftauen,
   Saft auspressen, eine Sauce oder Gewürzmischung anrühren, die später auf
   einmal dazukommt. Eine kurze Aufgabe pro Eintrag, z. B. "Zwiebel fein
   hacken". Das Abmessen der Zutaten zählst du nicht auf, das ergänzt die App.
   Den Ofen nur dann hier vorheizen, wenn er gleich zu Beginn gebraucht wird.

2. "schritte": die Zubereitung ab dem Moment, in dem gekocht wird. Was schon
   in der Vorbereitung steht, kommt hier nicht noch einmal vor: aus "Zwiebel
   fein hacken und glasig dünsten" wird "Zwiebel glasig dünsten".

Regeln für die Schritte:
- Höchstens zwei kurze Sätze pro Schritt. Ein sehr langer Schritt darf in
  zwei Schritte geteilt werden. Die Reihenfolge bleibt.
- Einfache Wörter, Befehlsform: "Pasta kochen", nicht "Die Pasta sollte
  gekocht werden".
- Alles behalten, was das Ergebnis beeinflusst: Mengen, Temperaturen,
  Garzeiten, Hitzestufen und Hinweise wie "Der Knoblauch soll nicht braun
  werden" oder "ständig rühren".
- Nichts dazuerfinden: keine neuen Zutaten, Mengen, Zeiten oder Arbeitsschritte.
- Füllwörter, Geschichten, Werbung und Wiederholungen streichen.
- Zeitangaben stehen weiter im Text, z. B. "10 Minuten köcheln lassen".
- "minuten": die Warte- oder Garzeit des Schritts, wenn eine genannt ist –
  bei einem Bereich wie "8–10 Minuten" der untere Wert. Sonst 0.
- Deutsch in Schweizer Schreibweise, ohne Eszett.

Antworte ausschliesslich über das Werkzeug rezept_vereinfacht.`;

const TOOL = {
  name: 'rezept_vereinfacht',
  description: 'Liefert die Vorbereitung und die vereinfachten Schritte eines Rezepts.',
  strict: true,
  input_schema: {
    type: 'object' as const,
    additionalProperties: false,
    required: ['vorbereitung', 'schritte'],
    properties: {
      vorbereitung: { type: 'array', items: { type: 'string' } },
      schritte: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['text', 'minuten'],
          properties: {
            text: { type: 'string' },
            minuten: { type: 'number' },
          },
        },
      },
    },
  },
};

function alsText(input: SimplifyInput): string {
  const zutaten = input.ingredients
    .filter((zutat) => zutat.name.trim())
    .map((zutat) => `- ${[zutat.amount ?? '', zutat.unit, zutat.name].join(' ').replace(/\s+/g, ' ').trim()}`)
    .join('\n');
  const schritte = input.steps
    .filter((step) => step.text.trim())
    .map((step, index) => `${index + 1}. ${step.text.trim()}`)
    .join('\n');
  return [
    `Rezept: ${input.name || 'ohne Namen'}`,
    input.servings ? `Portionen: ${input.servings}` : '',
    '',
    'Zutaten:',
    zutaten || '(keine angegeben)',
    '',
    'Schritte:',
    schritte,
  ]
    .filter((zeile, index, alle) => zeile !== '' || alle[index - 1] !== '')
    .join('\n');
}

/**
 * Zahlen, die im Original vorkommen – Temperaturen, Minuten, Mengen.
 * "8–10" zaehlt als 8 und 10, "1,5" als 1.5.
 */
function zahlen(text: string): Set<string> {
  const heraus = new Set<string>();
  for (const treffer of text.matchAll(/\d+(?:[.,]\d+)?/g)) {
    heraus.add(treffer[0].replace(',', '.'));
  }
  return heraus;
}

/**
 * Modellnamen in der Reihenfolge, in der sie versucht werden. Ueber das
 * Gateway steht die neuere Fassung vorne; kennt das Gateway sie (noch) nicht,
 * bleibt die, mit der auch das Kuehlschrankfoto laeuft.
 */
function modelle(gateway: boolean): string[] {
  return gateway ? ['anthropic/claude-opus-5.5', 'anthropic/claude-opus-5'] : ['claude-opus-5-5'];
}

function modellUnbekannt(err: unknown): boolean {
  const status = (err as { status?: number })?.status;
  const text = String((err as { message?: string })?.message ?? '').toLowerCase();
  return status === 404 || (status === 400 && text.includes('model'));
}

/** Ein Werkzeug, wie es die Messages-API erwartet. */
interface Werkzeug {
  name: string;
  description: string;
  strict: boolean;
  input_schema: { type: 'object'; [schluessel: string]: unknown };
}

/**
 * Das Modell mit einem Werkzeug fragen und dessen Eingabe zurueckgeben.
 * Gemeinsamer Weg fuers Vereinfachen und fuers Lesen von Seiten.
 */
async function frageWerkzeug(system: string, werkzeug: Werkzeug, inhalt: string): Promise<unknown> {
  const access = visionAccess();
  if (!access) throw new Error('no_key');

  const { default: AnthropicClient } = await import('@anthropic-ai/sdk');
  const client = new AnthropicClient({ apiKey: access.apiKey, baseURL: access.baseURL });

  const anfrage = (model: string) => ({
    model,
    max_tokens: 16000,
    system,
    tools: [werkzeug],
    // Erzwungene Werkzeugaufrufe nimmt das Modell nicht an; die Anweisung im
    // Systemtext und das strikte Schema genuegen.
    tool_choice: { type: 'auto' as const },
    messages: [{ role: 'user' as const, content: inhalt }],
  });

  /*
   * Ueber das Gateway geht die Anfrage denselben schlichten Weg wie das
   * Kuehlschrankfoto – der ist dort erprobt. Direkt bei Anthropic kommen zwei
   * Dinge dazu: wenig Nachdenken, weil Umformulieren und Abschreiben keine
   * schweren Aufgaben sind und die Wartezeit im Formular kurz bleiben soll;
   * und ein Ersatzmodell, das serverseitig einspringt, falls die
   * Sicherheitspruefung ablehnt.
   */
  const erstellen = async (model: string): Promise<Antwort> => {
    if (access.gateway) return client.messages.create(anfrage(model));
    try {
      return await client.beta.messages.create({
        ...anfrage(model),
        output_config: { effort: 'low' },
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
      });
    } catch (err) {
      // Kennt die Gegenstelle eines der Felder nicht: schlichter nochmal.
      if (!istFeldFehler(err)) throw err;
      return client.messages.create(anfrage(model));
    }
  };

  let response: Antwort | undefined;
  let letzterFehler: unknown = null;
  for (const model of modelle(access.gateway)) {
    try {
      response = await erstellen(model);
      break;
    } catch (err) {
      letzterFehler = err;
      if (!modellUnbekannt(err)) break;
    }
  }
  if (!response) throw new Error(einordnen(letzterFehler));

  if (response.stop_reason === 'refusal') throw new Error('refused');
  const call = response.content.find((block) => block.type === 'tool_use');
  if (!call || call.type !== 'tool_use') throw new Error('no_result');
  return call.input;
}

export async function simplifyRecipe(input: SimplifyInput): Promise<SimplifyResult> {
  if (!visionAccess()) throw new Error('no_key');
  const original = input.steps.filter((step) => step.text.trim());
  if (original.length === 0) throw new Error('no_steps');

  const eingabe = await frageWerkzeug(SYSTEM, TOOL, alsText(input));

  const roh = eingabe as {
    vorbereitung?: unknown;
    schritte?: Array<{ text?: unknown; minuten?: unknown }>;
  };

  const prep = (Array.isArray(roh.vorbereitung) ? roh.vorbereitung : [])
    .filter((eintrag): eintrag is string => typeof eintrag === 'string')
    .map((eintrag) => ohneEszett(eintrag.trim().replace(/\.$/, '')))
    .filter(Boolean);

  const steps = (Array.isArray(roh.schritte) ? roh.schritte : [])
    .map((schritt) => {
      const text = ohneEszett(String(schritt?.text ?? '').trim());
      const minuten = Number(schritt?.minuten);
      return {
        text,
        durationSec: minuten > 0 ? Math.round(minuten * 60) : durationFromText(text),
      };
    })
    .filter((schritt) => schritt.text.length > 0);

  if (steps.length === 0) throw new Error('no_result');

  // Gegenprobe: jede Zahl aus den alten Schritten muss irgendwo stehen.
  const vorher = zahlen(original.map((step) => step.text).join(' '));
  const nachher = zahlen([...prep, ...steps.map((step) => step.text)].join(' '));
  const missingNumbers = [...vorher].filter((zahl) => !nachher.has(zahl));

  return { prep, steps, missingNumbers };
}

/**
 * Wie uebersetzt wird – beim Lesen einer Seite und beim Uebersetzen eines
 * schon gespeicherten Rezepts dieselben Regeln. Steht vor LESEN, weil der
 * Text dort sie einbettet.
 */
const UEBERSETZEN_REGELN = `So wird übersetzt:
- Ins Deutsche, wie man in der Schweiz schreibt: nie Eszett, immer "ss"
  (gross, Sauce, Strasse). Poulet statt Hähnchen, Rahm statt Sahne,
  Peperoni statt Paprika (das Gemüse).
- Amerikanische Masse in metrische umrechnen, gerundet auf Werte, die man
  abmessen kann:
  - Grad Fahrenheit in Grad Celsius, auf 5 gerundet: 350 °F → 180 °C,
    375 °F → 190 °C, 400 °F → 200 °C, 425 °F → 220 °C.
  - oz in g (1 oz = 28 g), lb in g (1 lb = 450 g), fl oz in ml
    (1 fl oz = 30 ml), Inch in cm (1 Inch = 2,5 cm).
  - cup: bei Flüssigkeiten in dl (1 cup = 2,4 dl); bei Mehl, Zucker, Reis,
    Haferflocken, geriebenem Käse, Nüssen und Ähnlichem in g nach der
    üblichen Umrechnung (1 cup Mehl = 125 g, 1 cup Zucker = 200 g); wo das
    nicht passt, etwa bei gehackten Kräutern, "Tasse".
  - 1 stick butter = 115 g Butter; tbsp wird EL, tsp wird TL.
  - Steht schon eine metrische Angabe daneben, gilt diese.
- Zutaten: Menge und Einheit vorne, z. B. "250 g Mehl" oder "2 EL Olivenöl".
  Brüche als Dezimalzahl mit Punkt: "0.5 TL Salz", nicht "1/2 TL Salz".
  Zusätze in Klammern, etwa die Gruppe einer Zutat, übersetzt du mit.
- Schritte und Vorbereitung: nichts weglassen, nichts zusammenfassen, nichts
  kürzen, nichts dazuerfinden. Zeiten bleiben im Text, in Minuten.
- Der Name: der übliche deutsche Name des Gerichts. Namen, die man auch hier
  auf Englisch kennt (Pancakes, Brownies, Cheesecake, Cookies, Coleslaw),
  bleiben.`;

/* -------------------------------------------------------------------------- */
/* Ein Rezept aus Text lesen                                                   */
/* -------------------------------------------------------------------------- */

const LESEN = `Du hilfst in einer privaten Koch-App. Du bekommst den Text einer
Webseite oder einen kopierten Text. Lies das Rezept daraus – so, wie es
dasteht. Gekürzt und vereinfacht wird später in einem eigenen Schritt.

- "gefunden": false, wenn im Text kein Rezept steht (nur eine Übersicht,
  eine Werbeseite, ein Fehler). Dann den Rest leer lassen.
- "name": der Name des Gerichts, ohne Zusätze wie "Rezept" oder den Namen
  der Seite.
- "portionen": für wie viele Personen oder Stück, sonst 0.
- "minuten": die gesamte Zubereitungszeit, sonst 0.
- "zutaten": eine Zeile pro Zutat, Menge und Einheit vorne, so wie sie im
  Text stehen, z. B. "200 g Mehl" oder "1 Prise Salz". Teilt das Rezept die
  Zutaten in Gruppen, kommt vor jede Gruppe eine eigene Zeile mit ihrem
  Namen und einem Doppelpunkt, z. B. "Teig:".
- "schritte": die Zubereitung in der Reihenfolge des Textes, ein Eintrag
  pro Schritt, ohne Nummern. Nichts weglassen, nichts dazuerfinden.
- Kommentare, Werbung, Nährwerte und die Geschichte drumherum gehören nicht
  dazu.
- Steht das Rezept nicht auf Deutsch, übersetzt du es dabei nach den Regeln
  unten und setzt "uebersetzt" auf true. Sonst bleibt der Text, wie er ist,
  und "uebersetzt" ist false.

${UEBERSETZEN_REGELN}

Antworte ausschliesslich über das Werkzeug rezept_gelesen.`;

const LESEN_TOOL = {
  name: 'rezept_gelesen',
  description: 'Liefert das Rezept, das im Text steht.',
  strict: true,
  input_schema: {
    type: 'object' as const,
    additionalProperties: false,
    required: ['gefunden', 'uebersetzt', 'name', 'portionen', 'minuten', 'zutaten', 'schritte'],
    properties: {
      gefunden: { type: 'boolean' },
      uebersetzt: { type: 'boolean' },
      name: { type: 'string' },
      portionen: { type: 'number' },
      minuten: { type: 'number' },
      zutaten: { type: 'array', items: { type: 'string' } },
      schritte: { type: 'array', items: { type: 'string' } },
    },
  },
};

/**
 * Ein Rezept aus Seitentext oder eingefuegtem Text lesen lassen – fuer
 * Seiten ohne Rezeptdaten. `null`, wenn das Modell keines findet.
 */
export async function rezeptLesen(text: string, quelle: string): Promise<ImportedRecipe | null> {
  if (!text.trim()) return null;
  const roh = (await frageWerkzeug(
    LESEN,
    LESEN_TOOL,
    `Quelle: ${quelle || 'eingefügter Text'}\n\n${text}`,
  )) as {
    gefunden?: unknown;
    uebersetzt?: unknown;
    name?: unknown;
    portionen?: unknown;
    minuten?: unknown;
    zutaten?: unknown;
    schritte?: unknown;
  };
  if (!roh.gefunden) return null;

  const zeilen = (Array.isArray(roh.zutaten) ? roh.zutaten : []).filter(
    (zeile): zeile is string => typeof zeile === 'string',
  );
  const steps = (Array.isArray(roh.schritte) ? roh.schritte : [])
    .filter((schritt): schritt is string => typeof schritt === 'string')
    .map((schritt) => schritt.trim())
    .filter(Boolean)
    .map((schritt) => ({ text: schritt, durationSec: durationFromText(schritt) }));
  const ingredients = zutatenAusZeilen(zeilen);
  const name = String(roh.name ?? '').trim();
  if (!name || (ingredients.length === 0 && steps.length === 0)) return null;

  const portionen = Number(roh.portionen);
  const minuten = Number(roh.minuten);
  return {
    name,
    servings: portionen > 0 && portionen <= 99 ? Math.round(portionen) : null,
    timeMin: minuten > 0 ? Math.round(minuten) : null,
    ingredients,
    steps,
    source: quelle,
    herkunft: 'ki',
    ...(roh.uebersetzt === true ? { uebersetztAus: 'en' as const } : {}),
  };
}

/* -------------------------------------------------------------------------- */
/* Englische Rezepte auf Deutsch                                               */
/* -------------------------------------------------------------------------- */

const UEBERSETZEN = `Du hilfst in einer privaten Koch-App in der Schweiz. Du bekommst
ein Rezept auf Englisch und übersetzt es ins Deutsche.

Jede Liste kommt in derselben Länge und Reihenfolge zurück, Eintrag für
Eintrag: die dritte Zutat bleibt die dritte, der zweite Schritt der zweite.
Eine leere Liste bleibt leer.

${UEBERSETZEN_REGELN}

Antworte ausschliesslich über das Werkzeug rezept_uebersetzt.`;

const LISTEN = ['zutaten', 'schritte', 'vorbereitung', 'originalSchritte', 'originalVorbereitung'] as const;

const LISTEN_FELD: Record<(typeof LISTEN)[number], string> = {
  zutaten: 'zutaten',
  schritte: 'schritte',
  vorbereitung: 'vorbereitung',
  originalSchritte: 'original_schritte',
  originalVorbereitung: 'original_vorbereitung',
};

const LISTEN_TITEL: Record<(typeof LISTEN)[number], string> = {
  zutaten: 'Zutaten (zutaten)',
  schritte: 'Schritte (schritte)',
  vorbereitung: 'Vorbereitung (vorbereitung)',
  originalSchritte: 'Ursprüngliche Schritte (original_schritte)',
  originalVorbereitung: 'Ursprüngliche Vorbereitung (original_vorbereitung)',
};

const UEBERSETZEN_TOOL = {
  name: 'rezept_uebersetzt',
  description: 'Liefert das Rezept auf Deutsch, jede Liste in derselben Länge wie im Original.',
  strict: true,
  input_schema: {
    type: 'object' as const,
    additionalProperties: false,
    required: ['name', ...LISTEN.map((liste) => LISTEN_FELD[liste])],
    properties: {
      name: { type: 'string' },
      ...Object.fromEntries(
        LISTEN.map((liste) => [LISTEN_FELD[liste], { type: 'array', items: { type: 'string' } }]),
      ),
    },
  },
};

/**
 * Ein englisches Rezept auf Deutsch. Kommt eine Liste in anderer Laenge
 * zurueck, gilt die Uebersetzung nicht ("incomplete"): dann passten Zutaten
 * und Schritte nicht mehr zu dem, was am Rezept haengt.
 */
export async function rezeptUebersetzen(eingabe: Uebersetzung): Promise<Uebersetzung> {
  if (!visionAccess()) throw new Error('no_key');

  const text = [
    `Name: ${eingabe.name}`,
    ...LISTEN.map((liste) => {
      const eintraege = eingabe[liste];
      return `\n${LISTEN_TITEL[liste]}:\n${
        eintraege.length ? eintraege.map((eintrag, index) => `${index + 1}. ${eintrag}`).join('\n') : '(leer)'
      }`;
    }),
  ].join('\n');

  const roh = (await frageWerkzeug(UEBERSETZEN, UEBERSETZEN_TOOL, text)) as Record<string, unknown>;

  const name = ohneEszett(String(roh.name ?? '').trim());
  if (!name) throw new Error('no_result');
  const heraus: Uebersetzung = { ...eingabe, name };
  for (const liste of LISTEN) {
    const wert = roh[LISTEN_FELD[liste]];
    const eintraege = (Array.isArray(wert) ? wert : []).map((eintrag) =>
      ohneEszett(String(eintrag ?? '').trim()),
    );
    if (eintraege.length !== eingabe[liste].length || eintraege.some((eintrag) => !eintrag)) {
      throw new Error('incomplete');
    }
    heraus[liste] = eintraege;
  }
  return heraus;
}
