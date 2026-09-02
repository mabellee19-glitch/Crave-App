/**
 * Erzeugt die App-Icons als PNG – ohne externe Bildbibliothek.
 *
 * Gezeichnet wird ein "C" (offener Ring) auf warmem Terrakotta. Die Kanten
 * werden per 4x4-Supersampling geglaettet, danach wird die Pixelmatrix direkt
 * als PNG kodiert.
 *
 * Aufruf: node scripts/make-icons.mjs
 */
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons');

const TERRACOTTA = [0xc0, 0x55, 0x2e];
const CREAM = [0xfb, 0xf7, 0xf2];

const SS = 4; // Supersampling-Faktor pro Achse

/* --------------------------- Geometrie (SDF-frei) ------------------------- */

function insideRoundedRect(x, y, size, radius) {
  const half = size / 2;
  const dx = Math.abs(x - half) - (half - radius);
  const dy = Math.abs(y - half) - (half - radius);
  if (dx <= 0 || dy <= 0) return Math.max(dx, dy) <= 0;
  return Math.hypot(dx, dy) <= radius;
}

/**
 * Offener Ring ("C"): Ring mit Radius `ringR` und Staerke `thickness`,
 * ausgespart wird ein Keil nach rechts mit der Oeffnung `gapDeg`.
 */
function insideC(x, y, size, ringR, thickness, gapDeg) {
  const cx = size / 2;
  const cy = size / 2;
  const px = x - cx;
  const py = y - cy;
  const r = Math.hypot(px, py);
  const half = thickness / 2;

  const onRing = Math.abs(r - ringR) <= half;
  const capHalf = (180 - gapDeg / 2) * (Math.PI / 180);

  if (onRing) {
    const angle = Math.atan2(py, px); // 0 = rechts
    if (Math.abs(angle) > gapDeg / 2 * (Math.PI / 180)) return true;
  }

  // Runde Enden am Anfang und am Ende des Bogens.
  for (const sign of [1, -1]) {
    const a = sign * capHalf;
    const ex = cx + ringR * Math.cos(a);
    const ey = cy + ringR * Math.sin(a);
    if (Math.hypot(x - ex, y - ey) <= half) return true;
  }
  return false;
}

/* ------------------------------- Rasterung -------------------------------- */

function render(size, { rounded, inset }) {
  const radius = size * 0.225;
  const ringR = size * inset * 0.5 * 0.72;
  const thickness = size * inset * 0.5 * 0.30;
  const pixels = Buffer.alloc(size * size * 4);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let bg = 0;
      let mark = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const px = x + (sx + 0.5) / SS;
          const py = y + (sy + 0.5) / SS;
          const inBg = rounded ? insideRoundedRect(px, py, size, radius) : true;
          if (!inBg) continue;
          bg += 1;
          if (insideC(px, py, size, ringR, thickness, 74)) mark += 1;
        }
      }
      const total = SS * SS;
      const alpha = bg / total;
      const markRatio = mark / total;
      const offset = (y * size + x) * 4;

      if (alpha === 0) {
        pixels.writeUInt32BE(0, offset);
        continue;
      }
      // Marke ueber den Hintergrund legen (beide bereits deckungsgewichtet).
      const t = alpha > 0 ? Math.min(1, markRatio / alpha) : 0;
      for (let c = 0; c < 3; c++) {
        pixels[offset + c] = Math.round(TERRACOTTA[c] * (1 - t) + CREAM[c] * t);
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
  header[10] = 0;
  header[11] = 0;
  header[12] = 0;

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
  { file: 'icon-192.png', size: 192, rounded: true, inset: 0.62 },
  { file: 'icon-512.png', size: 512, rounded: true, inset: 0.62 },
  { file: 'icon-maskable-512.png', size: 512, rounded: false, inset: 0.46 },
  { file: 'apple-touch-icon.png', size: 180, rounded: false, inset: 0.62 },
  { file: 'favicon-32.png', size: 32, rounded: true, inset: 0.7 },
];

for (const target of targets) {
  const pixels = render(target.size, { rounded: target.rounded, inset: target.inset });
  writeFileSync(join(OUT_DIR, target.file), encodePng(target.size, pixels));
  console.log(`geschrieben: icons/${target.file}`);
}
