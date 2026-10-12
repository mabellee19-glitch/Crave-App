import { Page, expect } from '@playwright/test';

/** Jeder Test bekommt seinen eigenen Datenraum, damit sie sich nicht stoeren. */
export function newSpace(prefix: string): string {
  return `test-${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function openSpace(page: Page, space: string) {
  await page.goto(`/s/${space}`);
  await expect(page.getByRole('heading', { name: 'Cravings', level: 1 })).toBeVisible();
  // Warten, bis die Startinhalte geladen sind.
  await expect(page.getByRole('button', { name: /Rezept .* öffnen/ }).first()).toBeVisible();
}

export function tab(page: Page, name: 'Cravings' | 'Groceries') {
  return page.getByRole('navigation', { name: 'Hauptnavigation' }).getByRole('button', { name });
}

/** Auf dem iPhone unten, auf dem Desktop oben – beide Leisten fuehren zum Ziel. */
export async function goToTab(page: Page, name: 'Cravings' | 'Groceries') {
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

/** Sonderzeichen entschaerfen – Zutatennamen enthalten auch mal Klammern. */
function alsRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Eine Zeile der aktiven Einkaufsliste, exakt ueber den Zutatennamen. */
export function shoppingRow(page: Page, name: string) {
  return page
    .locator('.row')
    .filter({ has: page.locator('.row__name', { hasText: new RegExp(`^${alsRegex(name)}$`) }) });
}

/** Ein Chip der Grundliste, exakt ueber den Zutatennamen. */
export function pantryChip(page: Page, name: string) {
  return page.getByRole('button', { name: `${name} in Groceries` });
}

/** Die Rubriken der Grundliste sind zugeklappt – hier eine davon aufklappen. */
export async function openPantryGroup(page: Page, category: string) {
  const head = page.getByRole('button', { name: new RegExp(`^${category}`) });
  if ((await head.getAttribute('aria-expanded')) === 'false') await head.click();
}

/**
 * Den Kochmodus starten und die Vorbereitung hinter sich bringen. Seit es sie
 * gibt, steht vor Schritt 1 ein eigener Bildschirm zum Schneiden und Abmessen.
 */
export async function startCooking(page: Page) {
  await page.getByRole('dialog').getByRole('button', { name: 'Start Cooking' }).click();
  await expect(page.getByText('Erst schnibbeln und abmessen', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Los geht’s' }).click();
}

/** Über das Plus: "Rezept selbst schreiben". */
export async function neuesRezept(page: Page) {
  await page.getByRole('button', { name: 'Neu anlegen' }).click();
  await page.getByRole('dialog').getByRole('button', { name: /^Rezept selbst schreiben/ }).click();
}

/** Über das Plus: "Nur eine Idee". */
export async function neueIdee(page: Page) {
  await page.getByRole('button', { name: 'Neu anlegen' }).click();
  await page.getByRole('dialog').getByRole('button', { name: /^Nur eine Idee/ }).click();
}
