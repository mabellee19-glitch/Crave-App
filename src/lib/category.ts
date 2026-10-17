/**
 * Kategorie eines Rezepts aus seinen Zutaten erkennen.
 *
 * Laeuft im Browser, ohne Modell und ohne Netz – die Kategorie steht da,
 * waehrend man die Zutaten eintippt. Die Regeln sind bewusst einfach und an
 * den mitgelieferten Rezepten geeicht:
 *
 * - Fleisch oder Fisch als Hauptsache (gut 100 g pro Portion) ist High-Protein.
 *   Weniger davon in Pasta oder Teig ist Comfort (Thunfisch-Pasta, Gyoza).
 * - Ohne Fleisch: Pasta, Suppe, Rahm und Kaese machen Comfort, sonst Vegi.
 *   Skyr, Quark, Tofu und Co. ohne Pasta machen High-Protein.
 * - Deutlich suess und nichts Herzhaftes darin: Dessert.
 *
 * Die Erkennung ist ein Vorschlag im Formular; wer etwas anderes waehlt,
 * behaelt seine Wahl.
 */

export type ErkannteKategorie = 'High-Protein' | 'Comfort' | 'Vegi' | 'Dessert';

export interface Erkennung {
  kategorie: ErkannteKategorie;
  /** Kurz, warum – fuer den Hinweis unter dem Feld. */
  grund: string;
}

interface Zutat {
  name: string;
  amount: number | null;
  unit: string;
}

function norm(text: string): string {
  return ` ${(text ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()} `;
}

/** Fleisch und Fisch als Hauptzutat. Wortanfaenge, damit "Pouletbrust" passt. */
const FLEISCH_FISCH = [
  'poulet',
  'huhn',
  'hahnchen',
  'haehnchen',
  'huhnchen',
  'chicken',
  'pute',
  'truthahn',
  'turkey',
  'rind',
  'beef',
  'kalb',
  'schwein',
  'pork',
  'hack',
  'lamm',
  'lamb',
  'speck',
  'bacon',
  'schinken',
  'ham ',
  'wurst',
  'salami',
  'chorizo',
  'prosciutto',
  'steak',
  'schnitzel',
  'ente ',
  'duck',
  'lachs',
  'salmon',
  'thunfisch',
  'tuna',
  'fisch',
  'fish',
  'kabeljau',
  'cod ',
  'forelle',
  'dorsch',
  'crevette',
  'garnele',
  'shrimp',
  'prawn',
  'scampi',
  'muschel',
  'tintenfisch',
  'calamar',
  'sardine',
  'jerky',
  'patties',
];

/** Kommt vom Tier, ist aber keine Hauptzutat: Bruehe, Fond, Sauce. */
const NUR_BEIWERK = ['*bruhe', '*bruehe', '*fond', '*bouillon', '*sauce', '*sosse', 'stock', 'broth', '*paste'];

/** Viel Eiweiss ohne Fleisch. */
const EIWEISS_VEGI = ['*skyr', '*quark', '*huttenkase', '*huettenkaese', 'cottage', '*tofu', 'tempeh', 'seitan', '*protein'];

/** Gewichte fuer "Comfort". Ab 3 Punkten ist ein vegetarisches Gericht Comfort. */
const COMFORT: Array<[string, number]> = [
  ['pasta', 3],
  ['nudel', 3],
  ['spaghetti', 3],
  ['penne', 3],
  ['makkaroni', 3],
  ['maccaroni', 3],
  ['macaroni', 3],
  ['orzo', 3],
  ['gnocchi', 3],
  ['lasagne', 3],
  ['tortellini', 3],
  ['ravioli', 3],
  ['fusilli', 3],
  ['tagliatelle', 3],
  ['rigatoni', 3],
  ['spatzli', 3],
  ['spaetzle', 3],
  ['spatzle', 3],
  ['pommes', 2],
  ['fries', 2],
  ['pizza', 3],
  ['flammkuchen', 3],
  ['gyoza', 2],
  ['*teig', 1],
  ['*brotchen', 1],
  ['*broetchen', 1],
  ['rahm', 1],
  ['sahne', 1],
  ['creme fraiche', 1],
  ['cheddar', 1],
  ['mozzarella', 1],
  ['raclette', 1],
  ['gruyere', 1],
  ['emmentaler', 1],
  ['gouda', 1],
  ['kase gerieben', 1],
  ['reibkase', 1],
  ['butter', 0.5],
  ['mehl', 0.5],
  ['kartoffel', 1],
];

/** Im Namen des Rezepts. */
const COMFORT_IM_NAMEN: Array<[string, number]> = [
  ['*suppe', 3],
  ['*eintopf', 3],
  ['*auflauf', 3],
  ['*gratin', 3],
  ['*lasagne', 3],
  ['*risotto', 3],
  ['mac ', 2],
  ['cheese', 1],
  ['*pizza', 3],
  ['*flammkuchen', 3],
];

const SUESS = [
  '*zucker',
  'schokolade',
  'kakao',
  'vanille',
  'backpulver',
  'mascarpone',
  'gelatine',
  'pudding',
  'ahornsirup',
  'zimt',
  'beeren',
  'apfel',
  'aepfel',
  'banane',
  'datteln',
  'kondensmilch',
  'biskuit',
  'puderzucker',
  'kokosblutenzucker',
];

const SUESS_IM_NAMEN = ['*kuchen', '*torte', 'muffin', 'brownie', 'cookie', 'tiramisu', 'mousse', 'crumble', 'dessert', 'pudding', 'creme brulee'];

const HERZHAFT = ['zwiebel', 'knoblauch', 'pfeffer', 'bouillon', 'bruhe', 'sojasauce', 'senf', 'curry', 'chili', 'oregano', 'paprika'];

/**
 * Sucht Woerter am Wortanfang: " poulet" trifft "Poulet" und "Pouletbrust",
 * aber "Kartoffel" nicht "Süsskartoffel". Ein Stern vorne sucht ueberall im
 * Wort – fuer Zusammensetzungen wie "Blätterteig". Ein Leerzeichen hinten
 * verlangt das ganze Wort ("ham " ist nicht "Hamburger").
 */
function trifft(text: string, wort: string): boolean {
  return wort.startsWith('*') ? text.includes(wort.slice(1)) : text.includes(` ${wort}`);
}

function enthaelt(text: string, woerter: string[]): string | null {
  for (const wort of woerter) {
    if (trifft(text, wort)) return wort.replace('*', '').trim();
  }
  return null;
}

/** Ungefaehre Menge in Gramm, wenn sie sich ablesen laesst. */
function gramm(zutat: Zutat): number | null {
  if (zutat.amount == null || !(zutat.amount > 0)) return null;
  const einheit = zutat.unit.trim().toLowerCase();
  if (einheit === 'g' || einheit === 'gramm' || einheit === 'gr') return zutat.amount;
  if (einheit === 'kg' || einheit === 'kilo') return zutat.amount * 1000;
  // Ein Filet, eine Brust, ein Steak: rund 150 g.
  if (!einheit || einheit === 'stück' || einheit === 'stk' || einheit === 'scheiben') {
    return zutat.amount * 150;
  }
  if (einheit === 'dose' || einheit === 'dosen') return zutat.amount * 130;
  if (einheit === 'pck' || einheit === 'packung' || einheit === 'pkg') return zutat.amount * 250;
  return null;
}

export function kategorieErkennen(rezept: {
  name: string;
  servings: number;
  ingredients: Zutat[];
}): Erkennung | null {
  const zutaten = rezept.ingredients.filter((zutat) => zutat.name.trim());
  if (zutaten.length === 0) return null;

  const portionen = rezept.servings > 0 ? rezept.servings : 2;
  const name = norm(rezept.name);

  let fleisch: string | null = null;
  let fleischGramm = 0;
  let eiweissVegi: string | null = null;
  let comfort = 0;
  let comfortGrund: string | null = null;
  let suess = 0;
  let herzhaft = false;

  for (const zutat of zutaten) {
    const text = norm(zutat.name);
    const tier = enthaelt(text, FLEISCH_FISCH);
    if (tier && !enthaelt(text, NUR_BEIWERK)) {
      fleisch = fleisch ?? zutat.name.replace(/\s*[(,].*$/, '').trim();
      // Ohne Mengenangabe zaehlt es als normale Portion Fleisch.
      fleischGramm += gramm(zutat) ?? 125 * portionen;
    } else if (tier) {
      herzhaft = true;
    }
    const vegi = enthaelt(text, EIWEISS_VEGI);
    if (vegi) eiweissVegi = eiweissVegi ?? zutat.name.trim();

    let besterTreffer = 0;
    for (const [wort, punkte] of COMFORT) {
      if (trifft(text, wort) && punkte > besterTreffer) besterTreffer = punkte;
    }
    if (besterTreffer > 0) {
      comfort += besterTreffer;
      if (besterTreffer >= 2 && !comfortGrund) comfortGrund = zutat.name.replace(/\s*[(,].*$/, '').trim();
    }

    if (enthaelt(text, SUESS)) suess += 1;
    if (enthaelt(text, HERZHAFT)) herzhaft = true;
  }

  for (const [wort, punkte] of COMFORT_IM_NAMEN) {
    if (trifft(name, wort)) {
      comfort += punkte;
      const kern = wort.replace('*', '').trim();
      comfortGrund = comfortGrund ?? kern[0].toUpperCase() + kern.slice(1);
    }
  }
  if (enthaelt(name, SUESS_IM_NAMEN)) suess += 2;

  if (!fleisch && !herzhaft && suess >= 2) {
    return { kategorie: 'Dessert', grund: 'süss, nichts Herzhaftes' };
  }

  if (fleisch) {
    const proPortion = Math.round(fleischGramm / portionen / 10) * 10;
    if (proPortion >= 100 || comfort < 2) {
      return {
        kategorie: 'High-Protein',
        grund: `${fleisch}, rund ${proPortion} g pro Portion`,
      };
    }
    return {
      kategorie: 'Comfort',
      grund: `${comfortGrund ?? 'Pasta oder Teig'} mit wenig ${fleisch}`,
    };
  }

  if (comfort >= 3) {
    return {
      kategorie: 'Comfort',
      grund: comfortGrund ?? 'deftig und cremig',
    };
  }
  if (eiweissVegi) {
    return {
      kategorie: 'High-Protein',
      grund: `${eiweissVegi} statt Fleisch`,
    };
  }
  return { kategorie: 'Vegi', grund: 'ohne Fleisch und Fisch' };
}
