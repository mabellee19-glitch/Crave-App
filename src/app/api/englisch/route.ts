import { NextRequest, NextResponse } from 'next/server';
import { hasVisionKey } from '@/lib/vision';
import { aufEnglisch } from '@/lib/recipeAi';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

const NO_STORE = { 'Cache-Control': 'no-store, max-age=0' };
const MAX_TEXTE = 120;
const MAX_ZEICHEN = 30_000;

/**
 * Deutsche Texte eines Rezepts fuer die englische Ansicht. Der Browser
 * schickt nur, was noch fehlt, und merkt sich die Antwort am Rezept.
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
  const roh = (body as { texte?: unknown })?.texte;
  const texte = (Array.isArray(roh) ? roh : []).map((text) => String(text ?? '').trim()).filter(Boolean);
  if (texte.length === 0) {
    return NextResponse.json({ ok: false, error: 'no_result' }, { status: 400, headers: NO_STORE });
  }
  if (texte.length > MAX_TEXTE || texte.join('').length > MAX_ZEICHEN) {
    return NextResponse.json({ ok: false, error: 'too_large' }, { status: 413, headers: NO_STORE });
  }
  try {
    return NextResponse.json({ ok: true, texte: await aufEnglisch(texte) }, { headers: NO_STORE });
  } catch (err) {
    const error = err instanceof Error ? err.message : 'unknown_error';
    const status = error === 'no_result' || error === 'refused' || error === 'incomplete' ? 422 : 503;
    return NextResponse.json({ ok: false, error }, { status, headers: NO_STORE });
  }
}
