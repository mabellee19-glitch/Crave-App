import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { Pool } from 'pg';
import { AppData, emptyData } from './types';
import { resolveConnection } from './connection';
import { mergeData, pruneTombstones } from './merge';

export interface SpaceRecord {
  data: AppData;
  version: number;
  updatedAt: number;
}

export type StorageKind = 'postgres' | 'file';

export function storageKind(): StorageKind {
  return connectionString() ? 'postgres' : 'file';
}

function connectionString(): string | undefined {
  return resolveConnection(process.env).url;
}

/** Name der genutzten Umgebungsvariable – nie deren Wert. */
export function storageSource(): string | null {
  return resolveConnection(process.env).source ?? null;
}

/* --------------------------------------------------------------------------
 * Postgres
 * ----------------------------------------------------------------------- */

let poolPromise: Promise<Pool> | null = null;

async function getPool(): Promise<Pool> {
  if (!poolPromise) {
    poolPromise = (async () => {
      const { Pool: PgPool } = await import('pg');
      const pool = new PgPool({
        connectionString: connectionString(),
        max: 3,
        idleTimeoutMillis: 10_000,
        connectionTimeoutMillis: 10_000,
        ssl: needsSsl() ? { rejectUnauthorized: false } : undefined,
      });
      await pool.query(`
        CREATE TABLE IF NOT EXISTS crave_spaces (
          id text PRIMARY KEY,
          data jsonb NOT NULL,
          version bigint NOT NULL DEFAULT 0,
          updated_at timestamptz NOT NULL DEFAULT now()
        )
      `);
      return pool;
    })().catch((err) => {
      poolPromise = null;
      throw err;
    });
  }
  return poolPromise;
}

function needsSsl(): boolean {
  const url = connectionString() ?? '';
  if (/sslmode=disable/.test(url)) return false;
  return !/localhost|127\.0\.0\.1/.test(url);
}

async function pgRead(id: string): Promise<SpaceRecord | null> {
  const pool = await getPool();
  const res = await pool.query(
    'SELECT data, version, extract(epoch from updated_at) * 1000 AS updated_ms FROM crave_spaces WHERE id = $1',
    [id],
  );
  if (res.rowCount === 0) return null;
  const row = res.rows[0];
  return {
    data: normalize(row.data),
    version: Number(row.version),
    updatedAt: Number(row.updated_ms),
  };
}

async function pgMerge(id: string, incoming: AppData): Promise<SpaceRecord> {
  const pool = await getPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const existing = await client.query(
      'SELECT data, version FROM crave_spaces WHERE id = $1 FOR UPDATE',
      [id],
    );
    const current: AppData = existing.rowCount ? normalize(existing.rows[0].data) : emptyData();
    const version = existing.rowCount ? Number(existing.rows[0].version) : 0;
    const merged = pruneTombstones(mergeData(current, incoming));
    const res = await client.query(
      `INSERT INTO crave_spaces (id, data, version, updated_at)
       VALUES ($1, $2::jsonb, $3, now())
       ON CONFLICT (id) DO UPDATE
         SET data = EXCLUDED.data, version = EXCLUDED.version, updated_at = now()
       RETURNING version, extract(epoch from updated_at) * 1000 AS updated_ms`,
      [id, JSON.stringify(merged), version + 1],
    );
    await client.query('COMMIT');
    return {
      data: merged,
      version: Number(res.rows[0].version),
      updatedAt: Number(res.rows[0].updated_ms),
    };
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

/* --------------------------------------------------------------------------
 * Datei-Fallback (lokale Entwicklung / Betrieb ohne konfigurierte Datenbank)
 * ----------------------------------------------------------------------- */

function dataDir(): string {
  if (process.env.CRAVE_DATA_DIR) return process.env.CRAVE_DATA_DIR;
  if (process.env.NODE_ENV !== 'production') return path.join(process.cwd(), 'data');
  return path.join(os.tmpdir(), 'crave-data');
}

function fileFor(id: string): string {
  return path.join(dataDir(), `${id}.json`);
}

/** Schreibvorgaenge pro Space serialisieren, damit sich zwei Requests nicht ueberholen. */
const fileLocks = new Map<string, Promise<unknown>>();

function withLock<T>(id: string, fn: () => Promise<T>): Promise<T> {
  const previous = fileLocks.get(id) ?? Promise.resolve();
  const next = previous.then(fn, fn);
  fileLocks.set(
    id,
    next.catch(() => {}),
  );
  return next;
}

async function fileRead(id: string): Promise<SpaceRecord | null> {
  try {
    const raw = await fs.readFile(fileFor(id), 'utf8');
    const parsed = JSON.parse(raw);
    return {
      data: normalize(parsed.data),
      version: Number(parsed.version) || 0,
      updatedAt: Number(parsed.updatedAt) || 0,
    };
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw err;
  }
}

async function fileMerge(id: string, incoming: AppData): Promise<SpaceRecord> {
  return withLock(id, async () => {
    const existing = await fileRead(id);
    const merged = pruneTombstones(mergeData(existing?.data ?? emptyData(), incoming));
    const record: SpaceRecord = {
      data: merged,
      version: (existing?.version ?? 0) + 1,
      updatedAt: Date.now(),
    };
    await fs.mkdir(dataDir(), { recursive: true });
    const target = fileFor(id);
    const tmp = `${target}.${process.pid}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(record), 'utf8');
    await fs.rename(tmp, target);
    return record;
  });
}

/* --------------------------------------------------------------------------
 * Oeffentliche API
 * ----------------------------------------------------------------------- */

export async function readSpace(id: string): Promise<SpaceRecord | null> {
  return storageKind() === 'postgres' ? pgRead(id) : fileRead(id);
}

/** Eingehende Daten mit dem Serverstand mergen und den neuen Stand zurueckgeben. */
export async function mergeSpace(id: string, incoming: AppData): Promise<SpaceRecord> {
  return storageKind() === 'postgres' ? pgMerge(id, incoming) : fileMerge(id, incoming);
}

function normalize(value: unknown): AppData {
  const base = emptyData();
  if (!value || typeof value !== 'object') return base;
  const src = value as Partial<AppData>;
  return {
    recipes: (src.recipes ?? {}) as AppData['recipes'],
    dishes: (src.dishes ?? {}) as AppData['dishes'],
    shopping: (src.shopping ?? {}) as AppData['shopping'],
    pantry: (src.pantry ?? {}) as AppData['pantry'],
  };
}
