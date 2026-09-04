import { NextRequest, NextResponse } from 'next/server';
import { analysePhoto, hasVisionKey } from '@/lib/vision';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
// Bilderkennung dauert länger als ein normaler Aufruf.
export const maxDuration = 60;

const NO_STORE = { 'Cache-Control': 'no-store, max-age=0' };

/** Grosszügig bemessen; das Bild wird im Browser vorher verkleinert. */
const MAX_IMAGE_CHARS = 4_000_000;

export async function POST(req: NextRequest) {
  if (!hasVisionKey()) {
    return NextResponse.json(
      { ok: false, error: 'no_key' },
      { status: 503, headers: NO_STORE },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400, headers: NO_STORE });
  }

  const image = (body as { image?: unknown })?.image;
  if (typeof image !== 'string' || !image.startsWith('data:image/')) {
    return NextResponse.json({ ok: false, error: 'missing_image' }, { status: 400, headers: NO_STORE });
  }
  if (image.length > MAX_IMAGE_CHARS) {
    return NextResponse.json({ ok: false, error: 'image_too_large' }, { status: 413, headers: NO_STORE });
  }

  try {
    const result = await analysePhoto(image);
    return NextResponse.json({ ok: true, ...result }, { headers: NO_STORE });
  } catch (err) {
    const error = err instanceof Error ? err.message : 'unknown_error';
    // 503 für "geht gerade nicht", 422 für "damit kann ich nichts anfangen".
    const status = error === 'no_result' || error === 'refused' ? 422 : 503;
    return NextResponse.json({ ok: false, error }, { status, headers: NO_STORE });
  }
}
