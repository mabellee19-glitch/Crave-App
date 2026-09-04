import { expect, test } from '@playwright/test';
import {
  goToTab,
  newSpace,
  openPantryGroup,
  openSpace,
  pantryChip,
  shoppingRow,
  waitForSync,
} from './helpers';

test.describe('Navigation und Grundgeruest', () => {
  test('wechselt zwischen den drei Bereichen', async ({ page }) => {
    await openSpace(page, newSpace('nav'));

    await goToTab(page, 'Gerichte');
    await expect(page.getByRole('heading', { name: 'Gerichte', level: 1 })).toBeVisible();

    await goToTab(page, 'Einkaufsliste');
    await expect(page.getByRole('heading', { name: 'Einkaufsliste', level: 1 })).toBeVisible();

    await goToTab(page, 'Rezepte');
    await expect(page.getByRole('heading', { name: 'Rezepte', level: 1 })).toBeVisible();
  });

  test('die Startseite legt einen Datenraum an und leitet dorthin weiter', async ({ page }) => {
    await page.goto('/');
    await page.waitForURL(/\/s\/[a-z0-9-]+$/, { timeout: 15_000 });
    await expect(page.getByRole('heading', { name: 'Rezepte', level: 1 })).toBeVisible();
  });

  test('liefert ein Manifest fuer den Home-Bildschirm', async ({ request }) => {
    const space = newSpace('manifest');
    const response = await request.get(`/s/${space}/manifest`);
    expect(response.ok()).toBeTruthy();
    const manifest = await response.json();
    expect(manifest.start_url).toBe(`/s/${space}`);
    expect(manifest.display).toBe('standalone');
    expect(manifest.icons.length).toBeGreaterThan(0);
  });
});

test.describe('Rezepte', () => {
  test('oeffnet ein Rezept, skaliert Portionen und startet den Kochmodus', async ({ page }) => {
    await openSpace(page, newSpace('recipe'));

    await page.getByRole('button', { name: 'Rezept Poulet mit Brokkoli und Reis öffnen' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('heading', { name: 'Poulet mit Brokkoli und Reis', level: 1 })).toBeVisible();

    // Basis sind 2 Portionen: 400 g Poulet.
    await expect(dialog.getByText('400 g').first()).toBeVisible();
    await expect(dialog.locator('.stepper__value')).toHaveText('2 Portionen');

    await dialog.getByRole('button', { name: 'Eine Portion mehr' }).click();
    await dialog.getByRole('button', { name: 'Eine Portion mehr' }).click();
    await expect(dialog.locator('.stepper__value')).toHaveText('4 Portionen');
    await expect(dialog.getByText('800 g').first()).toBeVisible();

    await dialog.getByRole('button', { name: 'Eine Portion weniger' }).click();
    await expect(dialog.locator('.stepper__value')).toHaveText('3 Portionen');
    await expect(dialog.getByText('600 g').first()).toBeVisible();

    // Kochmodus
    await dialog.getByRole('button', { name: 'Start Cooking' }).click();
    await expect(page.getByText('Schritt 1 von 7')).toBeVisible();

    await page.getByRole('button', { name: 'Weiter' }).click();
    await expect(page.getByText('Schritt 2 von 7')).toBeVisible();

    await page.getByRole('button', { name: 'Zurück', exact: true }).click();
    await expect(page.getByText('Schritt 1 von 7')).toBeVisible();

    await page.getByRole('button', { name: 'Kochmodus beenden' }).click();
    await expect(page.getByText('Schritt 1 von 7')).toBeHidden();
  });

  test('der Timer im Kochmodus laeuft und laesst sich pausieren', async ({ page }) => {
    await openSpace(page, newSpace('timer'));

    await page.getByRole('button', { name: 'Rezept Poulet mit Brokkoli und Reis öffnen' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Start Cooking' }).click();
    await expect(page.getByText('Schritt 1 von 7')).toBeVisible();

    // Schritt 1 hat einen 15-Minuten-Timer.
    await expect(page.getByText('15:00')).toBeVisible();
    await page.getByRole('button', { name: 'Timer starten' }).click();
    await expect(page.getByText('14:5', { exact: false })).toBeVisible({ timeout: 5000 });

    await page.getByRole('button', { name: 'Timer pausieren' }).click();
    const paused = await page.locator('.timer__clock').textContent();
    await page.waitForTimeout(1500);
    expect(await page.locator('.timer__clock').textContent()).toBe(paused);

    await page.getByRole('button', { name: 'Timer zurücksetzen' }).click();
    await expect(page.getByText('15:00')).toBeVisible();
  });

  test('ein laufender Timer läuft beim Weiterblättern weiter', async ({ page }) => {
    await openSpace(page, newSpace('timerweiter'));

    await page.getByRole('button', { name: 'Rezept Poulet mit Brokkoli und Reis öffnen' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Start Cooking' }).click();
    await expect(page.getByText('Schritt 1 von 7')).toBeVisible();

    // Schritt 1 kocht den Reis: 15 Minuten.
    await page.getByRole('button', { name: 'Timer starten' }).click();
    await expect(page.locator('.timer__clock')).toContainText('14:5');

    // Weiter zum nächsten Schritt – der Timer darf nicht stehen bleiben.
    await page.getByRole('button', { name: 'Weiter' }).click();
    await expect(page.getByText('Schritt 2 von 7')).toBeVisible();

    const chip = page.locator('.cook__timerchip');
    await expect(chip).toHaveCount(1);
    await expect(chip).toContainText('Schritt 1');
    const erste = await chip.innerText();
    await page.waitForTimeout(2200);
    expect(await chip.innerText()).not.toBe(erste);

    // Zurück auf Schritt 1: der Timer läuft dort weiter, nicht von vorn.
    await chip.click();
    await expect(page.getByText('Schritt 1 von 7')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Timer pausieren' })).toBeVisible();
    const rest = await page.locator('.timer__clock').innerText();
    expect(rest).not.toBe('15:00');

    // Erst Pause hält ihn an.
    await page.getByRole('button', { name: 'Timer pausieren' }).click();
    const angehalten = await page.locator('.timer__clock').innerText();
    await page.waitForTimeout(1600);
    expect(await page.locator('.timer__clock').innerText()).toBe(angehalten);

    // Ein pausierter Timer erscheint auch nicht mehr in der Leiste.
    await page.getByRole('button', { name: 'Weiter' }).click();
    await expect(page.locator('.cook__timerchip')).toHaveCount(0);
  });

  test('im Kochmodus scrollt die Seite dahinter nicht mit', async ({ page }) => {
    await openSpace(page, newSpace('kochscroll'));

    // Ein Stück in der Rezeptliste scrollen, damit es etwas zu merken gibt.
    await page.mouse.move(180, 400);
    for (let i = 0; i < 4; i++) await page.mouse.wheel(0, 200);
    await page.waitForTimeout(200);
    // Auf breiten Fenstern passt die Liste ohne Scrollen aufs Bild.
    const listenposition = await page.evaluate(() => window.scrollY);

    await page.getByRole('button', { name: 'Rezept Marry me Chicken Orzo öffnen' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Start Cooking' }).click();
    await expect(page.getByText('Schritt 1 von 7')).toBeVisible();

    // Im Kochmodus scrollt nur der Schritt selbst, nie die Seite dahinter.
    await page.mouse.move(180, 320);
    for (let i = 0; i < 8; i++) await page.mouse.wheel(0, 200);
    await page.waitForTimeout(300);
    expect(await page.evaluate(() => window.scrollY)).toBe(0);

    // Der Schritt selbst muss weiterhin scrollen – sofern er überhaupt
    // überläuft. Auf hohen Fenstern passt er ganz aufs Bild.
    const innen = await page.evaluate(() => {
      const el = document.querySelector('.cook__body')!;
      return { ueberlauf: el.scrollHeight > el.clientHeight, position: el.scrollTop };
    });
    if (innen.ueberlauf) expect(innen.position).toBeGreaterThan(0);

    // Nach dem Schliessen steht die Liste wieder da, wo sie war.
    await page.getByRole('button', { name: 'Kochmodus beenden' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Schliessen' }).click();
    await expect
      .poll(() => page.evaluate(() => window.scrollY))
      .toBe(listenposition);
    expect(await page.evaluate(() => document.body.style.position)).toBe('');
  });

  test('legt ein Rezept an, bearbeitet und loescht es', async ({ page }) => {
    await openSpace(page, newSpace('crud'));

    await page.getByRole('button', { name: 'Neues Rezept' }).click();
    const form = page.getByRole('dialog');
    await form.getByLabel('Name', { exact: true }).fill('Testrezept Ofenkarotten');
    await form.getByLabel('Kategorie').fill('Vegi');
    await form.getByLabel('Portionen', { exact: true }).fill('2');
    await form.getByLabel('Zubereitungszeit (Min)').fill('25');

    await form.getByLabel('Menge für Zutat 1').fill('500');
    await form.getByLabel('Einheit für Zutat 1').fill('g');
    await form.getByLabel('Name für Zutat 1').fill('Karotten');

    await form.getByRole('button', { name: 'Zutat hinzufügen' }).click();
    await form.getByLabel('Menge für Zutat 2').fill('2');
    await form.getByLabel('Einheit für Zutat 2').fill('EL');
    await form.getByLabel('Name für Zutat 2').fill('Olivenöl');

    await form.getByLabel('Text für Schritt 1').fill('Karotten schälen und halbieren.');
    await form.getByRole('button', { name: 'Schritt hinzufügen' }).click();
    await form.getByLabel('Text für Schritt 2').fill('Im Ofen backen.');
    await form.getByLabel('Timer für Schritt 2 in Minuten').fill('25');

    await form.getByRole('button', { name: 'Speichern' }).click();
    await expect(page.getByText('Rezept angelegt')).toBeVisible();

    await page.getByRole('button', { name: 'Rezept Testrezept Ofenkarotten öffnen' }).click();
    const detail = page.getByRole('dialog');
    await expect(detail.getByText('500 g')).toBeVisible();
    await expect(detail.getByText('25:00')).toBeVisible();

    // Bearbeiten
    await detail.getByRole('button', { name: 'Rezept bearbeiten' }).click();
    await page.getByRole('dialog').getByLabel('Name', { exact: true }).fill('Ofenkarotten mit Honig');
    await page.getByRole('dialog').getByRole('button', { name: 'Speichern' }).click();
    await expect(page.getByText('Rezept gespeichert')).toBeVisible();
    // Nach dem Speichern steht wieder die Detailansicht offen – mit dem neuen Namen.
    await expect(page.getByRole('heading', { name: 'Ofenkarotten mit Honig', level: 1 })).toBeVisible();

    // Loeschen
    await page.getByRole('dialog').getByRole('button', { name: 'Rezept löschen' }).click();
    await page.getByRole('button', { name: 'Löschen', exact: true }).click();
    await expect(page.getByText('Rezept gelöscht')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Rezept Ofenkarotten mit Honig öffnen' })).toHaveCount(0);
  });

  test('Suche und Favoritenfilter greifen', async ({ page }) => {
    await openSpace(page, newSpace('search'));

    await page.getByPlaceholder('Rezept oder Zutat suchen').fill('shakshuka');
    await expect(page.getByRole('button', { name: 'Rezept Shakshuka öffnen' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Rezept Tomatensuppe mit Basilikum öffnen' })).toHaveCount(0);

    // Auch Zutaten sind durchsuchbar.
    await page.getByPlaceholder('Rezept oder Zutat suchen').fill('kokosmilch');
    await expect(page.getByRole('button', { name: 'Rezept Rotes Linsencurry öffnen' })).toBeVisible();

    await page.getByRole('button', { name: 'Suche löschen' }).click();

    await page.getByRole('button', { name: 'Shakshuka zu Favoriten hinzufügen' }).click();
    await page.getByRole('group', { name: 'Rezepte filtern' }).getByRole('button', { name: 'Favoriten' }).click();
    await expect(page.getByRole('button', { name: 'Rezept Shakshuka öffnen' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Rezept Tomatensuppe mit Basilikum öffnen' })).toHaveCount(0);
  });
});

test.describe('Gerichte', () => {
  test('filtert nach Kategorie und oeffnet das verknuepfte Rezept', async ({ page }) => {
    await openSpace(page, newSpace('dishes'));
    await goToTab(page, 'Gerichte');

    await page.getByRole('group', { name: 'Gerichte filtern' }).getByRole('button', { name: /^Vegi/ }).click();
    await expect(page.getByRole('button', { name: 'Rezept zu Shakshuka öffnen' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Mac and Cheese/ })).toHaveCount(0);

    await page.getByRole('button', { name: 'Rezept zu Shakshuka öffnen' }).click();
    await expect(page.getByRole('dialog').getByRole('heading', { name: 'Shakshuka', level: 1 })).toBeVisible();
    await expect(page.getByRole('dialog').getByText('Zubereitung')).toBeVisible();
  });

  test('legt ein Gericht an und verknuepft es mit einem Rezept', async ({ page }) => {
    await openSpace(page, newSpace('dishnew'));
    await goToTab(page, 'Gerichte');

    await page.getByRole('button', { name: 'Neues Gericht' }).click();
    const form = page.getByRole('dialog');
    await form.getByLabel('Name', { exact: true }).fill('Testgericht Bowl');
    await form.getByLabel('Kategorie').selectOption('high-protein');
    await form.getByLabel('Verknüpftes Rezept').selectOption({ label: 'Shakshuka' });
    await form.getByRole('button', { name: 'Speichern' }).click();
    await expect(page.getByText('Gericht angelegt')).toBeVisible();

    await page.getByRole('button', { name: 'Rezept zu Testgericht Bowl öffnen' }).click();
    await expect(page.getByRole('dialog').getByRole('heading', { name: 'Shakshuka', level: 1 })).toBeVisible();
    await page.getByRole('dialog').getByRole('button', { name: 'Schliessen' }).click();

    // Der Link fuehrt bewusst in den Bereich "Rezepte" – zurueck zu den Gerichten.
    await expect(page.getByRole('heading', { name: 'Rezepte', level: 1 })).toBeVisible();
    await goToTab(page, 'Gerichte');

    await page.getByRole('button', { name: 'Testgericht Bowl bearbeiten' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Gericht löschen' }).click();
    await page.getByRole('button', { name: 'Löschen', exact: true }).click();
    await expect(page.getByText('Gericht gelöscht')).toBeVisible();
  });
});

test.describe('Einkaufsliste und Grundliste', () => {
  test('verschiebt Zutaten zwischen Grundliste und Einkaufsliste', async ({ page }) => {
    await openSpace(page, newSpace('shop'));
    await goToTab(page, 'Einkaufsliste');
    await openPantryGroup(page, 'Vorrat');

    // Grundliste -> Einkaufsliste
    await pantryChip(page, 'Sojasauce').click();
    await expect(shoppingRow(page, 'Sojasauce')).toHaveCount(1);
    await expect(pantryChip(page, 'Sojasauce')).toHaveCount(0);

    // Abhaken -> zurueck in die Grundliste
    await shoppingRow(page, 'Sojasauce').click();
    await expect(page.getByText('Sojasauce erledigt')).toBeVisible();
    await expect(pantryChip(page, 'Sojasauce')).toHaveCount(1);
    await expect(shoppingRow(page, 'Sojasauce')).toHaveCount(0);
  });

  test('Rueckgaengig stellt eine abgehakte Zutat wieder her', async ({ page }) => {
    await openSpace(page, newSpace('undo'));
    await goToTab(page, 'Einkaufsliste');
    await openPantryGroup(page, 'Vorrat');

    await pantryChip(page, 'Butter').click();
    await shoppingRow(page, 'Butter').click();
    await expect(shoppingRow(page, 'Butter')).toHaveCount(0);

    await page.getByRole('button', { name: 'Rückgängig' }).click();
    await expect(shoppingRow(page, 'Butter')).toHaveCount(1);
    await expect(pantryChip(page, 'Butter')).toHaveCount(0);
  });

  test('Schnelleingabe erkennt Menge und Einheit', async ({ page }) => {
    await openSpace(page, newSpace('quick'));
    await goToTab(page, 'Einkaufsliste');

    await page.getByLabel('Zutat zur Einkaufsliste hinzufügen').fill('400 g Poulet');
    await page.getByRole('button', { name: 'Hinzufügen', exact: true }).click();

    const row = shoppingRow(page, 'Poulet');
    await expect(row).toHaveCount(1);
    await expect(row.locator('.row__amount')).toHaveText('400 g');
  });

  test('Rezeptzutaten landen mit skalierten Mengen in der Liste, ohne Duplikate', async ({ page }) => {
    await openSpace(page, newSpace('addrecipe'));

    await page.getByRole('button', { name: 'Rezept Poulet mit Brokkoli und Reis öffnen' }).click();
    const detail = page.getByRole('dialog');
    await detail.getByRole('button', { name: 'Zur Einkaufsliste hinzufügen' }).click();
    await expect(page.getByText(/Zutaten zur Einkaufsliste/)).toBeVisible();
    await detail.getByRole('button', { name: 'Schliessen' }).click();

    await goToTab(page, 'Einkaufsliste');
    const poulet = shoppingRow(page, 'Poulet');
    await expect(poulet.locator('.row__amount')).toHaveText('400 g');
    await expect(shoppingRow(page, 'Reis').locator('.row__amount')).toHaveText('200 g');

    // Sojasauce ist eine Standard-Zutat und darf nicht doppelt erscheinen.
    await expect(shoppingRow(page, 'Sojasauce')).toHaveCount(1);
    await openPantryGroup(page, 'Vorrat');
    await expect(pantryChip(page, 'Sojasauce')).toHaveCount(0);

    // Zweites Hinzufuegen fasst die Mengen zusammen statt zu doppeln.
    await goToTab(page, 'Rezepte');
    await page.getByRole('button', { name: 'Rezept Poulet mit Brokkoli und Reis öffnen' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Eine Portion mehr' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Eine Portion mehr' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Zur Einkaufsliste hinzufügen' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Schliessen' }).click();

    await goToTab(page, 'Einkaufsliste');
    await expect(shoppingRow(page, 'Poulet')).toHaveCount(1);
    await expect(shoppingRow(page, 'Poulet').locator('.row__amount')).toHaveText('1.2 kg');
  });

  test('Grundliste laesst sich ergaenzen und aufraeumen', async ({ page }) => {
    await openSpace(page, newSpace('pantry'));
    await goToTab(page, 'Einkaufsliste');

    await page.getByRole('button', { name: 'Verwalten' }).click();
    const sheet = page.getByRole('dialog');
    await sheet.getByLabel('Neue Standard-Zutat').fill('Quinoa');
    await sheet.getByRole('button', { name: 'Hinzufügen', exact: true }).click();
    await expect(sheet.getByLabel('Name von Quinoa')).toBeVisible();

    await sheet.getByRole('button', { name: 'Honig aus der Grundliste löschen' }).click();
    await expect(sheet.getByLabel('Name von Honig')).toHaveCount(0);

    await sheet.getByRole('button', { name: 'Schliessen' }).click();
    // Ohne Rubrik angelegt, also unter "Weitere".
    await openPantryGroup(page, 'Weitere');
    await expect(pantryChip(page, 'Quinoa')).toHaveCount(1);
    await openPantryGroup(page, 'Vorrat');
    await expect(pantryChip(page, 'Honig')).toHaveCount(0);
  });
});

test.describe('Nachtragen in einen bestehenden Datenraum', () => {
  /** Legt einen Datenraum an, wie ihn ein Gerät mit älterem Stand hätte. */
  async function alterStand(request: import('@playwright/test').APIRequestContext, space: string) {
    const now = Date.now();
    await request.post(`/api/space/${space}`, {
      data: {
        data: {
          recipes: {
            'seed-r-halloumiburger': {
              id: 'seed-r-halloumiburger',
              name: 'Halloumiburger mit Honig-Senf-Sauce',
              category: 'Vegi',
              servings: 2,
              timeMin: 25,
              ingredients: [],
              steps: [],
              favorite: false,
              notes: '',
              createdAt: now,
              updatedAt: now,
            },
          },
          dishes: {},
          shopping: {},
          pantry: {
            alt1: {
              id: 'alt1',
              name: 'Olivenöl',
              amount: null,
              unit: '',
              inCart: false,
              createdAt: now,
              updatedAt: now,
            },
          },
        },
      },
    });
  }

  test('die Vorschlagsliste ergänzt fehlende Zutaten und ordnet vorhandene ein', async ({
    page,
    request,
  }) => {
    const space = newSpace('vorschlaege');
    await alterStand(request, space);

    await page.goto(`/s/${space}`);
    await goToTab(page, 'Einkaufsliste');
    // Vorher gibt es nur die eine Rubrik "Weitere".
    await expect(page.locator('.pantrygroup__title')).toHaveText(['Weitere']);

    await page.getByRole('button', { name: 'Verwalten' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Vorschlagsliste ergänzen' }).click();
    await expect(page.getByText(/Zutaten ergänzt/)).toBeVisible();
    await page.getByRole('dialog').getByRole('button', { name: 'Schliessen' }).click();

    // Alle Rubriken stehen da, "Weitere" ist verschwunden: Olivenöl wurde einsortiert.
    await expect(page.locator('.pantrygroup__title')).toHaveText([
      'Protein',
      'Frisches Gemüse',
      'Dosenware',
      'Im Glas',
      'Zmorge',
      'Einfrieren',
      'Carbs',
      'Vorrat',
    ]);

    await page.getByRole('button', { name: 'Carbs' }).click();
    await expect(page.getByRole('button', { name: 'Orzo in die Einkaufsliste' })).toBeVisible();

    // Ein zweiter Lauf legt nichts doppelt an.
    await page.getByRole('button', { name: 'Verwalten' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Vorschlagsliste ergänzen' }).click();
    await expect(page.getByText('Alles schon vorhanden')).toBeVisible();
  });

  test('fehlende Rezepte werden nachgetragen, Schritte ergänzt', async ({ page, request }) => {
    const space = newSpace('rezeptnachtrag');
    await alterStand(request, space);

    await page.goto(`/s/${space}`);
    await expect(page.getByRole('heading', { name: 'Rezepte', level: 1 })).toBeVisible();
    await expect(page.getByText('1 Rezept gespeichert')).toBeVisible();

    await page.getByRole('button', { name: 'Einstellungen und Synchronisation' }).click();
    await page
      .getByRole('dialog')
      .getByRole('button', { name: 'Fehlende Rezepte nachtragen' })
      .click();
    await expect(page.getByText(/nachgetragen/)).toBeVisible();
    await page.getByRole('dialog').getByRole('button', { name: 'Schliessen' }).click();

    await expect(page.getByText('12 Rezepte gespeichert')).toBeVisible();

    // Das vorhandene Rezept ohne Schritte hat jetzt welche und lässt sich kochen.
    await page.getByRole('button', { name: 'Rezept Halloumiburger mit Honig-Senf-Sauce öffnen' }).click();
    const detail = page.getByRole('dialog');
    await expect(detail.getByText('8 Schritte')).toBeVisible();
    await expect(detail.getByRole('button', { name: 'Start Cooking' })).toBeEnabled();
    await detail.getByRole('button', { name: 'Start Cooking' }).click();
    await expect(page.getByText('Schritt 1 von 8')).toBeVisible();
  });
});

test.describe('Speichern und Synchronisieren', () => {
  test('haelt Aenderungen ueber einen Neustart hinweg', async ({ page }) => {
    const space = newSpace('persist');
    await openSpace(page, space);
    await goToTab(page, 'Einkaufsliste');

    await page.getByLabel('Zutat zur Einkaufsliste hinzufügen').fill('3 Limetten');
    await page.getByRole('button', { name: 'Hinzufügen', exact: true }).click();
    await expect(shoppingRow(page, 'Limetten')).toHaveCount(1);
    await waitForSync(page);

    await page.reload();
    await goToTab(page, 'Einkaufsliste');
    await expect(shoppingRow(page, 'Limetten')).toHaveCount(1);
  });

  test('ein zweites Geraet mit demselben Link sieht dieselben Daten', async ({ page, browser }) => {
    const space = newSpace('sync');
    await openSpace(page, space);
    await goToTab(page, 'Einkaufsliste');
    await page.getByLabel('Zutat zur Einkaufsliste hinzufügen').fill('2 Ciabatta');
    await page.getByRole('button', { name: 'Hinzufügen', exact: true }).click();
    await waitForSync(page);

    // Zweiter Browser-Kontext = zweites Geraet, eigener lokaler Speicher.
    const second = await browser.newContext();
    const other = await second.newPage();
    await other.goto(`/s/${space}`);
    await goToTab(other, 'Einkaufsliste');
    await expect(shoppingRow(other, 'Ciabatta')).toHaveCount(1);

    // Aenderung auf dem zweiten Geraet kommt beim ersten an.
    await other.getByLabel('Zutat zur Einkaufsliste hinzufügen').fill('1 Focaccia');
    await other.getByRole('button', { name: 'Hinzufügen', exact: true }).click();
    await waitForSync(other);

    await expect(shoppingRow(page, 'Focaccia')).toHaveCount(1, { timeout: 25_000 });
    await second.close();
  });

  test('ein leergeraeumter Datenraum bleibt leer', async ({ page }) => {
    const space = newSpace('empty');
    await openSpace(page, space);

    // Alle Startrezepte loeschen.
    for (let i = 0; i < 20; i++) {
      const card = page.getByRole('button', { name: /^Rezept .* öffnen$/ }).first();
      if ((await card.count()) === 0) break;
      await card.click();
      await page.getByRole('dialog').getByRole('button', { name: 'Rezept löschen' }).click();
      await page.getByRole('button', { name: 'Löschen', exact: true }).click();
    }
    await expect(page.getByRole('button', { name: /^Rezept .* öffnen$/ })).toHaveCount(0);
    await waitForSync(page);

    // Ein "neues" Geraet darf die Startinhalte nicht wieder anlegen.
    const second = await page.context().browser()!.newContext();
    const other = await second.newPage();
    await other.goto(`/s/${space}`);
    await expect(other.getByText('Noch keine Rezepte')).toBeVisible();
    await expect(other.getByRole('button', { name: /^Rezept .* öffnen$/ })).toHaveCount(0);
    await second.close();
  });

  test('der Einstellungsdialog zeigt den teilbaren Link', async ({ page }) => {
    const space = newSpace('settings');
    await openSpace(page, space);
    await page.getByRole('button', { name: 'Einstellungen und Synchronisation' }).click();
    await expect(page.getByRole('dialog').getByText(`/s/${space}`)).toBeVisible();
  });
});
