/**
 * The FutureBox app icon, cut from her picture.
 *
 * The owner, 13 October 2026, with her home screen: *"Ek sal wil hê dit moet
 * neon wees sodat dit tussen ander apps uitstaan."* That was drawn here in
 * the browser, a lit green tile with a black chip. On 19 October 2026 she sent
 * the icon itself — the chip in metal on a glowing green board — with
 * *"gebruik net die nuwe app icon, verander sommer die icon op die foon
 * ook."* So the files are now cut from her picture, kept as she sent it in
 * `art/brand/app-icon.png`, and nothing is drawn.
 *
 *     node scripts/icon.mjs
 *
 * The files carry "chip" in their names since that day, for the reason the
 * neon ones carried "neon": a browser and a launcher cache an icon by its
 * address, and the same address with a new picture behind it kept showing
 * the old one on her phone. A new name is a new picture everywhere at once.
 *
 * Five files:
 *   public/icon-chip-512.png       the icon as she drew it, on its black ("any")
 *   public/icon-chip-512-maskable.png  the same, smaller on black, so a
 *                                  launcher's circle or squircle keeps the
 *                                  whole board ("maskable")
 *   public/icon-chip-192.png       the small one
 *   app/apple-icon.png             cut in to the board: iOS rounds it itself
 *   app/icon.png                   the favicon, cut in the same way
 */
import sharp from 'sharp';

const SOURCE = 'art/brand/app-icon.png';
/* The board and a little of its glow, out of the 512 × 512 picture. */
const BOARD = { left: 52, top: 50, width: 408, height: 408 };
const PNG = { compressionLevel: 9 };

await sharp(SOURCE).resize(512, 512).png(PNG).toFile('public/icon-chip-512.png');
await sharp(SOURCE).resize(192, 192).png(PNG).toFile('public/icon-chip-192.png');
/* Four-fifths of the square is the safe zone a launcher keeps; the board
   at 84% of the width, centred, keeps all of it but the outer glow. */
await sharp(SOURCE)
  .resize(430, 430)
  .extend({ top: 41, bottom: 41, left: 41, right: 41, background: '#000000' })
  .png(PNG)
  .toFile('public/icon-chip-512-maskable.png');
await sharp(SOURCE).extract(BOARD).resize(180, 180).png(PNG).toFile('app/apple-icon.png');
await sharp(SOURCE).extract(BOARD).resize(32, 32).png(PNG).toFile('app/icon.png');
console.log('app icons written');
