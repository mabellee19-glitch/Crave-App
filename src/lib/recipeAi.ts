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
import { durationFromText } from './recipeImport';

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

export async function simplifyRecipe(input: SimplifyInput): Promise<SimplifyResult> {
  const access = visionAccess();
  if (!access) throw new Error('no_key');

  const original = input.steps.filter((step) => step.text.trim());
  if (original.length === 0) throw new Error('no_steps');

  const { default: AnthropicClient } = await import('@anthropic-ai/sdk');
  const client = new AnthropicClient({ apiKey: access.apiKey, baseURL: access.baseURL });

  const anfrage = (model: string) => ({
    model,
    max_tokens: 16000,
    system: SYSTEM,
    tools: [TOOL],
    // Erzwungene Werkzeugaufrufe nimmt das Modell nicht an; die Anweisung im
    // Systemtext und das strikte Schema genuegen.
    tool_choice: { type: 'auto' as const },
    messages: [{ role: 'user' as const, content: alsText(input) }],
  });

  /*
   * Ueber das Gateway geht die Anfrage denselben schlichten Weg wie das
   * Kuehlschrankfoto – der ist dort erprobt. Direkt bei Anthropic kommen zwei
   * Dinge dazu: wenig Nachdenken, weil Umformulieren keine schwere Aufgabe ist
   * und die Wartezeit im Formular kurz bleiben soll; und ein Ersatzmodell,
   * das serverseitig einspringt, falls die Sicherheitspruefung ablehnt.
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

  const roh = call.input as {
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
