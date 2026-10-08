/**
 * The lyrics out of a film, with the second each line lands on.
 *
 *   npm run check:timedtext
 *
 * ── What this is for ─────────────────────────────────────────────────────
 *
 * Carli, 8 October 2026, with a song she had just generated: *"wat dit
 * awesome maak dat dit dadelik 'n video en album art saam create wat ek vir
 * ons engine ook sal wil hê."*
 *
 * Her file had three tracks. The third was `tx3g` timed text — the lyrics,
 * line by line, with the second each one arrives on. That is the part of a
 * lyric video this app cannot work out for itself, and a supplier handing
 * it back means the rest is assembly: `drawCaption` already draws words on
 * a frame and the cutting room's pieces already carry `wordsFrom` and
 * `wordsTo`.
 *
 * ── Why the fixture is built here rather than committed ──────────────────
 *
 * A binary fixture in a repository is a file nobody can read in a diff. The
 * MP4 below is assembled byte by byte in this file, so every number in it
 * is visible and a reviewer can see exactly which shape the parser is being
 * held to.
 *
 * It is built to carry the quirk that would otherwise have shipped: the
 * samples are a rolling karaoke window, three lines at a time, so the same
 * words appear in three consecutive samples. A reader that takes each
 * sample whole produces a lyric sheet with every line in it three times.
 * That is not hypothetical — it is what the first run against her file did.
 */
import { linesFrom } from '../app/lib/timedtext.ts';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : '✗  '} ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) bad += 1;
};

/* ── A very small MP4, assembled by hand ────────────────────────────── */

const u32 = (n: number): number[] => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
const u16 = (n: number): number[] => [(n >>> 8) & 255, n & 255];
const ascii = (s: string): number[] => [...s].map((one) => one.charCodeAt(0));

/** A box: four bytes of size, four of type, then the body. */
const box = (type: string, ...parts: number[][]): number[] => {
  const body = parts.flat();
  return [...u32(body.length + 8), ...ascii(type), ...body];
};

/** One tx3g sample: two bytes of length, then UTF-8. */
const sample = (text: string): number[] => {
  const bytes = [...new TextEncoder().encode(text)];
  return [...u16(bytes.length), ...bytes];
};

/* The rolling window, exactly as hers came: each sample carries the line
   before, the line now and the line next. */
const LINES = [
  'Ek sit hier stil en word van alles waar',
  'Daar buite in die vroeë lig se gloed',
  'Voel alles dadelik vir my siel so goed',
  /* And a repeat two lines later, because a chorus really does repeat and
     a reader that de-duplicates against everything it has ever seen would
     silently drop the second chorus. */
  'Ek sit hier stil en word van alles waar',
];
const window3 = (n: number): string => LINES.slice(Math.max(0, n - 2), n + 1).join('\n');

const samples = LINES.map((_, n) => sample(`♪ ${window3(n)} ♪`));
const sizes = samples.map((one) => one.length);
const TIMESCALE = 1_000_000;
const EACH = 3_000_000;

/* The media data, and where it starts. The offset table below has to point
   at the real bytes, so the header is built first and measured. */
const mdatBody = samples.flat();

const stbl = (mdatAt: number): number[] => box('stbl',
  box('stsd', u32(0), u32(1), box('tx3g', new Array(30).fill(0))),
  box('stts', u32(0), u32(1), u32(samples.length), u32(EACH)),
  /* One chunk holding every sample. */
  box('stsc', u32(0), u32(1), u32(1), u32(samples.length), u32(1)),
  box('stsz', u32(0), u32(0), u32(sizes.length), ...sizes.map(u32)),
  box('stco', u32(0), u32(1), u32(mdatAt)),
);

const trak = (mdatAt: number): number[] => box('trak',
  box('tkhd', u32(0), u32(0), u32(0), u32(1), u32(0), u32(0), ...new Array(15).fill(u32(0))),
  box('mdia',
    /* Version 0, so the timescale is at body + 12. */
    box('mdhd', u32(0), u32(0), u32(0), u32(TIMESCALE), u32(EACH * samples.length), u32(0)),
    box('hdlr', u32(0), u32(0), ascii('sbtl'), ...new Array(5).fill(u32(0))),
    box('minf', box('stbl', [])),
  ),
);

/* Built twice: once to learn how long the header is, once with the real
   offset in it. A chunk offset is absolute from the start of the file, so
   it cannot be known until everything before `mdat` has been measured. */
const shape = (mdatAt: number): Uint8Array => {
  const moov = box('moov',
    box('mvhd', u32(0), u32(0), u32(0), u32(TIMESCALE), u32(EACH * samples.length), ...new Array(20).fill(u32(0))),
    box('trak',
      box('tkhd', u32(0), ...new Array(20).fill(u32(0))),
      box('mdia',
        box('mdhd', u32(0), u32(0), u32(0), u32(TIMESCALE), u32(EACH * samples.length), u32(0)),
        box('hdlr', u32(0), u32(0), ascii('sbtl'), ...new Array(5).fill(u32(0))),
        box('minf', stbl(mdatAt)),
      ),
    ),
  );
  const ftyp = box('ftyp', ascii('isom'), u32(512), ascii('isomiso2'));
  return new Uint8Array([...ftyp, ...moov, ...box('mdat', mdatBody)]);
};

/* First pass gives the header length; the body of `mdat` starts eight bytes
   after the box does. */
const firstPass = shape(0);
const mdatAt = firstPass.length - mdatBody.length;
const file = shape(mdatAt);

const asBuffer = (bytes: Uint8Array): ArrayBuffer =>
  bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;

/* ── 1. It reads ────────────────────────────────────────────────────── */
const read = linesFrom(asBuffer(file));
ok('the lyrics come out of a film that has a text track',
  read.length > 0,
  `${read.length} lines — the fixture has ${LINES.length} in it`);

ok('  and one line per line, not one per rolling window',
  read.length === LINES.length,
  `${read.length} against ${LINES.length}: ${JSON.stringify(read.map((one) => one.text))}`
  + ' — the samples carry three lines each, so a reader that takes a sample'
  + ' whole gives a lyric sheet with every line in it three times. That is'
  + ' what the first run against her own file did');

ok('  and in the order they are sung',
  read.map((one) => one.text).join('|') === LINES.join('|'),
  JSON.stringify(read.map((one) => one.text)));

ok('  and a line that really repeats is kept',
  read[3]?.text === LINES[0],
  `${read[3]?.text} — a chorus comes round three times in her song, and a`
  + ' reader that de-duplicates against everything it has seen drops the'
  + ' second and third');

/* ── 2. The clock ───────────────────────────────────────────────────── */
ok('each line carries the second it lands on',
  Math.abs((read[0]?.from ?? -1) - 0) < 1e-9
    && Math.abs((read[1]?.from ?? -1) - 3) < 1e-9
    && Math.abs((read[2]?.from ?? -1) - 6) < 1e-9,
  JSON.stringify(read.map((one) => one.from)) + ' — the timescale is a'
  + ' million, so three million units is three seconds. Read as raw units'
  + ' this would put every line a million seconds in');

ok('  and the second it goes',
  Math.abs((read[0]?.to ?? -1) - 3) < 1e-9,
  `${read[0]?.to}`);

/* ── 3. The musical note is furniture, not a lyric ──────────────────── */
ok('the interlude mark is not left in the words',
  read.every((one) => !one.text.includes('♪')),
  JSON.stringify(read.map((one) => one.text)) + ' — a player draws it for an'
  + ' instrumental passage, and a sheet that opens with a note character is'
  + ' one somebody has to tidy by hand');

/* ── 4. Nothing it is handed can make it throw ──────────────────────── */
const rubbish: readonly [string, ArrayBuffer][] = [
  ['nothing at all', new ArrayBuffer(0)],
  ['a few bytes', asBuffer(new Uint8Array([1, 2, 3, 4, 5]))],
  ['a JPEG', asBuffer(new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 16, 74, 70]))],
  ['a box claiming to be longer than the file', asBuffer(new Uint8Array([...u32(999999), ...ascii('moov')]))],
  ['a box of size nought', asBuffer(new Uint8Array([...u32(0), ...ascii('moov'), ...u32(0), ...ascii('trak')]))],
  ['a film with no text track', asBuffer(new Uint8Array(box('moov', box('trak', box('mdia',
    box('hdlr', u32(0), u32(0), ascii('vide'), ...new Array(5).fill(u32(0))))))))],
];
for (const [what, buffer] of rubbish) {
  let threw = false;
  let answer: readonly unknown[] = [];
  try { answer = linesFrom(buffer); } catch { threw = true; }
  ok(`  ${what} gives no lyrics rather than an error`,
    !threw && answer.length === 0,
    threw ? 'it threw' : `${answer.length} lines`);
}

ok('a size-nought box ends the walk instead of spinning it',
  true,
  'this one is about the loop above rather than its answer: a box that'
  + ' reports a size of nought advances the cursor by nothing, and a reader'
  + ' that trusts it hangs the tab rather than failing');

if (bad) {
  console.error(`\ncheck:timedtext — ${bad} assertion(s) failed.\n`);
  process.exit(1);
}
console.log(
  '\ncheck:timedtext — the timed lyrics come out of an MP4 one line each,'
  + ' in order, with the second each one lands on, and nothing handed to it'
  + ' can make it throw.',
);
