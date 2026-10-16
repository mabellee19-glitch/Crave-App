'use client';

import React, { useMemo, useRef, useState } from 'react';
import { Recipe, Step } from '@/lib/types';
import { blankIngredient, blankStep } from '@/lib/store';
import { kategorieErkennen } from '@/lib/category';
import { vorbereitungAusText, vorbereitungVorschlagen } from '@/lib/prep';
import { schritteKuerzen } from '@/lib/kuerzen';
import { randomId } from '@/lib/id';
import { useSprache, useT } from '@/lib/i18n';
import type { Texte } from '@/lib/texte';
import { Field, NumberInput, Sheet } from './ui';
import { IngredientEditor, aufgeraeumteZutaten } from './IngredientEditor';
import { IconArrowUp, IconPlus, IconSpark, IconTrash } from './Icons';

const CATEGORY_SUGGESTIONS = ['High-Protein', 'Comfort', 'Vegi', 'Frühstück', 'Dessert', 'Snack'];

/** Was die KI beim Lesen einer Seite verhindert hat – als halber Satz. */
function kiGrund(t: Texte, ki: string): string {
  const texte = t.rezeptForm.kiGrund;
  switch (ki) {
    case 'billing':
      return texte.billing;
    case 'no_key':
      return texte.no_key;
    case 'not_found':
      return texte.not_found;
    case 'rate_limit':
      return texte.rate_limit;
    default:
      return '';
  }
}

/** Warum ein englisches Rezept (noch) nicht uebersetzt ist. */
function uebersetzenGrund(t: Texte, ki: string): string {
  const texte = t.rezeptForm.uebersetzenGrund;
  switch (ki) {
    case 'billing':
      return texte.billing;
    case 'no_key':
      return texte.no_key;
    default:
      return '';
  }
}

/** Fehler der Import-Route in einen Satz uebersetzen, der weiterhilft. */
function importMeldung(t: Texte, code: string, ki = '', ausText = false): string {
  const texte = t.rezeptForm.importFehler;
  const einfuegen = texte.einfuegen;
  switch (code) {
    case 'no_recipe':
      return ausText
        ? texte.keinRezeptImText(kiGrund(t, ki)).trim()
        : texte.keinRezeptAufSeite(kiGrund(t, ki), einfuegen).replace(/\s+/g, ' ');
    case 'not_found':
      return texte.nichtGefunden;
    case 'blocked_by_site':
      return texte.gesperrt(einfuegen);
    case 'not_html':
      return texte.keineWebseite;
    case 'too_large':
      return texte.zuGross;
    case 'blocked_host':
    case 'unsupported_scheme':
    case 'unsupported_url':
      return texte.nichtAbrufbar;
    case 'missing_url':
      return texte.adresseFehlt;
    default:
      return texte.nichtGeladen(`${einfuegen.charAt(0).toLowerCase()}${einfuegen.slice(1)}`);
  }
}

/** Warum das Vereinfachen nicht geklappt hat – das Rezept bleibt in jedem Fall stehen. */
function kiMeldung(t: Texte, code: string): string {
  const texte = t.rezeptForm.kiFehler;
  switch (code) {
    case 'no_key':
      return texte.no_key;
    case 'billing':
      return texte.billing;
    case 'auth':
      return texte.auth;
    case 'rate_limit':
      return texte.rate_limit;
    case 'too_large':
      return texte.too_large;
    default:
      return texte.unbekannt;
  }
}

/** Die Schritte als ein Text, zum Vergleichen. */
function schritteAlsText(steps: Step[]): string {
  return steps
    .map((step) => step.text.trim())
    .filter(Boolean)
    .join('\n');
}

type KiStand =
  | { phase: 'aus' }
  | { phase: 'laeuft'; ort: 'oben' | 'schritte' }
  | {
      phase: 'fertig';
      ort: 'oben' | 'schritte';
      vorher: {
        steps: Step[];
        prepText: string;
        kuerzung: Recipe['kuerzung'];
        vorKuerzen: Recipe['vorKuerzen'];
      };
      fehlend: string[];
    }
  | {
      phase: 'fehler';
      ort: 'oben' | 'schritte';
      meldung: string;
      nochmal: boolean;
      /** Die Meldung sagt selbst, was mit den Schritten ist. */
      vollstaendig?: boolean;
    };

export function RecipeForm({
  initial,
  isNew,
  mitLink = false,
  mitText = false,
  onSave,
  onClose,
}: {
  initial: Recipe;
  isNew: boolean;
  /** Gewaehlt ueber "Rezept über Link": der Cursor steht gleich im Link-Feld. */
  mitLink?: boolean;
  /**
   * Gewaehlt ueber "Rezept aus Text": statt des Link-Felds steht gleich ein
   * grosses Textfeld da – fuer Rezepte aus Claude, ChatGPT oder Nachrichten.
   */
  mitText?: boolean;
  onSave: (recipe: Recipe) => void;
  onClose: () => void;
}) {
  const t = useT();
  const sprache = useSprache();
  const tf = t.rezeptForm;
  const [draft, setDraft] = useState<Recipe>(() => ({
    ...initial,
    ingredients: initial.ingredients.length ? initial.ingredients : [blankIngredient()],
    steps: initial.steps.length ? initial.steps : [blankStep()],
  }));
  const draftRef = useRef(draft);
  draftRef.current = draft;

  /*
   * Die Schritte, wie sie zuletzt von aussen kamen: aus dem Rezept, vom Import
   * oder von der KI. Weicht das Gespeicherte davon ab, hat jemand von Hand
   * daran gearbeitet – dann schreibt die KI im Hintergrund nicht mehr darueber.
   */
  const ausgang = useRef(schritteAlsText(initial.steps));

  const set = <K extends keyof Recipe>(key: K, value: Recipe[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  const nameValid = draft.name.trim().length > 0;

  /* ----------------------------- Kategorie -------------------------------- */

  /*
   * Bei einem neuen Rezept fuellt sich die Kategorie von selbst, waehrend die
   * Zutaten eingetragen werden. Wer selbst etwas eintippt, behaelt das.
   */
  const [kategorieAuto, setKategorieAuto] = useState(isNew && !initial.category.trim());
  const erkennung = useMemo(
    () =>
      kategorieErkennen({
        name: draft.name,
        servings: draft.servings,
        ingredients: draft.ingredients,
      }),
    [draft.name, draft.servings, draft.ingredients],
  );
  const kategorie = kategorieAuto ? (erkennung?.kategorie ?? '') : draft.category;

  /* ---------------------------- Vorbereitung ------------------------------ */

  // Als Text gefuehrt, eine Aufgabe pro Zeile: so bleibt eine eben getippte
  // Leerzeile stehen, bis die naechste Aufgabe drinsteht.
  const [prepText, setPrepText] = useState(() => (initial.prep ?? []).join('\n'));
  const [prepHinweis, setPrepHinweis] = useState<string | null>(null);

  const vorschlagen = () => {
    const vorhanden = vorbereitungAusText(prepText);
    const neu = vorbereitungVorschlagen(draft).filter(
      (aufgabe) => !vorhanden.some((alt) => alt.toLowerCase() === aufgabe.toLowerCase()),
    );
    if (neu.length === 0) {
      setPrepHinweis(tf.vorbereitungNichts);
      return;
    }
    setPrepHinweis(null);
    setPrepText([...vorhanden, ...neu].join('\n'));
  };

  /* ------------------------------ KI -------------------------------------- */

  const [ki, setKi] = useState<KiStand>({ phase: 'aus' });

  /**
   * Schritte kuerzer und einfacher machen und die Vorbereitung nach vorne
   * ziehen. Zutaten bleiben unangetastet. Das Ergebnis ersetzt die Schritte
   * nur, wenn sie in der Zwischenzeit niemand geaendert hat – und laesst sich
   * mit einem Tipp zuruecknehmen.
   */
  const vereinfachen = async (
    ort: 'oben' | 'schritte',
    quelle: Pick<Recipe, 'name' | 'servings' | 'ingredients' | 'steps'> = draftRef.current,
    prepVorher: string = prepText,
    // Was die KI zu lesen bekommt. Beim Import der ungeteilte Originaltext –
    // im Formular stehen dann schon die nach Regeln geteilten Schritte.
    vorlage: Step[] = quelle.steps,
  ) => {
    const steps = quelle.steps.filter((step) => step.text.trim());
    const eingabe = vorlage.filter((step) => step.text.trim());
    if (eingabe.length === 0) return;
    setKi({ phase: 'laeuft', ort });
    try {
      const antwort = await fetch('/api/simplify', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          recipe: {
            name: quelle.name,
            servings: quelle.servings,
            ingredients: quelle.ingredients
              .filter((zutat) => zutat.name.trim())
              .map(({ name, amount, unit }) => ({ name, amount, unit })),
            steps: eingabe.map(({ text, durationSec }) => ({ text, durationSec })),
          },
        }),
      });
      const daten = await antwort.json().catch(() => null);
      if (!antwort.ok || !daten?.ok) {
        const code = String(daten?.error ?? 'unknown');
        setKi({
          phase: 'fehler',
          ort,
          meldung: kiMeldung(t, code),
          nochmal: code !== 'no_key' && code !== 'too_large',
        });
        return;
      }

      // Hat jemand die Schritte inzwischen geaendert, wird nichts ueberschrieben.
      const aktuell = draftRef.current.steps.filter((step) => step.text.trim());
      const unveraendert =
        aktuell.length === steps.length && aktuell.every((step, i) => step.text === steps[i].text);
      if (!unveraendert) {
        setKi({
          phase: 'fehler',
          ort,
          meldung: tf.kiFehler.geaendert,
          nochmal: true,
          vollstaendig: true,
        });
        return;
      }

      const vorher = draftRef.current;
      const neueSchritte = (daten.steps as Array<{ text: string; durationSec: number | null }>).map(
        (schritt) => ({ ...blankStep(), text: schritt.text, durationSec: schritt.durationSec }),
      );
      ausgang.current = schritteAlsText(neueSchritte);
      setDraft((current) => ({
        ...current,
        steps: neueSchritte,
        kuerzung: 'ki',
        // Das Original fuer "Original wiederherstellen" im Rezept: beim Import
        // der ungeteilte Text, sonst die Schritte von eben.
        vorKuerzen: current.vorKuerzen ?? {
          steps: vorher.steps,
          prep: vorbereitungAusText(prepVorher),
        },
      }));
      setPrepText((daten.prep as string[]).join('\n'));
      setPrepHinweis(null);
      setKi({
        phase: 'fertig',
        ort,
        vorher: {
          steps: vorher.steps,
          prepText: prepVorher,
          kuerzung: vorher.kuerzung,
          vorKuerzen: vorher.vorKuerzen,
        },
        fehlend: Array.isArray(daten.missingNumbers) ? daten.missingNumbers : [],
      });
    } catch {
      setKi({
        phase: 'fehler',
        ort,
        meldung: tf.kiFehler.keineVerbindung,
        nochmal: true,
      });
    }
  };

  const zuruecknehmen = () => {
    if (ki.phase !== 'fertig') return;
    const { steps, prepText: text, kuerzung, vorKuerzen } = ki.vorher;
    ausgang.current = schritteAlsText(steps);
    setDraft((current) => ({ ...current, steps, kuerzung, vorKuerzen }));
    setPrepText(text);
    setKi({ phase: 'aus' });
  };

  /** Was mit den Schritten passiert, wenn die KI nicht helfen konnte. */
  const ohneKi =
    draft.kuerzung === 'regeln' && draft.vorKuerzen
      ? tf.ohneKiGeteilt
      : tf.ohneKi;

  const kiHinweis = (ort: 'oben' | 'schritte') => {
    if (ki.phase === 'aus' || ki.ort !== ort) return null;
    if (ki.phase === 'laeuft') {
      return (
        <div className="notice notice--ki" role="status">
          <IconSpark size={17} />
          <span>{tf.kiLaeuft}</span>
        </div>
      );
    }
    if (ki.phase === 'fehler') {
      return (
        <div className="notice" role="status">
          {ki.meldung} {ki.vollstaendig ? null : ohneKi}
          {ki.nochmal ? (
            <>
              {' '}
              <button className="btn btn--quiet" onClick={() => void vereinfachen(ort)}>
                {tf.nochmal}
              </button>
            </>
          ) : null}
        </div>
      );
    }
    return (
      <div className={`notice notice--ki${ki.fehlend.length ? ' notice--warn' : ''}`} role="status">
        <IconSpark size={17} />
        <div>
          <strong>{tf.kiFertig}</strong> {tf.kiFertigText}
          {ki.fehlend.length ? (
            <>
              {' '}
              <strong>{tf.kiFehlend(ki.fehlend.join(', '))}</strong>
            </>
          ) : null}
          <div>
            <button className="btn btn--quiet" style={{ paddingInline: 0 }} onClick={zuruecknehmen}>
              {tf.original}
            </button>
          </div>
        </div>
      </div>
    );
  };

  /* ------------------------------ Import ---------------------------------- */

  const [url, setUrl] = useState('');
  const [laedt, setLaedt] = useState(false);
  const [importFehler, setImportFehler] = useState<string | null>(null);
  // Fuer Seiten, die den Abruf sperren: den Rezepttext selbst einfuegen.
  const [textModus, setTextModus] = useState(mitText);
  const [rezeptText, setRezeptText] = useState('');
  const [importHinweis, setImportHinweis] = useState<string | null>(null);

  /**
   * Rezept einlesen – ueber den Link oder aus eingefuegtem Text – und das
   * Formular damit fuellen. Bewusst nicht direkt speichern: so sieht man
   * vorher, was angekommen ist, und kann es geraderuecken.
   */
  const holen = async (art: 'link' | 'text' = 'link') => {
    const eingabe = art === 'link' ? url.trim() : rezeptText.trim();
    if (!eingabe || laedt) return;
    setLaedt(true);
    setImportFehler(null);
    setImportHinweis(null);
    try {
      const antwort = await fetch('/api/import', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(art === 'link' ? { url: eingabe } : { text: eingabe }),
      });
      const daten = await antwort.json();
      if (!antwort.ok || !daten.ok) {
        const code = String(daten?.error ?? 'unknown');
        setImportFehler(importMeldung(t, code, String(daten?.ki ?? ''), art === 'text'));
        // Wo der Link nicht weiterkommt, hilft der Text.
        if (art === 'link' && code !== 'not_found' && code !== 'missing_url') setTextModus(true);
        return;
      }

      const rezept = daten.recipe as {
        name: string;
        servings: number | null;
        timeMin: number | null;
        ingredients: Array<{ name: string; amount: number | null; unit: string }>;
        steps: Array<{ text: string; durationSec: number | null }>;
        source: string;
        herkunft?: 'seite' | 'text' | 'ki';
        uebersetztAus?: 'en';
        sprache?: 'en';
        kiFehler?: string;
        notes?: string;
      };

      const current = draftRef.current;
      const uebernommen: Recipe = {
        ...current,
        name: rezept.name || current.name,
        servings: rezept.servings ?? current.servings,
        timeMin: rezept.timeMin ?? current.timeMin,
        ingredients: rezept.ingredients.length
          ? rezept.ingredients.map((zutat) => ({ ...blankIngredient(), ...zutat }))
          : current.ingredients,
        steps: rezept.steps.length
          ? rezept.steps.map((schritt) => ({ ...blankStep(), ...schritt }))
          : current.steps,
        // Einleitung und Tipps aus dem Text, dazu woher es stammt.
        notes:
          current.notes ||
          [rezept.notes, rezept.source ? `Übernommen von ${rezept.source}` : ''].filter(Boolean).join(' '),
        // Ein neuer Import ersetzt den Inhalt – und mit ihm, was die KI
        // daran schon versucht hat.
        uebersetztAus: rezept.uebersetztAus,
        uebersetzungVersuch: undefined,
      };
      // Sofort eine Vorbereitung aus dem Text – die KI ersetzt sie gleich
      // durch eine bessere, falls sie eingerichtet ist.
      const vorbereitung = vorbereitungVorschlagen(uebernommen);
      // Und sofort kurze Schritte: lange an den Satzgrenzen geteilt,
      // Verweise auf die Webseite gestrichen. Die KI liest trotzdem das
      // Original – daraus macht sie mehr als aus den Stuecken.
      const original = uebernommen.steps;
      const gekuerzt = rezept.steps.length ? schritteKuerzen(original, () => randomId()) : null;
      const mitKurzenSchritten: Recipe = {
        ...uebernommen,
        steps: gekuerzt ?? original,
        kuerzung: 'regeln',
        vorKuerzen: gekuerzt ? { steps: original, prep: vorbereitung } : undefined,
      };
      draftRef.current = mitKurzenSchritten;
      ausgang.current = schritteAlsText(mitKurzenSchritten.steps);
      setDraft(mitKurzenSchritten);
      setPrepText(vorbereitung.join('\n'));
      setUrl('');
      setRezeptText('');
      setTextModus(false);
      const hinweise: string[] = [];
      if (rezept.herkunft === 'ki') {
        hinweise.push(tf.importHinweis.vonKi);
      } else if (rezept.herkunft === 'text') {
        hinweise.push(tf.importHinweis.vonText);
      } else if (rezept.herkunft === 'seite') {
        hinweise.push(tf.importHinweis.vonSeite);
      }
      if (rezept.uebersetztAus === 'en') {
        hinweise.push(tf.importHinweis.uebersetzt);
      }
      if (hinweise.length) hinweise.push(tf.importHinweis.pruefen);
      if (rezept.sprache === 'en') {
        hinweise.push(tf.importHinweis.aufEnglisch(uebersetzenGrund(t, rezept.kiFehler ?? '')).trim());
      }
      if (hinweise.length) setImportHinweis(hinweise.join(' '));
      if (rezept.steps.length) {
        void vereinfachen('oben', mitKurzenSchritten, vorbereitung.join('\n'), original);
      }
    } catch {
      setImportFehler(tf.keineVerbindungImport);
    } finally {
      setLaedt(false);
    }
  };

  const setStep = (id: string, patch: Partial<Step>) =>
    set(
      'steps',
      draft.steps.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );

  const move = <T,>(list: T[], from: number, to: number): T[] => {
    if (to < 0 || to >= list.length) return list;
    const copy = [...list];
    const [item] = copy.splice(from, 1);
    copy.splice(to, 0, item);
    return copy;
  };

  const listId = useMemo(() => `cats-${draft.id}`, [draft.id]);

  const submit = () => {
    if (!nameValid) return;
    const ingredients = aufgeraeumteZutaten(draft.ingredients);
    const steps = draft.steps
      .filter((item) => item.text.trim().length > 0)
      .map((item) => ({ ...item, text: item.text.trim() }));

    // Ein neues Rezept bekommt immer eine Vorbereitung: steht keine drin, wird
    // sie aus den Schritten gelesen. Ein altes Rezept ohne Vorbereitung bleibt
    // so, bis der Start sie einmal ergaenzt.
    let prep: string[] | undefined = vorbereitungAusText(prepText);
    if (prep.length === 0 && isNew) prep = vorbereitungVorschlagen({ ingredients, steps });
    if (prep.length === 0 && initial.prep === undefined && !isNew) prep = undefined;

    const vonHand = draft.kuerzung === 'regeln' && schritteAlsText(steps) !== ausgang.current;

    onSave({
      ...draft,
      name: draft.name.trim(),
      category: kategorie.trim(),
      servings: draft.servings > 0 ? draft.servings : 1,
      ingredients,
      prep,
      steps,
      kuerzung: vonHand ? 'eigen' : draft.kuerzung,
    });
  };

  return (
    <Sheet
      title={isNew ? tf.titelNeu : tf.titelBearbeiten}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn--ghost" onClick={onClose}>
            {t.allgemein.abbrechen}
          </button>
          <button className="btn btn--primary" style={{ flex: 1 }} onClick={submit} disabled={!nameValid}>
            {t.allgemein.speichern}
          </button>
        </>
      }
    >
      <div style={{ height: 16 }} />

      {isNew ? (
        <>
          {mitText ? null : (
          <Field
            label={tf.linkLabel}
            htmlFor="recipe-url"
            hint={tf.linkHinweis}
          >
            <div className="inputrow">
              <input
                id="recipe-url"
                className="input"
                type="url"
                inputMode="url"
                value={url}
                placeholder="https://…"
                onChange={(event) => setUrl(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    void holen();
                  }
                }}
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                autoFocus={mitLink}
              />
              <button
                className="btn btn--primary"
                onClick={() => void holen()}
                disabled={!url.trim() || laedt}
              >
                {laedt ? tf.laedt : tf.holen}
              </button>
            </div>
          </Field>
          )}

          {importFehler ? (
            <div className="notice notice--warn" style={{ marginBottom: 16 }} role="alert">
              {importFehler}
            </div>
          ) : null}

          {textModus ? (
            <Field
              label={mitText ? tf.textLabelFrei : tf.textLabel}
              htmlFor="recipe-text"
              hint={mitText ? tf.textHinweisFrei : tf.textHinweis}
            >
              <textarea
                id="recipe-text"
                className="textarea"
                rows={mitText ? 12 : 6}
                value={rezeptText}
                placeholder={mitText ? tf.textPlatzhalterFrei : tf.textPlatzhalter}
                onChange={(event) => setRezeptText(event.target.value)}
                autoFocus={mitText}
              />
              <div style={{ height: 8 }} />
              <button
                className="btn btn--primary"
                onClick={() => void holen('text')}
                disabled={!rezeptText.trim() || laedt}
              >
                {laedt ? tf.liest : mitText ? tf.umwandeln : tf.textUebernehmen}
              </button>
            </Field>
          ) : (
            <button
              className="btn btn--quiet"
              style={{ paddingInline: 0, marginTop: -6, marginBottom: 10 }}
              onClick={() => setTextModus(true)}
            >
              {mitText ? tf.andererText : tf.oderText}
            </button>
          )}

          {importHinweis ? (
            <div className="notice" style={{ marginBottom: 16 }} role="status">
              {importHinweis}
            </div>
          ) : null}

          {kiHinweis('oben')}

          <hr className="divider" />
        </>
      ) : null}

      <Field label={tf.name} htmlFor="recipe-name">
        <input
          id="recipe-name"
          className="input"
          value={draft.name}
          placeholder={tf.namePlatzhalter}
          onChange={(event) => set('name', event.target.value)}
          autoComplete="off"
        />
      </Field>

      <Field
        label={tf.kategorie}
        htmlFor="recipe-category"
        hint={
          kategorieAuto && erkennung ? (
            tf.kategorieErkannt(sprache === 'en' ? erkennung.grundEn : erkennung.grund)
          ) : isNew && !kategorieAuto && erkennung && erkennung.kategorie !== kategorie ? (
            <button
              type="button"
              className="btn btn--quiet"
              style={{ paddingInline: 0, minHeight: 32 }}
              onClick={() => setKategorieAuto(true)}
            >
              {tf.kategorieVorschlag(erkennung.kategorie)}
            </button>
          ) : undefined
        }
      >
        <input
          id="recipe-category"
          className="input"
          list={listId}
          value={kategorie}
          placeholder={isNew ? tf.kategorieAutoPlatzhalter : tf.kategoriePlatzhalter}
          onChange={(event) => {
            setKategorieAuto(false);
            set('category', event.target.value);
          }}
          autoComplete="off"
        />
        <datalist id={listId}>
          {CATEGORY_SUGGESTIONS.map((option) => (
            <option value={option} key={option} />
          ))}
        </datalist>
      </Field>

      <div className="inputrow">
        <div style={{ flex: 1 }}>
          <Field label={tf.portionen} htmlFor="recipe-servings">
            <NumberInput
              id="recipe-servings"
              value={draft.servings}
              min={1}
              onChange={(value) => set('servings', value ?? 1)}
              placeholder="2"
            />
          </Field>
        </div>
        <div style={{ flex: 1 }}>
          <Field label={tf.zeit} htmlFor="recipe-time">
            <NumberInput
              id="recipe-time"
              value={draft.timeMin}
              onChange={(value) => set('timeMin', value)}
              placeholder="30"
            />
          </Field>
        </div>
      </div>

      <hr className="divider" />

      <div className="detail__sectionhead">
        <span className="detail__h">{tf.zutaten}</span>
        <span className="row__note">{tf.zutatenSpalten}</span>
      </div>

      <IngredientEditor
        ingredients={draft.ingredients}
        onChange={(next) => set('ingredients', next)}
      />

      <hr className="divider" />

      <div className="detail__sectionhead">
        <label className="detail__h" htmlFor="recipe-prep">
          {tf.vorbereitung}
        </label>
        <span className="row__note">{tf.vorbereitungZeilen}</span>
      </div>
      <textarea
        id="recipe-prep"
        className="textarea"
        value={prepText}
        rows={Math.max(3, prepText.split('\n').length + 1)}
        placeholder={tf.vorbereitungPlatzhalter}
        onChange={(event) => {
          setPrepText(event.target.value);
          setPrepHinweis(null);
        }}
      />
      <div className="rowline" style={{ marginTop: 6, alignItems: 'flex-start' }}>
        <span className="row__note" style={{ flex: 1, minWidth: 180 }}>
          {prepHinweis ?? tf.vorbereitungErklaerung}
        </span>
        <button type="button" className="btn btn--quiet" onClick={vorschlagen}>
          {tf.vorschlagen}
        </button>
      </div>

      <hr className="divider" />

      <div className="detail__sectionhead">
        <span className="detail__h">{tf.zubereitung}</span>
        <button
          type="button"
          className="btn btn--quiet"
          style={{ minHeight: 34 }}
          onClick={() => void vereinfachen('schritte')}
          disabled={ki.phase === 'laeuft' || !draft.steps.some((step) => step.text.trim())}
        >
          <IconSpark size={16} />
          {tf.mitKiVereinfachen}
        </button>
      </div>

      {kiHinweis('schritte')}

      {draft.steps.map((step, index) => (
        <div className="editcard" key={step.id}>
          <div className="editcard__head">
            <span className="editcard__num">{index + 1}</span>
            <span className="spacer" />
            <button
              className="iconbtn iconbtn--plain"
              aria-label={tf.schrittHoch(index + 1)}
              disabled={index === 0}
              onClick={() => set('steps', move(draft.steps, index, index - 1))}
            >
              <IconArrowUp size={18} />
            </button>
            <button
              className="iconbtn iconbtn--plain"
              aria-label={tf.schrittEntfernen(index + 1)}
              onClick={() =>
                set(
                  'steps',
                  draft.steps.length > 1
                    ? draft.steps.filter((item) => item.id !== step.id)
                    : [blankStep()],
                )
              }
            >
              <IconTrash size={19} />
            </button>
          </div>
          <textarea
            className="textarea"
            value={step.text}
            placeholder={tf.schrittPlatzhalter}
            aria-label={tf.schrittText(index + 1)}
            onChange={(event) => setStep(step.id, { text: event.target.value })}
          />
          <div className="rowline" style={{ marginTop: 8 }}>
            <span className="row__note" style={{ flex: 'none' }}>
              {tf.timer}
            </span>
            <NumberInput
              className="input editrow__amount"
              value={step.durationSec == null ? null : Math.round((step.durationSec / 60) * 10) / 10}
              onChange={(value) =>
                setStep(step.id, { durationSec: value == null ? null : Math.round(value * 60) })
              }
              placeholder="—"
              ariaLabel={tf.timerFuer(index + 1)}
            />
          </div>
        </div>
      ))}

      <button className="btn btn--ghost btn--block" onClick={() => set('steps', [...draft.steps, blankStep()])}>
        <IconPlus size={18} />
        {tf.schrittHinzufuegen}
      </button>

      <hr className="divider" />

      <Field label={tf.notiz} htmlFor="recipe-notes">
        <textarea
          id="recipe-notes"
          className="textarea"
          value={draft.notes}
          placeholder={tf.notizPlatzhalter}
          onChange={(event) => set('notes', event.target.value)}
        />
      </Field>
    </Sheet>
  );
}
