/**
 * Die mitgelieferten Inhalte auf Englisch – von Hand uebersetzt, damit die
 * englische Ansicht auch ohne KI vollstaendig ist.
 *
 * Schluessel ist der deutsche Text, wie er in lib/seed steht. Aendert jemand
 * ein Rezept, passt sein neuer Text nicht mehr – dann uebersetzt die KI, und
 * bis dahin steht der deutsche Text da. Zutaten, die das Zutatenwissen
 * (lib/zutaten) kennt, brauchen hier keinen Eintrag.
 */
export const SEED_EN: Record<string, string> = {
  /* ---------------------------- Poulet mit Brokkoli --------------------------- */
  'Poulet mit Brokkoli und Reis': 'Chicken with Broccoli and Rice',
  'Reis in einem Sieb kalt abspülen': 'Rinse the rice in a sieve under cold water',
  'Poulet in mundgerechte Streifen schneiden, salzen und pfeffern':
    'Cut the chicken into bite-sized strips, season with salt and pepper',
  'Knoblauch fein hacken': 'Finely chop the garlic',
  'Brokkoli in Röschen teilen, den Strunk schälen und in Scheiben schneiden':
    'Cut the broccoli into florets, peel the stem and slice it',
  'Sojasauce und Honig in einer Tasse verrühren': 'Stir the soy sauce and honey together in a cup',
  'Reis mit der doppelten Menge Wasser und etwas Salz aufsetzen und zugedeckt köcheln lassen.':
    'Put the rice on with twice its volume of water and a little salt, cover and simmer.',
  'Olivenöl in einer grossen Pfanne erhitzen. Poulet bei mittlerer Hitze anbraten, bis es rundum goldbraun ist.':
    'Heat the olive oil in a large pan. Fry the chicken over medium heat until golden all over.',
  'Knoblauch dazugeben und kurz mitbraten, bis er duftet.': 'Add the garlic and fry briefly until fragrant.',
  'Brokkoli zugeben, Sojasauce und Honig darüber giessen und alles zugedeckt garen, bis der Brokkoli bissfest ist.':
    'Add the broccoli, pour over the soy sauce and honey, cover and cook until the broccoli is tender-crisp.',
  'Mit Reis anrichten, abschmecken und sofort servieren.': 'Serve with the rice, season to taste and eat right away.',

  /* ----------------------------- Ofenlachs ----------------------------------- */
  'Ofenlachs mit Süsskartoffeln': 'Oven-Baked Salmon with Sweet Potatoes',
  'Lachsfilet': 'salmon fillets',
  'Ofen auf 200 °C Ober-/Unterhitze vorheizen': 'Preheat the oven to 200 °C (conventional)',
  'Süsskartoffeln schälen und in gleichmässige Spalten schneiden': 'Peel the sweet potatoes and cut into even wedges',
  'Zitrone halbieren: eine Hälfte auspressen, die andere in Spalten schneiden':
    'Halve the lemon: juice one half, cut the other into wedges',
  'Süsskartoffeln mit Olivenöl, Salz und Pfeffer mischen, auf einem Blech verteilen und im Ofen vorbacken.':
    'Toss the sweet potatoes with olive oil, salt and pepper, spread on a baking tray and pre-bake in the oven.',
  'Lachs salzen, pfeffern und mit Zitronensaft, Knoblauch und Honig bestreichen.':
    'Season the salmon with salt and pepper and brush with lemon juice, garlic and honey.',
  'Lachs zu den Süsskartoffeln aufs Blech legen und fertig garen, bis der Fisch glasig ist.':
    'Add the salmon to the tray with the sweet potatoes and bake until the fish is just cooked.',
  'Mit Zitronenspalten servieren.': 'Serve with lemon wedges.',

  /* ---------------------------- Mac and Cheese ------------------------------- */
  'Cremige Mac and Cheese': 'Creamy Mac and Cheese',
  'Käse gerieben': 'grated cheese',
  'Salzwasser aufsetzen und die Makkaroni bissfest kochen.': 'Bring salted water to a boil and cook the macaroni al dente.',
  'Butter in einer zweiten Pfanne schmelzen, Mehl einrühren und unter Rühren hell anschwitzen.':
    'Melt the butter in a second pan, stir in the flour and cook, stirring, until pale golden.',
  'Milch nach und nach zugiessen und dabei ständig rühren, bis eine glatte Sauce entsteht.':
    'Gradually pour in the milk, stirring constantly, until you have a smooth sauce.',
  'Käse einrühren und schmelzen lassen. Mit Salz, Pfeffer und Muskat abschmecken.':
    'Stir in the cheese and let it melt. Season with salt, pepper and nutmeg.',
  'Makkaroni abgiessen, unter die Sauce heben und sofort servieren.':
    'Drain the macaroni, fold into the sauce and serve right away.',

  /* ----------------------------- Tomatensuppe -------------------------------- */
  'Tomatensuppe mit Basilikum': 'Tomato Soup with Basil',
  Pelati: 'canned peeled tomatoes',
  Gemüsebouillon: 'vegetable stock',
  'Zwiebeln und Knoblauch fein hacken': 'Finely chop the onions and garlic',
  'Basilikumblätter abzupfen': 'Pick the basil leaves',
  'Olivenöl erhitzen und die Zwiebeln glasig dünsten, dann den Knoblauch kurz mitdünsten.':
    'Heat the olive oil and sweat the onions until translucent, then add the garlic briefly.',
  'Pelati und Bouillon zugeben, aufkochen und offen einköcheln lassen.':
    'Add the tomatoes and stock, bring to a boil and simmer uncovered to reduce.',
  'Suppe fein pürieren, Rahm einrühren und abschmecken.': 'Blend the soup until smooth, stir in the cream and season.',
  'Mit frischem Basilikum servieren.': 'Serve with fresh basil.',

  /* ------------------------------ Linsencurry -------------------------------- */
  'Rotes Linsencurry': 'Red Lentil Curry',
  'Linsen in einem Sieb kalt abspülen': 'Rinse the lentils in a sieve under cold water',
  'Zwiebeln, Knoblauch und Ingwer fein hacken': 'Finely chop the onions, garlic and ginger',
  'Öl erhitzen und Zwiebeln, Knoblauch und Ingwer andünsten.': 'Heat the oil and soften the onions, garlic and ginger.',
  'Currypaste zugeben und kurz mitrösten, bis sie duftet.': 'Add the curry paste and toast briefly until fragrant.',
  'Linsen, Kokosmilch und Bouillon zugeben, aufkochen und bei kleiner Hitze weich köcheln lassen.':
    'Add the lentils, coconut milk and stock, bring to a boil and simmer over low heat until soft.',
  'Mit Salz abschmecken und nach Wunsch mit Reis oder Naan servieren.':
    'Season with salt and serve with rice or naan if you like.',

  /* -------------------------------- Shakshuka -------------------------------- */
  Shakshuka: 'Shakshuka',
  'Zwiebeln und Peperoni in feine Streifen schneiden': 'Cut the onions and bell peppers into thin strips',
  'Knoblauch fein würfeln': 'Finely dice the garlic',
  'Olivenöl in einer weiten Pfanne erhitzen, Gemüse weich dünsten.':
    'Heat the olive oil in a wide pan and cook the vegetables until soft.',
  'Gewürze zugeben und kurz mitrösten, dann Pelati zugeben und einköcheln lassen.':
    'Add the spices and toast briefly, then add the tomatoes and let them reduce.',
  'Mit einem Löffel vier Mulden formen und je ein Ei hineingleiten lassen.':
    'Make four wells with a spoon and slide an egg into each.',
  'Zugedeckt garen, bis das Eiweiss gestockt und das Eigelb noch weich ist.':
    'Cover and cook until the whites are set and the yolks still soft.',
  'Mit Salz und Pfeffer würzen und direkt aus der Pfanne servieren.':
    'Season with salt and pepper and serve straight from the pan.',

  /* ------------------------- Marry me Chicken Orzo --------------------------- */
  'Marry me Chicken Orzo': 'Marry Me Chicken Orzo',
  'Hähnchenbrust (in Stücke geschnitten)': 'chicken breast (cut into pieces)',
  'Knoblauch (gehackt)': 'garlic (chopped)',
  'Getrocknete Tomaten in Öl (gehackt)': 'sun-dried tomatoes in oil (chopped)',
  Hühnerbrühe: 'chicken stock',
  Kokoscreme: 'coconut cream',
  'Frischer Spinat': 'fresh spinach',
  'Getrockneter Oregano': 'dried oregano',
  'Schwarzer Pfeffer': 'black pepper',
  'Parmesan gerieben (optional)': 'grated Parmesan (optional)',
  'Hähnchenbrust in Stücke schneiden und mit Salz und Pfeffer würzen':
    'Cut the chicken breast into pieces and season with salt and pepper',
  'Knoblauch hacken': 'Chop the garlic',
  'Getrocknete Tomaten hacken': 'Chop the sun-dried tomatoes',
  'Olivenöl in einer grossen Pfanne bei mittlerer bis hoher Hitze erhitzen. Hähnchen darin leicht bräunen.':
    'Heat the olive oil in a large pan over medium-high heat. Lightly brown the chicken.',
  'Knoblauch dazugeben und mitbraten, bis er duftet.': 'Add the garlic and fry until fragrant.',
  'Getrocknete Tomaten, Chiliflocken und Oregano unterrühren.': 'Stir in the sun-dried tomatoes, chili flakes and oregano.',
  'Orzo dazugeben, mit der Brühe aufgiessen und aufkochen.': 'Add the orzo, pour in the stock and bring to a boil.',
  'Hitze reduzieren und köcheln, bis der Orzo weich und die Brühe fast aufgesogen ist. Ab und zu umrühren.':
    'Lower the heat and simmer until the orzo is soft and the stock almost absorbed. Stir now and then.',
  'Kokoscreme einrühren, bis alles schön cremig ist.': 'Stir in the coconut cream until everything is nice and creamy.',
  'Spinat handvollweise unterrühren, bis er zusammenfällt.': 'Stir in the spinach a handful at a time until it wilts.',
  'Mit Salz und Pfeffer abschmecken, nach Belieben mit Parmesan bestreuen und servieren.':
    'Season with salt and pepper, sprinkle with Parmesan if you like and serve.',

  /* ---------------------------------- Gyoza ---------------------------------- */
  'Gyoza mit Hackfleisch & Gemüse': 'Gyoza with Minced Meat & Vegetables',
  'Gyoza-Teigblätter': 'gyoza wrappers',
  'Schweinehackfleisch (alternativ Rind oder Poulet)': 'ground pork (or beef or chicken)',
  'Weisskohl (sehr fein gehackt)': 'white cabbage (very finely chopped)',
  'Karotte (fein gerieben)': 'carrot (finely grated)',
  Reisessig: 'rice vinegar',
  'Speisestärke (optional, macht die Füllung saftiger)': 'cornstarch (optional, makes the filling juicier)',
  'Weisskohl sehr fein hacken': 'Chop the white cabbage very finely',
  'Karotte fein reiben': 'Finely grate the carrot',
  'Frühlingszwiebeln in feine Ringe schneiden': 'Slice the spring onions into thin rings',
  'Knoblauch und Ingwer fein hacken': 'Finely chop the garlic and ginger',
  'Den Kohl leicht salzen und ziehen lassen.': 'Lightly salt the cabbage and let it sit.',
  'Kohl anschliessend gut ausdrücken, damit die Füllung nicht zu feucht wird.':
    'Then squeeze the cabbage well so the filling isn’t too wet.',
  'Alle Zutaten gründlich miteinander vermengen.': 'Mix all the ingredients together thoroughly.',
  'Die Füllung roh in die Gyoza geben – sie gart später beim Braten und Dämpfen.':
    'Fill the gyoza with the raw filling – it cooks later when you fry and steam them.',

  /* ------------------------ Spinat-Feta-Taschen ------------------------------ */
  'Spinat-Feta-Blätterteig-Taschen': 'Spinach and Feta Puff Pastry Pockets',
  'Gefrorener Spinat': 'frozen spinach',
  'Ei (für die Füllung)': 'egg (for the filling)',
  'Ei (zum Bestreichen)': 'egg (for brushing)',
  'Parmesan (optional)': 'Parmesan (optional)',
  'Spinat auftauen und wirklich sehr gut ausdrücken – das ist wichtig!':
    'Thaw the spinach and squeeze it out really well – this matters!',
  'Zwiebel und Knoblauch fein hacken': 'Finely chop the onion and garlic',
  'Feta zerbröseln': 'Crumble the feta',
  'Ei zum Bestreichen in einer Tasse verquirlen': 'Whisk the egg for brushing in a cup',
  'Zwiebel und Knoblauch kurz anbraten.': 'Briefly fry the onion and garlic.',
  'Spinat dazugeben, mit Salz, Pfeffer und Muskat würzen und braten, damit möglichst viel Flüssigkeit verdampft.':
    'Add the spinach, season with salt, pepper and nutmeg and fry so that as much liquid as possible evaporates.',
  'Spinat etwas abkühlen lassen.': 'Let the spinach cool a little.',
  'Feta und ein Ei unter die Spinatmasse mischen.': 'Mix the feta and one egg into the spinach.',
  'Backofen auf 200 °C Ober-/Unterhitze vorheizen.': 'Preheat the oven to 200 °C (conventional).',
  'Beide Blätterteigrollen ausrollen und in ungefähr 8 × 8 cm grosse Quadrate schneiden.':
    'Unroll both sheets of puff pastry and cut into squares of about 8 × 8 cm.',
  'Jeweils einen gut gehäuften Esslöffel Füllung in die Mitte geben.': 'Put a heaped tablespoon of filling in the middle of each.',
  'Zu einem Dreieck zusammenklappen und die Ränder mit einer Gabel festdrücken.':
    'Fold into a triangle and press the edges together with a fork.',
  'Mit dem verquirlten Ei bestreichen.': 'Brush with the beaten egg.',
  'Im Ofen backen, bis sie schön goldbraun sind (20–25 Minuten).': 'Bake until nicely golden brown (20–25 minutes).',
  'Die Taschen eher klein machen: dann werden sie richtig knusprig, und aus 640 g Blätterteig ergeben sich ungefähr 16–20 Stück.':
    'Keep the pockets on the small side: they get really crispy, and 640 g of puff pastry makes about 16–20.',

  /* ---------------------------------- Dal ------------------------------------ */
  'Rotes Linsen-Dal': 'Red Lentil Dal',
  'Zwiebeln (fein gehackt)': 'onions (finely chopped)',
  'Knoblauch (fein gehackt)': 'garlic (finely chopped)',
  'Frischer Ingwer (fein gehackt)': 'fresh ginger (finely chopped)',
  Korianderpulver: 'ground coriander',
  'Garam Masala oder Currypulver': 'garam masala or curry powder',
  'Passierte oder gehackte Tomaten (optional)': 'passata or chopped tomatoes (optional)',
  Kokosblütenzucker: 'coconut sugar',
  'Limetten- oder Zitronensaft': 'lime or lemon juice',
  'Pflanzlicher Joghurt (zum Servieren)': 'plant-based yogurt (to serve)',
  'Petersilie oder Koriander (zum Servieren)': 'parsley or cilantro (to serve)',
  'Sesam (zum Servieren)': 'sesame seeds (to serve)',
  'Reis (zum Servieren)': 'rice (to serve)',
  'Die roten Linsen in einem Sieb unter kaltem Wasser gut abspülen':
    'Rinse the red lentils well in a sieve under cold water',
  'Kurkuma, Koriander, Kreuzkümmel, Paprikapulver und Garam Masala in einer kleinen Schale bereitstellen – sie kommen zusammen in den Topf':
    'Set out the turmeric, coriander, cumin, paprika and garam masala in a small bowl – they go into the pot together',
  'Limette oder Zitrone auspressen': 'Juice the lime or lemon',
  'Öl in einem grossen Topf erhitzen. Zwiebeln hineingeben und anbraten, bis sie glasig sind.':
    'Heat the oil in a large pot. Add the onions and fry until translucent.',
  'Knoblauch und Ingwer hinzufügen und mitbraten, bis es schön duftet.': 'Add the garlic and ginger and fry until fragrant.',
  'Die Gewürze dazugeben und ein paar Sekunden mitrösten. Dadurch entfalten sie ihr Aroma.':
    'Add the spices and toast for a few seconds. This brings out their flavor.',
  'Die Linsen in den Topf geben und alles vermischen.': 'Add the lentils to the pot and stir everything together.',
  'Gemüsebouillon dazugeben und aufkochen. Hitze reduzieren und zugedeckt köcheln, ab und zu umrühren.':
    'Add the vegetable stock and bring to a boil. Lower the heat, cover and simmer, stirring now and then.',
  'Kokosmilch und nach Wunsch die Tomaten unterrühren. Köcheln, bis die Linsen weich und cremig sind.':
    'Stir in the coconut milk and the tomatoes if using. Simmer until the lentils are soft and creamy.',
  'Zu dick? Etwas Bouillon oder Kokosmilch einrühren.': 'Too thick? Stir in a little stock or coconut milk.',
  'Mit Salz, Pfeffer, Kokosblütenzucker und Zitronen- oder Limettensaft abschmecken. Der Saft macht das Dal frisch.':
    'Season with salt, pepper, coconut sugar and lemon or lime juice. The juice keeps the dal fresh.',

  /* --------------------------- Lachs Honig-Senf ------------------------------ */
  'Lachs im Ofen mit Honig-Senf': 'Baked Honey Mustard Salmon',
  'Zitrone (optional)': 'lemon (optional)',
  'Ofen auf 180 °C Ober-/Unterhitze vorheizen (Umluft 160 °C)': 'Preheat the oven to 180 °C conventional (160 °C fan)',
  'Lachs auspacken und trocken tupfen': 'Unwrap the salmon and pat it dry',
  'Honig, Senf und Olivenöl verrühren und mit Salz und Pfeffer würzen':
    'Stir together the honey, mustard and olive oil and season with salt and pepper',
  'Nach Belieben Zitrone in Scheiben schneiden': 'Slice the lemon if using',
  'Den Lachs mit der Honig-Senf-Mischung einstreichen.': 'Brush the salmon with the honey mustard mixture.',
  'Lachs mit der Hautseite nach unten auf Backpapier legen. Nach Belieben Zitronenscheiben darauflegen.':
    'Place the salmon skin side down on baking paper. Top with lemon slices if you like.',
  'Auf der mittleren Schiene backen, je nach Dicke 12–15 Minuten.': 'Bake on the middle rack for 12–15 minutes, depending on thickness.',

  /* ------------------------------ Halloumiburger ------------------------------ */
  'Halloumiburger mit Honig-Senf-Sauce': 'Halloumi Burger with Honey Mustard Sauce',
  Burgerbrötchen: 'burger buns',
  Radicchio: 'radicchio',
  'Pflanzenöl (zum Braten)': 'vegetable oil (for frying)',
  'Pflanzenöl (für die Marinade)': 'vegetable oil (for the marinade)',
  'Currypulver (für die Marinade)': 'curry powder (for the marinade)',
  'Senf (für die Sauce)': 'mustard (for the sauce)',
  'Zucker (für die Sauce)': 'sugar (for the sauce)',
  'Honig (für die Sauce)': 'honey (for the sauce)',
  'Pflanzenöl (für die Sauce)': 'vegetable oil (for the sauce)',
  'Zwiebel in Ringe schneiden': 'Slice the onion into rings',
  'Halloumi und Zucchini in Scheiben schneiden': 'Slice the halloumi and zucchini',
  'Burgerbrötchen halbieren': 'Halve the burger buns',
  'Radicchio und Minze waschen und trocken tupfen': 'Wash the radicchio and mint and pat dry',
  'Für die Marinade Pflanzenöl, Currypulver, Salz und Pfeffer in einem verschliessbaren Beutel mischen. Halloumi dazugeben.':
    'For the marinade, mix vegetable oil, curry powder, salt and pepper in a sealable bag. Add the halloumi.',
  'Im Kühlschrank 30–60 Minuten marinieren.': 'Marinate in the fridge for 30–60 minutes.',
  'Zucchinischeiben in Öl braten, bis sie auf jeder Seite goldbraun und weich sind. Mit Salz und Pfeffer würzen.':
    'Fry the zucchini slices in oil until golden and soft on each side. Season with salt and pepper.',
  'Backofen auf 200 °C vorheizen. Senf, Zucker und Honig in einer grossen Schüssel vermischen.':
    'Preheat the oven to 200 °C. Mix the mustard, sugar and honey in a large bowl.',
  'Unter ständigem Schlagen langsam das restliche Öl zugiessen, bis die Sauce cremig ist. Salzen und pfeffern.':
    'Slowly pour in the remaining oil, whisking constantly, until the sauce is creamy. Season with salt and pepper.',
  'Burgerbrötchen auf ein mit Backpapier belegtes Blech legen und im vorgeheizten Ofen rösten.':
    'Place the buns on a tray lined with baking paper and toast them in the preheated oven.',
  'Halloumi pro Seite braten, bis er leicht gebräunt ist.': 'Fry the halloumi on each side until lightly browned.',
  'Brötchen mit Sauce bestreichen. Radicchio, Halloumi, Gemüse und Minze darauf schichten, mit Sauce abschliessen.':
    'Spread the buns with sauce. Layer radicchio, halloumi, vegetables and mint on top and finish with more sauce.',
  'Zubereitung nach Kitchen Stories, angepasst an diese Zutatenliste: dort sind es vier Portionen mit Aubergine, hier zwei ohne. Die Marinierzeit von 30–60 Minuten steckt in der Zubereitungszeit.':
    'Method after Kitchen Stories, adapted to this ingredient list: theirs serves four and includes eggplant, this one serves two without. The 30–60 minute marinating time is included in the total time.',

  /* ------------------------------ Thunfisch-Pasta ----------------------------- */
  'Pasta mit Thunfisch, Cherrytomaten & Zitrone': 'Pasta with Tuna, Cherry Tomatoes & Lemon',
  'Pasta (Spaghetti oder Penne)': 'pasta (spaghetti or penne)',
  'Thunfisch aus der Dose, abgetropft': 'canned tuna, drained',
  'Bio-Zitrone': 'organic lemon',
  'Petersilie oder Basilikum': 'parsley or basil',
  'Knoblauch in Scheiben schneiden': 'Slice the garlic',
  'Cherrytomaten halbieren': 'Halve the cherry tomatoes',
  'Thunfisch abtropfen lassen': 'Drain the tuna',
  'Von der Zitrone die Schale abreiben und den Saft auspressen': 'Zest and juice the lemon',
  'Kräuter grob hacken': 'Roughly chop the herbs',
  'Pasta in kräftig gesalzenem Wasser al dente kochen. Vor dem Abgiessen eine Tasse Pastawasser beiseitestellen.':
    'Cook the pasta al dente in well-salted water. Set aside a cup of pasta water before draining.',
  'Während die Pasta kocht, das Olivenöl in einer grossen Pfanne erhitzen.': 'While the pasta cooks, heat the olive oil in a large pan.',
  'Knoblauch und Chiliflocken bei mittlerer Hitze anschwitzen, bis es duftet. Der Knoblauch soll nicht braun werden.':
    'Gently fry the garlic and chili flakes over medium heat until fragrant. Don’t let the garlic brown.',
  'Cherrytomaten dazugeben und bei mittlerer bis hoher Hitze schmoren, bis sie aufplatzen. Leicht andrücken, damit Saft austritt.':
    'Add the cherry tomatoes and cook over medium-high heat until they burst. Press lightly to release their juice.',
  'Thunfisch und Kapern dazugeben, den Thunfisch grob zerpflücken und kurz mitwärmen.':
    'Add the tuna and capers, break the tuna into rough pieces and warm through briefly.',
  'Pasta mit einem Schuss Pastawasser in die Pfanne geben und schwenken, bis die Sauce leicht sämig ist.':
    'Add the pasta to the pan with a splash of pasta water and toss until the sauce is lightly creamy.',
  'Mit Zitronenabrieb, Zitronensaft, Kräutern, Salz und Pfeffer abschmecken. Sofort servieren.':
    'Season with lemon zest, lemon juice, herbs, salt and pepper. Serve right away.',
  'Schnelle Vorratsküchen-Pasta, frisch und leicht scharf. Tipp: Thunfisch in Olivenöl nehmen und einen Teil des Öls aus der Dose anstelle von frischem Olivenöl verwenden, das gibt mehr Geschmack. Passt auch dazu: schwarze Oliven, eine Handvoll Rucola am Schluss oder knusprig geröstete Paniermehl-Brösel (Pangrattato) als Topping. Parmesan ist in Italien bei Fischpasta eher unüblich, aber erlaubt ist, was schmeckt.':
    'Quick pantry pasta, fresh and a little spicy. Tip: use tuna in olive oil and replace some of the fresh olive oil with oil from the can – it adds flavor. Also good with it: black olives, a handful of arugula at the end, or crispy toasted breadcrumbs (pangrattato) on top. Parmesan on fish pasta is unusual in Italy, but whatever tastes good is allowed.',

  /* ------------------------------ One-Pot-Orzo -------------------------------- */
  'One-Pot-Orzo mit Zucchini, Tomaten, weissen Bohnen & Feta': 'One-Pot Orzo with Zucchini, Tomatoes, White Beans & Feta',
  'Weisse Bohnen (Cannellini), abgetropft': 'white beans (cannellini), drained',
  Babyspinat: 'baby spinach',
  'Gemüsebouillon, heiss': 'vegetable stock, hot',
  'Oregano getrocknet': 'dried oregano',
  'Basilikum oder Dill': 'basil or dill',
  'Zucchini würfeln': 'Dice the zucchini',
  'Weisse Bohnen abtropfen lassen': 'Drain the white beans',
  'Bouillon erhitzen': 'Heat the stock',
  'Feta zerbröseln und die Kräuter hacken': 'Crumble the feta and chop the herbs',
  'Olivenöl in einem grossen, weiten Topf bei mittlerer Hitze erwärmen. Zwiebel darin weich und glasig dünsten.':
    'Warm the olive oil in a large, wide pot over medium heat. Cook the onion until soft and translucent.',
  'Knoblauch, Oregano und Chiliflocken kurz mitbraten, bis es duftet. Der Knoblauch soll nicht braun werden.':
    'Add the garlic, oregano and chili flakes and fry briefly until fragrant. Don’t let the garlic brown.',
  'Zucchini dazugeben und unter Rühren braten, bis sie weich werden und etwas Farbe nehmen.':
    'Add the zucchini and fry, stirring, until soft and lightly colored.',
  'Orzo dazugeben und umrühren, bis er vom Öl überzogen ist. Kurz mitrösten, das gibt mehr Geschmack.':
    'Add the orzo and stir until coated in oil. Toast it briefly for more flavor.',
  'Cherrytomaten und die heisse Bouillon dazugeben und aufkochen.': 'Add the cherry tomatoes and the hot stock and bring to a boil.',
  'Offen auf kleiner Hitze köcheln, bis der Orzo weich und fast alles aufgesogen ist. Oft rühren, bei Bedarf etwas Wasser zugeben.':
    'Simmer uncovered over low heat until the orzo is soft and almost all the liquid is absorbed. Stir often and add a little water if needed.',
  'Weisse Bohnen unterrühren und warm werden lassen.': 'Stir in the white beans and let them warm through.',
  'Topf vom Herd nehmen. Babyspinat unterrühren, bis er zusammenfällt, dann Zitronenabrieb, -saft und Pfeffer dazugeben.':
    'Take the pot off the heat. Stir in the baby spinach until it wilts, then add the lemon zest, juice and pepper.',
  'Die Hälfte des Fetas unterrühren, bis alles cremig ist. Abschmecken und nur salzen, falls nötig.':
    'Stir in half the feta until everything is creamy. Taste and only add salt if needed.',
  'Restlichen Feta und die Kräuter darüberstreuen und 2 Minuten ruhen lassen.':
    'Sprinkle with the remaining feta and the herbs and let it rest for 2 minutes.',
  'Erst ganz am Schluss abschmecken – Bouillon und Feta sind beide salzig. Reste halten sich 3–4 Tage im Kühlschrank; beim Aufwärmen einen Schuss Wasser oder Bouillon zugeben, weil der Orzo weiter Flüssigkeit zieht. Eine 400-g-Dose Bohnen ergibt abgetropft rund 240 g.':
    'Only season at the very end – the stock and feta are both salty. Leftovers keep for 3–4 days in the fridge; add a splash of water or stock when reheating, as the orzo keeps soaking up liquid. A 400 g can of beans gives about 240 g drained.',

  /* ---------------------------------- Ideen ----------------------------------- */
  'Skyr-Bowl mit Beeren': 'Skyr Bowl with Berries',
  'Ofenkartoffeln mit Kräuterquark': 'Baked Potatoes with Herb Quark',
  'Gebratene Nudeln mit Gemüse': 'Fried Noodles with Vegetables',
  'Blumenkohl Wraps': 'Cauliflower Wraps',
  'Cous Cous mit Gemüsepfanne und Gyoza': 'Couscous with Stir-Fried Vegetables and Gyoza',
  'Brokkoli, Kartoffeln, Süsskartoffeln und Halloumi': 'Broccoli, Potatoes, Sweet Potatoes and Halloumi',
  Flammkuchen: 'Tarte Flambée',
  'Fried Rice': 'Fried Rice',
  'Crispy One-Blech-Gnocchi mit Ofengemüse': 'Crispy Sheet-Pan Gnocchi with Roasted Vegetables',

  /* ------------------------------- Grundliste --------------------------------- */
  'Tomatensauce Pizza': 'pizza sauce',
  'Tomatensauce Pasta': 'pasta sauce',
  'Eingelegte Tomaten': 'pickled tomatoes',
  'Rote Bohnen': 'red beans',
  'Süsskartoffel-Pommes (selber machen)': 'sweet potato fries (homemade)',
  // Die alten, halb englischen Namen – bis jedes Geraet umbenannt hat
  // (PANTRY_NAME_RENAMES in lib/seed).
  'Lean Hackfleisch': 'lean ground beef',
  'High-Protein Yogurt': 'high-protein yogurt',
  'Red Beans': 'red beans',
  'Black Lentils': 'black lentils',
  'White Beans': 'white beans',
  'Sweet Potato Fries (selber machen)': 'sweet potato fries (homemade)',
  'Protein Pasta': 'protein pasta',

  /* ------------------------------- Kuehlschrank -------------------------------- */
  'Vorschlag aus einem Kühlschrankfoto.': 'Suggested from a fridge photo.',
};
