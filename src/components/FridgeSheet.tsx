'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Recipe } from '@/lib/types';
import { VisionIdea, VisionResult } from '@/lib/vision';
import { blankRecipe } from '@/lib/store';
import { formatQuantity, sameIngredient } from '@/lib/units';
import { randomId } from '@/lib/id';
import { Sheet } from './ui';
import { IconCamera, IconCart, IconClock, IconPlus, IconServings, IconSpark } from './Icons';

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
    const vorrat = [...erkannt, ...pantry];
    return recipes
      .map((recipe) => {
        const zutaten = recipe.ingredients.filter((entry) => entry.name.trim());
        if (zutaten.length === 0) return null;
        const fehlt = zutaten
          .filter((entry) => !vorrat.some((name) => sameIngredient(name, entry.name)))
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
        body: JSON.stringify({ image }),
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
      title="Was kann ich kochen?"
      onClose={onClose}
      footer={
        status.kind === 'fertig' ? (
          <button className="btn btn--ghost btn--block" onClick={() => inputRef.current?.click()}>
            <IconCamera size={18} />
            Neues Foto
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
              <strong>Bilderkennung nicht eingerichtet.</strong> Am einfachsten über Vercel: dort
              unter <em>AI Gateway</em> einen Schlüssel anlegen und ihn als{' '}
              <code>AI_GATEWAY_API_KEY</code> beim Projekt hinterlegen – ein Konto beim
              Modellanbieter braucht es dafür nicht. Wer lieber direkt abrechnet, setzt
              stattdessen <code>ANTHROPIC_API_KEY</code>. Siehe README.
            </div>
          ) : null}
          <p className="muted" style={{ fontSize: 15, lineHeight: 1.55, marginBottom: 16 }}>
            Mach ein Foto vom offenen Kühlschrank. CRAVE liest heraus, was darin ist, sucht
            passende Rezepte aus deiner Sammlung und schlägt zusätzlich neue Gerichte vor.
          </p>
          <button
            className="btn btn--primary btn--lg btn--block"
            onClick={() => inputRef.current?.click()}
            disabled={visionReady === false}
          >
            <IconCamera size={19} />
            Foto aufnehmen
          </button>
          <p className="row__note" style={{ marginTop: 12, lineHeight: 1.5 }}>
            Das Foto wird zur Auswertung an Anthropic geschickt und dort nicht gespeichert. Es
            landet weder in deinen Daten noch in der Einkaufsliste.
          </p>
        </>
      ) : null}

      {status.kind === 'busy' ? (
        <div className="fridge__busy">
          <IconSpark size={26} />
          <div>
            <div style={{ fontWeight: 650 }}>Foto wird ausgewertet…</div>
            <div className="row__note">Das dauert einen Moment.</div>
          </div>
        </div>
      ) : null}

      {status.kind === 'fehler' ? (
        <>
          <div className="notice notice--error">
            <strong>{fehlerTitel(status.error)}</strong> {fehlerText(status.error)}
          </div>
          <button className="btn btn--ghost btn--block" onClick={() => setStatus({ kind: 'start' })}>
            Nochmal versuchen
          </button>
        </>
      ) : null}

      {status.kind === 'fertig' ? (
        <>
          <div className="detail__h">Erkannt</div>
          {erkannt.length === 0 ? (
            <p className="muted" style={{ fontSize: 14.5, margin: '8px 0 0' }}>
              Auf dem Foto war nichts eindeutig zu erkennen. Versuch es mit mehr Licht oder näher
              dran.
            </p>
          ) : (
            <div className="pantrychips" style={{ padding: '10px 0 4px' }}>
              {erkannt.map((name) => (
                <span className="pantrychip" key={name} style={{ paddingRight: 14 }}>
                  {name}
                </span>
              ))}
            </div>
          )}

          {treffer.length > 0 ? (
            <>
              <hr className="divider" />
              <div className="detail__h">Aus deinen Rezepten</div>
              <div className="stack" style={{ marginTop: 10 }}>
                {treffer.map(({ recipe, vorhanden, gesamt, fehlt }) => (
                  <button
                    key={recipe.id}
                    className="card"
                    onClick={() => onOpenRecipe(recipe.id)}
                    style={{ textAlign: 'left' }}
                  >
                    <div className="card__open" style={{ paddingRight: 16 }}>
                      <h3 className="card__title">{recipe.name}</h3>
                      <div className="card__meta">
                        <span className="tag">
                          {vorhanden} von {gesamt} Zutaten da
                        </span>
                        {fehlt.length > 0 ? <span>fehlt: {fehlt.join(', ')}</span> : null}
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
              <div className="detail__h">Neue Ideen</div>
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
              {idee.zeitMin} Min
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
                  {formatQuantity(zutat.menge > 0 ? zutat.menge : null, zutat.einheit)}
                </span>
                <span>{zutat.name}</span>
              </li>
            ))}
          </ul>
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
          Fehlt noch: {idee.fehlt.join(', ')}
        </p>
      ) : null}

      <div className="rowline" style={{ marginTop: 10 }}>
        <button className="btn btn--ghost" onClick={onSave}>
          <IconPlus size={17} />
          Als Rezept speichern
        </button>
        {idee.fehlt.length > 0 ? (
          <button className="btn btn--quiet" onClick={onAddMissing}>
            <IconCart size={17} />
            Fehlendes einkaufen
          </button>
        ) : null}
      </div>
    </article>
  );
}

/** Vorschlag in ein normales Rezept übersetzen, das gespeichert werden kann. */
export function ideeZuRezept(idee: VisionIdea): Recipe {
  const base = blankRecipe();
  return {
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
}

function fehlerTitel(error: string): string {
  if (error === 'no_key') return 'Bilderkennung nicht eingerichtet.';
  if (error === 'billing') return 'Beim Anbieter fehlt die Zahlungsangabe.';
  if (error === 'auth') return 'Der hinterlegte Schlüssel wird nicht akzeptiert.';
  if (error === 'rate_limit') return 'Gerade zu viele Anfragen.';
  if (error === 'image_too_large') return 'Das Foto ist zu gross.';
  if (error === 'no_result' || error === 'refused') return 'Damit konnte ich nichts anfangen.';
  return 'Auswertung fehlgeschlagen.';
}

function fehlerText(error: string): string {
  if (error === 'no_key') return 'Auf dem Server fehlt der Zugang zum Modell, siehe README.';
  if (error === 'billing') {
    return 'Bei Vercel unter AI Gateway eine Zahlungskarte hinterlegen – damit werden auch die Freikontingente freigeschaltet. Ein neues Deployment braucht es dafür nicht.';
  }
  if (error === 'auth') {
    return 'Vermutlich wurde der Schlüssel beim Anbieter gelöscht oder ist abgelaufen. Neuen anlegen und in den Umgebungsvariablen ersetzen.';
  }
  if (error === 'rate_limit') return 'Kurz warten und nochmal versuchen.';
  if (error === 'image_too_large') return 'Versuch es mit einem kleineren Ausschnitt.';
  if (error === 'no_result' || error === 'refused') {
    return 'Versuch ein anderes Foto, am besten hell und von vorne.';
  }
  return 'Prüfe die Verbindung und versuch es nochmal.';
}
