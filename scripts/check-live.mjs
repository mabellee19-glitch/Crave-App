/**
 * Prueft eine veroeffentlichte Installation gegen ihre echte Datenbank:
 * zwei Geraete, die denselben Datenraum benutzen, inklusive Loeschungen,
 * veralteter Staende und gleichzeitiger Schreibvorgaenge.
 *
 * Aufruf: BASE_URL=https://deine-app.vercel.app npm run check:live
 *
 * Angelegt werden dabei zwei Test-Datenraeume mit zufaelliger Id. Sie stoeren
 * nichts, sind aber auch nicht Teil der eigenen Daten.
 */
const BASE = process.env.BASE_URL;

if (!BASE) {
  console.error('BASE_URL fehlt. Beispiel: BASE_URL=https://deine-app.vercel.app npm run check:live');
  process.exit(2);
}
const rnd = () => Math.random().toString(36).slice(2, 8);
const SPACE = `live-check-${rnd()}`;
const FRESH = `live-fresh-${rnd()}`;

let pass = 0, fail = 0;
const check = (label, ok, detail = '') => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${detail ? '  ' + detail : ''}`);
  ok ? pass++ : fail++;
};

const get = (id) => fetch(`${BASE}/api/space/${id}`, { cache: 'no-store' }).then((r) => r.json());
const post = (id, data) =>
  fetch(`${BASE}/api/space/${id}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data }),
  }).then((r) => r.json());

const empty = () => ({ recipes: {}, dishes: {}, shopping: {}, pantry: {} });
const item = (id, name, updatedAt, extra = {}) => ({
  id, name, amount: null, unit: '', pantryId: null, fromRecipe: null,
  createdAt: updatedAt, updatedAt, ...extra,
});

// 1 – Status
const status = await fetch(`${BASE}/api/status`).then((r) => r.json());
check('Datenbank konfiguriert', status.cloud === true, `storage=${status.storage}`);
check('Datenbank erreichbar', status.reachable === true, `variable=${status.source}`);

// 2 – Ein unbenutzter Datenraum existiert noch nicht
const fresh = await get(FRESH);
check('neuer Datenraum meldet exists=false', fresh.ok === true && fresh.exists === false);

// 3 – Geraet A schreibt
const a1 = await post(SPACE, { ...empty(), shopping: { a: item('a', 'Poulet', Date.now() - 5000) } });
check('Gerät A schreibt', a1.ok === true && a1.version >= 1, `version=${a1.version}`);

// 4 – Rueckweg aus der Datenbank
const read = await get(SPACE);
check('Daten kommen aus der Datenbank zurück',
  read.data?.shopping?.a?.name === 'Poulet' && read.exists === true);

// 5 – Geraet B ergaenzt, beides bleibt erhalten
const b1 = await post(SPACE, { ...empty(), shopping: { b: item('b', 'Reis', Date.now() - 4000) } });
const names = Object.values(b1.data.shopping).map((i) => i.name).sort();
check('beide Geräte zusammengeführt', names.join(',') === 'Poulet,Reis', names.join(','));

// 6 – Loeschen gewinnt gegen einen aelteren Stand.
// Echte Zeitstempel: Grabsteine aelter als 60 Tage werden absichtlich
// entfernt, mit Zeitstempeln aus 1970 waere der Test sinnlos.
const NOW = Date.now();
await post(SPACE, { ...empty(), shopping: { a: item('a', 'Poulet', NOW, { deleted: true }) } });
const stale = await post(SPACE, { ...empty(), shopping: { a: item('a', 'Poulet', NOW - 60_000) } });
check('Löschung überlebt einen veralteten Stand', stale.data.shopping.a.deleted === true);

// 7 – Neuere Aenderung gewinnt gegen die Loeschung
const revive = await post(SPACE, { ...empty(), shopping: { a: item('a', 'Poulet XL', NOW + 1000) } });
check('neuere Änderung gewinnt gegen die Löschung',
  revive.data.shopping.a.deleted !== true && revive.data.shopping.a.name === 'Poulet XL');

// 8 – Gleichzeitige Schreibvorgaenge
const parallel = await Promise.all([
  post(SPACE, { ...empty(), shopping: { p1: item('p1', 'Eins', NOW + 2000) } }),
  post(SPACE, { ...empty(), shopping: { p2: item('p2', 'Zwei', NOW + 2001) } }),
  post(SPACE, { ...empty(), shopping: { p3: item('p3', 'Drei', NOW + 2002) } }),
]);
const after = await get(SPACE);
const survived = ['p1', 'p2', 'p3'].filter((k) => after.data.shopping[k]);
check('gleichzeitige Schreibvorgänge gehen nicht verloren',
  survived.length === 3, survived.join(','));
check('Versionszähler steigt', parallel.every((r) => r.ok) && after.version >= 5,
  `version=${after.version}`);

// 9 – Manifest auf der echten Domain
const man = await fetch(`${BASE}/s/${SPACE}/manifest`).then((r) => r.json());
check('Manifest zeigt auf diesen Datenraum', man.start_url === `/s/${SPACE}`, man.start_url);
check('Manifest startet im Vollbild', man.display === 'standalone');

// 10 – Seiten und Symbole
for (const [label, path] of [
  ['Startseite', '/'],
  ['Datenraum-Seite', `/s/${SPACE}`],
  ['Service Worker', '/sw.js'],
  ['App-Symbol', '/icons/apple-touch-icon.png'],
]) {
  const r = await fetch(`${BASE}${path}`);
  check(`${label} erreichbar`, r.ok, `HTTP ${r.status}`);
}

// 11 – Die Seite verweist auf ihr eigenes Manifest
const html = await fetch(`${BASE}/s/${SPACE}`).then((r) => r.text());
check('Seite verweist auf ihr Manifest', html.includes(`/s/${SPACE}/manifest`));

console.log(`\n${pass}/${pass + fail} Prüfungen bestanden`);
console.log(`Testdatenraum: ${BASE}/s/${SPACE}`);
process.exit(fail === 0 ? 0 : 1);
