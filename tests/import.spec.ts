import { expect, test } from '@playwright/test';
import {
  ausEingefuegtemText,
  extractRecipe,
  durationFromText,
  gruppenTitel,
  parseIngredientLine,
  seitentext,
} from '../src/lib/recipeImport';
import { zutatenFuerSchritt } from '../src/lib/stepIngredients';
import { istPrivateAdresse } from '../src/lib/safeFetch';
import { neuesRezept, newSpace, openSpace } from './helpers';

/**
 * Der Import holt eine Adresse, die von aussen kommt. Die Adresspruefung ist
 * damit der sicherheitskritische Teil und wird hier direkt geprueft – nicht
 * ueber die Oberflaeche, wo sich die Faelle kaum durchspielen lassen.
 */
test.describe('Adressen im eigenen Netz', () => {
  test('werden erkannt', () => {
    for (const adresse of [
      '127.0.0.1',
      '127.9.9.9',
      '10.0.0.1',
      '172.16.0.1',
      '172.31.255.254',
      '192.168.1.1',
      '169.254.169.254', // Metadaten-Dienst der Hoster
      '100.64.0.1',
      '0.0.0.0',
      '224.0.0.1',
      '::1',
      'fe80::1',
      'fc00::1',
      'fd12:3456::1',
      '::ffff:10.0.0.1',
    ]) {
      expect(istPrivateAdresse(adresse), adresse).toBe(true);
    }
  });

  test('oeffentliche Adressen bleiben erlaubt', () => {
    for (const adresse of [
      '1.1.1.1',
      '8.8.8.8',
      '172.15.0.1',
      '172.32.0.1',
      '192.167.1.1',
      '99.99.99.99',
      '2606:4700:4700::1111',
    ]) {
      expect(istPrivateAdresse(adresse), adresse).toBe(false);
    }
  });
});

test.describe('Zutatenzeilen lesen', () => {
  test('Menge, Einheit und Name werden getrennt', () => {
    expect(parseIngredientLine('500 g Halloumi')).toEqual({
      name: 'Halloumi',
      amount: 500,
      unit: 'g',
    });
    expect(parseIngredientLine('4 Blätter Radicchio')).toEqual({
      name: 'Radicchio',
      amount: 4,
      unit: 'Blätter',
    });
    // "rote" ist keine Einheit, auch wenn es kurz ist.
    expect(parseIngredientLine('1  rote Zwiebel')).toEqual({
      name: 'rote Zwiebel',
      amount: 1,
      unit: '',
    });
    expect(parseIngredientLine('Salz')).toEqual({ name: 'Salz', amount: null, unit: '' });
    expect(parseIngredientLine('½ Zitrone')).toEqual({ name: 'Zitrone', amount: 0.5, unit: '' });
    // Bereiche: der untere Wert.
    expect(parseIngredientLine('2 – 3 EL Öl')).toEqual({ name: 'Öl', amount: 2, unit: 'EL' });
  });
});

test.describe('Timer aus dem Schritttext', () => {
  test('werden gefunden, wo eine Dauer steht', () => {
    expect(durationFromText('Für ca. 3 – 5 Min. anbraten.')).toBe(3 * 60);
    expect(durationFromText('30–60 Minuten marinieren.')).toBe(30 * 60);
    expect(durationFromText('1 Stunde ruhen lassen.')).toBe(3600);
    expect(durationFromText('20 Sekunden mixen.')).toBe(20);
  });

  test('und nicht, wo keine steht', () => {
    expect(durationFromText('Backofen auf 200 °C vorheizen.')).toBeNull();
    expect(durationFromText('Zwiebel in Ringe schneiden.')).toBeNull();
    // Eine Mengenangabe ist keine Dauer.
    expect(durationFromText('2 EL Öl in die Pfanne geben.')).toBeNull();
  });
});

test.describe('Rezept aus einer Seite lesen', () => {
  /** So sieht eine Rezeptseite im Quelltext aus: schema.org in einem @graph. */
  const seite = (rezept: Record<string, unknown>) => `
    <!doctype html><html><head>
    <script type="application/ld+json">${JSON.stringify({
      '@context': 'https://schema.org',
      '@graph': [{ '@type': 'WebPage', name: 'Irgendeine Seite' }, rezept],
    })}</script>
    </head><body>Inhalt</body></html>`;

  test('Name, Portionen, Zeit, Zutaten und Schritte kommen an', () => {
    const html = seite({
      '@type': 'Recipe',
      name: 'Halloumi-Burger mit Honig-Senf-So&szlig;e',
      recipeYield: ['4', '4 Portionen'],
      totalTime: 'PT1H50M',
      recipeIngredient: ['500 g Halloumi', '1  rote Zwiebel', 'Salz'],
      recipeInstructions: [
        { '@type': 'HowToStep', text: 'Zwiebel in Ringe schneiden.' },
        { '@type': 'HowToStep', text: 'Halloumi f&uuml;r ca. 2 &#8211; 3 Min. braten.' },
      ],
    });

    const rezept = extractRecipe(html, 'https://beispiel.test/rezept');
    expect(rezept).not.toBeNull();
    expect(rezept!.name).toBe('Halloumi-Burger mit Honig-Senf-Soße');
    expect(rezept!.servings).toBe(4);
    expect(rezept!.timeMin).toBe(110);
    expect(rezept!.ingredients).toHaveLength(3);
    expect(rezept!.ingredients[0]).toEqual({ name: 'Halloumi', amount: 500, unit: 'g' });
    expect(rezept!.steps).toHaveLength(2);
    expect(rezept!.steps[0].durationSec).toBeNull();
    expect(rezept!.steps[1].durationSec).toBe(2 * 60);
    expect(rezept!.source).toBe('https://beispiel.test/rezept');
  });

  test('Schritte in Abschnitten werden mitgenommen', () => {
    const html = seite({
      '@type': 'Recipe',
      name: 'Mit Abschnitten',
      recipeIngredient: ['1 Ei'],
      recipeInstructions: [
        {
          '@type': 'HowToSection',
          name: 'Teig',
          itemListElement: [
            { '@type': 'HowToStep', text: 'Mehl abwiegen.' },
            { '@type': 'HowToStep', text: '30 Minuten ruhen lassen.' },
          ],
        },
        { '@type': 'HowToSection', itemListElement: [{ '@type': 'HowToStep', text: 'Backen.' }] },
      ],
    });

    const rezept = extractRecipe(html, 'https://beispiel.test/2');
    expect(rezept!.steps.map((s) => s.text)).toEqual([
      'Mehl abwiegen.',
      '30 Minuten ruhen lassen.',
      'Backen.',
    ]);
    expect(rezept!.steps[1].durationSec).toBe(30 * 60);
  });

  test('Zeit wird notfalls aus Vorbereitung plus Garzeit gerechnet', () => {
    const html = seite({
      '@type': 'Recipe',
      name: 'Ohne Gesamtzeit',
      prepTime: 'PT15M',
      cookTime: 'PT25M',
      recipeIngredient: [],
      recipeInstructions: ['Kochen.'],
    });
    expect(extractRecipe(html, 'x')!.timeMin).toBe(40);
  });

  test('eine Seite ohne Rezept liefert nichts', () => {
    expect(extractRecipe('<html><body>Nur Text</body></html>', 'x')).toBeNull();
    expect(extractRecipe(seite({ '@type': 'Article', name: 'Kein Rezept' }), 'x')).toBeNull();
  });
});

test.describe('Import-Route', () => {
  test('lehnt Adressen im eigenen Netz und fremde Schemata ab', async ({ request }) => {
    for (const [url, fehler] of [
      ['http://127.0.0.1/', 'blocked_host'],
      ['http://169.254.169.254/latest/meta-data/', 'blocked_host'],
      ['http://[::1]/', 'blocked_host'],
      ['file:///etc/passwd', 'unsupported_scheme'],
    ] as const) {
      const antwort = await request.post('/api/import', { data: { url } });
      expect(antwort.status(), url).toBe(400);
      expect((await antwort.json()).error, url).toBe(fehler);
    }
  });

  test('ohne Adresse sagt sie das', async ({ request }) => {
    const antwort = await request.post('/api/import', { data: {} });
    expect(antwort.status()).toBe(400);
    expect((await antwort.json()).error).toBe('missing_url');
  });
});

/**
 * So legt Swissmilk ein Rezept ab: die Zutaten als Microdata, mit Gruppen als
 * Zwischenzeilen ohne Daten, und die Schritte ein zweites Mal als HowTo im
 * JSON-LD. Nachgebaut im Kleinen.
 */
const MICRODATA = `<!doctype html><html><head>
<script type="application/ld+json">{"@context":"http://schema.org","@graph":[{"@type":"Organization","name":"Swissmilk"}]}</script>
<script type="application/ld+json">{"@context":"https://schema.org","@type":"HowTo","name":"Apfelwähe","totalTime":90,
 "step":[{"@type":"HowToStep","position":1,"itemListElement":{"@type":"HowToDirection","text":"Teig: Mehl und Salz mischen. 30 Minuten kühl stellen."}},
 {"@type":"HowToStep","position":2,"itemListElement":{"@type":"HowToDirection","text":"Guss: Alle Zutaten gut verrühren, über die Äpfel giessen."}}]}</script>
</head><body><nav><a href="/">Rezepte</a></nav>
<main itemscope itemtype="http://schema.org/Recipe">
 <h1><span itemprop="name">Apfelwähe</span></h1>
 <p itemprop="recipeYield">8 Stück</p>
 <meta content="PT30M" itemprop="prepTime"><meta content="PT90M" itemprop="totalTime">
 <table aria-label="Zutaten">
  <thead><tr><th>Menge</th><th>Zutaten</th></tr></thead>
  <tbody><tr itemprop="recipeIngredient"><td colspan="2">Butter für das Blech</td></tr></tbody>
  <tbody><tr><th colspan="2">Teig:</th></tr>
   <tr itemprop="recipeIngredient"><td><span><span>225</span><span>  g</span></span></td><th>Mehl</th></tr>
   <tr itemprop="recipeIngredient"><td><span>½</span><span> TL</span></td><th>Salz</th></tr>
   <tr itemprop="recipeIngredient"><td colspan="2">(oder Fertig-Butterkuchenteig)</td></tr></tbody>
  <tbody><tr><th colspan="2">Guss:</th></tr>
   <tr itemprop="recipeIngredient"><td><span>1</span><span> dl</span></td><th>Milch</th></tr>
   <tr itemprop="recipeIngredient"><td><span>2</span></td><th>Eier</th></tr></tbody>
 </table>
 <ol><li itemprop="recipeInstructions" itemscope itemtype="http://schema.org/HowToStep"><span itemprop="text">Teig: Mehl und Salz mischen. 30 Minuten kühl stellen.</span></li>
 <li itemprop="recipeInstructions" itemscope itemtype="http://schema.org/HowToStep"><span itemprop="text">Guss: Alle Zutaten gut verrühren, über die Äpfel giessen.</span></li></ol>
</main><footer>Impressum</footer></body></html>`;

test.describe('Rezepte ohne JSON-LD-Rezept', () => {
  test('Microdata mit Gruppen wird gelesen (Swissmilk)', () => {
    const rezept = extractRecipe(MICRODATA, 'https://www.swissmilk.ch/x')!;
    expect(rezept.name).toBe('Apfelwähe');
    expect(rezept.servings).toBe(8);
    expect(rezept.timeMin).toBe(90);
    expect(rezept.herkunft).toBeUndefined();
    expect(rezept.ingredients).toEqual([
      { name: 'Butter für das Blech', amount: null, unit: '' },
      { name: 'Mehl (Teig)', amount: 225, unit: 'g' },
      { name: 'Salz (Teig)', amount: 0.5, unit: 'TL' },
      { name: 'Milch (Guss)', amount: 1, unit: 'dl' },
      { name: 'Eier (Guss)', amount: 2, unit: '' },
    ]);
    expect(rezept.steps.map((step) => step.text)).toEqual([
      'Teig: Mehl und Salz mischen. 30 Minuten kühl stellen.',
      'Guss: Alle Zutaten gut verrühren, über die Äpfel giessen.',
    ]);
    expect(rezept.steps[0].durationSec).toBe(1800);
  });

  test('"Guss: Alle Zutaten" meint nur die Zutaten des Gusses', () => {
    const rezept = extractRecipe(MICRODATA, 'x')!;
    const zutaten = rezept.ingredients.map((zutat, i) => ({ id: `z${i}`, ...zutat }));
    expect(zutatenFuerSchritt(rezept.steps[1].text, zutaten).map((z) => z.name)).toEqual([
      'Milch (Guss)',
      'Eier (Guss)',
    ]);
  });

  test('ein HowTo allein liefert die Schritte, die Seite den Rest', () => {
    const html = `<html><head><title>Zopf | Beispiel</title>
      <script type="application/ld+json">{"@type":"HowTo","name":"Zopf","step":[{"@type":"HowToStep","text":"Teig kneten."}]}</script>
      </head><body><h2>Zutaten für 1 Zopf</h2><ul><li>500 g Zopfmehl</li><li>3 dl Milch</li></ul></body></html>`;
    const rezept = extractRecipe(html, 'x')!;
    expect(rezept.name).toBe('Zopf');
    expect(rezept.steps.map((step) => step.text)).toEqual(['Teig kneten.']);
    expect(rezept.ingredients.map((zutat) => zutat.name)).toEqual(['Zopfmehl', 'Milch']);
  });

  test('verschachteltes JSON-LD, Gruppenzeilen und Schritte als HTML', () => {
    const html = `<html><head><script type="application/ld+json">${JSON.stringify({
      '@type': 'WebPage',
      mainEntity: {
        '@type': 'http://schema.org/Recipe',
        name: 'Quiche Rezept',
        recipeYield: '4',
        totalTime: 55,
        recipeIngredient: ['Für den Teig:', '200 g Mehl', '100 g Butter', 'Für den Guss:', '2 dl Rahm'],
        recipeInstructions: '<ol><li>1. Teig zubereiten.</li><li>Schritt 2: Guss verrühren.</li></ol>',
      },
    })}</script></head><body></body></html>`;
    const rezept = extractRecipe(html, 'x')!;
    expect(rezept.name).toBe('Quiche');
    expect(rezept.timeMin).toBe(55);
    expect(rezept.ingredients.map((zutat) => zutat.name)).toEqual([
      'Mehl (Teig)',
      'Butter (Teig)',
      'Rahm (Guss)',
    ]);
    expect(rezept.steps.map((step) => step.text)).toEqual(['Teig zubereiten.', 'Guss verrühren.']);
  });

  test('ohne Rezeptdaten: Listen unter "Zutaten" und "Zubereitung"', () => {
    const html = `<html><body>
      <header><h2>Zutaten</h2><ul><li>Menü</li><li>Suche</li></ul></header>
      <article><h1>Omas Zwetschgenkuchen</h1>
        <p>Eine lange Geschichte über meine Oma …</p>
        <h2>Zutaten (für 12 Stück)</h2>
        <h3>Für den Teig</h3><ul><li>250 g Mehl</li><li>125 g Butter</li></ul>
        <h3>Belag:</h3><ul><li>1 kg Zwetschgen</li></ul>
        <h2>Zubereitung</h2>
        <p>Mehl und Butter zu einem Teig verkneten und 30 Minuten kühlen.</p>
        <p>Zwetschgen entsteinen und dicht auf den Teig legen.</p>
        <h2>Kommentare</h2><ul><li>Lecker!</li></ul>
      </article></body></html>`;
    const rezept = extractRecipe(html, 'x')!;
    expect(rezept.herkunft).toBe('seite');
    expect(rezept.name).toBe('Omas Zwetschgenkuchen');
    expect(rezept.servings).toBe(12);
    expect(rezept.ingredients.map((zutat) => zutat.name)).toEqual([
      'Mehl (Teig)',
      'Butter (Teig)',
      'Zwetschgen (Belag)',
    ]);
    expect(rezept.steps).toHaveLength(2);
    expect(rezept.steps[0].durationSec).toBe(1800);
  });

  test('Gruppenzeilen werden erkannt, Zutaten und Überschriften nicht verwechselt', () => {
    expect(gruppenTitel('Teig:')).toBe('Teig');
    expect(gruppenTitel('Für den Guss')).toBe('Guss');
    expect(gruppenTitel('Zutaten für die Sauce:')).toBe('Sauce');
    expect(gruppenTitel('Zutaten:')).toBeNull();
    expect(gruppenTitel('Für 4 Personen')).toBeNull();
    expect(gruppenTitel('Butter für das Blech')).toBeUndefined();
    expect(gruppenTitel('Salz')).toBeUndefined();
  });

  test('der Seitentext für die KI lässt Navigation und Fusszeile weg', () => {
    const text = seitentext(MICRODATA);
    expect(text).toContain('Apfelwähe');
    expect(text).toContain('Guss:');
    expect(text).not.toContain('Impressum');
    expect(text).not.toContain('Rezepte\n');
  });
});

test.describe('Rezept aus eingefügtem Text', () => {
  test('mit den Überschriften Zutaten und Zubereitung', () => {
    const rezept = ausEingefuegtemText(`Werbung
Linsensalat mit Feta
Zutaten für 2 Personen
• 150 g Linsen
• 1 Zwiebel
• 100 g Feta
Zubereitung
1
Linsen 20 Minuten kochen und abgiessen.
2
Zwiebel hacken, alles mischen.
Tipp
Schmeckt auch lauwarm.`)!;
    expect(rezept.name).toBe('Linsensalat mit Feta');
    expect(rezept.servings).toBe(2);
    expect(rezept.ingredients.map((zutat) => [zutat.amount, zutat.unit, zutat.name])).toEqual([
      [150, 'g', 'Linsen'],
      [1, '', 'Zwiebel'],
      [100, 'g', 'Feta'],
    ]);
    expect(rezept.steps.map((step) => step.text)).toEqual([
      'Linsen 20 Minuten kochen und abgiessen.',
      'Zwiebel hacken, alles mischen.',
    ]);
    expect(rezept.steps[0].durationSec).toBe(1200);
  });

  test('ohne Überschriften: Mengen vorne sind Zutaten', () => {
    const rezept = ausEingefuegtemText(`Schnelle Tomatensauce
500 g Tomaten
2 EL Olivenöl
Salz
Öl erhitzen, Tomaten dazugeben und 15 Minuten köcheln lassen.`)!;
    expect(rezept.name).toBe('Schnelle Tomatensauce');
    expect(rezept.ingredients.map((zutat) => zutat.name)).toEqual(['Tomaten', 'Olivenöl', 'Salz']);
    expect(rezept.steps).toHaveLength(1);
  });

  test('ohne Rezept darin: nichts', () => {
    expect(ausEingefuegtemText('Hallo\nwie geht es dir?\nBis bald')).toBeNull();
  });
});

test.describe('Import-Route mit Text', () => {
  test('liest eingefügten Text ohne KI', async ({ request }) => {
    const antwort = await request.post('/api/import', {
      data: { text: 'Pfannkuchen\nZutaten\n250 g Mehl\n5 dl Milch\n3 Eier\nZubereitung\nAlles verrühren und 30 Minuten ruhen lassen.\nIn der Pfanne ausbacken.' },
    });
    expect(antwort.status()).toBe(200);
    const daten = await antwort.json();
    expect(daten.recipe.name).toBe('Pfannkuchen');
    expect(daten.recipe.ingredients).toHaveLength(3);
    expect(daten.recipe.steps).toHaveLength(2);
    expect(daten.recipe.herkunft).toBe('seite');
  });

  test('ohne Rezept im Text sagt sie, woran es liegt', async ({ request }) => {
    const antwort = await request.post('/api/import', { data: { text: 'Nur ein Gruss\nund noch einer\nund Schluss' } });
    expect(antwort.status()).toBe(422);
    expect(await antwort.json()).toMatchObject({ ok: false, error: 'no_recipe', ki: 'no_key' });
  });
});

test.describe('Rezepttext einfügen', () => {
  const TEXT = `Pfannkuchen
Zutaten für 4 Personen
250 g Mehl
5 dl Milch
3 Eier
Zubereitung
Alles verrühren und 30 Minuten ruhen lassen.
In der Pfanne goldbraun ausbacken.`;

  test('wo der Link nicht weiterkommt, hilft der kopierte Text', async ({ page }) => {
    await openSpace(page, newSpace('textimport'));
    await page.route('**/api/import', (route) => {
      if (route.request().postDataJSON()?.url) {
        return route.fulfill({ status: 422, json: { ok: false, error: 'no_recipe', ki: 'billing' } });
      }
      return route.continue();
    });
    await page.route('**/api/simplify', (route) =>
      route.fulfill({ status: 503, json: { ok: false, error: 'billing' } }),
    );

    await neuesRezept(page);
    const form = page.getByRole('dialog');
    await form.getByLabel('Rezept über Link hinzufügen').fill('https://beispiel.test/pfannkuchen');
    await form.getByRole('button', { name: 'Holen' }).click();

    // Die Meldung sagt, woran es liegt und was jetzt hilft – das Textfeld ist schon offen.
    await expect(form.getByRole('alert')).toContainText('Zahlungsangabe');
    await expect(form.getByRole('alert')).toContainText('füge ihn unten ein');
    await form.getByLabel('Rezepttext einfügen').fill(TEXT);
    await form.getByRole('button', { name: 'Text übernehmen' }).click();

    await expect(form.getByLabel('Name', { exact: true })).toHaveValue('Pfannkuchen');
    await expect(form.getByText(/aus dem Text gelesen/)).toBeVisible();
    await expect(form.getByLabel('Name für Zutat 1')).toHaveValue('Mehl');
    await expect(form.getByLabel('Text für Schritt 1')).toHaveValue('Alles verrühren und 30 Minuten ruhen lassen.');
    await expect(form.getByLabel('Portionen')).toHaveValue('4');
  });

  test('geht auch direkt, ohne Link', async ({ page }) => {
    await openSpace(page, newSpace('textdirekt'));
    await neuesRezept(page);
    const form = page.getByRole('dialog');
    await form.getByRole('button', { name: 'Oder Rezepttext einfügen' }).click();
    await form.getByLabel('Rezepttext einfügen').fill(TEXT);
    await form.getByRole('button', { name: 'Text übernehmen' }).click();
    await expect(form.getByLabel('Name', { exact: true })).toHaveValue('Pfannkuchen');
  });
});
