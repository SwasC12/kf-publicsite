// Regenerate favicons + app icons + header logo from brand/logo-mark.png (the crow mark).
// One-off tool — generated files in public/ are committed. To run:
//   npm i -D sharp png-to-ico
//   node brand/gen-icons.mjs
//   npm remove sharp png-to-ico
import sharp from 'sharp';
import pngToIco from 'png-to-ico';
import fs from 'fs';

const SRC = 'brand/logo-mark.png';
const OUT = 'public';

// Trimmed, transparent-background mark for use on the site (header/hero).
async function trimmedMark(file, size) {
  const buf = await sharp(SRC)
    .trim()
    .resize({ width: size, height: size, fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  fs.writeFileSync(`${OUT}/${file}`, buf);
  console.log('wrote', file);
}

// Square icon: trimmed mark centred on white with padding (home-screen / favicon).
async function icon(size, pad, file) {
  const inner = Math.round(size * (1 - 2 * pad));
  const mark = await sharp(SRC)
    .trim()
    .resize({ width: inner, height: inner, fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .png()
    .toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background: '#ffffff' } })
    .composite([{ input: mark, gravity: 'center' }])
    .png()
    .toFile(`${OUT}/${file}`);
  console.log('wrote', file, `${size}px`);
}

await trimmedMark('logo-mark.png', 512);
await icon(512, 0.12, 'icon-512.png');
await icon(192, 0.12, 'icon-192.png');
await icon(180, 0.1, 'apple-touch-icon.png');
await icon(48, 0.06, 'favicon-48.png');
await icon(32, 0.06, 'favicon-32.png');
await icon(16, 0.04, 'favicon-16.png');

const ico = await pngToIco([`${OUT}/favicon-16.png`, `${OUT}/favicon-32.png`, `${OUT}/favicon-48.png`]);
fs.writeFileSync(`${OUT}/favicon.ico`, ico);
console.log('wrote favicon.ico');
