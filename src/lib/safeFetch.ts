/**
 * Eine fremde Seite holen – vorsichtig.
 *
 * Die Adresse kommt von aussen. Ohne Pruefung liesse sich der Server dazu
 * bringen, interne Dienste abzurufen (etwa die Metadaten-Adresse des Hosters)
 * und deren Antwort auszuliefern. Deshalb wird jede Adresse aufgeloest und
 * jede Weiterleitung erneut geprueft.
 */

import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

/** Grosszuegig, aber nicht unbegrenzt – Rezeptseiten sind selten groesser. */
const MAX_BYTES = 4_000_000;
const TIMEOUT_MS = 15_000;
const MAX_REDIRECTS = 5;

/**
 * Wie ein Browser auftreten. Manche Seiten liefern ohne User-Agent nichts
 * oder eine Sparversion ohne die strukturierten Daten.
 */
const HEADERS = {
  'user-agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36',
  accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'accept-language': 'de-CH,de;q=0.9,en;q=0.8',
};

/**
 * Adressen im eigenen Netz sind tabu.
 *
 * Die Route holt eine Adresse, die von aussen kommt. Ohne diese Pruefung
 * liesse sich der Server dazu bringen, interne Dienste abzurufen und deren
 * Antwort auszuliefern.
 */
export function istPrivateAdresse(ip: string): boolean {
  if (isIP(ip) === 6) {
    const v6 = ip.toLowerCase();
    if (v6 === '::1' || v6 === '::') return true;
    if (v6.startsWith('fe80') || v6.startsWith('fc') || v6.startsWith('fd')) return true;
    // IPv4-in-IPv6 mit derselben Elle messen.
    const eingebettet = /::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(v6);
    if (eingebettet) return istPrivateAdresse(eingebettet[1]);
    return false;
  }

  const teile = ip.split('.').map(Number);
  if (teile.length !== 4 || teile.some((t) => !Number.isInteger(t))) return true;
  const [a, b] = teile;
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true; // Metadaten-Dienste der Hoster
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a >= 224) return true; // Multicast und reserviert
  return false;
}

/** Adresse pruefen und dabei aufloesen. Gibt einen Fehlercode zurueck oder null. */
export async function pruefeZiel(url: URL): Promise<string | null> {
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return 'unsupported_scheme';
  if (url.username || url.password) return 'unsupported_url';

  const roh = url.hostname.replace(/^\[|\]$/g, '');
  if (isIP(roh)) return istPrivateAdresse(roh) ? 'blocked_host' : null;

  try {
    const adressen = await lookup(roh, { all: true });
    if (adressen.length === 0) return 'unreachable';
    if (adressen.some((eintrag) => istPrivateAdresse(eintrag.address))) return 'blocked_host';
    return null;
  } catch {
    return 'unreachable';
  }
}

/**
 * Seite holen und dabei jede Weiterleitung erneut pruefen – sonst waere die
 * Adresspruefung mit einer Umleitung auszuhebeln.
 */
export async function holeSeite(start: URL): Promise<{ html: string; url: URL } | string> {
  let ziel = start;

  for (let sprung = 0; sprung <= MAX_REDIRECTS; sprung++) {
    const fehler = await pruefeZiel(ziel);
    if (fehler) return fehler;

    const abbruch = AbortSignal.timeout(TIMEOUT_MS);
    let antwort: Response;
    try {
      antwort = await fetch(ziel, { headers: HEADERS, redirect: 'manual', signal: abbruch });
    } catch {
      return 'unreachable';
    }

    if (antwort.status >= 300 && antwort.status < 400) {
      const weiter = antwort.headers.get('location');
      if (!weiter) return 'unreachable';
      try {
        ziel = new URL(weiter, ziel);
      } catch {
        return 'unsupported_url';
      }
      continue;
    }

    if (!antwort.ok) return antwort.status === 404 ? 'not_found' : 'blocked_by_site';

    const typ = antwort.headers.get('content-type') ?? '';
    if (typ && !/html|xml|text\/plain/i.test(typ)) return 'not_html';

    const laenge = Number(antwort.headers.get('content-length') ?? 0);
    if (laenge > MAX_BYTES) return 'too_large';

    const html = await liesBegrenzt(antwort);
    if (html === null) return 'too_large';
    return { html, url: ziel };
  }

  return 'unreachable';
}

/** Antwort lesen, aber nur bis zur Obergrenze. */
async function liesBegrenzt(antwort: Response): Promise<string | null> {
  if (!antwort.body) return await antwort.text();

  const leser = antwort.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let gelesen = 0;
  let text = '';

  for (;;) {
    const { done, value } = await leser.read();
    if (done) break;
    gelesen += value.byteLength;
    if (gelesen > MAX_BYTES) {
      await leser.cancel().catch(() => {});
      return null;
    }
    text += decoder.decode(value, { stream: true });
  }
  return text + decoder.decode();
}


export type HolFehler =
  | 'unsupported_scheme'
  | 'unsupported_url'
  | 'blocked_host'
  | 'unreachable'
  | 'not_found'
  | 'blocked_by_site'
  | 'not_html'
  | 'too_large';
