'use client';

import React from 'react';
import { useT } from '@/lib/i18n';
import { IconClose, IconSearch } from './Icons';

export function SearchBar({
  value,
  onChange,
  placeholder,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  label: string;
}) {
  const t = useT();
  return (
    <div className="search">
      <span className="search__icon">
        <IconSearch size={19} />
      </span>
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={label}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        enterKeyHint="search"
      />
      {value ? (
        <button className="search__clear" onClick={() => onChange('')} aria-label={t.ui.sucheLoeschen}>
          <IconClose size={17} />
        </button>
      ) : null}
    </div>
  );
}
