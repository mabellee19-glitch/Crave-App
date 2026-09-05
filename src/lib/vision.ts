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

/**
 * Zugang zum Modell.
 *
 * Zwei Wege führen zum Ziel, und beide sprechen dieselbe Schnittstelle:
 *
 * 1. Vercels AI Gateway. Auf Vercel gibt es dafür entweder einen eigenen
 *    Schlüssel (AI_GATEWAY_API_KEY) oder – ganz ohne Schlüssel – das
 *    kurzlebige OIDC-Token, das Vercel jeder Funktion selbst mitgibt.
 *    Abgerechnet wird über Vercel, ein Konto beim Modellanbieter braucht es
 *    nicht.
 * 2. Ein Schlüssel direkt von Anthropic (ANTHROPIC_API_KEY).
 *
 * Das Gateway hat Vorrang: wer es eingerichtet hat, will darüber abrechnen.
 * Die Modellnamen unterscheiden sich – über das Gateway trägt jedes Modell
 * seinen Anbieter im Namen.
 */
interface VisionAccess {
  apiKey: string;
  baseURL?: string;
  model: string;
  /** Über das Gateway laufen nur die Felder mit, die es sicher kennt. */
  gateway: boolean;
}

export function visionAccess(): VisionAccess | null {
  // Absichtlich bei jedem Aufruf frisch gelesen: das OIDC-Token wird von
  // Vercel regelmässig erneuert.
  const gatewayKey = process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN;
  if (gatewayKey) {
    return {
      apiKey: gatewayKey,
      baseURL: process.env.AI_GATEWAY_BASE_URL || 'https://ai-gateway.vercel.sh',
      model: 'anthropic/claude-opus-5',
      gateway: true,
    };
  }

  const direct = process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN;
  if (direct) return { apiKey: direct, model: 'claude-opus-5', gateway: false };

  return null;
}

export function hasVisionKey(): boolean {
  return visionAccess() !== null;
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

  const access = visionAccess();
  if (!access) throw new Error('no_key');

  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey: access.apiKey, baseURL: access.baseURL });

  const message = {
    role: 'user' as const,
    content: [
      {
        type: 'image' as const,
        source: { type: 'base64' as const, media_type: mediaType as 'image/jpeg', data },
      },
      { type: 'text' as const, text: 'Was ist da drin, und was könnte ich damit kochen?' },
    ],
  };

  const basis = {
    model: access.model,
    max_tokens: 16000,
    system: SYSTEM,
    tools: [TOOL],
    // Bewusst kein erzwungener Werkzeugaufruf: die Anweisung im Systemtext
    // genügt, und erzwungene Aufrufe vertragen sich nicht mit jedem Modell.
    tool_choice: { type: 'auto' as const },
    messages: [message],
  };

  // Erkennen und drei Ideen ableiten braucht etwas Nachdenken, aber keine
  // volle Tiefe – das hier ist keine schwierige Aufgabe.
  const kuer = {
    thinking: { type: 'adaptive' as const },
    ...(access.gateway ? {} : { output_config: { effort: 'medium' as const } }),
  };

  let response;
  try {
    response = await client.messages.create({ ...basis, ...kuer });
  } catch (err) {
    // Ein Gateway zwischendrin kennt nicht zwingend jedes Feld. Lieber ein
    // schlichterer zweiter Versuch als eine Fehlermeldung fürs Kochen.
    if (!istFeldFehler(err)) throw err;
    response = await client.messages.create(basis);
  }

  if (response.stop_reason === 'refusal') throw new Error('refused');

  const call = response.content.find((block) => block.type === 'tool_use');
  if (!call || call.type !== 'tool_use') throw new Error('no_result');

  return normalise(call.input as Partial<VisionResult>);
}

/**
 * Ob die Anfrage an einem Feld gescheitert ist, das die Gegenstelle nicht
 * kennt – und nicht etwa am Schlüssel, am Guthaben oder am Bild.
 */
function istFeldFehler(err: unknown): boolean {
  const status = (err as { status?: number })?.status;
  if (status !== 400 && status !== 422) return false;
  const text = String((err as { message?: string })?.message ?? '').toLowerCase();
  return (
    text.includes('thinking') ||
    text.includes('output_config') ||
    text.includes('effort') ||
    text.includes('unknown') ||
    text.includes('unsupported') ||
    text.includes('unrecognized') ||
    text.includes('not permitted') ||
    text.includes('extra field') ||
    text.includes('additional propert')
  );
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
