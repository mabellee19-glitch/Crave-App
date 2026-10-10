import { expect, test } from '@playwright/test';
import { neuesRezept, newSpace, openSpace } from './helpers';
import { brauchtKi, istVerweis, saetze, schritteKuerzen, schrittTeilen } from '../src/lib/kuerzen';
import { buildSeedData } from '../src/lib/seed';

/** Der erste Schritt eines uebernommenen Hefeteig-Rezepts, wie er im Kochmodus stand. */
const HEFETEIG =
  'Milch, Zucker und Hefe in einer großen Rührschüssel mischen. Butter, Ei, Salz und die Hälfte des Mehls unterrühren, entweder mit einem Kochlöffel oder in der Küchenmaschine mit Knethaken. Wenn alles gründlich vermengt ist, das restliche Mehl einrühren und alles zu einem glatten Teig kneten, rund 5-7 Minuten. Nachdem der Teig sehr weich ist, empfehle ich die Zubereitung in einer Küchenmaschine, ein Kneten von Hand ist eine sehr klebrige Angelegenheit. Tipps zum Arbeiten mit weichen Teigen finden sich im Artikel oben.';

/** "Pasta mit Thunfisch", wie das Rezept vor dem Kuerzen ausgeliefert wurde. */
const THUNFISCH_ALT = [
  'Pasta in kräftig gesalzenem Wasser al dente kochen. Vor dem Abgiessen eine Tasse Pastawasser beiseitestellen.',
  'Während die Pasta kocht, das Olivenöl in einer grossen Pfanne erhitzen. Knoblauch und Chiliflocken bei mittlerer Hitze kurz anschwitzen, bis es duftet. Der Knoblauch soll dabei nicht braun werden.',
  'Cherrytomaten dazugeben und bei mittlerer bis hoher Hitze schmoren, bis sie weich werden und aufplatzen. Leicht mit der Kelle andrücken, damit Saft austritt.',
  'Thunfisch und Kapern dazugeben, den Thunfisch grob zerpflücken und kurz mitwärmen.',
  'Die Pasta mit einem Schuss Pastawasser in die Pfanne geben und gut schwenken, bis eine leicht sämige Sauce entsteht. Mit Zitronenabrieb und -saft, Kräutern, Salz und Pfeffer abschmecken und sofort servieren.',
].map((text, index) => ({ id: `alt-t-${index}`, text, durationSec: null }));

function rezept(id: string, name: string, steps: Array<{ id: string; text: string; durationSec: number | null }>, extra = {}) {
  const now = Date.now();
  return {
    id,
    name,
    category: 'Comfort',
    servings: 4,
    timeMin: 60,
    ingredients: [
      { id: `${id}-z1`, name: 'Mehl', amount: 500, unit: 'g' },
      { id: `${id}-z2`, name: 'Milch', amount: 250, unit: 'ml' },
    ],
    prep: [],
    steps,
    cookNext: false,
    notes: '',
    createdAt: now,
    updatedAt: now,
    ...extra,
  };
}

let zaehler = 0;
const neueId = () => `neu-${++zaehler}`;

test.describe('Lange Schritte kürzen (Regeln)', () => {
  test('Sätze werden an der richtigen Stelle getrennt', () => {
    expect(saetze('Zwiebeln ca. 5 Min. dünsten, z. B. in Butter. Dann salzen.')).toEqual([
      'Zwiebeln ca. 5 Min. dünsten, z. B. in Butter.',
      'Dann salzen.',
    ]);
    expect(saetze('Ofen auf 200 °C vorheizen. 20 Minuten backen!\nAuskühlen lassen.')).toEqual([
      'Ofen auf 200 °C vorheizen.',
      '20 Minuten backen!',
      'Auskühlen lassen.',
    ]);
  });

  test('Verweise auf die Webseite fallen weg, Kochhinweise bleiben', () => {
    expect(istVerweis('Tipps zum Arbeiten mit weichen Teigen finden sich im Artikel oben.')).toBe(true);
    expect(istVerweis('Viel Spaß beim Nachbacken!')).toBe(true);
    expect(istVerweis('Guten Appetit!')).toBe(true);
    expect(istVerweis('Wie oben beschrieben falten.')).toBe(true);
    // Mit einer Zahl darin sagt der Satz vermutlich doch etwas zum Kochen.
    expect(istVerweis('Im Video sieht man es: 2 Minuten kneten.')).toBe(false);
    expect(istVerweis('Der Knoblauch soll nicht braun werden.')).toBe(false);
    expect(istVerweis('Links und rechts einschlagen.')).toBe(false);
  });

  test('der lange Hefeteig-Schritt wird zu kurzen, und nichts geht verloren', () => {
    const teile = schrittTeilen(HEFETEIG);
    expect(teile).toEqual([
      'Milch, Zucker und Hefe in einer großen Rührschüssel mischen.',
      'Butter, Ei, Salz und die Hälfte des Mehls unterrühren, entweder mit einem Kochlöffel oder in der Küchenmaschine mit Knethaken.',
      'Wenn alles gründlich vermengt ist, das restliche Mehl einrühren und alles zu einem glatten Teig kneten, rund 5-7 Minuten.',
      'Nachdem der Teig sehr weich ist, empfehle ich die Zubereitung in einer Küchenmaschine, ein Kneten von Hand ist eine sehr klebrige Angelegenheit.',
    ]);
    // Jeder Satz, der stehen bleibt, steht wortgleich da.
    for (const teil of teile) expect(HEFETEIG).toContain(teil);
  });

  test('der Timer wandert zu dem Teil, in dem die Zeit steht', () => {
    const gekuerzt = schritteKuerzen([{ id: 's1', text: HEFETEIG, durationSec: 300 }], neueId)!;
    expect(gekuerzt.map((step) => step.durationSec)).toEqual([null, null, 300, null]);
    // Der erste Teil behaelt die Id – der Kochmodus findet seinen Schritt wieder.
    expect(gekuerzt[0].id).toBe('s1');

    const zweiZeiten = schritteKuerzen(
      [
        {
          id: 's2',
          text: 'Den Ofen auf 200 °C vorheizen und das Blech mit Backpapier belegen. Den Teig 20 Minuten backen. Danach 10 Minuten auskühlen lassen und mit Puderzucker bestäuben, bevor man ihn anschneidet.',
          durationSec: 1200,
        },
      ],
      neueId,
    )!;
    expect(zweiZeiten.map((step) => step.durationSec)).toEqual([1200, 600]);
  });

  test('kurze Schritte bleiben, wie sie sind', () => {
    const kurz = [
      { id: 'a', text: 'Olivenöl erhitzen. Zwiebel glasig dünsten.', durationSec: 120 },
      { id: 'b', text: 'Mit Salz abschmecken.', durationSec: null },
    ];
    expect(schritteKuerzen(kurz, neueId)).toBeNull();
    // Nur ein Verweis daneben: der faellt weg, der Rest bleibt.
    expect(
      schritteKuerzen([{ id: 'c', text: 'Servieren. Guten Appetit!', durationSec: null }], neueId),
    ).toEqual([{ id: 'c', text: 'Servieren.', durationSec: null }]);
  });

  test('die mitgelieferten Rezepte sind schon kurz', () => {
    for (const recipe of Object.values(buildSeedData(0).recipes)) {
      expect(schritteKuerzen(recipe.steps, neueId), recipe.name).toBeNull();
      expect(brauchtKi(recipe), recipe.name).toBe(false);
      for (const step of recipe.steps) expect(step.text.length, step.text).toBeLessThanOrEqual(130);
    }
  });
});

test.describe('Lange Schritte in bestehenden Rezepten', () => {
  test('werden beim Start aufgeteilt und lassen sich zurückholen', async ({ page, request }) => {
    const space = newSpace('kurzalt');
    await request.post(`/api/space/${space}`, {
      data: {
        data: {
          recipes: {
            hefe: rezept('hefe', 'Zimtschnecken', [
              { id: 'h1', text: HEFETEIG, durationSec: 300 },
              { id: 'h2', text: 'Den Teig zugedeckt 1 Stunde gehen lassen.', durationSec: 3600 },
            ]),
            'seed-r-thunfisch-pasta': rezept(
              'seed-r-thunfisch-pasta',
              'Pasta mit Thunfisch, Cherrytomaten & Zitrone',
              THUNFISCH_ALT,
            ),
          },
          dishes: {},
          shopping: {},
          pantry: {},
        },
      },
    });

    await page.goto(`/s/${space}`);
    await page.getByRole('button', { name: 'Rezept Zimtschnecken öffnen' }).click();
    let detail = page.getByRole('dialog');
    await expect(detail.getByText('Vorbereitung + 5 Schritte')).toBeVisible();
    await expect(detail.getByText('Milch, Zucker und Hefe in einer großen Rührschüssel mischen.', { exact: true })).toBeVisible();
    await expect(detail.getByText(/im Artikel oben/)).toHaveCount(0);
    await expect(detail.getByText('Lange Schritte wurden in kurze aufgeteilt.')).toBeVisible();

    // Zurueck zum Original – und es bleibt dabei, auch nach dem Neuladen.
    await detail.getByRole('button', { name: 'Original wiederherstellen' }).click();
    await expect(page.locator('.toast__text')).toContainText('wiederhergestellt');
    await expect(detail.getByText('Vorbereitung + 2 Schritte')).toBeVisible();
    await expect(detail.getByText(HEFETEIG)).toBeVisible();
    await expect(detail.getByRole('button', { name: 'Original wiederherstellen' })).toHaveCount(0);

    await expect(page.getByText('Alles synchronisiert').first()).toBeVisible({ timeout: 20_000 });
    await page.reload();
    await page.getByRole('button', { name: 'Rezept Zimtschnecken öffnen' }).click();
    detail = page.getByRole('dialog');
    await expect(detail.getByText('Vorbereitung + 2 Schritte')).toBeVisible();
    await detail.getByRole('button', { name: 'Schliessen' }).click();

    // Das mitgelieferte Rezept bekommt die von Hand gekuerzten Schritte.
    await page.getByRole('button', { name: 'Rezept Pasta mit Thunfisch, Cherrytomaten & Zitrone öffnen' }).click();
    detail = page.getByRole('dialog');
    await expect(detail.getByText('Vorbereitung + 7 Schritte')).toBeVisible();
    await expect(detail.getByText('Während die Pasta kocht, das Olivenöl in einer grossen Pfanne erhitzen.')).toBeVisible();
    await expect(detail.getByRole('button', { name: 'Original wiederherstellen' })).toHaveCount(0);
  });

  test('die KI schreibt sie im Hintergrund um, mit dem Original als Vorlage', async ({ page, request }) => {
    const space = newSpace('kurzki');
    await request.post(`/api/space/${space}`, {
      data: {
        data: {
          recipes: { hefe: rezept('hefe', 'Zimtschnecken', [{ id: 'h1', text: HEFETEIG, durationSec: 300 }]) },
          dishes: {},
          shopping: {},
          pantry: {},
        },
      },
    });

    const anfragen: string[] = [];
    await page.route('**/api/simplify', async (route) => {
      anfragen.push(route.request().postData() ?? '');
      await route.fulfill({
        json: {
          ok: true,
          prep: ['Butter weich werden lassen'],
          steps: [
            { text: 'Milch, Zucker und Hefe mischen.', durationSec: null },
            { text: 'Butter, Ei, Salz und die Hälfte des Mehls unterrühren.', durationSec: null },
            { text: 'Restliches Mehl dazu und 5–7 Minuten zu einem glatten Teig kneten.', durationSec: 300 },
          ],
          missingNumbers: [],
        },
      });
    });

    await page.goto(`/s/${space}`);
    await page.getByRole('button', { name: 'Rezept Zimtschnecken öffnen' }).click();
    const detail = page.getByRole('dialog');
    await expect(detail.getByText('Die Schritte wurden mit KI gekürzt.')).toBeVisible({ timeout: 15_000 });
    await expect(detail.getByText('Vorbereitung + 3 Schritte')).toBeVisible();
    await expect(detail.locator('.preplist')).toContainText('Butter weich werden lassen');

    // Die KI hat den ungeteilten Originaltext bekommen, nicht die Stuecke.
    expect(anfragen).toHaveLength(1);
    expect(JSON.parse(anfragen[0]).recipe.steps).toEqual([{ text: HEFETEIG, durationSec: 300 }]);

    // Und auch von hier geht es zurueck zum Original.
    await detail.getByRole('button', { name: 'Original wiederherstellen' }).click();
    await expect(detail.getByText(HEFETEIG)).toBeVisible();
  });

  test('ohne Zugang zur KI bleibt es bei einer einzigen Anfrage', async ({ page, request }) => {
    const space = newSpace('kurzohne');
    await request.post(`/api/space/${space}`, {
      data: {
        data: {
          recipes: {
            eins: rezept('eins', 'Zimtschnecken', [{ id: 'h1', text: HEFETEIG, durationSec: 300 }]),
            zwei: rezept('zwei', 'Hefezopf', [{ id: 'z1', text: HEFETEIG, durationSec: 300 }]),
          },
          dishes: {},
          shopping: {},
          pantry: {},
        },
      },
    });

    let anfragen = 0;
    await page.route('**/api/simplify', (route) => {
      anfragen += 1;
      return route.fulfill({ status: 503, json: { ok: false, error: 'billing' } });
    });

    await page.goto(`/s/${space}`);
    await expect(page.getByText('Alles synchronisiert').first()).toBeVisible({ timeout: 20_000 });
    await expect.poll(() => anfragen).toBe(1);
    await page.waitForTimeout(500);
    expect(anfragen).toBe(1);

    // Die Regeln haben trotzdem gegriffen.
    await page.getByRole('button', { name: 'Rezept Hefezopf öffnen' }).click();
    await expect(page.getByRole('dialog').getByText('Vorbereitung + 4 Schritte')).toBeVisible();
  });

  test('wer danach selbst an den Schritten arbeitet, behält seine Fassung', async ({ page, request }) => {
    const space = newSpace('kurzhand');
    await request.post(`/api/space/${space}`, {
      data: {
        data: {
          recipes: { hefe: rezept('hefe', 'Zimtschnecken', [{ id: 'h1', text: HEFETEIG, durationSec: 300 }]) },
          dishes: {},
          shopping: {},
          pantry: {},
        },
      },
    });
    // Erst ohne KI: die Regeln teilen.
    await page.route('**/api/simplify', (route) =>
      route.fulfill({ status: 503, json: { ok: false, error: 'billing' } }),
    );
    await page.goto(`/s/${space}`);
    await page.getByRole('button', { name: 'Rezept Zimtschnecken öffnen' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Rezept bearbeiten' }).click();
    const form = page.getByRole('dialog');
    await form.getByLabel('Text für Schritt 4').fill('Teig weich lassen – lieber mit der Maschine kneten.');
    await form.getByRole('button', { name: 'Speichern' }).click();
    await expect(page.getByText('Alles synchronisiert').first()).toBeVisible({ timeout: 20_000 });

    // Jetzt waere die KI da – sie laesst das Rezept trotzdem in Ruhe.
    let anfragen = 0;
    await page.unroute('**/api/simplify');
    await page.route('**/api/simplify', (route) => {
      anfragen += 1;
      return route.fulfill({ json: { ok: true, prep: [], steps: [{ text: 'x', durationSec: null }], missingNumbers: [] } });
    });
    await page.reload();
    await expect(page.getByText('Alles synchronisiert').first()).toBeVisible({ timeout: 20_000 });
    await page.waitForTimeout(500);
    expect(anfragen).toBe(0);
    await page.getByRole('button', { name: 'Rezept Zimtschnecken öffnen' }).click();
    await expect(page.getByRole('dialog').getByText('Teig weich lassen – lieber mit der Maschine kneten.')).toBeVisible();
  });
});

test.describe('Rezept über Link ohne KI', () => {
  test('lange Schritte sind trotzdem gleich kurz', async ({ page }) => {
    await openSpace(page, newSpace('kurzlink'));
    await page.route('**/api/import', (route) =>
      route.fulfill({
        json: {
          ok: true,
          recipe: {
            name: 'Zimtschnecken',
            servings: 12,
            timeMin: 120,
            ingredients: [{ name: 'Mehl', amount: 500, unit: 'g' }],
            steps: [{ text: HEFETEIG, durationSec: 300 }],
            source: 'https://beispiel.test/zimtschnecken',
          },
        },
      }),
    );
    await page.route('**/api/simplify', (route) =>
      route.fulfill({ status: 503, json: { ok: false, error: 'billing' } }),
    );

    await neuesRezept(page);
    const form = page.getByRole('dialog');
    await form.getByLabel('Rezept über Link hinzufügen').fill('beispiel.test/zimtschnecken');
    await form.getByRole('button', { name: 'Holen' }).click();

    await expect(form.getByText(/fehlt die Zahlungsangabe/)).toBeVisible();
    await expect(form.getByText(/Lange Schritte sind schon in kurze aufgeteilt/)).toBeVisible();
    await expect(form.getByLabel('Text für Schritt 1')).toHaveValue(
      'Milch, Zucker und Hefe in einer großen Rührschüssel mischen.',
    );
    await expect(form.getByLabel('Text für Schritt 4')).toBeVisible();
    await expect(form.getByLabel('Text für Schritt 5')).toHaveCount(0);

    await form.getByRole('button', { name: 'Speichern' }).click();
    await page.getByRole('button', { name: 'Rezept Zimtschnecken öffnen' }).click();
    await expect(page.getByRole('dialog').getByText('Lange Schritte wurden in kurze aufgeteilt.')).toBeVisible();
  });
});
