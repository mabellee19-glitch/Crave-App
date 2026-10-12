import { NextRequest, NextResponse } from 'next/server';
import { hasVisionKey } from '@/lib/vision';
import { zutatFragen } from '@/lib/recipeAi';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 30;

const NO_STORE = { 'Cache-Control': 'no-store, max-age=0' };

/**
 * Menge, Einheit, Abteilung und beide Namen fuer eine Zutat, die die App
 * nicht selbst kennt (lib/zutaten). Der Browser merkt sich die Antwort.
 */
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
  const zutat = String((body as { zutat?: unknown })?.zutat ?? '').trim();
  if (zutat.length < 2 || zutat.length > 80) {
    return NextResponse.json({ ok: false, error: 'invalid_input' }, { status: 400, headers: NO_STORE });
  }
  try {
    const antwort = await zutatFragen(zutat);
    return NextResponse.json({ ok: true, ...antwort }, { headers: NO_STORE });
  } catch (err) {
    const error = err instanceof Error ? err.message : 'unknown_error';
    const status = error === 'no_result' || error === 'refused' ? 422 : 503;
    return NextResponse.json({ ok: false, error }, { status, headers: NO_STORE });
  }
}
