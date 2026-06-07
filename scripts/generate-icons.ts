/**
 * Genera los íconos PNG para la PWA usando sólo Node.js built-ins.
 * Diseño: rayas verticales celeste/blanco (camiseta Argentina) + "P" pixel-art.
 * Uso: npm run generate-icons
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { deflateSync } from "node:zlib";

// ── Colores ────────────────────────────────────────────────────────
const CELESTE: readonly [number, number, number] = [0x74, 0xac, 0xdf];
const WHITE:   readonly [number, number, number] = [0xff, 0xff, 0xff];
const DARK:    readonly [number, number, number] = [0x07, 0x10, 0x1e];

// ── Glifo "P" pixel-art (5×7) ─────────────────────────────────────
const P: readonly number[][] = [
  [1, 1, 1, 1, 0],
  [1, 0, 0, 1, 0],
  [1, 0, 0, 1, 0],
  [1, 1, 1, 1, 0],
  [1, 0, 0, 0, 0],
  [1, 0, 0, 0, 0],
  [1, 0, 0, 0, 0],
];

// ── PNG encoder ────────────────────────────────────────────────────

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[i] = c;
  }
  return t;
})();

function crc32(data: Buffer): number {
  let crc = 0xffffffff;
  for (const b of data) crc = (CRC_TABLE[(crc ^ b) & 0xff] ?? 0) ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const len  = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const t    = Buffer.from(type, "ascii");
  const body = Buffer.concat([t, data]);
  const crc  = Buffer.alloc(4); crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

function encodePNG(pixels: Uint8Array, w: number, h: number): Buffer {
  const sig  = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 2; // 8-bit RGB

  // Scanlines with filter byte 0
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 3 + 1)] = 0;
    for (let x = 0; x < w; x++) {
      const si = y * (w * 3 + 1) + 1 + x * 3;
      const pi = (y * w + x) * 3;
      raw[si]     = pixels[pi]     ?? 0;
      raw[si + 1] = pixels[pi + 1] ?? 0;
      raw[si + 2] = pixels[pi + 2] ?? 0;
    }
  }

  return Buffer.concat([
    sig,
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", deflateSync(raw, { level: 9 })),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

// ── Icon painter ───────────────────────────────────────────────────

function paintIcon(size: number, maskable = false): Uint8Array {
  const pixels = new Uint8Array(size * size * 3);
  const pad    = maskable ? Math.round(size * 0.1) : 0;
  const inner  = size - pad * 2;
  const cx     = size / 2;
  const cy     = size / 2;

  // Circle radius = 30% of inner area
  const circleR   = inner * 0.30;
  const circleR2  = circleR * circleR;

  // P glyph dimensions
  const block     = Math.max(1, Math.round(inner / 22));
  const glyphW    = 5 * block;
  const glyphH    = 7 * block;
  const glyphX0   = Math.round(cx - glyphW / 2);
  const glyphY0   = Math.round(cy - glyphH / 2);

  // Stripe width: 8 pairs across the inner area
  const stripeW = Math.max(2, Math.round(inner / 8));

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let color: readonly [number, number, number];

      const inPad = x < pad || x >= size - pad || y < pad || y >= size - pad;

      if (inPad) {
        color = CELESTE; // maskable safe-zone padding
      } else {
        // Jersey stripes
        const ix = x - pad;
        color = Math.floor(ix / stripeW) % 2 === 0 ? CELESTE : WHITE;

        // Dark circle in center
        const dx = x - cx;
        const dy = y - cy;
        if (dx * dx + dy * dy <= circleR2) {
          color = DARK;

          // Pixel-art "P" glyph
          if (
            x >= glyphX0 && x < glyphX0 + glyphW &&
            y >= glyphY0 && y < glyphY0 + glyphH
          ) {
            const col = Math.floor((x - glyphX0) / block);
            const row = Math.floor((y - glyphY0) / block);
            const glyphRow = P[row];
            if (glyphRow && glyphRow[col] === 1) color = WHITE;
          }
        }
      }

      const idx = (y * size + x) * 3;
      pixels[idx]     = color[0];
      pixels[idx + 1] = color[1];
      pixels[idx + 2] = color[2];
    }
  }

  return pixels;
}

// ── Main ───────────────────────────────────────────────────────────

mkdirSync("public/icons", { recursive: true });

const icons: Array<{ file: string; size: number; maskable?: boolean }> = [
  { file: "public/icons/icon-192.png",          size: 192 },
  { file: "public/icons/icon-512.png",          size: 512 },
  { file: "public/icons/icon-maskable-512.png", size: 512, maskable: true },
  { file: "public/icons/apple-touch-icon.png",  size: 180 },
];

for (const { file, size, maskable } of icons) {
  const pixels = paintIcon(size, maskable);
  const png    = encodePNG(pixels, size, size);
  writeFileSync(file, png);
  console.log(`✓ ${file} (${size}×${size}${maskable ? " maskable" : ""})`);
}

console.log("\n✅ Íconos generados en public/icons/");
