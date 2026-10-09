import { NextRequest, NextResponse } from 'next/server';
import { hasVisionKey } from '@/lib/vision';
import { SimplifyInput, simplifyRecipe } from '@/lib/recipeAi';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

const NO_STORE = { 'Cache-Control': 'no-store, max-age=0' };

/** Ein Rezept, kein Kochbuch: Grenzen gegen versehentlich riesige Eingaben. */
const MAX_STEPS = 60;
const MAX_TEXT = 20_000;

export async function POST(req: NextRequest) {
  if (!hasVisionKey()) {
    return NextResponse.json({ ok: false, error: 'no_key' }, { status: 503, headers: NO_STORE });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400, headers: NO_STORE });
  }

  const roh = (body as { recipe?: Partial<SimplifyInput> })?.recipe;
  const steps = Array.isArray(roh?.steps) ? roh.steps : [];
  const ingredients = Array.isArray(roh?.ingredients) ? roh.ingredients : [];
  if (steps.length === 0) {
    return NextResponse.json({ ok: false, error: 'no_steps' }, { status: 400, headers: NO_STORE });
  }
  if (steps.length > MAX_STEPS || JSON.stringify(roh).length > MAX_TEXT) {
    return NextResponse.json({ ok: false, error: 'too_large' }, { status: 413, headers: NO_STORE });
  }

  const input: SimplifyInput = {
    name: String(roh?.name ?? '').slice(0, 200),
    servings: Number(roh?.servings) > 0 ? Number(roh?.servings) : null,
    ingredients: ingredients.map((zutat) => ({
      name: String(zutat?.name ?? ''),
      amount: typeof zutat?.amount === 'number' ? zutat.amount : null,
      unit: String(zutat?.unit ?? ''),
    })),
    steps: steps.map((step) => ({
      text: String(step?.text ?? ''),
      durationSec: typeof step?.durationSec === 'number' ? step.durationSec : null,
    })),
  };

  try {
    const result = await simplifyRecipe(input);
    return NextResponse.json({ ok: true, ...result }, { headers: NO_STORE });
  } catch (err) {
    const error = err instanceof Error ? err.message : 'unknown_error';
    const status = error === 'no_result' || error === 'refused' || error === 'no_steps' ? 422 : 503;
    return NextResponse.json({ ok: false, error }, { status, headers: NO_STORE });
  }
}
