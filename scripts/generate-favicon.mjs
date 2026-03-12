import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '..', 'public');

const svg = readFileSync(join(publicDir, 'favicon.svg'));

// Generate 32x32 PNG favicon
await sharp(svg)
  .resize(32, 32)
  .png()
  .toFile(join(publicDir, 'favicon-32x32.png'));

// Generate 180x180 Apple Touch Icon
await sharp(svg)
  .resize(180, 180)
  .png()
  .toFile(join(publicDir, 'apple-touch-icon.png'));

console.log('Favicons generated successfully');
