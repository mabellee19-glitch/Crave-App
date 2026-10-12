/**
 * Erzeugt die App-Icons als PNG: ein senfgelbes "C" in Shrikhand mit hartem
 * Schatten auf Tomatenrot – das Diner-Logo im Kleinen.
 *
 * Das "C" kommt als Pfad aus src/components/Logo.tsx, gezeichnet wird mit
 * dem Chromium, den Playwright ohnehin mitbringt. So gibt es keine zweite
 * Kopie der Form und keine Bildbibliothek.
 *
 * Aufruf: node scripts/make-icons.mjs
 * (Chromium liegt woanders? PLAYWRIGHT_CHROMIUM_PATH=/pfad/zu/chromium)
 */
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const WURZEL = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = join(WURZEL, 'public', 'icons');

const ROT = '#D7263D';
const SENF = '#F2B632';
const ESPRESSO = '#3B1A14';

const logo = readFileSync(join(WURZEL, 'src', 'components', 'Logo.tsx'), 'utf8');
const lies = (name) => {
  const treffer = new RegExp(`export const ${name} =\\s*'?([^';]+)'?;`).exec(logo);
  if (!treffer) throw new Error(`${name} fehlt in Logo.tsx`);
  return treffer[1].trim();
};
const C_PFAD = lies('C_PFAD');
const C_BREITE = Number(lies('C_BREITE'));
const C_HOEHE = Number(lies('C_HOEHE'));
const SCHATTEN = Number(lies('SCHATTEN'));

/**
 * Ein Icon als SVG. `anteil` ist die Hoehe des "C" im Verhaeltnis zur
 * Kantenlaenge: 0.62 fuer normale Icons, kleiner fuer maskierbare, deren
 * Rand das System abschneiden darf.
 */
function icon(groesse, anteil) {
  const versatz = C_HOEHE * SCHATTEN * 1.4;
  const breite = C_BREITE + versatz;
  const hoehe = C_HOEHE + versatz;
  const massstab = (groesse * anteil) / hoehe;
  // Optisch mittig: die Form samt Schatten, ein Hauch nach oben.
  const x = (groesse - breite * massstab) / 2;
  const y = (groesse - hoehe * massstab) / 2 - groesse * 0.01;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${groesse}" height="${groesse}" viewBox="0 0 ${groesse} ${groesse}">
  <rect width="${groesse}" height="${groesse}" fill="${ROT}"/>
  <g transform="translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(${massstab.toFixed(5)})">
    <path d="${C_PFAD}" transform="translate(${versatz.toFixed(2)} ${versatz.toFixed(2)})" fill="${ESPRESSO}"/>
    <path d="${C_PFAD}" fill="${SENF}"/>
  </g>
</svg>`;
}

const AUFTRAEGE = [
  { datei: 'icon-512.png', groesse: 512, anteil: 0.62 },
  { datei: 'icon-192.png', groesse: 192, anteil: 0.62 },
  { datei: 'apple-touch-icon.png', groesse: 180, anteil: 0.62 },
  // Maskierbar: alles Wichtige im inneren Kreis von 80 % Durchmesser.
  { datei: 'icon-maskable-512.png', groesse: 512, anteil: 0.46 },
  // Im Browser-Tab zaehlt jedes Pixel: das C so gross wie moeglich.
  { datei: 'favicon-32.png', groesse: 32, anteil: 0.78 },
];

mkdirSync(OUT_DIR, { recursive: true });
const browser = await chromium.launch(
  process.env.PLAYWRIGHT_CHROMIUM_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } : {},
);
try {
  for (const { datei, groesse, anteil } of AUFTRAEGE) {
    const page = await browser.newPage({ viewport: { width: groesse, height: groesse }, deviceScaleFactor: 1 });
    await page.setContent(`<!doctype html><html><body style="margin:0">${icon(groesse, anteil)}</body></html>`);
    await page.screenshot({ path: join(OUT_DIR, datei), clip: { x: 0, y: 0, width: groesse, height: groesse } });
    await page.close();
    console.log(`${datei} (${groesse}px)`);
  }
} finally {
  await browser.close();
}
