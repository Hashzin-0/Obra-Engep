import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';

const svgPath = path.resolve('public/icon.svg');
const svgBuffer = fs.readFileSync(svgPath);

async function generate() {
  const outputs = [
    ['public/favicon.png', 48],
    ['public/pwa-192x192.png', 192],
    ['public/pwa-512x512.png', 512],
    ['public/apple-touch-icon.png', 180],
  ];

  await Promise.all(
    outputs.map(([file, size]) =>
      sharp(svgBuffer).resize(size, size, { fit: 'contain' }).png().toFile(file)
    )
  );

  // The SVG already contains the opaque brand background and keeps the mark
  // inside the maskable safe area.
  await sharp(svgBuffer)
    .resize(512, 512, { fit: 'contain' })
    .png()
    .toFile('public/pwa-maskable-512x512.png');

  console.log('Site and PWA icons generated from public/icon.svg.');
}

generate().catch((error) => {
  console.error('Failed to generate site/PWA icons:', error);
  process.exit(1);
});
