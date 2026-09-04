'use client';

import React, { useEffect, useState } from 'react';

/**
 * Kurzer Vorspann beim Start des Kochmodus: ein Bräter, dessen Deckel sich
 * hebt und dampft. Nach knapp anderthalb Sekunden ist er weg.
 *
 * Der Kochmodus liegt bereits darunter – der Vorspann legt sich nur davor.
 * So gibt es keine zweite Ansicht, die den Verlauf oder die Timer betrifft.
 */
const DAUER_MS = 1400;

export function CookIntro({ title, onDone }: { title: string; onDone: () => void }) {
  const [weg, setWeg] = useState(false);

  useEffect(() => {
    const handle = setTimeout(onDone, DAUER_MS);
    return () => clearTimeout(handle);
  }, [onDone]);

  // Antippen überspringt – niemand will auf eine Animation warten.
  return (
    <div
      className={`cookintro${weg ? ' cookintro--weg' : ''}`}
      onClick={() => {
        setWeg(true);
        onDone();
      }}
      role="presentation"
    >
      <svg
        className="cookintro__topf"
        viewBox="0 0 140 152"
        width="206"
        height="224"
        aria-hidden="true"
      >
        {/* Dampf – steigt auf, sobald der Deckel offen ist */}
        <g className="cookintro__dampf" fill="none" strokeLinecap="round" strokeWidth="3.6">
          <path className="cookintro__wolke cookintro__wolke--1" d="M54 48c-7-9 7-14 0-23" />
          <path className="cookintro__wolke cookintro__wolke--2" d="M70 43c-7-10 7-15 0-25" />
          <path className="cookintro__wolke cookintro__wolke--3" d="M86 48c-7-9 7-14 0-23" />
        </g>
        <g transform="translate(0 32)">
          <g className="cookintro__deckel">
            <path className="cookintro__deckelform" d="M24 52q46-31 92 0z" />
            <rect className="cookintro__deckelrand" x="20" y="48" width="100" height="8" rx="4" />
            <rect className="cookintro__stiel" x="67.5" y="31" width="5" height="7" rx="2" />
            <circle className="cookintro__knauf" cx="70" cy="29" r="5.4" />
          </g>
          <rect className="cookintro__griff" x="4" y="58" width="18" height="13" rx="6.5" />
          <rect className="cookintro__griff" x="118" y="58" width="18" height="13" rx="6.5" />
          <rect className="cookintro__kragen" x="16" y="56" width="108" height="13" rx="5" />
          <path className="cookintro__korpus" d="M24 69h92v13a22 22 0 0 1-22 22H46a22 22 0 0 1-22-22z" />
          <path className="cookintro__glanz" d="M34 74v6a14 14 0 0 0 6 11" />
        </g>
      </svg>

      <p className="cookintro__titel">{title}</p>
    </div>
  );
}

/** Ob der Vorspann gezeigt werden soll. */
export function introErwuenscht(): boolean {
  if (typeof window === 'undefined') return false;
  return !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
