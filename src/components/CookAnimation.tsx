'use client';

import React, { useEffect, useId } from 'react';
import type { AnimationsMotiv } from '@/lib/kochAnimation';

/**
 * Kurze Animation rund um den Kochmodus. Zwei Auftritte, fünf Bilder:
 *
 * - `start` – es geht los, das Essen ist noch nicht fertig:
 *   - Bräter (Saucen, Suppen, Currys): der Topf steht offen, ein Kochlöffel rührt.
 *   - Bratpfanne (Gebratenes): das Öl glänzt und brutzelt, es spritzt, die Pfanne ruckelt.
 *   - Ofen: der Knopf dreht, das Lämpchen geht an, das Fenster glüht.
 *   - Dessert: in der Diner-Rührschüssel schlägt ein Schwingbesen.
 * - `fertig` – das Bild vom fertigen Gericht, deshalb steht es am Schluss:
 *   - Bräter: der Deckel hebt sich vom geschlossenen Topf und es dampft.
 *   - Bratpfanne: ein Schwung aus dem Handgelenk, es dampft und funkelt.
 *   - Ofen: die Tür klappt auf, Dampfwolken quellen heraus.
 *   - Dessert: über der Wähe rieselt Puderzucker aus dem Sieb.
 *
 * Welches Bild, entscheidet lib/kochAnimation am Rezept. Die Animation legt
 * sich über den Kochmodus, der darunter schon steht. So gibt es keine zweite
 * Ansicht, die den Verlauf oder die Timer betrifft.
 */
const DAUER_MS: Record<'start' | 'fertig', Record<AnimationsMotiv, number>> = {
  start: { braeter: 1100, pfanne: 1100, ofen: 1800, besen: 1200, dessert: 1200 },
  fertig: { braeter: 1100, pfanne: 1300, ofen: 1900, besen: 1700, dessert: 1700 },
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
      variante === 'start' ? <RetroHerd /> : <OfenTuerAuf />
    ) : motiv === 'pfanne' ? (
      variante === 'start' ? <PfanneStart /> : <PfanneFertig />
    ) : motiv === 'besen' || (motiv === 'dessert' && variante === 'start') ? (
      <Ruehrschuessel />
    ) : motiv === 'dessert' ? (
      <Puderzucker />
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

/** Der Diner-Herd: Gehaeuse, Bedienleiste, Fuesse. Die Knoepfe zeichnet jedes Bild selbst. */
function Herd({ children }: { children: React.ReactNode }) {
  return (
    <>
      <rect className="cookanim__fuss" x="34" y="138" width="12" height="8" rx="2" />
      <rect className="cookanim__fuss" x="114" y="138" width="12" height="8" rx="2" />
      <rect className="cookanim__herd" x="22" y="20" width="116" height="122" rx="16" />
      <rect className="cookanim__leiste" x="30" y="27" width="100" height="20" rx="7" />
      {children}
    </>
  );
}

/** Ein Drehknopf mit Strich – `dreht` dreht ihn beim Start auf. */
function Knopf({ x, dreht = false }: { x: number; dreht?: boolean }) {
  return (
    <g className={dreht ? 'cookanim__drehknopf' : undefined}>
      <circle className="cookanim__knopf" cx={x} cy="37" r="6" />
      <rect className="cookanim__knopfstrich" x={x - 1} y="31.6" width="2" height="5" rx="1" />
    </g>
  );
}

/** Gratinform mit goldener Kruste. */
function Gratin({ y }: { y: number }) {
  return (
    <>
      <path className="cookanim__form" d={`M57 ${y}h46l-3.4 9.2a3 3 0 0 1-2.8 2H63.2a3 3 0 0 1-2.8-2z`} />
      <path className="cookanim__kruste" d={`M58.5 ${y + 0.5}q6-6 12 0q6-6 12 0q6-6 12 0q4-4 7.5 0z`} />
    </>
  );
}

/** Start: der Knopf dreht, das Lämpchen geht an, das Fenster glüht, über der Form flimmert die Hitze. */
function RetroHerd() {
  const id = useId().replace(/:/g, '');
  return (
    <svg className="cookanim__topf cookanim__quadrat" viewBox="0 0 160 160" width="206" height="206" aria-hidden="true">
      <defs>
        <radialGradient id={`${id}-glut`} cx="50%" cy="48%" r="72%">
          <stop offset="0" stopColor="#ffd885" />
          <stop offset="0.55" stopColor="#ff9a3c" />
          <stop offset="1" stopColor="#b9400f" />
        </radialGradient>
      </defs>
      <Herd>
        <Knopf x={45} dreht />
        <Knopf x={61} />
        <Knopf x={77} />
        <circle className="cookanim__knopf" cx="102" cy="37" r="6.5" />
        <path className="cookanim__uhr" d="M102 33.2v4l2.6 1.6" />
        <circle className="cookanim__lampeaus" cx="120" cy="37" r="3.6" />
        <circle className="cookanim__lampe" cx="120" cy="37" r="3.6" />
      </Herd>
      <rect className="cookanim__tuer" x="30" y="53" width="100" height="81" rx="10" />
      <rect className="cookanim__tuergriff" x="42" y="58" width="76" height="6" rx="3" />
      <rect className="cookanim__ofenraum" x="42" y="70" width="76" height="54" rx="9" />
      <rect className="cookanim__glut" x="42" y="70" width="76" height="54" rx="9" fill={`url(#${id}-glut)`} />
      <path className="cookanim__heizstab" d="M50 77h60" />
      <path className="cookanim__heizstab cookanim__heizstab--an" d="M50 77h60" />
      <Gratin y={108} />
      <g className="cookanim__flimmern" fill="none" strokeWidth="1.6" strokeLinecap="round">
        <path d="M68 102q-3-4 0-8t0-8" />
        <path d="M80 100q-3-4 0-8t0-8" />
        <path d="M92 102q-3-4 0-8t0-8" />
      </g>
      <path className="cookanim__spiegelung" d="M52 117l16-38" />
    </svg>
  );
}

/** Fertig: die Ofentür klappt nach vorn, der Gratin glüht im Licht, Dampfwolken quellen heraus. */
function OfenTuerAuf() {
  const id = useId().replace(/:/g, '');
  return (
    <svg className="cookanim__topf cookanim__quadrat" viewBox="0 0 160 160" width="206" height="206" aria-hidden="true">
      <defs>
        <radialGradient id={`${id}-glut`} cx="50%" cy="55%" r="72%">
          <stop offset="0" stopColor="#ffd885" />
          <stop offset="0.55" stopColor="#ff9a3c" />
          <stop offset="1" stopColor="#b9400f" />
        </radialGradient>
        <mask id={`${id}-fenster`}>
          <rect x="20" y="40" width="120" height="110" fill="#fff" />
          <rect x="42" y="70" width="76" height="54" rx="9" fill="#000" />
        </mask>
      </defs>
      <Herd>
        <Knopf x={45} />
        <Knopf x={61} />
        <Knopf x={77} />
        <circle className="cookanim__lampe cookanim__lampe--an" cx="120" cy="37" r="3.6" />
      </Herd>
      <rect x="32" y="54" width="96" height="78" rx="8" fill={`url(#${id}-glut)`} />
      <path className="cookanim__rost cookanim__rost--heiss" d="M38 120h84" />
      <path className="cookanim__form" d="M54 106h52l-3.8 10.4a3 3 0 0 1-2.8 2H60.6a3 3 0 0 1-2.8-2z" />
      <path className="cookanim__kruste cookanim__kruste--fertig" d="M55.6 106.5q6.5-7 13 0q6.5-7 13 0q6.5-7 13 0q5.5-5.5 10.8 0z" />
      <g className="cookanim__tueraufklappen">
        <rect className="cookanim__tuer" x="30" y="53" width="100" height="81" rx="10" mask={`url(#${id}-fenster)`} />
        <rect className="cookanim__scheibe" x="42" y="70" width="76" height="54" rx="9" />
        <rect className="cookanim__tuergriff" x="42" y="58" width="76" height="6" rx="3" />
      </g>
      <g className="cookanim__wolken">
        <g className="cookanim__dampfwolke">
          <circle cx="66" cy="92" r="9" />
          <circle cx="74" cy="87" r="10" />
          <circle cx="82" cy="93" r="8" />
        </g>
        <g className="cookanim__dampfwolke cookanim__dampfwolke--2">
          <circle cx="88" cy="90" r="9" />
          <circle cx="96" cy="85" r="9" />
          <circle cx="102" cy="92" r="7" />
        </g>
        <g className="cookanim__dampfwolke cookanim__dampfwolke--3">
          <circle cx="70" cy="84" r="8" />
          <circle cx="78" cy="79" r="9" />
          <circle cx="86" cy="85" r="7" />
        </g>
        <g className="cookanim__dampfwolke cookanim__dampfwolke--4">
          <circle cx="84" cy="88" r="8" />
          <circle cx="91" cy="83" r="8" />
          <circle cx="97" cy="89" r="6" />
        </g>
      </g>
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* Dessert                                                                     */
/* -------------------------------------------------------------------------- */

/** Start eines Desserts: die Diner-Rührschüssel, der Schwingbesen schlägt, Zucker funkelt. */
function Ruehrschuessel() {
  const id = useId().replace(/:/g, '');
  return (
    <svg className="cookanim__topf cookanim__quadrat" viewBox="0 0 160 160" width="206" height="206" aria-hidden="true">
      <defs>
        <clipPath id={`${id}-schuessel`}>
          <path d="M26 84A54 10 0 0 0 134 84A54 48 0 0 1 26 84Z" />
        </clipPath>
      </defs>
      <rect className="cookanim__schuesselfuss" x="58" y="126" width="44" height="9" rx="3.5" />
      <ellipse className="cookanim__schuesselrand" cx="80" cy="84" rx="54" ry="10" />
      <ellipse className="cookanim__teig" cx="80" cy="88" rx="47" ry="7.5" />
      <path className="cookanim__teigwelle" d="M48 89q8-3 16 0t16 0t16 0" />
      <g className="cookanim__schlagbesen">
        <rect className="cookanim__besengriff" x="77" y="24" width="6" height="28" rx="3" />
        <rect className="cookanim__besenring" x="77.6" y="51" width="4.8" height="6" rx="1" />
        <g className="cookanim__draht" fill="none" strokeWidth="1.5">
          <path d="M80 57C66 70 67 92 80 96C93 92 94 70 80 57Z" />
          <path d="M80 57C72 71 73 92 80 96C87 92 88 71 80 57Z" />
          <path d="M80 57V96" />
        </g>
      </g>
      <path className="cookanim__schuessel" d="M26 84A54 10 0 0 0 134 84A54 48 0 0 1 26 84Z" />
      <g className="cookanim__streifen" clipPath={`url(#${id}-schuessel)`}>
        <rect x="20" y="102" width="120" height="7" />
        <rect x="20" y="112" width="120" height="2.5" />
      </g>
      <path className="cookanim__schuesselglanz" d="M34 92q8 20 28 28" />
      <path className="cookanim__stern" d="M38 58l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" />
      <path className="cookanim__stern cookanim__stern--2" d="M122 54l1.6 4 4 1.6-4 1.6-1.6 4-1.6-4-4-1.6 4-1.6z" />
      <path className="cookanim__stern cookanim__stern--3" d="M112 72l1.4 3.4 3.4 1.4-3.4 1.4-1.4 3.4-1.4-3.4-3.4-1.4 3.4-1.4z" />
    </svg>
  );
}

/** Dessert fertig: über der Wähe schüttelt ein Sieb, Puderzucker rieselt und bleibt liegen. */
function Puderzucker() {
  const aepfel: Array<[number, number, number]> = [
    [80, 99.5, 0],
    [96, 101.5, 14],
    [110, 107, 34],
    [112, 115, -30],
    [98, 121, -12],
    [80, 123, 0],
    [62, 121, 12],
    [48, 115, 30],
    [50, 107, -34],
    [64, 101.5, -14],
  ];
  const koerner: Array<[number, number, number]> = [
    [70, 50, 1.3],
    [76, 48, 1.1],
    [82, 51, 1.3],
    [88, 49, 1.1],
    [94, 51, 1.2],
    [73, 54, 1],
    [85, 55, 1.2],
    [91, 56, 1],
    [79, 56, 1.1],
    [97, 54, 1],
  ];
  return (
    <svg className="cookanim__topf cookanim__quadrat" viewBox="0 0 160 160" width="206" height="206" aria-hidden="true">
      <ellipse cx="80" cy="120" rx="58" ry="19" fill="#f3e6cf" />
      <ellipse cx="80" cy="116" rx="52" ry="17" fill="#b9782f" />
      <ellipse cx="80" cy="111" rx="52" ry="17" fill="#e3a654" />
      <ellipse cx="80" cy="111" rx="45" ry="13.5" fill="#f3cf87" />
      <g className="cookanim__aepfel">
        {aepfel.map(([x, y, winkel]) => (
          <ellipse key={`${x}-${y}`} cx={x} cy={y} rx="7" ry="2.6" transform={winkel ? `rotate(${winkel} ${x} ${y})` : undefined} />
        ))}
        <ellipse cx="80" cy="111" rx="8" ry="3" />
      </g>
      <ellipse className="cookanim__puder" cx="80" cy="111" rx="50" ry="15.5" />
      <g className="cookanim__koerner">
        {koerner.map(([x, y, r], i) => (
          <circle key={i} className={`cookanim__korn cookanim__korn--${(i % 4) + 1}`} cx={x} cy={y} r={r} />
        ))}
      </g>
      <g className="cookanim__sieb">
        <path className="cookanim__siebstiel" d="M110 34h34" />
        <path className="cookanim__siebkorb" d="M66 36a24 17 0 0 0 48 0z" />
        <path className="cookanim__siebnetz" d="M72 41h36M75 46h30M80 50h20" />
        <ellipse className="cookanim__siebrand" cx="90" cy="36" rx="24" ry="5" />
      </g>
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* Bratpfanne                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Eine Gusseisenpfanne im selben Kupferrot wie der Bräter, von schräg oben:
 * Rand, schwarze Bratfläche, langer Stiel nach rechts. Leer, nur ein Ölfilm
 * mit einem Glanz darauf – so passt sie zu jedem Gebratenen, vom Plätzli bis
 * zu den Gyoza.
 */
function Pfanne({ children }: { children?: React.ReactNode }) {
  return (
    <>
      <g className="cookanim__pfannenstiel">
        <rect className="cookanim__griff" x="110" y="93" width="44" height="9" rx="4.5" transform="rotate(-9 110 97.5)" />
        <circle className="cookanim__stielloch" cx="146" cy="91.3" r="2.2" />
      </g>
      <path className="cookanim__griff" d="M27 97q-9 1-9 5t9 3" />
      <path className="cookanim__korpus" d="M26 100q2 18 20 20h52q18-2 20-20z" />
      <path className="cookanim__glanz" d="M36 106q2 6 8 9" />
      <ellipse className="cookanim__rand" cx="72" cy="100" rx="46" ry="13" />
      <ellipse className="cookanim__bratflaeche" cx="72" cy="101" rx="41" ry="10.5" />
      <ellipse className="cookanim__oel" cx="70" cy="102" rx="30" ry="6.5" />
      <path className="cookanim__oelglanz" d="M54 99.5q14-3.5 30-1.5" />
      {children}
    </>
  );
}

/** Start: es brutzelt – das Öl glänzt, spritzt, die Pfanne ruckelt auf dem Herd. */
function PfanneStart() {
  return (
    <svg className="cookanim__topf cookanim__breit" viewBox="10 36 150 100" width="246" height="164" aria-hidden="true">
      <g className="cookanim__pfanne cookanim__pfanne--ruckeln">
        <Pfanne>
          <g className="cookanim__brutzeln" fill="none" strokeWidth="1.5" strokeLinecap="round">
            <path d="M52 92q-2-3 0-6" />
            <path d="M64 90q-2-3 0-6" />
            <path d="M80 91q-2-3 0-6" />
            <path d="M92 92q-2-3 0-6" />
          </g>
          <circle className="cookanim__tropfen" cx="48" cy="98" r="1.6" />
          <circle className="cookanim__tropfen cookanim__tropfen--2" cx="74" cy="97" r="1.4" />
          <circle className="cookanim__tropfen cookanim__tropfen--3" cx="96" cy="99" r="1.5" />
          <circle className="cookanim__tropfen cookanim__tropfen--4" cx="64" cy="99" r="1.2" />
        </Pfanne>
      </g>
    </svg>
  );
}

/** Fertig: ein Schwung aus dem Handgelenk, Dampf steigt auf, es funkelt. */
function PfanneFertig() {
  return (
    <svg className="cookanim__topf cookanim__breit" viewBox="10 36 150 100" width="246" height="164" aria-hidden="true">
      <g className="cookanim__pfanne cookanim__pfanne--schwung">
        <Pfanne>
          <g className="cookanim__pfannendampf" fill="none" strokeWidth="2.4" strokeLinecap="round">
            <path d="M58 90c-4-5 4-8 0-13" />
            <path d="M72 87c-4-5.5 4-8.5 0-14" />
            <path d="M86 90c-4-5 4-8 0-13" />
          </g>
        </Pfanne>
      </g>
      <path className="cookanim__stern cookanim__stern--pfanne" d="M118 56l1.8 4.4 4.4 1.8-4.4 1.8-1.8 4.4-1.8-4.4-4.4-1.8 4.4-1.8z" />
      <path className="cookanim__stern cookanim__stern--pfanne2" d="M30 68l1.3 3.2 3.2 1.3-3.2 1.3-1.3 3.2-1.3-3.2-3.2-1.3 3.2-1.3z" />
    </svg>
  );
}

/** Ob die Animation gezeigt werden soll. */
export function animationErwuenscht(): boolean {
  if (typeof window === 'undefined') return false;
  return !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
