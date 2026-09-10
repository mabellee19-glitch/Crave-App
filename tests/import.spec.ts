import { expect, test } from '@playwright/test';
import { extractRecipe, durationFromText, parseIngredientLine } from '../src/lib/recipeImport';
import { istPrivateAdresse } from '../src/lib/safeFetch';

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
