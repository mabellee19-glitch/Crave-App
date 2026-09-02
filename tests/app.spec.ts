import { expect, test } from '@playwright/test';
import { goToTab, newSpace, openSpace, pantryChip, shoppingRow, waitForSync } from './helpers';

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

    // Grundliste -> Einkaufsliste
    await page.getByRole('button', { name: 'Sojasauce in die Einkaufsliste' }).click();
    await expect(page.getByRole('button', { name: /Sojasauce/ }).first()).toBeVisible();
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

    await page.getByRole('button', { name: 'Butter in die Einkaufsliste' }).click();
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
    await sheet.getByLabel('Neue Standard-Zutat').fill('Haferflocken');
    await sheet.getByRole('button', { name: 'Hinzufügen', exact: true }).click();
    await expect(sheet.getByLabel('Name von Haferflocken')).toBeVisible();

    await sheet.getByRole('button', { name: 'Honig aus der Grundliste löschen' }).click();
    await expect(sheet.getByLabel('Name von Honig')).toHaveCount(0);

    await sheet.getByRole('button', { name: 'Schliessen' }).click();
    await expect(pantryChip(page, 'Haferflocken')).toHaveCount(1);
    await expect(pantryChip(page, 'Honig')).toHaveCount(0);
  });
});

test.describe('Speichern und Synchronisieren', () => {
  test('haelt Aenderungen ueber einen Neustart hinweg', async ({ page }) => {
    const space = newSpace('persist');
    await openSpace(page, space);
    await goToTab(page, 'Einkaufsliste');

    await page.getByLabel('Zutat zur Einkaufsliste hinzufügen').fill('3 Zitronen');
    await page.getByRole('button', { name: 'Hinzufügen', exact: true }).click();
    await expect(shoppingRow(page, 'Zitronen')).toHaveCount(1);
    await waitForSync(page);

    await page.reload();
    await goToTab(page, 'Einkaufsliste');
    await expect(shoppingRow(page, 'Zitronen')).toHaveCount(1);
  });

  test('ein zweites Geraet mit demselben Link sieht dieselben Daten', async ({ page, browser }) => {
    const space = newSpace('sync');
    await openSpace(page, space);
    await goToTab(page, 'Einkaufsliste');
    await page.getByLabel('Zutat zur Einkaufsliste hinzufügen').fill('2 Avocados');
    await page.getByRole('button', { name: 'Hinzufügen', exact: true }).click();
    await waitForSync(page);

    // Zweiter Browser-Kontext = zweites Geraet, eigener lokaler Speicher.
    const second = await browser.newContext();
    const other = await second.newPage();
    await other.goto(`/s/${space}`);
    await goToTab(other, 'Einkaufsliste');
    await expect(shoppingRow(other, 'Avocados')).toHaveCount(1);

    // Aenderung auf dem zweiten Geraet kommt beim ersten an.
    await other.getByLabel('Zutat zur Einkaufsliste hinzufügen').fill('1 Baguette');
    await other.getByRole('button', { name: 'Hinzufügen', exact: true }).click();
    await waitForSync(other);

    await expect(shoppingRow(page, 'Baguette')).toHaveCount(1, { timeout: 25_000 });
    await second.close();
  });

  test('der Einstellungsdialog zeigt den teilbaren Link', async ({ page }) => {
    const space = newSpace('settings');
    await openSpace(page, space);
    await page.getByRole('button', { name: 'Einstellungen und Synchronisation' }).click();
    await expect(page.getByRole('dialog').getByText(`/s/${space}`)).toBeVisible();
  });
});
