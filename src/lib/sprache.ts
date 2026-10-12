/**
 * Ist ein Rezept auf Englisch?
 *
 * Englische Rezepte werden auf Deutsch uebersetzt (recipeAi.ts). Dafuer muss
 * die App sie zuerst erkennen – ohne Modell, damit das auch auf dem Geraet
 * und bei jedem Start geht.
 *
 * Gezaehlt werden kleine Woerter, die in jeder Anleitung vorkommen und nur in
 * einer der beiden Sprachen: "the", "until", "with" gegen "und", "mit", "bis".
 * Ein einzelnes englisches Wort im Namen ("Marry me Chicken", "Smash Burger")
 * macht noch kein englisches Rezept – es braucht viele Treffer, und deutlich
 * mehr als deutsche.
 */

const ENGLISCH = new Set([
  'the', 'and', 'with', 'until', 'into', 'onto', 'of', 'to', 'for', 'from', 'about', 'then',
  // Nicht dabei: "an", "in", "so" – die gibt es im Deutschen genauso.
  'or', 'each', 'your', 'you', 'it', 'is', 'are', 'a', 'at', 'on', 'over', 'off',
  'add', 'stir', 'heat', 'bake', 'cook', 'mix', 'place', 'remove', 'preheat', 'serve',
  'minutes', 'minute', 'hours', 'oven', 'pan', 'bowl', 'large', 'medium', 'small',
  'cup', 'cups', 'tbsp', 'tsp', 'tablespoon', 'tablespoons', 'teaspoon', 'teaspoons',
  'ounces', 'oz', 'lb', 'lbs', 'pound', 'pounds', 'chopped', 'minced', 'sliced', 'diced',
  'salt', 'pepper', 'sugar', 'flour', 'water', 'oil', 'garlic', 'onion', 'cloves', 'chicken',
  'cheese', 'cream', 'egg', 'eggs', 'fresh', 'ground', 'whisk', 'combine',
]);

const DEUTSCH = new Set([
  'und', 'mit', 'die', 'der', 'das', 'den', 'dem', 'des', 'bis', 'zu', 'zum', 'zur', 'auf',
  'für', 'fuer', 'im', 'vom', 'ein', 'eine', 'einer', 'einen', 'oder', 'etwas', 'ca',
  'dazugeben', 'geben', 'kochen', 'backen', 'braten', 'rühren', 'lassen', 'schneiden',
  'minuten', 'stunden', 'ofen', 'pfanne', 'schüssel', 'topf', 'salz', 'pfeffer', 'zucker',
  'mehl', 'wasser', 'öl', 'zwiebel', 'knoblauch', 'poulet', 'käse', 'rahm', 'ei', 'eier',
  'beiseitestellen', 'würzen', 'hinzufügen', 'darin', 'dann', 'danach', 'unter', 'mischen',
  'el', 'tl', 'dl', 'stück', 'prise', 'bund', 'zehe', 'zehen',
]);

/** Ab so vielen englischen Woertern traut sich die App ein Urteil zu. */
const MIN_TREFFER = 6;

export function istEnglisch(texte: string[]): boolean {
  let englisch = 0;
  let deutsch = 0;
  for (const text of texte) {
    for (const wort of text.toLowerCase().match(/[\p{L}]+/gu) ?? []) {
      if (ENGLISCH.has(wort)) englisch += 1;
      else if (DEUTSCH.has(wort)) deutsch += 1;
    }
  }
  return englisch >= MIN_TREFFER && englisch > deutsch * 3;
}

/** Die Texte eines Rezepts, an denen sich die Sprache zeigt. */
export function rezeptTexte(rezept: {
  name: string;
  ingredients: Array<{ name: string; unit: string }>;
  steps: Array<{ text: string }>;
  prep?: string[];
}): string[] {
  return [
    rezept.name,
    ...rezept.ingredients.map((zutat) => `${zutat.unit} ${zutat.name}`),
    ...rezept.steps.map((step) => step.text),
    ...(rezept.prep ?? []),
  ];
}
