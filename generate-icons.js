import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const svgPath = path.resolve('public/icon.svg');
const svgBuffer = fs.readFileSync(svgPath);

async function generate() {
  await sharp(svgBuffer).resize(192, 192).toFile('public/pwa-192x192.png');
  await sharp(svgBuffer).resize(512, 512).toFile('public/pwa-512x512.png');
  // Maskable icon with 10% padding
  await sharp(svgBuffer)
    .resize(410, 410)
    .extend({
      top: 51,
      bottom: 51,
      left: 51,
      right: 51,
      background: '#101827'
    })
    .toFile('public/pwa-maskable-512x512.png');
  await sharp(svgBuffer).resize(180, 180).toFile('public/apple-touch-icon.png');
  await sharp(svgBuffer).resize(48, 48).toFile('public/favicon.ico');
  console.log('Icons generated successfully.');
}

generate().catch(err => {
  console.error(err);
  process.exit(1);
});
