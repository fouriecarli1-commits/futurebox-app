/**
 * The FutureBox Kids icons and logo, cut from her pictures and kept in `public/`.
 *
 *   npx tsx scripts/kids-icons.mts
 *
 * The owner, 19 October 2026: *"hier is die app icon vir die kids, verander
 * dit asb. En hier is die logo vir die app self."* Both are hers, kept as she
 * sent them in `art/kids/`: the neon chip with the paintbrush is the icon, and
 * the "FUTUREBOX KIDS" logos are the top of the kids' studio — the stacked one
 * on a phone, the long one on a wide screen.
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
const LOGO_WIDE = 'art/kids/logo-wide.jpg';
/* The chip with a little of its glow, out of the 2000 × 2000 picture. */
const CHIP = { left: 170, top: 170, width: 1660, height: 1660 };
const PNG = { compressionLevel: 9, palette: true, quality: 90 } as const;

const chip = (size: number) => sharp(ICON).extract(CHIP).resize(size, size).png(PNG);

await chip(512).toFile('public/kids-icon-512.png');
await chip(192).toFile('public/kids-icon-192.png');
await chip(180).toFile('public/kids-apple-icon.png');
await sharp(ICON).resize(512, 512).png(PNG).toFile('public/kids-icon-512-maskable.png');
/* The logos are neon on black. Over the room's own picture a black box would
   show, so the black is taken out: each pixel keeps as much of itself as it is
   bright, the way light adds onto a dark wall — the glow fades into the room
   instead of ending at an edge. */
async function lightOnly(input: ReturnType<typeof sharp>, to: string): Promise<void> {
  const { data, info } = await input.removeAlpha().raw().toBuffer({ resolveWithObject: true });
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
    .webp({ quality: 85, alphaQuality: 90 }).toFile(to);
}

await lightOnly(sharp(LOGO).resize({ width: 640 }), 'public/kids/logo.webp');
/* The long one, for a wide screen — her second logo, 19 October 2026: *"Sit
   hierdie langer logo op die web app waar die skerm wyer strek."* Cut in to
   the sign and its glow; the picture around it is black. */
await lightOnly(sharp(LOGO_WIDE).extract({ left: 20, top: 80, width: 1960, height: 500 }).resize({ width: 1000 }), 'public/kids/logo-wide.webp');
console.log('kids icons and logos written to public/');
