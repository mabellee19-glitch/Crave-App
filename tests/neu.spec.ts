import { expect, test } from '@playwright/test';
import { neuesRezept, newSpace, openSpace, startCooking, waitForSync } from './helpers';
import { buildSeedData, SCHRITTE_VOR_DER_VORBEREITUNG } from '../src/lib/seed';
import { kategorieErkennen } from '../src/lib/category';
import { animationsMotiv } from '../src/lib/kochAnimation';
import { schrittSignatur, vorbereitungAusText, vorbereitungVorschlagen } from '../src/lib/prep';
import { zutatenFuerSchritt, zutatenProSchritt } from '../src/lib/stepIngredients';

/**
 * Die Schritte von "Poulet mit Brokkoli und Reis", wie sie vor der
 * Vorbereitung ausgeliefert wurden. So steht das Rezept in jedem Datenraum,
 * der es nie angefasst hat.
 */
const POULET_ALT = (
  [
    ['Reis kalt abspülen, mit der doppelten Menge Wasser und etwas Salz aufsetzen und zugedeckt köcheln lassen.', 900],
    ['Poulet in mundgerechte Streifen schneiden, salzen und pfeffern. Knoblauch fein hacken.', null],
    ['Brokkoli in Röschen teilen und den Strunk schälen und in Scheiben schneiden.', null],
    ['Olivenöl in einer grossen Pfanne erhitzen. Poulet bei mittlerer Hitze anbraten, bis es rundum goldbraun ist.', 300],
    ['Knoblauch dazugeben und kurz mitbraten, bis er duftet.', 60],
    ['Brokkoli zugeben, Sojasauce und Honig darüber giessen und alles zugedeckt garen, bis der Brokkoli bissfest ist.', 360],
    ['Mit Reis anrichten, abschmecken und sofort servieren.', null],
  ] as Array<[string, number | null]>
).map(([text, durationSec], index) => ({ id: `alt-s-${index}`, text, durationSec }));

function rezept(id: string, name: string, steps: Array<{ id: string; text: string; durationSec: unknown }>, extra = {}) {
  const now = Date.now();
  return {
    id,
    name,
    category: 'High-Protein',
    servings: 2,
    timeMin: 30,
    ingredients: [{ id: `${id}-z1`, name: 'Poulet', amount: 400, unit: 'g' }],
    steps,
    cookNext: false,
    notes: '',
    createdAt: now,
    updatedAt: now,
    ...extra,
  };
}

/* -------------------------------------------------------------------------- */
/* Reine Funktionen                                                            */
/* -------------------------------------------------------------------------- */

test.describe('Kategorie aus den Zutaten', () => {
  test('trifft bei allen mitgelieferten Rezepten die vergebene Kategorie', () => {
    for (const recipe of Object.values(buildSeedData().recipes)) {
      expect(kategorieErkennen(recipe)?.kategorie, recipe.name).toBe(recipe.category);
    }
  });

  test('erkennt Dessert, Tofu und englische Zutaten', () => {
    const z = (name: string, amount: number | null = null, unit = '') => ({ name, amount, unit });
    expect(
      kategorieErkennen({
        name: 'Schokoladenkuchen',
        servings: 8,
        ingredients: [z('Mehl', 200, 'g'), z('Zucker', 150, 'g'), z('Schokolade', 100, 'g')],
      })?.kategorie,
    ).toBe('Dessert');
    expect(
      kategorieErkennen({ name: 'Bowl', servings: 2, ingredients: [z('Tofu', 300, 'g'), z('Reis', 150, 'g')] })
        ?.kategorie,
    ).toBe('High-Protein');
    expect(
      kategorieErkennen({
        name: 'Curry',
        servings: 4,
        ingredients: [z('chicken breast', 600, 'g'), z('Kokosmilch', 400, 'ml')],
      })?.kategorie,
    ).toBe('High-Protein');
    // Huehnerbruehe macht noch kein Fleischgericht.
    expect(
      kategorieErkennen({
        name: 'Linsen',
        servings: 4,
        ingredients: [z('Rote Linsen', 300, 'g'), z('Hühnerbrühe', 500, 'ml')],
      })?.kategorie,
    ).toBe('Vegi');
    expect(kategorieErkennen({ name: '', servings: 2, ingredients: [] })).toBeNull();
  });
});

test.describe('Vorbereitung aus Zutaten und Schritten', () => {
  test('liest Schneidearbeiten aus den Schritten, ohne Kochschritte mitzunehmen', () => {
    const prep = vorbereitungVorschlagen({
      ingredients: [
        { name: 'Zwiebeln (fein gehackt)' },
        { name: 'Knoblauch (fein gehackt)' },
        { name: 'Weisse Bohnen (Cannellini), abgetropft' },
      ],
      steps: [
        { text: 'Olivenöl erhitzen. Zucchini würfeln und unter Rühren braten.' },
        { text: 'Cherrytomaten halbieren, mit der Bouillon dazugeben und aufkochen.' },
        { text: 'Zwiebeln, Peperoni und Knoblauch in feine Streifen bzw. Würfel schneiden.' },
        { text: 'Pasta kochen und abgiessen.' },
      ],
    });
    expect(prep).toEqual([
      'Zwiebeln und Knoblauch fein hacken',
      'Weisse Bohnen abtropfen lassen',
      'Zucchini würfeln',
      'Cherrytomaten halbieren',
      'Zwiebeln, Peperoni und Knoblauch in feine Streifen bzw. Würfel schneiden',
    ]);
  });

  test('eine Aufgabe pro Zeile, Aufzaehlungszeichen fallen weg', () => {
    expect(vorbereitungAusText('- Zwiebel hacken\n\n• Zucchini würfeln\n2. Feta zerbröseln\n')).toEqual([
      'Zwiebel hacken',
      'Zucchini würfeln',
      'Feta zerbröseln',
    ]);
  });

  test('der Fingerabdruck erkennt die alten Schritte wieder', () => {
    expect(SCHRITTE_VOR_DER_VORBEREITUNG['seed-r-poulet-brokkoli']).toContain(schrittSignatur(POULET_ALT));
    // Schon ein geaendertes Wort ist ein anderer Stand.
    const geaendert = POULET_ALT.map((step, i) => (i === 0 ? { ...step, text: `${step.text} Gut!` } : step));
    expect(SCHRITTE_VOR_DER_VORBEREITUNG['seed-r-poulet-brokkoli']).not.toContain(schrittSignatur(geaendert));
  });
});

test.describe('Zutaten pro Schritt', () => {
  const rezepte = buildSeedData().recipes;
  const namen = (liste: Array<{ name: string }>) => liste.map((zutat) => zutat.name);

  test('nur was im Schritt vorkommt, in der Reihenfolge der Zutatenliste', () => {
    const poulet = rezepte['seed-r-poulet-brokkoli'];
    const proSchritt = zutatenProSchritt(poulet.steps, poulet.ingredients).map(namen);
    expect(proSchritt[1]).toEqual(['Poulet', 'Olivenöl']);
    expect(proSchritt[3]).toEqual(['Brokkoli', 'Sojasauce', 'Honig']);
  });

  test('Wortformen und Zusammensetzungen werden erkannt', () => {
    const z = (name: string) => ({ id: name, name, amount: null, unit: '' });
    const zutaten = [z('Hähnchenbrust'), z('Gemüsebouillon'), z('Zwiebeln'), z('Salz'), z('Eier'), z('Reis')];
    expect(
      namen(zutatenFuerSchritt('Hähnchen anbraten, Zwiebel dazu, mit Bouillon ablöschen und salzen.', zutaten)),
    ).toEqual(['Hähnchenbrust', 'Gemüsebouillon', 'Zwiebeln', 'Salz']);
    // "ein" ist kein Ei.
    expect(namen(zutatenFuerSchritt('Ein Ei hineingeben.', zutaten))).toEqual(['Eier']);
  });

  test('gleichnamige Zutaten werden nach ihrem Zweck getrennt', () => {
    const burger = rezepte['seed-r-halloumiburger'];
    const proSchritt = zutatenProSchritt(burger.steps, burger.ingredients).map(namen);
    const oele = (liste: string[]) => liste.filter((name) => name.startsWith('Pflanzenöl'));
    expect(oele(proSchritt[0])).toEqual(['Pflanzenöl (für die Marinade)']);
    // Schritt 2 laesst nur marinieren.
    expect(oele(proSchritt[1])).toEqual([]);
    expect(oele(proSchritt[2])).toEqual(['Pflanzenöl (zum Braten)']);
    expect(oele(proSchritt[4])).toEqual(['Pflanzenöl (für die Sauce)']);
  });

  test('Sammelwörter holen ihre Gruppe, die Garnitur kommt zum Schluss', () => {
    const dal = rezepte['seed-r-rotes-linsen-dal'];
    const proSchritt = zutatenProSchritt(dal.steps, dal.ingredients).map(namen);
    expect(proSchritt[2]).toEqual([
      'Kurkuma',
      'Korianderpulver',
      'Kreuzkümmel',
      'Paprikapulver',
      'Garam Masala oder Currypulver',
    ]);
    expect(proSchritt[proSchritt.length - 1]).toContain('Reis (zum Servieren)');
  });
});

/* -------------------------------------------------------------------------- */
/* In der App                                                                  */
/* -------------------------------------------------------------------------- */

test.describe('Schneller Start', () => {
  test('mit gespeichertem Stand ist die App sofort da, auch wenn der Server trödelt', async ({
    page,
  }) => {
    const space = newSpace('schnell');
    await openSpace(page, space);
    await waitForSync(page);

    // Der Server braucht jetzt vier Sekunden – wie eine aufwachende Datenbank.
    await page.route('**/api/space/**', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 4000));
      // Endet der Test vorher, ist die Seite schon zu – das ist hier egal.
      await route.continue().catch(() => undefined);
    });

    const start = Date.now();
    await page.reload();
    await expect(page.getByRole('button', { name: /Rezept .* öffnen/ }).first()).toBeVisible({
      timeout: 2500,
    });
    expect(Date.now() - start).toBeLessThan(3500);
  });
});

test.describe('Zutaten im Kochmodus', () => {
  test('jeder Schritt zeigt unten nur seine Zutaten, mit Mengen für die Portionen', async ({
    page,
  }) => {
    await openSpace(page, newSpace('schrittzutaten'));
    await page.getByRole('button', { name: 'Rezept Poulet mit Brokkoli und Reis öffnen' }).click();

    // Auch in der Rezeptansicht steht es unter dem Schritt.
    await expect(page.getByRole('dialog').locator('.step__zutaten').first()).toHaveText('200 g Reis · Salz');

    await startCooking(page);
    const zutaten = page.getByRole('region', { name: 'Zutaten für diesen Schritt' });
    await expect(zutaten.locator('li')).toHaveText(['200 gReis', 'Salz']);

    await page.getByRole('button', { name: 'Weiter' }).click();
    await expect(page.getByText('Schritt 2 von 5')).toBeVisible();
    await expect(zutaten.locator('li')).toHaveText(['400 gPoulet', '2 ELOlivenöl']);
    await expect(zutaten).not.toContainText('Brokkoli');
  });
});

test.describe('Vorbereitung in bestehenden Rezepten', () => {
  test('ein unverändertes Startrezept bekommt Vorbereitung und die neuen Schritte', async ({
    page,
    request,
  }) => {
    const space = newSpace('prepalt');
    await request.post(`/api/space/${space}`, {
      data: {
        data: {
          recipes: {
            'seed-r-poulet-brokkoli': rezept('seed-r-poulet-brokkoli', 'Poulet mit Brokkoli und Reis', POULET_ALT),
          },
          dishes: {},
          shopping: {},
          pantry: {},
        },
      },
    });

    await page.goto(`/s/${space}`);
    await page.getByRole('button', { name: 'Rezept Poulet mit Brokkoli und Reis öffnen' }).click();
    const detail = page.getByRole('dialog');
    await expect(detail.getByText('Vorbereitung + 5 Schritte')).toBeVisible();
    await expect(detail.getByText('Reis in einem Sieb kalt abspülen')).toBeVisible();
    // Das Schneiden steht nicht mehr in den Kochschritten.
    await expect(detail.getByText('Poulet in mundgerechte Streifen schneiden, salzen und pfeffern. Knoblauch fein hacken.')).toHaveCount(0);
  });

  test('eigene Schritte bleiben, die Vorbereitung kommt dazu', async ({ page, request }) => {
    const space = newSpace('prepeigen');
    const eigene = [
      { id: 'e1', text: 'Zwiebel fein hacken und in Butter glasig dünsten.', durationSec: null },
      { id: 'e2', text: 'Mit Weisswein ablöschen.', durationSec: null },
    ];
    // Ein Startrezept, an dessen Schritten jemand gearbeitet hat.
    const bearbeitet = POULET_ALT.map((step, i) =>
      i === 6 ? { ...step, text: 'Mit Reis und viel Sojasauce servieren.' } : step,
    );
    await request.post(`/api/space/${space}`, {
      data: {
        data: {
          recipes: {
            eigen: rezept('eigen', 'Mein Risotto', eigene, { category: 'Comfort' }),
            'seed-r-poulet-brokkoli': rezept('seed-r-poulet-brokkoli', 'Poulet mit Brokkoli und Reis', bearbeitet),
            geloescht: rezept('geloescht', 'Ohne Vorbereitung', eigene, { prep: [] }),
          },
          dishes: {},
          shopping: {},
          pantry: {},
        },
      },
    });

    await page.goto(`/s/${space}`);

    // Eigenes Rezept: Vorbereitung aus dem Text, Schritte unveraendert.
    await page.getByRole('button', { name: 'Rezept Mein Risotto öffnen' }).click();
    let detail = page.getByRole('dialog');
    await expect(detail.locator('.preplist')).toContainText('Zwiebel fein hacken');
    await expect(detail.getByText('Zwiebel fein hacken und in Butter glasig dünsten.')).toBeVisible();
    await detail.getByRole('button', { name: 'Schliessen' }).click();

    // Bearbeitetes Startrezept: die eigenen Schritte bleiben alle sieben.
    await page.getByRole('button', { name: 'Rezept Poulet mit Brokkoli und Reis öffnen' }).click();
    detail = page.getByRole('dialog');
    await expect(detail.getByText('Vorbereitung + 7 Schritte')).toBeVisible();
    await expect(detail.getByText('Mit Reis und viel Sojasauce servieren.')).toBeVisible();
    await expect(detail.locator('.preplist')).toContainText('Sojasauce und Honig in einer Tasse verrühren');
    await detail.getByRole('button', { name: 'Schliessen' }).click();

    // Wer die Vorbereitung geleert hat, bekommt keine Aufgaben zurück.
    await page.getByRole('button', { name: 'Rezept Ohne Vorbereitung öffnen' }).click();
    detail = page.getByRole('dialog');
    await expect(detail.locator('.preplist li')).toHaveText(['Alle Zutaten abmessen und bereitstellen']);
  });
});

test.describe('Neues Rezept', () => {
  test('erkennt die Kategorie aus den Zutaten und legt die Vorbereitung an', async ({ page }) => {
    await openSpace(page, newSpace('neukat'));

    await neuesRezept(page);
    const form = page.getByRole('dialog');
    await form.getByLabel('Name', { exact: true }).fill('Zucchini-Pouletpfanne');
    await form.getByLabel('Portionen', { exact: true }).fill('2');
    await form.getByLabel('Menge für Zutat 1').fill('400');
    await form.getByLabel('Einheit für Zutat 1').fill('g');
    await form.getByLabel('Name für Zutat 1').fill('Pouletbrust');

    await expect(form.getByLabel('Kategorie')).toHaveValue('High-Protein');
    await expect(form.getByText(/Automatisch erkannt: Pouletbrust, rund 200 g pro Portion/)).toBeVisible();

    await form.getByLabel('Text für Schritt 1').fill('Zucchini würfeln und mit dem Poulet anbraten.');
    await form.getByRole('button', { name: 'Speichern' }).click();
    await expect(page.getByText('Rezept angelegt')).toBeVisible();

    await page.getByRole('button', { name: 'Rezept Zucchini-Pouletpfanne öffnen' }).click();
    const detail = page.getByRole('dialog');
    await expect(detail.locator('.tag--high-protein')).toHaveText(/High-Protein/);
    await expect(detail.locator('.preplist')).toContainText('Zucchini würfeln');
  });

  test('eine selbst gewählte Kategorie bleibt stehen', async ({ page }) => {
    await openSpace(page, newSpace('neueigen'));

    await neuesRezept(page);
    const form = page.getByRole('dialog');
    await form.getByLabel('Kategorie').fill('Frühstück');
    await form.getByLabel('Name für Zutat 1').fill('Spaghetti');
    await expect(form.getByLabel('Kategorie')).toHaveValue('Frühstück');

    // Der Vorschlag laesst sich trotzdem mit einem Tipp uebernehmen.
    await form.getByRole('button', { name: 'Vorschlag aus den Zutaten: Comfort' }).click();
    await expect(form.getByLabel('Kategorie')).toHaveValue('Comfort');
  });
});

test.describe('Rezept über Link mit KI', () => {
  const importiert = {
    ok: true,
    recipe: {
      name: 'Pasta mit Zitrone',
      servings: 2,
      timeMin: 20,
      ingredients: [
        { name: 'Spaghetti', amount: 200, unit: 'g' },
        { name: 'Zitrone', amount: 1, unit: '' },
      ],
      steps: [
        {
          text: 'Zuerst bringst du in einem grossen Topf reichlich Wasser zum Kochen, das du kräftig salzt, und gibst dann die Spaghetti hinein, die du für etwa 9 Minuten kochst, bis sie al dente sind.',
          durationSec: 540,
        },
        { text: 'In der Zwischenzeit die Zitrone abreiben und auspressen und alles mischen.', durationSec: null },
      ],
      source: 'https://beispiel.test/pasta',
    },
  };

  test('die Schritte werden kürzer, und das Original lässt sich zurückholen', async ({ page }) => {
    await openSpace(page, newSpace('kiimport'));
    await page.route('**/api/import', (route) => route.fulfill({ json: importiert }));
    await page.route('**/api/simplify', (route) =>
      route.fulfill({
        json: {
          ok: true,
          prep: ['Zitronenschale abreiben und Saft auspressen'],
          steps: [
            { text: 'Spaghetti in reichlich Salzwasser 9 Minuten al dente kochen.', durationSec: 540 },
            { text: 'Mit Zitronenabrieb und -saft mischen.', durationSec: null },
          ],
          missingNumbers: [],
        },
      }),
    );

    await neuesRezept(page);
    const form = page.getByRole('dialog');
    await form.getByLabel('Rezept über Link hinzufügen').fill('beispiel.test/pasta');
    await form.getByRole('button', { name: 'Holen' }).click();

    await expect(form.getByText('Mit KI vereinfacht.')).toBeVisible();
    await expect(form.getByLabel('Text für Schritt 1')).toHaveValue(
      'Spaghetti in reichlich Salzwasser 9 Minuten al dente kochen.',
    );
    await expect(form.getByLabel('Vorbereitung')).toHaveValue('Zitronenschale abreiben und Saft auspressen');
    // Die Zutaten fasst die KI nicht an, die Kategorie kommt aus ihnen.
    await expect(form.getByLabel('Name für Zutat 1')).toHaveValue('Spaghetti');
    await expect(form.getByLabel('Kategorie')).toHaveValue('Comfort');

    await form.getByRole('button', { name: 'Original wiederherstellen' }).click();
    await expect(form.getByLabel('Text für Schritt 1')).toHaveValue(importiert.recipe.steps[0].text);

    // Und auf Wunsch nochmal vereinfachen, jetzt am Abschnitt selbst.
    await form.getByRole('button', { name: 'Mit KI vereinfachen' }).click();
    await expect(form.getByLabel('Text für Schritt 2')).toHaveValue('Mit Zitronenabrieb und -saft mischen.');

    await form.getByRole('button', { name: 'Speichern' }).click();
    await page.getByRole('button', { name: 'Rezept Pasta mit Zitrone öffnen' }).click();
    await startCooking(page);
    await expect(page.locator('.cook').getByText('Spaghetti in reichlich Salzwasser 9 Minuten al dente kochen.')).toBeVisible();
    await expect(page.locator('.cook').getByText('09:00')).toBeVisible();
  });

  test('fehlt eine Zahl aus dem Original, sagt die App das', async ({ page }) => {
    await openSpace(page, newSpace('kizahl'));
    await page.route('**/api/import', (route) => route.fulfill({ json: importiert }));
    await page.route('**/api/simplify', (route) =>
      route.fulfill({
        json: {
          ok: true,
          prep: [],
          steps: [{ text: 'Spaghetti al dente kochen.', durationSec: null }],
          missingNumbers: ['9'],
        },
      }),
    );

    await neuesRezept(page);
    const form = page.getByRole('dialog');
    await form.getByLabel('Rezept über Link hinzufügen').fill('beispiel.test/pasta');
    await form.getByRole('button', { name: 'Holen' }).click();
    await expect(form.getByText('Bitte kurz prüfen: im Original stand noch 9.')).toBeVisible();
  });

  test('ohne Zugang zum Modell bleibt das Rezept wie übernommen', async ({ page }) => {
    await openSpace(page, newSpace('kiohne'));
    await page.route('**/api/import', (route) => route.fulfill({ json: importiert }));
    await page.route('**/api/simplify', (route) =>
      route.fulfill({ status: 503, json: { ok: false, error: 'no_key' } }),
    );

    await neuesRezept(page);
    const form = page.getByRole('dialog');
    await form.getByLabel('Rezept über Link hinzufügen').fill('beispiel.test/pasta');
    await form.getByRole('button', { name: 'Holen' }).click();

    await expect(form.getByText(/kein Zugang zum Modell eingerichtet/)).toBeVisible();
    await expect(form.getByLabel('Text für Schritt 1')).toHaveValue(importiert.recipe.steps[0].text);
    // Eine Vorbereitung gibt es trotzdem – aus dem Text gelesen.
    await expect(form.getByLabel('Vorbereitung')).not.toHaveValue('');
  });

  test('die Route sagt ohne Schlüssel klar, woran es liegt', async ({ request }) => {
    const response = await request.post('/api/simplify', {
      data: { recipe: { name: 'x', steps: [{ text: 'Kochen.' }], ingredients: [] } },
    });
    expect(response.status()).toBe(503);
    expect((await response.json()).error).toBe('no_key');
  });
});

test.describe('Design', () => {
  test('die gewählte Farbwelt gilt sofort und bleibt nach dem Neuladen', async ({ page }) => {
    await openSpace(page, newSpace('design'));
    await expect(page.locator('html')).not.toHaveAttribute('data-theme', 'dunkel');

    await page.getByRole('button', { name: 'Einstellungen und Synchronisation' }).click();
    const auswahl = page.getByRole('radiogroup', { name: 'Design' });
    await expect(auswahl.getByRole('radio')).toHaveCount(7);
    // Ohne Wahl gilt Diner, die Farbwelt des Logos.
    await expect(auswahl.getByRole('radio', { name: /Diner/ })).toHaveAttribute('aria-checked', 'true');
    await auswahl.getByRole('radio', { name: /Salbei/ }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'salbei');
    await expect(auswahl.getByRole('radio', { name: /Salbei/ })).toHaveAttribute('aria-checked', 'true');

    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'salbei');
    const grund = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(grund).toBe('rgb(244, 247, 241)');
  });

  test('ein dunkel eingestelltes iPhone bekommt trotzdem die helle App', async ({ browser }) => {
    const context = await browser.newContext({ colorScheme: 'dark' });
    const page = await context.newPage();
    await openSpace(page, newSpace('hell'));
    const grund = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(grund).toBe('rgb(255, 246, 230)');
    await context.close();
  });

  test('oben steht das Logo, rot mit Espresso-Schatten', async ({ page }) => {
    await openSpace(page, newSpace('logo'));
    const logo = page.locator('.topbar').getByRole('img', { name: 'Crave' });
    await expect(logo).toBeVisible();
    const farben = await logo.evaluate((svg) =>
      [...svg.querySelectorAll('path')].map((pfad) => getComputedStyle(pfad).fill),
    );
    expect(farben).toEqual(['rgb(59, 26, 20)', 'rgb(215, 38, 61)']);
  });

  test('wer noch den alten Standard Creme hatte, kommt einmal zu Diner', async ({ browser }) => {
    const context = await browser.newContext();
    await context.addInitScript(() => {
      // Nur beim allerersten Laden: so stand es vor dem neuen Logo auf dem Geraet.
      if (!sessionStorage.getItem('vorbereitet')) {
        localStorage.setItem('crave:theme', 'creme');
        sessionStorage.setItem('vorbereitet', '1');
      }
    });
    const page = await context.newPage();
    await openSpace(page, newSpace('marke'));
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'diner');

    // Wer danach Creme bewusst waehlt, behaelt es.
    await page.getByRole('button', { name: 'Einstellungen und Synchronisation' }).click();
    await page.getByRole('radiogroup', { name: 'Design' }).getByRole('radio', { name: /Creme/ }).click();
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'creme');
    await context.close();
  });
});

test.describe('Animation zum Rezept', () => {
  const rezept = (category: string, ...schritte: Array<[string, number | null]>) => ({
    category,
    steps: schritte.map(([text, durationSec], i) => ({ id: `s${i}`, text, durationSec })),
  });

  test('Ofen, Dessert oder Bräter – je nach Rezept', () => {
    const seeds = Object.values(buildSeedData().recipes);
    const motiv = (name: string) => {
      const r = seeds.find((recipe) => recipe.name === name)!;
      return [animationsMotiv(r, 'start'), animationsMotiv(r, 'fertig')];
    };
    expect(motiv('Ofenlachs mit Süsskartoffeln')).toEqual(['ofen', 'ofen']);
    expect(motiv('Spinat-Feta-Blätterteig-Taschen')).toEqual(['ofen', 'ofen']);
    expect(motiv('Leichte Lasagne-Röllchen mit Spinat und Linsen-Tomatensauce')).toEqual(['ofen', 'ofen']);
    // Vier Minuten Brötchen aufbacken machen keinen Ofen-Burger.
    expect(motiv('Halloumiburger mit Honig-Senf-Sauce')).toEqual(['braeter', 'braeter']);
    expect(motiv('Poulet mit Brokkoli und Reis')).toEqual(['braeter', 'braeter']);

    // Dessert: Schwingbesen zum Start, Sahnehaube am Schluss …
    const creme = rezept('Dessert', ['Milch und Zucker aufkochen und kalt stellen.', null]);
    expect([animationsMotiv(creme, 'start'), animationsMotiv(creme, 'fertig')]).toEqual(['besen', 'dessert']);
    // … und gebacken geht am Schluss der Ofen auf.
    const waehe = rezept('Dessert', ['Den Teig auswallen.', null], ['Im Ofen bei 200 °C backen.', 35 * 60]);
    expect([animationsMotiv(waehe, 'start'), animationsMotiv(waehe, 'fertig')]).toEqual(['besen', 'ofen']);
    // In der Pfanne ausgebacken ist nicht aus dem Ofen.
    const kuechlein = rezept('Dessert', ['In heissem Öl 10 Minuten ausbacken.', 600]);
    expect(animationsMotiv(kuechlein, 'fertig')).toBe('dessert');
  });
});
