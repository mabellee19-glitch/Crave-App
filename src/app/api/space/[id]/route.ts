import { NextRequest, NextResponse } from 'next/server';
import { isValidSpaceId } from '@/lib/id';
import { mergeSpace, readSpace, storageKind } from '@/lib/db';
import { emptyData } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Params = { params: Promise<{ id: string }> };

const NO_STORE = { 'Cache-Control': 'no-store, max-age=0' };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  if (!isValidSpaceId(id)) {
    return NextResponse.json({ ok: false, error: 'invalid_space' }, { status: 400, headers: NO_STORE });
  }
  try {
    const record = await readSpace(id);
    return NextResponse.json(
      {
        ok: true,
        storage: storageKind(),
        version: record?.version ?? 0,
        updatedAt: record?.updatedAt ?? 0,
        data: record?.data ?? emptyData(),
        exists: Boolean(record),
      },
      { headers: NO_STORE },
    );
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: message(err) },
      { status: 503, headers: NO_STORE },
    );
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;
  if (!isValidSpaceId(id)) {
    return NextResponse.json({ ok: false, error: 'invalid_space' }, { status: 400, headers: NO_STORE });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400, headers: NO_STORE });
  }
  const incoming = (body as { data?: unknown })?.data;
  if (!incoming || typeof incoming !== 'object') {
    return NextResponse.json({ ok: false, error: 'missing_data' }, { status: 400, headers: NO_STORE });
  }
  try {
    const record = await mergeSpace(id, incoming as never);
    return NextResponse.json(
      {
        ok: true,
        storage: storageKind(),
        version: record.version,
        updatedAt: record.updatedAt,
        data: record.data,
        exists: true,
      },
      { headers: NO_STORE },
    );
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: message(err) },
      { status: 503, headers: NO_STORE },
    );
  }
}

function message(err: unknown): string {
  return err instanceof Error ? err.message : 'unknown_error';
}
