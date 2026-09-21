/**
 * Durchlauf durch die ganze App auf der Suche nach Fehlern, die kein
 * einzelner Test abdeckt: Konsolenfehler, fehlgeschlagene Anfragen, seitlich
 * ueberlaufende Seiten, zu kleine Bedienelemente, Knoepfe ohne Beschriftung.
 *
 * Geprueft wird in drei Breiten (iPhone, Desktop, 320 px) und in hell wie
 * dunkel – dort faellt auf, was in einer Breite passt und in der anderen
 * nicht.
 *
 * Aufruf: BASE_URL=http://localhost:3000 npm run check:ui
 */
import { chromium, devices } from '@playwright/test';

const B = process.env.BASE_URL ?? 'http://localhost:3000';
const befunde = [];
const melde = (wo, was) => { befunde.push(`${wo}: ${was}`); console.log('FUND', wo, '·', was); };

const raum = () => 'audit-' + Math.random().toString(36).slice(2, 8);

async function pruefeSeite(p, wo) {
  // Waagrechtes Ueberlaufen – die Seite darf nie seitlich scrollen.
  const ueberlauf = await p.evaluate(() => {
    const d = document.documentElement;
    const schuldige = [];
    if (d.scrollWidth > d.clientWidth + 1) {
      for (const el of document.querySelectorAll('body *')) {
        const r = el.getBoundingClientRect();
        if (r.right > d.clientWidth + 1 || r.left < -1) {
          const s = getComputedStyle(el);
          if (s.position === 'fixed') continue;
          schuldige.push(`${el.tagName}.${String(el.className).slice(0, 40)} [${Math.round(r.left)}..${Math.round(r.right)}]`);
        }
      }
    }
    return { breit: d.scrollWidth > d.clientWidth + 1, schuldige: schuldige.slice(0, 4) };
  });
  if (ueberlauf.breit) melde(wo, `Seite scrollt seitlich: ${ueberlauf.schuldige.join(' | ')}`);

  // Bedienelemente, die zu klein zum Treffen sind.
  const klein = await p.evaluate(() => {
    const raus = [];
    for (const el of document.querySelectorAll('button, a[href], input, select')) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      if (r.height < 28 || r.width < 28) {
        raus.push(`${el.tagName} "${(el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 30)}" ${Math.round(r.width)}x${Math.round(r.height)}`);
      }
    }
    return raus.slice(0, 5);
  });
  if (klein.length) melde(wo, `zu kleine Ziele: ${klein.join(' | ')}`);

  // Knoepfe ohne zugaengliche Beschriftung.
  const namenlos = await p.evaluate(() => {
    const raus = [];
    for (const el of document.querySelectorAll('button')) {
      const r = el.getBoundingClientRect();
      if (r.width === 0) continue;
      const name = (el.getAttribute('aria-label') || el.textContent || '').trim();
      if (!name) raus.push(el.outerHTML.slice(0, 70));
    }
    return raus.slice(0, 4);
  });
  if (namenlos.length) melde(wo, `Knopf ohne Beschriftung: ${namenlos.join(' | ')}`);
}

async function durchlauf(browser, geraet, schema) {
  const ctx = await browser.newContext({ ...geraet, colorScheme: schema });
  const p = await ctx.newPage();
  const wo0 = `${geraet.__name}/${schema}`;

  p.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') melde(wo0, `Konsole ${m.type()}: ${m.text().slice(0, 160)}`);
  });
  p.on('pageerror', (e) => melde(wo0, `Seitenfehler: ${String(e).slice(0, 160)}`));
  p.on('requestfailed', (r) => {
    if (!r.url().includes('favicon')) melde(wo0, `Anfrage fehlgeschlagen: ${r.url().slice(0, 80)} ${r.failure()?.errorText}`);
  });
  p.on('response', (r) => {
    if (r.status() >= 400) melde(wo0, `HTTP ${r.status()} auf ${r.url().replace(B, '').slice(0, 60)}`);
  });

  console.log('--- ' + wo0);
  await p.goto(`${B}/s/${raum()}`);
  await p.getByRole('heading', { level: 1 }).first().waitFor();
  await p.waitForTimeout(600);
  await pruefeSeite(p, `${wo0}/Rezepte`);

  // Alle Filter durchklicken
  for (const name of ['Cook Next', 'Comfort', 'High-Protein', 'Vegi', 'Dessert', 'Alle']) {
    const knopf = p.getByRole('group', { name: 'Rezepte filtern' }).getByRole('button', { name: new RegExp(`^${name}`) });
    if (await knopf.count()) { await knopf.first().click(); await p.waitForTimeout(150); }
    else melde(wo0, `Filter "${name}" fehlt bei Rezepten`);
  }
  await pruefeSeite(p, `${wo0}/Rezepte-gefiltert`);

  // Rezeptdetail + Kochmodus
  await p.getByRole('button', { name: /^Rezept .* öffnen$/ }).first().click();
  await p.waitForTimeout(400);
  await pruefeSeite(p, `${wo0}/Rezeptdetail`);
  const start = p.getByRole('dialog').getByRole('button', { name: 'Start Cooking' });
  console.log('   Kochmodus startbar:', await start.isEnabled());
  if (await start.isEnabled()) {
    await start.click();
    await p.waitForTimeout(1800);
    await pruefeSeite(p, `${wo0}/Kochmodus`);
    await p.getByRole('button', { name: 'Kochmodus beenden' }).click();
    await p.waitForTimeout(300);
  }
  await p.getByRole('dialog').getByRole('button', { name: 'Schliessen' }).click();

  // Gerichte
  await p.getByRole('button', { name: 'Gerichte' }).first().click();
  await p.waitForTimeout(400);
  await pruefeSeite(p, `${wo0}/Gerichte`);
  for (const name of ['Dessert', 'Vegi', 'Alle']) {
    const knopf = p.getByRole('group', { name: 'Gerichte filtern' }).getByRole('button', { name: new RegExp(`^${name}`) });
    if (await knopf.count()) { await knopf.first().click(); await p.waitForTimeout(150); }
    else melde(wo0, `Filter "${name}" fehlt bei Gerichten`);
  }

  // Einkaufsliste inkl. Grundliste aufklappen
  await p.getByRole('button', { name: 'Einkaufsliste' }).first().click();
  await p.waitForTimeout(400);
  await pruefeSeite(p, `${wo0}/Einkaufsliste`);
  const gruppe = p.locator('.pantrygroup__title').first();
  console.log('   Grundlisten-Rubriken:', await p.locator('.pantrygroup__title').count());
  if (await gruppe.count()) { await gruppe.click(); await p.waitForTimeout(300); }
  await pruefeSeite(p, `${wo0}/Grundliste-offen`);

  // Formulare
  await p.getByRole('button', { name: 'Hinzufügen', exact: false }).first().click().catch(() => {});
  await p.waitForTimeout(200);

  await p.getByRole('button', { name: 'Einstellungen und Synchronisation' }).click();
  await p.waitForTimeout(400);
  await pruefeSeite(p, `${wo0}/Einstellungen`);
  await p.getByRole('dialog').getByRole('button', { name: 'Schliessen' }).click();

  await ctx.close();
}

const b = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined,
});
const iphone = { ...devices['iPhone 13'], browserName: undefined, __name: 'iPhone' };
delete iphone.browserName;
const desktop = { viewport: { width: 1280, height: 900 }, __name: 'Desktop' };
const klein = { viewport: { width: 320, height: 640 }, isMobile: true, hasTouch: true, __name: 'Schmal320' };

for (const g of [iphone, desktop, klein]) {
  for (const schema of ['light', 'dark']) {
    await durchlauf(b, g, schema);
  }
}
await b.close();
console.log(`\n=== ${befunde.length} Befunde ===`);
process.exit(befunde.length === 0 ? 0 : 1);
