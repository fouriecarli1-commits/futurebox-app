/**
 * The FutureBox Kids icons and logo, cut from her pictures and kept in `public/`.
 *
 *   npx tsx scripts/kids-icons.mts
 *
 * The owner, 19 October 2026: *"hier is die app icon vir die kids, verander
 * dit asb. En hier is die logo vir die app self."* Both are hers, kept as she
 * sent them in `art/kids/`: the neon chip with the paintbrush is the icon, the
 * wide "FUTUREBOX KIDS" is the logo at the top of the kids' studio.
 *
 * The chip sits on black with room around it, so the plain icons are cut in
 * closer, and the maskable one — which a phone trims to a circle or a
 * squircle — is the whole picture, so the chip stays inside the middle.
 *
 * Not run by CI. Drawn with `sharp`, which Next brings with it.
 */
import sharp from 'sharp';

const ICON = 'art/kids/icon.jpg';
const LOGO = 'art/kids/logo.jpg';
/* The chip with a little of its glow, out of the 2000 × 2000 picture. */
const CHIP = { left: 170, top: 170, width: 1660, height: 1660 };
const PNG = { compressionLevel: 9, palette: true, quality: 90 } as const;

const chip = (size: number) => sharp(ICON).extract(CHIP).resize(size, size).png(PNG);

await chip(512).toFile('public/kids-icon-512.png');
await chip(192).toFile('public/kids-icon-192.png');
await chip(180).toFile('public/kids-apple-icon.png');
await sharp(ICON).resize(512, 512).png(PNG).toFile('public/kids-icon-512-maskable.png');
/* The logo is neon on black. Over the room's own picture a black box would
   show, so the black is taken out: each pixel keeps as much of itself as it is
   bright, the way light adds onto a dark wall — the glow fades into the room
   instead of ending at an edge. */
const { data, info } = await sharp(LOGO).resize({ width: 640 }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const out = Buffer.alloc(info.width * info.height * 4);
for (let i = 0, o = 0; i < data.length; i += 3, o += 4) {
  const most = Math.max(data[i], data[i + 1], data[i + 2]);
  const lift = most > 0 ? 255 / most : 0;
  out[o] = Math.round(data[i] * lift);
  out[o + 1] = Math.round(data[i + 1] * lift);
  out[o + 2] = Math.round(data[i + 2] * lift);
  out[o + 3] = most;
}
await sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } })
  .webp({ quality: 85, alphaQuality: 90 }).toFile('public/kids/logo.webp');
console.log('kids icons and logo written to public/');
