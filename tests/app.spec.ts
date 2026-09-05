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

  test.describe('Vorspann und Abschluss', () => {
    // Ohne Bewegungsreduktion laufen die beiden kurzen Braeter-Animationen.
    test.use({ contextOptions: { reducedMotion: 'no-preference' } });

    test('der Vorspann erscheint kurz und verschwindet von selbst', async ({ page }) => {
      await openSpace(page, newSpace('vorspann'));

      await page.getByRole('button', { name: 'Rezept Poulet mit Brokkoli und Reis öffnen' }).click();
      await page.getByRole('dialog').getByRole('button', { name: 'Start Cooking' }).click();

      const vorspann = page.locator('.cookanim');
      await expect(vorspann).toBeVisible();
      // Hoechstens zwei Sekunden – danach steht der erste Schritt bereit.
      await expect(vorspann).toHaveCount(0, { timeout: 2500 });
      await expect(page.getByRole('button', { name: 'Timer starten' })).toBeEnabled();
    });

    test('ein Tippen überspringt den Vorspann sofort', async ({ page }) => {
      await openSpace(page, newSpace('vorspannskip'));

      await page.getByRole('button', { name: 'Rezept Poulet mit Brokkoli und Reis öffnen' }).click();
      await page.getByRole('dialog').getByRole('button', { name: 'Start Cooking' }).click();

      await page.locator('.cookanim').click();
      await expect(page.locator('.cookanim')).toHaveCount(0, { timeout: 1000 });
    });

    test('zum Start wird geruehrt, am Schluss hebt sich der Deckel', async ({ page }) => {
      await openSpace(page, newSpace('abschluss'));

      await page.getByRole('button', { name: 'Rezept Poulet mit Brokkoli und Reis öffnen' }).click();
      await page.getByRole('dialog').getByRole('button', { name: 'Start Cooking' }).click();

      // Zum Start steht der Topf offen da und der Loeffel ruehrt.
      await expect(page.locator('.cookanim--start .cookanim__loeffel')).toBeVisible();
      await expect(page.locator('.cookanim--start .cookanim__deckel')).toHaveCount(0);
      await expect(page.locator('.cookanim')).toHaveCount(0, { timeout: 2500 });

      // Durch bis zum letzten Schritt.
      for (let i = 0; i < 6; i += 1) {
        await page.getByRole('button', { name: 'Weiter' }).click();
      }
      await expect(page.getByText('Schritt 7 von 7')).toBeVisible();

      // Erst jetzt der fertige Topf mit Deckel und Dampf.
      await page.getByRole('button', { name: 'Fertig gekocht' }).click();
      await expect(page.locator('.cookanim--fertig .cookanim__deckel')).toBeVisible();
      await expect(page.locator('.cookanim--fertig .cookanim__loeffel')).toHaveCount(0);

      // Danach schliesst der Kochmodus von selbst.
      await expect(page.locator('.cook')).toHaveCount(0, { timeout: 2500 });
      await expect(page.getByRole('dialog')).toBeVisible();
    });
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

  test('Suche und Cook-Next-Filter greifen', async ({ page }) => {
    await openSpace(page, newSpace('search'));

    await page.getByPlaceholder('Rezept oder Zutat suchen').fill('shakshuka');
    await expect(page.getByRole('button', { name: 'Rezept Shakshuka öffnen' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Rezept Tomatensuppe mit Basilikum öffnen' })).toHaveCount(0);

    // Auch Zutaten sind durchsuchbar.
    await page.getByPlaceholder('Rezept oder Zutat suchen').fill('kokosmilch');
    await expect(page.getByRole('button', { name: 'Rezept Rotes Linsencurry öffnen' })).toBeVisible();

    await page.getByRole('button', { name: 'Suche löschen' }).click();

    await page.getByRole('button', { name: 'Shakshuka zu Cook Next hinzufügen' }).click();
    await page
      .getByRole('group', { name: 'Rezepte filtern' })
      .getByRole('button', { name: 'Cook Next' })
      .click();
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

test.describe('Cook Next', () => {
  test('ein geplantes Rezept legt seine Zutaten auf die Liste und nimmt sie zurueck', async ({
    page,
  }) => {
    await openSpace(page, newSpace('plan'));

    await page.getByRole('button', { name: 'Shakshuka zu Cook Next hinzufügen' }).click();

    await goToTab(page, 'Einkaufsliste');
    // Die Vorschau zeigt, wofuer die Liste da ist.
    await expect(page.locator('.plannedstrip')).toContainText('Shakshuka');
    await expect(shoppingRow(page, 'Eier')).toBeVisible();
    await expect(shoppingRow(page, 'Pelati')).toBeVisible();

    // Abwaehlen raeumt genau diese Zutaten wieder weg.
    await goToTab(page, 'Rezepte');
    await page.getByRole('button', { name: 'Shakshuka aus Cook Next entfernen' }).click();

    await goToTab(page, 'Einkaufsliste');
    await expect(page.locator('.plannedstrip')).toHaveCount(0);
    await expect(shoppingRow(page, 'Eier')).toHaveCount(0);
    await expect(shoppingRow(page, 'Pelati')).toHaveCount(0);
  });

  test('von Hand Eingetragenes ueberlebt das Abwaehlen', async ({ page }) => {
    await openSpace(page, newSpace('planmanuell'));

    // Erst von Hand, dann zusaetzlich geplant: die Mengen summieren sich.
    await goToTab(page, 'Einkaufsliste');
    await page.getByPlaceholder('z. B. 400 g Poulet').fill('4 Eier');
    await page.getByRole('button', { name: 'Hinzufügen', exact: true }).click();
    await expect(shoppingRow(page, 'Eier')).toContainText('4');

    await goToTab(page, 'Rezepte');
    await page.getByRole('button', { name: 'Shakshuka zu Cook Next hinzufügen' }).click();
    await goToTab(page, 'Einkaufsliste');
    await expect(shoppingRow(page, 'Eier')).toContainText('8');

    // Nach dem Abwaehlen bleiben die eigenen vier stehen.
    await goToTab(page, 'Rezepte');
    await page.getByRole('button', { name: 'Shakshuka aus Cook Next entfernen' }).click();
    await goToTab(page, 'Einkaufsliste');
    await expect(shoppingRow(page, 'Eier')).toContainText('4');
  });

  test('zwei geplante Rezepte teilen sich eine Zutat, ohne sich zu stoeren', async ({ page }) => {
    await openSpace(page, newSpace('planzwei'));

    await page.getByRole('button', { name: 'Shakshuka zu Cook Next hinzufügen' }).click();
    await page
      .getByRole('button', { name: 'Tomatensuppe mit Basilikum zu Cook Next hinzufügen' })
      .click();

    await goToTab(page, 'Einkaufsliste');
    await expect(shoppingRow(page, 'Pelati')).toBeVisible();
    const zusammen = await shoppingRow(page, 'Pelati').innerText();

    // Eines abwaehlen: die Zutat bleibt, nur der Anteil geht weg.
    await goToTab(page, 'Rezepte');
    await page.getByRole('button', { name: 'Shakshuka aus Cook Next entfernen' }).click();
    await goToTab(page, 'Einkaufsliste');
    await expect(shoppingRow(page, 'Pelati')).toBeVisible();
    expect(await shoppingRow(page, 'Pelati').innerText()).not.toBe(zusammen);

    // Auch das zweite abwaehlen: jetzt ist die Zeile weg.
    await goToTab(page, 'Rezepte');
    await page
      .getByRole('button', { name: 'Tomatensuppe mit Basilikum aus Cook Next entfernen' })
      .click();
    await goToTab(page, 'Einkaufsliste');
    await expect(shoppingRow(page, 'Pelati')).toHaveCount(0);
  });

  test('Gericht und Rezept bleiben im Gleichschritt', async ({ page }) => {
    await openSpace(page, newSpace('plangericht'));

    await goToTab(page, 'Gerichte');
    await page.getByRole('button', { name: 'Shakshuka zu Cook Next hinzufügen' }).click();

    // Das verknuepfte Rezept ist damit ebenfalls geplant.
    await goToTab(page, 'Rezepte');
    await expect(
      page.getByRole('button', { name: 'Shakshuka aus Cook Next entfernen' }),
    ).toBeVisible();

    await goToTab(page, 'Einkaufsliste');
    await expect(shoppingRow(page, 'Eier')).toBeVisible();

    // Und zurueck: ueber das Rezept abwaehlen raeumt auch das Gericht ab.
    await goToTab(page, 'Rezepte');
    await page.getByRole('button', { name: 'Shakshuka aus Cook Next entfernen' }).click();
    await goToTab(page, 'Gerichte');
    await expect(
      page.getByRole('button', { name: 'Shakshuka zu Cook Next hinzufügen' }),
    ).toBeVisible();
    await goToTab(page, 'Einkaufsliste');
    await expect(shoppingRow(page, 'Eier')).toHaveCount(0);
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

test.describe('Kühlschrankfoto', () => {
  /** Eine Antwort, wie sie die Auswertung liefert. */
  const antwort = {
    ok: true,
    lebensmittel: ['Poulet', 'Brokkoli', 'Reis', 'Zitrone'],
    ideen: [
      {
        name: 'Zitronen-Poulet aus der Pfanne',
        kategorie: 'High-Protein',
        portionen: 2,
        zeitMin: 25,
        zutaten: [
          { name: 'Poulet', menge: 400, einheit: 'g' },
          { name: 'Zitrone', menge: 1, einheit: 'Stück' },
          { name: 'Crème fraîche', menge: 100, einheit: 'g' },
        ],
        schritte: [
          { text: 'Poulet in Streifen schneiden und anbraten.', minuten: 6 },
          { text: 'Mit Zitronensaft ablöschen und Crème fraîche einrühren.', minuten: 0 },
        ],
        fehlt: ['Crème fraîche'],
      },
    ],
  };

  /** Ein winziges gültiges JPEG als Kameraaufnahme. */
  const foto = {
    name: 'kuehlschrank.jpg',
    mimeType: 'image/jpeg',
    buffer: Buffer.from(
      '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0a' +
        'HBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAA' +
        'AAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==',
      'base64',
    ),
  };

  test('erkennt Lebensmittel, findet eigene Rezepte und speichert eine Idee', async ({ page }) => {
    await openSpace(page, newSpace('foto'));

    await page.route('**/api/vision', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(antwort) }),
    );

    await page.getByRole('button', { name: 'Foto vom Kühlschrank aufnehmen' }).click();
    const blatt = page.getByRole('dialog');
    await expect(blatt.getByRole('button', { name: 'Foto aufnehmen' })).toBeVisible();

    await page.setInputFiles('input[type="file"]', foto);

    // Erkannte Lebensmittel
    await expect(blatt.getByText('Erkannt')).toBeVisible();
    for (const name of antwort.lebensmittel) {
      await expect(blatt.getByText(name, { exact: true }).first()).toBeVisible();
    }

    // Eigene Rezepte werden lokal zugeordnet, nicht vom Modell geraten.
    await expect(blatt.getByText('Aus deinen Rezepten')).toBeVisible();
    await expect(blatt.getByRole('button', { name: /Poulet mit Brokkoli und Reis/ })).toBeVisible();

    // Neue Idee aufklappen und speichern
    await blatt.getByRole('button', { name: /Zitronen-Poulet aus der Pfanne/ }).click();
    await expect(blatt.getByText('Poulet in Streifen schneiden und anbraten.')).toBeVisible();
    await blatt.getByRole('button', { name: 'Als Rezept speichern' }).click();
    await expect(page.getByText('„Zitronen-Poulet aus der Pfanne“ gespeichert')).toBeVisible();

    await blatt.getByRole('button', { name: 'Schliessen' }).click();
    await expect(page.getByText('13 Rezepte gespeichert')).toBeVisible();

    // Die gespeicherte Idee ist ein vollwertiges Rezept samt Timer.
    await page.getByRole('button', { name: 'Rezept Zitronen-Poulet aus der Pfanne öffnen' }).click();
    const detail = page.getByRole('dialog');
    await expect(detail.getByText('400 g')).toBeVisible();
    await expect(detail.getByText('06:00')).toBeVisible();
    await expect(detail.getByRole('button', { name: 'Start Cooking' })).toBeEnabled();
  });

  test('fehlende Zutaten wandern auf die Einkaufsliste', async ({ page }) => {
    await openSpace(page, newSpace('fotoliste'));
    await page.route('**/api/vision', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(antwort) }),
    );

    await page.getByRole('button', { name: 'Foto vom Kühlschrank aufnehmen' }).click();
    await page.setInputFiles('input[type="file"]', foto);
    await page.getByRole('dialog').getByRole('button', { name: 'Fehlendes einkaufen' }).click();
    await expect(page.getByText('1 Zutat zur Einkaufsliste')).toBeVisible();

    await page.getByRole('dialog').getByRole('button', { name: 'Schliessen' }).click();
    await goToTab(page, 'Einkaufsliste');
    await expect(shoppingRow(page, 'Crème fraîche')).toHaveCount(1);
  });

  test('ohne eingerichteten Schlüssel sagt die App das deutlich', async ({ page }) => {
    await openSpace(page, newSpace('fotokeykey'));
    await page.route('**/api/status', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, storage: 'postgres', cloud: true, reachable: true, vision: false }),
      }),
    );

    await page.getByRole('button', { name: 'Foto vom Kühlschrank aufnehmen' }).click();
    const blatt = page.getByRole('dialog');
    await expect(blatt.getByText('Bilderkennung nicht eingerichtet.')).toBeVisible();
    await expect(blatt.getByRole('button', { name: 'Foto aufnehmen' })).toBeDisabled();
  });

  test('ein Fehler bei der Auswertung ist erklärt und wiederholbar', async ({ page }) => {
    await openSpace(page, newSpace('fotofehler'));
    await page.route('**/api/vision', (route) =>
      route.fulfill({
        status: 422,
        contentType: 'application/json',
        body: JSON.stringify({ ok: false, error: 'no_result' }),
      }),
    );

    await page.getByRole('button', { name: 'Foto vom Kühlschrank aufnehmen' }).click();
    await page.setInputFiles('input[type="file"]', foto);
    const blatt = page.getByRole('dialog');
    await expect(blatt.getByText('Damit konnte ich nichts anfangen.')).toBeVisible();
    await blatt.getByRole('button', { name: 'Nochmal versuchen' }).click();
    await expect(blatt.getByRole('button', { name: 'Foto aufnehmen' })).toBeVisible();
  });

  test('ohne Schlüssel antwortet die Route selbst mit einer klaren Begründung', async ({
    request,
  }) => {
    const response = await request.post('/api/vision', { data: { image: 'data:image/jpeg;base64,AAAA' } });
    expect(response.status()).toBe(503);
    expect((await response.json()).error).toBe('no_key');
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
              cookNext: false,
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
      'Frisches Gemüse/Früchte',
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

  test('eine umbenannte Rubrik wird bei bestehenden Zutaten mitgezogen', async ({
    page,
    request,
  }) => {
    const space = newSpace('umbenannt');
    const now = Date.now();
    await request.post(`/api/space/${space}`, {
      data: {
        data: {
          recipes: {},
          dishes: {},
          shopping: {},
          pantry: {
            alt1: {
              id: 'alt1',
              name: 'Rüebli',
              amount: null,
              unit: '',
              // Der Name, den die Rubrik früher trug.
              category: 'Frisches Gemüse',
              inCart: false,
              createdAt: now,
              updatedAt: now,
            },
          },
        },
      },
    });

    await page.goto(`/s/${space}`);
    await goToTab(page, 'Einkaufsliste');

    // Keine zweite Gruppe mit dem alten Namen, die Zutat steckt in der neuen.
    await expect(page.locator('.pantrygroup__title')).toHaveText(['Frisches Gemüse/Früchte']);
    await openPantryGroup(page, 'Frisches Gemüse/Früchte');
    await expect(pantryChip(page, 'Rüebli')).toHaveCount(1);
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
