import { NextRequest, NextResponse } from 'next/server';
import { holeSeite } from '@/lib/safeFetch';
import {
  ImportedRecipe,
  ausEingefuegtemText,
  extractRecipe,
  rezeptAufraeumen,
  seitentext,
} from '@/lib/recipeImport';
import { rezeptLesen, rezeptUebersetzen } from '@/lib/recipeAi';
import { importAuftrag, importIstEnglisch, importUebersetzt } from '@/lib/uebersetzen';
import { ohneTracking } from '@/lib/aufraeumen';
import { hasVisionKey } from '@/lib/vision';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

const NO_STORE = { 'Cache-Control': 'no-store, max-age=0' };

/** Ein eingefuegtes Rezept, kein Buch. */
const MAX_TEXT = 40_000;

/**
 * Ein Rezept holen – ueber einen Link oder als eingefuegter Text.
 *
 * Zuerst ohne Modell (lib/recipeImport): strukturierte Daten, sonst die
 * Ueberschriften "Zutaten" und "Zubereitung". Findet sich so nichts und ist
 * die KI erreichbar, liest sie den Text. Klappt auch das nicht, sagt `ki`,
 * woran es lag – die App kann dann erklaeren, was fehlt.
 *
 * Englische Rezepte kommen auf Deutsch zurueck, mit Gramm und Grad Celsius.
 * Ist die KI dafuer nicht erreichbar, kommt das Rezept auf Englisch, mit
 * `sprache: 'en'` – die App uebersetzt es dann spaeter von selbst.
 */
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400, headers: NO_STORE });
  }

  const eingefuegt = (body as { text?: unknown })?.text;
  if (typeof eingefuegt === 'string' && eingefuegt.trim()) {
    const text = eingefuegt.slice(0, MAX_TEXT);
    const rezept = ausEingefuegtemText(text);
    // Mit Ueberschriften ("Zutaten", "Zubereitung") ist der Text eindeutig –
    // dafuer braucht es keine KI, und Einleitung und Tipps bleiben erhalten.
    if (rezept?.herkunft === 'text') return gefunden(rezept);
    // Sonst liest die KI besser als die Regeln – wenn sie da ist, darf sie.
    return mitKi(text, '', rezept);
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

  const quelle = ohneTracking(ergebnis.url.toString());
  const rezept = extractRecipe(ergebnis.html, quelle);
  // Strukturierte Daten sind verlaesslich – dafuer braucht es keine KI.
  if (rezept && !rezept.herkunft) return gefunden(rezept);
  return mitKi(seitentext(ergebnis.html), quelle, rezept);
}

async function gefunden(recipe: ImportedRecipe) {
  const fertig = rezeptAufraeumen(await aufDeutsch(recipe));
  return NextResponse.json({ ok: true, recipe: fertig }, { headers: NO_STORE });
}

/** Ein englisches Rezept uebersetzen; jedes andere bleibt, wie es ist. */
async function aufDeutsch(recipe: ImportedRecipe): Promise<ImportedRecipe> {
  if (recipe.uebersetztAus || !importIstEnglisch(recipe)) return recipe;
  if (!hasVisionKey()) return { ...recipe, sprache: 'en', kiFehler: 'no_key' };
  try {
    return importUebersetzt(recipe, await rezeptUebersetzen(importAuftrag(recipe)));
  } catch (err) {
    return { ...recipe, sprache: 'en', kiFehler: err instanceof Error ? err.message : 'unknown_error' };
  }
}

/**
 * Den Text von der KI lesen lassen; was die Regeln schon gefunden haben,
 * bleibt der Ersatz, falls sie nicht erreichbar ist.
 */
async function mitKi(text: string, quelle: string, ersatz: ImportedRecipe | null) {
  if (!hasVisionKey()) return ersatz ? gefunden(ersatz) : keinRezept('no_key');
  try {
    const gelesen = await rezeptLesen(text, quelle);
    if (gelesen) return gefunden(gelesen);
    return ersatz ? gefunden(ersatz) : keinRezept('not_found');
  } catch (err) {
    if (ersatz) return gefunden(ersatz);
    return keinRezept(err instanceof Error ? err.message : 'unknown_error');
  }
}

function keinRezept(ki: string) {
  return NextResponse.json({ ok: false, error: 'no_recipe', ki }, { status: 422, headers: NO_STORE });
}
