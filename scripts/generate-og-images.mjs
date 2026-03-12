// Generate per-guide OGP images (1200x630 PNG)
import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import { writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';

// Register Japanese font (Hiragino Kaku Gothic)
GlobalFonts.registerFromPath('/System/Library/Fonts/ヒラギノ角ゴシック W6.ttc', 'HiraginoBold');
GlobalFonts.registerFromPath('/System/Library/Fonts/ヒラギノ角ゴシック W3.ttc', 'HiraginoRegular');

const guides = [
  { slug: 'stress-check-2028', title: 'ストレスチェック\n義務化 2028', subtitle: '50人未満企業の完全対応ガイド' },
  { slug: 'stress-check-tools', title: 'ストレスチェック\nツール比較', subtitle: '選び方と導入のポイント' },
  { slug: 'stress-check-howto', title: 'ストレスチェック\n実施手順ガイド', subtitle: '準備から報告まで完全網羅' },
  { slug: 'stress-check-analysis', title: 'ストレスチェック\n集団分析', subtitle: '職場環境改善への活用法' },
  { slug: 'health-management-certification', title: '健康経営優良法人\n認定ガイド', subtitle: '取得要件と申請のポイント' },
  { slug: 'rppg-stress-monitoring', title: 'rPPG技術で\nストレスモニタリング', subtitle: '非接触バイタル計測の仕組み' },
  { slug: 'rppg-accuracy', title: 'rPPG精度検証', subtitle: '信頼性とエビデンス' },
  { slug: 'employee-mental-health', title: '従業員\nメンタルヘルス対策', subtitle: '企業が取るべき具体的施策' },
  { slug: 'stress-measurement-methods', title: 'ストレス測定方法\n徹底比較', subtitle: '質問票・ウェアラブル・非接触' },
];

const W = 1200;
const H = 630;

for (const guide of guides) {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  // Background gradient (dark blue, matching brand)
  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, '#0a1628');
  grad.addColorStop(1, '#1a3a6b');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Decorative circle (top-right)
  ctx.strokeStyle = 'rgba(79, 140, 255, 0.15)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(1050, 120, 180, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(1050, 120, 120, 0, Math.PI * 2);
  ctx.stroke();

  // Decorative heartbeat line
  ctx.strokeStyle = 'rgba(79, 140, 255, 0.12)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 400);
  ctx.lineTo(200, 400);
  ctx.lineTo(240, 340);
  ctx.lineTo(280, 460);
  ctx.lineTo(320, 380);
  ctx.lineTo(360, 400);
  ctx.lineTo(W, 400);
  ctx.stroke();

  // Brand badge
  ctx.fillStyle = '#4f8cff';
  ctx.beginPath();
  ctx.arc(80, 60, 18, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = '600 22px HiraginoBold, sans-serif';
  ctx.fillText('MiruCare', 110, 68);

  // Accent line
  ctx.fillStyle = '#4f8cff';
  ctx.fillRect(60, 140, 80, 4);

  // Title
  ctx.fillStyle = '#ffffff';
  ctx.font = '700 52px HiraginoBold, sans-serif';
  const titleLines = guide.title.split('\n');
  let y = 200;
  for (const line of titleLines) {
    ctx.fillText(line, 60, y);
    y += 68;
  }

  // Subtitle
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.font = '400 28px HiraginoRegular, sans-serif';
  ctx.fillText(guide.subtitle, 60, y + 20);

  // Bottom bar
  ctx.fillStyle = 'rgba(79, 140, 255, 0.2)';
  ctx.fillRect(0, H - 60, W, 60);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.font = '400 18px sans-serif';
  ctx.fillText('tpr-wlw.github.io/vitallens/guides/' + guide.slug, 60, H - 25);

  // Write file
  const outDir = join('public', 'guides', guide.slug);
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, 'og-image.png');
  writeFileSync(outPath, canvas.toBuffer('image/png'));
  console.log(`Generated: ${outPath}`);
}

console.log('Done — all guide OGP images generated.');
