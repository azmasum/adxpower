// Generate a minimal ICO file for AdxPower
const fs = require('fs');
const path = require('path');

// Minimal ICO: 16x16 + 32x32 + 48x48 + 256x256
// We'll create a simple colored ICO from raw RGBA data

function createRGBAData(size, r, g, b) {
  const data = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      // Simple circle with gradient
      const cx = size / 2, cy = size / 2;
      const dist = Math.sqrt((x - cx) * (x - cx) + (y - cy) * (y - cy));
      const radius = size * 0.42;
      
      if (dist < radius) {
        // Inside circle - gradient from indigo to cyan
        const t = dist / radius;
        data[idx]     = Math.round(99 + (6 - 99) * t);   // R
        data[idx + 1] = Math.round(102 + (182 - 102) * t); // G
        data[idx + 2] = Math.round(241 + (212 - 241) * t); // B
        data[idx + 3] = 255;
        
        // Lightning bolt area (center)
        if (size >= 16) {
          const nx = (x - cx) / radius;
          const ny = (y - cy) / radius;
          // Simple diamond lightning shape
          if (Math.abs(nx * 0.3 - ny * 0.1) < 0.15 && ny < 0.3 && ny > -0.5) {
            data[idx] = 255; data[idx+1] = 255; data[idx+2] = 255; data[idx+3] = 255;
          }
        }
      } else {
        data[idx + 3] = 0; // transparent
      }
    }
  }
  return data;
}

function createPNG(size) {
  // Create raw RGBA, then wrap in PNG
  const rgba = createRGBAData(size);
  
  // Simple uncompressed PNG
  const width = size;
  const height = size;
  
  // PNG signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  
  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace
  
  // IDAT chunk - raw image data with zlib
  // Each row: filter byte (0) + RGBA data
  const rawRow = width * 4;
  const rawData = Buffer.alloc(height * (1 + rawRow));
  for (let y = 0; y < height; y++) {
    rawData[y * (1 + rawRow)] = 0; // no filter
    rgba.copy(rawData, y * (1 + rawRow) + 1, y * rawRow, (y + 1) * rawRow);
  }
  
  // Use zlib to compress
  const zlib = require('zlib');
  const compressed = zlib.deflateSync(rawData);
  
  // Build chunks
  function makeChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuffer = Buffer.from(type);
    const crcData = Buffer.concat([typeBuffer, data]);
    
    // CRC32
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < crcData.length; i++) {
      crc ^= crcData[i];
      for (let j = 0; j < 8; j++) {
        crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0);
      }
    }
    crc ^= 0xFFFFFFFF;
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crc >>> 0, 0);
    
    return Buffer.concat([len, typeBuffer, data, crcBuf]);
  }
  
  const ihdrChunk = makeChunk('IHDR', ihdr);
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));
  
  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createICO() {
  const sizes = [16, 32, 48, 256];
  const pngBuffers = sizes.map(s => createPNG(s));
  
  // ICO header
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);     // reserved
  header.writeUInt16LE(1, 2);     // type: ICO
  header.writeUInt16LE(sizes.length, 4); // count
  
  // Directory entries (16 bytes each)
  const dirSize = sizes.length * 16;
  let dataOffset = 6 + dirSize;
  
  const entries = [];
  for (let i = 0; i < sizes.length; i++) {
    const entry = Buffer.alloc(16);
    entry[0] = sizes[i] >= 256 ? 0 : sizes[i]; // width
    entry[1] = sizes[i] >= 256 ? 0 : sizes[i]; // height
    entry[2] = 0;  // color palette
    entry[3] = 0;  // reserved
    entry.writeUInt16LE(1, 4);   // color planes
    entry.writeUInt16LE(32, 6);  // bits per pixel
    entry.writeUInt32LE(pngBuffers[i].length, 8);  // image data size
    entry.writeUInt32LE(dataOffset, 12); // data offset
    entries.push(entry);
    dataOffset += pngBuffers[i].length;
  }
  
  return Buffer.concat([header, ...entries, ...pngBuffers]);
}

const ico = createICO();
const outPath = path.join(__dirname, '..', 'client', 'public', 'adxpower-logo.ico');
fs.writeFileSync(outPath, ico);
console.log(`ICO created: ${outPath} (${ico.length} bytes)`);
