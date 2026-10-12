/**
 * Die englische Fassung eines Rezepts oder Gerichts pflegen.
 *
 * Gespeichert wird auf Deutsch. Fuer die englische Ansicht haengt an jedem
 * Rezept ein kleines Woerterbuch `en`: deutscher Text → englischer. Hier wird
 * ausgerechnet, welche Texte darin noch fehlen – ohne die, die die App schon
 * selbst kann (mitgelieferte Inhalte, bekannte Zutaten) – und wie eine
 * Antwort der KI hineinkommt. Was nicht mehr im Rezept steht, faellt dabei
 * heraus, damit das Woerterbuch nicht waechst.
 */

import type { Dish, Recipe } from './types';
import { SEED_EN } from './seedEn';
import { ABMESSEN } from './prep';
import { zutatenName } from './zutaten';
import { istEnglisch, rezeptTexte } from './sprache';

type Eintrag = Recipe | Dish;

function istRezept(eintrag: Eintrag): eintrag is Recipe {
  return 'steps' in eintrag;
}

/** Alle Texte des Eintrags, die in der englischen Ansicht erscheinen. */
function texteVon(eintrag: Eintrag): { texte: string[]; zutaten: string[] } {
  const texte = [eintrag.name];
  const notiz = eintrag.notes?.trim() ?? '';
  // "Übernommen von https://…" macht die Anzeige selbst; sonst die ganze Notiz.
  if (notiz && !/^Übernommen von \S+$/.test(notiz)) texte.push(notiz);
  if (istRezept(eintrag)) {
    texte.push(...(eintrag.prep ?? []), ...eintrag.steps.map((step) => step.text));
  }
  const zutaten = (eintrag.ingredients ?? []).map((zutat) => zutat.name);
  return {
    texte: texte.map((text) => text.trim()).filter(Boolean),
    zutaten: zutaten.map((name) => name.trim()).filter(Boolean),
  };
}

/** Was der KI noch fehlt – ohne Doppel. */
export function fehlendeTexte(eintrag: Eintrag): string[] {
  const vorhanden = eintrag.en ?? {};
  const { texte, zutaten } = texteVon(eintrag);
  const fehlt = new Set<string>();
  for (const text of texte) {
    if (text === ABMESSEN || vorhanden[text] || SEED_EN[text]) continue;
    fehlt.add(text);
  }
  for (const name of zutaten) {
    if (vorhanden[name] || SEED_EN[name] || zutatenName(name, 'en')) continue;
    fehlt.add(name);
  }
  return [...fehlt];
}

/**
 * Braucht der Eintrag die KI? Nicht, wenn er geloescht ist, die KI ihn schon
 * erfolglos versucht hat, oder er selbst noch englisch ist – den uebersetzt
 * erst die KI ins Deutsche (lib/uebersetzen), und bis dahin steht er in der
 * englischen Ansicht ohnehin richtig da.
 */
export function brauchtEnglisch(eintrag: Eintrag): boolean {
  if (eintrag.deleted || eintrag.enVersuch) return false;
  if (istRezept(eintrag) && istEnglisch(rezeptTexte(eintrag))) return false;
  return fehlendeTexte(eintrag).length > 0;
}

/** Die Antwort der KI ins Woerterbuch – und was nicht mehr vorkommt, hinaus. */
export function englischZusammenfuehren(eintrag: Eintrag, neu: Record<string, string>): Record<string, string> {
  const { texte, zutaten } = texteVon(eintrag);
  const gebraucht = new Set([...texte, ...zutaten]);
  const alles = { ...(eintrag.en ?? {}), ...neu };
  return Object.fromEntries(Object.entries(alles).filter(([deutsch]) => gebraucht.has(deutsch)));
}
