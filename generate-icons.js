/**
 * Generuje ikony PWA jako SVG → PNG przez Jimp (pure JS)
 * Bez zewnętrznych zależności – używa tylko PNG encoding ręcznie
 *
 * Generuje SVG-based PNG z minimalnym kodem PNG
 */
const fs   = require('fs');
const path = require('path');
const zlib = require('zlib');

/**
 * Minimal pure-JS PNG encoder.
 * Generates an RGBA PNG from a pixel buffer.
 */
function encodePNG(width, height, rgbaBuffer) {
  const crc32 = (() => {
    const table = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let j = 0; j < 8; j++) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[i] = c;
    }
    return (buf) => {
      let crc = 0xffffffff;
      for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
      return (crc ^ 0xffffffff) >>> 0;
    };
  })();

  function u32be(n) {
    return Buffer.from([(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff]);
  }

  function chunk(type, data) {
    const typeBytes = Buffer.from(type, 'ascii');
    const lenBuf    = u32be(data.length);
    const crcInput  = Buffer.concat([typeBytes, data]);
    const crcBuf    = u32be(crc32(crcInput));
    return Buffer.concat([lenBuf, typeBytes, data, crcBuf]);
  }

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width,  0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8]  = 8;  // bit depth
  ihdr[9]  = 2;  // color type: RGB (3 bytes per pixel, no alpha needed)
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  // Raw scanlines (filter byte 0 per row)
  const rawRows = [];
  for (let y = 0; y < height; y++) {
    const row = Buffer.alloc(1 + width * 3);
    row[0] = 0; // filter none
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      row[1 + x * 3]     = rgbaBuffer[i];
      row[1 + x * 3 + 1] = rgbaBuffer[i + 1];
      row[1 + x * 3 + 2] = rgbaBuffer[i + 2];
    }
    rawRows.push(row);
  }
  const rawData   = Buffer.concat(rawRows);
  const compressed = zlib.deflateSync(rawData, { level: 6 });

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), // PNG signature
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/**
 * Draw rounded-rect icon: dark bg + "R" letter + red accent bar
 */
function drawIcon(size) {
  const buf = Buffer.alloc(size * size * 4, 0);

  // Helper: set pixel
  const setPixel = (x, y, r, g, b, a = 255) => {
    if (x < 0 || x >= size || y < 0 || y >= size) return;
    const i = (y * size + x) * 4;
    // Alpha-composite over current
    const sa = a / 255;
    const da = buf[i + 3] / 255;
    const oa = sa + da * (1 - sa);
    if (oa === 0) return;
    buf[i]     = Math.round((r * sa + buf[i]     * da * (1 - sa)) / oa);
    buf[i + 1] = Math.round((g * sa + buf[i + 1] * da * (1 - sa)) / oa);
    buf[i + 2] = Math.round((b * sa + buf[i + 2] * da * (1 - sa)) / oa);
    buf[i + 3] = Math.round(oa * 255);
  };

  // Fill rounded rect (background)
  const radius = Math.round(size * 0.18);
  const bgR = 0x0d, bgG = 0x11, bgB = 0x17;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // Distance from nearest corner center
      const cx = x < radius ? radius : (x > size - 1 - radius ? size - 1 - radius : x);
      const cy = y < radius ? radius : (y > size - 1 - radius ? size - 1 - radius : y);
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
      if (dist <= radius) {
        setPixel(x, y, bgR, bgG, bgB);
      }
    }
  }

  // Draw letter "R" using a bitmap font approach
  // Scale a reference "R" glyph to the icon size
  const acR = 0xe9, acG = 0x45, acB = 0x60; // #e94560

  // We'll draw "R" using filled rectangles (simplified pixel font)
  const u = Math.round(size / 16); // unit size
  const ox = Math.round(size * 0.28); // x offset
  const oy = Math.round(size * 0.16); // y offset
  const w  = Math.round(size * 0.44); // letter width
  const h  = Math.round(size * 0.54); // letter height

  function fillRect(x, y, rw, rh) {
    for (let py = y; py < y + rh; py++)
      for (let px = x; px < x + rw; px++)
        setPixel(px, py, acR, acG, acB);
  }

  const stroke = Math.max(2, u);

  // Vertical bar
  fillRect(ox, oy, stroke, h);

  // Top horizontal bar
  fillRect(ox, oy, w, stroke);

  // Middle horizontal bar
  const midY = oy + Math.round(h * 0.46);
  fillRect(ox, midY, Math.round(w * 0.75), stroke);

  // Top curve right vertical
  fillRect(ox + w - stroke, oy, stroke, midY - oy + stroke);

  // Diagonal leg (R bottom right)
  const legLen = h - (midY - oy) - stroke;
  for (let i = 0; i < legLen; i++) {
    const legX = ox + stroke + Math.round(i * (w - stroke * 2) / legLen);
    const legY = midY + stroke + i;
    fillRect(legX, legY, stroke, stroke);
  }

  // Accent bar at bottom
  const barY = Math.round(size * 0.77);
  const barH = Math.max(3, Math.round(size * 0.055));
  const barW = Math.round(size * 0.5);
  const barX = Math.round((size - barW) / 2);
  const barR = Math.round(barH / 2);

  for (let y = barY; y < barY + barH; y++) {
    for (let x = barX; x < barX + barW; x++) {
      const dx = Math.min(x - barX, barX + barW - 1 - x);
      const dy = Math.min(y - barY, barY + barH - 1 - y);
      if (dx >= barR || dy >= barR || Math.sqrt((dx - barR) ** 2 + (dy - barR) ** 2) <= barR) {
        setPixel(x, y, acR, acG, acB);
      }
    }
  }

  return buf;
}

const iconsDir = path.join(__dirname, 'icons');
if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir);

[192, 512].forEach(size => {
  const pixels = drawIcon(size);
  const png    = encodePNG(size, size, pixels);
  fs.writeFileSync(path.join(iconsDir, `icon-${size}.png`), png);
  console.log(`✅ icons/icon-${size}.png (${png.length} bytes)`);
});
