/**
 * Text aus dem Netz so aufraeumen, wie die App schreibt.
 *
 * - Schweizer Schreibweise: kein Eszett, immer "ss". Rezepte von deutschen
 *   Seiten bringen es mit ("Sosse", "grosse Schuessel" mit Eszett).
 * - Adressen ohne Werbeparameter: Links aus Suchanzeigen haengen an die
 *   Rezeptadresse hundert Zeichen "utm_…" und "gclid". Die braucht niemand,
 *   und sie machten die Notiz am Rezept unlesbar breit.
 *
 * Dieses Modul rechnet nur und laeuft auf dem Server wie im Browser.
 */

/** Eszett durch "ss" ersetzen – auch das grosse. */
export function ohneEszett(text: string): string {
  return text.replace(/ß/g, 'ss').replace(/ẞ/g, 'SS');
}

/** Parameter, die nur sagen, woher jemand kam – nicht, welche Seite gemeint ist. */
const WERBEPARAMETER = /^(utm_|mc_|_ga$|_gl$|gclid$|gclsrc$|gbraid$|wbraid$|dclid$|fbclid$|msclkid$|igshid$|yclid$|twclid$|ttclid$|li_fat_id$|srsltid$)/i;

/** Eine Adresse ohne Werbeparameter. Was keine Adresse ist, bleibt unveraendert. */
export function ohneTracking(adresse: string): string {
  let url: URL;
  try {
    url = new URL(adresse);
  } catch {
    return adresse;
  }
  const weg = [...url.searchParams.keys()].filter((name) => WERBEPARAMETER.test(name));
  if (weg.length === 0) return adresse;
  for (const name of weg) url.searchParams.delete(name);
  // Ohne verbliebene Parameter auch kein einsames "?" am Ende.
  return url.toString().replace(/\?$/, '');
}

/**
 * Adressen in einem Text finden. Satzzeichen am Ende gehoeren zum Satz, nicht
 * zur Adresse: aus "siehe https://x.ch/a." wird "https://x.ch/a".
 */
const ADRESSE = /https?:\/\/[^\s<>"«»]*[^\s<>"«».,;:!?)]/g;

/** Text in Stuecke teilen: abwechselnd Text und Adresse (ungerade Stellen). */
export function textUndAdressen(text: string): string[] {
  const teile: string[] = [];
  let ab = 0;
  for (const treffer of text.matchAll(ADRESSE)) {
    teile.push(text.slice(ab, treffer.index), treffer[0]);
    ab = treffer.index + treffer[0].length;
  }
  teile.push(text.slice(ab));
  return teile;
}

/** Alle Adressen in einem Text von Werbeparametern befreien. */
export function textOhneTracking(text: string): string {
  return text.replace(ADRESSE, (adresse) => ohneTracking(adresse));
}

/** "https://www.swissmilk.ch/de/…" → "swissmilk.ch" – fuer die Anzeige. */
export function kurzeAdresse(adresse: string): string {
  try {
    return new URL(adresse).hostname.replace(/^www\./, '');
  } catch {
    return adresse;
  }
}
