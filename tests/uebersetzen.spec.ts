import { expect, test } from '@playwright/test';
import { goToTab, neuesRezept, newSpace, openSpace } from './helpers';
import { istEnglisch, rezeptTexte } from '../src/lib/sprache';
import { kurzeAdresse, ohneEszett, ohneTracking, textOhneTracking, textUndAdressen } from '../src/lib/aufraeumen';
import { brauchtUebersetzung, rezeptAuftrag, uebersetzungAnwenden, zutatAlsZeile } from '../src/lib/uebersetzen';
import { buildSeedData } from '../src/lib/seed';
import type { Recipe } from '../src/lib/types';

/** Ein Rezept, wie es von einer amerikanischen Seite kommt. */
function bananenbrot(extra: Partial<Recipe> = {}): Recipe {
  const now = Date.now();
  return {
    id: 'bananenbrot',
    name: 'Easy Banana Bread',
    category: 'Dessert',
    servings: 8,
    timeMin: 70,
    ingredients: [
      { id: 'z1', name: 'cups all-purpose flour', amount: 2, unit: '' },
      { id: 'z2', name: 'stick butter, melted', amount: 1, unit: '' },
      { id: 'z3', name: '', amount: null, unit: '' },
      { id: 'z4', name: 'ripe bananas', amount: 3, unit: '' },
    ],
    prep: ['Mash the bananas'],
    steps: [
      { id: 's1', text: 'Preheat the oven to 350°F and grease a loaf pan.', durationSec: null },
      { id: 's2', text: 'Mix the butter into the mashed bananas, then stir in the sugar and the flour.', durationSec: null },
      { id: 's3', text: 'Bake for 60 minutes, until a toothpick comes out clean.', durationSec: 3600 },
    ],
    cookNext: false,
    notes: 'Übernommen von https://www.example.com/banana-bread/?utm_source=google&utm_medium=cpc&gclid=abc123',
    createdAt: now,
    updatedAt: now,
    ...extra,
  };
}

test.describe('Sprache erkennen', () => {
  test('ein englisches Rezept wird erkannt', () => {
    expect(istEnglisch(rezeptTexte(bananenbrot()))).toBe(true);
  });

  test('kein mitgeliefertes Rezept gilt als englisch – auch nicht "Marry me Chicken"', () => {
    for (const recipe of Object.values(buildSeedData().recipes)) {
      expect(istEnglisch(rezeptTexte(recipe)), recipe.name).toBe(false);
    }
  });

  test('ein englischer Name allein macht noch kein englisches Rezept', () => {
    expect(
      istEnglisch([
        'Smash Burger with Cheese',
        'Das Hackfleisch zu Kugeln formen und in der heissen Pfanne flach drücken.',
        'Mit Salz und Pfeffer würzen, 2 Minuten braten, wenden und den Käse darauflegen.',
      ]),
    ).toBe(false);
  });
});

test.describe('Text aufräumen', () => {
  test('Eszett wird zu ss', () => {
    expect(ohneEszett('Honig-Senf-Soße in einer großen Schüssel')).toBe('Honig-Senf-Sosse in einer grossen Schüssel');
    expect(ohneEszett('GROẞ')).toBe('GROSS');
  });

  test('Werbeparameter fallen weg, alles andere bleibt', () => {
    expect(
      ohneTracking(
        'https://www.swissmilk.ch/de/rezepte-kochideen/rezepte/LM200_041/apfelwaehe/?utm_source=google&utm_medium=cpc&gclid=EAIaIQ_BwE',
      ),
    ).toBe('https://www.swissmilk.ch/de/rezepte-kochideen/rezepte/LM200_041/apfelwaehe/');
    expect(ohneTracking('https://example.com/rezept?id=42&utm_campaign=x')).toBe('https://example.com/rezept?id=42');
    expect(ohneTracking('kein Link')).toBe('kein Link');
  });

  test('Adressen in einer Notiz', () => {
    const notiz = 'Übernommen von https://www.swissmilk.ch/de/a/?utm_source=x. Sehr fein!';
    expect(textUndAdressen(notiz)).toEqual([
      'Übernommen von ',
      'https://www.swissmilk.ch/de/a/?utm_source=x',
      '. Sehr fein!',
    ]);
    expect(textOhneTracking(notiz)).toBe('Übernommen von https://www.swissmilk.ch/de/a/. Sehr fein!');
    expect(kurzeAdresse('https://www.swissmilk.ch/de/a/')).toBe('swissmilk.ch');
  });
});

test.describe('Übersetzung ans Rezept setzen', () => {
  test('jede Zeile kommt an ihre Stelle zurück, mit ihrer Id', () => {
    const recipe = bananenbrot();
    const auftrag = rezeptAuftrag(recipe);
    // Leere Zutaten gehen nicht mit – und bleiben trotzdem stehen.
    expect(auftrag.zutaten).toEqual(['2 cups all-purpose flour', '1 stick butter, melted', '3 ripe bananas']);
    expect(auftrag.schritte).toHaveLength(3);
    expect(auftrag.vorbereitung).toEqual(['Mash the bananas']);

    const neu = uebersetzungAnwenden(recipe, {
      ...auftrag,
      name: 'Bananenbrot',
      zutaten: ['250 g Mehl', '115 g Butter, geschmolzen', '3 reife Bananen'],
      schritte: [
        'Den Ofen auf 180 °C vorheizen und eine Cakeform einfetten.',
        'Butter unter die zerdrückten Bananen mischen, dann Zucker und Mehl unterrühren.',
        'Etwa 60 Minuten backen, bis an einem Zahnstocher nichts mehr klebt.',
      ],
      vorbereitung: ['Bananen zerdrücken'],
    })!;

    expect(neu.name).toBe('Bananenbrot');
    expect(neu.uebersetztAus).toBe('en');
    expect(neu.ingredients.map((zutat) => zutat.id)).toEqual(['z1', 'z2', 'z3', 'z4']);
    expect(neu.ingredients[0]).toMatchObject({ name: 'Mehl', amount: 250, unit: 'g' });
    expect(neu.ingredients[2].name).toBe('');
    expect(neu.ingredients[3]).toMatchObject({ name: 'reife Bananen', amount: 3, unit: '' });
    expect(neu.steps.map((step) => step.id)).toEqual(['s1', 's2', 's3']);
    expect(neu.steps[2].durationSec).toBe(3600);
    expect(neu.prep).toEqual(['Bananen zerdrücken']);
  });

  test('passt die Antwort nicht zum Rezept, wird nichts übernommen', () => {
    const recipe = bananenbrot();
    const auftrag = rezeptAuftrag(recipe);
    expect(uebersetzungAnwenden(recipe, { ...auftrag, schritte: auftrag.schritte.slice(1) })).toBeNull();
  });

  test('übersetzte und schon versuchte Rezepte bleiben in Ruhe', () => {
    expect(brauchtUebersetzung(bananenbrot())).toBe(true);
    expect(brauchtUebersetzung(bananenbrot({ uebersetztAus: 'en' }))).toBe(false);
    expect(brauchtUebersetzung(bananenbrot({ uebersetzungVersuch: Date.now() }))).toBe(false);
    expect(zutatAlsZeile({ amount: 0.5, unit: 'TL', name: 'Salz' })).toBe('0.5 TL Salz');
  });
});

test.describe('Rezepte auf Englisch in der App', () => {
  test('ohne KI kommt ein englisches Rezept an – mit dem Hinweis, dass es übersetzt wird', async ({ request }) => {
    const antwort = await request.post('/api/import', {
      data: {
        text: [
          'Easy Banana Bread',
          'Ingredients',
          '2 cups all-purpose flour',
          '1 stick butter, melted',
          '3 ripe bananas',
          'Instructions',
          'Preheat the oven to 350°F and grease a loaf pan.',
          'Mix the butter into the mashed bananas, then stir in the sugar and the flour.',
          'Bake for 60 minutes, until a toothpick comes out clean.',
        ].join('\n'),
      },
    });
    expect(antwort.ok()).toBe(true);
    const daten = await antwort.json();
    expect(daten.recipe.name).toBe('Easy Banana Bread');
    expect(daten.recipe.sprache).toBe('en');
    expect(daten.recipe.kiFehler).toBe('no_key');
  });

  test('gespeicherte englische Rezepte werden beim Start übersetzt', async ({ page, request }) => {
    const space = newSpace('englisch');
    const recipe = bananenbrot({ cookNext: true });
    await request.post(`/api/space/${space}`, {
      data: {
        data: {
          recipes: { [recipe.id]: recipe },
          dishes: {},
          shopping: {
            mehl: {
              id: 'mehl',
              name: 'cups all-purpose flour',
              amount: 2,
              unit: '',
              pantryId: null,
              fromRecipe: 'Easy Banana Bread',
              plannedFrom: { bananenbrot: { amount: 2, unit: '' } },
              createdAt: Date.now(),
              updatedAt: Date.now(),
            },
          },
          pantry: {},
        },
      },
    });

    const anfragen: unknown[] = [];
    await page.route('**/api/translate', async (route) => {
      const auftrag = route.request().postDataJSON().recipe;
      anfragen.push(auftrag);
      await route.fulfill({
        json: {
          ok: true,
          recipe: {
            ...auftrag,
            name: 'Bananenbrot',
            zutaten: ['250 g Mehl', '115 g Butter, geschmolzen', '3 reife Bananen'],
            schritte: [
              'Den Ofen auf 180 °C vorheizen und eine Cakeform einfetten.',
              'Butter unter die zerdrückten Bananen mischen, dann Zucker und Mehl unterrühren.',
              'Etwa 60 Minuten backen, bis an einem Zahnstocher nichts mehr klebt.',
            ],
            vorbereitung: ['Bananen zerdrücken'],
            originalSchritte: auftrag.originalSchritte,
            originalVorbereitung: auftrag.originalVorbereitung,
          },
        },
      });
    });
    await page.route('**/api/simplify', (route) => route.fulfill({ status: 503, json: { ok: false, error: 'billing' } }));

    await page.goto(`/s/${space}`);
    await expect(page.getByRole('button', { name: 'Rezept Bananenbrot öffnen' })).toBeVisible({ timeout: 20_000 });
    expect(anfragen).toHaveLength(1);

    await page.getByRole('button', { name: 'Rezept Bananenbrot öffnen' }).click();
    const detail = page.getByRole('dialog');
    await expect(detail.getByText('250 g', { exact: true })).toBeVisible();
    await expect(detail.getByText('Mehl', { exact: true })).toBeVisible();
    await expect(detail.getByText(/auf 180 °C vorheizen/)).toBeVisible();
    await expect(detail.getByText('Aus dem Englischen übersetzt.')).toBeVisible();

    // Geplant: die Einkaufsliste steht jetzt auch auf Deutsch da.
    await detail.getByRole('button', { name: 'Schliessen' }).click();
    await goToTab(page, 'Einkaufsliste');
    await expect(page.locator('.row__name', { hasText: /^Mehl$/ })).toBeVisible();
    await expect(page.locator('.row__name', { hasText: 'cups all-purpose flour' })).toHaveCount(0);
  });

  test('ohne KI steht am Rezept, dass es noch übersetzt wird', async ({ page, request }) => {
    const space = newSpace('englischoffen');
    const recipe = bananenbrot();
    await request.post(`/api/space/${space}`, {
      data: { data: { recipes: { [recipe.id]: recipe }, dishes: {}, shopping: {}, pantry: {} } },
    });
    await page.route('**/api/translate', (route) =>
      route.fulfill({ status: 503, json: { ok: false, error: 'billing' } }),
    );
    await page.goto(`/s/${space}`);
    await page.getByRole('button', { name: 'Rezept Easy Banana Bread öffnen' }).click();
    await expect(
      page.getByRole('dialog').getByText(/auf Englisch. Die App übersetzt es von selbst/),
    ).toBeVisible();
  });
});

test.describe('Schweizer Schreibweise in gespeicherten Rezepten', () => {
  test('Eszett wird beim Start zu ss, die Quelle ist ein kurzer Link', async ({ page, request }) => {
    const space = newSpace('eszett');
    const now = Date.now();
    await request.post(`/api/space/${space}`, {
      data: {
        data: {
          recipes: {
            apfelwaehe: {
              id: 'apfelwaehe',
              name: 'Apfelwähe mit Rahmguss',
              category: 'Dessert',
              servings: 8,
              timeMin: 90,
              ingredients: [{ id: 'a1', name: 'Rahm für den Guß', amount: 2, unit: 'dl' }],
              prep: [],
              steps: [{ id: 'a2', text: 'Den Guß über die Äpfel gießen und 35 Minuten backen.', durationSec: 2100 }],
              kuerzung: 'regeln',
              cookNext: false,
              notes:
                'Übernommen von https://www.swissmilk.ch/de/rezepte-kochideen/rezepte/LM200_041/apfelwaehe/?utm_source=google&utm_medium=cpc&utm_campaign=gsn_rezepte_adfeeder_enj_multi_ym_de_traffic_qt_rezept_on_p_ab_27020101&gclid=CjwKCAjwQCeEE_JJXgAXlsBSN7WChyGje6URoCpqcQAvD_BwE',
              createdAt: now,
              updatedAt: now,
            },
          },
          dishes: {},
          shopping: {},
          pantry: {},
        },
      },
    });

    await page.goto(`/s/${space}`);
    await page.getByRole('button', { name: 'Rezept Apfelwähe mit Rahmguss öffnen' }).click();
    const detail = page.getByRole('dialog');
    await expect(detail.getByText('Rahm für den Guss', { exact: true })).toBeVisible();
    await expect(detail.getByText('Den Guss über die Äpfel giessen und 35 Minuten backen.')).toBeVisible();

    const link = detail.getByRole('link', { name: 'swissmilk.ch' });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute(
      'href',
      'https://www.swissmilk.ch/de/rezepte-kochideen/rezepte/LM200_041/apfelwaehe/',
    );

    // Und das Blatt laesst sich nicht mehr seitlich verschieben.
    const flaeche = detail.locator('.sheet__body');
    const breit = await flaeche.evaluate((el) => {
      el.scrollLeft = 500;
      return { links: el.scrollLeft, zuBreit: el.scrollWidth > el.clientWidth + 1 };
    });
    expect(breit).toEqual({ links: 0, zuBreit: false });

    // Der Server hat den aufgeraeumten Stand bekommen.
    await expect(page.getByText('Alles synchronisiert').first()).toBeVisible({ timeout: 20_000 });
    const gespeichert = await (await request.get(`/api/space/${space}`)).json();
    expect(JSON.stringify(gespeichert.data)).not.toMatch(/ß|utm_|gclid/);
  });
});

test.describe('Import räumt auf', () => {
  test('Eszett und Werbeparameter kommen gar nicht erst an', async ({ request }) => {
    const antwort = await request.post('/api/import', {
      data: {
        text: [
          'Halloumi-Burger mit Honig-Senf-Soße',
          'Zutaten',
          '200 g Halloumi',
          '2 EL Honig für die Soße',
          'Zubereitung',
          'Den Halloumi in einer großen Pfanne goldbraun braten.',
        ].join('\n'),
      },
    });
    const daten = await antwort.json();
    expect(JSON.stringify(daten.recipe)).not.toContain('ß');
    expect(daten.recipe.name).toBe('Halloumi-Burger mit Honig-Senf-Sosse');
  });

  test('ein neu geholtes englisches Rezept trägt den Hinweis im Formular', async ({ page }) => {
    await openSpace(page, newSpace('englischform'));
    await page.route('**/api/import', (route) =>
      route.fulfill({
        json: {
          ok: true,
          recipe: {
            name: 'Easy Banana Bread',
            servings: 8,
            timeMin: null,
            ingredients: [{ name: 'cups flour', amount: 2, unit: '' }],
            steps: [{ text: 'Bake for 60 minutes.', durationSec: null }],
            source: 'https://www.example.com/banana-bread/',
            sprache: 'en',
            kiFehler: 'billing',
          },
        },
      }),
    );
    await page.route('**/api/simplify', (route) => route.fulfill({ status: 503, json: { ok: false, error: 'billing' } }));
    await neuesRezept(page);
    const form = page.getByRole('dialog');
    await form.getByLabel('Rezept über Link hinzufügen').fill('example.com/banana-bread');
    await form.getByRole('button', { name: 'Holen' }).click();
    await expect(form.getByText(/Das Rezept ist auf Englisch\. Die App übersetzt es von selbst/)).toBeVisible();
    await expect(form.getByText(/fehlt beim Anbieter noch die Zahlungsangabe/)).toBeVisible();
  });
});
