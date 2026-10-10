'use client';

import React, { useMemo, useRef, useState } from 'react';
import { Recipe, Step } from '@/lib/types';
import { blankIngredient, blankStep } from '@/lib/store';
import { kategorieErkennen } from '@/lib/category';
import { vorbereitungAusText, vorbereitungVorschlagen } from '@/lib/prep';
import { schritteKuerzen } from '@/lib/kuerzen';
import { randomId } from '@/lib/id';
import { Field, NumberInput, Sheet } from './ui';
import { IngredientEditor, aufgeraeumteZutaten } from './IngredientEditor';
import { IconArrowUp, IconPlus, IconSpark, IconTrash } from './Icons';

const CATEGORY_SUGGESTIONS = ['High-Protein', 'Comfort', 'Vegi', 'Frühstück', 'Dessert', 'Snack'];

/** Fehler der Import-Route in einen Satz uebersetzen, der weiterhilft. */
function importMeldung(code: string): string {
  switch (code) {
    case 'no_recipe':
      return 'Auf dieser Seite steht kein maschinenlesbares Rezept. Die meisten Rezeptseiten liefern eines – bei Blogs und Videoseiten fehlt es oft. Dann hilft nur von Hand.';
    case 'not_found':
      return 'Die Seite gibt es nicht (404). Stimmt die Adresse?';
    case 'blocked_by_site':
      return 'Die Seite hat den Abruf abgelehnt. Manche Seiten lassen nur Browser zu.';
    case 'not_html':
      return 'Das ist keine Webseite, sondern eine Datei.';
    case 'too_large':
      return 'Die Seite ist zu gross.';
    case 'blocked_host':
    case 'unsupported_scheme':
    case 'unsupported_url':
      return 'Diese Adresse lässt sich nicht abrufen.';
    case 'missing_url':
      return 'Bitte eine Adresse einfügen.';
    default:
      return 'Die Seite liess sich nicht laden. Versuch es nochmal.';
  }
}

/** Warum das Vereinfachen nicht geklappt hat – das Rezept bleibt in jedem Fall stehen. */
function kiMeldung(code: string): string {
  switch (code) {
    case 'no_key':
      return 'Auf dem Server ist kein Zugang zum Modell eingerichtet.';
    case 'billing':
      return 'Beim Anbieter fehlt die Zahlungsangabe (Vercel → AI Gateway).';
    case 'auth':
      return 'Der hinterlegte Schlüssel wird nicht akzeptiert.';
    case 'rate_limit':
      return 'Gerade zu viele Anfragen. Kurz warten und nochmal versuchen.';
    case 'too_large':
      return 'Das Rezept ist zu lang zum Vereinfachen.';
    default:
      return 'Vereinfachen hat nicht geklappt.';
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
  onSave,
  onClose,
}: {
  initial: Recipe;
  isNew: boolean;
  /** Gewaehlt ueber "Rezept über Link": der Cursor steht gleich im Link-Feld. */
  mitLink?: boolean;
  onSave: (recipe: Recipe) => void;
  onClose: () => void;
}) {
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
      setPrepHinweis('In den Schritten steht nichts, was vorher geschnitten werden müsste.');
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
          meldung: kiMeldung(code),
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
          meldung: 'Die Schritte wurden in der Zwischenzeit geändert – deshalb bleibt deine Fassung stehen.',
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
        meldung: 'Keine Verbindung zum Server.',
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
      ? 'Lange Schritte sind schon in kurze aufgeteilt. Umformuliert wird, sobald die KI erreichbar ist.'
      : 'Die Schritte bleiben, wie sie sind.';

  const kiHinweis = (ort: 'oben' | 'schritte') => {
    if (ki.phase === 'aus' || ki.ort !== ort) return null;
    if (ki.phase === 'laeuft') {
      return (
        <div className="notice notice--ki" role="status">
          <IconSpark size={17} />
          <span>Die Schritte werden mit KI vereinfacht …</span>
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
                Nochmal versuchen
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
          <strong>Mit KI vereinfacht.</strong> Kürzere Schritte, das Schnibbeln steht jetzt in der
          Vorbereitung. Zutaten, Mengen und Reihenfolge bleiben gleich.
          {ki.fehlend.length ? (
            <>
              {' '}
              <strong>
                Bitte kurz prüfen: im Original stand noch {ki.fehlend.join(', ')}.
              </strong>
            </>
          ) : null}
          <div>
            <button className="btn btn--quiet" style={{ paddingInline: 0 }} onClick={zuruecknehmen}>
              Original wiederherstellen
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

  /**
   * Rezeptseite einlesen und das Formular damit fuellen. Bewusst nicht direkt
   * speichern: so sieht man vorher, was angekommen ist, und kann es geraderuecken.
   */
  const holen = async () => {
    const adresse = url.trim();
    if (!adresse || laedt) return;
    setLaedt(true);
    setImportFehler(null);
    try {
      const antwort = await fetch('/api/import', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ url: adresse }),
      });
      const daten = await antwort.json();
      if (!antwort.ok || !daten.ok) {
        setImportFehler(importMeldung(String(daten?.error ?? 'unknown')));
        return;
      }

      const rezept = daten.recipe as {
        name: string;
        servings: number | null;
        timeMin: number | null;
        ingredients: Array<{ name: string; amount: number | null; unit: string }>;
        steps: Array<{ text: string; durationSec: number | null }>;
        source: string;
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
        notes: current.notes || `Übernommen von ${rezept.source}`,
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
      if (rezept.steps.length) {
        void vereinfachen('oben', mitKurzenSchritten, vorbereitung.join('\n'), original);
      }
    } catch {
      setImportFehler('Die Seite liess sich nicht laden. Prüfe die Verbindung.');
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
      title={isNew ? 'Neues Rezept' : 'Rezept bearbeiten'}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn--ghost" onClick={onClose}>
            Abbrechen
          </button>
          <button className="btn btn--primary" style={{ flex: 1 }} onClick={submit} disabled={!nameValid}>
            Speichern
          </button>
        </>
      }
    >
      <div style={{ height: 16 }} />

      {isNew ? (
        <>
          <Field
            label="Rezept über Link hinzufügen"
            htmlFor="recipe-url"
            hint="Adresse einer Rezeptseite einfügen – Zutaten und Zubereitung werden übernommen, samt Timern. Danach lässt sich alles noch ändern."
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
                {laedt ? 'Lädt…' : 'Holen'}
              </button>
            </div>
          </Field>

          {importFehler ? (
            <div className="notice notice--warn" style={{ marginBottom: 16 }}>
              {importFehler}
            </div>
          ) : null}

          {kiHinweis('oben')}

          <hr className="divider" />
        </>
      ) : null}

      <Field label="Name" htmlFor="recipe-name">
        <input
          id="recipe-name"
          className="input"
          value={draft.name}
          placeholder="z. B. Poulet mit Brokkoli"
          onChange={(event) => set('name', event.target.value)}
          autoComplete="off"
        />
      </Field>

      <Field
        label="Kategorie"
        htmlFor="recipe-category"
        hint={
          kategorieAuto && erkennung ? (
            <>Automatisch erkannt: {erkennung.grund}</>
          ) : isNew && !kategorieAuto && erkennung && erkennung.kategorie !== kategorie ? (
            <button
              type="button"
              className="btn btn--quiet"
              style={{ paddingInline: 0, minHeight: 32 }}
              onClick={() => setKategorieAuto(true)}
            >
              Vorschlag aus den Zutaten: {erkennung.kategorie}
            </button>
          ) : undefined
        }
      >
        <input
          id="recipe-category"
          className="input"
          list={listId}
          value={kategorie}
          placeholder={isNew ? 'Wird aus den Zutaten erkannt' : 'z. B. High-Protein'}
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
          <Field label="Portionen" htmlFor="recipe-servings">
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
          <Field label="Zubereitungszeit (Min)" htmlFor="recipe-time">
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
        <span className="detail__h">Zutaten</span>
        <span className="row__note">Menge · Einheit · Zutat</span>
      </div>

      <IngredientEditor
        ingredients={draft.ingredients}
        onChange={(next) => set('ingredients', next)}
      />

      <hr className="divider" />

      <div className="detail__sectionhead">
        <label className="detail__h" htmlFor="recipe-prep">
          Vorbereitung
        </label>
        <span className="row__note">eine Aufgabe pro Zeile</span>
      </div>
      <textarea
        id="recipe-prep"
        className="textarea"
        value={prepText}
        rows={Math.max(3, prepText.split('\n').length + 1)}
        placeholder={'z. B. Zwiebel fein hacken\nZucchini würfeln\nCherrytomaten halbieren'}
        onChange={(event) => {
          setPrepText(event.target.value);
          setPrepHinweis(null);
        }}
      />
      <div className="rowline" style={{ marginTop: 6, alignItems: 'flex-start' }}>
        <span className="row__note" style={{ flex: 1, minWidth: 180 }}>
          {prepHinweis ??
            'Was vor dem Kochen geschnitten und bereitgelegt wird. Das Abmessen der Zutaten kommt im Kochmodus von selbst dazu.'}
        </span>
        <button type="button" className="btn btn--quiet" onClick={vorschlagen}>
          Aus den Schritten vorschlagen
        </button>
      </div>

      <hr className="divider" />

      <div className="detail__sectionhead">
        <span className="detail__h">Zubereitung</span>
        <button
          type="button"
          className="btn btn--quiet"
          style={{ minHeight: 34 }}
          onClick={() => void vereinfachen('schritte')}
          disabled={ki.phase === 'laeuft' || !draft.steps.some((step) => step.text.trim())}
        >
          <IconSpark size={16} />
          Mit KI vereinfachen
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
              aria-label={`Schritt ${index + 1} nach oben`}
              disabled={index === 0}
              onClick={() => set('steps', move(draft.steps, index, index - 1))}
            >
              <IconArrowUp size={18} />
            </button>
            <button
              className="iconbtn iconbtn--plain"
              aria-label={`Schritt ${index + 1} entfernen`}
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
            placeholder="Was ist in diesem Schritt zu tun?"
            aria-label={`Text für Schritt ${index + 1}`}
            onChange={(event) => setStep(step.id, { text: event.target.value })}
          />
          <div className="rowline" style={{ marginTop: 8 }}>
            <span className="row__note" style={{ flex: 'none' }}>
              Timer (Min)
            </span>
            <NumberInput
              className="input editrow__amount"
              value={step.durationSec == null ? null : Math.round((step.durationSec / 60) * 10) / 10}
              onChange={(value) =>
                setStep(step.id, { durationSec: value == null ? null : Math.round(value * 60) })
              }
              placeholder="—"
              ariaLabel={`Timer für Schritt ${index + 1} in Minuten`}
            />
          </div>
        </div>
      ))}

      <button className="btn btn--ghost btn--block" onClick={() => set('steps', [...draft.steps, blankStep()])}>
        <IconPlus size={18} />
        Schritt hinzufügen
      </button>

      <hr className="divider" />

      <Field label="Notiz" htmlFor="recipe-notes">
        <textarea
          id="recipe-notes"
          className="textarea"
          value={draft.notes}
          placeholder="Optional: Hinweise, Beilagen, Varianten"
          onChange={(event) => set('notes', event.target.value)}
        />
      </Field>
    </Sheet>
  );
}
