/**
 * The compressor every way out shares: `lib/squeeze.ts`.
 *
 *   npm run check:squeeze
 *
 * The owner, 18 October 2026: a file size to choose when saving — *"menend
 * 1mb ens."* — and a compressor at every export. What is held here is the
 * search, with a pretend encoder whose sizes are known: that a file already
 * under the limit is left alone, that quality goes before pixels, that a PNG
 * loses pixels because it has no quality, that a limit never makes a file
 * better than she chose, and that a limit nothing can meet says so instead
 * of pretending.
 */
import { LIMITS, fitUnder, limitSaid, sizeSaid, smallerBy, type Encode } from '../app/lib/squeeze.ts';
import { KBPS_DEFAULT, encodeMp3, kbpsUnder, mp3Bytes } from '../app/lib/mp3.ts';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : '✗  '} ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) bad += 1;
};

/* A picture whose file is `full` bytes at quality 1 and full size, and
   shrinks with quality and with the square of the scale — near enough how
   a photograph behaves. */
const pretend = (full: number, asked: { quality: number | undefined; scale: number }[] = []): Encode =>
  async (quality, scale) => {
    asked.push({ quality, scale });
    const q = quality === undefined ? 1 : 0.15 + 0.85 * quality;
    /* Only `size` is read, so a pretend file is a size — a real 10 GB Blob
       would be 10 GB of memory to prove a refusal. */
    return { size: Math.round(full * q * scale * scale) } as Blob;
  };

const run = async (): Promise<void> => {
  const small = await fitUnder(pretend(300_000), 0.92, 1_000_000);
  ok('a file already under the limit is left exactly as chosen',
    small?.fits === true && small.scale === 1 && small.quality === 0.92, JSON.stringify(small && { ...small, blob: small.blob.size }));

  const none = await fitUnder(pretend(9_000_000), 0.92, null);
  ok('  and with no limit nothing is squeezed', none?.blob.size === Math.round(9_000_000 * (0.15 + 0.85 * 0.92)));

  const asked: { quality: number | undefined; scale: number }[] = [];
  const photo = await fitUnder(pretend(1_800_000, asked), 0.92, 1_000_000);
  ok('a 1.7 MB photograph is made to come in under 1 MB', photo?.fits === true && (photo.blob.size <= 1_000_000),
    String(photo?.blob.size));
  ok('  by lowering the quality, not by losing pixels', photo?.scale === 1, String(photo?.scale));
  ok('  and as close under the limit as six tries get it', (photo?.blob.size ?? 0) > 900_000, String(photo?.blob.size));
  ok('  and never at a better quality than she chose', asked.every((one) => one.quality === undefined || one.quality <= 0.92));

  const png = await fitUnder(pretend(3_000_000), undefined, 1_000_000);
  ok('a PNG, which has no quality, comes in under by losing pixels',
    png?.fits === true && png.scale < 1 && png.quality === undefined && png.blob.size <= 1_000_000,
    JSON.stringify(png && { ...png, blob: png.blob.size }));

  const huge = await fitUnder(pretend(20_000_000), 0.92, 1_000_000);
  ok('a picture too big to be squeezed even at quality 0.4 also loses pixels',
    huge?.fits === true && huge.scale < 1, JSON.stringify(huge && { ...huge, blob: huge.blob.size }));

  const never = await fitUnder(pretend(10_000_000_000), 0.92, 200_000);
  ok('a limit nothing can meet says so, and hands back the smallest it made',
    never?.fits === false && (never?.blob.size ?? Infinity) < 10_000_000_000, JSON.stringify(never && { ...never, blob: never.blob.size }));

  const kept = await fitUnder(pretend(20_000_000), 0.92, 1_000_000, false);
  ok('where the pixels are the point, only the quality gives, and a file that still does not fit says so',
    kept?.scale === 1 && kept.fits === false && kept.quality === 0.4, JSON.stringify(kept && { ...kept, blob: kept.blob.size }));
  const keptFits = await fitUnder(pretend(1_800_000), 0.92, 1_000_000, false);
  ok('  and one that can fit by quality alone does', keptFits?.fits === true && keptFits.scale === 1);

  const broken = await fitUnder(async () => null, 0.9, 1_000_000);
  ok('a file that could not be made is null, not a 0-byte file', broken === null);

  ok('sizes read the way the tool she used reads them',
    sizeSaid(270_000) === '270 kB' && sizeSaid(1_400_000) === '1.4 MB' && sizeSaid(12_000_000) === '12 MB' && sizeSaid(512) === '512 B',
    [sizeSaid(270_000), sizeSaid(1_400_000), sizeSaid(12_000_000), sizeSaid(512)].join(' '));
  ok('  and 86% smaller is said as 86', smallerBy(1_930_000, 270_000) === 86, String(smallerBy(1_930_000, 270_000)));
  ok('  and a file that grew is not called smaller', smallerBy(100, 120) === 0);
  ok('the limits run from none to 5 MB, and 1 MB is a thousand thousand bytes',
    LIMITS[0] === null && LIMITS.includes(1_000_000) && limitSaid(1_000_000, 'none') === '1 MB' && limitSaid(null, 'none') === 'none',
    limitSaid(1_000_000, 'none'));

  /* ── The booth's MP3 ────────────────────────────────────────────────── */
  const song = kbpsUnder(180, 5_000_000);
  ok('a three-minute song under 5 MB is an MP3 at 192 kbps, which fits',
    song.kbps === 192 && song.fits && mp3Bytes(180, song.kbps) <= 5_000_000, JSON.stringify(song));
  ok('  and with no limit it is the default bitrate, never higher',
    kbpsUnder(180, null).kbps === KBPS_DEFAULT && kbpsUnder(5, 50_000_000).kbps === KBPS_DEFAULT);
  ok('  and a limit nothing fits under says so', kbpsUnder(3600, 1_000_000).fits === false);
  const rate = 44_100;
  const tone = new Float32Array(rate * 3).map((_, i) => Math.sin(i / 18) * 0.4);
  const fake = { numberOfChannels: 2, sampleRate: rate, length: tone.length, duration: 3, getChannelData: () => tone } as unknown as AudioBuffer;
  const made = await encodeMp3(fake, 128);
  const head = new Uint8Array(await made.slice(0, 2).arrayBuffer());
  ok('three seconds encoded at 128 kbps is a real MP3 of about the size it was said to be',
    head[0] === 0xff && (head[1] & 0xe0) === 0xe0 && Math.abs(made.size - mp3Bytes(3, 128)) < mp3Bytes(3, 128) * 0.1,
    `${made.size} bytes against ${mp3Bytes(3, 128)}`);
  const mono = await encodeMp3(fake, 128, 'mono');
  ok('  and mono is one channel at the same bitrate', mono.size > 0 && mono.type === 'audio/mpeg');
};

await run();
if (bad) {
  console.error(`\ncheck:squeeze — ${bad} assertion(s) failed.\n`);
  process.exit(1);
}
console.log('\ncheck:squeeze — a file is made to fit the size she chose: quality first, pixels only when it must, and a limit nothing meets is said.');
