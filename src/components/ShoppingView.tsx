'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { PantryItem, ShoppingItem } from '@/lib/types';
import { PANTRY_CATEGORY_ORDER } from '@/lib/seed';
import { formatQuantity, parseQuickAdd } from '@/lib/units';
import { ConfirmDialog, EmptyState, NumberInput, Sheet } from './ui';
import { IconCheck, IconChevronDown, IconPencil, IconPlus, IconTrash } from './Icons';

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
}) {
  const [text, setText] = useState('');
  const [managing, setManaging] = useState(false);
  const [clearing, setClearing] = useState(false);

  const submit = () => {
    const parsed = parseQuickAdd(text);
    if (!parsed.name) return;
    onAdd(parsed);
    setText('');
  };

  return (
    <section aria-labelledby="shopping-heading">
      <h1 className="section-title" id="shopping-heading">
        Einkaufsliste
      </h1>
      <p className="section-sub">
        {shopping.length === 0
          ? 'Nichts offen – tippe unten auf eine Standard-Zutat.'
          : `${shopping.length} ${shopping.length === 1 ? 'Zutat' : 'Zutaten'} offen`}
      </p>

      <form
        className="inputrow"
        style={{ marginBottom: 16 }}
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <input
          className="input"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="z. B. 400 g Poulet"
          aria-label="Zutat zur Einkaufsliste hinzufügen"
          autoComplete="off"
          enterKeyHint="done"
        />
        <button className="btn btn--primary" type="submit" disabled={!text.trim()} aria-label="Hinzufügen">
          <IconPlus size={19} />
        </button>
      </form>

      <div className="panel">
        <div className="panel__head">
          <span className="panel__title">Aktive Liste</span>
          <span className="panel__count">{shopping.length}</span>
          <span className="spacer" />
          {shopping.length > 0 ? (
            <button className="btn btn--quiet" style={{ minHeight: 36 }} onClick={() => setClearing(true)}>
              Alle erledigt
            </button>
          ) : null}
        </div>

        {shopping.length === 0 ? (
          <div style={{ padding: '4px 16px 20px' }}>
            <p className="muted" style={{ fontSize: 14.5 }}>
              Die Liste ist leer. Zutaten kommen hierher, wenn du sie oben eingibst, unten aus der
              Grundliste antippst oder ein Rezept hinzufügst.
            </p>
          </div>
        ) : (
          <ul>
            {shopping.map((item) => (
              <li key={item.id}>
                <button className="row" onClick={() => onCheckOff(item.id)}>
                  <span className="checkbox" aria-hidden="true">
                    <IconCheck size={16} />
                  </span>
                  <span className="row__main">
                    <span className="row__name">{item.name}</span>
                    {item.fromRecipe ? <span className="row__note">aus: {item.fromRecipe}</span> : null}
                  </span>
                  <span className="row__amount">{formatQuantity(item.amount, item.unit)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div style={{ height: 18 }} />

      <div className="panel">
        <div className="panel__head">
          <span className="panel__title">Standard-Zutaten</span>
          <span className="panel__count">{pantry.length}</span>
          <span className="spacer" />
          <button
            className="btn btn--quiet"
            style={{ minHeight: 36 }}
            onClick={() => setManaging(true)}
          >
            <IconPencil size={17} />
            Verwalten
          </button>
        </div>

        {allPantry.length === 0 ? (
          <div style={{ padding: '4px 16px 20px' }}>
            <p className="muted" style={{ fontSize: 14.5 }}>
              Lege Zutaten an, die du immer wieder kaufst. Ein Tipp darauf legt sie in die
              Einkaufsliste – nach dem Abhaken sind sie wieder hier.
            </p>
          </div>
        ) : pantry.length === 0 ? (
          <div style={{ padding: '4px 16px 20px' }}>
            <p className="muted" style={{ fontSize: 14.5 }}>
              Alle Standard-Zutaten liegen gerade in der Einkaufsliste.
            </p>
          </div>
        ) : (
          <PantryGroups items={pantry} onPick={onMovePantryToCart} />
        )}
      </div>

      {shopping.length === 0 && allPantry.length === 0 ? (
        <>
          <div style={{ height: 18 }} />
          <EmptyState
            glyph="🛒"
            title="Noch nichts eingerichtet"
            text="Füge oben eine Zutat hinzu oder lege deine Standard-Zutaten an."
          />
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
          title="Alles abhaken?"
          text="Alle Zutaten der aktiven Liste werden als gekauft markiert. Standard-Zutaten wandern zurück in die Grundliste."
          confirmLabel="Alle erledigt"
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
              <span className="pantrygroup__title">{group.category}</span>
              <span className="panel__count">{group.items.length}</span>
            </button>
            {isOpen ? (
              <div className="pantrychips">
                {group.items.map((item) => (
                  <button
                    key={item.id}
                    className="pantrychip"
                    onClick={() => onPick(item.id)}
                    aria-label={`${item.name} in die Einkaufsliste`}
                  >
                    {item.name}
                    <span className="pantrychip__plus" aria-hidden="true">
                      <IconPlus size={16} />
                    </span>
                  </button>
                ))}
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
  const [text, setText] = useState('');
  const [category, setCategory] = useState('');
  const groups = useMemo(() => groupPantry(items), [items]);

  return (
    <Sheet title="Grundliste verwalten" onClose={onClose}>
      <div style={{ height: 16 }} />
      <p className="muted" style={{ fontSize: 14.5, marginBottom: 14 }}>
        Diese Zutaten bleiben dauerhaft gespeichert – unabhängig davon, was gerade auf der
        Einkaufsliste steht.
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
            placeholder="Neue Standard-Zutat"
            aria-label="Neue Standard-Zutat"
            autoComplete="off"
          />
          <button
            className="btn btn--primary"
            type="submit"
            disabled={!text.trim()}
            aria-label="Hinzufügen"
          >
            <IconPlus size={19} />
          </button>
        </div>
        <select
          className="select"
          style={{ marginTop: 8 }}
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          aria-label="Rubrik für die neue Zutat"
        >
          <option value="">Ohne Rubrik</option>
          {PANTRY_CATEGORY_ORDER.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </form>

      <button className="btn btn--ghost btn--block" onClick={onAddSuggestions}>
        <IconPlus size={18} />
        Vorschlagsliste ergänzen
      </button>
      <p className="row__note" style={{ marginTop: 8 }}>
        Trägt fehlende Standard-Zutaten nach und ordnet vorhandene ohne Rubrik ein. Was schon da
        ist, bleibt unverändert.
      </p>

      <hr className="divider" />

      {items.length === 0 ? (
        <p className="muted" style={{ fontSize: 14.5 }}>
          Noch keine Standard-Zutaten.
        </p>
      ) : (
        groups.map((group) => (
          <div key={group.category} style={{ marginBottom: 22 }}>
            <div className="detail__h" style={{ marginBottom: 10 }}>
              {group.category}
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

function PantryRow({
  item,
  onSave,
  onDelete,
}: {
  item: PantryItem;
  onSave: (item: PantryItem) => void;
  onDelete: (id: string) => void;
}) {
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
        ariaLabel={`Menge für ${item.name}`}
      />
      <input
        className="input editrow__unit"
        value={unit}
        placeholder="Einheit"
        aria-label={`Einheit für ${item.name}`}
        onChange={(event) => setUnit(event.target.value)}
        onBlur={commit}
        autoComplete="off"
      />
      <input
        className="input editrow__grow"
        value={name}
        aria-label={`Name von ${item.name}`}
        onChange={(event) => setName(event.target.value)}
        onBlur={commit}
        autoComplete="off"
      />
      <select
        className="select editrow__unit"
        value={item.category ?? ''}
        aria-label={`Rubrik von ${item.name}`}
        onChange={(event) => onSave({ ...item, category: event.target.value || undefined })}
      >
        <option value="">—</option>
        {PANTRY_CATEGORY_ORDER.map((entry) => (
          <option key={entry} value={entry}>
            {entry}
          </option>
        ))}
        {item.category && !PANTRY_CATEGORY_ORDER.includes(item.category) ? (
          <option value={item.category}>{item.category}</option>
        ) : null}
      </select>
      <button
        className="iconbtn iconbtn--plain"
        onClick={() => onDelete(item.id)}
        aria-label={`${item.name} aus der Grundliste löschen`}
      >
        <IconTrash size={19} />
      </button>
    </div>
  );
}
