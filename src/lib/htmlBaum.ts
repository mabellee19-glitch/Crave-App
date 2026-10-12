/**
 * Ein kleiner, nachsichtiger HTML-Leser fuer den Rezept-Import.
 *
 * Rezeptseiten liefern ihre Daten nicht immer als JSON-LD. Manche schreiben
 * sie als Microdata direkt ins HTML (Swissmilk), andere haben gar nichts
 * Maschinenlesbares, nur Ueberschriften wie "Zutaten" und "Zubereitung".
 * Fuer beides braucht es einen Baum der Seite. Ein Browser-Parser steht auf
 * dem Server nicht zur Verfuegung, und fuer diesen Zweck reicht wenig: Tags
 * oeffnen und schliessen, ein paar Elemente schliessen sich selbst, Skripte
 * und Styles werden uebersprungen. Kaputtes HTML fuehrt nie zu einem Fehler,
 * hoechstens zu einem etwas schiefen Baum.
 */

export interface Knoten {
  /** Tag in Kleinbuchstaben, `#text` fuer Text. */
  tag: string;
  attrs: Record<string, string>;
  kinder: Knoten[];
  /** Nur bei Text: der rohe Inhalt (Entities noch nicht aufgeloest). */
  text?: string;
}

const LEER = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
]);

/** Elemente, deren Inhalt fuer ein Rezept nichts taugt – samt Inhalt weg. */
const UEBERSPRINGEN = new Set(['script', 'style', 'noscript', 'template', 'svg', 'iframe', 'canvas']);

/** Diese schliessen ein offenes Element gleicher Art, wenn ein neues beginnt. */
const SCHLIESST: Record<string, string[]> = {
  li: ['li'],
  p: ['p'],
  dt: ['dt', 'dd'],
  dd: ['dt', 'dd'],
  td: ['td', 'th'],
  th: ['td', 'th'],
  tr: ['tr'],
  option: ['option'],
};

/** Ueber diese hinweg schliesst ein neues <li> oder <td> kein altes. */
const GRENZEN = new Set(['ul', 'ol', 'table', 'tbody', 'thead', 'tfoot', 'tr', 'dl', 'div', 'section']);

const TAG = /<!--[\s\S]*?-->|<!\[CDATA\[[\s\S]*?\]\]>|<![^>]*>|<\/([a-zA-Z][\w:-]*)\s*>|<([a-zA-Z][\w:-]*)((?:[^>"']|"[^"]*"|'[^']*')*)>/g;
const ATTR = /([^\s=/>"']+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;

function attribute(roh: string): Record<string, string> {
  const heraus: Record<string, string> = {};
  for (const treffer of roh.matchAll(ATTR)) {
    const name = treffer[1].toLowerCase();
    if (name in heraus) continue;
    heraus[name] = treffer[2] ?? treffer[3] ?? treffer[4] ?? '';
  }
  return heraus;
}

/** HTML in einen Baum lesen. Die Wurzel ist ein kuenstliches `#root`. */
export function leseHtml(html: string): Knoten {
  const wurzel: Knoten = { tag: '#root', attrs: {}, kinder: [] };
  const stapel: Knoten[] = [wurzel];
  const oben = () => stapel[stapel.length - 1];

  let pos = 0;
  TAG.lastIndex = 0;
  for (;;) {
    const treffer = TAG.exec(html);
    const ende = treffer ? treffer.index : html.length;
    if (ende > pos) {
      const text = html.slice(pos, ende);
      if (text.trim()) oben().kinder.push({ tag: '#text', attrs: {}, kinder: [], text });
    }
    if (!treffer) break;
    pos = TAG.lastIndex;

    const [ganz, schliessend, oeffnend, attrRoh] = treffer;
    if (schliessend) {
      const name = schliessend.toLowerCase();
      for (let i = stapel.length - 1; i > 0; i--) {
        if (stapel[i].tag === name) {
          stapel.length = i;
          break;
        }
      }
      continue;
    }
    if (!oeffnend) continue; // Kommentar, Doctype, CDATA

    const name = oeffnend.toLowerCase();
    if (UEBERSPRINGEN.has(name)) {
      if (ganz.endsWith('/>')) continue;
      const schluss = html.toLowerCase().indexOf(`</${name}`, pos);
      if (schluss < 0) break;
      const zu = html.indexOf('>', schluss);
      pos = zu < 0 ? html.length : zu + 1;
      TAG.lastIndex = pos;
      continue;
    }

    const schliesst = SCHLIESST[name];
    if (schliesst) {
      // Nur bis zur naechsten Liste/Tabelle zuruecksuchen, nicht durch sie hindurch.
      for (let i = stapel.length - 1; i > 0; i--) {
        const offen = stapel[i].tag;
        if (schliesst.includes(offen)) {
          stapel.length = i;
          break;
        }
        if (GRENZEN.has(offen)) break;
      }
    }

    const knoten: Knoten = { tag: name, attrs: attribute(attrRoh ?? ''), kinder: [] };
    oben().kinder.push(knoten);
    if (!LEER.has(name) && !ganz.endsWith('/>')) stapel.push(knoten);
  }
  return wurzel;
}

/** Alle Elemente in Dokumentreihenfolge, die `passt` erfuellen. */
export function finde(knoten: Knoten, passt: (k: Knoten) => boolean, heraus: Knoten[] = []): Knoten[] {
  for (const kind of knoten.kinder) {
    if (kind.tag === '#text') continue;
    if (passt(kind)) heraus.push(kind);
    finde(kind, passt, heraus);
  }
  return heraus;
}

const BLOCK = new Set([
  'p',
  'div',
  'li',
  'tr',
  'td',
  'th',
  'br',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'section',
  'article',
  'ul',
  'ol',
  'dt',
  'dd',
  'table',
]);

/**
 * Der rohe Text eines Elements. Blockelemente trennen mit Zeilenumbruch,
 * alles andere mit nichts – "<span>225</span><span> g</span>" bleibt "225 g".
 */
export function rohtext(knoten: Knoten): string {
  if (knoten.tag === '#text') return knoten.text ?? '';
  if (knoten.tag === 'br') return '\n';
  const innen = knoten.kinder.map(rohtext).join('');
  return BLOCK.has(knoten.tag) ? `\n${innen}\n` : innen;
}
