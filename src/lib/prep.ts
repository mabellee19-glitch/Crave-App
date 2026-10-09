/**
 * Vorbereitung: was vor dem eigentlichen Kochen erledigt sein will.
 *
 * Viele Rezepte mischen Schneiden und Kochen – "Zwiebel fein hacken und darin
 * glasig duensten". Am Herd heisst das: die Pfanne ist heiss, und man steht
 * noch am Brett. Die Vorbereitung zieht das nach vorne. Gespeichert wird sie
 * als Liste von Aufgaben am Rezept; das Abmessen ergibt sich aus der
 * Zutatenliste und wird nicht doppelt gefuehrt.
 *
 * Dieses Modul kennt nur Text – kein Modell, kein Netz. Fuer die
 * mitgelieferten Rezepte ist die Vorbereitung von Hand geschrieben, fuer
 * eigene wird sie hier aus den Schritten gelesen.
 */

/** Die Aufgabe, die bei jeder Vorbereitung dazugehoert und aus den Zutaten folgt. */
export const ABMESSEN = 'Alle Zutaten abmessen und bereitstellen';

/**
 * Verben, die Vorbereitung sind: am Brett oder an der Spuele, nicht am Herd.
 * Bewusst ohne "vorheizen" – ob der Ofen gleich zu Beginn laufen soll oder
 * erst nach 30 Minuten Marinieren, laesst sich aus dem Text nicht ablesen.
 */
const VORBEREITUNG_VERBEN = [
  'hacken',
  'schneiden',
  'würfeln',
  'wuerfeln',
  'reiben',
  'abreiben',
  'raspeln',
  'schälen',
  'schaelen',
  'halbieren',
  'vierteln',
  'zerbröseln',
  'zerbroeseln',
  'zerkleinern',
  'zupfen',
  'abzupfen',
  'abspülen',
  'abspuelen',
  'waschen',
  'putzen',
  'entkernen',
  'auftauen',
  'ausdrücken',
  'ausdruecken',
  'abtropfen lassen',
  'pressen',
  'auspressen',
  'teilen',
  'trocken tupfen',
];

/**
 * Verben vom Herd. Steht eines davon im selben Satz vor einer
 * Vorbereitungsarbeit, beginnt die Aufgabe erst danach: aus "Öl erhitzen und
 * Zwiebel hacken" wird "Zwiebel hacken".
 */
const KOCH_VERBEN = [
  'erhitzen',
  'erwärmen',
  'anbraten',
  'braten',
  'dünsten',
  'andünsten',
  'anschwitzen',
  'köcheln',
  'kochen',
  'aufkochen',
  'garen',
  'backen',
  'rösten',
  'dazugeben',
  'zugeben',
  'hineingeben',
  'geben',
  'einrühren',
  'unterrühren',
  'rühren',
  'mischen',
  'vermischen',
  'vermengen',
  'würzen',
  'abschmecken',
  'servieren',
  'anrichten',
  'giessen',
  'schmelzen',
  'aufsetzen',
  'legen',
  'verteilen',
  'marinieren',
  'vorheizen',
];

/** Partizip im Zutatennamen -> was dafuer zu tun ist. "(gehackt)" -> "hacken". */
const PARTIZIPIEN: Array<[RegExp, string]> = [
  [/\bgehackt\w*/i, 'hacken'],
  [/\bgeschnitten\w*/i, 'schneiden'],
  [/\bgerieben\w*/i, 'reiben'],
  [/\bgewürfelt\w*/i, 'würfeln'],
  [/\bgeschält\w*/i, 'schälen'],
  [/\bhalbiert\w*/i, 'halbieren'],
  [/\bgeviertelt\w*/i, 'vierteln'],
  [/\bzerbröselt\w*/i, 'zerbröseln'],
  [/\babgetropft\w*/i, 'abtropfen lassen'],
  [/\bgewaschen\w*/i, 'waschen'],
  [/\babgespült\w*/i, 'abspülen'],
  [/\bausgedrückt\w*/i, 'ausdrücken'],
  [/\bgepresst\w*/i, 'pressen'],
  [/\baufgetaut\w*/i, 'auftauen'],
  [/\bentkernt\w*/i, 'entkernen'],
];

function escape(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const VORBEREITUNG_RE = new RegExp(
  `(?:^|\\s)(${VORBEREITUNG_VERBEN.map(escape).join('|')})(?=$|[\\s,;.!])`,
  'giu',
);
const KOCH_RE = new RegExp(`(?:^|\\s)(${KOCH_VERBEN.map(escape).join('|')})(?=$|[\\s,;.!])`, 'giu');

function satzAnfang(text: string): string {
  const sauber = text.trim().replace(/[.;:!]+$/, '').trim();
  return sauber ? sauber[0].toUpperCase() + sauber.slice(1) : sauber;
}

/**
 * Vorbereitungsarbeiten aus einem Satz holen. Deutsch stellt das Verb ans
 * Ende, also reicht die Aufgabe vom Anfang des Teilsatzes bis zum letzten
 * Vorbereitungsverb einer zusammenhaengenden Kette: "Brokkoli in Röschen
 * teilen und den Strunk schälen" bleibt eine Aufgabe.
 */
function ausSatz(satz: string): string[] {
  const treffer = [...satz.matchAll(VORBEREITUNG_RE)];
  if (treffer.length === 0) return [];

  const aufgaben: string[] = [];
  let start = 0;
  let ende = -1;

  const abschliessen = () => {
    if (ende <= start) return;
    const aufgabe = satzAnfang(satz.slice(start, ende).replace(/^[\s,]*(und|dann|danach)\s+/i, ''));
    if (aufgabe.split(/\s+/).length >= 2) aufgaben.push(aufgabe);
  };

  for (const match of treffer) {
    const verbEnde = (match.index ?? 0) + match[0].length;
    const verbAnfang = verbEnde - match[1].length;

    // Ein Kochverb zwischen dem bisherigen Stand und diesem Verb trennt ab.
    const dazwischen = satz.slice(Math.max(start, ende), verbAnfang);
    const koch = [...dazwischen.matchAll(KOCH_RE)].pop();
    if (koch) {
      abschliessen();
      const kochEnde = Math.max(start, ende) + (koch.index ?? 0) + koch[0].length;
      const rest = satz.slice(kochEnde);
      const verbinder = /^\s*(,|und\b|dann\b)\s*/i.exec(rest);
      start = kochEnde + (verbinder ? verbinder[0].length : 0);
      ende = verbEnde;
      continue;
    }

    // Ein Komma vor dem neuen Verb heisst: eigener Teilsatz.
    if (ende > start && /,/.test(dazwischen)) {
      abschliessen();
      start = ende + (/^\s*,\s*/.exec(satz.slice(ende))?.[0].length ?? 0);
    }
    ende = verbEnde;
  }
  abschliessen();
  return aufgaben;
}

/** Aufgaben, die schon im Zutatennamen stecken: "Knoblauch (gehackt)". */
function ausZutat(name: string): { was: string; tun: string } | null {
  // Gemeint ist nur ein Zusatz in Klammern oder nach einem Komma. "Käse
  // gerieben" ist eine Packung aus dem Laden, kein Auftrag.
  const klammer = /\(([^)]*)\)/.exec(name)?.[1] ?? '';
  const komma = /,\s*(.*)$/.exec(name.replace(/\([^)]*\)/g, ''))?.[1] ?? '';
  const grund = name
    .replace(/\([^)]*\)/g, '')
    .replace(/,.*$/, '')
    .trim();
  if (!grund) return null;

  for (const [muster, verb] of PARTIZIPIEN) {
    const zusatz = [klammer, komma].find((teil) => muster.test(teil));
    if (!zusatz) continue;
    const art = zusatz
      .replace(muster, '')
      .replace(/\b(optional|zum \w+|für \w+)\b/gi, '')
      .replace(/[,;]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    // "Frischer Ingwer" ist beim Schneiden einfach Ingwer.
    const was = grund.replace(/^frische[rns]?\s+/i, '');
    return { was, tun: `${art ? `${art} ` : ''}${verb}` };
  }
  return null;
}

function schluessel(aufgabe: string): string {
  const woerter = aufgabe
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .split(/\s+/)
    .filter(Boolean);
  // Erstes Wort (meist die Zutat) und letztes Wort (das Verb).
  return `${woerter[0]?.slice(0, 5)}|${woerter[woerter.length - 1]}`;
}

/**
 * Vorbereitung fuer ein Rezept vorschlagen, aus Zutaten und Schritten.
 * Liefert nur Aufgaben, die wirklich im Rezept stehen – erfunden wird nichts.
 */
export function vorbereitungVorschlagen(recipe: {
  ingredients: Array<{ name: string }>;
  steps: Array<{ text: string }>;
}): string[] {
  const aufgaben: string[] = [];
  const gesehen = new Set<string>();
  const dazu = (aufgabe: string | null) => {
    if (!aufgabe) return;
    const key = schluessel(aufgabe);
    if (gesehen.has(key)) return;
    gesehen.add(key);
    aufgaben.push(aufgabe);
  };

  // Gleiche Arbeit an mehreren Zutaten wird eine Aufgabe: "Zwiebeln,
  // Knoblauch und Ingwer fein hacken" statt dreimal "fein hacken".
  const ausZutaten = new Map<string, string[]>();
  for (const zutat of recipe.ingredients) {
    const teil = ausZutat(zutat.name);
    if (!teil) continue;
    const liste = ausZutaten.get(teil.tun) ?? [];
    liste.push(teil.was);
    ausZutaten.set(teil.tun, liste);
  }
  // Ein Adjektiv vorne wird mitten in der Aufzaehlung klein: "Knoblauch und
  // getrocknete Tomaten", nicht "und Getrocknete Tomaten".
  const imSatz = (name: string, index: number) =>
    index > 0 && /^\p{Lu}\p{Ll}*(e|er|es|en|em)\s+\S/u.test(name)
      ? name[0].toLowerCase() + name.slice(1)
      : name;
  for (const [tun, was] of ausZutaten) {
    const teile = was.map(imSatz);
    const namen =
      teile.length > 1 ? `${teile.slice(0, -1).join(', ')} und ${teile[teile.length - 1]}` : teile[0];
    for (const name of was) gesehen.add(schluessel(`${name} ${tun}`));
    aufgaben.push(satzAnfang(`${namen} ${tun}`));
  }

  for (const step of recipe.steps) {
    for (const satz of saetze(step.text)) {
      for (const aufgabe of ausSatz(satz)) dazu(aufgabe);
    }
  }
  return aufgaben;
}

/** Abkuerzungen mit Punkt, an denen kein Satz endet. */
const ABKUERZUNGEN = /\b(bzw|z\.\s?B|ca|evtl|ggf|usw|etc|min|std|sek|el|tl|stk|vgl|max|mind)\.$/i;

function saetze(text: string): string[] {
  const teile = text.split(/(?<=[.!?])\s+/);
  const heraus: string[] = [];
  for (const teil of teile) {
    const vorher = heraus[heraus.length - 1];
    if (vorher !== undefined && ABKUERZUNGEN.test(vorher)) heraus[heraus.length - 1] = `${vorher} ${teil}`;
    else heraus.push(teil);
  }
  return heraus;
}

/** Text aus dem Formular (eine Aufgabe pro Zeile) in die gespeicherte Liste. */
export function vorbereitungAusText(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((zeile) => zeile.replace(/^\s*(?:[-•*–]|\d+[.)])\s*/, '').trim())
    .filter(Boolean);
}

/**
 * Fingerabdruck der Schritttexte eines Rezepts. Damit laesst sich erkennen,
 * ob ein mitgeliefertes Rezept noch genau so dasteht, wie es ausgeliefert
 * wurde – nur dann duerfen seine Schritte gegen die neue Fassung getauscht
 * werden.
 */
export function schrittSignatur(steps: Array<{ text: string }>): string {
  const text = steps.map((step) => step.text.trim()).join('\n');
  let hash = 5381;
  for (let i = 0; i < text.length; i++) hash = ((hash * 33) ^ text.charCodeAt(i)) >>> 0;
  return `${steps.length}-${hash.toString(36)}`;
}
