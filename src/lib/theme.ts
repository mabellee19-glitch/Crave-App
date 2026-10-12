/**
 * Farbwelten der App.
 *
 * Die Farben selbst stehen in globals.css unter `:root[data-theme=…]`; hier
 * steht nur, welche es gibt, wie sie heissen und welche Farben die kleine
 * Vorschau in den Einstellungen zeigt. Gemerkt wird die Wahl pro Geraet –
 * das iPad darf ruhig anders aussehen als das iPhone.
 */

export interface Theme {
  id: string;
  name: string;
  beschreibung: string;
  /** Seitengrund, Karte, Akzent, zweiter Akzent – fuer die Vorschau. */
  vorschau: [string, string, string, string];
  /** Farbe der Statusleiste und des Browser-Rahmens. */
  themeColor: string;
}

export const THEMES: Theme[] = [
  {
    id: 'diner',
    name: 'Diner',
    beschreibung: 'Wie das Logo: Tomatenrot, Senfgelb, Espresso',
    vorschau: ['#fff6e6', '#fffcf5', '#d7263d', '#f2b632'],
    themeColor: '#fff6e6',
  },
  {
    id: 'creme',
    name: 'Creme',
    beschreibung: 'Warm und ruhig, Kupfer als Akzent',
    vorschau: ['#faf6ea', '#fffdf7', '#7f3b25', '#a7993c'],
    themeColor: '#faf6ea',
  },
  {
    id: 'salbei',
    name: 'Salbei',
    beschreibung: 'Frisch und grün, viel Weiss',
    vorschau: ['#f4f7f1', '#ffffff', '#3c7650', '#c86f1e'],
    themeColor: '#f4f7f1',
  },
  {
    id: 'pfirsich',
    name: 'Pfirsich',
    beschreibung: 'Fröhlich und warm, Koralle als Akzent',
    vorschau: ['#fff6f0', '#ffffff', '#c24b20', '#4a6fa5'],
    themeColor: '#fff6f0',
  },
  {
    id: 'himmel',
    name: 'Himmel',
    beschreibung: 'Hell und luftig, Blau als Akzent',
    vorschau: ['#f3f7fc', '#ffffff', '#2c68ad', '#c8603e'],
    themeColor: '#f3f7fc',
  },
  {
    id: 'klar',
    name: 'Klar',
    beschreibung: 'Reinweiss und modern, Tomatenrot',
    vorschau: ['#ffffff', '#f5f5f3', '#c43a25', '#2f6db5'],
    themeColor: '#ffffff',
  },
  {
    id: 'dunkel',
    name: 'Dunkel',
    beschreibung: 'Die Nachtfassung für abends',
    vorschau: ['#17110d', '#221a14', '#b57056', '#dccd8b'],
    themeColor: '#17110d',
  },
];

export const STANDARD_THEME = 'diner';
export const THEME_KEY = 'crave:theme';

/*
 * Mit dem neuen Logo wurde Diner zum Standard. Creme war es bis dahin – wer
 * es gespeichert hat, hat es meist nie bewusst gewaehlt. Einmalig wechselt
 * Creme deshalb zu Diner; wer danach Creme waehlt, behaelt es.
 */
const MARKE_KEY = 'crave:marke';
const MARKE = 'diner-2026';

/**
 * Laeuft im <head>, bevor irgendetwas gezeichnet wird – sonst blitzte beim
 * Oeffnen kurz die Standardfarbe auf. Muss ohne Imports auskommen.
 */
export const THEME_SCRIPT = `try{var t=localStorage.getItem('${THEME_KEY}');if(localStorage.getItem('${MARKE_KEY}')!=='${MARKE}'){if(t==='creme'){t='diner';localStorage.setItem('${THEME_KEY}',t)}localStorage.setItem('${MARKE_KEY}','${MARKE}')}var ok=${JSON.stringify(
  THEMES.map((theme) => theme.id),
)};var c=${JSON.stringify(Object.fromEntries(THEMES.map((theme) => [theme.id, theme.themeColor])))};if(t&&ok.indexOf(t)>=0){document.documentElement.setAttribute('data-theme',t);var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute('content',c[t])}}catch(e){}`;

export function readTheme(): string {
  try {
    const gespeichert = window.localStorage.getItem(THEME_KEY);
    if (gespeichert && THEMES.some((theme) => theme.id === gespeichert)) return gespeichert;
  } catch {
    /* privater Modus */
  }
  return STANDARD_THEME;
}

export function applyTheme(id: string): void {
  const theme = THEMES.find((entry) => entry.id === id) ?? THEMES[0];
  document.documentElement.setAttribute('data-theme', theme.id);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme.themeColor);
  try {
    window.localStorage.setItem(THEME_KEY, theme.id);
  } catch {
    /* privater Modus – gilt dann bis zum Schliessen */
  }
}
