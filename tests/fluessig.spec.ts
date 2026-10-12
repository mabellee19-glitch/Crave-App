import { expect, test } from '@playwright/test';
import { newSpace, openSpace } from './helpers';

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
