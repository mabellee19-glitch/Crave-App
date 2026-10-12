import { expect, test } from '@playwright/test';
import { goToTab, newSpace, openSpace } from './helpers';

/**
 * Stellen, an denen die App eingefroren wirkte: Inhalte ausserhalb des
 * Bildes, Tipps, die nirgends ankamen, eine Seite, die nicht mehr scrollte.
 */
test.describe('Kochmodus bleibt bedienbar', () => {
  // Ein iPad quer mit grosser Schrift: wenig Hoehe, auch ein Schritt scrollt.
  test.use({ viewport: { width: 1080, height: 500 } });

  test('jeder Schritt beginnt oben, auch nach einer langen Vorbereitung', async ({ page }) => {
    await openSpace(page, newSpace('kochscroll'));
    await page.getByRole('button', { name: 'Rezept Marry me Chicken Orzo öffnen' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Start Cooking' }).click();

    const flaeche = page.locator('.cook__body');
    // Bis ans Ende der Vorbereitung scrollen, wie am iPad beim Abhaken.
    await flaeche.evaluate((el) => el.scrollTo(0, el.scrollHeight));
    expect(await flaeche.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);

    await page.getByRole('button', { name: 'Los geht’s' }).click();
    // Der Schritt ist hoeher als die Flaeche – sonst prueft der Test nichts.
    expect(await flaeche.evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(true);
    await expect(page.getByText('Schritt 1 von')).toBeInViewport();
    expect(await flaeche.evaluate((el) => el.scrollTop)).toBe(0);

    // Auch wer in einem Schritt nach unten scrollt, beginnt den naechsten oben.
    await flaeche.evaluate((el) => el.scrollTo(0, el.scrollHeight));
    await page.getByRole('button', { name: /^Weiter/ }).click();
    await expect(page.getByText('Schritt 2 von')).toBeInViewport();
    expect(await flaeche.evaluate((el) => el.scrollTop)).toBe(0);
  });
});

test.describe('Ebenen bleiben stehen', () => {
  test('nach dem Kochen steht das Rezept so da, wie man es verlassen hat', async ({ page }) => {
    await openSpace(page, newSpace('ebenen'));
    await page.getByRole('button', { name: 'Rezept Poulet mit Brokkoli und Reis öffnen' }).click();
    const detail = page.getByRole('dialog');
    await detail.getByRole('button', { name: 'Eine Portion mehr' }).click();
    await expect(detail.locator('.stepper__value')).toHaveText('3 Portionen');

    await detail.getByRole('button', { name: 'Start Cooking' }).click();
    await page.getByRole('button', { name: 'Kochmodus beenden' }).click();
    await expect(page.locator('.cook')).toHaveCount(0);
    // Vorher wurde das Rezept neu aufgebaut: wieder 2 Portionen.
    await expect(page.getByRole('dialog').locator('.stepper__value')).toHaveText('3 Portionen');
  });

  test('Escape schliesst nur die oberste Ebene', async ({ page }) => {
    await openSpace(page, newSpace('escape'));
    await page.getByRole('button', { name: 'Rezept Shakshuka öffnen' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Rezept bearbeiten' }).click();
    await expect(page.getByRole('dialog', { name: 'Rezept bearbeiten' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: 'Rezept bearbeiten' })).toHaveCount(0);
    await expect(page.getByRole('dialog', { name: 'Shakshuka' })).toBeVisible();
  });

  test('ein Tipp neben das Blatt schliesst es', async ({ page }) => {
    await openSpace(page, newSpace('daneben'));
    await page.getByRole('button', { name: 'Neu anlegen' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    // Ganz oben links liegt nur der abgedunkelte Hintergrund.
    await page.mouse.click(8, 8);
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });

  test('ein Rezept aus den Foto-Ergebnissen bleibt offen', async ({ page }) => {
    await openSpace(page, newSpace('fotorezept'));
    await page.route('**/api/vision', (route) =>
      route.fulfill({ json: { ok: true, lebensmittel: ['Poulet', 'Brokkoli', 'Reis'], ideen: [] } }),
    );
    await page.getByRole('button', { name: 'Foto vom Kühlschrank aufnehmen' }).click();
    await page.setInputFiles('input[type="file"]', {
      name: 'k.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from(
        '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0a' +
          'HBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAA' +
          'AAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==',
        'base64',
      ),
    });
    await page.getByRole('dialog').getByRole('button', { name: /Poulet mit Brokkoli und Reis/ }).click();
    await expect(page.getByRole('dialog', { name: 'Poulet mit Brokkoli und Reis' })).toBeVisible();
    await page.waitForTimeout(500);
    // Vorher klappte es gleich wieder zu.
    await expect(page.getByRole('dialog', { name: 'Poulet mit Brokkoli und Reis' })).toBeVisible();
  });
});

test.describe('Kochmodus gegen Doppeltipps', () => {
  test('ein Doppeltipp auf "Weiter" beendet das Kochen nicht', async ({ page }) => {
    await openSpace(page, newSpace('doppeltipp'));
    await page.getByRole('button', { name: 'Rezept Poulet mit Brokkoli und Reis öffnen' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Start Cooking' }).click();
    await page.getByRole('button', { name: 'Los geht’s' }).click();
    for (let i = 0; i < 3; i++) await page.getByRole('button', { name: /^Weiter/ }).click();
    await expect(page.getByText('Schritt 4 von 5')).toBeVisible();

    // Zweimal schnell an dieselbe Stelle: der zweite Tipp trifft "Fertig gekocht".
    const box = (await page.getByRole('button', { name: /^Weiter/ }).boundingBox())!;
    await page.mouse.dblclick(box.x + box.width / 2, box.y + box.height / 2);
    await expect(page.getByText('Schritt 5 von 5')).toBeVisible();
    await page.waitForTimeout(400);
    await expect(page.locator('.cook')).toHaveCount(1);
  });
});

test.describe('Bereiche und Meldungen', () => {
  test('jeder Bereich behält seine Scrollposition und seine Suche', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 700 });
    await openSpace(page, newSpace('bereiche'));
    await page.getByPlaceholder(/Gericht oder Zutat/).fill('o');
    await page.mouse.wheel(0, 900);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(300);
    const essenPosition = await page.evaluate(() => window.scrollY);

    await page.getByRole('navigation', { name: 'Hauptnavigation' }).getByRole('button', { name: 'Groceries' }).click();
    // Die Einkaufsliste beginnt oben, mit Ueberschrift und Eingabefeld.
    expect(await page.evaluate(() => window.scrollY)).toBe(0);

    await page.getByRole('navigation', { name: 'Hauptnavigation' }).getByRole('button', { name: 'Cravings' }).click();
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(essenPosition);
    await expect(page.getByPlaceholder(/Gericht oder Zutat/)).toHaveValue('o');
  });

  test('ein Rezept aus Groceries führt zurück zu Groceries', async ({ page }) => {
    await openSpace(page, newSpace('vonliste'));
    await page.getByRole('button', { name: /Shakshuka zu Cook Next/ }).first().click();
    await goToTab(page, 'Groceries');
    await page.locator('.chip--plan', { hasText: 'Shakshuka' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Schliessen' }).click();
    // Vorher sprang die App dabei in den Bereich "Essen".
    await expect(page.locator('#shopping-heading')).toBeVisible();
  });

  test('die Meldung unten fängt keine Tipps ab und geht von selbst', async ({ page }) => {
    await openSpace(page, newSpace('meldung'));
    await goToTab(page, 'Groceries');
    const feld = page.getByLabel('Zutat zu Groceries hinzufügen');
    await feld.fill('Milch');
    await feld.press('Enter');
    await expect(page.locator('.toast')).toBeVisible();
    const durch = await page.evaluate(() => {
      const toast = document.querySelector('.toast')!.getBoundingClientRect();
      const darunter = document.elementFromPoint(toast.left + 4, toast.top + toast.height / 2);
      return !darunter?.closest('.toast');
    });
    expect(durch).toBe(true);
    // Auch wenn die App zwischendurch neu zeichnet, geht die Meldung nach gut 5 s.
    await feld.fill('Butter');
    await expect(page.locator('.toast')).toHaveCount(0, { timeout: 7000 });
  });
});

test.describe('Abgleich im Hintergrund', () => {
  test('ohne Änderung holt die Abfrage nur die Versionsnummer', async ({ page }) => {
    await openSpace(page, newSpace('version'));
    await expect(page.getByText('Alles synchronisiert').first()).toBeVisible({ timeout: 20_000 });

    const antworten: Array<{ url: string; body: Record<string, unknown> }> = [];
    page.on('response', async (response) => {
      if (response.request().method() === 'GET' && response.url().includes('/api/space/')) {
        antworten.push({ url: response.url(), body: await response.json().catch(() => ({})) });
      }
    });

    await page.getByRole('button', { name: 'Einstellungen und Synchronisation' }).click();
    await page.getByRole('dialog').getByRole('button', { name: /Jetzt abgleichen/ }).click();
    await expect.poll(() => antworten.length).toBeGreaterThan(0);
    expect(antworten[0].url).toContain('?v=');
    expect(antworten[0].body).toMatchObject({ ok: true, unchanged: true });
    expect(antworten[0].body.data).toBeUndefined();
  });
});
