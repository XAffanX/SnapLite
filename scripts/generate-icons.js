import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

const iconsDir = path.resolve('./src-tauri/icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Generate an uncompressed PNG buffer using basic PNG signature and chunks
function createSimplePng(size) {
  const width = size;
  const height = size;

  // Raw RGBA pixels
  const rowBytes = width * 4;
  const rawData = Buffer.alloc((rowBytes + 1) * height);

  // Background color #0078D4 (Windows Blue), with camera symbol
  const rBg = 0x00, gBg = 0x78, bBg = 0xD4;
  const rFg = 0xFF, gFg = 0xFF, bFg = 0xFF;

  const center = size / 2;
  const radius = size * 0.45;
  const innerRadius = size * 0.22;

  for (let y = 0; y < height; y++) {
    rawData[y * (rowBytes + 1)] = 0; // Filter type 0: None
    for (let x = 0; x < width; x++) {
      const offset = y * (rowBytes + 1) + 1 + x * 4;
      const dx = x - center;
      const dy = y - center;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Rounded container
      const rx = Math.abs(dx);
      const ry = Math.abs(dy);
      const cornerR = size * 0.2;
      const inBox = rx < center - cornerR || ry < center - cornerR || 
        Math.hypot(rx - (center - cornerR), ry - (center - cornerR)) <= cornerR;

      if (inBox) {
        // Draw camera aperture / lens
        if (Math.abs(dist - innerRadius) < size * 0.04 || dist < size * 0.1) {
          rawData[offset] = rFg;
          rawData[offset + 1] = gFg;
          rawData[offset + 2] = bFg;
          rawData[offset + 3] = 255;
        } else if (dist < innerRadius) {
          rawData[offset] = 0x00;
          rawData[offset + 1] = 0x5A;
          rawData[offset + 2] = 0x9E;
          rawData[offset + 3] = 255;
        } else {
          rawData[offset] = rBg;
          rawData[offset + 1] = gBg;
          rawData[offset + 2] = bBg;
          rawData[offset + 3] = 255;
        }
      } else {
        // Transparent outside
        rawData[offset] = 0;
        rawData[offset + 1] = 0;
        rawData[offset + 2] = 0;
        rawData[offset + 3] = 0;
      }
    }
  }

  // Compress IDAT
  const compressed = zlib.deflateSync(rawData);

  // Build PNG chunks
  function crc32(buf) {
    let crc = 0 ^ -1;
    for (let i = 0; i < buf.length; i++) {
      crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
    }
    return (crc ^ -1) >>> 0;
  }
  const table = new Int32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }

  function makeChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const crcBuf = Buffer.alloc(4);
    const crc = crc32(Buffer.concat([typeBuf, data]));
    crcBuf.writeUInt32BE(crc, 0);
    return Buffer.concat([len, typeBuf, data, crcBuf]);
  }

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace
  const ihdrChunk = makeChunk('IHDR', ihdr);

  // IDAT
  const idatChunk = makeChunk('IDAT', compressed);

  // IEND
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// Generate all sizes
const sizes = [
  { name: '32x32.png', size: 32 },
  { name: '128x128.png', size: 128 },
  { name: '128x128@2x.png', size: 256 },
  { name: 'icon.png', size: 512 },
];

for (const { name, size } of sizes) {
  const buf = createSimplePng(size);
  fs.writeFileSync(path.join(iconsDir, name), buf);
  console.log(`Generated ${name} (${size}x${size})`);
}

// Generate simple .ico wrapping the 32x32 and 128x128 pngs
const png32 = fs.readFileSync(path.join(iconsDir, '32x32.png'));
const png128 = fs.readFileSync(path.join(iconsDir, '128x128.png'));

const icoHeader = Buffer.alloc(6);
icoHeader.writeUInt16LE(0, 0); // reserved
icoHeader.writeUInt16LE(1, 2); // 1 = ICO
icoHeader.writeUInt16LE(2, 4); // 2 images

const entry1 = Buffer.alloc(16);
entry1.writeUInt8(32, 0);
entry1.writeUInt8(32, 1);
entry1.writeUInt8(0, 2);
entry1.writeUInt8(0, 3);
entry1.writeUInt16LE(1, 4);
entry1.writeUInt16LE(32, 6);
entry1.writeUInt32LE(png32.length, 8);
entry1.writeUInt32LE(6 + 32, 12); // offset after 2 entries

const entry2 = Buffer.alloc(16);
entry2.writeUInt8(128, 0);
entry2.writeUInt8(128, 1);
entry2.writeUInt8(0, 2);
entry2.writeUInt8(0, 3);
entry2.writeUInt16LE(1, 4);
entry2.writeUInt16LE(32, 6);
entry2.writeUInt32LE(png128.length, 8);
entry2.writeUInt32LE(6 + 32 + png32.length, 12);

const icoFile = Buffer.concat([icoHeader, entry1, entry2, png32, png128]);
fs.writeFileSync(path.join(iconsDir, 'icon.ico'), icoFile);
fs.writeFileSync(path.join(iconsDir, 'icon.icns'), icoFile); // Fallback binary for macOS packaging
console.log('Generated icon.ico and icon.icns');
