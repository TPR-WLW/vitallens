import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outputPath = join(__dirname, '..', 'public', 'og-image.png');

// MiruCare OG Image - 1200x630 for LinkedIn/Twitter
const svg = `
<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0a1628;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#1a2d4a;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#4f8cff;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#6ba3ff;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="pulse" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#4f8cff;stop-opacity:0" />
      <stop offset="15%" style="stop-color:#4f8cff;stop-opacity:0.6" />
      <stop offset="50%" style="stop-color:#6ba3ff;stop-opacity:1" />
      <stop offset="85%" style="stop-color:#4f8cff;stop-opacity:0.6" />
      <stop offset="100%" style="stop-color:#4f8cff;stop-opacity:0" />
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="1200" height="630" fill="url(#bg)" />

  <!-- Subtle grid pattern -->
  <g opacity="0.04" stroke="#4f8cff" stroke-width="1">
    ${Array.from({length: 20}, (_, i) => `<line x1="${i * 60}" y1="0" x2="${i * 60}" y2="630" />`).join('')}
    ${Array.from({length: 11}, (_, i) => `<line x1="0" y1="${i * 60}" x2="1200" y2="${i * 60}" />`).join('')}
  </g>

  <!-- Decorative circles (data visualization feel) -->
  <circle cx="950" cy="200" r="120" fill="none" stroke="#4f8cff" stroke-width="1.5" opacity="0.12" />
  <circle cx="950" cy="200" r="80" fill="none" stroke="#4f8cff" stroke-width="1" opacity="0.08" />
  <circle cx="950" cy="200" r="160" fill="none" stroke="#4f8cff" stroke-width="1" opacity="0.06" />
  <circle cx="1050" cy="400" r="60" fill="none" stroke="#6ba3ff" stroke-width="1" opacity="0.08" />

  <!-- Heartbeat / pulse wave line -->
  <polyline
    points="0,400 100,400 150,400 180,400 200,380 220,420 240,340 260,460 280,370 300,430 320,400 380,400 420,400 450,400 470,380 490,420 510,340 530,460 550,370 570,430 590,400 650,400 700,400 1200,400"
    fill="none"
    stroke="url(#pulse)"
    stroke-width="2.5"
    opacity="0.25"
  />

  <!-- Logo circle -->
  <circle cx="100" cy="120" r="36" fill="none" stroke="#4f8cff" stroke-width="3" />
  <path d="M100 104c-5.5 0-11 4.8-11 12.3s5.5 15 11 20.5c5.5-5.5 11-13 11-20.5s-5.5-12.3-11-12.3z" fill="#4f8cff" opacity="0.85" />

  <!-- Brand name -->
  <text x="155" y="130" font-family="'Helvetica Neue', Arial, sans-serif" font-size="32" font-weight="600" fill="#ffffff" letter-spacing="1">MiruCare</text>

  <!-- Main title (Japanese) -->
  <text x="100" y="260" font-family="'Hiragino Sans', 'Noto Sans JP', 'Yu Gothic', sans-serif" font-size="52" font-weight="700" fill="#ffffff">カメラだけで、</text>
  <text x="100" y="330" font-family="'Hiragino Sans', 'Noto Sans JP', 'Yu Gothic', sans-serif" font-size="52" font-weight="700" fill="#ffffff">従業員の健康を見守る</text>

  <!-- Subtitle -->
  <text x="100" y="395" font-family="'Hiragino Sans', 'Noto Sans JP', 'Yu Gothic', sans-serif" font-size="24" fill="#8ba4c7" letter-spacing="0.5">非接触バイタルモニタリング × ストレスチェック制度対応</text>

  <!-- Bottom accent line -->
  <rect x="100" y="440" width="80" height="4" rx="2" fill="url(#accent)" />

  <!-- Feature badges -->
  <g transform="translate(100, 480)">
    <rect x="0" y="0" width="200" height="40" rx="20" fill="#4f8cff" opacity="0.15" />
    <text x="100" y="26" font-family="'Hiragino Sans', 'Noto Sans JP', sans-serif" font-size="16" fill="#4f8cff" text-anchor="middle">ウェアラブル不要</text>
  </g>
  <g transform="translate(320, 480)">
    <rect x="0" y="0" width="220" height="40" rx="20" fill="#4f8cff" opacity="0.15" />
    <text x="110" y="26" font-family="'Hiragino Sans', 'Noto Sans JP', sans-serif" font-size="16" fill="#4f8cff" text-anchor="middle">プライバシー完全保護</text>
  </g>
  <g transform="translate(560, 480)">
    <rect x="0" y="0" width="160" height="40" rx="20" fill="#4f8cff" opacity="0.15" />
    <text x="80" y="26" font-family="'Hiragino Sans', 'Noto Sans JP', sans-serif" font-size="16" fill="#4f8cff" text-anchor="middle">HRV + 感情分析</text>
  </g>

  <!-- Bottom bar -->
  <rect x="0" y="610" width="1200" height="20" fill="#4f8cff" opacity="0.6" />
</svg>`;

try {
  await sharp(Buffer.from(svg))
    .png({ quality: 95 })
    .toFile(outputPath);
  console.log(`OG image generated: ${outputPath}`);
  console.log(`File size: ${(await import('fs')).statSync(outputPath).size} bytes`);
} catch (err) {
  console.error('Failed to generate OG image:', err.message);
  process.exit(1);
}
