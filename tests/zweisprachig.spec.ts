import { expect, test } from '@playwright/test';
import {
  goToTab,
  neuesRezept,
  newSpace,
  openPantryGroup,
  openSpace,
  pantryChip,
  shoppingRow,
  waitForSync,
} from './helpers';
import {
  abteilungVon,
  einheitIn,
  einheitenVorschlaege,
  englischerName,
  zutatenName,
} from '../src/lib/zutaten';
import { textIn, zutatIn } from '../src/lib/inhalt';
import { PANTRY_NAME_RENAMES, buildSeedData } from '../src/lib/seed';
import { fehlendeTexte } from '../src/lib/englisch';
import type { Recipe } from '../src/lib/types';

test.describe('Zutatenwissen', () => {
  test('übliche Mengen und Einheiten', () => {
    expect(einheitenVorschlaege('Basilikum')[0]).toEqual({ amount: 1, unit: 'Bund' });
    expect(einheitenVorschlaege('Tomatensauce')).toEqual([
      { amount: 1, unit: 'Dose' },
      { amount: 1, unit: 'Glas' },
      { amount: 400, unit: 'g' },
    ]);
    expect(einheitenVorschlaege('Kokosmilch')[0]).toEqual({ amount: 1, unit: 'Dose' });
    expect(einheitenVorschlaege('Knoblauch')[0]).toEqual({ amount: 2, unit: 'Zehen' });
    // Englisch eingetippt geht auch.
    expect(einheitenVorschlaege('basil')[0]).toEqual({ amount: 1, unit: 'Bund' });
    // Das Ei steckt nicht im Reis.
    expect(einheitenVorschlaege('Reis')[0]).toEqual({ amount: 200, unit: 'g' });
    expect(einheitenVorschlaege('Quatschwort')).toEqual([]);
  });

  test('Abteilungen im Laden', () => {
    expect(abteilungVon('Pouletbrust')).toBe('fleisch');
    expect(abteilungVon('Zwiebeln')).toBe('gemuese');
    expect(abteilungVon('Milch (Guss)')).toBe('kuehl');
    expect(abteilungVon('Butter, geschmolzen')).toBe('kuehl');
    expect(abteilungVon('Erbsli')).toBe('tiefkuehl');
    expect(abteilungVon('WC-Papier')).toBe('haushalt');
    expect(abteilungVon('Quatschwort')).toBe('weitere');
  });

  test('Namen und Einheiten auf Englisch', () => {
    expect(zutatenName('Zwiebeln', 'en', 3)).toBe('onions');
    expect(zutatenName('Zwiebel', 'en', 1)).toBe('onion');
    expect(zutatenName('Butter, geschmolzen', 'en')).toBe('butter, melted');
    expect(zutatenName('Milch (Guss)', 'en')).toBe('milk (topping)');
    // Unbekannter Zusatz: lieber gar nicht als halb deutsch.
    expect(zutatenName('Milch, vom Bauernhof nebenan', 'en')).toBeNull();
    expect(zutatenName('Zwiebelkuchen', 'en')).toBeNull();
    expect(einheitIn('EL', 'en', 2)).toBe('tbsp');
    expect(einheitIn('Bund', 'en', 2)).toBe('bunches');
    expect(einheitIn('Stück', 'en', 3)).toBe('');
    expect(einheitIn('tbsp', 'de')).toBe('EL');
  });

  test('nur englisch Eingetipptes wird in der deutschen Ansicht übersetzt', () => {
    expect(englischerName('basil')).not.toBeNull();
    expect(englischerName('Basilikum')).toBeNull();
    expect(zutatIn('de', 'basil')).toBe('Basilikum');
    // Deutsch bleibt Wort für Wort – auch wo die App ein anderes Wort führt.
    expect(zutatIn('de', 'Gemüsebrühe')).toBe('Gemüsebrühe');
    expect(zutatIn('de', 'Quinoa')).toBe('Quinoa');
  });
});

test.describe('Mitgelieferte Inhalte auf Englisch', () => {
  test('jedes Rezept, jede Idee und jede Standard-Zutat hat eine englische Fassung', () => {
    const gleich = new Set(['Shakshuka', 'Fried Rice', 'Parmesan (optional)']);
    const fehlt: string[] = [];
    const daten = buildSeedData();
    const pruefe = (deutsch: string, englisch: string) => {
      if (englisch === deutsch && !gleich.has(deutsch)) fehlt.push(deutsch);
    };
    for (const recipe of Object.values(daten.recipes)) {
      pruefe(recipe.name, textIn('en', recipe.name));
      for (const zutat of recipe.ingredients) pruefe(zutat.name, zutatIn('en', zutat.name, zutat.amount));
      for (const aufgabe of recipe.prep ?? []) pruefe(aufgabe, textIn('en', aufgabe));
      for (const step of recipe.steps) pruefe(step.text, textIn('en', step.text));
      if (recipe.notes) pruefe(recipe.notes, textIn('en', recipe.notes));
      // Fuer die KI bleibt nichts uebrig.
      expect(fehlendeTexte(recipe), recipe.name).toEqual([]);
    }
    for (const dish of Object.values(daten.dishes)) {
      pruefe(dish.name, textIn('en', dish.name));
      for (const zutat of dish.ingredients) pruefe(zutat.name, zutatIn('en', zutat.name, zutat.amount));
    }
    for (const item of Object.values(daten.pantry)) pruefe(item.name, zutatIn('en', item.name));
    expect(fehlt).toEqual([]);
  });

  test('ohne Eszett', () => {
    const daten = buildSeedData();
    expect(JSON.stringify(daten)).not.toContain('ß');
  });
});

test.describe('Sprache umschalten', () => {
  test('ein Tipp oben macht die ganze App englisch – auch die Rezepte', async ({ page }) => {
    await openSpace(page, newSpace('englisch'));
    await page.getByRole('button', { name: 'Sprache: Deutsch – auf Englisch umschalten' }).click();

    await expect(page.getByRole('heading', { name: 'Cravings', level: 1 })).toBeVisible();
    await page.getByRole('button', { name: 'Open recipe Chicken with Broccoli and Rice' }).click();
    const detail = page.getByRole('dialog');
    await expect(detail.getByRole('heading', { name: 'Chicken with Broccoli and Rice', level: 1 })).toBeVisible();
    await expect(detail.getByText('Ingredients', { exact: true })).toBeVisible();
    await expect(detail.locator('.ingredient', { hasText: 'soy sauce' })).toContainText('3 tbsp');
    await expect(detail.locator('.ingredient', { hasText: 'garlic' })).toContainText('2 cloves');
    await expect(detail.getByText('Cut the chicken into bite-sized strips, season with salt and pepper')).toBeVisible();
    await expect(detail.getByRole('button', { name: 'Add to Groceries' })).toBeVisible();

    // Kochen auf Englisch.
    await detail.getByRole('button', { name: 'Start Cooking' }).click();
    await page.getByRole('button', { name: 'Let’s go' }).click();
    await expect(page.getByText('Step 1 of 5')).toBeVisible();
    await expect(page.locator('.cook__text')).toHaveText(
      'Put the rice on with twice its volume of water and a little salt, cover and simmer.',
    );
    await page.getByRole('button', { name: 'Exit cook mode' }).first().click();
    await page.getByRole('dialog').getByRole('button', { name: 'Close' }).click();

    // Die Einkaufsliste heisst Groceries – und die Wahl bleibt nach dem Neuladen.
    const haupt = page.getByRole('navigation', { name: 'Main navigation' });
    if (await haupt.isVisible()) await haupt.getByRole('button', { name: 'Groceries' }).click();
    else await page.getByRole('navigation', { name: 'Sections' }).getByRole('button', { name: 'Groceries' }).click();
    await expect(page.getByRole('heading', { name: 'Groceries', level: 1 })).toBeVisible();
    await page.reload();
    // Nach dem Neuladen beginnt die App vorne – weiterhin auf Englisch.
    await expect(page.getByRole('heading', { name: 'Cravings', level: 1 })).toBeVisible();

    // Zurueck ueber die Einstellungen.
    await page.getByRole('button', { name: 'Settings and sync' }).click();
    await page.getByRole('dialog').getByRole('radio', { name: 'Deutsch' }).click();
    await expect(page.getByRole('dialog').getByRole('heading', { name: 'Einstellungen & Sync' })).toBeVisible();
    await page.getByRole('dialog').getByRole('button', { name: 'Schliessen' }).click();
    await expect(page.getByRole('heading', { name: 'Gelüste', level: 1 })).toBeVisible();
  });

  test('auf Deutsch heissen die Bereiche Gelüste und Beute', async ({ page }) => {
    await openSpace(page, newSpace('deutsch'));
    await expect(page.getByRole('heading', { name: 'Gelüste', level: 1 })).toBeVisible();
    await goToTab(page, 'Beute');
    await expect(page.getByRole('heading', { name: 'Beute', level: 1 })).toBeVisible();
  });

  test('eigene Rezepte übersetzt die KI im Hintergrund – nur was fehlt', async ({ page, request }) => {
    const space = newSpace('kienglisch');
    const now = Date.now();
    const rezept: Recipe = {
      id: 'eigen',
      name: 'Älplermagronen',
      category: 'Comfort',
      servings: 4,
      timeMin: 40,
      ingredients: [
        { id: 'z1', name: 'Zwiebeln', amount: 2, unit: 'Stück' },
        { id: 'z2', name: 'Apfelschnitze', amount: 300, unit: 'g' },
      ],
      prep: ['Zwiebeln in Ringe schneiden'],
      steps: [{ id: 's1', text: 'Magronen und Kartoffeln zusammen weich kochen.', durationSec: null }],
      kuerzung: 'eigen',
      cookNext: false,
      notes: '',
      createdAt: now,
      updatedAt: now,
    };
    await request.post(`/api/space/${space}`, {
      data: { data: { recipes: { eigen: rezept }, dishes: {}, shopping: {}, pantry: {} } },
    });

    const anfragen: string[][] = [];
    await page.route('**/api/englisch', async (route) => {
      const texte = route.request().postDataJSON().texte as string[];
      anfragen.push(texte);
      const woerter: Record<string, string> = {
        Älplermagronen: 'Alpine Macaroni',
        Apfelschnitze: 'apple wedges',
        'Zwiebeln in Ringe schneiden': 'Slice the onions into rings',
        'Magronen und Kartoffeln zusammen weich kochen.': 'Cook the macaroni and potatoes together until soft.',
      };
      await route.fulfill({ json: { ok: true, texte: texte.map((text) => woerter[text] ?? text) } });
    });
    await page.addInitScript(() => window.localStorage.setItem('crave:sprache', 'en'));
    await page.goto(`/s/${space}`);

    await expect(page.getByRole('button', { name: 'Open recipe Alpine Macaroni' })).toBeVisible({ timeout: 20_000 });
    // Bekanntes ("Zwiebeln") kennt die App selbst – das geht nicht an die KI.
    expect(anfragen).toHaveLength(1);
    expect(anfragen[0]).not.toContain('Zwiebeln');
    expect(anfragen[0]).toContain('Apfelschnitze');

    await page.getByRole('button', { name: 'Open recipe Alpine Macaroni' }).click();
    const detail = page.getByRole('dialog');
    await expect(detail.locator('.ingredient', { hasText: 'onions' })).toContainText('2');
    await expect(detail.locator('.ingredient', { hasText: 'apple wedges' })).toContainText('300 g');
    await expect(detail.getByText('Cook the macaroni and potatoes together until soft.')).toBeVisible();

    // Auf Deutsch steht das Original da.
    await page.getByRole('dialog').getByRole('button', { name: 'Close' }).click();
    await page.getByRole('button', { name: 'Language: English – switch to German' }).click();
    await page.getByRole('button', { name: 'Rezept Älplermagronen öffnen' }).click();
    await expect(page.getByRole('dialog').getByText('Magronen und Kartoffeln zusammen weich kochen.')).toBeVisible();
  });
});

test.describe('Mengen beim Eingeben', () => {
  test('nur den Namen tippen – Menge und Einheit kommen dazu', async ({ page }) => {
    await openSpace(page, newSpace('mengen'));
    await neuesRezept(page);
    const form = page.getByRole('dialog');

    await form.getByLabel('Name für Zutat 1').fill('Basilikum');
    await expect(form.getByLabel('Menge für Zutat 1')).toHaveValue('1');
    await expect(form.getByLabel('Einheit für Zutat 1')).toHaveValue('Bund');

    await form.getByRole('button', { name: 'Zutat hinzufügen' }).click();
    await form.getByLabel('Name für Zutat 2').fill('Tomatensauce');
    await expect(form.getByLabel('Einheit für Zutat 2')).toHaveValue('Dose');
    await form.getByRole('button', { name: '1 Glas nehmen' }).click();
    await expect(form.getByLabel('Einheit für Zutat 2')).toHaveValue('Glas');
    await form.getByRole('button', { name: '400 g nehmen' }).click();
    await expect(form.getByLabel('Menge für Zutat 2')).toHaveValue('400');
    await expect(form.getByLabel('Einheit für Zutat 2')).toHaveValue('g');

    // Was man selbst eintraegt, bleibt.
    await form.getByRole('button', { name: 'Zutat hinzufügen' }).click();
    await form.getByLabel('Menge für Zutat 3').fill('3');
    await form.getByLabel('Einheit für Zutat 3').fill('EL');
    await form.getByLabel('Name für Zutat 3').fill('Basilikum');
    await expect(form.getByLabel('Menge für Zutat 3')).toHaveValue('3');
    await expect(form.getByLabel('Einheit für Zutat 3')).toHaveValue('EL');
  });

  test('was die App nicht kennt, fragt sie die KI', async ({ page }) => {
    await openSpace(page, newSpace('mengenki'));
    await page.route('**/api/einheiten', (route) =>
      route.fulfill({
        json: { ok: true, vorschlaege: [{ amount: 1, unit: 'Glas' }], abteilung: 'kuehl', de: 'Kimchi', en: 'kimchi' },
      }),
    );
    await neuesRezept(page);
    const form = page.getByRole('dialog');
    await form.getByLabel('Name für Zutat 1').fill('Kimchi');
    await expect(form.getByLabel('Einheit für Zutat 1')).toHaveValue('Glas', { timeout: 5000 });
    await expect(form.getByLabel('Menge für Zutat 1')).toHaveValue('1');
  });
});

test.describe('Beute nach Abteilungen', () => {
  test('offene Zutaten stehen dort, wo man sie im Laden findet', async ({ page }) => {
    await openSpace(page, newSpace('abteilungen'));
    await goToTab(page, 'Beute');
    const feld = page.getByLabel('Zutat zur Beute hinzufügen');
    for (const zutat of ['500 g Poulet', '2 Zwiebeln', '1 l Milch', 'basil']) {
      await feld.fill(zutat);
      await feld.press('Enter');
    }
    // Die Rubriken der Standard-Zutaten darunter sind gleich gebaut, zaehlen hier aber nicht.
    const abteilungen = page.locator('.abteilung:not(.rubrik)');
    await expect(abteilungen).toHaveCount(3);
    await expect(abteilungen.nth(0).locator('.abteilung__titel')).toContainText('Gemüse & Früchte');
    await expect(abteilungen.nth(1).locator('.abteilung__titel')).toContainText('Fleisch & Fisch');
    await expect(abteilungen.nth(2).locator('.abteilung__titel')).toContainText('Milch, Käse & Eier');
    await expect(abteilungen.nth(0)).toContainText('Zwiebeln');
    // Englisch eingetippt, deutsch gezeigt.
    await expect(abteilungen.nth(0)).toContainText('Basilikum');
    await expect(shoppingRow(page, 'Poulet')).toContainText('500 g');
  });
});

test.describe('Standard-Zutaten in einer Sprache', () => {
  test('halb englische Namen sind deutsch gespeichert und englisch gezeigt', () => {
    const namen = Object.values(buildSeedData().pantry).map((item) => item.name);
    for (const alt of Object.keys(PANTRY_NAME_RENAMES)) expect(namen).not.toContain(alt);
    expect(zutatIn('en', 'Protein-Joghurt')).toBe('high-protein yogurt');
    expect(zutatIn('en', 'Mageres Hackfleisch')).toBe('lean ground beef');
    expect(zutatIn('en', 'Rote Bohnen')).toBe('red beans');
    expect(zutatIn('en', 'Süsskartoffel-Pommes (selber machen)')).toBe('sweet potato fries (homemade)');
    // Englisch eingetippt, deutsch gezeigt.
    expect(zutatIn('de', 'High-Protein Yogurt')).toBe('Protein-Joghurt');
    expect(zutatIn('de', 'chicken jerky')).toBe('Poulet-Jerky');
    expect(zutatIn('de', 'black lentils')).toBe('Schwarze Linsen');
    expect(abteilungVon('Protein-Pasta')).toBe('vorrat');
    expect(abteilungVon('Süsskartoffel-Pommes (selber machen)')).toBe('tiefkuehl');
  });

  test('bestehende Einträge bekommen den deutschen Namen – auch in der Beute', async ({ page, request }) => {
    const space = newSpace('grundnamen');
    const now = Date.now();
    const vorrat = (id: string, name: string, category: string, inCart = false) => ({
      id,
      name,
      amount: null,
      unit: '',
      category,
      inCart,
      createdAt: now,
      updatedAt: now,
    });
    await request.post(`/api/space/${space}`, {
      data: {
        data: {
          recipes: {},
          dishes: {},
          shopping: {
            s1: {
              id: 's1',
              name: 'Lean Hackfleisch',
              amount: 500,
              unit: 'g',
              pantryId: 'p1',
              fromRecipe: null,
              manual: true,
              createdAt: now,
              updatedAt: now,
            },
          },
          pantry: {
            p1: vorrat('p1', 'Lean Hackfleisch', 'Protein', true),
            p2: vorrat('p2', 'Red Beans', 'Dosenware'),
            // Selbst umbenannt: bleibt gespeichert, wie es ist.
            p3: vorrat('p3', 'Black Lentils (Beluga)', 'Dosenware'),
          },
        },
      },
    });

    await page.goto(`/s/${space}`);
    await goToTab(page, 'Beute');
    await expect(shoppingRow(page, 'Mageres Hackfleisch')).toContainText('500 g');
    await openPantryGroup(page, 'Dosenware');
    await expect(pantryChip(page, 'Rote Bohnen')).toBeVisible();
    // Gezeigt wird es trotzdem deutsch: die App kennt "black lentils".
    await expect(pantryChip(page, 'Schwarze Linsen (Beluga)')).toBeVisible();

    await waitForSync(page);
    const gespeichert = await (await request.get(`/api/space/${space}`)).json();
    expect(gespeichert.data.pantry.p1.name).toBe('Mageres Hackfleisch');
    expect(gespeichert.data.pantry.p2.name).toBe('Rote Bohnen');
    expect(gespeichert.data.pantry.p3.name).toBe('Black Lentils (Beluga)');
    expect(gespeichert.data.shopping.s1.name).toBe('Mageres Hackfleisch');

    // Auf Englisch steht alles englisch da, auch die Rubrik.
    await page.getByRole('button', { name: 'Sprache: Deutsch – auf Englisch umschalten' }).click();
    await expect(page.getByRole('heading', { name: 'Groceries', level: 1 })).toBeVisible();
    await expect(shoppingRow(page, 'Lean ground beef')).toBeVisible();
    await expect(page.locator('.rubrik__name')).toHaveText(['Canned']);
    await expect(page.getByRole('button', { name: 'Add Red beans to Groceries' })).toBeVisible();
  });

  test('Standard-Zutaten stehen in Karten je Rubrik, wie die Beute', async ({ page }) => {
    await openSpace(page, newSpace('rubriken'));
    await goToTab(page, 'Beute');
    await expect(page.getByRole('heading', { name: 'Standard-Zutaten', level: 2 })).toBeVisible();
    await expect(page.getByText('51 bereit – ein Tipp legt sie in die Beute')).toBeVisible();

    // Zugeklappt zeigt die Karte, was drin ist.
    const carbs = page.locator('.rubrik', { has: page.getByRole('button', { name: /^Carbs/ }) });
    await expect(carbs.locator('.rubrik__vorschau')).toHaveText(
      'Couscous · Kartoffeln · Orzo · Protein-Pasta · Reis · Spaghetti',
    );
    await openPantryGroup(page, 'Carbs');
    await expect(carbs.locator('.kachel__name')).toHaveText([
      'Couscous',
      'Kartoffeln',
      'Orzo',
      'Protein-Pasta',
      'Reis',
      'Spaghetti',
    ]);
    await pantryChip(page, 'Reis').click();
    await expect(shoppingRow(page, 'Reis')).toBeVisible();
    await expect(page.getByText('50 bereit – ein Tipp legt sie in die Beute')).toBeVisible();
  });

  test('verwalten auf Englisch ändert die Menge, der Name bleibt deutsch gespeichert', async ({ page }) => {
    await openSpace(page, newSpace('verwalten'));
    await page.getByRole('button', { name: 'Sprache: Deutsch – auf Englisch umschalten' }).click();
    const haupt = page.getByRole('navigation', { name: 'Main navigation' });
    if (await haupt.isVisible()) await haupt.getByRole('button', { name: 'Groceries' }).click();
    else await page.getByRole('navigation', { name: 'Sections' }).getByRole('button', { name: 'Groceries' }).click();

    await page.getByRole('button', { name: 'Manage' }).click();
    const sheet = page.getByRole('dialog');
    await sheet.getByRole('button', { name: 'Edit High-protein yogurt' }).click();
    await expect(sheet.getByLabel('Name of High-protein yogurt')).toHaveValue('High-protein yogurt');
    await sheet.getByLabel('Amount for High-protein yogurt').fill('2');
    await sheet.getByLabel('Unit for High-protein yogurt').fill('tubs');
    await sheet.getByRole('button', { name: 'Done' }).click();
    await expect(sheet.getByRole('button', { name: 'Edit High-protein yogurt' })).toContainText('2 tubs');

    // Zurueck auf Deutsch: derselbe Eintrag, deutsch – mit der neuen Menge.
    await sheet.getByRole('button', { name: 'Close' }).click();
    await page.getByRole('button', { name: 'Language: English – switch to German' }).click();
    await page.getByRole('button', { name: 'Verwalten' }).click();
    await expect(page.getByRole('dialog').getByRole('button', { name: 'Protein-Joghurt bearbeiten' })).toContainText(
      '2 Becher',
    );
  });
});
