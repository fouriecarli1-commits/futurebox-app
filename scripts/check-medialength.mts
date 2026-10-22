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
const atEnd = join(new Uint8Array(big), mvhd(0, 600, 600 * 480));
ok('a camera’s MP4, header at the back, is read from its tail',
  (await measuredSeconds(new Blob([atEnd as BlobPart]))) === 480);
ok('  and the bill follows it, not the number the browser sent',
  (await billedSeconds(new Blob([atEnd as BlobPart]), 60, 3600)) === 480);

const route = readFileSync(new URL('../app/api/dub/route.ts', import.meta.url), 'utf8');
ok('a dub is charged for the measured length when there is one',
  /const measured = await measuredSeconds\(file\)/.test(route) && /measured !== null \? Math\.round\(measured\) : stated/.test(route)
  && before(route, 'measuredSeconds(file)', 'dubCost(seconds)'));
ok('  and a length nobody can state is refused rather than priced at nothing', /if \(seconds <= 0\)/.test(route) && /Number\.isFinite\(claimed\)/.test(route));

if (bad) {
  console.error(`\ncheck:medialength — ${bad} assertion(s) failed.\n`);
  process.exit(1);
}
console.log('\ncheck:medialength — a WAV or an MP4 is charged by its own length, wherever its header is, and a dub with it.');
