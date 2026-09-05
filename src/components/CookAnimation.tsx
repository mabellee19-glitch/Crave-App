'use client';

import React, { useEffect } from 'react';

/**
 * Kurze Animation rund um den Kochmodus. Zwei Auftritte, ein Bräter:
 *
 * - `start` – der Topf steht offen da, ein Kochlöffel rührt darin. Es geht
 *   los, das Essen ist noch nicht fertig.
 * - `fertig` – der Deckel hebt sich vom geschlossenen Topf und es dampft.
 *   Das ist das Bild vom fertigen Gericht, deshalb steht es am Schluss.
 *
 * Die Animation legt sich über den Kochmodus, der darunter schon steht. So
 * gibt es keine zweite Ansicht, die den Verlauf oder die Timer betrifft.
 */
const DAUER_MS = 1400;

export function CookAnimation({
  variante,
  title,
  onDone,
}: {
  variante: 'start' | 'fertig';
  title: string;
  onDone: () => void;
}) {
  useEffect(() => {
    const handle = setTimeout(onDone, DAUER_MS);
    return () => clearTimeout(handle);
  }, [onDone]);

  // Antippen überspringt – niemand will auf eine Animation warten.
  return (
    <div className={`cookanim cookanim--${variante}`} onClick={onDone} role="presentation">
      {variante === 'start' ? <TopfOffen /> : <TopfMitDeckel />}
      <p className="cookanim__titel">{title}</p>
    </div>
  );
}

/** Offener Bräter, in dem ein Kochlöffel rührt. */
function TopfOffen() {
  return (
    <svg className="cookanim__topf" viewBox="0 0 140 152" width="206" height="224" aria-hidden="true">
      <rect className="cookanim__griff" x="6" y="95" width="26" height="12" rx="6" />
      <rect className="cookanim__griff" x="108" y="95" width="26" height="12" rx="6" />
      <path
        className="cookanim__korpus"
        d="M24 98h92v16a22 22 0 0 1-22 22H46a22 22 0 0 1-22-22z"
      />
      <path className="cookanim__glanz" d="M34 104v6a14 14 0 0 0 6 11" />

      {/* Rand, Öffnung und der Inhalt darin */}
      <ellipse className="cookanim__rand" cx="70" cy="98" rx="46" ry="9" />
      <ellipse className="cookanim__innen" cx="70" cy="98.5" rx="40" ry="7" />
      <ellipse className="cookanim__inhalt" cx="70" cy="99.5" rx="36" ry="5.6" />
      {/* Drei Schlieren in der Sauce, die dem Löffel im Kreis nachlaufen */}
      <path className="cookanim__strudel" d="M62 99.5q8-2.6 16 0" />
      <path className="cookanim__strudel cookanim__strudel--2" d="M62 99.5q8-2.6 16 0" />
      <path className="cookanim__strudel cookanim__strudel--3" d="M62 99.5q8-2.6 16 0" />

      {/*
        Der Löffel haengt am oberen Ende, wie in einer Hand: dort dreht er sich,
        und die Kelle unten zieht dadurch ihre Runde durch den Topf.
      */}
      <g className="cookanim__loeffel">
        <rect className="cookanim__stiel" x="67.5" y="50" width="5" height="48" rx="2.5" />
        <ellipse className="cookanim__kelle" cx="70" cy="98" rx="8.5" ry="4.2" />
      </g>

      {/*
        Die hintere Haelfte des Randes liegt zuletzt und damit vor dem Löffel:
        so taucht die Kelle hinter dem Rand ab, statt darueber zu schweben.
      */}
      <path
        className="cookanim__randhinten"
        d="M24 98 A46 9 0 0 1 116 98 L110 98.5 A40 7 0 0 0 30 98.5 Z"
      />
    </svg>
  );
}

/** Geschlossener Bräter, dessen Deckel sich hebt und dampft. */
function TopfMitDeckel() {
  return (
    <svg className="cookanim__topf" viewBox="0 0 140 152" width="206" height="224" aria-hidden="true">
      {/* Dampf – steigt auf, sobald der Deckel offen ist */}
      <g className="cookanim__dampf" fill="none" strokeLinecap="round" strokeWidth="3.6">
        <path className="cookanim__wolke cookanim__wolke--1" d="M54 48c-7-9 7-14 0-23" />
        <path className="cookanim__wolke cookanim__wolke--2" d="M70 43c-7-10 7-15 0-25" />
        <path className="cookanim__wolke cookanim__wolke--3" d="M86 48c-7-9 7-14 0-23" />
      </g>
      <g transform="translate(0 32)">
        <g className="cookanim__deckel">
          <path className="cookanim__deckelform" d="M24 52q46-31 92 0z" />
          <rect className="cookanim__deckelrand" x="20" y="48" width="100" height="8" rx="4" />
          <rect className="cookanim__stiel" x="67.5" y="31" width="5" height="7" rx="2" />
          <circle className="cookanim__knauf" cx="70" cy="29" r="5.4" />
        </g>
        <rect className="cookanim__griff" x="4" y="58" width="18" height="13" rx="6.5" />
        <rect className="cookanim__griff" x="118" y="58" width="18" height="13" rx="6.5" />
        <rect className="cookanim__kragen" x="16" y="56" width="108" height="13" rx="5" />
        <path className="cookanim__korpus" d="M24 69h92v13a22 22 0 0 1-22 22H46a22 22 0 0 1-22-22z" />
        <path className="cookanim__glanz" d="M34 74v6a14 14 0 0 0 6 11" />
      </g>
    </svg>
  );
}

/** Ob die Animation gezeigt werden soll. */
export function animationErwuenscht(): boolean {
  if (typeof window === 'undefined') return false;
  return !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
