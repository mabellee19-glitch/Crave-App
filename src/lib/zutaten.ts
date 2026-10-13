/**
 * Was die App ueber Zutaten weiss – ohne Modell, ohne Netz.
 *
 * Eine Liste gelaeufiger Zutaten mit dem, was man beim Kochen und Einkaufen
 * braucht:
 *
 * - **Einheiten**: Basilikum kauft man im Bund, Tomatensauce in der Dose oder
 *   im Glas. Beim Eintippen einer Zutat schlaegt die App das vor
 *   (`einheitenVorschlaege`).
 * - **Abteilung**: wo die Zutat im Laden steht. Danach ordnet sich die
 *   Einkaufsliste (`abteilungVon`).
 * - **Namen auf Deutsch und Englisch**: fuer die englische Ansicht
 *   (`zutatenName`). Was hier fehlt, uebersetzt die KI.
 *
 * Erkannt wird an Schluesselwoertern in Kleinschrift ohne Umlaute, deutsch und
 * englisch. Das laengste passende Wort gewinnt: "Tomatensauce" ist Sauce,
 * nicht Tomate, "Kokosmilch" kommt in der Dose. Woerter bis drei Buchstaben
 * ("ei", "ol", "tee") zaehlen nur als ganzes Wort, sonst steckte das Ei im
 * Reis.
 */

export type Abteilung =
  | 'gemuese'
  | 'brot'
  | 'fleisch'
  | 'kuehl'
  | 'vorrat'
  | 'gewuerze'
  | 'suesses'
  | 'getraenke'
  | 'tiefkuehl'
  | 'haushalt'
  | 'weitere';

/** In dieser Reihenfolge geht man durch einen Schweizer Laden. */
export const ABTEILUNGEN: Array<{ id: Abteilung; de: string; en: string }> = [
  { id: 'gemuese', de: 'Gemüse & Früchte', en: 'Produce' },
  { id: 'brot', de: 'Brot & Teig', en: 'Bread & Dough' },
  { id: 'fleisch', de: 'Fleisch & Fisch', en: 'Meat & Fish' },
  { id: 'kuehl', de: 'Milch, Käse & Eier', en: 'Dairy & Eggs' },
  { id: 'vorrat', de: 'Vorrat', en: 'Pantry' },
  { id: 'gewuerze', de: 'Gewürze, Öl & Saucen', en: 'Spices, Oils & Sauces' },
  { id: 'suesses', de: 'Süsses & Snacks', en: 'Sweets & Snacks' },
  { id: 'getraenke', de: 'Getränke', en: 'Drinks' },
  { id: 'tiefkuehl', de: 'Tiefkühl', en: 'Frozen' },
  { id: 'haushalt', de: 'Haushalt', en: 'Household' },
  { id: 'weitere', de: 'Weitere', en: 'Other' },
];

export interface Vorschlag {
  amount: number | null;
  unit: string;
}

export interface ZutatWissen {
  /** Schluesselwoerter, normalisiert (siehe `norm`). */
  woerter: string[];
  de: string;
  /** Englisch, Einzahl und Mehrzahl. */
  en: [string, string];
  abteilung: Abteilung;
  vorschlaege: Vorschlag[];
}

/**
 * Ein Eintrag: Schluesselwoerter mit "|" getrennt, deutscher Name, englischer
 * Name ("onion/onions"), Abteilung, Vorschlaege ("1 Bund|1 Handvoll").
 */
function z(woerter: string, de: string, en: string, abteilung: Abteilung, vorschlaege = ''): ZutatWissen {
  const [eins, viele] = en.split('/');
  return {
    woerter: woerter.split('|').map((wort) => wort.trim()).filter(Boolean),
    de,
    en: [eins, viele ?? eins],
    abteilung,
    vorschlaege: vorschlaege
      .split('|')
      .map((teil) => teil.trim())
      .filter(Boolean)
      .map((teil) => {
        const treffer = /^(\d+(?:[.,]\d+)?)\s*(.*)$/.exec(teil);
        return treffer
          ? { amount: Number(treffer[1].replace(',', '.')), unit: treffer[2].trim() }
          : { amount: null, unit: teil };
      }),
  };
}

const WISSEN: ZutatWissen[] = [
  /* --------------------------- Gemuese & Fruechte -------------------------- */
  z('tomate|tomato', 'Tomaten', 'tomato/tomatoes', 'gemuese', '4 Stück|500 g'),
  z('cherrytomate|kirschtomate|datteltomate|cherry tomato|cherry tomatoes', 'Cherrytomaten', 'cherry tomatoes', 'gemuese', '250 g|1 Schale'),
  z('zwiebel|onion', 'Zwiebeln', 'onion/onions', 'gemuese', '1 Stück|2 Stück'),
  z('rote zwiebel|red onion', 'Rote Zwiebeln', 'red onion/red onions', 'gemuese', '1 Stück'),
  z('fruhlingszwiebel|lauchzwiebel|spring onion|scallion|green onion', 'Frühlingszwiebeln', 'spring onions', 'gemuese', '1 Bund|2 Stück'),
  z('schalotte|shallot', 'Schalotten', 'shallot/shallots', 'gemuese', '2 Stück'),
  z('knoblauch|garlic', 'Knoblauch', 'garlic', 'gemuese', '2 Zehen|1 Knolle'),
  z('ingwer|ginger', 'Ingwer', 'ginger', 'gemuese', '1 Stück|1 TL'),
  z('chili|chilischote|peperoncini|chili pepper|chilli', 'Chili', 'chili/chilies', 'gemuese', '1 Stück'),
  z('peperoni|paprika|paprikaschote|bell pepper|capsicum', 'Peperoni', 'bell pepper/bell peppers', 'gemuese', '1 Stück|2 Stück'),
  z('zucchini|zucchetti|courgette', 'Zucchini', 'zucchini/zucchini', 'gemuese', '1 Stück|2 Stück'),
  z('aubergine|eggplant', 'Aubergine', 'eggplant/eggplants', 'gemuese', '1 Stück'),
  z('karotte|ruebli|mohre|carrot', 'Rüebli', 'carrot/carrots', 'gemuese', '2 Stück|3 Stück'),
  z('kartoffel|potato', 'Kartoffeln', 'potato/potatoes', 'gemuese', '500 g|1 kg'),
  z('susskartoffel|sweet potato|sweet potatoes', 'Süsskartoffeln', 'sweet potato/sweet potatoes', 'gemuese', '1 Stück|500 g'),
  z('brokkoli|broccoli', 'Brokkoli', 'broccoli', 'gemuese', '1 Stück'),
  z('blumenkohl|cauliflower', 'Blumenkohl', 'cauliflower', 'gemuese', '1 Stück|500 g'),
  z('spinat|blattspinat|spinach', 'Spinat', 'spinach', 'gemuese', '200 g|1 Handvoll'),
  z('rucola|ruccola|arugula|rocket', 'Rucola', 'arugula', 'gemuese', '1 Handvoll|100 g'),
  z('salat|kopfsalat|eisbergsalat|lettuce', 'Salat', 'lettuce', 'gemuese', '1 Kopf'),
  z('gurke|salatgurke|cucumber', 'Gurke', 'cucumber/cucumbers', 'gemuese', '1 Stück'),
  z('lauch|leek', 'Lauch', 'leek/leeks', 'gemuese', '1 Stange'),
  z('sellerie|stangensellerie|celery', 'Sellerie', 'celery', 'gemuese', '2 Stangen'),
  z('pilz|champignon|mushroom', 'Champignons', 'mushrooms', 'gemuese', '250 g'),
  z('maiskolben|corn on the cob', 'Maiskolben', 'corn on the cob', 'gemuese', '2 Stück'),
  z('grune bohne|green bean|green beans|buschbohne', 'Grüne Bohnen', 'green beans', 'gemuese', '200 g'),
  z('avocado', 'Avocado', 'avocado/avocados', 'gemuese', '1 Stück|2 Stück'),
  z('zitrone|lemon', 'Zitrone', 'lemon/lemons', 'gemuese', '1 Stück'),
  z('limette|lime', 'Limette', 'lime/limes', 'gemuese', '1 Stück'),
  z('orange', 'Orange', 'orange/oranges', 'gemuese', '1 Stück|2 Stück'),
  z('apfel|apple', 'Äpfel', 'apple/apples', 'gemuese', '2 Stück|1 kg'),
  z('birne|pear', 'Birnen', 'pear/pears', 'gemuese', '2 Stück'),
  z('banane|banana', 'Bananen', 'banana/bananas', 'gemuese', '2 Stück|3 Stück'),
  z('beere|berry|berries', 'Beeren', 'berries', 'gemuese', '250 g'),
  z('erdbeere|strawberr', 'Erdbeeren', 'strawberries', 'gemuese', '250 g|500 g'),
  z('himbeere|raspberr', 'Himbeeren', 'raspberries', 'gemuese', '125 g'),
  z('heidelbeere|blaubeere|blueberr', 'Heidelbeeren', 'blueberries', 'gemuese', '125 g'),
  z('traube|grape', 'Trauben', 'grapes', 'gemuese', '500 g'),
  z('mango', 'Mango', 'mango/mangoes', 'gemuese', '1 Stück'),
  z('ananas|pineapple', 'Ananas', 'pineapple', 'gemuese', '1 Stück'),
  z('kurbis|pumpkin|butternut|squash', 'Kürbis', 'pumpkin', 'gemuese', '1 Stück|500 g'),
  z('fenchel|fennel', 'Fenchel', 'fennel', 'gemuese', '1 Stück'),
  z('randen|rote bete|rote beete|beetroot|beet', 'Randen', 'beetroot', 'gemuese', '2 Stück|250 g'),
  z('kohlrabi', 'Kohlrabi', 'kohlrabi', 'gemuese', '1 Stück'),
  z('rotkohl|rotkabis|red cabbage', 'Rotkohl', 'red cabbage', 'gemuese', '1 Kopf'),
  z('weisskohl|kabis|cabbage', 'Kabis', 'cabbage', 'gemuese', '1 Kopf'),
  z('rosenkohl|brussels sprout', 'Rosenkohl', 'brussels sprouts', 'gemuese', '500 g'),
  z('spargel|asparagus', 'Spargel', 'asparagus', 'gemuese', '500 g|1 Bund'),
  z('radieschen|radish', 'Radieschen', 'radishes', 'gemuese', '1 Bund'),
  z('ofengemuse|roasting vegetables', 'Ofengemüse', 'roasting vegetables', 'gemuese', '500 g'),
  z('gemuse|vegetable|veggies', 'Gemüse', 'vegetables', 'gemuese', '500 g'),
  z('basilikum|basil', 'Basilikum', 'basil', 'gemuese', '1 Bund|1 Handvoll'),
  z('petersilie|parsley', 'Petersilie', 'parsley', 'gemuese', '1 Bund'),
  z('koriander|cilantro|coriander', 'Koriander', 'cilantro', 'gemuese', '1 Bund'),
  z('schnittlauch|chives', 'Schnittlauch', 'chives', 'gemuese', '1 Bund'),
  z('dill', 'Dill', 'dill', 'gemuese', '1 Bund'),
  z('minze|pfefferminze|mint', 'Minze', 'mint', 'gemuese', '1 Bund'),
  z('thymian|thyme', 'Thymian', 'thyme', 'gemuese', '3 Zweige|1 TL'),
  z('rosmarin|rosemary', 'Rosmarin', 'rosemary', 'gemuese', '2 Zweige'),
  z('salbei|sage', 'Salbei', 'sage', 'gemuese', '1 Bund'),
  z('krauter|frische krauter|fresh herbs|herbs', 'Kräuter', 'herbs', 'gemuese', '1 Bund'),

  /* ------------------------------ Brot & Teig ------------------------------ */
  z('brot|bread|ruchbrot|vollkornbrot', 'Brot', 'bread', 'brot', '1 Stück'),
  z('toast|toastbrot', 'Toastbrot', 'toast bread', 'brot', '1 Packung'),
  z('brotchen|weggli|burgerbrot|burger bun|bun', 'Brötchen', 'bun/buns', 'brot', '4 Stück'),
  z('wrap|tortilla', 'Wraps', 'wrap/wraps', 'brot', '1 Packung'),
  z('pita|fladenbrot|naan|flatbread', 'Fladenbrot', 'flatbread', 'brot', '4 Stück'),
  z('gipfeli|croissant', 'Gipfeli', 'croissant/croissants', 'brot', '4 Stück'),
  z('blatterteig|puff pastry', 'Blätterteig', 'puff pastry', 'brot', '1 Rolle'),
  z('kuchenteig|murbeteig|shortcrust|pie dough|wahenteig', 'Kuchenteig', 'pie dough', 'brot', '1 Rolle'),
  z('pizzateig|pizza dough', 'Pizzateig', 'pizza dough', 'brot', '1 Rolle'),
  z('flammkuchenteig', 'Flammkuchenteig', 'tarte flambée dough', 'brot', '1 Rolle'),

  /* ---------------------------- Fleisch & Fisch ---------------------------- */
  z('poulet|hahnchen|huhn|chicken', 'Poulet', 'chicken', 'fleisch', '400 g|500 g'),
  z('pouletbrust|hahnchenbrust|chicken breast', 'Pouletbrust', 'chicken breast/chicken breasts', 'fleisch', '2 Stück|400 g'),
  z('pouletschenkel|chicken thigh', 'Pouletschenkel', 'chicken thighs', 'fleisch', '600 g'),
  z('hackfleisch|gehacktes|ground beef|minced meat|mince', 'Hackfleisch', 'ground beef', 'fleisch', '500 g'),
  z('mageres hackfleisch|lean hackfleisch|lean ground beef|lean mince', 'Mageres Hackfleisch', 'lean ground beef', 'fleisch', '500 g'),
  z('rindfleisch|rind|beef', 'Rindfleisch', 'beef', 'fleisch', '400 g'),
  z('steak|entrecote', 'Steak', 'steak/steaks', 'fleisch', '2 Stück'),
  z('schweinefleisch|schwein|pork', 'Schweinefleisch', 'pork', 'fleisch', '400 g'),
  z('speck|bacon|pancetta', 'Speck', 'bacon', 'fleisch', '100 g'),
  z('schinken|ham|prosciutto', 'Schinken', 'ham', 'fleisch', '100 g|4 Scheiben'),
  z('salami|chorizo', 'Salami', 'salami', 'fleisch', '100 g'),
  z('wurst|wurstchen|bratwurst|cervelat|sausage', 'Würste', 'sausage/sausages', 'fleisch', '2 Stück'),
  z('lamm|lamb', 'Lammfleisch', 'lamb', 'fleisch', '400 g'),
  z('truthahn|pute|turkey', 'Truthahn', 'turkey', 'fleisch', '400 g'),
  z('burger patties|burger patty|patties|patty', 'Burger-Patties', 'burger patties', 'fleisch', '4 Stück'),
  z('lachs|salmon', 'Lachs', 'salmon', 'fleisch', '2 Stück|300 g'),
  z('crevette|garnele|shrimp|prawn', 'Crevetten', 'shrimp', 'fleisch', '200 g'),
  z('fisch|fischfilet|fish|kabeljau|dorsch|cod', 'Fisch', 'fish', 'fleisch', '400 g'),

  /* --------------------------- Milch, Kaese & Eier ------------------------- */
  z('milch|milk|vollmilch', 'Milch', 'milk', 'kuehl', '2 dl|5 dl|1 l'),
  z('rahm|sahne|vollrahm|halbrahm|kochrahm|schlagrahm|cream|heavy cream', 'Rahm', 'cream', 'kuehl', '2 dl'),
  z('sauerrahm|saurer halbrahm|creme fraiche|sour cream', 'Saurer Halbrahm', 'sour cream', 'kuehl', '1 Becher'),
  z('butter', 'Butter', 'butter', 'kuehl', '50 g|100 g'),
  z('ei|eier|egg|eggs', 'Eier', 'egg/eggs', 'kuehl', '2 Stück|4 Stück'),
  z('gekochte eier|hard boiled eggs|boiled eggs', 'Gekochte Eier', 'boiled eggs', 'kuehl', '4 Stück'),
  z('joghurt|jogurt|yoghurt|yogurt', 'Joghurt', 'yogurt', 'kuehl', '1 Becher|180 g'),
  z('griechischer joghurt|greek yogurt|greek yoghurt', 'Griechischer Joghurt', 'Greek yogurt', 'kuehl', '1 Becher'),
  z('proteinjoghurt|protein joghurt|protein jogurt|protein yogurt|high protein yogurt|high protein joghurt', 'Protein-Joghurt', 'high-protein yogurt', 'kuehl', '1 Becher|2 Becher'),
  z('skyr', 'Skyr', 'skyr', 'kuehl', '1 Becher'),
  z('quark|magerquark|rahmquark|krauterquark', 'Quark', 'quark', 'kuehl', '1 Becher|250 g'),
  z('huttenkase|cottage cheese', 'Hüttenkäse', 'cottage cheese', 'kuehl', '1 Becher'),
  z('mascarpone', 'Mascarpone', 'mascarpone', 'kuehl', '1 Becher|250 g'),
  z('ricotta', 'Ricotta', 'ricotta', 'kuehl', '250 g'),
  z('frischkase|philadelphia|cream cheese', 'Frischkäse', 'cream cheese', 'kuehl', '1 Packung'),
  z('kase|cheese', 'Käse', 'cheese', 'kuehl', '100 g'),
  z('reibkase|geriebener kase|grated cheese|shredded cheese', 'Reibkäse', 'grated cheese', 'kuehl', '100 g'),
  z('parmesan|sbrinz|grana padano', 'Parmesan', 'Parmesan', 'kuehl', '50 g'),
  z('mozzarella|burrata', 'Mozzarella', 'mozzarella', 'kuehl', '1 Kugel|2 Kugeln'),
  z('feta', 'Feta', 'feta', 'kuehl', '1 Packung|200 g'),
  z('halloumi', 'Halloumi', 'halloumi', 'kuehl', '1 Packung|250 g'),
  z('cheddar', 'Cheddar', 'cheddar', 'kuehl', '150 g'),
  z('gruyere|greyerzer|emmentaler|appenzeller|raclettekase|raclette', 'Gruyère', 'Gruyère', 'kuehl', '100 g'),
  z('tofu', 'Tofu', 'tofu', 'kuehl', '1 Packung|200 g'),
  z('hummus', 'Hummus', 'hummus', 'kuehl', '1 Becher'),
  z('hefe|frischhefe|yeast', 'Hefe', 'yeast', 'kuehl', '1 Würfel|1 Päckchen'),
  z('gnocchi', 'Gnocchi', 'gnocchi', 'kuehl', '500 g'),
  z('hafermilch|oat milk|mandelmilch|almond milk|sojamilch|soy milk', 'Hafermilch', 'oat milk', 'kuehl', '1 l'),

  /* --------------------------------- Vorrat -------------------------------- */
  z('tomatensauce|tomatensosse|tomatensauce pasta|passata|pastasauce|tomato sauce|marinara', 'Tomatensauce', 'tomato sauce', 'vorrat', '1 Dose|1 Glas|400 g'),
  z('pizzasauce|tomatensauce pizza|pizza sauce', 'Pizzasauce', 'pizza sauce', 'vorrat', '1 Dose|1 Glas'),
  z('gehackte tomaten|pelati|dosentomaten|tomaten aus der dose|canned tomatoes|chopped tomatoes|diced tomatoes', 'Gehackte Tomaten', 'chopped tomatoes', 'vorrat', '1 Dose|2 Dosen'),
  z('tomatenmark|tomatenpuree|tomato paste|tomato puree', 'Tomatenpüree', 'tomato paste', 'vorrat', '1 EL|2 EL'),
  z('getrocknete tomaten|eingelegte tomaten|sun dried tomatoes|sundried tomatoes', 'Getrocknete Tomaten', 'sun-dried tomatoes', 'vorrat', '1 Glas|50 g'),
  z('kokosmilch|coconut milk', 'Kokosmilch', 'coconut milk', 'vorrat', '1 Dose'),
  z('mais|corn|sweetcorn', 'Mais', 'sweetcorn', 'vorrat', '1 Dose'),
  z('maisstarke|speisestarke|cornstarch|maizena', 'Maisstärke', 'cornstarch', 'vorrat', '1 EL'),
  z('bohne|bean|beans', 'Bohnen', 'beans', 'vorrat', '1 Dose'),
  z('kidneybohne|rote bohne|kidney bean|red beans|red bean', 'Kidneybohnen', 'kidney beans', 'vorrat', '1 Dose'),
  z('weisse bohne|white beans|white bean|cannellini', 'Weisse Bohnen', 'white beans', 'vorrat', '1 Dose'),
  z('kichererbse|chickpea|garbanzo', 'Kichererbsen', 'chickpeas', 'vorrat', '1 Dose'),
  z('linse|lentil', 'Linsen', 'lentils', 'vorrat', '200 g|1 Dose'),
  z('schwarze linse|belugalinse|beluga linse|black lentil|beluga lentil', 'Schwarze Linsen', 'black lentils', 'vorrat', '200 g|1 Dose'),
  z('rote linse|red lentil', 'Rote Linsen', 'red lentils', 'vorrat', '200 g'),
  z('thunfisch|tuna', 'Thunfisch', 'tuna', 'vorrat', '1 Dose|2 Dosen'),
  z('apfelmus|applesauce|apple sauce', 'Apfelmus', 'applesauce', 'vorrat', '1 Glas'),
  z('pasta|nudel|teigwaren|noodle', 'Pasta', 'pasta', 'vorrat', '500 g|250 g'),
  z('protein pasta|proteinpasta|protein nudeln|proteinnudeln', 'Protein-Pasta', 'protein pasta', 'vorrat', '1 Packung|250 g'),
  z('spaghetti|spaghettini|linguine', 'Spaghetti', 'spaghetti', 'vorrat', '500 g'),
  z('penne|fusilli|farfalle|rigatoni|tagliatelle', 'Pasta', 'pasta', 'vorrat', '500 g'),
  z('makkaroni|macaroni|hornli', 'Makkaroni', 'macaroni', 'vorrat', '500 g'),
  z('lasagne|lasagna', 'Lasagneblätter', 'lasagna sheets', 'vorrat', '1 Packung'),
  z('orzo|risoni', 'Orzo', 'orzo', 'vorrat', '300 g'),
  z('reis|rice|basmati|jasminreis|jasmine rice', 'Reis', 'rice', 'vorrat', '200 g|300 g'),
  z('risottoreis|arborio|carnaroli|risotto rice', 'Risottoreis', 'risotto rice', 'vorrat', '300 g'),
  z('couscous|cous cous|bulgur|quinoa', 'Couscous', 'couscous', 'vorrat', '200 g'),
  z('mehl|weissmehl|halbweissmehl|flour', 'Mehl', 'flour', 'vorrat', '250 g|500 g'),
  z('zucker|sugar', 'Zucker', 'sugar', 'vorrat', '100 g|1 EL'),
  z('puderzucker|powdered sugar|icing sugar', 'Puderzucker', 'powdered sugar', 'vorrat', '2 EL'),
  z('rohrzucker|brauner zucker|brown sugar', 'Rohrzucker', 'brown sugar', 'vorrat', '100 g'),
  z('vanillezucker|vanilla sugar', 'Vanillezucker', 'vanilla sugar', 'vorrat', '1 Päckchen'),
  z('backpulver|baking powder', 'Backpulver', 'baking powder', 'vorrat', '1 Päckchen|1 TL'),
  z('natron|baking soda', 'Natron', 'baking soda', 'vorrat', '1 TL'),
  z('trockenhefe|dry yeast|instant yeast', 'Trockenhefe', 'dry yeast', 'vorrat', '1 Päckchen'),
  z('vanille|vanilla|vanilleschote|vanilla extract', 'Vanille', 'vanilla', 'vorrat', '1 TL|1 Schote'),
  z('kakao|kakaopulver|cocoa', 'Kakaopulver', 'cocoa powder', 'vorrat', '2 EL'),
  z('haferflocken|oats|oatmeal|rolled oats', 'Haferflocken', 'rolled oats', 'vorrat', '50 g|100 g'),
  z('musli|muesli|granola|birchermuesli', 'Müesli', 'muesli', 'vorrat', '1 Packung'),
  z('chia|chiasamen|chia samen|chia seeds', 'Chia-Samen', 'chia seeds', 'vorrat', '2 EL'),
  z('leinsamen|flaxseed', 'Leinsamen', 'flaxseed', 'vorrat', '2 EL'),
  z('nuss|nusse|nuts', 'Nüsse', 'nuts', 'vorrat', '50 g'),
  z('mandel|almond', 'Mandeln', 'almonds', 'vorrat', '50 g'),
  z('baumnuss|walnuss|walnut', 'Baumnüsse', 'walnuts', 'vorrat', '50 g'),
  z('haselnuss|hazelnut', 'Haselnüsse', 'hazelnuts', 'vorrat', '50 g'),
  z('pinienkern|pine nut', 'Pinienkerne', 'pine nuts', 'vorrat', '30 g'),
  z('cashew', 'Cashewnüsse', 'cashews', 'vorrat', '50 g'),
  z('erdnuss|peanut', 'Erdnüsse', 'peanuts', 'vorrat', '50 g'),
  z('erdnussbutter|peanut butter', 'Erdnussbutter', 'peanut butter', 'vorrat', '1 Glas|2 EL'),
  z('sesam|sesame', 'Sesam', 'sesame seeds', 'vorrat', '1 EL'),
  z('dattel|date|dates', 'Datteln', 'dates', 'vorrat', '100 g'),
  z('rosine|sultanine|raisin', 'Rosinen', 'raisins', 'vorrat', '50 g'),
  z('kokosflocken|kokosraspel|desiccated coconut|shredded coconut', 'Kokosflocken', 'desiccated coconut', 'vorrat', '50 g'),
  z('paniermehl|breadcrumbs|panko', 'Paniermehl', 'breadcrumbs', 'vorrat', '50 g'),
  z('bouillon|bruhe|broth|stock', 'Bouillon', 'stock', 'vorrat', '5 dl|1 Würfel'),
  z('gemusebouillon|gemusebruhe|vegetable stock|vegetable broth', 'Gemüsebouillon', 'vegetable stock', 'vorrat', '5 dl|1 Würfel'),
  z('huhnerbouillon|huhnerbruhe|chicken stock|chicken broth', 'Hühnerbouillon', 'chicken stock', 'vorrat', '5 dl|1 Würfel'),
  z('pesto', 'Pesto', 'pesto', 'vorrat', '1 Glas|2 EL'),
  z('olive|oliven', 'Oliven', 'olives', 'vorrat', '1 Glas|50 g'),
  z('kaper|caper', 'Kapern', 'capers', 'vorrat', '1 EL'),
  z('essiggurke|cornichon|gewurzgurke|pickle', 'Essiggurken', 'pickles', 'vorrat', '1 Glas'),
  z('konfiture|marmelade|jam', 'Konfitüre', 'jam', 'vorrat', '1 Glas'),
  z('nutella|schokoaufstrich', 'Nutella', 'chocolate spread', 'vorrat', '1 Glas'),
  z('linsen vorgekocht|vorgekochte linsen|cooked lentils', 'Linsen, vorgekocht', 'cooked lentils', 'vorrat', '1 Packung'),

  /* -------------------------- Gewuerze, Oel & Saucen ------------------------ */
  z('ol|oil|bratol|speiseol', 'Öl', 'oil', 'gewuerze', '2 EL'),
  z('olivenol|olive oil', 'Olivenöl', 'olive oil', 'gewuerze', '2 EL|3 EL'),
  z('rapsol|sonnenblumenol|pflanzenol|vegetable oil|sunflower oil|canola oil', 'Rapsöl', 'vegetable oil', 'gewuerze', '2 EL'),
  z('sesamol|sesame oil', 'Sesamöl', 'sesame oil', 'gewuerze', '1 TL'),
  z('kokosol|coconut oil', 'Kokosöl', 'coconut oil', 'gewuerze', '1 EL'),
  z('salz|salt|meersalz|fleur de sel', 'Salz', 'salt', 'gewuerze', '1 Prise'),
  z('pfeffer|pepper|black pepper', 'Pfeffer', 'pepper', 'gewuerze', '1 Prise'),
  z('paprikapulver|paprika edelsuss|rauchpaprika|smoked paprika|paprika powder', 'Paprikapulver', 'paprika', 'gewuerze', '1 TL'),
  z('curry|currypulver|curry powder', 'Curry', 'curry powder', 'gewuerze', '1 EL|1 TL'),
  z('currypaste|curry paste', 'Currypaste', 'curry paste', 'gewuerze', '2 EL'),
  z('kreuzkummel|cumin', 'Kreuzkümmel', 'cumin', 'gewuerze', '1 TL'),
  z('kurkuma|turmeric', 'Kurkuma', 'turmeric', 'gewuerze', '1 TL'),
  z('zimt|cinnamon', 'Zimt', 'cinnamon', 'gewuerze', '1 TL'),
  z('muskat|muskatnuss|nutmeg', 'Muskatnuss', 'nutmeg', 'gewuerze', '1 Prise'),
  z('chiliflocken|chilliflocken|chili flakes|red pepper flakes|chilipulver|chili powder', 'Chiliflocken', 'chili flakes', 'gewuerze', '1 Prise|1 TL'),
  z('oregano', 'Oregano', 'oregano', 'gewuerze', '1 TL'),
  z('garam masala', 'Garam Masala', 'garam masala', 'gewuerze', '1 TL'),
  z('italienische krauter|krautermischung|italian herbs|herbes de provence', 'Italienische Kräuter', 'Italian herbs', 'gewuerze', '1 TL'),
  z('lorbeer|lorbeerblatt|bay leaf|bay leaves', 'Lorbeerblätter', 'bay leaves', 'gewuerze', '2 Blätter'),
  z('nelke|gewurznelke|cloves', 'Nelken', 'cloves', 'gewuerze', '2 Stück'),
  z('senf|mustard|dijon', 'Senf', 'mustard', 'gewuerze', '1 TL|1 EL'),
  z('ketchup', 'Ketchup', 'ketchup', 'gewuerze', '2 EL'),
  z('mayonnaise|mayo', 'Mayonnaise', 'mayonnaise', 'gewuerze', '2 EL'),
  z('sojasauce|sojasosse|soy sauce|soya sauce|tamari', 'Sojasauce', 'soy sauce', 'gewuerze', '2 EL|3 EL'),
  z('honig|honey', 'Honig', 'honey', 'gewuerze', '1 EL'),
  z('ahornsirup|maple syrup', 'Ahornsirup', 'maple syrup', 'gewuerze', '2 EL'),
  z('essig|vinegar|weissweinessig|apfelessig', 'Essig', 'vinegar', 'gewuerze', '1 EL'),
  z('balsamico|aceto balsamico|balsamic', 'Balsamico', 'balsamic vinegar', 'gewuerze', '1 EL'),
  z('sriracha|tabasco|hot sauce|chilisauce|sweet chili', 'Chilisauce', 'hot sauce', 'gewuerze', '1 TL'),
  z('fischsauce|fish sauce', 'Fischsauce', 'fish sauce', 'gewuerze', '1 EL'),
  z('worcestershire', 'Worcestershiresauce', 'Worcestershire sauce', 'gewuerze', '1 TL'),

  /* ---------------------------- Suesses & Snacks ---------------------------- */
  z('schokolade|schoggi|chocolate|kuverture', 'Schokolade', 'chocolate', 'suesses', '100 g|1 Tafel'),
  z('chips|crisps', 'Chips', 'chips', 'suesses', '1 Beutel'),
  z('guetzli|kekse|cookies|biscuits', 'Guetzli', 'cookies', 'suesses', '1 Packung'),
  z('gummibarchen|gummy bears', 'Gummibärchen', 'gummy bears', 'suesses', '1 Beutel'),
  z('poulet jerky|chicken jerky|jerky', 'Poulet-Jerky', 'chicken jerky', 'suesses', '1 Packung'),
  z('proteinriegel|protein bar|riegel', 'Proteinriegel', 'protein bars', 'suesses', '4 Stück'),

  /* -------------------------------- Getraenke ------------------------------- */
  z('wasser|water', 'Wasser', 'water', 'getraenke', '2 dl|5 dl'),
  z('mineralwasser|sprudel|sparkling water', 'Mineralwasser', 'sparkling water', 'getraenke', '6 Flaschen'),
  z('saft|juice|orangensaft|apfelsaft', 'Saft', 'juice', 'getraenke', '1 l'),
  z('wein|wine', 'Wein', 'wine', 'getraenke', '1 dl|1 Flasche'),
  z('weisswein|white wine', 'Weisswein', 'white wine', 'getraenke', '1 dl'),
  z('rotwein|red wine', 'Rotwein', 'red wine', 'getraenke', '1 dl'),
  z('bier|beer', 'Bier', 'beer', 'getraenke', '1 Flasche|6 Flaschen'),
  z('kaffee|coffee|espresso', 'Kaffee', 'coffee', 'getraenke', '1 Packung'),
  z('tee|tea', 'Tee', 'tea', 'getraenke', '1 Packung'),

  /* --------------------------------- Tiefkuehl ------------------------------ */
  z('erbse|erbsli|peas', 'Erbsen', 'peas', 'tiefkuehl', '200 g'),
  z('tiefkuhlgemuse|gefrorenes gemuse|gefrorene gemuse|frozen vegetables', 'Tiefkühlgemüse', 'frozen vegetables', 'tiefkuehl', '500 g'),
  z('gefrorene beeren|tiefkuhlbeeren|frozen berries', 'Tiefkühlbeeren', 'frozen berries', 'tiefkuehl', '300 g'),
  z('gyoza|dumpling|teigtaschen', 'Gyoza', 'gyoza', 'tiefkuehl', '1 Packung'),
  z('pommes|fries', 'Pommes', 'fries', 'tiefkuehl', '1 Packung'),
  z('susskartoffel pommes|susskartoffelpommes|sweet potato fries', 'Süsskartoffel-Pommes', 'sweet potato fries', 'tiefkuehl', '1 Packung'),
  z('fischstabli|fischstabchen|fish fingers|fish sticks', 'Fischstäbli', 'fish fingers', 'tiefkuehl', '1 Packung'),
  z('glace|eis|ice cream|gelato', 'Glace', 'ice cream', 'tiefkuehl', '1 Packung'),
  z('tiefkuhlpizza|frozen pizza', 'Tiefkühlpizza', 'frozen pizza', 'tiefkuehl', '1 Stück'),

  /* --------------------------------- Haushalt ------------------------------- */
  z('wc papier|toilettenpapier|klopapier|toilet paper', 'WC-Papier', 'toilet paper', 'haushalt', '1 Packung'),
  z('haushaltspapier|kuchenpapier|kuchenrolle|paper towel', 'Haushaltspapier', 'paper towels', 'haushalt', '1 Packung'),
  z('abwaschmittel|spulmittel|dish soap|geschirrspulmittel|tabs', 'Abwaschmittel', 'dish soap', 'haushalt', '1 Flasche'),
  z('waschmittel|detergent|laundry', 'Waschmittel', 'laundry detergent', 'haushalt', '1 Packung'),
  z('abfallsack|kehrichtsack|mullbeutel|trash bag|garbage bag|bin bag', 'Abfallsäcke', 'trash bags', 'haushalt', '1 Rolle'),
  z('zahnpasta|toothpaste|zahnburste|toothbrush', 'Zahnpasta', 'toothpaste', 'haushalt', '1 Stück'),
  z('shampoo|duschgel|seife|soap|shower gel|deo', 'Duschgel', 'shower gel', 'haushalt', '1 Stück'),
  z('backpapier|alufolie|frischhaltefolie|baking paper|parchment|foil|cling film', 'Backpapier', 'baking paper', 'haushalt', '1 Rolle'),
];

/** Kleinschrift, ohne Akzente und Satzzeichen, mit Leerzeichen aussen. */
export function norm(text: string): string {
  return ` ${(text ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()} `;
}

/** Alle Schluesselwoerter, das laengste zuerst. */
const INDEX: Array<{ wort: string; eintrag: ZutatWissen; ganz: boolean }> = WISSEN.flatMap((eintrag) =>
  eintrag.woerter.map((wort) => ({ wort, eintrag, ganz: wort.length <= 3 })),
).sort((a, b) => b.wort.length - a.wort.length);

const gemerkt = new Map<string, ZutatWissen | null>();

/**
 * Was die App ueber eine Zutat weiss – `null`, wenn nichts. Klammern und
 * Zusaetze nach dem Komma zaehlen nicht: "Butter, geschmolzen" ist Butter,
 * "Milch (Guss)" Milch.
 */
export function zutatWissen(name: string): ZutatWissen | null {
  const schluessel = name ?? '';
  if (gemerkt.has(schluessel)) return gemerkt.get(schluessel)!;
  const kern = norm(kernVon(schluessel));
  let fund: ZutatWissen | null = null;
  if (kern.trim()) {
    for (const { wort, eintrag, ganz } of INDEX) {
      if (ganz ? kern.includes(` ${wort} `) : kern.includes(wort)) {
        fund = eintrag;
        break;
      }
    }
  }
  if (gemerkt.size > 3000) gemerkt.clear();
  gemerkt.set(schluessel, fund);
  return fund;
}

/** Der Name ohne Klammerzusatz und ohne das, was nach dem Komma kommt. */
function kernVon(name: string): string {
  return name.replace(/\(.*?\)/g, ' ').split(',')[0];
}

/** Uebliche Mengen fuer eine Zutat, die gelaeufigste zuerst. */
export function einheitenVorschlaege(name: string): Vorschlag[] {
  return zutatWissen(name)?.vorschlaege ?? [];
}

/** Wo die Zutat im Laden steht. */
export function abteilungVon(name: string): Abteilung {
  return zutatWissen(name)?.abteilung ?? 'weitere';
}

/* -------------------------------------------------------------------------- */
/* Namen in der anderen Sprache                                               */
/* -------------------------------------------------------------------------- */

/** Zusaetze in Klammern, die oft vorkommen: die Gruppe einer Zutat. */
const ZUSATZ_EN: Record<string, string> = {
  teig: 'dough',
  guss: 'topping',
  belag: 'topping',
  sauce: 'sauce',
  marinade: 'marinade',
  dressing: 'dressing',
  fullung: 'filling',
  fuellung: 'filling',
  deko: 'garnish',
  garnitur: 'garnish',
  topping: 'topping',
  boden: 'base',
  creme: 'cream',
  glasur: 'glaze',
  streusel: 'crumble',
};

/** Was nach dem Komma steht: wie die Zutat vorbereitet ist. */
const ART_EN: Record<string, string> = {
  gehackt: 'chopped',
  'fein gehackt': 'finely chopped',
  'grob gehackt': 'roughly chopped',
  geschmolzen: 'melted',
  gerieben: 'grated',
  'fein gerieben': 'finely grated',
  gewurfelt: 'diced',
  'in scheiben': 'sliced',
  'in scheiben geschnitten': 'sliced',
  'in streifen': 'cut into strips',
  halbiert: 'halved',
  geviertelt: 'quartered',
  gekocht: 'cooked',
  zimmerwarm: 'at room temperature',
  weich: 'softened',
  'nach belieben': 'to taste',
  'nach geschmack': 'to taste',
  frisch: 'fresh',
  getrocknet: 'dried',
  gemahlen: 'ground',
  'abgetropft': 'drained',
  'abgespult': 'rinsed',
  geschalt: 'peeled',
  'klein geschnitten': 'chopped',
  'in stucken': 'in pieces',
  'in wurfeln': 'diced',
  'zum anbraten': 'for frying',
  'zum servieren': 'to serve',
};

const MEHRZAHL = ['', 'n', 'en', 'e', 's', 'er', 'es', 'nen'];

/** Deckt das Schluesselwort den ganzen Kern ab – bis auf eine Mehrzahl-Endung? */
function ganzerTreffer(kern: string, wort: string): boolean {
  return MEHRZAHL.some((endung) => kern === wort + endung);
}

/** Der Eintrag, wenn der ganze Name eine bekannte Zutat ist ("Zwiebeln", nicht "Zwiebelkuchen"). */
function genauerEintrag(name: string): ZutatWissen | null {
  const kern = norm(kernVon(name)).trim();
  if (!kern) return null;
  for (const { wort, eintrag } of INDEX) {
    if (ganzerTreffer(kern, wort)) return eintrag;
  }
  return null;
}

/**
 * Ein Zutatenname in der gewuenschten Sprache – nur, wenn die App die Zutat
 * sicher kennt. Sonst `null`, und die KI-Uebersetzung oder der Originalname
 * gilt. `menge` waehlt Einzahl oder Mehrzahl ("1 onion", "3 onions").
 */
export function zutatenName(name: string, sprache: 'de' | 'en', menge?: number | null): string | null {
  const eintrag = genauerEintrag(name);
  if (!eintrag) return null;
  const klammer = /\(([^)]*)\)/.exec(name)?.[1]?.trim();
  const komma = name.includes(',') ? name.slice(name.indexOf(',') + 1).replace(/\(.*?\)/g, '').trim() : '';

  if (sprache === 'de') {
    // Englisch eingegeben, deutsch gezeigt: nur der Kern, Zusaetze bleiben.
    const kern = eintrag.de;
    return [kern, komma ? `, ${komma}` : '', klammer ? ` (${klammer})` : ''].join('');
  }

  const kern = menge === 1 ? eintrag.en[0] : eintrag.en[1];
  let zusatz = '';
  if (komma) {
    const art = ART_EN[norm(komma).trim()];
    if (!art) return null; // lieber ganz von der KI als halb deutsch
    zusatz += `, ${art}`;
  }
  if (klammer) {
    const gruppe = ZUSATZ_EN[norm(klammer).trim()];
    if (!gruppe) return null;
    zusatz += ` (${gruppe})`;
  }
  return kern + zusatz;
}

/* -------------------------------------------------------------------------- */
/* Einheiten in der Anzeige                                                   */
/* -------------------------------------------------------------------------- */

/** Deutsche Einheit → englisch, Einzahl und Mehrzahl. Leer heisst: weglassen. */
const EINHEIT_EN: Record<string, [string, string]> = {
  el: ['tbsp', 'tbsp'],
  tl: ['tsp', 'tsp'],
  stuck: ['', ''],
  stk: ['', ''],
  bund: ['bunch', 'bunches'],
  dose: ['can', 'cans'],
  dosen: ['can', 'cans'],
  glas: ['jar', 'jars'],
  glaser: ['jar', 'jars'],
  packung: ['pack', 'packs'],
  packungen: ['pack', 'packs'],
  pck: ['pack', 'packs'],
  packchen: ['packet', 'packets'],
  prise: ['pinch', 'pinches'],
  prisen: ['pinch', 'pinches'],
  msp: ['pinch', 'pinches'],
  zehe: ['clove', 'cloves'],
  zehen: ['clove', 'cloves'],
  knolle: ['bulb', 'bulbs'],
  knollen: ['bulb', 'bulbs'],
  blatt: ['leaf', 'leaves'],
  blatter: ['leaf', 'leaves'],
  zweig: ['sprig', 'sprigs'],
  zweige: ['sprig', 'sprigs'],
  scheibe: ['slice', 'slices'],
  scheiben: ['slice', 'slices'],
  stange: ['stalk', 'stalks'],
  stangen: ['stalk', 'stalks'],
  kopf: ['head', 'heads'],
  kopfe: ['head', 'heads'],
  tasse: ['cup', 'cups'],
  tassen: ['cup', 'cups'],
  portion: ['serving', 'servings'],
  portionen: ['serving', 'servings'],
  handvoll: ['handful', 'handfuls'],
  becher: ['tub', 'tubs'],
  wurfel: ['cube', 'cubes'],
  kugel: ['ball', 'balls'],
  kugeln: ['ball', 'balls'],
  rolle: ['roll', 'rolls'],
  rollen: ['roll', 'rolls'],
  tafel: ['bar', 'bars'],
  tafeln: ['bar', 'bars'],
  beutel: ['bag', 'bags'],
  flasche: ['bottle', 'bottles'],
  flaschen: ['bottle', 'bottles'],
  schale: ['punnet', 'punnets'],
  schalen: ['punnet', 'punnets'],
  schote: ['pod', 'pods'],
  schoten: ['pod', 'pods'],
};

/** Englische Einheit → deutsch, fuer Eingaben auf Englisch. */
const EINHEIT_DE: Record<string, string> = {
  tbsp: 'EL',
  tsp: 'TL',
  bunch: 'Bund',
  can: 'Dose',
  cans: 'Dose',
  jar: 'Glas',
  pack: 'Packung',
  packet: 'Päckchen',
  pinch: 'Prise',
  clove: 'Zehe',
  cloves: 'Zehen',
  slice: 'Scheibe',
  slices: 'Scheiben',
  cup: 'Tasse',
  cups: 'Tassen',
  handful: 'Handvoll',
  piece: 'Stück',
  pieces: 'Stück',
  pc: 'Stück',
  pcs: 'Stück',
  bunches: 'Bund',
  jars: 'Gläser',
  packs: 'Packungen',
  packets: 'Päckchen',
  pinches: 'Prisen',
  handfuls: 'Handvoll',
  tub: 'Becher',
  tubs: 'Becher',
  bag: 'Beutel',
  bags: 'Beutel',
  bottle: 'Flasche',
  bottles: 'Flaschen',
  roll: 'Rolle',
  rolls: 'Rollen',
  bar: 'Tafel',
  bars: 'Tafeln',
  cube: 'Würfel',
  cubes: 'Würfel',
  head: 'Kopf',
  heads: 'Köpfe',
  stalk: 'Stange',
  stalks: 'Stangen',
  sprig: 'Zweig',
  sprigs: 'Zweige',
  leaf: 'Blatt',
  leaves: 'Blätter',
  bulb: 'Knolle',
  bulbs: 'Knollen',
  punnet: 'Schale',
  punnets: 'Schalen',
  serving: 'Portion',
  servings: 'Portionen',
  ball: 'Kugel',
  balls: 'Kugeln',
  pod: 'Schote',
  pods: 'Schoten',
};

/** Eine Einheit so, wie sie in der gewaehlten Sprache dasteht. */
export function einheitIn(einheit: string, sprache: 'de' | 'en', menge?: number | null): string {
  const roh = (einheit ?? '').trim();
  if (!roh) return '';
  const schluessel = norm(roh).trim();
  if (sprache === 'en') {
    const paar = EINHEIT_EN[schluessel];
    if (!paar) return roh;
    return menge != null && menge > 1 ? paar[1] : paar[0];
  }
  return EINHEIT_DE[schluessel] ?? roh;
}

/** Ob die App die Zutat kennt – fuer Tests und die Vorschlaege. */
export function kenntZutat(name: string): boolean {
  return zutatWissen(name) !== null;
}

/**
 * Ist der Name die englische Bezeichnung einer bekannten Zutat ("basil",
 * "chickpeas")? Nur dann zeigt die deutsche Ansicht ihn auf Deutsch – ein
 * deutsch eingetippter Name bleibt immer, wie er ist.
 */
export function englischerName(name: string): ZutatWissen | null {
  const eintrag = genauerEintrag(name);
  if (!eintrag) return null;
  const kern = norm(kernVon(name)).trim();
  return eintrag.en.some((form) => norm(form).trim() === kern) ? eintrag : null;
}

/** Alle bekannten Zutaten – fuer die Vorschlagsliste beim Tippen. */
export function alleZutaten(): readonly ZutatWissen[] {
  return WISSEN;
}
