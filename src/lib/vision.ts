/**
 * Auswertung eines Kühlschrankfotos.
 *
 * Der Aufruf des Modells liegt bewusst in einem eigenen Modul: so bleibt der
 * Teil, der eine echte API braucht, klein und die Datenform ist an einer
 * Stelle beschrieben.
 */

export interface VisionIngredient {
  name: string;
  /** Menge, 0 = ohne Mengenangabe. */
  menge: number;
  einheit: string;
}

export interface VisionStep {
  text: string;
  /** Dauer in Minuten, 0 = kein Timer. */
  minuten: number;
}

export interface VisionIdea {
  name: string;
  kategorie: string;
  portionen: number;
  zeitMin: number;
  zutaten: VisionIngredient[];
  schritte: VisionStep[];
  /** Zutaten, die auf dem Foto nicht zu sehen sind. */
  fehlt: string[];
}

export interface VisionResult {
  lebensmittel: string[];
  ideen: VisionIdea[];
}

export function hasVisionKey(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
}

const SYSTEM = `Du hilfst in einer privaten Koch-App. Du bekommst ein Foto eines
Kühlschranks oder einer Vorratskammer und sollst daraus Kochideen ableiten.

Regeln:
- Nenne unter "lebensmittel" nur, was auf dem Foto tatsächlich zu erkennen ist.
  Rate nicht. Was du nicht sicher erkennst, lässt du weg.
- Schlage unter "ideen" drei Gerichte vor, die möglichst viel davon verwenden.
- Übliche Grundzutaten wie Salz, Pfeffer, Öl, Mehl oder Wasser darfst du
  voraussetzen, auch wenn sie nicht zu sehen sind.
- Was ein Vorschlag darüber hinaus braucht und nicht auf dem Foto ist, gehört
  unter "fehlt".
- Schreibe auf Deutsch, in Schweizer Schreibweise ohne Eszett.
- Mengen beziehen sich auf die angegebene Portionenzahl. Ohne Mengenangabe: 0.
- "minuten" nur setzen, wenn der Schritt wirklich eine Wartezeit hat, sonst 0.
- Antworte ausschliesslich über das Werkzeug kuehlschrank_auswertung.`;

const TOOL = {
  name: 'kuehlschrank_auswertung',
  description: 'Meldet die erkannten Lebensmittel und passende Rezeptideen.',
  strict: true,
  input_schema: {
    type: 'object' as const,
    additionalProperties: false,
    required: ['lebensmittel', 'ideen'],
    properties: {
      lebensmittel: { type: 'array', items: { type: 'string' } },
      ideen: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['name', 'kategorie', 'portionen', 'zeitMin', 'zutaten', 'schritte', 'fehlt'],
          properties: {
            name: { type: 'string' },
            kategorie: { type: 'string', enum: ['High-Protein', 'Comfort', 'Vegi'] },
            portionen: { type: 'integer' },
            zeitMin: { type: 'integer' },
            zutaten: {
              type: 'array',
              items: {
                type: 'object',
                additionalProperties: false,
                required: ['name', 'menge', 'einheit'],
                properties: {
                  name: { type: 'string' },
                  menge: { type: 'number' },
                  einheit: { type: 'string' },
                },
              },
            },
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
            fehlt: { type: 'array', items: { type: 'string' } },
          },
        },
      },
    },
  },
};

/**
 * Foto auswerten. `image` ist eine Data-URL, wie sie die Kamera im Browser
 * nach dem Verkleinern liefert.
 */
export async function analysePhoto(image: string): Promise<VisionResult> {
  const match = image.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!match) throw new Error('unsupported_image');
  const [, mediaType, data] = match;

  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  const client = new Anthropic();

  const response = await client.messages.create({
    model: 'claude-opus-5',
    max_tokens: 16000,
    thinking: { type: 'adaptive' },
    // Erkennen und drei Ideen ableiten braucht etwas Nachdenken, aber keine
    // volle Tiefe – das hier ist keine schwierige Aufgabe.
    output_config: { effort: 'medium' },
    system: SYSTEM,
    tools: [TOOL],
    // Bewusst kein erzwungener Werkzeugaufruf: die Anweisung im Systemtext
    // genügt, und erzwungene Aufrufe vertragen sich nicht mit jedem Modell.
    tool_choice: { type: 'auto' },
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mediaType as 'image/jpeg', data },
          },
          { type: 'text', text: 'Was ist da drin, und was könnte ich damit kochen?' },
        ],
      },
    ],
  });

  if (response.stop_reason === 'refusal') throw new Error('refused');

  const call = response.content.find((block) => block.type === 'tool_use');
  if (!call || call.type !== 'tool_use') throw new Error('no_result');

  return normalise(call.input as Partial<VisionResult>);
}

/** Antwort auf die erwartete Form bringen, egal was zurückkommt. */
function normalise(input: Partial<VisionResult>): VisionResult {
  const lebensmittel = (input.lebensmittel ?? [])
    .filter((entry): entry is string => typeof entry === 'string')
    .map((entry) => entry.trim())
    .filter(Boolean);

  const ideen = (input.ideen ?? []).filter(Boolean).map((idee) => ({
    name: String(idee.name ?? '').trim(),
    kategorie: String(idee.kategorie ?? '').trim(),
    portionen: Number(idee.portionen) > 0 ? Math.round(Number(idee.portionen)) : 2,
    zeitMin: Number(idee.zeitMin) > 0 ? Math.round(Number(idee.zeitMin)) : 0,
    zutaten: (idee.zutaten ?? [])
      .filter((entry) => entry && String(entry.name ?? '').trim())
      .map((entry) => ({
        name: String(entry.name).trim(),
        menge: Number(entry.menge) > 0 ? Number(entry.menge) : 0,
        einheit: String(entry.einheit ?? '').trim(),
      })),
    schritte: (idee.schritte ?? [])
      .filter((entry) => entry && String(entry.text ?? '').trim())
      .map((entry) => ({
        text: String(entry.text).trim(),
        minuten: Number(entry.minuten) > 0 ? Number(entry.minuten) : 0,
      })),
    fehlt: (idee.fehlt ?? [])
      .filter((entry): entry is string => typeof entry === 'string')
      .map((entry) => entry.trim())
      .filter(Boolean),
  }));

  return { lebensmittel, ideen: ideen.filter((idee) => idee.name) };
}
