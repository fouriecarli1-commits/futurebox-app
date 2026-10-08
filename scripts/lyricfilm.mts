/**
 * A real MP4 with a real timed-text track in it, for `check:lyriccut`.
 *
 * Not a check. A tool one check uses, and nothing else.
 *
 * ── Why this exists ──────────────────────────────────────────────────────
 *
 * `check:timedtext` builds its MP4 from nothing, byte by byte, so that every
 * number a reviewer is being asked to trust is visible in the file. That is
 * the right fixture for the reader and the wrong one for the whole chain: it
 * proves the parser copes with the shape I wrote, which is the shape I
 * believed. A file somebody else's encoder produced is a different claim.
 *
 * So this takes a real film — `public/welcome.mp4`, already in the repository,
 * made by an encoder nobody here wrote — and puts a text track into it. The
 * reader then has to find the track in amongst two real ones, with a real
 * sample table and real chunk offsets around it.
 *
 * ── Why this is not a browser probe ──────────────────────────────────────
 *
 * It was written to be one, and it cannot be. The Chromium that Playwright
 * installs is built without the proprietary codecs, so it cannot decode H.264
 * — `welcome.mp4` itself fails in it with `DEMUXER_ERROR_NO_SUPPORTED_STREAMS:
 * FFmpegDemuxer: no supported streams`, before anything of mine is involved,
 * and the film with the lyric track in it fails in exactly the same way and
 * for the same reason. That is why every video probe in `audit/` records its own
 * WebM in the page, and WebM has no timed-text track.
 *
 * The consequence is worth stating plainly rather than leaving as a gap in
 * the list: **the lyric offer cannot be walked in a browser.** Bringing the
 * film in would fail at the measuring step, because the probe's browser
 * cannot play it. What is held instead is everything either side of the
 * screen — the reading (`check:timedtext`), the cutting (`check:lyriccut`),
 * and the two of them joined on a real file, below. The press itself was
 * walked by hand.
 *
 * ── The part that makes the fixture honest ───────────────────────────────
 *
 * Inserting a track makes `moov` bigger, which pushes `mdat` further down the
 * file, which means every chunk offset in the two tracks that were already
 * there is now wrong. They have to be moved along by the same amount. Get
 * that wrong and the sample table points at the wrong bytes — so the check
 * below also reads the film's own first track back out and asserts its
 * offsets still land on the data they landed on before.
 */
import { readFileSync } from 'node:fs';

const u32 = (n: number): number[] => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
const u16 = (n: number): number[] => [(n >>> 8) & 255, n & 255];
const ascii = (s: string): number[] => [...s].map((one) => one.charCodeAt(0));
const box = (type: string, ...parts: number[][]): number[] => {
  const body = parts.flat();
  return [...u32(body.length + 8), ...ascii(type), ...body];
};

interface Box {
  readonly type: string;
  readonly at: number;
  readonly body: number;
  readonly end: number;
}

/** Every box between two offsets, without descending. */
export function boxes(buf: Buffer, start: number, end: number): Box[] {
  const out: Box[] = [];
  let i = start;
  while (i + 8 <= end) {
    const size = buf.readUInt32BE(i);
    if (size < 8 || i + size > end) break;
    out.push({ type: buf.toString('latin1', i + 4, i + 8), at: i, body: i + 8, end: i + size });
    i += size;
  }
  return out;
}

export const within = (buf: Buffer, one: Box, type: string): Box | undefined => boxes(buf, one.body, one.end).find((b) => b.type === type);

/** The one text track, built around samples that are already laid out. */
function textTrak(samples: readonly Sample[], timescale: number, chunkAt: number, long: number): number[] {
  const sizes = samples.map((one) => one.bytes.length);
  return box(
    'trak',
    box('tkhd',
      [0, 0, 0, 7], u32(0), u32(0), u32(3), u32(0), u32(long),
      u32(0), u32(0), u16(0), u16(0), u16(0), u16(0),
      /* The unity matrix, which every reader expects to be there even on a
         track that draws nothing. */
      u32(0x00010000), u32(0), u32(0), u32(0), u32(0x00010000), u32(0), u32(0), u32(0), u32(0x40000000),
      u32(0), u32(0)),
    box('mdia',
      box('mdhd', [0, 0, 0, 0], u32(0), u32(0), u32(timescale), u32(long), u16(0x55c4), u16(0)),
      /* `sbtl`, which is the handler `linesFrom` looks for. */
      box('hdlr', [0, 0, 0, 0], u32(0), ascii('sbtl'), u32(0), u32(0), u32(0), [0]),
      box('minf',
        box('nmhd', [0, 0, 0, 0]),
        box('dinf', box('dref', [0, 0, 0, 0], u32(1), box('url ', [0, 0, 0, 1]))),
        box('stbl',
          box('stsd', [0, 0, 0, 0], u32(1),
            box('tx3g',
              u32(0), u16(0), u16(1), u32(0), [1, 255], u32(0),
              u16(0), u16(0), u16(0), u16(0),
              u16(0), u16(0), u16(1), [0, 18], u32(0xffffffff))),
          box('stts', [0, 0, 0, 0], u32(samples.length),
            ...samples.map((one) => [...u32(1), ...u32(one.lasts)])),
          /* One chunk holding every sample, so the offset table is a single
             number and the walk through `stsc` is still exercised. */
          box('stsc', [0, 0, 0, 0], u32(1), u32(1), u32(samples.length), u32(1)),
          box('stsz', [0, 0, 0, 0], u32(0), u32(samples.length), ...sizes.map((one) => u32(one))),
          box('stco', [0, 0, 0, 0], u32(1), u32(chunkAt))))),
  );
}

interface Sample {
  readonly lasts: number;
  readonly bytes: Buffer;
}

/** A sample: two bytes of length, then the text. */
const sample = (text: string, lasts: number): Sample => ({
  lasts,
  bytes: (() => {
    const body = Buffer.from(text, 'utf8');
    return Buffer.concat([Buffer.from(u16(body.length)), body]);
  })(),
});

/**
 * `public/welcome.mp4` with these lines in it as a timed-text track.
 *
 * `lines` is `[text, seconds]` pairs, laid end to end from zero. An empty
 * text is a gap — a sample of length nought, which is what a real file has
 * between verses and what the reader skips.
 */
export function filmWithLyrics(
  lines: readonly (readonly [string, number])[],
  from = 'public/welcome.mp4',
): Buffer {
  const original = readFileSync(from);
  const top = boxes(original, 0, original.length);
  const moov = top.find((one) => one.type === 'moov');
  if (!moov) throw new Error('the film has no moov in it');
  const samples = lines.map(([text, lasts]) => sample(text, lasts));
  const body = Buffer.concat(samples.map((one) => one.bytes));

  /* A thousand ticks to the second, so the numbers passed in are plainly
     milliseconds. Deliberately NOT borrowed from another track in the film:
     the first pass of this wrote 2000-tick samples on to the audio track's
     44100 clock and every line landed in the first twentieth of a second,
     which the reader reported quite happily. A track's clock belongs to that
     track. */
  const timescale = 1000;
  const long = samples.reduce((sum, one) => sum + one.lasts, 0);

  /* Built twice. The first pass is only to learn how long the track is, and
     therefore where the text samples end up; the offsets are fixed-width, so
     the second pass is the same length as the first and the position it was
     told is the position it lands at. */
  const guess = textTrak(samples, timescale, 0, long);
  const grew = guess.length;
  const newMoov = moov.end - moov.at + grew;
  /* Everything that was after the old moov, shifted along by the growth. */
  const shift = grew;
  const tail = top.filter((one) => one.at > moov.at);
  const mdatBody = (() => {
    const mdat = tail.find((one) => one.type === 'mdat');
    return mdat ? mdat.end + shift : original.length + shift;
  })();
  const trak = textTrak(samples, timescale, mdatBody + 8, long);
  if (trak.length !== grew) throw new Error('the two passes disagree about the track length');

  /* ── The offsets that were already right and now are not ────────────── */
  const patched = Buffer.from(original);
  for (const one of boxes(patched, moov.body, moov.end).filter((b) => b.type === 'trak')) {
    const mdia = within(patched, one, 'mdia');
    const minf = mdia && within(patched, mdia, 'minf');
    const stbl = minf && within(patched, minf, 'stbl');
    const stco = stbl && within(patched, stbl, 'stco');
    if (!stco) throw new Error('a track in the film has no stco to move along');
    const count = patched.readUInt32BE(stco.body + 4);
    for (let n = 0; n < count; n += 1) {
      const at = stco.body + 8 + 4 * n;
      patched.writeUInt32BE(patched.readUInt32BE(at) + shift, at);
    }
  }

  /* The moov, with the new track inside it and its own size corrected. */
  const inner = patched.subarray(moov.body, moov.end);
  const header = Buffer.from([...u32(newMoov), ...ascii('moov')]);
  const rebuilt = Buffer.concat([header, inner, Buffer.from(trak)]);

  return Buffer.concat([
    patched.subarray(0, moov.at),
    rebuilt,
    patched.subarray(moov.end),
    /* The text itself, in an mdat of its own at the end — which is why the
       chunk offset above is `mdatBody + 8`: past this header. */
    Buffer.from(u32(body.length + 8)),
    Buffer.from(ascii('mdat')),
    body,
  ]);
}

/** How long the film says it is, off its own `mvhd`. */
export function filmSeconds(from = 'public/welcome.mp4'): number {
  const buf = readFileSync(from);
  const moov = boxes(buf, 0, buf.length).find((one) => one.type === 'moov');
  const mvhd = moov && within(buf, moov, 'mvhd');
  if (!mvhd) throw new Error('the film has no mvhd in it');
  return buf.readUInt32BE(mvhd.body + 16) / buf.readUInt32BE(mvhd.body + 12);
}

/**
 * The first bytes of a track's first chunk, as hex.
 *
 * The instrument for the offsets: a chunk offset that was moved along by the
 * wrong amount points at different bytes, and this is how that is seen rather
 * than reasoned about. Read from each file by its own table, so the same
 * track in both should name the same data.
 */
export function firstChunkBytes(buf: Buffer, which: number, howMany = 24): string {
  const moov = boxes(buf, 0, buf.length).find((one) => one.type === 'moov');
  if (!moov) throw new Error('no moov');
  const trak = boxes(buf, moov.body, moov.end).filter((one) => one.type === 'trak')[which];
  const mdia = trak && within(buf, trak, 'mdia');
  const minf = mdia && within(buf, mdia, 'minf');
  const stbl = minf && within(buf, minf, 'stbl');
  const stco = stbl && within(buf, stbl, 'stco');
  if (!stco) throw new Error(`track ${which} has no stco`);
  const at = buf.readUInt32BE(stco.body + 8);
  return buf.toString('hex', at, at + howMany);
}
