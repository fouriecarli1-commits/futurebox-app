/**
 * The FutureBox Kids icons, drawn once and kept as PNGs in `public/`.
 *
 *   npx tsx scripts/kids-icons.mts
 *
 * The owner, 19 October 2026: *"Gaan aan met futurebox kids"* — the kids'
 * studio as an app of its own on a child's phone or tablet. Its icon must not
 * be mistaken for the grown-up app's green chip on the same screen, so it is
 * the same chip, drawn playful: a sunny gradient, a white chip, a music note.
 *
 * Not run by CI. Drawn with `sharp`, which Next brings with it; the SVG is the
 * source and the PNGs are what the manifest names.
 */
import sharp from 'sharp';
import { writeFileSync } from 'node:fs';

const svg = (inset: number): string => `
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="sun" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#fde047"/>
      <stop offset="0.5" stop-color="#fb923c"/>
      <stop offset="1" stop-color="#ec4899"/>
    </linearGradient>
  </defs>
  ${inset > 0
    ? '<rect width="512" height="512" fill="url(#sun)"/>'
    : '<rect x="24" y="24" width="464" height="464" rx="112" fill="url(#sun)"/>'}
  <g transform="translate(256 256) scale(${inset > 0 ? 0.78 : 1}) translate(-256 -256)">
    <rect x="136" y="136" width="240" height="240" rx="44" fill="none" stroke="#ffffff" stroke-width="26"/>
    ${[176, 256, 336].map((x) => `<line x1="${x}" y1="96" x2="${x}" y2="136" stroke="#ffffff" stroke-width="22" stroke-linecap="round"/><line x1="${x}" y1="376" x2="${x}" y2="416" stroke="#ffffff" stroke-width="22" stroke-linecap="round"/>`).join('')}
    ${[176, 256, 336].map((y) => `<line x1="96" y1="${y}" x2="136" y2="${y}" stroke="#ffffff" stroke-width="22" stroke-linecap="round"/><line x1="376" y1="${y}" x2="416" y2="${y}" stroke="#ffffff" stroke-width="22" stroke-linecap="round"/>`).join('')}
    <path d="M226 318 V210 L304 192 V296" fill="none" stroke="#ffffff" stroke-width="20" stroke-linecap="round" stroke-linejoin="round"/>
    <ellipse cx="208" cy="320" rx="26" ry="20" fill="#ffffff"/>
    <ellipse cx="286" cy="298" rx="26" ry="20" fill="#ffffff"/>
  </g>
</svg>`;

writeFileSync('public/kids-icon.svg', svg(0).trim());
await sharp(Buffer.from(svg(0))).resize(512, 512).png().toFile('public/kids-icon-512.png');
await sharp(Buffer.from(svg(0))).resize(192, 192).png().toFile('public/kids-icon-192.png');
await sharp(Buffer.from(svg(1))).resize(512, 512).png().toFile('public/kids-icon-512-maskable.png');
await sharp(Buffer.from(svg(0))).resize(180, 180).flatten({ background: '#fb923c' }).png().toFile('public/kids-apple-icon.png');
console.log('kids icons written to public/');
