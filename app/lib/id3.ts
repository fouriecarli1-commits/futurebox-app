/**
 * Putting the album art inside the song file.
 *
 * ── What she asked for ───────────────────────────────────────────────────
 *
 * Carli, 9 October 2026: *"Liedjies moet ook kan export saam met hulle Album
 * art."*
 *
 * Until now a song and its cover were two separate things: the audio came
 * down as a file and the sleeve stayed in the app. Everywhere a song then
 * goes — a phone's music player, a car, a distributor's upload form, a file
 * somebody sends a friend — shows a grey square, because the art was never
 * in the file.
 *
 * ── Why this is written out rather than pulled in ────────────────────────
 *
 * ID3v2.3 is a header, then a run of frames, then the audio. A frame is an
 * id, a size, two flag bytes and its contents. That is the whole format for
 * what is needed here, and it is about eighty lines — against a dependency
 * that would have to be audited, kept current, and carried into the bundle
 * of every screen that offers a download.
 *
 * ── v2.3 rather than v2.4, deliberately ──────────────────────────────────
 *
 * They are nearly the same and v2.4 is the later one. v2.3 is what Windows
 * Explorer, older car head units and several distributor upload forms
 * actually read; v2.4's synchsafe frame sizes are the usual thing they get
 * wrong, and the failure is a file whose art is invisible with nothing to
 * say why. The only thing v2.4 buys here is a size field written one way
 * instead of another.
 *
 * ── What it does NOT do ──────────────────────────────────────────────────
 *
 * Touch the audio. The tag is prepended and the original bytes follow it
 * unchanged, so the song that comes out is the song that went in, sample for
 * sample. Nothing is re-encoded and nothing is lost.
 *
 * And it does not handle WAV, which has no standard place for a picture —
 * see `songfile.ts` for what happens there instead.
 */

/** The tag's own header is ten bytes; every frame header is another ten. */
const HEADER = 10;

/**
 * A size, in the odd shape the tag's own header wants.
 *
 * Seven bits a byte, the top bit always zero, so the size can never contain
 * the byte pattern that marks the start of a frame of audio. That is what
 * "synchsafe" means and it is the one genuinely strange thing in the format.
 */
function synchsafe(size: number): number[] {
  return [
    (size >> 21) & 0x7f,
    (size >> 14) & 0x7f,
    (size >> 7) & 0x7f,
    size & 0x7f,
  ];
}

/** A plain big-endian size, which is what a v2.3 FRAME header wants. */
function plain(size: number): number[] {
  return [(size >>> 24) & 0xff, (size >>> 16) & 0xff, (size >>> 8) & 0xff, size & 0xff];
}

const ascii = (text: string): number[] => [...text].map((one) => one.charCodeAt(0) & 0xff);

/**
 * A text frame, in UTF-16 with a byte-order mark.
 *
 * Not Latin-1, which is the format's default and would be shorter. A song
 * called "Môre" or "Voëltjie" written as Latin-1 arrives in a player as
 * "MÃ´re" — and this app's songs are Afrikaans more often than not, so the
 * default encoding is the wrong one here nearly every time.
 */
function textFrame(id: string, value: string): number[] {
  const body = [0x01, 0xff, 0xfe];
  for (const ch of value) {
    const code = ch.charCodeAt(0);
    body.push(code & 0xff, (code >> 8) & 0xff);
  }
  return [...ascii(id), ...plain(body.length), 0, 0, ...body];
}

/**
 * The picture frame.
 *
 * `type 3` is "front cover", which is the one every player looks for; the
 * others are back covers, booklet pages and the artist's photograph, and a
 * cover filed as one of those is a cover nothing displays.
 *
 * The description is deliberately empty. It is shown by almost nothing and
 * two frames differing only in description is how a file ends up with the
 * same picture twice.
 */
function pictureFrame(mime: string, bytes: Uint8Array): number[] {
  const body = [
    /* Latin-1 for the description, which is empty, so the encoding costs
       nothing and is the one every reader handles. */
    0x00,
    ...ascii(mime), 0x00,
    0x03,
    0x00,
    ...bytes,
  ];
  return [...ascii('APIC'), ...plain(body.length), 0, 0, ...body];
}

export interface About {
  readonly title?: string;
  readonly artist?: string;
}

/**
 * Whether this is an MP3 at all.
 *
 * Checked on the bytes rather than on the name or the mime: a file called
 * `.mp3` that is really a WAV would get a tag it cannot carry, and the
 * result is a file that plays as noise for the first second. Either it
 * already starts with a tag, or it starts with a frame sync.
 */
export function isMp3(bytes: Uint8Array): boolean {
  if (bytes.length < 3) return false;
  if (bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) return true;
  return bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0;
}

/**
 * Where the audio starts, past any tag that is already on the front.
 *
 * A song downloaded, tagged and downloaded again would otherwise carry two
 * tags, and a reader that takes the first one would show the older art for
 * ever.
 */
function audioFrom(bytes: Uint8Array): Uint8Array {
  if (!(bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33)) return bytes;
  const size = ((bytes[6] & 0x7f) << 21)
    | ((bytes[7] & 0x7f) << 14)
    | ((bytes[8] & 0x7f) << 7)
    | (bytes[9] & 0x7f);
  const past = HEADER + size;
  return past < bytes.length ? bytes.subarray(past) : bytes;
}

/**
 * The song, with its cover inside it.
 *
 * Returns the audio unchanged where it is not an MP3, rather than refusing:
 * the caller's job is to hand somebody their song, and a song without its
 * picture is better than no song.
 */
export function withCover(
  audio: Uint8Array,
  art: { readonly bytes: Uint8Array; readonly mime: string } | null,
  about: About = {},
): Blob {
  if (!isMp3(audio)) return new Blob([audio as BlobPart], { type: 'audio/mpeg' });

  const frames: number[] = [];
  if (about.title) frames.push(...textFrame('TIT2', about.title));
  if (about.artist) frames.push(...textFrame('TPE1', about.artist));
  if (art && art.bytes.length) frames.push(...pictureFrame(art.mime, art.bytes));
  if (!frames.length) return new Blob([audio as BlobPart], { type: 'audio/mpeg' });

  const tag = [
    ...ascii('ID3'), 3, 0, 0,
    ...synchsafe(frames.length),
    ...frames,
  ];
  return new Blob(
    [new Uint8Array(tag) as BlobPart, audioFrom(audio) as BlobPart],
    { type: 'audio/mpeg' },
  );
}
