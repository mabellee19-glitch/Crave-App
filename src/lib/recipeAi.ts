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
    .map((eintrag) => eintrag.trim().replace(/\.$/, ''))
    .filter(Boolean);

  const steps = (Array.isArray(roh.schritte) ? roh.schritte : [])
    .map((schritt) => {
      const text = String(schritt?.text ?? '').trim();
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

Antworte ausschliesslich über das Werkzeug rezept_gelesen.`;

const LESEN_TOOL = {
  name: 'rezept_gelesen',
  description: 'Liefert das Rezept, das im Text steht.',
  strict: true,
  input_schema: {
    type: 'object' as const,
    additionalProperties: false,
    required: ['gefunden', 'name', 'portionen', 'minuten', 'zutaten', 'schritte'],
    properties: {
      gefunden: { type: 'boolean' },
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
  };
}
