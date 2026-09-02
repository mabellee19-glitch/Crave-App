import { Page, expect } from '@playwright/test';

/** Jeder Test bekommt seinen eigenen Datenraum, damit sie sich nicht stoeren. */
export function newSpace(prefix: string): string {
  return `test-${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function openSpace(page: Page, space: string) {
  await page.goto(`/s/${space}`);
  await expect(page.getByRole('heading', { name: 'Rezepte', level: 1 })).toBeVisible();
  // Warten, bis die Startinhalte geladen sind.
  await expect(page.getByRole('button', { name: /Rezept .* öffnen/ }).first()).toBeVisible();
}

export function tab(page: Page, name: 'Rezepte' | 'Gerichte' | 'Einkaufsliste') {
  return page.getByRole('navigation', { name: 'Hauptnavigation' }).getByRole('button', { name });
}

/** Auf dem iPhone unten, auf dem Desktop oben – beide Leisten fuehren zum Ziel. */
export async function goToTab(page: Page, name: 'Rezepte' | 'Gerichte' | 'Einkaufsliste') {
  const mobile = tab(page, name);
  if (await mobile.isVisible()) {
    await mobile.click();
    return;
  }
  await page.getByRole('navigation', { name: 'Bereiche' }).getByRole('button', { name }).click();
}

/** Wartet, bis der Server den lokalen Stand bestaetigt hat. */
export async function waitForSync(page: Page) {
  await expect(page.getByText('Alles synchronisiert').first()).toBeVisible({ timeout: 20_000 });
}

/** Eine Zeile der aktiven Einkaufsliste, exakt ueber den Zutatennamen. */
export function shoppingRow(page: Page, name: string) {
  return page
    .locator('.row')
    .filter({ has: page.locator('.row__name', { hasText: new RegExp(`^${name}$`) }) });
}

/** Ein Chip der Grundliste, exakt ueber den Zutatennamen. */
export function pantryChip(page: Page, name: string) {
  return page.getByRole('button', { name: `${name} in die Einkaufsliste` });
}
