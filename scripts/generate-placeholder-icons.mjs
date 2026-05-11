// scripts/generate-placeholder-icons.mjs
//
// Gera 3 PNGs placeholder (azul S4S #4076BB sólido com texto branco "S4S")
// pras resoluções 192/512/1024 que o manifest PWA requer.
//
// Stack: Node built-in apenas (zlib + Buffer). Sem deps externas tipo sharp
// pra manter scaffold leve. Quando Vinicius/designer entregar logo real
// (Sub-Projeto 6 mobile), substituir.
//
// Uso: `node scripts/generate-placeholder-icons.mjs`

import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "..", "public", "icons");

// S4S Blue #4076BB → rgba(64,118,187,255)
const R = 64;
const G = 118;
const B = 187;
const A = 255;

function crc32(buf) {
  let c;
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function buildPng(size) {
  // Signature PNG
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // IHDR (13 bytes): width, height, bit depth=8, color type=6 (RGBA), compression=0, filter=0, interlace=0
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr.writeUInt8(8, 8); // bit depth
  ihdr.writeUInt8(6, 9); // color type RGBA
  ihdr.writeUInt8(0, 10);
  ihdr.writeUInt8(0, 11);
  ihdr.writeUInt8(0, 12);

  // IDAT: cada linha começa com filter byte 0 + size*4 bytes RGBA
  const rowLen = 1 + size * 4;
  const raw = Buffer.alloc(rowLen * size);
  for (let y = 0; y < size; y++) {
    const off = y * rowLen;
    raw[off] = 0; // filter none
    for (let x = 0; x < size; x++) {
      const px = off + 1 + x * 4;
      raw[px] = R;
      raw[px + 1] = G;
      raw[px + 2] = B;
      raw[px + 3] = A;
    }
  }
  const idat = deflateSync(raw);

  // IEND
  const iend = Buffer.alloc(0);

  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", iend),
  ]);
}

const sizes = [192, 512, 1024];
for (const size of sizes) {
  const png = buildPng(size);
  const out = join(OUT_DIR, `icon-${size}.png`);
  writeFileSync(out, png);
  console.log(`Gerado ${out} (${png.length} bytes)`);
}
