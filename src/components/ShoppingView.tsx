'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { PantryItem, ShoppingItem } from '@/lib/types';
import { PANTRY_CATEGORY_ORDER } from '@/lib/seed';
import { parseQuickAdd } from '@/lib/units';
import { ABTEILUNGEN, Abteilung, abteilungVon, kenntZutat } from '@/lib/zutaten';
import { gelernt, zutatLernen } from '@/lib/zutatKi';
import { useT } from '@/lib/i18n';
import { Inhalt, useInhalt } from '@/lib/inhalt';
import { ConfirmDialog, EmptyState, NumberInput, Sheet } from './ui';
import {
  IconCheck,
  IconChevronDown,
  IconCookNext,
  IconPencil,
  IconPlus,
  IconTrash,
} from './Icons';

/** Ein Listeneintrag beginnt gross – englische Zutaten stehen sonst klein da ("milk"). */
const gross = (text: string) => (text ? text.charAt(0).toLocaleUpperCase() + text.slice(1) : text);

/** Wo eine Zutat im Laden steht: erst das eigene Wissen, dann das der KI. */
function abteilung(name: string): Abteilung {
  const eigene = abteilungVon(name);
  if (eigene !== 'weitere') return eigene;
  return gelernt(name)?.abteilung ?? 'weitere';
}

/**
 * Die Einkaufsliste – auf Deutsch "Beute", auf Englisch "Groceries".
 *
 * Oben steht, was offen ist und was geplant. Darunter die offenen Zutaten,
 * nach Abteilungen geordnet in der Reihenfolge, in der man durch den Laden
 * geht: erst Gemuese, dann Brot, Fleisch, Kuehlregal … Jede Zutat ist eine
 * Kachel mit Haekchen, Name, Menge und dem Rezept, fuer das sie gebraucht
 * wird. Ganz unten die Grundliste zum Antippen.
 */
export function ShoppingView({
  shopping,
  pantry,
  allPantry,
  onAdd,
  onCheckOff,
  onClear,
  onMovePantryToCart,
  onAddPantryItem,
  onSavePantryItem,
  onDeletePantryItem,
  onAddSuggestions,
  cookNext,
  onOpenPlanned,
}: {
  shopping: ShoppingItem[];
  /** Grundlisten-Eintraege, die gerade NICHT in der aktiven Liste liegen. */
  pantry: PantryItem[];
  /** Alle Grundlisten-Eintraege, fuer die Verwaltung. */
  allPantry: PantryItem[];
  onAdd: (input: { name: string; amount: number | null; unit: string }) => void;
  onCheckOff: (id: string) => void;
  onClear: () => void;
  onMovePantryToCart: (id: string) => void;
  onAddPantryItem: (input: {
    name: string;
    amount: number | null;
    unit: string;
    category?: string;
  }) => void;
  onSavePantryItem: (item: PantryItem) => void;
  onDeletePantryItem: (id: string) => void;
  onAddSuggestions: () => void;
  /** Was fuer die naechsten Tage geplant ist – die Vorschau ueber der Liste. */
  cookNext: { id: string; name: string; kind: 'recipe' | 'dish' }[];
  onOpenPlanned: (eintrag: { id: string; kind: 'recipe' | 'dish' }) => void;
}) {
  const texte = useT();
  const t = texte.einkauf;
  const inhalt = useInhalt();
  const [text, setText] = useState('');
  const [managing, setManaging] = useState(false);
  const [clearing, setClearing] = useState(false);

  const submit = () => {
    const parsed = parseQuickAdd(text);
    if (!parsed.name) return;
    onAdd(parsed);
    setText('');
  };

  // Was die App nicht kennt, fragt sie die KI – einmal, im Hintergrund. Die
  // Antwort ordnet die Zutat ein und gibt ihr den englischen Namen.
  const unbekannt = useMemo(
    () => shopping.map((item) => item.name).filter((name) => !kenntZutat(name) && gelernt(name) === undefined),
    [shopping],
  );
  useEffect(() => {
    let vorbei = false;
    void (async () => {
      for (const name of unbekannt.slice(0, 12)) {
        if (vorbei) return;
        await zutatLernen(name);
      }
    })();
    return () => {
      vorbei = true;
    };
  }, [unbekannt]);

  const gruppen = useMemo(() => {
    const nachAbteilung = new Map<Abteilung, ShoppingItem[]>();
    for (const item of shopping) {
      const wo = abteilung(item.name);
      const liste = nachAbteilung.get(wo);
      if (liste) liste.push(item);
      else nachAbteilung.set(wo, [item]);
    }
    return ABTEILUNGEN.filter((eintrag) => nachAbteilung.has(eintrag.id)).map((eintrag) => ({
      ...eintrag,
      items: [...nachAbteilung.get(eintrag.id)!].sort((a, b) =>
        inhalt.zutat(a.name).localeCompare(inhalt.zutat(b.name), inhalt.sprache),
      ),
    }));
    // inhalt aendert sich mit der Sprache und mit dem, was die KI dazulernt.
  }, [shopping, inhalt]);

  return (
    <section aria-labelledby="shopping-heading" className="einkauf">
      <div className="einkauf__kopf">
        <div>
          <h1 className="section-title" id="shopping-heading">
            {texte.allgemein.bereichEinkauf}
          </h1>
          <p className="section-sub">
            {t.offen(shopping.length)}
            {shopping.length > 0 && cookNext.length > 0 ? ` · ${t.geplant(cookNext.length)}` : ''}
          </p>
        </div>
        {shopping.length > 0 ? (
          <button className="btn btn--quiet einkauf__fertig" onClick={() => setClearing(true)}>
            <IconCheck size={17} />
            {t.alleErledigt}
          </button>
        ) : null}
      </div>

      {cookNext.length > 0 ? (
        <div className="plannedstrip">
          <span className="plannedstrip__label">
            <IconCookNext size={14} filled />
            Cook Next
          </span>
          <div className="plannedstrip__items">
            {cookNext.map((eintrag) => (
              <button
                key={eintrag.id}
                className="chip chip--plan"
                onClick={() => onOpenPlanned(eintrag)}
              >
                {inhalt.text(eintrag.name)}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <form
        className="inputrow einkauf__eingabe"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <input
          className="input"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder={t.eingabePlatzhalter}
          aria-label={t.eingabe}
          autoComplete="off"
          enterKeyHint="done"
        />
        <button className="btn btn--primary" type="submit" disabled={!text.trim()} aria-label={t.hinzufuegen}>
          <IconPlus size={19} />
        </button>
      </form>

      {shopping.length === 0 ? (
        <div className="einkauf__leer">
          <p>{t.leer}</p>
        </div>
      ) : (
        <div className="abteilungen">
          {gruppen.map((gruppe) => (
            <section className="abteilung" key={gruppe.id} data-abteilung={gruppe.id}>
              <h2 className="abteilung__titel">
                <span className="abteilung__punkt" aria-hidden="true" />
                {inhalt.sprache === 'en' ? gruppe.en : gruppe.de}
                <span className="abteilung__zahl">{gruppe.items.length}</span>
              </h2>
              <ul className="kacheln">
                {gruppe.items.map((item) => (
                  <li key={item.id}>
                    <Kachel item={item} inhalt={inhalt} fuer={t.fuer} standard={t.standardKurz} onCheckOff={onCheckOff} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      <div className="panel einkauf__grundliste">
        <div className="panel__head">
          <span className="panel__title">{t.standard}</span>
          <span className="panel__count">{pantry.length}</span>
          <span className="spacer" />
          <button
            className="btn btn--quiet"
            style={{ minHeight: 36 }}
            onClick={() => setManaging(true)}
          >
            <IconPencil size={17} />
            {t.verwalten}
          </button>
        </div>

        {allPantry.length === 0 ? (
          <div style={{ padding: '4px 16px 20px' }}>
            <p className="muted" style={{ fontSize: 14.5 }}>
              {t.grundlisteHinweis}
            </p>
          </div>
        ) : pantry.length === 0 ? (
          <div style={{ padding: '4px 16px 20px' }}>
            <p className="muted" style={{ fontSize: 14.5 }}>
              {t.alleInListe}
            </p>
          </div>
        ) : (
          <PantryGroups items={pantry} onPick={onMovePantryToCart} />
        )}
      </div>

      {shopping.length === 0 && allPantry.length === 0 ? (
        <>
          <div style={{ height: 18 }} />
          <EmptyState glyph="🛒" title={t.leerTitel} text={t.leerText} />
        </>
      ) : null}

      {managing ? (
        <PantrySheet
          items={allPantry}
          onClose={() => setManaging(false)}
          onAdd={onAddPantryItem}
          onSave={onSavePantryItem}
          onDelete={onDeletePantryItem}
          onAddSuggestions={onAddSuggestions}
        />
      ) : null}

      {clearing ? (
        <ConfirmDialog
          title={t.abhakenTitel}
          text={t.abhakenText}
          confirmLabel={t.alleErledigt}
          onCancel={() => setClearing(false)}
          onConfirm={() => {
            setClearing(false);
            onClear();
          }}
        />
      ) : null}
    </section>
  );
}

/**
 * Eine Zutat auf der Liste. Antippen hakt sie ab. Gemerkt (memo): beim
 * Tippen ins Eingabefeld oben zeichnet sonst jede Kachel neu.
 */
const Kachel = React.memo(function Kachel({
  item,
  inhalt,
  fuer,
  standard,
  onCheckOff,
}: {
  item: ShoppingItem;
  inhalt: Inhalt;
  fuer: (namen: string) => string;
  standard: string;
  onCheckOff: (id: string) => void;
}) {
  const menge = inhalt.menge(item.amount, item.unit);
  return (
    <button className="row kachel" onClick={() => onCheckOff(item.id)}>
      <span className="checkbox kachel__haken" aria-hidden="true">
        <IconCheck size={16} />
      </span>
      <span className="row__main">
        <span className="row__name kachel__name">{gross(inhalt.zutat(item.name, item.amount))}</span>
        {item.fromRecipe ? (
          <span className="row__note kachel__fuer">{fuer(inhalt.text(item.fromRecipe))}</span>
        ) : item.pantryId ? (
          <span className="row__note kachel__fuer kachel__fuer--standard">{standard}</span>
        ) : null}
      </span>
      {menge ? <span className="row__amount kachel__menge">{menge}</span> : null}
    </button>
  );
});

/* -------------------------------------------------------------------------- */

const OPEN_KEY = 'crave:pantry-open';

/** Rubriken in der Reihenfolge der Vorschlagsliste, Unbekanntes am Ende. */
function groupPantry(items: PantryItem[]): Array<{ category: string; items: PantryItem[] }> {
  const buckets = new Map<string, PantryItem[]>();
  for (const item of items) {
    const key = item.category?.trim() || 'Weitere';
    const bucket = buckets.get(key);
    if (bucket) bucket.push(item);
    else buckets.set(key, [item]);
  }

  const rank = (category: string) => {
    const index = PANTRY_CATEGORY_ORDER.indexOf(category);
    return index === -1 ? PANTRY_CATEGORY_ORDER.length + 1 : index;
  };

  return [...buckets.entries()]
    .map(([category, entries]) => ({ category, items: entries }))
    .sort((a, b) => rank(a.category) - rank(b.category) || a.category.localeCompare(b.category, 'de'));
}

function PantryGroups({
  items,
  onPick,
}: {
  items: PantryItem[];
  onPick: (id: string) => void;
}) {
  const t = useT().einkauf;
  const inhalt = useInhalt();
  const groups = useMemo(() => groupPantry(items), [items]);
  const [open, setOpen] = useState<Record<string, boolean>>({});

  // Welche Rubriken offen sind, ist eine reine Bequemlichkeit dieses Geräts.
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(OPEN_KEY);
      if (stored) setOpen(JSON.parse(stored));
    } catch {
      /* privater Modus */
    }
  }, []);

  const toggle = (category: string) => {
    setOpen((current) => {
      const next = { ...current, [category]: !current[category] };
      try {
        window.localStorage.setItem(OPEN_KEY, JSON.stringify(next));
      } catch {
        /* privater Modus */
      }
      return next;
    });
  };

  return (
    <div className="pantrygroups">
      {groups.map((group) => {
        const isOpen = open[group.category] ?? false;
        return (
          <section className="pantrygroup" key={group.category}>
            <button
              className="pantrygroup__head"
              onClick={() => toggle(group.category)}
              aria-expanded={isOpen}
            >
              <span className={`pantrygroup__caret${isOpen ? ' pantrygroup__caret--open' : ''}`}>
                <IconChevronDown size={18} />
              </span>
              <span className="pantrygroup__title">{t.rubriken[group.category] ?? group.category}</span>
              <span className="panel__count">{group.items.length}</span>
            </button>
            {isOpen ? (
              <div className="pantrychips">
                {group.items.map((item) => {
                  const name = gross(inhalt.zutat(item.name));
                  return (
                    <button
                      key={item.id}
                      className="pantrychip"
                      onClick={() => onPick(item.id)}
                      aria-label={t.inListe(name)}
                    >
                      {name}
                      <span className="pantrychip__plus" aria-hidden="true">
                        <IconPlus size={16} />
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function PantrySheet({
  items,
  onClose,
  onAdd,
  onSave,
  onDelete,
  onAddSuggestions,
}: {
  items: PantryItem[];
  onClose: () => void;
  onAdd: (input: { name: string; amount: number | null; unit: string; category?: string }) => void;
  onSave: (item: PantryItem) => void;
  onDelete: (id: string) => void;
  onAddSuggestions: () => void;
}) {
  const t = useT().einkauf;
  const hinzufuegen = useT().allgemein.hinzufuegen;
  const [text, setText] = useState('');
  const [category, setCategory] = useState('');
  const groups = useMemo(() => groupPantry(items), [items]);

  return (
    <Sheet title={t.verwaltenTitel} onClose={onClose}>
      <div style={{ height: 16 }} />
      <p className="muted" style={{ fontSize: 14.5, marginBottom: 14 }}>
        {t.verwaltenHinweis}
      </p>

      <form
        style={{ marginBottom: 18 }}
        onSubmit={(event) => {
          event.preventDefault();
          const parsed = parseQuickAdd(text);
          if (!parsed.name) return;
          onAdd({ ...parsed, category: category || undefined });
          setText('');
        }}
      >
        <div className="inputrow">
          <input
            className="input"
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder={t.neueStandard}
            aria-label={t.neueStandard}
            autoComplete="off"
          />
          <button
            className="btn btn--primary"
            type="submit"
            disabled={!text.trim()}
            aria-label={hinzufuegen}
          >
            <IconPlus size={19} />
          </button>
        </div>
        <select
          className="select"
          style={{ marginTop: 8 }}
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          aria-label={t.rubrikNeu}
        >
          <option value="">{t.ohneRubrik}</option>
          {PANTRY_CATEGORY_ORDER.map((name) => (
            <option key={name} value={name}>
              {t.rubriken[name] ?? name}
            </option>
          ))}
        </select>
      </form>

      <button className="btn btn--ghost btn--block" onClick={onAddSuggestions}>
        <IconPlus size={18} />
        {t.vorschlagsliste}
      </button>
      <p className="row__note" style={{ marginTop: 8 }}>
        {t.vorschlagslisteHinweis}
      </p>

      <hr className="divider" />

      {items.length === 0 ? (
        <p className="muted" style={{ fontSize: 14.5 }}>
          {t.nochKeine}
        </p>
      ) : (
        groups.map((group) => (
          <div key={group.category} style={{ marginBottom: 22 }}>
            <div className="detail__h" style={{ marginBottom: 10 }}>
              {t.rubriken[group.category] ?? group.category}
            </div>
            <div className="stack">
              {group.items.map((item) => (
                <PantryRow key={item.id} item={item} onSave={onSave} onDelete={onDelete} />
              ))}
            </div>
          </div>
        ))
      )}
      <div style={{ height: 12 }} />
    </Sheet>
  );
}

/*
 * Gemerkt (memo): im Blatt "Grundliste" stehen schnell hundert Zeilen, und
 * jeder Buchstabe im Eingabefeld oben zeichnete sonst jede davon neu.
 */
const PantryRow = React.memo(function PantryRow({
  item,
  onSave,
  onDelete,
}: {
  item: PantryItem;
  onSave: (item: PantryItem) => void;
  onDelete: (id: string) => void;
}) {
  const t = useT().einkauf;
  const [name, setName] = useState(item.name);
  const [amount, setAmount] = useState<number | null>(item.amount);
  const [unit, setUnit] = useState(item.unit);

  const commit = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setName(item.name);
      return;
    }
    if (trimmed === item.name && amount === item.amount && unit.trim() === item.unit) return;
    onSave({ ...item, name: trimmed, amount, unit: unit.trim() });
  };

  return (
    <div className="editrow" style={{ marginBottom: 0 }}>
      <NumberInput
        className="input editrow__amount"
        value={amount}
        onChange={setAmount}
        onBlur={commit}
        placeholder="—"
        ariaLabel={t.mengeVon(item.name)}
      />
      <input
        className="input editrow__unit"
        value={unit}
        placeholder={t.einheitPlatzhalter}
        aria-label={t.einheitVon(item.name)}
        onChange={(event) => setUnit(event.target.value)}
        onBlur={commit}
        autoComplete="off"
      />
      <input
        className="input editrow__grow"
        value={name}
        aria-label={t.nameVon(item.name)}
        onChange={(event) => setName(event.target.value)}
        onBlur={commit}
        autoComplete="off"
      />
      <select
        className="select editrow__unit"
        value={item.category ?? ''}
        aria-label={t.rubrikVon(item.name)}
        onChange={(event) => onSave({ ...item, category: event.target.value || undefined })}
      >
        <option value="">—</option>
        {PANTRY_CATEGORY_ORDER.map((entry) => (
          <option key={entry} value={entry}>
            {t.rubriken[entry] ?? entry}
          </option>
        ))}
        {item.category && !PANTRY_CATEGORY_ORDER.includes(item.category) ? (
          <option value={item.category}>{item.category}</option>
        ) : null}
      </select>
      <button
        className="iconbtn iconbtn--plain"
        onClick={() => onDelete(item.id)}
        aria-label={t.loeschenAus(item.name)}
      >
        <IconTrash size={19} />
      </button>
    </div>
  );
});
