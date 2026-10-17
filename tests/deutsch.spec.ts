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
import { abteilungVon, einheitenVorschlaege, englischerName } from '../src/lib/zutaten';
import { zutatAufDeutsch } from '../src/lib/inhalt';
import { PANTRY_NAME_RENAMES, buildSeedData } from '../src/lib/seed';

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

  test('englisch Eingetipptes steht deutsch da', () => {
    expect(englischerName('basil')).not.toBeNull();
    expect(englischerName('Basilikum')).toBeNull();
    expect(zutatAufDeutsch('basil')).toBe('Basilikum');
    // Deutsch bleibt Wort für Wort – auch wo die App ein anderes Wort führt.
    expect(zutatAufDeutsch('Gemüsebrühe')).toBe('Gemüsebrühe');
    expect(zutatAufDeutsch('Quinoa')).toBe('Quinoa');
  });
});

test.describe('Nur Deutsch', () => {
  test('mitgeliefertes ohne Eszett', () => {
    const daten = buildSeedData();
    expect(JSON.stringify(daten)).not.toContain('ß');
  });

  test('die Bereiche heissen Gelüste und Beute – einen Sprachumschalter gibt es nicht', async ({ page }) => {
    await openSpace(page, newSpace('deutsch'));
    await expect(page.getByRole('heading', { name: 'Gelüste', level: 1 })).toBeVisible();
    await expect(page.getByRole('button', { name: /Sprache|Language/ })).toHaveCount(0);
    await goToTab(page, 'Beute');
    await expect(page.getByRole('heading', { name: 'Beute', level: 1 })).toBeVisible();

    // Auch wer früher Englisch gewählt hatte, sieht alles deutsch.
    await page.evaluate(() => localStorage.setItem('crave:sprache', 'en'));
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Gelüste', level: 1 })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Rezept Poulet mit Brokkoli und Reis öffnen' })).toBeVisible();
  });

  test('in den Einstellungen gibt es keine Sprachwahl mehr', async ({ page }) => {
    await openSpace(page, newSpace('keinesprache'));
    await page.getByRole('button', { name: 'Einstellungen und Synchronisation' }).click();
    const blatt = page.getByRole('dialog');
    await expect(blatt.getByRole('heading', { name: 'Einstellungen & Sync' })).toBeVisible();
    await expect(blatt.getByRole('radio', { name: 'English' })).toHaveCount(0);
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

test.describe('Standard-Zutaten auf Deutsch', () => {
  test('halb englische Namen sind deutsch gespeichert', () => {
    const namen = Object.values(buildSeedData().pantry).map((item) => item.name);
    for (const alt of Object.keys(PANTRY_NAME_RENAMES)) expect(namen).not.toContain(alt);
    // Englisch eingetippt, deutsch gezeigt.
    expect(zutatAufDeutsch('High-Protein Yogurt')).toBe('Protein-Joghurt');
    expect(zutatAufDeutsch('chicken jerky')).toBe('Poulet-Jerky');
    expect(zutatAufDeutsch('black lentils')).toBe('Schwarze Linsen');
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

  test('verwalten: Menge und Einheit ändern, der Name bleibt', async ({ page }) => {
    await openSpace(page, newSpace('verwalten'));
    await goToTab(page, 'Beute');
    await page.getByRole('button', { name: 'Verwalten' }).click();
    const sheet = page.getByRole('dialog');
    await sheet.getByRole('button', { name: 'Protein-Joghurt bearbeiten' }).click();
    await expect(sheet.getByLabel('Name von Protein-Joghurt')).toHaveValue('Protein-Joghurt');
    await sheet.getByLabel('Menge für Protein-Joghurt').fill('2');
    await sheet.getByLabel('Einheit für Protein-Joghurt').fill('Becher');
    await sheet.getByRole('button', { name: 'Fertig' }).click();
    await expect(sheet.getByRole('button', { name: 'Protein-Joghurt bearbeiten' })).toContainText('2 Becher');
  });
});
