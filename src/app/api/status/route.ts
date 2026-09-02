import { NextResponse } from 'next/server';
import { storageKind } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  return NextResponse.json(
    { ok: true, storage: storageKind(), cloud: storageKind() === 'postgres' },
    { headers: { 'Cache-Control': 'no-store, max-age=0' } },
  );
}
