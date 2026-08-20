const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const svgPath = process.argv[2];
const outPath = process.argv[3];
const sizes = [16, 32, 48];

async function main() {
  const svgBuffer = fs.readFileSync(svgPath);

  const pngBuffers = await Promise.all(
    sizes.map((size) =>
      sharp(svgBuffer, { density: 384 })
        .resize(size, size, { fit: 'contain', background: '#ffffff' })
        .png()
        .toBuffer()
    )
  );

  const numImages = pngBuffers.length;
  const headerSize = 6;
  const dirEntrySize = 16;
  const dirSize = dirEntrySize * numImages;
  let offset = headerSize + dirSize;

  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(numImages, 4);

  const dirEntries = [];
  const imageDatas = [];

  sizes.forEach((size, i) => {
    const png = pngBuffers[i];
    const entry = Buffer.alloc(dirEntrySize);
    entry.writeUInt8(size >= 256 ? 0 : size, 0);
    entry.writeUInt8(size >= 256 ? 0 : size, 1);
    entry.writeUInt8(0, 2);
    entry.writeUInt8(0, 3);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(png.length, 8);
    entry.writeUInt32LE(offset, 12);
    dirEntries.push(entry);
    imageDatas.push(png);
    offset += png.length;
  });

  const ico = Buffer.concat([header, ...dirEntries, ...imageDatas]);
  fs.writeFileSync(outPath, ico);
  console.log(`Wrote ${outPath} (${ico.length} bytes, sizes: ${sizes.join(',')})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
