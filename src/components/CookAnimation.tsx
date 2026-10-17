'use client';

import React, { useEffect, useId } from 'react';
import type { AnimationsMotiv } from '@/lib/kochAnimation';

/**
 * Kurze Animation rund um den Kochmodus. Zwei Auftritte, vier Bilder:
 *
 * - `start` – es geht los, das Essen ist noch nicht fertig:
 *   - Bräter: der Topf steht offen da, ein Kochlöffel rührt darin.
 *   - Ofen: der Bräter fährt in den Ofen, die Tür geht zu, es glüht.
 *   - Schwingbesen (Dessert): Vanillecreme im Bräter, es spritzt ein wenig.
 * - `fertig` – das Bild vom fertigen Gericht, deshalb steht es am Schluss:
 *   - Bräter: der Deckel hebt sich vom geschlossenen Topf und es dampft.
 *   - Ofen: der Bräter kommt heraus, der Deckel hebt sich, es dampft.
 *   - Dessert: eine Sahnehaube plumpst auf die Coupe, die Kirsche hinterher.
 *
 * Welches Bild, entscheidet lib/kochAnimation am Rezept. Die Animation legt
 * sich über den Kochmodus, der darunter schon steht. So gibt es keine zweite
 * Ansicht, die den Verlauf oder die Timer betrifft.
 */
const DAUER_MS: Record<'start' | 'fertig', Record<AnimationsMotiv, number>> = {
  start: { braeter: 1100, ofen: 1800, besen: 1100, dessert: 1100 },
  fertig: { braeter: 1100, ofen: 1800, besen: 1100, dessert: 1700 },
};

export function CookAnimation({
  variante,
  motiv = 'braeter',
  title,
  onDone,
}: {
  variante: 'start' | 'fertig';
  motiv?: AnimationsMotiv;
  title: string;
  onDone: () => void;
}) {
  const dauer = DAUER_MS[variante][motiv];

  /*
   * Antippen ueberspringt – niemand will auf eine Animation warten. Der Tipp
   * geht dabei durch die Animation hindurch an sein Ziel: wer schon auf
   * "Los geht's" tippt, ist auch gleich dort. Vorher fing die Flaeche jeden
   * Tipp ab, und der Kochmodus wirkte eine Sekunde lang eingefroren.
   */
  useEffect(() => {
    const handle = setTimeout(onDone, dauer);
    const weiter = () => onDone();
    window.addEventListener('pointerdown', weiter, { capture: true });
    return () => {
      clearTimeout(handle);
      window.removeEventListener('pointerdown', weiter, { capture: true });
    };
  }, [onDone, dauer]);

  const bild =
    motiv === 'ofen' ? (
      variante === 'start' ? <OfenAn /> : <OfenAuf />
    ) : motiv === 'besen' ? (
      <Schwingbesen />
    ) : motiv === 'dessert' ? (
      <Coupe />
    ) : variante === 'start' ? (
      <TopfOffen />
    ) : (
      <TopfMitDeckel />
    );

  return (
    <div
      className={`cookanim cookanim--${variante} cookanim--${motiv}`}
      style={{ '--cookanim-dauer': `${dauer}ms` } as React.CSSProperties}
      aria-hidden="true"
    >
      {bild}
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

/* -------------------------------------------------------------------------- */
/* Ofen                                                                        */
/* -------------------------------------------------------------------------- */

/** Der Diner-Herd: Gehaeuse, Bedienleiste mit drei Knoepfen und Lampe, Fuesse. */
function Herd({ lampeAn }: { lampeAn: boolean }) {
  return (
    <>
      <rect className="cookanim__fuss" x="34" y="138" width="12" height="8" rx="2" />
      <rect className="cookanim__fuss" x="114" y="138" width="12" height="8" rx="2" />
      <rect className="cookanim__herd" x="22" y="20" width="116" height="122" rx="16" />
      <rect className="cookanim__leiste" x="30" y="27" width="100" height="20" rx="7" />
      <circle className="cookanim__knopf" cx="45" cy="37" r="6" />
      <circle className="cookanim__knopf" cx="61" cy="37" r="6" />
      <circle className="cookanim__knopf" cx="77" cy="37" r="6" />
      <circle className="cookanim__lampeaus" cx="120" cy="37" r="3.6" />
      {lampeAn ? <circle className="cookanim__lampe" cx="120" cy="37" r="3.6" /> : null}
    </>
  );
}

/** Ein kleiner Bräter mit Deckel, wie er im Ofen steht. */
function KleinerBraeter({ dampf = false }: { dampf?: boolean }) {
  return (
    <>
      {dampf ? (
        <g className="cookanim__ofendampf" fill="none" strokeWidth="2.4" strokeLinecap="round">
          <path d="M72 84c-4-5 4-8 0-13" />
          <path d="M80 81c-4-5.5 4-8.5 0-14" />
          <path d="M88 84c-4-5 4-8 0-13" />
        </g>
      ) : null}
      <rect className="cookanim__griff" x="54" y="101" width="12" height="6" rx="3" />
      <rect className="cookanim__griff" x="94" y="101" width="12" height="6" rx="3" />
      <path className="cookanim__korpus" d="M62 105h36v6a8 8 0 0 1-8 8H70a8 8 0 0 1-8-8z" />
      <rect className="cookanim__kragen" x="58" y="98" width="44" height="7" rx="3" />
      <g className="cookanim__kleindeckel">
        <path className="cookanim__deckelform" d="M62 98q18-13 36 0z" />
        <rect className="cookanim__kragen" x="60" y="96.5" width="40" height="3" rx="1.5" />
        <circle className="cookanim__knauf" cx="80" cy="89.5" r="2.6" />
      </g>
    </>
  );
}

/** Start: der Bräter fährt in den Ofen, die Tür klappt zu, das Fenster glüht. */
function OfenAn() {
  const id = useId().replace(/:/g, '');
  return (
    <svg className="cookanim__topf cookanim__quadrat" viewBox="0 0 160 160" width="206" height="206" aria-hidden="true">
      <defs>
        <radialGradient id={`${id}-glut`} cx="50%" cy="50%" r="72%">
          <stop offset="0" stopColor="#ffd885" />
          <stop offset="0.55" stopColor="#ff9a3c" />
          <stop offset="1" stopColor="#b9400f" />
        </radialGradient>
        <mask id={`${id}-fenster`}>
          <rect x="20" y="40" width="120" height="110" fill="#fff" />
          <rect x="42" y="70" width="76" height="54" rx="9" fill="#000" />
        </mask>
      </defs>
      <Herd lampeAn />
      <rect className="cookanim__ofenraum" x="32" y="54" width="96" height="78" rx="8" />
      <rect className="cookanim__glut" x="32" y="54" width="96" height="78" rx="8" fill={`url(#${id}-glut)`} />
      <path className="cookanim__rost" d="M38 118h84" />
      <g className="cookanim__hinein">
        <KleinerBraeter />
      </g>
      <g className="cookanim__ofentuer">
        <rect className="cookanim__tuer" x="30" y="53" width="100" height="81" rx="10" mask={`url(#${id}-fenster)`} />
        <rect className="cookanim__scheibe" x="42" y="70" width="76" height="54" rx="9" />
        <rect className="cookanim__tuergriff" x="42" y="58" width="76" height="6" rx="3" />
      </g>
    </svg>
  );
}

/** Fertig: die Tür steht offen, der Bräter kommt heraus, der Deckel hebt sich, es dampft. */
function OfenAuf() {
  const id = useId().replace(/:/g, '');
  return (
    <svg className="cookanim__topf cookanim__quadrat" viewBox="0 0 160 160" width="206" height="206" aria-hidden="true">
      <defs>
        <radialGradient id={`${id}-glut`} cx="50%" cy="55%" r="72%">
          <stop offset="0" stopColor="#ffd885" />
          <stop offset="0.55" stopColor="#ff9a3c" />
          <stop offset="1" stopColor="#b9400f" />
        </radialGradient>
      </defs>
      <Herd lampeAn />
      <rect x="32" y="54" width="96" height="78" rx="8" fill={`url(#${id}-glut)`} />
      <path className="cookanim__rost cookanim__rost--heiss" d="M38 118h84" />
      {/* Die offene Tür liegt flach vorne. */}
      <path className="cookanim__tuer" d="M26 131h108l6 9a2 2 0 0 1-1.7 3H21.7a2 2 0 0 1-1.7-3z" />
      <rect className="cookanim__tuergriff" x="40" y="134" width="80" height="4" rx="2" />
      <g className="cookanim__heraus">
        <KleinerBraeter dampf />
      </g>
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* Dessert                                                                     */
/* -------------------------------------------------------------------------- */

/** Start eines Desserts: im Bräter schlägt ein Schwingbesen Vanillecreme. */
function Schwingbesen() {
  return (
    <svg className="cookanim__topf" viewBox="0 0 140 152" width="206" height="224" aria-hidden="true">
      <rect className="cookanim__griff" x="6" y="95" width="26" height="12" rx="6" />
      <rect className="cookanim__griff" x="108" y="95" width="26" height="12" rx="6" />
      <path className="cookanim__korpus" d="M24 98h92v16a22 22 0 0 1-22 22H46a22 22 0 0 1-22-22z" />
      <path className="cookanim__glanz" d="M34 104v6a14 14 0 0 0 6 11" />
      <ellipse className="cookanim__rand" cx="70" cy="98" rx="46" ry="9" />
      <ellipse className="cookanim__innen" cx="70" cy="98.5" rx="40" ry="7" />
      <ellipse className="cookanim__creme" cx="70" cy="99.5" rx="36" ry="5.6" />
      <path className="cookanim__welle" d="M52 100q9-3 18 0t18 0" />
      <path className="cookanim__welle cookanim__welle--2" d="M58 97.6q6-2 12 0t12 0" />
      <g className="cookanim__besen">
        <rect className="cookanim__besengriff" x="67" y="34" width="6" height="26" rx="3" />
        <rect className="cookanim__besenring" x="67.6" y="59" width="4.8" height="6" rx="1" />
        <g className="cookanim__draht" fill="none" strokeWidth="1.5">
          <path d="M70 65C57 76 58 97 70 101C82 97 83 76 70 65Z" />
          <path d="M70 65C63 78 64 97 70 101C76 97 77 78 70 65Z" />
          <path d="M70 65V101" />
        </g>
      </g>
      <path className="cookanim__randhinten" d="M24 98A46 9 0 0 1 116 98L110 98.5A40 7 0 0 0 30 98.5Z" />
      <circle className="cookanim__spritzer" cx="58" cy="94" r="2.2" />
      <circle className="cookanim__spritzer cookanim__spritzer--2" cx="84" cy="93" r="2" />
      <circle className="cookanim__spritzer cookanim__spritzer--3" cx="66" cy="93" r="1.6" />
    </svg>
  );
}

/** Dessert fertig: Coupe mit Erdbeeren und Creme, Sahnehaube, Kirsche. */
function Coupe() {
  const id = useId().replace(/:/g, '');
  return (
    <svg className="cookanim__topf cookanim__quadrat" viewBox="0 0 160 160" width="206" height="206" aria-hidden="true">
      <defs>
        <clipPath id={`${id}-glas`}>
          <path d="M40 64h80q-3 38-40 44q-37-6-40-44z" />
        </clipPath>
      </defs>
      <ellipse className="cookanim__glasfuss" cx="80" cy="140" rx="24" ry="5.5" />
      <rect className="cookanim__glasfuss" x="77" y="106" width="6" height="34" rx="2" />
      <g clipPath={`url(#${id}-glas)`}>
        <rect x="30" y="60" width="100" height="60" fill="#fff7ea" />
        <path d="M30 92q12-6 25 0t25 0t25 0t25 0V120H30z" fill="#e04a5a" />
        <path d="M30 78q12-5 25 0t25 0t25 0t25 0V92q-12-6-25 0t-25 0t-25 0t-25 0z" fill="#f8dfa0" />
        <circle cx="54" cy="100" r="3.2" fill="#b81d2f" />
        <circle cx="96" cy="103" r="3.6" fill="#b81d2f" />
        <circle cx="76" cy="106" r="2.8" fill="#b81d2f" />
      </g>
      <path className="cookanim__glasrand" d="M40 64h80q-3 38-40 44q-37-6-40-44z" />
      <path className="cookanim__glasglanz" d="M46 70q2 18 14 28" />
      <g className="cookanim__sahne">
        <ellipse cx="80" cy="62" rx="36" ry="8" />
        <ellipse cx="80" cy="54" rx="27" ry="8" />
        <ellipse cx="80" cy="46" rx="18" ry="7" />
        <path d="M70 43q8-12 11-17q0 9 8 15z" />
      </g>
      <g className="cookanim__kirsche">
        <path d="M82 22q3-11 12-15" fill="none" stroke="#5b3a1a" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="81" cy="29" r="7" fill="#c8102e" />
        <circle cx="78.6" cy="26.6" r="2" fill="#ffffff" fillOpacity="0.7" />
      </g>
      <g className="cookanim__sterne">
        <path className="cookanim__stern" d="M44 34l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" />
        <path className="cookanim__stern cookanim__stern--2" d="M118 30l1.6 4 4 1.6-4 1.6-1.6 4-1.6-4-4-1.6 4-1.6z" />
      </g>
    </svg>
  );
}

/** Ob die Animation gezeigt werden soll. */
export function animationErwuenscht(): boolean {
  if (typeof window === 'undefined') return false;
  return !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
