/**
 * Mengen, Einheiten und das Erkennen gleicher Zutaten.
 *
 * Ziel: Wenn ein Rezept "400 g Poulet" zur Einkaufsliste hinzufuegt und dort
 * schon "0.3 kg Poulet" steht, soll daraus ein Eintrag "700 g Poulet" werden –
 * und nicht zwei Zeilen.
 */

/** Einheiten, die ineinander umgerechnet werden koennen, mit Faktor zur Basis. */
const UNIT_GROUPS: Record<string, { base: string; factor: number }> = {
  g: { base: 'g', factor: 1 },
  gramm: { base: 'g', factor: 1 },
  gr: { base: 'g', factor: 1 },
  kg: { base: 'g', factor: 1000 },
  kilo: { base: 'g', factor: 1000 },
  ml: { base: 'ml', factor: 1 },
  cl: { base: 'ml', factor: 10 },
  dl: { base: 'ml', factor: 100 },
  l: { base: 'ml', factor: 1000 },
  liter: { base: 'ml', factor: 1000 },
  tl: { base: 'tl', factor: 1 },
  teeloeffel: { base: 'tl', factor: 1 },
  el: { base: 'tl', factor: 3 },
  esslöffel: { base: 'tl', factor: 3 },
  essloeffel: { base: 'tl', factor: 3 },
};

/** Bevorzugte Anzeige-Einheit je Basis, abhaengig von der Groesse. */
const DISPLAY_STEPS: Record<string, Array<{ unit: string; factor: number; min: number }>> = {
  g: [
    { unit: 'kg', factor: 1000, min: 1000 },
    { unit: 'g', factor: 1, min: 0 },
  ],
  ml: [
    { unit: 'l', factor: 1000, min: 1000 },
    { unit: 'ml', factor: 1, min: 0 },
  ],
  tl: [
    { unit: 'EL', factor: 3, min: 3 },
    { unit: 'TL', factor: 1, min: 0 },
  ],
};

function unitKey(unit: string): string {
  return unit
    .trim()
    .toLowerCase()
    .replace(/\.$/, '')
    .replace(/\s+/g, '');
}

export function unitInfo(unit: string): { base: string; factor: number } | null {
  return UNIT_GROUPS[unitKey(unit)] ?? null;
}

/**
 * Koennen zwei Einheiten zusammengezaehlt werden?
 *
 * Eine fehlende Einheit passt zu jeder: wer "4 Eier" eintippt und spaeter ein
 * Rezept mit "4 Stück Eier" plant, will acht Eier auf der Liste sehen und
 * nicht zwei Zeilen.
 */
export function unitsCompatible(a: string, b: string): boolean {
  const ka = unitKey(a);
  const kb = unitKey(b);
  if (ka === kb) return true;
  if (!ka || !kb) return true;
  const ia = unitInfo(a);
  const ib = unitInfo(b);
  if (ia && ib) return ia.base === ib.base;
  return false;
}

/**
 * Zwei Mengen addieren. Gibt die Summe in einer sinnvollen Anzeige-Einheit
 * zurueck. Voraussetzung: `unitsCompatible(unitA, unitB)`.
 */
export function addAmounts(
  amountA: number | null,
  unitA: string,
  amountB: number | null,
  unitB: string,
): { amount: number | null; unit: string } {
  if (amountA == null && amountB == null) return { amount: null, unit: unitA || unitB };
  if (amountA == null) return { amount: amountB, unit: unitB };
  if (amountB == null) return { amount: amountA, unit: unitA };

  const ia = unitInfo(unitA);
  const ib = unitInfo(unitB);
  if (ia && ib && ia.base === ib.base) {
    const total = amountA * ia.factor + amountB * ib.factor;
    return displayFromBase(total, ia.base);
  }
  // Gleiche (oder leere) Einheit ohne Umrechnungstabelle: einfach addieren.
  return { amount: round(amountA + amountB), unit: unitA || unitB };
}

/**
 * Menge abziehen – das Gegenstueck zu addAmounts.
 *
 * Gebraucht, wenn ein geplantes Rezept wieder abgewaehlt wird: dann soll nur
 * dessen Anteil verschwinden, nicht der ganze Eintrag. Bleibt nichts uebrig
 * oder passen die Einheiten nicht zusammen, kommt `null` zurueck – der
 * Eintrag steht dann ohne Mengenangabe da, was ehrlicher ist als eine
 * ausgedachte Zahl.
 */
export function subtractAmounts(
  amountA: number | null,
  unitA: string,
  amountB: number | null,
  unitB: string,
): { amount: number | null; unit: string } {
  if (amountA == null) return { amount: null, unit: unitA };
  if (amountB == null) return { amount: amountA, unit: unitA };

  const ia = unitInfo(unitA);
  const ib = unitInfo(unitB);
  if (ia && ib && ia.base === ib.base) {
    const rest = amountA * ia.factor - amountB * ib.factor;
    if (rest <= 0.0001) return { amount: null, unit: unitA };
    return displayFromBase(rest, ia.base);
  }
  if ((unitA || '') !== (unitB || '')) return { amount: amountA, unit: unitA };

  const rest = round(amountA - amountB);
  if (rest <= 0) return { amount: null, unit: unitA };
  return { amount: rest, unit: unitA };
}

function displayFromBase(totalBase: number, base: string): { amount: number; unit: string } {
  const steps = DISPLAY_STEPS[base];
  if (!steps) return { amount: round(totalBase), unit: base };
  for (const step of steps) {
    if (totalBase >= step.min) {
      return { amount: round(totalBase / step.factor), unit: step.unit };
    }
  }
  return { amount: round(totalBase), unit: steps[steps.length - 1].unit };
}

function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}

/**
 * Menge fuer die Anzeige aufbereiten: haessliche Kommazahlen wie 133.3333
 * werden zu "133", 0.5 wird zu "½".
 */
const FRACTIONS: Array<[number, string]> = [
  [0.25, '¼'],
  [0.333, '⅓'],
  [0.5, '½'],
  [0.666, '⅔'],
  [0.75, '¾'],
];

export function formatAmount(amount: number | null): string {
  if (amount == null || Number.isNaN(amount)) return '';
  const abs = Math.abs(amount);
  if (abs === 0) return '0';

  // Grosse Mengen (typisch g/ml) auf ganze Zahlen runden.
  if (abs >= 20) return String(Math.round(amount));
  if (abs >= 10) return trimZeros(amount.toFixed(1));

  const whole = Math.floor(abs);
  const frac = abs - whole;
  for (const [value, glyph] of FRACTIONS) {
    if (Math.abs(frac - value) < 0.02) {
      const sign = amount < 0 ? '-' : '';
      return whole === 0 ? `${sign}${glyph}` : `${sign}${whole} ${glyph}`;
    }
  }
  if (frac < 0.02) return String(Math.round(amount));
  return trimZeros(amount.toFixed(2));
}

function trimZeros(s: string): string {
  return s.replace(/\.?0+$/, '');
}

/** Menge + Einheit als ein Stueck Text, z. B. "400 g" oder "1 ½ TL". */
export function formatQuantity(amount: number | null, unit: string): string {
  const a = formatAmount(amount);
  const u = (unit ?? '').trim();
  if (!a && !u) return '';
  if (!a) return u;
  if (!u) return a;
  return `${a} ${u}`;
}

/**
 * Namen fuer den Duplikat-Abgleich vereinheitlichen: Klein-/Grossschreibung,
 * Umlaute, Plural-Endungen und Zusaetze in Klammern werden ignoriert.
 */
export function normalizeName(name: string): string {
  let s = (name ?? '')
    .toLowerCase()
    .replace(/\(.*?\)/g, ' ')
    .replace(/[.,;:!?"'`´]/g, ' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ß/g, 'ss')
    .replace(/\s+/g, ' ')
    .trim();

  // Fuellwoerter, die den Kern der Zutat nicht veraendern.
  s = s.replace(/^(frische[rns]?|frisch|getrocknete[rns]?|gemahlene[rns]?)\s+/u, '');

  const words = s.split(' ').filter(Boolean).map(singular);
  return words.join(' ');
}

function singular(word: string): string {
  if (word.length <= 4) return word;
  for (const suffix of ['nnen', 'chen', 'lein']) {
    if (word.endsWith(suffix)) return word;
  }
  for (const suffix of ['en', 'er', 'es', 'e', 'n', 's']) {
    if (word.endsWith(suffix) && word.length - suffix.length >= 3) {
      return word.slice(0, word.length - suffix.length);
    }
  }
  return word;
}

export function sameIngredient(a: string, b: string): boolean {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  return na.length > 0 && na === nb;
}

/** Mengenangabe fuer eine geaenderte Portionenzahl skalieren. */
export function scaleAmount(amount: number | null, factor: number, noScale?: boolean): number | null {
  if (amount == null) return null;
  if (noScale) return amount;
  return round(amount * factor);
}

/** Sekunden als mm:ss (oder h:mm:ss) fuer den Kochtimer. */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;
  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
}

/**
 * Schnelleingabe zerlegen: aus "400 g Poulet" wird
 * `{ amount: 400, unit: 'g', name: 'Poulet' }`. Ohne Mengenangabe bleibt der
 * ganze Text der Name.
 */
export function parseQuickAdd(input: string): { name: string; amount: number | null; unit: string } {
  const text = input.trim().replace(/\s+/g, ' ');
  if (!text) return { name: '', amount: null, unit: '' };

  const match = text.match(/^(\d+(?:[.,]\d+)?)\s*([\p{L}]+\.?)?\s+(.+)$/u);
  if (!match) return { name: text, amount: null, unit: '' };

  const amount = Number(match[1].replace(',', '.'));
  const maybeUnit = (match[2] ?? '').trim();
  const rest = match[3].trim();

  if (!Number.isFinite(amount)) return { name: text, amount: null, unit: '' };
  if (!maybeUnit) return { name: rest, amount, unit: '' };

  // Nur bekannte oder sehr kurze Woerter als Einheit deuten – "2 Zwiebeln
  // gelb" soll nicht die Einheit "Zwiebeln" ergeben.
  const known = unitInfo(maybeUnit) !== null;
  const shortWord = maybeUnit.replace('.', '').length <= 4;
  const wordUnits = ['stück', 'stk', 'bund', 'dose', 'packung', 'becher', 'zehe', 'zehen', 'prise', 'knolle'];
  const isWordUnit = wordUnits.includes(maybeUnit.toLowerCase().replace('.', ''));

  if (known || isWordUnit || (shortWord && rest.length > 0)) {
    return { name: rest, amount, unit: maybeUnit };
  }
  return { name: `${maybeUnit} ${rest}`.trim(), amount, unit: '' };
}
