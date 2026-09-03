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
  {
    key: 'marry-me-chicken-orzo',
    name: 'Marry me Chicken Orzo',
    category: 'High-Protein',
    servings: 4,
    timeMin: 30,
    ingredients: [
      ing('Hähnchenbrust (in Stücke geschnitten)', 500, 'g'),
      ing('Knoblauch (gehackt)', 4, 'Zehen'),
      ing('Olivenöl', 2, 'EL'),
      ing('Getrocknete Tomaten in Öl (gehackt)', 80, 'g'),
      ing('Orzo', 190, 'g'),
      ing('Hühnerbrühe', 480, 'ml'),
      ing('Kokoscreme', 200, 'ml'),
      ing('Frischer Spinat', 60, 'g'),
      ing('Chiliflocken', 0.5, 'TL'),
      ing('Getrockneter Oregano', 1, 'TL'),
      ing('Salz', 1, 'TL'),
      ing('Schwarzer Pfeffer', 0.5, 'TL'),
      ing('Parmesan gerieben (optional)', 30, 'g'),
    ],
    steps: [
      step(
        'Olivenöl in einer grossen Pfanne bei mittlerer bis hoher Hitze erhitzen. Hähnchen mit Salz und Pfeffer würzen, dazugeben und anbraten, bis es leicht gebräunt ist.',
        5 * 60,
      ),
      step('Knoblauch dazugeben und mitbraten, bis er duftet.', 60),
      step('Getrocknete Tomaten, Chiliflocken und Oregano unterrühren.'),
      step(
        'Orzo dazugeben und mit der Brühe aufgiessen. Aufkochen lassen, dann Hitze reduzieren und köcheln lassen, bis der Orzo weich ist und die Flüssigkeit grösstenteils aufgesogen ist. Gelegentlich umrühren, damit nichts ansetzt.',
        10 * 60,
      ),
      step('Kokoscreme einrühren, bis alles schön cremig ist.'),
      step('Spinat handvollweise unterrühren, bis er zusammenfällt.'),
      step('Mit Salz und Pfeffer abschmecken, nach Belieben mit Parmesan bestreuen und servieren.'),
    ],
  },
  {
    key: 'gyoza',
    name: 'Gyoza mit Hackfleisch & Gemüse',
    category: 'Comfort',
    servings: 4,
    timeMin: 40,
    ingredients: [
      ing('Gyoza-Teigblätter', 30, 'Stück'),
      ing('Schweinehackfleisch (alternativ Rind oder Poulet)', 300, 'g'),
      ing('Weisskohl (sehr fein gehackt)', 150, 'g'),
      ing('Karotte (fein gerieben)', 1, 'Stück'),
      ing('Frühlingszwiebeln', 2, 'Stück'),
      ing('Knoblauch', 2, 'Zehen'),
      ing('Ingwer', 2, 'cm'),
      ing('Sojasauce', 2, 'EL'),
      ing('Sesamöl', 1, 'EL'),
      ing('Reisessig', 1, 'TL'),
      ing('Speisestärke (optional, macht die Füllung saftiger)', 1, 'TL'),
      ing('Pfeffer', null, '', true),
    ],
    steps: [
      step('Den fein gehackten Kohl leicht salzen und ziehen lassen.', 10 * 60),
      step('Kohl anschliessend gut ausdrücken, damit die Füllung nicht zu feucht wird.'),
      step('Alle Zutaten gründlich miteinander vermengen.'),
      step('Die Füllung roh in die Gyoza geben – sie gart später beim Braten und Dämpfen.'),
    ],
  },
  {
    key: 'spinat-feta-taschen',
    name: 'Spinat-Feta-Blätterteig-Taschen',
    category: 'Vegi',
    servings: 4,
    timeMin: 45,
    ingredients: [
      ing('Blätterteig', 640, 'g'),
      ing('Gefrorener Spinat', 550, 'g'),
      ing('Feta', 200, 'g'),
      ing('Zwiebel', 1, 'Stück'),
      ing('Knoblauch', 1, 'Zehe'),
      ing('Ei (für die Füllung)', 1, 'Stück'),
      ing('Ei (zum Bestreichen)', 1, 'Stück'),
      ing('Salz', null, '', true),
      ing('Pfeffer', null, '', true),
      ing('Muskat', null, '', true),
      ing('Parmesan (optional)', null, '', true),
    ],
    steps: [
      step('Spinat auftauen und wirklich sehr gut ausdrücken. Das ist wichtig!'),
      step('Zwiebel und Knoblauch fein hacken und kurz anbraten.'),
      step(
        'Spinat dazugeben, mit Salz, Pfeffer und Muskat würzen und braten, damit möglichst viel Flüssigkeit verdampft.',
        5 * 60,
      ),
      step('Spinat etwas abkühlen lassen.'),
      step('Feta zerbröseln und ein Ei unter die Spinatmasse mischen.'),
      step('Beide Blätterteigrollen ausrollen und in ungefähr 8 × 8 cm grosse Quadrate schneiden.'),
      step('Jeweils einen gut gehäuften Esslöffel Füllung in die Mitte geben.'),
      step('Zu einem Dreieck zusammenklappen und die Ränder mit einer Gabel festdrücken.'),
      step('Mit verquirltem Ei bestreichen.'),
      step('Bei 200 °C Ober-/Unterhitze backen, bis sie schön goldbraun sind (20–25 Minuten).', 20 * 60),
    ],
  },
  {
    key: 'rotes-linsen-dal',
    name: 'Rotes Linsen-Dal',
    category: 'Vegi',
    servings: 4,
    timeMin: 35,
    ingredients: [
      ing('Kokosöl', 2, 'EL'),
      ing('Zwiebeln (fein gehackt)', 2, 'Stück'),
      ing('Knoblauch (fein gehackt)', 4, 'Zehen'),
      ing('Frischer Ingwer (fein gehackt)', 2, 'TL'),
      ing('Kurkuma', 1, 'TL'),
      ing('Korianderpulver', 1, 'TL'),
      ing('Kreuzkümmel', 1, 'TL'),
      ing('Paprikapulver', 1, 'TL'),
      ing('Garam Masala oder Currypulver', 1, 'TL'),
      ing('Rote Linsen', 300, 'g'),
      ing('Gemüsebouillon', 780, 'ml'),
      ing('Kokosmilch', 240, 'ml'),
      ing('Passierte oder gehackte Tomaten (optional)', 240, 'ml'),
      ing('Salz', null, '', true),
      ing('Pfeffer', null, '', true),
      ing('Kokosblütenzucker', 2, 'TL'),
      ing('Limetten- oder Zitronensaft', 3, 'EL'),
      ing('Pflanzlicher Joghurt (zum Servieren)', null, '', true),
      ing('Petersilie oder Koriander (zum Servieren)', null, '', true),
      ing('Sesam (zum Servieren)', null, '', true),
      ing('Reis (zum Servieren)', null, '', true),
    ],
    steps: [
      step('Öl in einem grossen Topf erhitzen. Zwiebeln hineingeben und anbraten, bis sie glasig sind.', 150),
      step('Knoblauch und Ingwer hinzufügen und mitbraten, bis es schön duftet.', 60),
      step(
        'Kurkuma, Koriander, Kreuzkümmel, Paprikapulver und Garam Masala dazugeben und ein paar Sekunden mitrösten. Dadurch entfalten die Gewürze ihr Aroma.',
      ),
      step('Die roten Linsen in einem Sieb unter kaltem Wasser gut abspülen, in den Topf geben und alles vermischen.'),
      step(
        'Gemüsebouillon dazugeben und aufkochen lassen. Dann die Hitze reduzieren, Deckel drauf und köcheln lassen. Zwischendurch umrühren.',
        8 * 60,
      ),
      step(
        'Kokosmilch und nach Wunsch die Tomaten unterrühren und weiter köcheln lassen, bis die Linsen weich und cremig sind. Wird das Dal zu dick, einfach noch etwas Bouillon oder Kokosmilch dazugeben.',
        5 * 60,
      ),
      step(
        'Mit Salz und Pfeffer würzen, dann Kokosblütenzucker und Zitronen- oder Limettensaft dazugeben. Gerade der Saft ist wichtig, weil er dem cremigen Dal Frische gibt.',
      ),
    ],
  },
  {
    key: 'lachs-honig-senf',
    name: 'Lachs im Ofen mit Honig-Senf',
    category: 'High-Protein',
    servings: 2,
    timeMin: 20,
    ingredients: [
      ing('Lachsfilet', 2, 'Stück'),
      ing('Honig', 1, 'EL'),
      ing('Senf', 1, 'EL'),
      ing('Olivenöl', 1, 'EL'),
      ing('Zitrone (optional)', 1, 'Stück'),
      ing('Salz', null, '', true),
      ing('Pfeffer', null, '', true),
    ],
    steps: [
      step('Ofen auf 180 °C Ober-/Unterhitze vorheizen (Umluft 160 °C).'),
      step('Lachs auspacken und trocken tupfen.'),
      step('Honig, Senf und Olivenöl verrühren, mit Salz und Pfeffer würzen und den Lachs damit einstreichen.'),
      step('Lachs mit der Hautseite nach unten auf Backpapier legen. Nach Belieben Zitronenscheiben darauflegen.'),
      step('Auf der mittleren Schiene backen, je nach Dicke 12–15 Minuten.', 12 * 60),
    ],
  },
  {
    key: 'halloumiburger',
    name: 'Halloumiburger mit Honig-Senf-Sauce',
    category: 'Vegi',
    servings: 2,
    timeMin: 25,
    ingredients: [
      ing('Halloumi', 250, 'g'),
      ing('Rote Zwiebel', 0.5, 'Stück'),
      ing('Zucchini', 0.25, 'Stück'),
      ing('Burgerbrötchen', 2, 'Stück'),
      ing('Radicchio', 2, 'Blätter'),
      ing('Minze', 1, 'Zweig'),
      ing('Pflanzenöl (zum Braten)', null, '', true),
      ing('Pflanzenöl (für die Marinade)', 25, 'ml'),
      ing('Currypulver (für die Marinade)', 0.5, 'TL'),
      ing('Senf (für die Sauce)', 50, 'g'),
      ing('Zucker (für die Sauce)', 15, 'g'),
      ing('Honig (für die Sauce)', 5, 'g'),
      ing('Pflanzenöl (für die Sauce)', 62.5, 'ml'),
      ing('Salz', null, '', true),
      ing('Pfeffer', null, '', true),
    ],
    steps: [],
  },
];

/** Zusatzhinweise, die nicht in einen Zubereitungsschritt gehoeren. */
const RECIPE_NOTES: Record<string, string> = {
  'spinat-feta-taschen':
    'Die Taschen eher klein machen: dann werden sie richtig knusprig, und aus 640 g Blätterteig ergeben sich ungefähr 16–20 Stück.',
};

/**
 * Rezepte, die nach dem ersten Aufsetzen dazugekommen sind. Ein bereits
 * bestehender Datenraum bekommt sie nicht automatisch – dafuer gibt es
 * `npm run add-recipes` (siehe README).
 */
export const LATER_RECIPE_KEYS = [
  'marry-me-chicken-orzo',
  'gyoza',
  'spinat-feta-taschen',
  'rotes-linsen-dal',
  'lachs-honig-senf',
  'halloumiburger',
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
    const note = RECIPE_NOTES[seed.key] ?? '';
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
      notes: note,
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
