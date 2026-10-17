/**
 * Farbwelten der App: Diner und Dunkel.
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
    id: 'dunkel',
    name: 'Dunkel',
    beschreibung: 'Die Nachtfassung für abends',
    vorschau: ['#17110d', '#221a14', '#b57056', '#dccd8b'],
    themeColor: '#17110d',
  },
];

export const STANDARD_THEME = 'diner';
export const THEME_KEY = 'crave:theme';

/**
 * Laeuft im <head>, bevor irgendetwas gezeichnet wird – sonst blitzte beim
 * Oeffnen kurz die Standardfarbe auf. Muss ohne Imports auskommen. Eine
 * gespeicherte Farbwelt, die es nicht mehr gibt (Creme, Salbei, Pfirsich,
 * Himmel, Klar), faellt weg – dann gilt Diner.
 */
export const THEME_SCRIPT = `try{var k='${THEME_KEY}',t=localStorage.getItem(k),ok=${JSON.stringify(
  THEMES.map((theme) => theme.id),
)},c=${JSON.stringify(Object.fromEntries(THEMES.map((theme) => [theme.id, theme.themeColor])))};if(t&&ok.indexOf(t)<0){localStorage.removeItem(k);t=null}if(t){document.documentElement.setAttribute('data-theme',t);var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute('content',c[t])}}catch(e){}`;

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
