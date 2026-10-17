/**
 * Scroll-Anker fuer Safari.
 *
 * Kommt oberhalb der sichtbaren Stelle etwas dazu – ein anderes Geraet traegt
 * Zutaten ein, ein Rezept wird synchronisiert, ein Abschnitt waechst –, rutscht
 * in Safari alles darunter nach unten weg, mitten im Lesen. Chrome und
 * Firefox gleichen das selbst aus ("scroll anchoring"), Safari kann das
 * bisher nicht.
 *
 * Hier wird es nachgebaut: Gemerkt wird die oberste sichtbare Zeile unter der
 * Kopfleiste. Aendert sich die Seite, wird um genau so viel nachgescrollt, wie
 * sich diese Zeile verschoben hat – vor dem naechsten Bild, also unsichtbar.
 *
 * Wo der Browser es selbst kann, passiert nichts. Ganz oben (scrollY 0) wird
 * nicht verankert: dort soll Neues oben erscheinen und alles nachruecken,
 * genau wie im Browser.
 */

/** Woran sich das Auge haelt: eine Zeile, eine Karte, eine Ueberschrift. */
const ZEILE = 'li, article, .card, .kachel, h1, h2, h3';
/** Nur wenn keine Zeile getroffen wird: der ganze Abschnitt. */
const ABSCHNITT = 'section, form';

interface Anker {
  element: Element;
  /** Abstand vom Seitenanfang – unabhaengig davon, wie weit gerade gescrollt ist. */
  oben: number;
}

/** Der Browser verankert selbst – ausser es ist ausdruecklich abgeschaltet. */
function browserKannEs(): boolean {
  if (typeof CSS === 'undefined' || !CSS.supports?.('overflow-anchor', 'auto')) return false;
  return getComputedStyle(document.documentElement).overflowAnchor !== 'none';
}

/** Gesperrt, solange ein Blatt offen ist (lib/ui: der Body steht dann fest). */
function gesperrt(): boolean {
  return document.body.style.position === 'fixed';
}

function sichtbar(element: Element): boolean {
  const rand = element.getBoundingClientRect();
  return element.isConnected && (rand.width > 0 || rand.height > 0);
}

/** Klebt das Element fest, verschiebt es sich beim Scrollen – kein Anker. */
function klebt(element: Element): boolean {
  const position = getComputedStyle(element).position;
  return position === 'sticky' || position === 'fixed';
}

const seitenOben = (element: Element) => element.getBoundingClientRect().top + window.scrollY;

/**
 * Verankern innerhalb von `wurzel` (dem Hauptbereich). `kopf` ist die
 * Kopfleiste, die oben klebt – die erste Zeile darunter ist der Anker.
 */
export function scrollAnkerStarten(wurzel: HTMLElement, kopf: () => HTMLElement | null): () => void {
  if (typeof window === 'undefined' || browserKannEs()) return () => {};

  let anker: Anker | null = null;
  let geplant = false;

  const waehlen = () => {
    anker = null;
    if (window.scrollY <= 0 || gesperrt()) return;
    const unten = kopf()?.getBoundingClientRect().bottom ?? 0;
    const rand = wurzel.getBoundingClientRect();
    const x = rand.left + Math.min(40, rand.width / 2);
    // Ein paar Punkte unter der Kopfleiste: die erste Zeile, die getroffen
    // wird. Erst wenn keiner eine Zeile trifft, darf es ein Abschnitt sein.
    const treffer = [6, 30, 60, 100]
      .map((abstand) => document.elementFromPoint(x, unten + abstand))
      .filter((element): element is Element => !!element && wurzel.contains(element));
    for (const auswahl of [ZEILE, ABSCHNITT]) {
      for (const element of treffer) {
        const zeile = element.closest(auswahl);
        if (!zeile || !wurzel.contains(zeile) || klebt(zeile)) continue;
        anker = { element: zeile, oben: seitenOben(zeile) };
        return;
      }
    }
  };

  const ausgleichen = () => {
    if (gesperrt()) {
      anker = null;
      return;
    }
    const jetzt = anker;
    if (!jetzt || !sichtbar(jetzt.element) || window.scrollY <= 0) {
      waehlen();
      return;
    }
    const verschoben = seitenOben(jetzt.element) - jetzt.oben;
    if (Math.abs(verschoben) >= 1) window.scrollBy(0, verschoben);
    waehlen();
  };

  // Beim Scrollen den Anker nachfuehren – einmal pro Bild genuegt.
  const onScroll = () => {
    if (geplant) return;
    geplant = true;
    requestAnimationFrame(() => {
      geplant = false;
      waehlen();
    });
  };

  // Beides laeuft vor dem naechsten Bild: Aenderungen am DOM und an Groessen.
  const beobachter = new MutationObserver(ausgleichen);
  beobachter.observe(wurzel, { childList: true, subtree: true, characterData: true });
  const groesse = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(ausgleichen);
  groesse?.observe(wurzel);

  window.addEventListener('scroll', onScroll, { passive: true });
  waehlen();

  return () => {
    beobachter.disconnect();
    groesse?.disconnect();
    window.removeEventListener('scroll', onScroll);
  };
}
