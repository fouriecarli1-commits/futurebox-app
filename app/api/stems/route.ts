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
 * ── Kits first, ElevenLabs behind it ─────────────────────────────────────
 *
 * Both services can do this. They are not the same kind of cost:
 *
 *   ElevenLabs  R2,21 a minute out of the $990 plan — the same budget that
 *               caps the whole business at 335 members
 *   Kits.AI     inside a flat R640 a month, with a 400-minute roof that is
 *               currently sitting at zero used
 *
 * So this asks Kits first. Every minute separated there is a minute of music
 * the ElevenLabs plan can serve instead, and the ceiling is what binds — see
 * `docs/OPSIE-E.md`.
 *
 * It is a preference, not a replacement. Kits being down, out of its monthly
 * minutes, or unable to take a particular recording all fall through to
 * ElevenLabs exactly as before, and the member never learns which one answered.
 * The one thing that must not happen is a working feature becoming a broken one
 * to save money.
 *
 * `kitsminutes.ts` already knew about this: its `Kind` has carried `'split'`
 * and `'isolate'` since #109 and nothing had ever written one.
 *
 * The key stays on the server, which is the reason this is a route.
 */

import { noteCost } from '@/app/lib/server/eleven';
import { GENERATION, refuseIfTooMany } from '@/app/lib/server/brake';
import { allowanceFor, callerFrom, metered, recordGeneration } from '@/app/lib/server/account';
import { CREDITS, perMinute } from '@/app/lib/credits';
import { billedSeconds } from '@/app/lib/server/audiolen';
import { charge } from '@/app/lib/server/credits';
import { pick, unzip } from '@/app/lib/server/zip';
import { audioFrom, dropWork } from '@/app/lib/server/workfile';
import { configured as kitsOn, fetchResult, splitStems } from '@/app/lib/server/kits';
import { downloadSeconds, enough, note } from '@/app/lib/server/kitsminutes';

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
 * The longest file this route will charge for.
 *
 * A ceiling rather than a refusal: a length the browser reports could be
 * wrong, and this bounds what a wrong one can cost. Files this app makes
 * itself are WAV and are measured from their own header instead, where
 * nobody's word is taken for it at all.
 */
const MAX_SECONDS = 30 * 60;

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
  /* A retry loop is stopped here, before anything is charged or asked for.
     `GENERATION` explains what these numbers are chosen against: not a
     person, but how fast one address could eat the month's allowance
     before the warning at half of it has time to arrive. */
  const flood = refuseIfTooMany('stems', request, GENERATION);
  if (flood) return flood;

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
  /* Either the song itself, or a key to one the browser already put in its own
     folder in storage.

     Posting it was the only way in, and for anything but a short file it could
     not work: Vercel refuses a request body over about four and a half
     megabytes at the edge, before this route runs, so the twenty-five megabyte
     ceiling below was a promise the platform would never keep and every song
     past the wall came back as a bare 413 with no body. Carli saw the other
     end of that: "klank [kan] nie geseperate ... word nie."

     A key, not a URL — see `lib/server/workfile.ts`. */
  const got = await audioFrom(incoming, request, 'file');
  if ('problem' in got) return got.problem;
  const { audio: file, owner } = got;

  if (file.size > MAX_BYTES) {
    return Response.json({ error: 'too_big', message: 'That song is too long to separate here.' }, { status: 413 });
  }
  const seconds = Number(incoming.get('seconds')) || 0;
  /* Two parts or four.

     Two is the voice and everything else, which is what somebody singing over
     a song needs. Four — voice, drums, bass, and the rest — is what somebody
     rebuilding a mix needs, and it is Kits' `stem-splits` rather than their
     `vocal-separations`.

     Asked for explicitly rather than inferred. A room that quietly returned
     four lanes where two were expected would be a room whose price and whose
     result both changed without anybody saying so. */
  const wantsFour = incoming.get('parts') === 'four';
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

  // By the minute: splitting a twenty-minute recording is twenty times the
  // work of splitting a one-minute one, and was the same price.
  const billed = await billedSeconds(file, seconds, MAX_SECONDS);
  /* Four parts costs twice what two costs, because it *is* twice the work
     downstream: Kits' minutes burn on download and four files of a song are
     four times its length against two. Not a markup — the same margin on
     twice the upstream. See `downloadSeconds` in `kitsminutes.ts`. */
  const ourPrice = perMinute(billed, CREDITS.stems) * (wantsFour ? 2 : 1);
  const paid = await charge(request, ourPrice, 'stems');
  if (!paid.ok) return paid.response;

  /* The scratch file has done its job now the bytes are in hand. Not awaited:
     she is waiting on stems, not on our housekeeping. Moved above the Kits
     attempt so it happens on whichever path answers. */
  if (owner) void dropWork(got.key, owner, 'wav');

  const viaKits = await kitsSplit(file, billed, owner, wantsFour);
  if (viaKits) {
    if (record) await record().catch(() => undefined);
    return viaKits;
  }

  /* Four parts is Kits or nothing.

     ElevenLabs' separation gives the voice and the backing and no more, so
     falling through to it on a four-part ask would hand back two lanes to
     somebody who asked for four and paid for four. A refusal with a reason
     is the honest answer, and the money goes back. */
  if (wantsFour) {
    await paid.refund();
    return Response.json(
      {
        error: 'four_unavailable',
        message:
          'Splitting into four parts needs the Kits service, and it did not answer. Separating the voice from the backing still works.',
      },
      { status: 503 },
    );
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
    await paid.refund();
    return Response.json(
      { error: 'unreachable', message: 'Could not reach the music service. Try again in a moment.' },
      { status: 502 },
    );
  }

  noteCost(upstream, 'stems', ourPrice);
  if (!upstream.ok) {
    await paid.refund();
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

/**
 * The same two stems, from Kits, or null to let ElevenLabs have it.
 *
 * Null rather than an error on every failure path, on purpose: this is the
 * cheaper of two services that can both do the job, and a member should never
 * see a separation fail because the cheaper one was busy. Only the ElevenLabs
 * path below is allowed to refuse.
 *
 * The minutes are written down only after the audio is in hand, matching
 * `note`'s own rule — Kits' minutes burn on download, and a job that returned
 * nothing downloaded nothing.
 */
async function kitsSplit(
  file: Blob,
  seconds: number,
  owner: string | null,
  four = false,
): Promise<Response | null> {
  if (!kitsOn()) return null;
  /* Out of monthly minutes is a fall-through, not a refusal. `enough` writes a
     refusal message for the singing room, where Kits is the only engine; here
     there is another one behind it and the member has no reason to hear about
     an allowance that is not going to stop them. */
  /* Two files come back, each the whole length of the song: the voice and
     the backing. Kits' minutes burn on download, so this job spends twice the
     song — and it used to be checked and written down as once. See
     `downloadSeconds`. */
  /* Two files come back for a voice separation and four for a stem split,
     each the whole length of the song. Kits' minutes burn on download, so the
     four-part job spends twice what the two-part one does — which is exactly
     why this number is passed rather than assumed. */
  const spend = downloadSeconds(seconds, four ? 4 : 2);
  if (await enough(spend)) return null;

  /* Half of this route's own ceiling, so a slow split still leaves ElevenLabs
     time to answer rather than turning a cheap attempt into a timeout. */
  const split = await splitStems(
    file,
    'song.mp3',
    Date.now() + 120_000,
    four ? 'stem-splits' : 'vocal-separations',
  );
  if (!split.ok) return null;

  if (four) {
    /* Every part Kits named, under its own name. Nothing is renamed on the
       way through: "drums" is what they called it and what the lane is
       called, so a room reading four lanes is reading their words and not a
       translation of them.

       Fewer than two is not a split — one file back is the song, and handing
       it over as "stems" would be charging for a copy. */
    const wanted = split.stems.slice(0, 6);
    if (wanted.length < 2) return null;
    const got = await Promise.all(wanted.map((one) => fetchResult(one.url)));
    if (got.some((one) => !one.ok)) return null;

    await note(spend, 'split', owner);

    const out = new FormData();
    wanted.forEach((one, i) => {
      const file_ = got[i];
      if (!file_.ok) return;
      out.append('parts', new Blob([file_.audio], { type: file_.type }), `${one.instrument}.mp3`);
    });
    return new Response(out);
  }

  const vocal = split.stems.find((one) => /vocal|voice|lead|sing/i.test(one.instrument));
  const backing = split.stems.find((one) => one !== vocal);
  if (!vocal || !backing) return null;

  const [gotVocal, gotBacking] = await Promise.all([
    fetchResult(vocal.url),
    fetchResult(backing.url),
  ]);
  if (!gotVocal.ok || !gotBacking.ok) return null;

  await note(spend, 'isolate', owner);

  /* The same two parts under the same two names, so the booth cannot tell
     which service answered — which is the whole point of putting one in front
     of the other. */
  const out = new FormData();
  out.append('vocals', new Blob([gotVocal.audio], { type: gotVocal.type }), 'vocals.mp3');
  out.append('instrumental', new Blob([gotBacking.audio], { type: gotBacking.type }), 'instrumental.mp3');
  return new Response(out);
}
