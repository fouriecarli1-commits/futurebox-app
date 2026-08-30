/**
 * Taking the singer out of a finished song.
 *
 * Two things people asked for turn out to be the same request. One: let me
 * record with the AI voice singing in my ear, because everybody sings better
 * next to somebody already on the note — that is what a choir is — and then
 * take that voice off afterwards so only mine is left. Two: the stave shows no
 * notes on my songs.
 *
 * Both need the vocal on its own. With it, the booth can play the voice as a
 * guide at whatever level you want and keep only the instrumental, and the
 * melody can be read off a single voice — which works, where reading it off a
 * full mix does not (`app/lib/melody.ts` has the numbers).
 *
 * ElevenLabs separates stems: POST /v1/music/stem-separation, multipart, the
 * file under `file` and `stem_variation_id` alongside it, and a zip archive
 * back. That wire format is read off the official SDK's own serialisers, not
 * from memory. Two stems rather than six, because vocal-and-everything-else is
 * the whole question here and it is billed at half the rate of six.
 *
 * The key stays on the server, which is the reason this is a route.
 */

import { allowanceFor, callerFrom, metered, recordGeneration } from '@/app/lib/server/account';
import { pick, unzip } from '@/app/lib/server/zip';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
/** Separation is slow on a long song, and their own docs say so. */
export const maxDuration = 300;

const ENDPOINT = 'https://api.elevenlabs.io/v1/music/stem-separation';
const OUTPUT_FORMAT = 'mp3_44100_128';
/** Vocals and everything else. Six stems costs twice as much and answers nothing extra. */
const VARIATION = 'two_stems_v1';

/** Roughly ten minutes of mp3. Past this something is wrong with the request. */
const MAX_BYTES = 25 * 1024 * 1024;

/**
 * The names to look for inside the archive.
 *
 * Several spellings, because the names inside the zip are not documented
 * anywhere I could reach, and accepting the words every separator has ever
 * used is better than guessing one and breaking on the others.
 */
const VOCAL_WORDS = ['vocal', 'voice', 'lead', 'sing'];
const MUSIC_WORDS = [
  'instrumental',
  'no_vocal',
  'no-vocal',
  'novocal',
  'accompaniment',
  'backing',
  'karaoke',
  'music',
  'other',
];

export async function POST(request: Request): Promise<Response> {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) {
    return Response.json(
      { error: 'no_key', message: 'Separating the voice is not switched on for this app yet.' },
      { status: 503 },
    );
  }

  let incoming: FormData;
  try {
    incoming = await request.formData();
  } catch {
    return Response.json({ error: 'bad_request', message: 'Could not read the request.' }, { status: 400 });
  }
  const file = incoming.get('file');
  if (!(file instanceof Blob) || file.size === 0) {
    return Response.json({ error: 'bad_request', message: 'No audio was sent.' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return Response.json({ error: 'too_big', message: 'That song is too long to separate here.' }, { status: 413 });
  }
  const seconds = Number(incoming.get('seconds')) || 0;
  const asked = incoming.get('trackId');
  const trackId = typeof asked === 'string' ? asked : undefined;

  // Separating costs about half of what generating the same length costs, and
  // it is spent against the same daily allowance. One separation counting as
  // one generation is a round number in the app's favour, and it means there
  // is one limit to explain rather than two.
  let record: (() => Promise<void>) | null = null;
  if (metered()) {
    const caller = await callerFrom(request);
    const allowance = await allowanceFor(caller, request);
    if (!allowance.allowed) {
      return Response.json(
        {
          error: caller ? 'out_of_allowance' : 'signed_out',
          message: allowance.reason,
          usedToday: allowance.usedToday,
          limit: allowance.limit,
        },
        { status: caller ? 402 : 401 },
      );
    }
    if (caller) {
      const credits = Math.round((seconds / 60) * 450);
      record = () => recordGeneration(caller, 'full', seconds, trackId, request, credits);
    }
  }

  const outgoing = new FormData();
  outgoing.append('file', file, 'song.mp3');
  outgoing.append('stem_variation_id', VARIATION);

  let upstream: Response;
  try {
    upstream = await fetch(`${ENDPOINT}?output_format=${OUTPUT_FORMAT}`, {
      method: 'POST',
      headers: { 'xi-api-key': key },
      body: outgoing,
    });
  } catch {
    return Response.json(
      { error: 'unreachable', message: 'Could not reach the music service. Try again in a moment.' },
      { status: 502 },
    );
  }

  if (!upstream.ok) {
    const raw = await upstream.text().catch(() => '');
    let theirs = '';
    try {
      const parsed = JSON.parse(raw) as { detail?: unknown; message?: string };
      const detail = parsed.detail;
      theirs =
        (typeof detail === 'string' ? detail : '') ||
        (detail && typeof detail === 'object'
          ? ((detail as { message?: string }).message ?? JSON.stringify(detail))
          : '') ||
        parsed.message ||
        '';
    } catch {
      theirs = raw.slice(0, 300);
    }
    const lead =
      upstream.status === 401
        ? 'The music service rejected the key'
        : upstream.status === 429
          ? 'Out of credits, or too many requests at once'
          : `The music service said no (${upstream.status})`;
    return Response.json(
      {
        error: 'upstream',
        status: upstream.status,
        message: theirs ? `${lead}: ${theirs}`.slice(0, 400) : `${lead}.`,
      },
      { status: 502 },
    );
  }

  const archive = Buffer.from(await upstream.arrayBuffer());
  const entries = unzip(archive);
  if (!entries.length) {
    // Saying what did come back, because the shape of this response is the one
    // thing about this endpoint that could not be checked from here.
    return Response.json(
      {
        error: 'unreadable',
        message: 'The separated stems came back in a form this app could not open.',
        detail: `${archive.length} bytes, type ${upstream.headers.get('content-type') ?? 'unknown'}, starts ${archive.subarray(0, 4).toString('hex')}`,
      },
      { status: 502 },
    );
  }

  const vocals = pick(entries, VOCAL_WORDS);
  // Whatever is not the voice: matched by name, and failing that, the other
  // one of two entries, because two stems means exactly that.
  const music =
    pick(entries, MUSIC_WORDS) ??
    (entries.length === 2 && vocals ? (entries.find((entry) => entry !== vocals) ?? null) : null);

  if (!vocals || !music) {
    return Response.json(
      {
        error: 'unreadable',
        message: 'The separated stems came back without a voice and a backing in them.',
        detail: entries
          .map((entry) => entry.name)
          .join(', ')
          .slice(0, 300),
      },
      { status: 502 },
    );
  }

  if (record) await record().catch(() => undefined);

  // Sent as two files rather than as base64 in json: the browser reads it back
  // with response.formData() and the audio never has to grow by a third.
  const out = new FormData();
  out.append('vocals', new Blob([new Uint8Array(vocals.bytes)], { type: 'audio/mpeg' }), 'vocals.mp3');
  out.append('instrumental', new Blob([new Uint8Array(music.bytes)], { type: 'audio/mpeg' }), 'instrumental.mp3');
  return new Response(out);
}
