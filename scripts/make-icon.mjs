// Draws the Delayed Reaction mark (two offset bars: the same moment on two timelines) as a
// PNG, with no dependencies. Used for the Vega app icon.
//
//   node scripts/make-icon.mjs <size> <out.png>
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const size = Number(process.argv[2] ?? 512);
const out = process.argv[3] ?? 'icon.png';
const px = new Uint8Array(size * size * 4);

const INK = [10, 12, 11, 255];
const CHALK = [242, 240, 232, 255];
const AMBER = [255, 181, 71, 255];

/** Rounded rectangle with 4x supersampled edges. */
function roundRect(x, y, w, h, r, color) {
  for (let py = Math.floor(y); py < Math.ceil(y + h); py++) {
    for (let px_ = Math.floor(x); px_ < Math.ceil(x + w); px_++) {
      let hits = 0;
      for (let sy = 0; sy < 4; sy++)
        for (let sx = 0; sx < 4; sx++) {
          const cx = px_ + (sx + 0.5) / 4;
          const cy = py + (sy + 0.5) / 4;
          const dx = Math.max(x + r - cx, 0, cx - (x + w - r));
          const dy = Math.max(y + r - cy, 0, cy - (y + h - r));
          if (cx >= x && cx <= x + w && cy >= y && cy <= y + h && dx * dx + dy * dy <= r * r) hits++;
        }
      if (!hits || px_ < 0 || py < 0 || px_ >= size || py >= size) continue;
      const a = (hits / 16) * (color[3] / 255);
      const i = (py * size + px_) * 4;
      for (let c = 0; c < 3; c++) px[i + c] = Math.round(color[c] * a + px[i + c] * (1 - a));
      px[i + 3] = Math.max(px[i + 3], Math.round(255 * a));
    }
  }
}

const s = size / 512;
roundRect(0, 0, size, size, 96 * s, INK);
roundRect(88 * s, 150 * s, 250 * s, 80 * s, 18 * s, CHALK);
roundRect(174 * s, 282 * s, 250 * s, 80 * s, 18 * s, AMBER);

// PNG encoding
const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
};
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(size, 0);
ihdr.writeUInt32BE(size, 4);
ihdr.set([8, 6, 0, 0, 0], 8);
const raw = Buffer.alloc(size * (size * 4 + 1));
for (let y = 0; y < size; y++) {
  raw[y * (size * 4 + 1)] = 0;
  Buffer.from(px.buffer, y * size * 4, size * 4).copy(raw, y * (size * 4 + 1) + 1);
}
writeFileSync(
  out,
  Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]),
);
console.log(`Wrote ${out} (${size}x${size})`);
