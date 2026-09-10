'use client';

import React, { useMemo, useState } from 'react';
import { Recipe, Step } from '@/lib/types';
import { blankIngredient, blankStep } from '@/lib/store';
import { Field, NumberInput, Sheet } from './ui';
import { IngredientEditor, aufgeraeumteZutaten } from './IngredientEditor';
import { IconArrowUp, IconPlus, IconTrash } from './Icons';

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

export function RecipeForm({
  initial,
  isNew,
  onSave,
  onClose,
}: {
  initial: Recipe;
  isNew: boolean;
  onSave: (recipe: Recipe) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<Recipe>(() => ({
    ...initial,
    ingredients: initial.ingredients.length ? initial.ingredients : [blankIngredient()],
    steps: initial.steps.length ? initial.steps : [blankStep()],
  }));

  const set = <K extends keyof Recipe>(key: K, value: Recipe[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  const nameValid = draft.name.trim().length > 0;

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

      setDraft((current) => ({
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
      }));
      setUrl('');
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
    onSave({
      ...draft,
      name: draft.name.trim(),
      category: draft.category.trim(),
      servings: draft.servings > 0 ? draft.servings : 1,
      ingredients: aufgeraeumteZutaten(draft.ingredients),
      steps: draft.steps
        .filter((item) => item.text.trim().length > 0)
        .map((item) => ({ ...item, text: item.text.trim() })),
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

      <Field label="Kategorie" htmlFor="recipe-category">
        <input
          id="recipe-category"
          className="input"
          list={listId}
          value={draft.category}
          placeholder="z. B. High-Protein"
          onChange={(event) => set('category', event.target.value)}
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
        <span className="detail__h">Zubereitung</span>
        <span className="row__note">Timer optional</span>
      </div>

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
