/**
 * Prueft die Erkennung der Datenbank-Verbindung (src/lib/connection.ts).
 *
 * Das Modul wird mit der TypeScript-CLI nach JavaScript uebersetzt und dann
 * geladen. So braucht der Test keinen Testlaeufer und keine Build-Pipeline.
 *
 * Aufruf: node scripts/test-connection.mjs
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = mkdtempSync(join(tmpdir(), 'crave-conn-'));

try {
  execFileSync(
    'npx',
    [
      'tsc',
      join(root, 'src/lib/connection.ts'),
      '--outDir',
      out,
      '--module',
      'commonjs',
      '--target',
      'es2022',
      '--skipLibCheck',
      // Die tsconfig des Projekts wuerde hier nicht geladen und tsc bricht
      // deshalb mit TS5112 ab.
      '--ignoreConfig',
    ],
    { cwd: root, stdio: 'inherit' },
  );

  const { resolveConnection } = await import(pathToFileURL(join(out, 'connection.js')).href);

  const POOLED = 'postgres://user:pw@pooler.example.com/db?sslmode=require';
  const DIRECT = 'postgresql://user:pw@direct.example.com/db';

  const cases = [
    ['ohne Verbindung kein Treffer', {}, null],
    ['DATABASE_URL wird erkannt', { DATABASE_URL: POOLED }, 'DATABASE_URL'],
    [
      'bekannte Namen haben Vorrang',
      { WHATEVER_PG: DIRECT, POSTGRES_URL: POOLED },
      'POSTGRES_URL',
    ],
    [
      'unbekannter Name mit Postgres-URL genuegt',
      { MY_HOSTER_CONNSTRING: POOLED },
      'MY_HOSTER_CONNSTRING',
    ],
    [
      'gepoolt vor ungepoolt',
      { AAA_URL_UNPOOLED: DIRECT, ZZZ_URL: POOLED },
      'ZZZ_URL',
    ],
    ['andere Datenbanken werden ignoriert', { DATABASE_URL: 'mysql://user@host/db' }, null],
    ['leerer Wert zaehlt nicht', { DATABASE_URL: '' }, null],
  ];

  let failed = 0;
  for (const [label, env, expected] of cases) {
    const actual = resolveConnection(env).source ?? null;
    const ok = actual === expected;
    if (!ok) failed += 1;
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${label} -> ${actual}`);
    if (!ok) console.log(`     erwartet: ${expected}`);
  }

  console.log(`\n${cases.length - failed}/${cases.length} Prüfungen bestanden`);
  process.exit(failed === 0 ? 0 : 1);
} finally {
  rmSync(out, { recursive: true, force: true });
}
