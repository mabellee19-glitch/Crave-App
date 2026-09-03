import { NextResponse } from 'next/server';
import { storageKind, storageSource } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      storage: storageKind(),
      cloud: storageKind() === 'postgres',
      // Nur der Name der Umgebungsvariable, nie ihr Inhalt.
      source: storageSource(),
    },
    { headers: { 'Cache-Control': 'no-store, max-age=0' } },
  );
}
