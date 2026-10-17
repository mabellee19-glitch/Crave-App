import { NextRequest, NextResponse } from 'next/server';
import { hasVisionKey } from '@/lib/vision';
import { rezeptUebersetzen } from '@/lib/recipeAi';
import { ohneKiUebersetzen } from '@/lib/maschinell';
import type { Uebersetzung } from '@/lib/uebersetzen';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

const NO_STORE = { 'Cache-Control': 'no-store, max-age=0' };

/** Ein Rezept, kein Kochbuch. */
const MAX_TEXT = 30_000;
const MAX_EINTRAEGE = 120;

const LISTEN = ['zutaten', 'schritte', 'vorbereitung', 'originalSchritte', 'originalVorbereitung'] as const;

/**
 * Ein gespeichertes englisches Rezept auf Deutsch. Der Browser schickt die
 * Texte (lib/uebersetzen) und setzt die Antwort selbst ans Rezept – so
 * entscheidet er, ob es sich in der Zwischenzeit geaendert hat.
 *
 * Zuerst die KI; ist sie nicht erreichbar (keine Zahlungsangabe, kein
 * Schluessel), uebersetzt der freie Dienst (lib/maschinell).
 */
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400, headers: NO_STORE });
  }

  const roh = (body as { recipe?: Record<string, unknown> })?.recipe ?? {};
  const eingabe: Uebersetzung = {
    name: String(roh.name ?? '').slice(0, 200),
    zutaten: [],
    schritte: [],
    vorbereitung: [],
    originalSchritte: [],
    originalVorbereitung: [],
  };
  for (const liste of LISTEN) {
    const wert = roh[liste];
    eingabe[liste] = (Array.isArray(wert) ? wert : []).map((eintrag) => String(eintrag ?? ''));
  }
  const anzahl = LISTEN.reduce((summe, liste) => summe + eingabe[liste].length, 0);
  if (!eingabe.name && anzahl === 0) {
    return NextResponse.json({ ok: false, error: 'no_result' }, { status: 400, headers: NO_STORE });
  }
  if (anzahl > MAX_EINTRAEGE || JSON.stringify(eingabe).length > MAX_TEXT) {
    return NextResponse.json({ ok: false, error: 'too_large' }, { status: 413, headers: NO_STORE });
  }

  let kiFehler = 'no_key';
  if (hasVisionKey()) {
    try {
      const uebersetzt = await rezeptUebersetzen(eingabe);
      return NextResponse.json({ ok: true, recipe: uebersetzt }, { headers: NO_STORE });
    } catch (err) {
      kiFehler = err instanceof Error ? err.message : 'unknown_error';
    }
  }
  try {
    const uebersetzt = await ohneKiUebersetzen(eingabe);
    return NextResponse.json({ ok: true, recipe: uebersetzt, ohneKi: true }, { headers: NO_STORE });
  } catch {
    const error = kiFehler;
    const status = error === 'no_result' || error === 'refused' || error === 'incomplete' ? 422 : 503;
    return NextResponse.json({ ok: false, error }, { status, headers: NO_STORE });
  }
}
