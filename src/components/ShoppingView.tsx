'use client';

import React, { useState } from 'react';
import { PantryItem, ShoppingItem } from '@/lib/types';
import { formatQuantity, parseQuickAdd } from '@/lib/units';
import { ConfirmDialog, EmptyState, NumberInput, Sheet } from './ui';
import { IconCheck, IconPencil, IconPlus, IconTrash } from './Icons';

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
  onAddPantryItem: (input: { name: string; amount: number | null; unit: string }) => void;
  onSavePantryItem: (item: PantryItem) => void;
  onDeletePantryItem: (id: string) => void;
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
          <div className="pantrychips">
            {pantry.map((item) => (
              <button
                key={item.id}
                className="pantrychip"
                onClick={() => onMovePantryToCart(item.id)}
                aria-label={`${item.name} in die Einkaufsliste`}
              >
                {item.name}
                <span className="pantrychip__plus" aria-hidden="true">
                  <IconPlus size={16} />
                </span>
              </button>
            ))}
          </div>
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

function PantrySheet({
  items,
  onClose,
  onAdd,
  onSave,
  onDelete,
}: {
  items: PantryItem[];
  onClose: () => void;
  onAdd: (input: { name: string; amount: number | null; unit: string }) => void;
  onSave: (item: PantryItem) => void;
  onDelete: (id: string) => void;
}) {
  const [text, setText] = useState('');

  return (
    <Sheet title="Grundliste verwalten" onClose={onClose}>
      <div style={{ height: 16 }} />
      <p className="muted" style={{ fontSize: 14.5, marginBottom: 14 }}>
        Diese Zutaten bleiben dauerhaft gespeichert – unabhängig davon, was gerade auf der
        Einkaufsliste steht.
      </p>

      <form
        className="inputrow"
        style={{ marginBottom: 18 }}
        onSubmit={(event) => {
          event.preventDefault();
          const parsed = parseQuickAdd(text);
          if (!parsed.name) return;
          onAdd(parsed);
          setText('');
        }}
      >
        <input
          className="input"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Neue Standard-Zutat"
          aria-label="Neue Standard-Zutat"
          autoComplete="off"
        />
        <button className="btn btn--primary" type="submit" disabled={!text.trim()} aria-label="Hinzufügen">
          <IconPlus size={19} />
        </button>
      </form>

      {items.length === 0 ? (
        <p className="muted" style={{ fontSize: 14.5 }}>
          Noch keine Standard-Zutaten.
        </p>
      ) : (
        <div className="stack">
          {items.map((item) => (
            <PantryRow key={item.id} item={item} onSave={onSave} onDelete={onDelete} />
          ))}
        </div>
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
