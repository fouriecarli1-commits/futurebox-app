/**
 * Her FutureBox Kids logo on the kids banners, over the old FUTUREBOX sign.
 *
 *   npx tsx scripts/kids-banners.mts
 *
 * The owner, 19 October 2026: *"Sit die nuwe logo ook op die kids banners."*
 * The banners are her pictures, kept as she sent them in `art/kids/`; the sign
 * in the middle of each — the FUTUREBOX plate and the KIDS DREAM STUDIO line
 * under it — is dimmed and blurred away, and the logo glows where it was.
 *
 * Not run by CI. Drawn with `sharp`, which Next brings with it.
 */
import sharp from 'sharp';

const LOGO = 'art/kids/logo.jpg';

/* Where the old sign stands in each 2000-wide picture. */
const SIGNS = [
  { from: 'art/kids/banner-en.jpg', to: 'public/kids/banner-en.jpg', left: 540, top: 10, width: 960, height: 490 },
  { from: 'art/kids/banner-af.jpg', to: 'public/kids/banner-af.jpg', left: 540, top: 20, width: 960, height: 590 },
] as const;

/** The logo with its black taken out, as `kids-icons.mts` does for the room. */
async function logoLight(width: number): Promise<Buffer> {
  const { data, info } = await sharp(LOGO).resize({ width }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const out = Buffer.alloc(info.width * info.height * 4);
  for (let i = 0, o = 0; i < data.length; i += 3, o += 4) {
    const most = Math.max(data[i], data[i + 1], data[i + 2]);
    const lift = most > 0 ? 255 / most : 0;
    out[o] = Math.round(data[i] * lift);
    out[o + 1] = Math.round(data[i + 1] * lift);
    out[o + 2] = Math.round(data[i + 2] * lift);
    out[o + 3] = most;
  }
  return sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
}

for (const sign of SIGNS) {
  const { left, top, width, height } = sign;
  /* The sign, blurred to nothing and darkened, fading out at its edges. */
  const feather = 36;
  const mask = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <defs><filter id="f"><feGaussianBlur stdDeviation="${feather / 2}"/></filter></defs>
    <rect x="${feather}" y="${feather}" width="${width - feather * 2}" height="${height - feather * 2}" rx="${feather}" fill="#fff" filter="url(#f)"/>
  </svg>`);
  const veil = await sharp(sign.from)
    .extract({ left, top, width, height })
    .blur(60)
    .modulate({ brightness: 0.12 })
    .ensureAlpha()
    .composite([{ input: await sharp(mask).png().toBuffer(), blend: 'dest-in' }])
    .png()
    .toBuffer();
  const logoWidth = Math.round(Math.min(width * 0.94, (height * 0.8) * (2000 / 736)));
  const logo = await logoLight(logoWidth);
  const logoHeight = (await sharp(logo).metadata()).height ?? 0;
  await sharp(sign.from)
    .composite([
      { input: veil, left, top },
      { input: logo, left: Math.round(left + (width - logoWidth) / 2), top: Math.round(top + (height - logoHeight) / 2) },
    ])
    .jpeg({ quality: 84, mozjpeg: true })
    .toFile(sign.to);
}
console.log('kids banners written to public/kids/');
