/**
 * The lyrics out of a film, with the second each line lands on.
 *
 * ── Where this came from ─────────────────────────────────────────────────
 *
 * Carli, 8 October 2026, with a song she had just made: *"wat dit awesome
 * maak dat dit dadelik 'n video en album art saam create wat ek vir ons
 * engine ook sal wil hê."*
 *
 * The file had three tracks, not two: H.264 at 1024 × 1024, AAC, and a
 * `tx3g` timed-text track — the lyrics, line by line, with the second each
 * one arrives on. Not burnt into the picture. Data.
 *
 * That track is the whole feature. The hard part of a lyric video is not
 * the video; it is knowing WHEN each line lands, and a supplier that hands
 * that back has done the part this app cannot do for itself. Everything
 * else is already here: `drawCaption` draws words on a frame, and the
 * cutting room's pieces already carry `wordsFrom` and `wordsTo`, which is
 * the same shape a line of timed text is.
 *
 * So a song that arrives with a cover and a lyric video is assembly, and it
 * runs on the device for nothing.
 *
 * ── Why this is written by hand ──────────────────────────────────────────
 *
 * There is no demuxer in the browser. `<track>` reads WebVTT from a
 * separate file; it will not reach into an MP4 and pull a text track out.
 * ffmpeg.wasm would, and it is twenty-odd megabytes to read a few hundred
 * bytes of text — on a phone, for a lyric sheet, that is not a trade worth
 * making.
 *
 * What this needs is a small walk through the atoms: find the track whose
 * handler is `sbtl`, read its sample table, and turn each sample into a
 * time and a string. The sample format is as simple as it gets — a
 * two-byte length and then UTF-8.
 *
 * ── The quirk that would have shipped wrong ──────────────────────────────
 *
 * The samples are not one line each. They are a rolling karaoke window:
 * sample N holds the line before, the line now, and the line next, so the
 * same words appear in three consecutive samples. Reading them naively
 * gives a lyric sheet with every line in it three times.
 *
 * The new line is the LAST one in each sample. That is what `linesFrom`
 * returns, and `check:timedtext` holds it against a file built to have the
 * rolling window in it.
 */

/** One line, and the seconds it is on screen. */
export interface Timed {
  readonly from: number;
  readonly to: number;
  readonly text: string;
}

interface Box {
  readonly type: string;
  readonly body: number;
  readonly end: number;
}

const u32 = (d: DataView, at: number): number => d.getUint32(at);

/** Every box between two offsets, without descending into them. */
function boxes(d: DataView, start: number, end: number): Box[] {
  const out: Box[] = [];
  let i = start;
  /* A malformed file must end this loop rather than spin it. Every path
     below either advances `i` by at least eight or returns. */
  while (i + 8 <= end) {
    let size = u32(d, i);
    let body = i + 8;
    if (size === 1) {
      /* A 64-bit size. The high word is read and required to be nought:
         this app has no use for a four-gigabyte atom and a silent
         truncation to the low word would walk into the middle of one. */
      if (i + 16 > end || u32(d, i + 8) !== 0) return out;
      size = u32(d, i + 12);
      body = i + 16;
    }
    if (size < 8 || i + size > end) return out;
    out.push({ type: String.fromCharCode(...new Uint8Array(d.buffer, d.byteOffset + i + 4, 4)), body, end: i + size });
    i += size;
  }
  return out;
}

const inside = (d: DataView, box: Box, type: string): Box | null =>
  boxes(d, box.body, box.end).find((one) => one.type === type) ?? null;

/**
 * The timed text in this file, or an empty list.
 *
 * Total on purpose. A file with no text track, a file this cannot read, and
 * a file that is not an MP4 at all are all "no lyrics" — the room offers to
 * build a lyric video when there are lines and says nothing when there are
 * not, and a throw here would be a cutting room that will not open a clip
 * somebody brought in.
 */
export function linesFrom(file: ArrayBuffer): readonly Timed[] {
  try {
    return read(new DataView(file));
  } catch {
    return [];
  }
}

function read(d: DataView): readonly Timed[] {
  const moov = boxes(d, 0, d.byteLength).find((one) => one.type === 'moov');
  if (!moov) return [];

  for (const trak of boxes(d, moov.body, moov.end).filter((one) => one.type === 'trak')) {
    const mdia = inside(d, trak, 'mdia');
    if (!mdia) continue;
    const hdlr = inside(d, mdia, 'hdlr');
    const mdhd = inside(d, mdia, 'mdhd');
    if (!hdlr || !mdhd) continue;
    const handler = String.fromCharCode(
      ...new Uint8Array(d.buffer, d.byteOffset + hdlr.body + 8, 4),
    );
    if (handler !== 'sbtl' && handler !== 'text') continue;

    /* The clock this track's times are counted in. Version 1 moves every
       field along by four bytes twice over, which is why it is read rather
       than assumed — a version-1 header read as version 0 gives a timescale
       of nought and every line lands at infinity. */
    const version = d.getUint8(mdhd.body);
    const timescale = version === 0 ? u32(d, mdhd.body + 12) : u32(d, mdhd.body + 20);
    if (!timescale) continue;

    const minf = inside(d, mdia, 'minf');
    const stbl = minf && inside(d, minf, 'stbl');
    if (!stbl) continue;

    const sizes = sampleSizes(d, stbl);
    const offsets = sampleOffsets(d, stbl, sizes.length);
    const times = sampleTimes(d, stbl);
    if (!sizes.length || offsets.length < sizes.length) continue;

    const out: Timed[] = [];
    for (let n = 0; n < sizes.length; n += 1) {
      if (sizes[n] < 2) continue;
      const at = offsets[n];
      if (at + 2 > d.byteLength) continue;
      const length = d.getUint16(at);
      if (length === 0 || at + 2 + length > d.byteLength) continue;
      const text = new TextDecoder().decode(
        new Uint8Array(d.buffer, d.byteOffset + at + 2, length),
      );
      const when = times[n] ?? { from: 0, to: 0 };
      out.push({
        from: when.from / timescale,
        to: when.to / timescale,
        /* `♪` is what a player draws for a musical interlude. It is
           furniture rather than a lyric, and a lyric sheet that opens with
           a note character is one somebody has to tidy by hand. */
        text: text.replace(/♪/g, '').trim(),
      });
    }
    return newLinesOnly(out);
  }
  return [];
}

/**
 * The rolling window, flattened to one line each.
 *
 * A sample holds the line before, the line now and the line next, so the
 * same words arrive three times. The new one is the last line in the
 * sample; everything above it has already been seen.
 *
 * Compared against the line before rather than against every line seen, so
 * a chorus that really does repeat is kept. This song's chorus appears
 * three times and all three belong in the sheet.
 */
function newLinesOnly(samples: readonly Timed[]): readonly Timed[] {
  const out: Timed[] = [];
  for (const one of samples) {
    const lines = one.text.split('\n').map((line) => line.trim()).filter(Boolean);
    if (!lines.length) continue;
    const latest = lines[lines.length - 1];
    if (out.length && out[out.length - 1].text === latest) continue;
    out.push({ from: one.from, to: one.to, text: latest });
  }
  return out;
}

function sampleSizes(d: DataView, stbl: Box): number[] {
  const stsz = inside(d, stbl, 'stsz');
  if (!stsz) return [];
  const uniform = u32(d, stsz.body + 4);
  const count = u32(d, stsz.body + 8);
  if (uniform) return new Array(count).fill(uniform);
  const out: number[] = [];
  for (let n = 0; n < count; n += 1) out.push(u32(d, stsz.body + 12 + 4 * n));
  return out;
}

function sampleOffsets(d: DataView, stbl: Box, howMany: number): number[] {
  const stco = inside(d, stbl, 'stco');
  const co64 = stco ? null : inside(d, stbl, 'co64');
  const where = stco ?? co64;
  if (!where) return [];
  const chunks: number[] = [];
  const count = u32(d, where.body + 4);
  for (let n = 0; n < count; n += 1) {
    chunks.push(stco
      ? u32(d, where.body + 8 + 4 * n)
      /* The high word again, and the same reasoning: a file past four
         gigabytes is not one this app made or will open. */
      : u32(d, where.body + 12 + 8 * n));
  }

  const stsc = inside(d, stbl, 'stsc');
  if (!stsc) return [];
  const runs: { first: number; per: number }[] = [];
  const many = u32(d, stsc.body + 4);
  for (let n = 0; n < many; n += 1) {
    runs.push({
      first: u32(d, stsc.body + 8 + 12 * n),
      per: u32(d, stsc.body + 12 + 12 * n),
    });
  }

  const perChunk: number[] = [];
  runs.forEach((run, n) => {
    const last = n + 1 < runs.length ? runs[n + 1].first - 1 : chunks.length;
    for (let c = run.first; c <= last; c += 1) perChunk.push(run.per);
  });

  const sizes = sampleSizes(d, stbl);
  const out: number[] = [];
  let sample = 0;
  chunks.forEach((start, c) => {
    const here = perChunk[c] ?? perChunk[perChunk.length - 1] ?? 0;
    let at = start;
    for (let k = 0; k < here && sample < howMany; k += 1) {
      out.push(at);
      at += sizes[sample] ?? 0;
      sample += 1;
    }
  });
  return out;
}

function sampleTimes(d: DataView, stbl: Box): { from: number; to: number }[] {
  const stts = inside(d, stbl, 'stts');
  if (!stts) return [];
  const runs = u32(d, stts.body + 4);
  const out: { from: number; to: number }[] = [];
  let t = 0;
  for (let n = 0; n < runs; n += 1) {
    const count = u32(d, stts.body + 8 + 8 * n);
    const each = u32(d, stts.body + 12 + 8 * n);
    for (let k = 0; k < count; k += 1) {
      out.push({ from: t, to: t + each });
      t += each;
    }
  }
  return out;
}
