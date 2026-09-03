/**
 * Traegt die spaeter dazugekommenen Rezepte in einen bereits bestehenden
 * Datenraum ein.
 *
 * Ein Datenraum wird nur beim allerersten Oeffnen mit Startinhalten gefuellt.
 * Wer die App schon benutzt, bekommt neue Rezepte also nicht von selbst –
 * dieses Skript schiebt sie nach.
 *
 * Aufruf:
 *   node scripts/add-recipes.mjs https://deine-app.vercel.app/s/DEINE-ID
 *
 * Die Rezepte behalten ihre festen Ids. Ein zweiter Aufruf legt sie deshalb
 * nicht doppelt an, sondern schreibt dieselben Eintraege erneut.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const target = process.argv[2];

if (!target) {
  console.error('Bitte den Link zum Datenraum angeben, z. B.:');
  console.error('  node scripts/add-recipes.mjs https://deine-app.vercel.app/s/abcd1234');
  process.exit(2);
}

const match = target.match(/^(https?:\/\/[^/]+)\/s\/([A-Za-z0-9-]+)\/?$/);
if (!match) {
  console.error(`Das sieht nicht nach einem Datenraum-Link aus: ${target}`);
  console.error('Erwartet wird etwas wie https://deine-app.vercel.app/s/abcd1234');
  process.exit(2);
}
const [, origin, spaceId] = match;

const out = mkdtempSync(join(tmpdir(), 'crave-seed-'));
try {
  execFileSync(
    'npx',
    [
      'tsc',
      join(root, 'src/lib/seed.ts'),
      '--outDir', out,
      '--module', 'commonjs',
      '--target', 'es2022',
      '--skipLibCheck',
      '--ignoreConfig',
    ],
    { cwd: root, stdio: 'inherit' },
  );

  const seed = await import(pathToFileURL(join(out, 'seed.js')).href);
  const all = seed.buildSeedData();
  const now = Date.now();

  const recipes = {};
  for (const key of seed.LATER_RECIPE_KEYS) {
    const recipe = all.recipes[`seed-r-${key}`];
    if (!recipe) {
      console.error(`Rezept nicht gefunden: ${key}`);
      process.exit(1);
    }
    // Frischer Zeitstempel, damit der Eintrag beim Zusammenführen ankommt.
    recipes[recipe.id] = { ...recipe, createdAt: now, updatedAt: now };
  }

  const response = await fetch(`${origin}/api/space/${spaceId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: { recipes, dishes: {}, shopping: {}, pantry: {} } }),
  });
  const body = await response.json().catch(() => null);

  if (!body?.ok) {
    console.error(`Fehlgeschlagen (HTTP ${response.status}):`, body?.error ?? 'keine Antwort');
    process.exit(1);
  }

  const names = Object.values(recipes).map((r) => r.name);
  console.log(`${names.length} Rezepte übertragen nach ${origin}/s/${spaceId}:`);
  for (const name of names) console.log(`  · ${name}`);

  const stored = Object.values(body.data.recipes).filter((r) => !r.deleted);
  console.log(`\nIm Datenraum stehen jetzt ${stored.length} Rezepte.`);
} finally {
  rmSync(out, { recursive: true, force: true });
}
