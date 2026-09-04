/**
 * Erzeugt die App-Icons als PNG – ohne externe Bildbibliothek und ohne Schrift.
 *
 * Auf dem Symbol steht der ganze Schriftzug CRAVE. Die Buchstaben sind aus
 * Strecken und Kreisbögen aufgebaut und werden mit 4x4-Supersampling
 * gezeichnet, danach wird die Pixelmatrix direkt als PNG kodiert.
 *
 * Aufruf: node scripts/make-icons.mjs
 */
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons');

/** Roycroft Copper Red als Grund, Master Key aufgehellt als Schrift. */
const BACKGROUND = [0x7f, 0x3b, 0x25];
const FOREGROUND = [0xfa, 0xf6, 0xec];

const SS = 4; // Supersampling-Faktor pro Achse

/* --------------------------------------------------------------------------
 * Buchstaben
 *
 * Jeder Buchstabe steht in einer eigenen Box: x von 0 bis `w`, y von 0 (oben)
 * bis 1 (unten). Beide Achsen werden gleich skaliert, damit Kreisbögen rund
 * bleiben. Winkel werden mathematisch gezählt (0 = rechts, gegen den
 * Uhrzeigersinn), unabhängig davon, dass y nach unten zeigt.
 * ----------------------------------------------------------------------- */

const seg = (x1, y1, x2, y2) => ({ kind: 'seg', x1, y1, x2, y2 });
const arc = (cx, cy, r, a0, a1) => ({ kind: 'arc', cx, cy, r, a0, a1 });

const LETTERS = {
  C: {
    // Runde Buchstaben brauchen etwas mehr Höhe als eckige, sonst wirken sie
    // kleiner. Der Bogen überschreitet die Grundlinien daher leicht.
    w: 0.94,
    parts: [arc(0.45, 0.5, 0.43, 42, 318)],
  },
  R: {
    w: 0.72,
    parts: [
      seg(0.1, 0.05, 0.1, 0.95),
      seg(0.1, 0.05, 0.4, 0.05),
      arc(0.4, 0.275, 0.225, -90, 90),
      seg(0.1, 0.5, 0.4, 0.5),
      seg(0.36, 0.5, 0.66, 0.95),
    ],
  },
  A: {
    w: 0.84,
    parts: [
      seg(0.06, 0.95, 0.42, 0.05),
      seg(0.78, 0.95, 0.42, 0.05),
      seg(0.2, 0.66, 0.64, 0.66),
    ],
  },
  V: {
    w: 0.84,
    parts: [seg(0.06, 0.05, 0.42, 0.95), seg(0.78, 0.05, 0.42, 0.95)],
  },
  E: {
    w: 0.62,
    parts: [
      seg(0.1, 0.05, 0.1, 0.95),
      seg(0.1, 0.05, 0.58, 0.05),
      seg(0.1, 0.5, 0.5, 0.5),
      seg(0.1, 0.95, 0.58, 0.95),
    ],
  },
};

const WORD = ['C', 'R', 'A', 'V', 'E'];
const TRACKING = 0.16; // Abstand zwischen den Buchstaben, in Buchstabenhöhen
const STROKE = 0.18; // Strichstärke, in Buchstabenhöhen

const WORD_WIDTH =
  WORD.reduce((sum, ch) => sum + LETTERS[ch].w, 0) + TRACKING * (WORD.length - 1);

/* ------------------------------- Abstände -------------------------------- */

function distanceToSegment(px, py, s) {
  const dx = s.x2 - s.x1;
  const dy = s.y2 - s.y1;
  const lengthSquared = dx * dx + dy * dy;
  let t = lengthSquared === 0 ? 0 : ((px - s.x1) * dx + (py - s.y1) * dy) / lengthSquared;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (s.x1 + t * dx), py - (s.y1 + t * dy));
}

function distanceToArc(px, py, a) {
  const dx = px - a.cx;
  const dy = py - a.cy;
  // y zeigt nach unten, für den Winkel wird die Richtung gedreht.
  let angle = (Math.atan2(-dy, dx) * 180) / Math.PI;
  let start = a.a0;
  let end = a.a1;
  while (end < start) end += 360;
  while (angle < start) angle += 360;

  if (angle <= end) return Math.abs(Math.hypot(dx, dy) - a.r);

  // Ausserhalb des Bogens: Abstand zum näheren Endpunkt.
  let best = Infinity;
  for (const deg of [start, end]) {
    const rad = (deg * Math.PI) / 180;
    const ex = a.cx + a.r * Math.cos(rad);
    const ey = a.cy - a.r * Math.sin(rad);
    best = Math.min(best, Math.hypot(px - ex, py - ey));
  }
  return best;
}

function distanceToPart(px, py, part) {
  return part.kind === 'seg' ? distanceToSegment(px, py, part) : distanceToArc(px, py, part);
}

/* ------------------------------- Rasterung -------------------------------- */

function insideRoundedRect(x, y, size, radius) {
  const half = size / 2;
  // Abstand zum inneren Rechteck (dem Quadrat ohne die Eckradien).
  const dx = Math.abs(x - half) - (half - radius);
  const dy = Math.abs(y - half) - (half - radius);
  // Nur die Anteile ausserhalb des inneren Rechtecks zählen. Liegt der Punkt
  // in einem Randstreifen, ist eine der beiden Komponenten null, und der
  // Vergleich prüft allein die andere Achse.
  return Math.hypot(Math.max(dx, 0), Math.max(dy, 0)) <= radius;
}

/** Buchstabenteile in Bildkoordinaten, dazu die halbe Strichstärke. */
function layout(size, contentWidth) {
  const letterHeight = (size * contentWidth) / WORD_WIDTH;
  const totalWidth = WORD_WIDTH * letterHeight;
  let cursorX = (size - totalWidth) / 2;
  const originY = (size - letterHeight) / 2;

  const parts = [];
  for (const ch of WORD) {
    const letter = LETTERS[ch];
    for (const part of letter.parts) {
      if (part.kind === 'seg') {
        parts.push({
          kind: 'seg',
          x1: cursorX + part.x1 * letterHeight,
          y1: originY + part.y1 * letterHeight,
          x2: cursorX + part.x2 * letterHeight,
          y2: originY + part.y2 * letterHeight,
        });
      } else {
        parts.push({
          kind: 'arc',
          cx: cursorX + part.cx * letterHeight,
          cy: originY + part.cy * letterHeight,
          r: part.r * letterHeight,
          a0: part.a0,
          a1: part.a1,
        });
      }
    }
    cursorX += (letter.w + TRACKING) * letterHeight;
  }
  return { parts, half: (STROKE * letterHeight) / 2 };
}

function render(size, { rounded, contentWidth }) {
  const radius = size * 0.225;
  const { parts, half } = layout(size, contentWidth);
  const pixels = Buffer.alloc(size * size * 4);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let background = 0;
      let mark = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const px = x + (sx + 0.5) / SS;
          const py = y + (sy + 0.5) / SS;
          if (rounded && !insideRoundedRect(px, py, size, radius)) continue;
          background += 1;
          for (const part of parts) {
            if (distanceToPart(px, py, part) <= half) {
              mark += 1;
              break;
            }
          }
        }
      }

      const total = SS * SS;
      const alpha = background / total;
      const offset = (y * size + x) * 4;
      if (alpha === 0) {
        pixels.writeUInt32BE(0, offset);
        continue;
      }
      const t = Math.min(1, mark / total / alpha);
      for (let c = 0; c < 3; c++) {
        pixels[offset + c] = Math.round(BACKGROUND[c] * (1 - t) + FOREGROUND[c] * t);
      }
      pixels[offset + 3] = Math.round(alpha * 255);
    }
  }
  return pixels;
}

/** Kleines Zeichen für den Browser-Tab: dort wäre der Schriftzug unlesbar. */
function renderMonogram(size) {
  const radius = size * 0.225;
  const ringR = size * 0.26;
  const half = size * 0.075;
  const part = { kind: 'arc', cx: size / 2, cy: size / 2, r: ringR, a0: 42, a1: 318 };
  const pixels = Buffer.alloc(size * size * 4);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let background = 0;
      let mark = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const px = x + (sx + 0.5) / SS;
          const py = y + (sy + 0.5) / SS;
          if (!insideRoundedRect(px, py, size, radius)) continue;
          background += 1;
          if (distanceToArc(px, py, part) <= half) mark += 1;
        }
      }
      const total = SS * SS;
      const alpha = background / total;
      const offset = (y * size + x) * 4;
      if (alpha === 0) {
        pixels.writeUInt32BE(0, offset);
        continue;
      }
      const t = Math.min(1, mark / total / alpha);
      for (let c = 0; c < 3; c++) {
        pixels[offset + c] = Math.round(BACKGROUND[c] * (1 - t) + FOREGROUND[c] * t);
      }
      pixels[offset + 3] = Math.round(alpha * 255);
    }
  }
  return pixels;
}

/* ------------------------------ PNG-Encoder ------------------------------- */

function crc32(buffer) {
  let crc = 0xffffffff;
  for (let i = 0; i < buffer.length; i++) {
    crc ^= buffer[i];
    for (let bit = 0; bit < 8; bit++) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([length, body, crc]);
}

function encodePng(size, pixels) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // Bittiefe
  header[9] = 6; // RGBA
  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0; // Filter "None"
    pixels.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/* --------------------------------- Ausgabe -------------------------------- */

mkdirSync(OUT_DIR, { recursive: true });

const targets = [
  // Auf dem Home-Bildschirm wird das Symbol beschnitten: etwas Rand lassen.
  { file: 'apple-touch-icon.png', size: 180, rounded: false, contentWidth: 0.82 },
  { file: 'icon-192.png', size: 192, rounded: true, contentWidth: 0.8 },
  { file: 'icon-512.png', size: 512, rounded: true, contentWidth: 0.8 },
  // Maskable: der Schriftzug muss in den sicheren Innenbereich passen.
  { file: 'icon-maskable-512.png', size: 512, rounded: false, contentWidth: 0.6 },
];

for (const target of targets) {
  const pixels = render(target.size, target);
  writeFileSync(join(OUT_DIR, target.file), encodePng(target.size, pixels));
  console.log(`geschrieben: icons/${target.file}`);
}

writeFileSync(join(OUT_DIR, 'favicon-32.png'), encodePng(32, renderMonogram(32)));
console.log('geschrieben: icons/favicon-32.png');
