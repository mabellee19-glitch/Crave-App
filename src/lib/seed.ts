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
  /** Was vor dem Kochen geschnitten und bereitgelegt wird (siehe lib/prep). */
  prep: string[];
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
    prep: [
      'Reis in einem Sieb kalt abspülen',
      'Poulet in mundgerechte Streifen schneiden, salzen und pfeffern',
      'Knoblauch fein hacken',
      'Brokkoli in Röschen teilen, den Strunk schälen und in Scheiben schneiden',
      'Sojasauce und Honig in einer Tasse verrühren',
    ],
    steps: [
      step('Reis mit der doppelten Menge Wasser und etwas Salz aufsetzen und zugedeckt köcheln lassen.', 15 * 60),
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
    prep: [
      'Ofen auf 200 °C Ober-/Unterhitze vorheizen',
      'Süsskartoffeln schälen und in gleichmässige Spalten schneiden',
      'Knoblauch fein hacken',
      'Zitrone halbieren: eine Hälfte auspressen, die andere in Spalten schneiden',
    ],
    steps: [
      step('Süsskartoffeln mit Olivenöl, Salz und Pfeffer mischen, auf einem Blech verteilen und im Ofen vorbacken.', 20 * 60),
      step('Lachs salzen, pfeffern und mit Zitronensaft, Knoblauch und Honig bestreichen.'),
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
    // Nichts zu schneiden – die Vorbereitung ist hier nur das Abmessen.
    prep: [],
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
    prep: ['Zwiebeln und Knoblauch fein hacken', 'Basilikumblätter abzupfen'],
    steps: [
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
    prep: ['Linsen in einem Sieb kalt abspülen', 'Zwiebeln, Knoblauch und Ingwer fein hacken'],
    steps: [
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
    prep: ['Zwiebeln und Peperoni in feine Streifen schneiden', 'Knoblauch fein würfeln'],
    steps: [
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
    prep: [
      'Hähnchenbrust in Stücke schneiden und mit Salz und Pfeffer würzen',
      'Knoblauch hacken',
      'Getrocknete Tomaten hacken',
    ],
    steps: [
      step(
        'Olivenöl in einer grossen Pfanne bei mittlerer bis hoher Hitze erhitzen. Hähnchen darin leicht bräunen.',
        5 * 60,
      ),
      step('Knoblauch dazugeben und mitbraten, bis er duftet.', 60),
      step('Getrocknete Tomaten, Chiliflocken und Oregano unterrühren.'),
      step('Orzo dazugeben, mit der Brühe aufgiessen und aufkochen.'),
      step(
        'Hitze reduzieren und köcheln, bis der Orzo weich und die Brühe fast aufgesogen ist. Ab und zu umrühren.',
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
    prep: [
      'Weisskohl sehr fein hacken',
      'Karotte fein reiben',
      'Frühlingszwiebeln in feine Ringe schneiden',
      'Knoblauch und Ingwer fein hacken',
    ],
    steps: [
      step('Den Kohl leicht salzen und ziehen lassen.', 10 * 60),
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
    prep: [
      'Spinat auftauen und wirklich sehr gut ausdrücken – das ist wichtig!',
      'Zwiebel und Knoblauch fein hacken',
      'Feta zerbröseln',
      'Ei zum Bestreichen in einer Tasse verquirlen',
    ],
    steps: [
      step('Zwiebel und Knoblauch kurz anbraten.'),
      step(
        'Spinat dazugeben, mit Salz, Pfeffer und Muskat würzen und braten, damit möglichst viel Flüssigkeit verdampft.',
        5 * 60,
      ),
      step('Spinat etwas abkühlen lassen.'),
      step('Feta und ein Ei unter die Spinatmasse mischen.'),
      step('Backofen auf 200 °C Ober-/Unterhitze vorheizen.'),
      step('Beide Blätterteigrollen ausrollen und in ungefähr 8 × 8 cm grosse Quadrate schneiden.'),
      step('Jeweils einen gut gehäuften Esslöffel Füllung in die Mitte geben.'),
      step('Zu einem Dreieck zusammenklappen und die Ränder mit einer Gabel festdrücken.'),
      step('Mit dem verquirlten Ei bestreichen.'),
      step('Im Ofen backen, bis sie schön goldbraun sind (20–25 Minuten).', 20 * 60),
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
    prep: [
      'Zwiebeln, Knoblauch und Ingwer fein hacken',
      'Die roten Linsen in einem Sieb unter kaltem Wasser gut abspülen',
      'Kurkuma, Koriander, Kreuzkümmel, Paprikapulver und Garam Masala in einer kleinen Schale bereitstellen – sie kommen zusammen in den Topf',
      'Limette oder Zitrone auspressen',
    ],
    steps: [
      step('Öl in einem grossen Topf erhitzen. Zwiebeln hineingeben und anbraten, bis sie glasig sind.', 150),
      step('Knoblauch und Ingwer hinzufügen und mitbraten, bis es schön duftet.', 60),
      step(
        'Die Gewürze dazugeben und ein paar Sekunden mitrösten. Dadurch entfalten sie ihr Aroma.',
      ),
      step('Die Linsen in den Topf geben und alles vermischen.'),
      step(
        'Gemüsebouillon dazugeben und aufkochen. Hitze reduzieren und zugedeckt köcheln, ab und zu umrühren.',
        8 * 60,
      ),
      step(
        'Kokosmilch und nach Wunsch die Tomaten unterrühren. Köcheln, bis die Linsen weich und cremig sind.',
        5 * 60,
      ),
      step('Zu dick? Etwas Bouillon oder Kokosmilch einrühren.'),
      step(
        'Mit Salz, Pfeffer, Kokosblütenzucker und Zitronen- oder Limettensaft abschmecken. Der Saft macht das Dal frisch.',
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
    prep: [
      'Ofen auf 180 °C Ober-/Unterhitze vorheizen (Umluft 160 °C)',
      'Lachs auspacken und trocken tupfen',
      'Honig, Senf und Olivenöl verrühren und mit Salz und Pfeffer würzen',
      'Nach Belieben Zitrone in Scheiben schneiden',
    ],
    steps: [
      step('Den Lachs mit der Honig-Senf-Mischung einstreichen.'),
      step('Lachs mit der Hautseite nach unten auf Backpapier legen. Nach Belieben Zitronenscheiben darauflegen.'),
      step('Auf der mittleren Schiene backen, je nach Dicke 12–15 Minuten.', 12 * 60),
    ],
  },
  {
    key: 'halloumiburger',
    name: 'Halloumiburger mit Honig-Senf-Sauce',
    category: 'Vegi',
    servings: 2,
    // Die Marinierzeit macht den grössten Teil aus.
    timeMin: 60,
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
    prep: [
      'Zwiebel in Ringe schneiden',
      'Halloumi und Zucchini in Scheiben schneiden',
      'Burgerbrötchen halbieren',
      'Radicchio und Minze waschen und trocken tupfen',
    ],
    steps: [
      step(
        'Für die Marinade Pflanzenöl, Currypulver, Salz und Pfeffer in einem verschliessbaren Beutel mischen. Halloumi dazugeben.',
      ),
      step('Im Kühlschrank 30–60 Minuten marinieren.', 30 * 60),
      step(
        'Zucchinischeiben in Öl braten, bis sie auf jeder Seite goldbraun und weich sind. Mit Salz und Pfeffer würzen.',
        2 * 60,
      ),
      step(
        'Backofen auf 200 °C vorheizen. Senf, Zucker und Honig in einer grossen Schüssel vermischen.',
      ),
      step(
        'Unter ständigem Schlagen langsam das restliche Öl zugiessen, bis die Sauce cremig ist. Salzen und pfeffern.',
      ),
      step(
        'Burgerbrötchen auf ein mit Backpapier belegtes Blech legen und im vorgeheizten Ofen rösten.',
        4 * 60,
      ),
      step('Halloumi pro Seite braten, bis er leicht gebräunt ist.', 2 * 60),
      step(
        'Brötchen mit Sauce bestreichen. Radicchio, Halloumi, Gemüse und Minze darauf schichten, mit Sauce abschliessen.',
      ),
    ],
  },
  {
    key: 'thunfisch-pasta',
    name: 'Pasta mit Thunfisch, Cherrytomaten & Zitrone',
    category: 'Comfort',
    servings: 2,
    timeMin: 20,
    ingredients: [
      ing('Pasta (Spaghetti oder Penne)', 200, 'g'),
      ing('Thunfisch aus der Dose, abgetropft', 150, 'g'),
      ing('Cherrytomaten', 250, 'g'),
      ing('Knoblauch', 2, 'Zehen'),
      ing('Olivenöl', 3, 'EL'),
      ing('Kapern', 1, 'EL'),
      ing('Chiliflocken', 0.25, 'TL'),
      ing('Bio-Zitrone', 0.5, 'Stück'),
      ing('Petersilie oder Basilikum', 1, 'Handvoll'),
      ing('Salz', 0.5, 'TL'),
      ing('Pfeffer', 0.25, 'TL'),
    ],
    prep: [
      'Knoblauch in Scheiben schneiden',
      'Cherrytomaten halbieren',
      'Thunfisch abtropfen lassen',
      'Von der Zitrone die Schale abreiben und den Saft auspressen',
      'Kräuter grob hacken',
    ],
    steps: [
      step(
        'Pasta in kräftig gesalzenem Wasser al dente kochen. Vor dem Abgiessen eine Tasse Pastawasser beiseitestellen.',
      ),
      step('Während die Pasta kocht, das Olivenöl in einer grossen Pfanne erhitzen.'),
      step(
        'Knoblauch und Chiliflocken bei mittlerer Hitze anschwitzen, bis es duftet. Der Knoblauch soll nicht braun werden.',
      ),
      step(
        'Cherrytomaten dazugeben und bei mittlerer bis hoher Hitze schmoren, bis sie aufplatzen. Leicht andrücken, damit Saft austritt.',
      ),
      step(
        'Thunfisch und Kapern dazugeben, den Thunfisch grob zerpflücken und kurz mitwärmen.',
      ),
      step(
        'Pasta mit einem Schuss Pastawasser in die Pfanne geben und schwenken, bis die Sauce leicht sämig ist.',
      ),
      step(
        'Mit Zitronenabrieb, Zitronensaft, Kräutern, Salz und Pfeffer abschmecken. Sofort servieren.',
      ),
    ],
  },
  {
    key: 'one-pot-orzo',
    name: 'One-Pot-Orzo mit Zucchini, Tomaten, weissen Bohnen & Feta',
    category: 'Comfort',
    servings: 4,
    timeMin: 25,
    ingredients: [
      ing('Orzo', 300, 'g'),
      ing('Zucchini', 250, 'g'),
      ing('Cherrytomaten', 250, 'g'),
      ing('Weisse Bohnen (Cannellini), abgetropft', 240, 'g'),
      ing('Babyspinat', 100, 'g'),
      ing('Feta', 150, 'g'),
      ing('Gemüsebouillon, heiss', 850, 'ml'),
      ing('Zwiebel', 1, 'Stück'),
      ing('Knoblauch', 3, 'Zehen'),
      ing('Zitrone', 1, 'Stück'),
      ing('Olivenöl', 2, 'EL'),
      ing('Oregano getrocknet', 1, 'TL'),
      ing('Chiliflocken', 0.5, 'TL'),
      ing('Pfeffer', 0.5, 'TL'),
      ing('Basilikum oder Dill', 2, 'EL'),
    ],
    prep: [
      'Zwiebel und Knoblauch fein hacken',
      'Zucchini würfeln',
      'Cherrytomaten halbieren',
      'Weisse Bohnen abtropfen lassen',
      'Bouillon erhitzen',
      'Von der Zitrone die Schale abreiben und den Saft auspressen',
      'Feta zerbröseln und die Kräuter hacken',
    ],
    steps: [
      step(
        'Olivenöl in einem grossen, weiten Topf bei mittlerer Hitze erwärmen. Zwiebel darin weich und glasig dünsten.',
      ),
      step(
        'Knoblauch, Oregano und Chiliflocken kurz mitbraten, bis es duftet. Der Knoblauch soll nicht braun werden.',
      ),
      step('Zucchini dazugeben und unter Rühren braten, bis sie weich werden und etwas Farbe nehmen.'),
      step(
        'Orzo dazugeben und umrühren, bis er vom Öl überzogen ist. Kurz mitrösten, das gibt mehr Geschmack.',
      ),
      step('Cherrytomaten und die heisse Bouillon dazugeben und aufkochen.'),
      step(
        'Offen auf kleiner Hitze köcheln, bis der Orzo weich und fast alles aufgesogen ist. Oft rühren, bei Bedarf etwas Wasser zugeben.',
      ),
      step('Weisse Bohnen unterrühren und warm werden lassen.'),
      step(
        'Topf vom Herd nehmen. Babyspinat unterrühren, bis er zusammenfällt, dann Zitronenabrieb, -saft und Pfeffer dazugeben.',
      ),
      step(
        'Die Hälfte des Fetas unterrühren, bis alles cremig ist. Abschmecken und nur salzen, falls nötig.',
      ),
      step('Restlichen Feta und die Kräuter darüberstreuen und 2 Minuten ruhen lassen.', 2 * 60),
    ],
  },
];

/**
 * Fingerabdruecke der Schritte, wie sie vor der Vorbereitung ausgeliefert
 * wurden – je Rezept alle Fassungen, die es je gab. Steht ein Rezept noch
 * genau so da, bekommt es die neuen Schritte, aus denen das Schneiden in die
 * Vorbereitung gewandert ist. Wer die Schritte selbst geaendert hat, behaelt
 * sie; dort kommt nur die Vorbereitung dazu.
 */
export const SCHRITTE_VOR_DER_VORBEREITUNG: Record<string, string[]> = {
  'seed-r-poulet-brokkoli': ['7-nvffl8'],
  'seed-r-lachs-ofengemuese': ['6-o8uhd'],
  'seed-r-mac-and-cheese': ['5-b1h2cu'],
  'seed-r-tomatensuppe': ['5-13pjnlb'],
  'seed-r-linsencurry': ['5-547blr'],
  'seed-r-shakshuka': ['6-1vp5a90'],
  'seed-r-marry-me-chicken-orzo': ['7-1nb3npd'],
  'seed-r-gyoza': ['4-zscxgj'],
  'seed-r-spinat-feta-taschen': ['10-1m0gx76'],
  'seed-r-rotes-linsen-dal': ['7-jgv1ay'],
  'seed-r-lachs-honig-senf': ['5-k5j88f'],
  'seed-r-halloumiburger': ['8-13hlq0u'],
  'seed-r-thunfisch-pasta': ['5-1a7ma3p'],
  'seed-r-one-pot-orzo': ['8-1wz65w0'],
};

/**
 * Fingerabdruecke der Schritte, wie sie vor dem Kuerzen ausgeliefert wurden.
 * Steht ein mitgeliefertes Rezept noch genau so da, bekommt es die neuen, von
 * Hand gekuerzten Schritte. Wer die Schritte selbst geaendert hat, behaelt
 * sie – dort teilt die Kuerzung nach Regeln nur, was zu lang ist.
 */
export const SCHRITTE_VOR_DEM_KUERZEN: Record<string, string[]> = {
  'seed-r-marry-me-chicken-orzo': ['7-m723gq'],
  'seed-r-rotes-linsen-dal': ['7-uj1ud1'],
  'seed-r-halloumiburger': ['7-1bj4nm3'],
  'seed-r-thunfisch-pasta': ['5-1s3t2bt'],
  'seed-r-one-pot-orzo': ['8-w5zhx6'],
};

/** Zusatzhinweise, die nicht in einen Zubereitungsschritt gehoeren. */
const RECIPE_NOTES: Record<string, string> = {
  'one-pot-orzo':
    'Erst ganz am Schluss abschmecken – Bouillon und Feta sind beide salzig. Reste halten sich 3–4 Tage im Kühlschrank; beim Aufwärmen einen Schuss Wasser oder Bouillon zugeben, weil der Orzo weiter Flüssigkeit zieht. Eine 400-g-Dose Bohnen ergibt abgetropft rund 240 g.',
  'thunfisch-pasta':
    'Schnelle Vorratsküchen-Pasta, frisch und leicht scharf. Tipp: Thunfisch in Olivenöl nehmen und einen Teil des Öls aus der Dose anstelle von frischem Olivenöl verwenden, das gibt mehr Geschmack. Passt auch dazu: schwarze Oliven, eine Handvoll Rucola am Schluss oder knusprig geröstete Paniermehl-Brösel (Pangrattato) als Topping. Parmesan ist in Italien bei Fischpasta eher unüblich, aber erlaubt ist, was schmeckt.',
  halloumiburger:
    'Zubereitung nach Kitchen Stories, angepasst an diese Zutatenliste: dort sind es vier Portionen mit Aubergine, hier zwei ohne. Die Marinierzeit von 30–60 Minuten steckt in der Zubereitungszeit.',
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
  'thunfisch-pasta',
  'one-pot-orzo',
];

interface DishSeed {
  name: string;
  category: Dish['category'];
  recipeKey?: string;
  /**
   * Eigene Zutaten des Gerichts. Nur was ausdruecklich genannt wurde – ohne
   * Menge, wo keine angegeben war. Erfundene Mengen waeren auf einer
   * Einkaufsliste schlimmer als gar keine.
   */
  ingredients?: Array<{ name: string; amount?: number | null; unit?: string }>;
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
  {
    name: 'Blumenkohl Wraps',
    category: 'vegi',
    ingredients: [
      { name: 'Blumenkohl', amount: 250, unit: 'g' },
      { name: 'Kichererbsen', amount: 1, unit: 'Dose' },
      { name: 'Avocado', amount: 1, unit: 'Stück' },
      { name: 'Wraps', amount: 1, unit: 'Pck' },
      { name: 'Griechischer Joghurt' },
    ],
  },
  {
    name: 'Cous Cous mit Gemüsepfanne und Gyoza',
    category: 'comfort',
    ingredients: [
      { name: 'Couscous' },
      { name: 'Karotten' },
      { name: 'Lauch' },
      { name: 'Peperoni' },
      { name: 'Gyoza' },
    ],
  },
  {
    name: 'Brokkoli, Kartoffeln, Süsskartoffeln und Halloumi',
    category: 'vegi',
    ingredients: [
      { name: 'Brokkoli' },
      { name: 'Kartoffeln' },
      { name: 'Süsskartoffeln' },
      { name: 'Halloumi' },
    ],
  },
  { name: 'Flammkuchen', category: 'comfort' },
  { name: 'Fried Rice', category: 'comfort' },
  {
    name: 'Crispy One-Blech-Gnocchi mit Ofengemüse',
    category: 'vegi',
    ingredients: [
      { name: 'Gnocchi' },
      { name: 'Ofengemüse' },
      { name: 'Linsen vorgekocht' },
      { name: 'Griechischer Joghurt' },
      { name: 'Zitrone' },
    ],
  },
];

/**
 * Vorschlagsliste für die Grundliste, nach Rubriken geordnet.
 *
 * Dient zweierlei: einem neuen Datenraum als Startinhalt, und einem bereits
 * benutzten als Vorlage zum Nachtragen (siehe `addPantrySuggestions` im
 * Store). Der Abgleich läuft dabei über den Namen, nicht über die Id.
 */
export interface PantrySuggestion {
  name: string;
  amount?: number;
  unit?: string;
}

export interface PantryGroup {
  category: string;
  items: PantrySuggestion[];
}

export const PANTRY_CATALOGUE: PantryGroup[] = [
  {
    category: 'Protein',
    items: [
      { name: 'Eier', amount: 10, unit: 'Stück' },
      { name: 'Hüttenkäse' },
      { name: 'Gekochte Eier' },
      { name: 'Poulet' },
      { name: 'Lean Hackfleisch' },
      { name: 'Chicken Jerky' },
      { name: 'Hummus' },
    ],
  },
  {
    category: 'Frisches Gemüse/Früchte',
    items: [
      { name: 'Zucchini' },
      { name: 'Peperoni' },
      { name: 'Cherrytomaten' },
      { name: 'Blumenkohl' },
      { name: 'Zitrone' },
      { name: 'Zwiebeln', amount: 3, unit: 'Stück' },
      { name: 'Knoblauch', amount: 1, unit: 'Knolle' },
      { name: 'Avocado' },
      { name: 'Rüebli' },
    ],
  },
  {
    category: 'Dosenware',
    items: [
      { name: 'Mais' },
      { name: 'Red Beans' },
      { name: 'Black Lentils' },
      { name: 'White Beans' },
      { name: 'Apfelmus' },
      { name: 'Tomatensauce Pizza' },
    ],
  },
  {
    category: 'Im Glas',
    items: [
      { name: 'Tomatensauce Pasta' },
      { name: 'Essiggurken' },
      { name: 'Eingelegte Tomaten' },
      { name: 'Oliven' },
    ],
  },
  {
    category: 'Zmorge',
    items: [
      { name: 'High-Protein Yogurt' },
      { name: 'Haferflocken' },
      { name: 'Chia-Samen' },
      { name: 'Datteln' },
      { name: 'Bananen' },
    ],
  },
  {
    category: 'Einfrieren',
    items: [
      { name: 'Burger Patties' },
      { name: 'Gefrorenes Gemüse' },
      { name: 'Sweet Potato Fries (selber machen)' },
      { name: 'Spinat' },
      { name: 'Gyozas' },
      { name: 'Fischstäbli' },
      { name: 'Beeren' },
    ],
  },
  {
    category: 'Carbs',
    items: [
      { name: 'Protein Pasta' },
      { name: 'Reis' },
      { name: 'Kartoffeln' },
      { name: 'Orzo' },
      { name: 'Spaghetti' },
      { name: 'Cous Cous' },
    ],
  },
  {
    // Die Grundzutaten, die vorher schon in der Liste standen und in keine
    // der vorgegebenen Rubriken fallen.
    category: 'Vorrat',
    items: [
      { name: 'Olivenöl' },
      { name: 'Salz' },
      { name: 'Pfeffer' },
      { name: 'Sojasauce' },
      { name: 'Honig' },
      { name: 'Butter', amount: 250, unit: 'g' },
      { name: 'Milch', amount: 1, unit: 'l' },
    ],
  },
];

/**
 * Umbenannte Rubriken: alter Name -> heutiger Name.
 *
 * Bestehende Datenräume tragen die alten Namen noch in ihren Einträgen. Ohne
 * diese Zuordnung stünden sie in einer zweiten Gruppe neben der neuen.
 */
export const PANTRY_CATEGORY_RENAMES: Record<string, string> = {
  'Frisches Gemüse': 'Frisches Gemüse/Früchte',
};

/** Reihenfolge der Rubriken in der Anzeige. */
export const PANTRY_CATEGORY_ORDER = PANTRY_CATALOGUE.map((group) => group.category);

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
      ingredients: seed.ingredients,
      prep: seed.prep,
      steps: seed.steps,
      // Von Hand kurz geschrieben – die Kuerzung beim Start hat hier nichts zu tun.
      kuerzung: 'regeln',
      cookNext: false,
      notes: note,
      createdAt: now + index,
      updatedAt: now + index,
    };
    data.recipes[id] = recipe;
  });

  DISH_SEEDS.forEach((seed, index) => {
    // Die Id haengt an der Position. Wer ein Gericht mitten in DISH_SEEDS
    // einfuegt, verschiebt alle folgenden Ids - der Abgleich laeuft deshalb
    // ueberall ueber den Namen, nicht ueber die Id.
    const id = `seed-d-${index + 1}`;
    const dish: Dish = {
      id,
      name: seed.name,
      category: seed.category,
      recipeId: seed.recipeKey ? (recipeIdByKey.get(seed.recipeKey) ?? null) : null,
      ingredients: (seed.ingredients ?? []).map((zutat) => ({
        id: `${id}-z${zutat.name}`,
        name: zutat.name,
        amount: zutat.amount ?? null,
        unit: zutat.unit ?? '',
      })),
      cookNext: false,
      notes: '',
      createdAt: now + index,
      updatedAt: now + index,
    };
    data.dishes[id] = dish;
  });

  let pantryIndex = 0;
  for (const group of PANTRY_CATALOGUE) {
    for (const entry of group.items) {
      pantryIndex += 1;
      const id = `seed-p-${pantryIndex}`;
      const item: PantryItem = {
        id,
        name: entry.name,
        amount: entry.amount ?? null,
        unit: entry.unit ?? '',
        category: group.category,
        inCart: false,
        createdAt: now + pantryIndex,
        updatedAt: now + pantryIndex,
      };
      data.pantry[id] = item;
    }
  }

  return data;
}
