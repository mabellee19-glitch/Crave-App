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
import { ZutatenFeld } from './ZutatenFeld';
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
 * Die Einkaufsliste – die "Beute".
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
    () =>
      [...new Set([...shopping, ...allPantry].map((item) => item.name))].filter(
        (name) => !kenntZutat(name) && gelernt(name) === undefined,
      ),
    [shopping, allPantry],
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
        inhalt.zutat(a.name).localeCompare(inhalt.zutat(b.name), 'de'),
      ),
    }));
    // inhalt aendert sich mit dem, was die KI dazulernt.
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
                {eintrag.name}
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
        <ZutatenFeld
          schnell
          wrapperClassName="inputrow__feld"
          value={text}
          onChange={setText}
          placeholder={t.eingabePlatzhalter}
          ariaLabel={t.eingabe}
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
                {gruppe.de}
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

      <section className="vorrat" aria-labelledby="vorrat-titel">
        <div className="vorrat__kopf">
          <div>
            <h2 className="vorrat__titel" id="vorrat-titel">
              {t.standard}
            </h2>
            {allPantry.length > 0 ? <p className="vorrat__sub">{t.standardSub(pantry.length)}</p> : null}
          </div>
          <button className="btn btn--quiet vorrat__verwalten" onClick={() => setManaging(true)}>
            <IconPencil size={17} />
            {t.verwalten}
          </button>
        </div>

        {allPantry.length === 0 ? (
          <p className="vorrat__hinweis">{t.grundlisteHinweis}</p>
        ) : pantry.length === 0 ? (
          <p className="vorrat__hinweis">{t.alleInListe}</p>
        ) : (
          <PantryGroups items={pantry} onPick={onMovePantryToCart} />
        )}
      </section>

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
          <span className="row__note kachel__fuer">{fuer(item.fromRecipe)}</span>
        ) : item.pantryId ? (
          <span className="row__note kachel__fuer kachel__fuer--standard">{standard}</span>
        ) : null}
      </span>
      {menge ? <span className="row__amount kachel__menge">{menge}</span> : null}
    </button>
  );
});

/* -------------------------------------------------------------------------- */
/* Standard-Zutaten                                                           */
/* -------------------------------------------------------------------------- */

const OPEN_KEY = 'crave:pantry-open';

/** Jede Rubrik hat ihre Farbe, wie die Abteilungen der Beute (siehe globals.css). */
const RUBRIK_FARBE: Record<string, string> = {
  Protein: 'protein',
  'Frisches Gemüse/Früchte': 'frisch',
  Dosenware: 'dose',
  'Im Glas': 'glas',
  Zmorge: 'zmorge',
  Einfrieren: 'einfrieren',
  Carbs: 'carbs',
  Vorrat: 'vorrat',
};

/**
 * Rubriken in der Reihenfolge der Vorschlagsliste, Unbekanntes am Ende.
 * Innerhalb einer Rubrik nach dem Namen, wie er gerade dasteht.
 */
function groupPantry(
  items: PantryItem[],
  inhalt: Inhalt,
): Array<{ category: string; items: PantryItem[] }> {
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
  const anzeige = (item: PantryItem) => inhalt.zutat(item.name);

  return [...buckets.entries()]
    .map(([category, entries]) => ({
      category,
      items: [...entries].sort((a, b) => anzeige(a).localeCompare(anzeige(b), 'de')),
    }))
    .sort((a, b) => rank(a.category) - rank(b.category) || a.category.localeCompare(b.category, 'de'));
}

/**
 * Die Standard-Zutaten auf der Hauptseite: eine Karte je Rubrik, gebaut wie
 * die Abteilungen der Beute. Zugeklappt zeigt eine Karte, was drin ist;
 * aufgeklappt ist jede Zutat eine Kachel, die ein Tipp in die Beute legt.
 */
function PantryGroups({
  items,
  onPick,
}: {
  items: PantryItem[];
  onPick: (id: string) => void;
}) {
  const t = useT().einkauf;
  const inhalt = useInhalt();
  const groups = useMemo(() => groupPantry(items, inhalt), [items, inhalt]);
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
    <div className="abteilungen rubriken">
      {groups.map((group) => {
        const isOpen = open[group.category] ?? false;
        const titel = group.category;
        const listId = `rubrik-${RUBRIK_FARBE[group.category] ?? group.category.replace(/\W+/g, '-')}`;
        return (
          <section
            className={`abteilung rubrik${isOpen ? ' rubrik--offen' : ''}`}
            key={group.category}
            data-rubrik={RUBRIK_FARBE[group.category] ?? 'weitere'}
          >
            <h3 className="abteilung__titel rubrik__titel">
              <button
                className="rubrik__kopf"
                onClick={() => toggle(group.category)}
                aria-expanded={isOpen}
                aria-controls={listId}
              >
                <span className="abteilung__punkt" aria-hidden="true" />
                <span className="rubrik__name">{titel}</span>
                <span className="abteilung__zahl">{group.items.length}</span>
                <span className="rubrik__pfeil" aria-hidden="true">
                  <IconChevronDown size={18} />
                </span>
              </button>
            </h3>
            {isOpen ? (
              <ul className="kacheln" id={listId}>
                {group.items.map((item) => (
                  <li key={item.id}>
                    <StandardKachel item={item} inhalt={inhalt} label={t.inListe} onPick={onPick} />
                  </li>
                ))}
              </ul>
            ) : (
              // Die Vorschau gehoert zum Knopf darueber; ein Tipp klappt auch hier auf.
              <p className="rubrik__vorschau" aria-hidden="true" onClick={() => toggle(group.category)}>
                {group.items.map((item) => gross(inhalt.zutat(item.name))).join(' · ')}
              </p>
            )}
          </section>
        );
      })}
    </div>
  );
}

/** Eine Standard-Zutat: Plus, Name, Menge. Ein Tipp legt sie in die Beute. */
const StandardKachel = React.memo(function StandardKachel({
  item,
  inhalt,
  label,
  onPick,
}: {
  item: PantryItem;
  inhalt: Inhalt;
  label: (name: string) => string;
  onPick: (id: string) => void;
}) {
  const name = gross(inhalt.zutat(item.name, item.amount));
  const menge = inhalt.menge(item.amount, item.unit);
  return (
    <button className="row kachel kachel--standard" onClick={() => onPick(item.id)} aria-label={label(name)}>
      <span className="kachel__plus" aria-hidden="true">
        <IconPlus size={16} />
      </span>
      <span className="row__main">
        <span className="row__name kachel__name">{name}</span>
      </span>
      {menge ? <span className="row__amount kachel__menge">{menge}</span> : null}
    </button>
  );
});

/* -------------------------------------------------------------------------- */

/**
 * Die Grundliste verwalten: oben eine neue Standard-Zutat anlegen, darunter
 * dieselben Rubrik-Karten wie auf der Hauptseite. Eine Zutat antippen klappt
 * ihre Bearbeitung auf – Menge, Einheit, Name, Rubrik, Löschen.
 */
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
  const inhalt = useInhalt();
  const [text, setText] = useState('');
  const [category, setCategory] = useState('');
  const [offen, setOffen] = useState<string | null>(null);
  const groups = useMemo(() => groupPantry(items, inhalt), [items, inhalt]);

  return (
    <Sheet title={t.verwaltenTitel} onClose={onClose}>
      <div style={{ height: 16 }} />
      <p className="muted" style={{ fontSize: 14.5, marginBottom: 14 }}>
        {t.verwaltenHinweis}
      </p>

      <form
        className="vorratneu"
        onSubmit={(event) => {
          event.preventDefault();
          const parsed = parseQuickAdd(text);
          if (!parsed.name) return;
          onAdd({ ...parsed, category: category || undefined });
          setText('');
        }}
      >
        <div className="inputrow">
          <ZutatenFeld
            schnell
            wrapperClassName="inputrow__feld"
            value={text}
            onChange={setText}
            placeholder={t.neueStandard}
            ariaLabel={t.neueStandard}
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
        <RubrikWahl
          className="select vorratneu__rubrik"
          value={category}
          onChange={setCategory}
          ariaLabel={t.rubrikNeu}
          leer={t.ohneRubrik}
        />
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
        <div className="rubriken rubriken--verwalten">
          {groups.map((group) => (
            <section
              className="abteilung rubrik"
              key={group.category}
              data-rubrik={RUBRIK_FARBE[group.category] ?? 'weitere'}
            >
              <h3 className="abteilung__titel">
                <span className="abteilung__punkt" aria-hidden="true" />
                {group.category}
                <span className="abteilung__zahl">{group.items.length}</span>
              </h3>
              <ul className="kacheln">
                {group.items.map((item) => (
                  <li key={item.id}>
                    <PantryRow
                      item={item}
                      inhalt={inhalt}
                      offen={offen === item.id}
                      onToggle={(id) => setOffen((wer) => (wer === id ? null : id))}
                      onSave={onSave}
                      onDelete={onDelete}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
      <div style={{ height: 12 }} />
    </Sheet>
  );
}

/** Die Rubriken zur Auswahl. */
function RubrikWahl({
  value,
  onChange,
  ariaLabel,
  leer,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
  leer: string;
  className: string;
}) {
  const t = useT().einkauf;
  return (
    <select
      className={className}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      aria-label={ariaLabel}
    >
      <option value="">{leer}</option>
      {PANTRY_CATEGORY_ORDER.map((name) => (
        <option key={name} value={name}>
          {name}
        </option>
      ))}
      {value && !PANTRY_CATEGORY_ORDER.includes(value) ? <option value={value}>{value}</option> : null}
    </select>
  );
}

/*
 * Gemerkt (memo): im Blatt "Grundliste" stehen schnell hundert Zeilen, und
 * jeder Buchstabe im Eingabefeld oben zeichnete sonst jede davon neu.
 */
const PantryRow = React.memo(function PantryRow({
  item,
  inhalt,
  offen,
  onToggle,
  onSave,
  onDelete,
}: {
  item: PantryItem;
  inhalt: Inhalt;
  offen: boolean;
  onToggle: (id: string) => void;
  onSave: (item: PantryItem) => void;
  onDelete: (id: string) => void;
}) {
  const t = useT().einkauf;
  // Ein englisch eingetippter Name steht deutsch da. Bleibt er, wie er war,
  // bleibt auch das Gespeicherte.
  const anzeigeName = gross(inhalt.zutat(item.name, item.amount));
  const anzeigeEinheit = item.unit;
  const [name, setName] = useState(anzeigeName);
  const [amount, setAmount] = useState<number | null>(item.amount);
  const [unit, setUnit] = useState(anzeigeEinheit);
  const menge = inhalt.menge(item.amount, item.unit);

  // Beim Aufklappen mit dem aktuellen Stand beginnen.
  useEffect(() => {
    if (!offen) return;
    setName(anzeigeName);
    setAmount(item.amount);
    setUnit(anzeigeEinheit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offen]);

  const commit = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setName(anzeigeName);
      return;
    }
    const neuerName = trimmed === anzeigeName ? item.name : trimmed;
    const neueEinheit = unit.trim();
    if (neuerName === item.name && amount === item.amount && neueEinheit === item.unit) return;
    onSave({ ...item, name: neuerName, amount, unit: neueEinheit });
  };

  return (
    <div className={`vorratzeile${offen ? ' vorratzeile--offen' : ''}`}>
      <button
        className="row kachel kachel--verwalten"
        onClick={() => onToggle(item.id)}
        aria-expanded={offen}
        aria-label={t.bearbeiten(anzeigeName)}
      >
        <span className="row__main">
          <span className="row__name kachel__name">{anzeigeName}</span>
        </span>
        {menge ? <span className="row__amount kachel__menge">{menge}</span> : null}
        <span className="kachel__stift" aria-hidden="true">
          {offen ? <IconChevronDown size={18} /> : <IconPencil size={16} />}
        </span>
      </button>
      {offen ? (
        <div className="vorratedit">
          <div className="vorratedit__felder">
            <label className="vorratedit__feld vorratedit__feld--menge">
              <span>{t.menge}</span>
              <NumberInput
                className="input"
                value={amount}
                onChange={setAmount}
                onBlur={commit}
                placeholder="—"
                ariaLabel={t.mengeVon(anzeigeName)}
              />
            </label>
            <label className="vorratedit__feld vorratedit__feld--einheit">
              <span>{t.einheitPlatzhalter}</span>
              <input
                className="input"
                value={unit}
                placeholder="—"
                aria-label={t.einheitVon(anzeigeName)}
                onChange={(event) => setUnit(event.target.value)}
                onBlur={commit}
                autoComplete="off"
              />
            </label>
            <label className="vorratedit__feld vorratedit__feld--name">
              <span>{t.name}</span>
              <input
                className="input"
                value={name}
                aria-label={t.nameVon(anzeigeName)}
                onChange={(event) => setName(event.target.value)}
                onBlur={commit}
                autoComplete="off"
              />
            </label>
            <label className="vorratedit__feld vorratedit__feld--rubrik">
              <span>{t.rubrik}</span>
              <RubrikWahl
                className="select"
                value={item.category ?? ''}
                onChange={(category) => onSave({ ...item, category: category || undefined })}
                ariaLabel={t.rubrikVon(anzeigeName)}
                leer="—"
              />
            </label>
          </div>
          <div className="vorratedit__knoepfe">
            <button className="btn btn--quiet vorratedit__loeschen" onClick={() => onDelete(item.id)} aria-label={t.loeschenAus(anzeigeName)}>
              <IconTrash size={17} />
              {t.loeschen}
            </button>
            <button
              className="btn btn--ghost"
              onClick={() => {
                commit();
                onToggle(item.id);
              }}
            >
              <IconCheck size={17} />
              {t.fertig}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
});
