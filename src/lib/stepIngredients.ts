/**
 * Welche Zutaten gehoeren zu welchem Schritt?
 *
 * Gespeichert ist das nirgends – weder in den mitgelieferten noch in den
 * eigenen oder uebernommenen Rezepten. Es wird beim Anzeigen aus dem Text
 * gelesen: steht "Knoblauch dazugeben" im Schritt, gehoert der Knoblauch dazu.
 * Damit funktioniert es fuer jedes Rezept, auch fuer alte, ohne dass an den
 * Daten etwas geaendert werden muss.
 *
 * Verglichen wird grosszuegig, weil Rezepte selten genau den Zutatennamen
 * wiederholen: "Hähnchen" trifft "Hähnchenbrust", "Bouillon" trifft
 * "Gemüsebouillon", "salzen" trifft "Salz". Sammelwoerter wie "Gewürze",
 * "Gemüse" oder "alle Zutaten" holen die passende Gruppe.
 */

import type { Ingredient } from './types';

/** Kleinschreibung, Umlaute ausgeschrieben, nur Buchstaben. */
function norm(wort: string): string {
  return wort
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z]/g, '');
}

/** Woerter, die in einem Zutatennamen stehen, aber keine Zutat bezeichnen. */
const FUELLWOERTER = new Set(
  [
    'oder',
    'und',
    'mit',
    'aus',
    'der',
    'die',
    'das',
    'dem',
    'den',
    'zum',
    'zur',
    'fuer',
    'von',
    'optional',
    'dose',
    'dosen',
    'glas',
    'packung',
    'bund',
    'handvoll',
    'prise',
    'stueck',
    'bio',
    'alternativ',
  ].map(norm),
);

const GEWUERZE = [
  'kurkuma',
  'kreuzkuemmel',
  'kuemmel',
  'koriander',
  'korianderpulver',
  'paprikapulver',
  'garam',
  'masala',
  'currypulver',
  'curry',
  'zimt',
  'muskat',
  'muskatnuss',
  'chili',
  'chiliflocken',
  'cayenne',
  'oregano',
  'thymian',
  'rosmarin',
  'cumin',
  'ingwerpulver',
  'knoblauchpulver',
];

const GEMUESE = [
  'zwiebel',
  'zwiebeln',
  'peperoni',
  'paprika',
  'zucchini',
  'karotte',
  'karotten',
  'rueebli',
  'brokkoli',
  'blumenkohl',
  'aubergine',
  'tomate',
  'tomaten',
  'cherrytomaten',
  'lauch',
  'sellerie',
  'spinat',
  'kohl',
  'weisskohl',
  'pilze',
  'champignons',
  'erbsen',
  'mais',
  'kuerbis',
  'suesskartoffeln',
  'fenchel',
  'gurke',
];

const KRAEUTER = ['petersilie', 'basilikum', 'dill', 'minze', 'schnittlauch', 'thymian', 'rosmarin', 'koriander'];

interface Schluessel {
  /** Die Woerter, an denen die Zutat im Schritttext erkannt wird. */
  woerter: string[];
  /** "(für die Marinade)" -> ["marin"]: unterscheidet gleichnamige Zutaten. */
  zusatz: string[];
  /** "(zum Servieren)": kommt erst auf den Teller, nicht in den Topf. */
  servieren: boolean;
}

function schluesselFuer(name: string): Schluessel {
  const klammern = [...name.matchAll(/\(([^)]*)\)/g)].map((treffer) => treffer[1]).join(' ');
  const ohneKlammern = name.replace(/\([^)]*\)/g, ' ');
  const kern = ohneKlammern.replace(/,.*$/, '');
  const komma = /,(.*)$/.exec(ohneKlammern)?.[1] ?? '';

  const teile = kern.split(/[\s\-–/]+/).filter(Boolean);
  // Deutsche Hauptwoerter sind gross geschrieben – das ist die Zutat.
  let nomen = teile.filter((teil) => /^\p{Lu}/u.test(teil));
  // "Rote Linsen", "Frischer Ingwer": das Adjektiv vorne zaehlt nicht.
  if (nomen.length > 1 && /^\p{Lu}\p{Ll}*(e|er|es|en|em)$/u.test(nomen[0]) && teile[0] === nomen[0]) {
    nomen = nomen.slice(1);
  }
  // Kleingeschriebene Namen ("chicken breast") nehmen alle laengeren Woerter.
  if (nomen.length === 0) nomen = teile.filter((teil) => teil.length >= 3);

  const woerter = nomen.map(norm).filter((wort) => wort.length >= 2 && !FUELLWOERTER.has(wort));

  const zusatz = `${klammern} ${komma}`
    .split(/[\s,]+/)
    .filter((teil) => /^\p{Lu}/u.test(teil))
    .map(norm)
    .filter((wort) => wort.length >= 4 && !FUELLWOERTER.has(wort))
    .map((wort) => wort.slice(0, Math.max(4, wort.length - 3)));

  return { woerter, zusatz, servieren: /servieren/i.test(`${klammern} ${komma}`) };
}

/** Ein Wort aus der Zutat gegen ein Wort aus dem Schritt. */
function trifft(zutat: string, schritt: string): boolean {
  if (zutat === schritt) return true;
  // Kurze Woerter nur genau – sonst trifft "Ei" jedes "ein".
  if (zutat.length <= 3 || schritt.length <= 3) {
    if ((zutat === 'ei' && schritt === 'eier') || (zutat === 'eier' && schritt === 'ei')) return true;
    // "Öl" im Schritt meint Olivenöl, Sesamöl, Pflanzenöl.
    return schritt === 'oel' && zutat.endsWith('oel');
  }
  if (zutat.startsWith(schritt)) return true; // Zwiebel -> Zwiebeln, Hähnchen -> Hähnchenbrust
  if (schritt.startsWith(zutat)) return true; // Halloumi -> Halloumischeiben, Salz -> salzen
  if (schritt.length >= 4 && zutat.endsWith(schritt)) return true; // Kohl -> Weisskohl
  if (zutat.length >= 5 && schritt.endsWith(zutat)) return true; // Tomaten -> Cherrytomaten
  return false;
}

function gehoertZu(gruppe: string[], schluessel: Schluessel): boolean {
  return schluessel.woerter.some((wort) => gruppe.some((eintrag) => wort === eintrag || wort.endsWith(eintrag)));
}

/**
 * Die Zutaten, die ein Schritt braucht, in der Reihenfolge der Zutatenliste.
 */
export function zutatenFuerSchritt(text: string, ingredients: Ingredient[]): Ingredient[] {
  const roh = text.toLowerCase();
  const schrittWoerter = text
    .split(/[^\p{L}]+/u)
    .map(norm)
    .filter(Boolean);

  const kandidaten = ingredients
    .filter((zutat) => zutat.name.trim())
    .map((zutat) => ({ zutat, schluessel: schluesselFuer(zutat.name) }));

  const alle = /\balle zutaten\b/.test(roh);
  const gewuerze = /\bgewürze?n?\b/.test(roh);
  const gemuese = /\bgemüse\b/.test(roh);
  const kraeuter = /\bkräutern?\b/.test(roh);

  const treffer = kandidaten.filter(({ schluessel }) => {
    if (alle) return true;
    // Sammelwoerter meinen, was in den Topf kommt – nicht die Garnitur.
    const gruppe = !schluessel.servieren;
    if (gruppe && gewuerze && gehoertZu(GEWUERZE, schluessel)) return true;
    if (gruppe && gemuese && gehoertZu(GEMUESE, schluessel)) return true;
    if (gruppe && kraeuter && gehoertZu(KRAEUTER, schluessel)) return true;
    return schluessel.woerter.some((wort) => schrittWoerter.some((schritt) => trifft(wort, schritt)));
  });

  /*
   * Gleichnamige Zutaten auseinanderhalten: dreimal Pflanzenöl – zum Braten,
   * für die Marinade, für die Sauce. Steht der Zweck im Schritt, gilt nur die
   * passende. Steht er nirgends, gilt die erste: Rezepte fuehren die Zutat
   * meist zuerst dort auf, wo sie zuerst gebraucht wird ("Ei (für die
   * Füllung)" vor "Ei (zum Bestreichen)").
   */
  const nachName = new Map<string, typeof treffer>();
  for (const eintrag of treffer) {
    const key = eintrag.schluessel.woerter.join(' ');
    nachName.set(key, [...(nachName.get(key) ?? []), eintrag]);
  }
  const verworfen = new Set<Ingredient>();
  for (const gruppe of nachName.values()) {
    if (gruppe.length < 2) continue;
    const zweck = gruppe.filter(({ schluessel }) =>
      schluessel.zusatz.some((stamm) => schrittWoerter.some((wort) => wort.startsWith(stamm))),
    );
    const passend = zweck.length ? zweck : gruppe.slice(0, 1);
    for (const eintrag of gruppe) if (!passend.includes(eintrag)) verworfen.add(eintrag.zutat);
  }

  return treffer.map(({ zutat }) => zutat).filter((zutat) => !verworfen.has(zutat));
}

/**
 * Fuer alle Schritte eines Rezepts auf einmal. Was "zum Servieren" ist und in
 * keinem Schritt vorkommt, steht beim letzten – dort kommt es auf den Teller.
 */
export function zutatenProSchritt(
  steps: Array<{ text: string }>,
  ingredients: Ingredient[],
): Ingredient[][] {
  const proSchritt = steps.map((step) => zutatenFuerSchritt(step.text, ingredients));
  if (proSchritt.length === 0) return proSchritt;

  const verwendet = new Set(proSchritt.flat());
  const garnitur = ingredients.filter(
    (zutat) => zutat.name.trim() && !verwendet.has(zutat) && schluesselFuer(zutat.name).servieren,
  );
  const letzter = proSchritt.length - 1;
  proSchritt[letzter] = [...proSchritt[letzter], ...garnitur];
  return proSchritt;
}
