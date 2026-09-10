import { NextRequest, NextResponse } from 'next/server';
import { holeSeite } from '@/lib/safeFetch';
import { extractRecipe } from '@/lib/recipeImport';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 30;

const NO_STORE = { 'Cache-Control': 'no-store, max-age=0' };

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400, headers: NO_STORE });
  }

  const eingabe = (body as { url?: unknown })?.url;
  if (typeof eingabe !== 'string' || !eingabe.trim()) {
    return NextResponse.json({ ok: false, error: 'missing_url' }, { status: 400, headers: NO_STORE });
  }

  // Ohne Schema davor waere "kitchenstories.com/..." keine gueltige Adresse.
  const roh = eingabe.trim();
  let url: URL;
  try {
    url = new URL(/^[a-z]+:\/\//i.test(roh) ? roh : `https://${roh}`);
  } catch {
    return NextResponse.json({ ok: false, error: 'unsupported_url' }, { status: 400, headers: NO_STORE });
  }

  const ergebnis = await holeSeite(url);
  if (typeof ergebnis === 'string') {
    const status = ergebnis === 'blocked_host' || ergebnis === 'unsupported_scheme' ? 400 : 502;
    return NextResponse.json({ ok: false, error: ergebnis }, { status, headers: NO_STORE });
  }

  const rezept = extractRecipe(ergebnis.html, ergebnis.url.toString());
  if (!rezept) {
    return NextResponse.json({ ok: false, error: 'no_recipe' }, { status: 422, headers: NO_STORE });
  }

  return NextResponse.json({ ok: true, recipe: rezept }, { headers: NO_STORE });
}
