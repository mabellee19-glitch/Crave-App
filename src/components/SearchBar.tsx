'use client';

import React from 'react';
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
        <button className="search__clear" onClick={() => onChange('')} aria-label="Suche löschen">
          <IconClose size={17} />
        </button>
      ) : null}
    </div>
  );
}
