import { AppData, Dish, Ingredient, PantryItem, Recipe, Step, emptyData } from './types';

/**
 * Startinhalte fuer einen frisch angelegten Datenraum. Alles ist normal
 * bearbeit- und loeschbar – es sind ganz gewoehnliche Eintraege.
 */

let counter = 0;
function seedId(prefix: string): string {
  counter += 1;
  return `seed-${prefix}-${counter}`;
}

function ing(name: string, amount: number | null, unit = '', noScale = false): Ingredient {
  return { id: seedId('i'), name, amount, unit, ...(noScale ? { noScale: true } : {}) };
}

function step(text: string, durationSec: number | null = null): Step {
  return { id: seedId('s'), text, durationSec };
}

interface RecipeSeed {
  key: string;
  name: string;
  category: string;
  servings: number;
  timeMin: number;
  ingredients: Ingredient[];
  steps: Step[];
}

const RECIPE_SEEDS: RecipeSeed[] = [
  {
    key: 'poulet-brokkoli',
    name: 'Poulet mit Brokkoli und Reis',
    category: 'High-Protein',
    servings: 2,
    timeMin: 30,
    ingredients: [
      ing('Poulet', 400, 'g'),
      ing('Reis', 200, 'g'),
      ing('Brokkoli', 1, 'Stück'),
      ing('Sojasauce', 3, 'EL'),
      ing('Knoblauch', 2, 'Zehen'),
      ing('Honig', 1, 'EL'),
      ing('Olivenöl', 2, 'EL'),
      ing('Salz', null, '', true),
      ing('Pfeffer', null, '', true),
    ],
    steps: [
      step('Reis kalt abspülen, mit der doppelten Menge Wasser und etwas Salz aufsetzen und zugedeckt köcheln lassen.', 15 * 60),
      step('Poulet in mundgerechte Streifen schneiden, salzen und pfeffern. Knoblauch fein hacken.'),
      step('Brokkoli in Röschen teilen und den Strunk schälen und in Scheiben schneiden.'),
      step('Olivenöl in einer grossen Pfanne erhitzen. Poulet bei mittlerer Hitze anbraten, bis es rundum goldbraun ist.', 5 * 60),
      step('Knoblauch dazugeben und kurz mitbraten, bis er duftet.', 60),
      step('Brokkoli zugeben, Sojasauce und Honig darüber giessen und alles zugedeckt garen, bis der Brokkoli bissfest ist.', 6 * 60),
      step('Mit Reis anrichten, abschmecken und sofort servieren.'),
    ],
  },
  {
    key: 'lachs-ofengemuese',
    name: 'Ofenlachs mit Süsskartoffeln',
    category: 'High-Protein',
    servings: 2,
    timeMin: 40,
    ingredients: [
      ing('Lachsfilet', 2, 'Stück'),
      ing('Süsskartoffeln', 500, 'g'),
      ing('Zitrone', 1, 'Stück'),
      ing('Olivenöl', 3, 'EL'),
      ing('Knoblauch', 2, 'Zehen'),
      ing('Honig', 1, 'TL'),
      ing('Salz', null, '', true),
      ing('Pfeffer', null, '', true),
    ],
    steps: [
      step('Ofen auf 200 °C Ober-/Unterhitze vorheizen.'),
      step('Süsskartoffeln schälen und in gleichmässige Spalten schneiden. Mit Olivenöl, Salz und Pfeffer mischen.'),
      step('Spalten auf ein Blech verteilen und im Ofen vorbacken.', 20 * 60),
      step('Lachs salzen, pfeffern und mit Zitronensaft, gehacktem Knoblauch und Honig bestreichen.'),
      step('Lachs zu den Süsskartoffeln aufs Blech legen und fertig garen, bis der Fisch glasig ist.', 12 * 60),
      step('Mit Zitronenspalten servieren.'),
    ],
  },
  {
    key: 'mac-and-cheese',
    name: 'Cremige Mac and Cheese',
    category: 'Comfort',
    servings: 4,
    timeMin: 35,
    ingredients: [
      ing('Makkaroni', 400, 'g'),
      ing('Milch', 500, 'ml'),
      ing('Butter', 50, 'g'),
      ing('Mehl', 40, 'g'),
      ing('Käse gerieben', 250, 'g'),
      ing('Muskatnuss', null, '', true),
      ing('Salz', null, '', true),
      ing('Pfeffer', null, '', true),
    ],
    steps: [
      step('Salzwasser aufsetzen und die Makkaroni bissfest kochen.', 9 * 60),
      step('Butter in einer zweiten Pfanne schmelzen, Mehl einrühren und unter Rühren hell anschwitzen.', 2 * 60),
      step('Milch nach und nach zugiessen und dabei ständig rühren, bis eine glatte Sauce entsteht.', 5 * 60),
      step('Käse einrühren und schmelzen lassen. Mit Salz, Pfeffer und Muskat abschmecken.'),
      step('Makkaroni abgiessen, unter die Sauce heben und sofort servieren.'),
    ],
  },
  {
    key: 'tomatensuppe',
    name: 'Tomatensuppe mit Basilikum',
    category: 'Comfort',
    servings: 4,
    timeMin: 30,
    ingredients: [
      ing('Pelati', 800, 'g'),
      ing('Zwiebeln', 1, 'Stück'),
      ing('Knoblauch', 2, 'Zehen'),
      ing('Rahm', 100, 'ml'),
      ing('Gemüsebouillon', 400, 'ml'),
      ing('Olivenöl', 2, 'EL'),
      ing('Basilikum', 1, 'Bund'),
      ing('Salz', null, '', true),
      ing('Pfeffer', null, '', true),
    ],
    steps: [
      step('Zwiebeln und Knoblauch fein hacken.'),
      step('Olivenöl erhitzen und die Zwiebeln glasig dünsten, dann den Knoblauch kurz mitdünsten.', 5 * 60),
      step('Pelati und Bouillon zugeben, aufkochen und offen einköcheln lassen.', 15 * 60),
      step('Suppe fein pürieren, Rahm einrühren und abschmecken.'),
      step('Mit frischem Basilikum servieren.'),
    ],
  },
  {
    key: 'linsencurry',
    name: 'Rotes Linsencurry',
    category: 'Vegi',
    servings: 3,
    timeMin: 30,
    ingredients: [
      ing('Rote Linsen', 250, 'g'),
      ing('Kokosmilch', 400, 'ml'),
      ing('Zwiebeln', 1, 'Stück'),
      ing('Knoblauch', 2, 'Zehen'),
      ing('Ingwer', 20, 'g'),
      ing('Currypaste', 2, 'EL'),
      ing('Gemüsebouillon', 300, 'ml'),
      ing('Olivenöl', 1, 'EL'),
      ing('Salz', null, '', true),
    ],
    steps: [
      step('Linsen kalt abspülen. Zwiebeln, Knoblauch und Ingwer fein hacken.'),
      step('Öl erhitzen und Zwiebeln, Knoblauch und Ingwer andünsten.', 4 * 60),
      step('Currypaste zugeben und kurz mitrösten, bis sie duftet.', 60),
      step('Linsen, Kokosmilch und Bouillon zugeben, aufkochen und bei kleiner Hitze weich köcheln lassen.', 15 * 60),
      step('Mit Salz abschmecken und nach Wunsch mit Reis oder Naan servieren.'),
    ],
  },
  {
    key: 'shakshuka',
    name: 'Shakshuka',
    category: 'Vegi',
    servings: 2,
    timeMin: 25,
    ingredients: [
      ing('Eier', 4, 'Stück'),
      ing('Pelati', 400, 'g'),
      ing('Zwiebeln', 1, 'Stück'),
      ing('Peperoni', 1, 'Stück'),
      ing('Knoblauch', 2, 'Zehen'),
      ing('Paprikapulver', 1, 'TL'),
      ing('Kreuzkümmel', 1, 'TL'),
      ing('Olivenöl', 2, 'EL'),
      ing('Salz', null, '', true),
      ing('Pfeffer', null, '', true),
    ],
    steps: [
      step('Zwiebeln, Peperoni und Knoblauch in feine Streifen bzw. Würfel schneiden.'),
      step('Olivenöl in einer weiten Pfanne erhitzen, Gemüse weich dünsten.', 7 * 60),
      step('Gewürze zugeben und kurz mitrösten, dann Pelati zugeben und einköcheln lassen.', 10 * 60),
      step('Mit einem Löffel vier Mulden formen und je ein Ei hineingleiten lassen.'),
      step('Zugedeckt garen, bis das Eiweiss gestockt und das Eigelb noch weich ist.', 6 * 60),
      step('Mit Salz und Pfeffer würzen und direkt aus der Pfanne servieren.'),
    ],
  },
];

interface DishSeed {
  name: string;
  category: Dish['category'];
  recipeKey?: string;
}

const DISH_SEEDS: DishSeed[] = [
  { name: 'Poulet mit Brokkoli und Reis', category: 'high-protein', recipeKey: 'poulet-brokkoli' },
  { name: 'Ofenlachs mit Süsskartoffeln', category: 'high-protein', recipeKey: 'lachs-ofengemuese' },
  { name: 'Skyr-Bowl mit Beeren', category: 'high-protein' },
  { name: 'Cremige Mac and Cheese', category: 'comfort', recipeKey: 'mac-and-cheese' },
  { name: 'Tomatensuppe mit Basilikum', category: 'comfort', recipeKey: 'tomatensuppe' },
  { name: 'Ofenkartoffeln mit Kräuterquark', category: 'comfort' },
  { name: 'Rotes Linsencurry', category: 'vegi', recipeKey: 'linsencurry' },
  { name: 'Shakshuka', category: 'vegi', recipeKey: 'shakshuka' },
  { name: 'Gebratene Nudeln mit Gemüse', category: 'vegi' },
];

const PANTRY_SEEDS: Array<[string, number | null, string]> = [
  ['Olivenöl', null, ''],
  ['Salz', null, ''],
  ['Pfeffer', null, ''],
  ['Knoblauch', 1, 'Knolle'],
  ['Zwiebeln', 3, 'Stück'],
  ['Sojasauce', null, ''],
  ['Honig', null, ''],
  ['Butter', 250, 'g'],
  ['Milch', 1, 'l'],
  ['Eier', 6, 'Stück'],
];

/** Erzeugt die Startdaten. `now` wird als `updatedAt` fuer alle Eintraege genutzt. */
export function buildSeedData(now = Date.now()): AppData {
  counter = 0;
  const data = emptyData();
  const recipeIdByKey = new Map<string, string>();

  RECIPE_SEEDS.forEach((seed, index) => {
    const id = `seed-r-${seed.key}`;
    recipeIdByKey.set(seed.key, id);
    const recipe: Recipe = {
      id,
      name: seed.name,
      category: seed.category,
      servings: seed.servings,
      timeMin: seed.timeMin,
      image: '',
      ingredients: seed.ingredients,
      steps: seed.steps,
      favorite: false,
      notes: '',
      createdAt: now + index,
      updatedAt: now + index,
    };
    data.recipes[id] = recipe;
  });

  DISH_SEEDS.forEach((seed, index) => {
    const id = `seed-d-${index + 1}`;
    const dish: Dish = {
      id,
      name: seed.name,
      category: seed.category,
      image: '',
      recipeId: seed.recipeKey ? (recipeIdByKey.get(seed.recipeKey) ?? null) : null,
      favorite: false,
      notes: '',
      createdAt: now + index,
      updatedAt: now + index,
    };
    data.dishes[id] = dish;
  });

  PANTRY_SEEDS.forEach(([name, amount, unit], index) => {
    const id = `seed-p-${index + 1}`;
    const item: PantryItem = {
      id,
      name,
      amount,
      unit,
      inCart: false,
      createdAt: now + index,
      updatedAt: now + index,
    };
    data.pantry[id] = item;
  });

  return data;
}
