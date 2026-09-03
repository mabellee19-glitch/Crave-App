import { NextResponse } from 'next/server';
import { pingStorage, storageKind, storageSource } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Auskunft darueber, wie und ob gespeichert wird. Gedacht fuer die Fehlersuche
 * nach dem Aufsetzen: `cloud` sagt, ob eine Datenbank konfiguriert ist,
 * `reachable`, ob sie auch wirklich antwortet.
 */
export async function GET() {
  const kind = storageKind();
  const ping = await pingStorage();
  return NextResponse.json(
    {
      ok: true,
      storage: kind,
      cloud: kind === 'postgres',
      reachable: ping.reachable,
      error: ping.error,
      // Nur der Name der Umgebungsvariable, nie ihr Inhalt.
      source: storageSource(),
    },
    { status: ping.reachable ? 200 : 503, headers: { 'Cache-Control': 'no-store, max-age=0' } },
  );
}
