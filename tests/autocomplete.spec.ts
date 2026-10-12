import { expect, test } from '@playwright/test';
import { goToTab, neuesRezept, newSpace, openSpace, shoppingRow } from './helpers';
import { eingabeTeilen, namenVorschlagen } from '../src/lib/autocomplete';

const namen = (suche: string, sprache: 'de' | 'en' = 'de', eigene = new Map<string, number>()) =>
  namenVorschlagen(suche, sprache, eigene).map((vorschlag) => vorschlag.name);

test.describe('Vorschläge beim Tippen', () => {
  test('"bas" bietet Basilikum an, mit der üblichen Menge', () => {
    expect(namen('bas')[0]).toBe('Basilikum');
    expect(namenVorschlagen('bas', 'de', new Map())[0].menge).toEqual({ amount: 1, unit: 'Bund' });
    expect(namen('ba')).toContain('Bananen');
    // Ein Buchstabe ist noch zu wenig – und wer fertig getippt hat, braucht keine Liste.
    expect(namen('b')).toEqual([]);
    expect(namen('Basilikum')).toEqual([]);
  });

  test('ohne Umlaute und Gross/Klein', () => {
    expect(namen('rue')[0]).toBe('Rüebli');
    expect(namen('KNOB')[0]).toBe('Knoblauch');
  });

  test('was mit dem Getippten beginnt, kommt zuerst', () => {
    const tom = namen('tom');
    expect(tom[0]).toBe('Tomaten');
    // Ein einzelner eigener Eintrag drängt sich nicht vor die Grundzutat.
    expect(namen('tom', 'de', new Map([['Tomatensauce Pasta', 1]]))[0]).toBe('Tomaten');
    expect(tom.indexOf('Tomatensauce')).toBeLessThan(tom.indexOf('Cherrytomaten') === -1 ? 99 : tom.indexOf('Cherrytomaten'));
  });

  test('eigene Zutaten zuerst, die häufigsten oben', () => {
    const eigene = new Map([
      ['Basmati-Reis', 3],
      ['Bärlauch', 1],
    ]);
    expect(namen('bas', 'de', eigene)[0]).toBe('Basmati-Reis');
    expect(namen('bar', 'de', eigene)[0]).toBe('Bärlauch');
  });

  test('auf Englisch englische Namen', () => {
    expect(namen('bas', 'en')[0]).toBe('Basil');
    expect(namen('oni', 'en')[0]).toBe('Onions');
  });

  test('in der Schnelleingabe zählt nur der Name hinter Menge und Einheit', () => {
    expect(eingabeTeilen('400 g pou')).toEqual({ vorne: '400 g ', suche: 'pou' });
    expect(eingabeTeilen('2 bas')).toEqual({ vorne: '2 ', suche: 'bas' });
    expect(eingabeTeilen('2 Bund bas')).toEqual({ vorne: '2 Bund ', suche: 'bas' });
    expect(eingabeTeilen('2 Zwiebeln rot')).toEqual({ vorne: '2 ', suche: 'Zwiebeln rot' });
    expect(eingabeTeilen('Milch')).toEqual({ vorne: '', suche: 'Milch' });
  });
});

test.describe('Vorschläge in der App', () => {
  test('Beute: tippen, antippen, hinzufügen', async ({ page }) => {
    await openSpace(page, newSpace('autobeute'));
    await goToTab(page, 'Beute');
    const feld = page.getByLabel('Zutat zur Beute hinzufügen');

    await feld.fill('bas');
    await page.getByRole('option', { name: 'Basilikum', exact: true }).click();
    await expect(feld).toHaveValue('Basilikum');
    await feld.press('Enter');
    await expect(shoppingRow(page, 'Basilikum')).toHaveCount(1);

    // Menge und Einheit bleiben stehen.
    await feld.fill('2 Bund pet');
    await page.getByRole('option', { name: 'Petersilie', exact: true }).click();
    await expect(feld).toHaveValue('2 Bund Petersilie');
    await feld.press('Enter');
    await expect(shoppingRow(page, 'Petersilie')).toContainText('2 Bund');
  });

  test('mit der Tastatur: Pfeil runter, Enter nimmt, Escape schliesst', async ({ page }) => {
    await openSpace(page, newSpace('autotasten'));
    await goToTab(page, 'Beute');
    const feld = page.getByLabel('Zutat zur Beute hinzufügen');
    await feld.fill('zwi');
    await expect(page.getByRole('listbox', { name: 'Vorschläge' })).toBeVisible();
    await feld.press('ArrowDown');
    await feld.press('Enter');
    await expect(feld).toHaveValue('Zwiebeln');
    // Noch nichts abgeschickt.
    await expect(shoppingRow(page, 'Zwiebeln')).toHaveCount(0);

    await feld.fill('knob');
    await expect(page.getByRole('listbox')).toBeVisible();
    await feld.press('Escape');
    await expect(page.getByRole('listbox')).toHaveCount(0);
  });

  test('im Rezept: Name gewählt, Menge kommt mit – und Escape schliesst nur die Liste', async ({ page }) => {
    await openSpace(page, newSpace('autorezept'));
    await neuesRezept(page);
    const form = page.getByRole('dialog');
    const name = form.getByLabel('Name für Zutat 1');
    await name.fill('bas');
    await form.getByRole('option', { name: 'Basilikum', exact: true }).click();
    await expect(name).toHaveValue('Basilikum');
    await expect(form.getByLabel('Menge für Zutat 1')).toHaveValue('1');
    await expect(form.getByLabel('Einheit für Zutat 1')).toHaveValue('Bund');

    await form.getByRole('button', { name: 'Zutat hinzufügen' }).click();
    await form.getByLabel('Name für Zutat 2').fill('knob');
    await expect(form.getByRole('listbox')).toBeVisible();
    await form.getByLabel('Name für Zutat 2').press('Escape');
    await expect(form.getByRole('listbox')).toHaveCount(0);
    await expect(page.getByRole('dialog')).toBeVisible();
  });

  test('eigene Zutaten werden vorgeschlagen', async ({ page }) => {
    await openSpace(page, newSpace('autoeigen'));
    await goToTab(page, 'Beute');
    const feld = page.getByLabel('Zutat zur Beute hinzufügen');
    await feld.fill('Gochujang');
    await feld.press('Enter');
    await expect(shoppingRow(page, 'Gochujang')).toHaveCount(1);
    await feld.fill('goch');
    await expect(page.getByRole('option', { name: 'Gochujang' })).toBeVisible();
  });
});
