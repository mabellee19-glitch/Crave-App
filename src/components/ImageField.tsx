'use client';

import React, { useRef, useState } from 'react';
import { fileToDataUrl } from '@/lib/image';
import { IconImage, IconTrash } from './Icons';

export function ImageField({
  value,
  onChange,
  label = 'Bild',
}: {
  value: string;
  onChange: (value: string) => void;
  label?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="field">
      <span className="field__label">{label}</span>
      {value ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img className="imgpreview" src={value} alt="" />
      ) : null}
      <div className="rowline">
        <button
          type="button"
          className="btn btn--ghost"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
        >
          <IconImage size={18} />
          {busy ? 'Wird verarbeitet…' : value ? 'Bild ersetzen' : 'Bild auswählen'}
        </button>
        {value ? (
          <button type="button" className="btn btn--quiet" onClick={() => onChange('')}>
            <IconTrash size={18} />
            Entfernen
          </button>
        ) : null}
      </div>
      {error ? (
        <span className="row__note" style={{ color: 'var(--berry)' }}>
          {error}
        </span>
      ) : null}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="visually-hidden"
        onChange={async (event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (!file) return;
          setBusy(true);
          setError(null);
          try {
            onChange(await fileToDataUrl(file));
          } catch {
            setError('Das Bild konnte nicht geladen werden.');
          } finally {
            setBusy(false);
          }
        }}
      />
    </div>
  );
}
