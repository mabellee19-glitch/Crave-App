'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Recipe } from '@/lib/types';
import { VisionIdea, VisionResult } from '@/lib/vision';
import { blankRecipe } from '@/lib/store';
import { normalizeName } from '@/lib/units';
import { useInhalt } from '@/lib/inhalt';
import { spracheJetzt } from '@/lib/i18n';
import { randomId } from '@/lib/id';
import { vorbereitungVorschlagen } from '@/lib/prep';
import { useT } from '@/lib/i18n';
import type { Texte } from '@/lib/texte';
import { Sheet } from './ui';
import { IconCamera, IconCart, IconClock, IconKnife, IconPlus, IconServings, IconSpark } from './Icons';

type Status =
  | { kind: 'start' }
  | { kind: 'busy' }
  | { kind: 'fertig'; result: VisionResult }
  | { kind: 'fehler'; error: string };

/** Ein Rezept aus der eigenen Sammlung, das zum Foto passt. */
interface Treffer {
  recipe: Recipe;
  vorhanden: number;
  gesamt: number;
  fehlt: string[];
}

export function FridgeSheet({
  recipes,
  pantry,
  onClose,
  onOpenRecipe,
  onSaveIdea,
  onAddMissing,
}: {
  recipes: Recipe[];
  /** Namen der Standard-Zutaten: die sind zu Hause, auch ohne aufs Foto zu passen. */
  pantry: string[];
  onClose: () => void;
  onOpenRecipe: (id: string) => void;
  onSaveIdea: (recipe: Recipe) => void;
  onAddMissing: (names: string[]) => void;
}) {
  const t = useT();
  const inhalt = useInhalt();
  const [status, setStatus] = useState<Status>({ kind: 'start' });
  // Ob auf dem Server ein Schlüssel hinterlegt ist. `null`, solange unbekannt.
  const [visionReady, setVisionReady] = useState<boolean | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let abgebrochen = false;
    fetch('/api/status', { cache: 'no-store' })
      .then((response) => response.json())
      .then((body) => {
        if (!abgebrochen) setVisionReady(Boolean(body?.vision));
      })
      .catch(() => {
        if (!abgebrochen) setVisionReady(null);
      });
    return () => {
      abgebrochen = true;
    };
  }, []);

  const erkannt = status.kind === 'fertig' ? status.result.lebensmittel : [];

  /**
   * Passende eigene Rezepte werden hier gerechnet, nicht vom Modell geraten:
   * so kann nichts vorgeschlagen werden, was es gar nicht gibt.
   */
  const treffer = useMemo<Treffer[]>(() => {
    if (erkannt.length === 0) return [];
    // Was in der Grundliste steht, ist zu Hause – sonst gälten Salz und Öl als
    // fehlend, nur weil sie nicht im Kühlschrank liegen.
    // Einmal vereinheitlicht und als Menge: vorher wurde fuer jede Zutat
    // jedes Rezepts die ganze Liste neu verglichen.
    const vorrat = new Set([...erkannt, ...pantry].map(normalizeName).filter(Boolean));
    return recipes
      .map((recipe) => {
        const zutaten = recipe.ingredients.filter((entry) => entry.name.trim());
        if (zutaten.length === 0) return null;
        const fehlt = zutaten
          .filter((entry) => !vorrat.has(normalizeName(entry.name)))
          .map((entry) => entry.name);
        const vorhanden = zutaten.length - fehlt.length;
        if (vorhanden === 0) return null;
        return { recipe, vorhanden, gesamt: zutaten.length, fehlt };
      })
      .filter((entry): entry is Treffer => entry !== null)
      .sort(
        (a, b) =>
          b.vorhanden / b.gesamt - a.vorhanden / a.gesamt ||
          b.vorhanden - a.vorhanden ||
          a.recipe.name.localeCompare(b.recipe.name, 'de'),
      )
      .slice(0, 5);
  }, [recipes, pantry, erkannt]);

  const analysieren = async (file: File) => {
    setStatus({ kind: 'busy' });
    try {
      const { photoToDataUrl } = await import('@/lib/image');
      const image = await photoToDataUrl(file);
      const response = await fetch('/api/vision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Auf Englisch antwortet die KI englisch; gespeichert wird es wie jedes
        // englische Rezept und dann ins Deutsche uebersetzt.
        body: JSON.stringify({ image, sprache: spracheJetzt() }),
      });
      const body = await response.json().catch(() => null);
      if (!body?.ok) {
        setStatus({ kind: 'fehler', error: body?.error ?? `HTTP ${response.status}` });
        return;
      }
      setStatus({ kind: 'fertig', result: { lebensmittel: body.lebensmittel, ideen: body.ideen } });
    } catch {
      setStatus({ kind: 'fehler', error: 'offline' });
    }
  };

  return (
    <Sheet
      title={t.fridge.titel}
      onClose={onClose}
      footer={
        status.kind === 'fertig' ? (
          <button className="btn btn--ghost btn--block" onClick={() => inputRef.current?.click()}>
            <IconCamera size={18} />
            {t.fridge.neuesFoto}
          </button>
        ) : undefined
      }
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="visually-hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file) void analysieren(file);
        }}
      />

      <div style={{ height: 16 }} />

      {status.kind === 'start' ? (
        <>
          {visionReady === false ? (
            <div className="notice notice--warn">
              <strong>{t.fridge.nichtEingerichtet}</strong>
              {t.fridge.einrichten.vor}
              <em>AI Gateway</em>
              {t.fridge.einrichten.alsSchluessel}
              <code>AI_GATEWAY_API_KEY</code>
              {t.fridge.einrichten.oderDirekt}
              <code>ANTHROPIC_API_KEY</code>
              {t.fridge.einrichten.ende}
            </div>
          ) : null}
          <p className="muted" style={{ fontSize: 15, lineHeight: 1.55, marginBottom: 16 }}>
            {t.fridge.einleitung}
          </p>
          <button
            className="btn btn--primary btn--lg btn--block"
            onClick={() => inputRef.current?.click()}
            disabled={visionReady === false}
          >
            <IconCamera size={19} />
            {t.fridge.fotoAufnehmen}
          </button>
          <p className="row__note" style={{ marginTop: 12, lineHeight: 1.5 }}>
            {t.fridge.datenschutz}
          </p>
        </>
      ) : null}

      {status.kind === 'busy' ? (
        <div className="fridge__busy">
          <IconSpark size={26} />
          <div>
            <div style={{ fontWeight: 650 }}>{t.fridge.wirdAusgewertet}</div>
            <div className="row__note">{t.fridge.dauert}</div>
          </div>
        </div>
      ) : null}

      {status.kind === 'fehler' ? (
        <>
          <div className="notice notice--error">
            <strong>{fehlerTitel(status.error, t.fridge)}</strong>{' '}
            {fehlerText(status.error, t.fridge)}
          </div>
          <button className="btn btn--ghost btn--block" onClick={() => setStatus({ kind: 'start' })}>
            {t.fridge.nochmal}
          </button>
        </>
      ) : null}

      {status.kind === 'fertig' ? (
        <>
          <div className="detail__h">{t.fridge.erkannt}</div>
          {erkannt.length === 0 ? (
            <p className="muted" style={{ fontSize: 14.5, margin: '8px 0 0' }}>
              {t.fridge.nichtsErkannt}
            </p>
          ) : (
            <div className="pantrychips" style={{ padding: '10px 0 4px' }}>
              {erkannt.map((name) => (
                <span className="pantrychip" key={name} style={{ paddingRight: 14 }}>
                  {inhalt.zutat(name)}
                </span>
              ))}
            </div>
          )}

          {treffer.length > 0 ? (
            <>
              <hr className="divider" />
              <div className="detail__h">{t.fridge.ausRezepten}</div>
              <div className="stack" style={{ marginTop: 10 }}>
                {treffer.map(({ recipe, vorhanden, gesamt, fehlt }) => (
                  <button
                    key={recipe.id}
                    className="card"
                    onClick={() => onOpenRecipe(recipe.id)}
                    style={{ textAlign: 'left' }}
                  >
                    <div className="card__open" style={{ paddingRight: 16 }}>
                      <h3 className="card__title">{inhalt.text(recipe.name, recipe.en)}</h3>
                      <div className="card__meta">
                        <span className="tag">{t.fridge.zutatenDa(vorhanden, gesamt)}</span>
                        {fehlt.length > 0 ? (
                          <span>{t.fridge.fehlt(fehlt.map((name) => inhalt.zutat(name, null, recipe.en)).join(', '))}</span>
                        ) : null}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </>
          ) : null}

          {status.result.ideen.length > 0 ? (
            <>
              <hr className="divider" />
              <div className="detail__h">{t.fridge.neueIdeen}</div>
              <div className="stack" style={{ marginTop: 10 }}>
                {status.result.ideen.map((idee, index) => (
                  <IdeaCard
                    key={`${idee.name}-${index}`}
                    idee={idee}
                    onSave={() => onSaveIdea(ideeZuRezept(idee))}
                    onAddMissing={() => onAddMissing(idee.fehlt)}
                  />
                ))}
              </div>
            </>
          ) : null}

          <div style={{ height: 12 }} />
        </>
      ) : null}
    </Sheet>
  );
}

/* -------------------------------------------------------------------------- */

function IdeaCard({
  idee,
  onSave,
  onAddMissing,
}: {
  idee: VisionIdea;
  onSave: () => void;
  onAddMissing: () => void;
}) {
  const t = useT();
  const inhalt = useInhalt();
  const [offen, setOffen] = useState(false);
  return (
    <article className="editcard" style={{ marginBottom: 0 }}>
      <button
        onClick={() => setOffen((current) => !current)}
        style={{ width: '100%', textAlign: 'left' }}
        aria-expanded={offen}
      >
        <h3 className="card__title">{idee.name}</h3>
        <div className="card__meta" style={{ marginTop: 6 }}>
          {idee.kategorie ? <span className="tag">{idee.kategorie}</span> : null}
          {idee.zeitMin > 0 ? (
            <span className="card__metaitem">
              <IconClock size={13} />
              {idee.zeitMin} {t.allgemein.minuten}
            </span>
          ) : null}
          <span className="card__metaitem">
            <IconServings size={13} />
            {idee.portionen}
          </span>
        </div>
      </button>

      {offen ? (
        <div style={{ marginTop: 12 }}>
          <ul className="ingredients">
            {idee.zutaten.map((zutat, index) => (
              <li className="ingredient" key={`${zutat.name}-${index}`}>
                <span className="ingredient__amount">
                  {inhalt.menge(zutat.menge > 0 ? zutat.menge : null, zutat.einheit)}
                </span>
                <span>{inhalt.zutat(zutat.name, zutat.menge)}</span>
              </li>
            ))}
          </ul>
          {idee.vorbereitung?.length ? (
            <div className="step step--prep" style={{ marginTop: 10 }}>
              <span className="step__num step__num--prep" aria-hidden="true">
                <IconKnife size={15} />
              </span>
              <div>
                <div className="step__title">{t.fridge.vorbereitung}</div>
                <ul className="preplist">
                  {idee.vorbereitung.map((aufgabe, index) => (
                    <li key={`${index}-${aufgabe}`}>{aufgabe}</li>
                  ))}
                </ul>
              </div>
            </div>
          ) : null}
          <ol className="steps" style={{ marginTop: 10 }}>
            {idee.schritte.map((schritt, index) => (
              <li className="step" key={index}>
                <span className="step__num">{index + 1}</span>
                <div className="step__text">{schritt.text}</div>
              </li>
            ))}
          </ol>
        </div>
      ) : null}

      {idee.fehlt.length > 0 ? (
        <p className="row__note" style={{ marginTop: 10 }}>
          {t.fridge.fehltNoch(idee.fehlt.join(', '))}
        </p>
      ) : null}

      <div className="rowline" style={{ marginTop: 10 }}>
        <button className="btn btn--ghost" onClick={onSave}>
          <IconPlus size={17} />
          {t.fridge.alsRezept}
        </button>
        {idee.fehlt.length > 0 ? (
          <button className="btn btn--quiet" onClick={onAddMissing}>
            <IconCart size={17} />
            {t.fridge.fehlendesEinkaufen}
          </button>
        ) : null}
      </div>
    </article>
  );
}

/** Vorschlag in ein normales Rezept übersetzen, das gespeichert werden kann. */
export function ideeZuRezept(idee: VisionIdea): Recipe {
  const base = blankRecipe();
  const rezept: Recipe = {
    ...base,
    name: idee.name,
    category: idee.kategorie,
    servings: idee.portionen,
    timeMin: idee.zeitMin > 0 ? idee.zeitMin : null,
    ingredients: idee.zutaten.map((zutat) => ({
      id: randomId(),
      name: zutat.name,
      amount: zutat.menge > 0 ? zutat.menge : null,
      unit: zutat.einheit,
    })),
    steps: idee.schritte.map((schritt) => ({
      id: randomId(),
      text: schritt.text,
      durationSec: schritt.minuten > 0 ? Math.round(schritt.minuten * 60) : null,
    })),
    notes: 'Vorschlag aus einem Kühlschrankfoto.',
  };
  // Wie jedes neue Rezept bekommt auch die Idee eine Vorbereitung.
  return {
    ...rezept,
    prep: idee.vorbereitung?.length ? idee.vorbereitung : vorbereitungVorschlagen(rezept),
  };
}

function fehlerTitel(error: string, texte: Texte['fridge']): string {
  const { fehler } = texte;
  if (error === 'no_key') return texte.nichtEingerichtet;
  if (error === 'billing') return fehler.zahlung.titel;
  if (error === 'auth') return fehler.schluessel.titel;
  if (error === 'rate_limit') return fehler.zuViele.titel;
  if (error === 'image_too_large') return fehler.zuGross.titel;
  if (error === 'no_result' || error === 'refused') return fehler.nichts.titel;
  return fehler.sonst.titel;
}

function fehlerText(error: string, { fehler }: Texte['fridge']): string {
  if (error === 'no_key') return fehler.keinZugang;
  if (error === 'billing') return fehler.zahlung.text;
  if (error === 'auth') return fehler.schluessel.text;
  if (error === 'rate_limit') return fehler.zuViele.text;
  if (error === 'image_too_large') return fehler.zuGross.text;
  if (error === 'no_result' || error === 'refused') return fehler.nichts.text;
  return fehler.sonst.text;
}
