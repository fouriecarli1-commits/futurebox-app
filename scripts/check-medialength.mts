/**
 * check:medialength — a file is charged for by its own length when it says it.
 *
 * Dubbing is charged by the minute and took the browser's number as given: a
 * request saying "60" over a ten-minute film paid for one minute while the
 * account paid upstream for ten. A WAV states its length in its header and so
 * does an MP4 (`mvhd`), at the front of a streaming file or at the back of a
 * camera's. This holds the reader to real bytes, and the dub route to it.
 */
import { readFileSync } from 'node:fs';
import { before } from './order.mts';
import { mp4Seconds } from '../app/lib/mp4len.ts';
import { measuredSeconds, billedSeconds } from '../app/lib/server/audiolen.ts';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : '✗  '} ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) bad += 1;
};

/** An `mvhd` box: version 0 (32-bit) or 1 (64-bit), at a timescale and a duration. */
function mvhd(version: 0 | 1, scale: number, ticks: number): Uint8Array {
  const body = new Uint8Array(version === 1 ? 4 + 28 + 80 : 4 + 16 + 80);
  const view = new DataView(body.buffer);
  body[0] = version;
  if (version === 1) {
    view.setUint32(4 + 16, scale);
    view.setBigUint64(4 + 20, BigInt(ticks));
  } else {
    view.setUint32(4 + 8, scale);
    view.setUint32(4 + 12, ticks);
  }
  const box = new Uint8Array(8 + body.length);
  new DataView(box.buffer).setUint32(0, box.length);
  box.set([0x6d, 0x76, 0x68, 0x64], 4);
  box.set(body, 8);
  return box;
}
const join = (...parts: Uint8Array[]): Uint8Array => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const part of parts) { out.set(part, at); at += part.length; }
  return out;
};

ok('a ten-minute MP4 reads as ten minutes', mp4Seconds(join(new Uint8Array(32), mvhd(0, 1000, 600_000))) === 600);
ok('  and a 64-bit header too', mp4Seconds(join(new Uint8Array(32), mvhd(1, 90_000, 90_000 * 125))) === 125);
ok('bytes with no header read as nothing, not as a guess', mp4Seconds(new Uint8Array(4096)) === null);
ok('a stray "mvhd" with a nonsense length is passed over', mp4Seconds(join(new Uint8Array(8), mvhd(0, 1, 4_000_000_000))) === null);

const big = 5 * 1024 * 1024;
const ftyp = new Uint8Array([0, 0, 0, 16, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d, 0, 0, 2, 0]);
const atEnd = join(ftyp, new Uint8Array(big), mvhd(0, 600, 600 * 480));
ok('an "mvhd" in a file that does not open as an MP4 is not read as one',
  (await measuredSeconds(new Blob([join(new Uint8Array(big), mvhd(0, 600, 600 * 480)) as BlobPart]))) === null);
ok('a camera’s MP4, header at the back, is read from its tail',
  (await measuredSeconds(new Blob([atEnd as BlobPart]))) === 480);
ok('  and the bill follows it, not the number the browser sent',
  (await billedSeconds(new Blob([atEnd as BlobPart]), 60, 3600)) === 480);

/* ── MP3, which is what the voice engines send ── */
/** One MPEG-1 Layer III frame at 128 kbit/s, 44.1 kHz, stereo: 417 bytes. */
const frame = (): Uint8Array => {
  const one = new Uint8Array(417);
  one.set([0xff, 0xfb, 0x90, 0x00]);
  return one;
};
const frames = (n: number): Uint8Array => join(...Array.from({ length: n }, frame));
const cbr = frames(2300);
const truth = (2300 * 1152) / 44100;
const cbrSaid = await measuredSeconds(new Blob([cbr as BlobPart]));
ok('a constant-bitrate MP3 of about a minute reads as about a minute',
  cbrSaid !== null && Math.abs(cbrSaid - truth) / truth < 0.01, `${cbrSaid} vs ${truth}`);
const tag = join(new Uint8Array([0x49, 0x44, 0x33, 3, 0, 0, 0, 0, 0x08, 0x00]), new Uint8Array(1024).fill(0xff));
const tagged = await measuredSeconds(new Blob([join(tag, cbr) as BlobPart]));
ok('  and an ID3 tag in front, full of 0xFF bytes, is stepped over', tagged !== null && Math.abs(tagged - truth) / truth < 0.01, String(tagged));
const xingFrame = frame();
xingFrame.set([0x58, 0x69, 0x6e, 0x67, 0, 0, 0, 1, 0, 0, 0x03, 0xe8], 4 + 32);
const vbr = await measuredSeconds(new Blob([join(xingFrame, frames(10)) as BlobPart]));
ok('a variable-bitrate MP3 is read from its Xing frame count', vbr !== null && Math.abs(vbr - (1000 * 1152) / 44100) < 0.001, String(vbr));
ok('noise is not an MP3', (await measuredSeconds(new Blob([new Uint8Array(8192).fill(7) as BlobPart]))) === null);

const presenter = readFileSync(new URL('../app/api/presenter/route.ts', import.meta.url), 'utf8');
ok('a presenter is charged for the reading it is sent, measured',
  /measuredSeconds\(/.test(presenter) && before(presenter, 'measuredSeconds(', 'presenterCost(seconds)'));

const route = readFileSync(new URL('../app/api/dub/route.ts', import.meta.url), 'utf8');
ok('a dub is charged for the measured length when there is one',
  /const measured = await measuredSeconds\(file\)/.test(route) && /measured !== null \? Math\.round\(measured\) : stated/.test(route)
  && before(route, 'measuredSeconds(file)', 'dubCost(seconds)'));
ok('  and a length nobody can state is refused rather than priced at nothing', /if \(seconds <= 0\)/.test(route) && /Number\.isFinite\(claimed\)/.test(route));

if (bad) {
  console.error(`\ncheck:medialength — ${bad} assertion(s) failed.\n`);
  process.exit(1);
}
console.log('\ncheck:medialength — a WAV, an MP4 or an MP3 is charged by its own length, and a dub and a presenter with it.');
