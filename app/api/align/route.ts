/**
 * Where the words we already have actually fall.
 *
 * ── The complaint this is aimed at ───────────────────────────────────────
 *
 * "nou beweeg die woorde weer te vinnig", and before that "die woorde beweeg
 * verkeerd". `lib/lyrictime.ts` opens with those and the ladder it built is
 * the answer to them: heard → phrases → sung → spread.
 *
 * The top rung, `heard`, sends the song to `/api/transcribe` and gets back
 * what a transcriber *thinks* was sung, with times. It is exact when it is
 * right. The trouble is that transcription has to solve two problems at once —
 * which words, and when — and on a sung Afrikaans line over a full mix the
 * first one is hard. A mis-heard word is not a timing problem and no amount of
 * timing work fixes it: the screen lights up a word that is not in the song.
 *
 * ── What this does instead ───────────────────────────────────────────────
 *
 * Forced alignment is given the words. It only has to place them.
 *
 *   POST /v1/forced-alignment   (multipart: file, text)
 *     → { characters: [{text, start, end}],
 *         words:      [{text, start, end, loss}],
 *         loss }
 *
 * For a song in somebody's library that is exactly the shape of what we know:
 * they typed the lyrics, or the engine was sent them. The words are not in
 * question. Only the times are.
 *
 * ── The `loss`, which is the part worth having ───────────────────────────
 *
 * It returns a number per word and one for the whole thing. That is the signal
 * the `heard` rung never had: when the words on file do not match what was
 * actually sung — a member typed a different verse, a take is buried in the
 * mix — the alignment is poor and we can *see* that it is poor, instead of
 * drawing confident-looking timings that are wrong.
 *
 * A screen that says "this is exact" and is wrong is worse than one that says
 * "this is a guess" and is roughly right, and until now there was no way to
 * tell those two apart.
 *
 * ── What is not known yet, and is not pretended ──────────────────────────
 *
 * **What ElevenLabs charge for this.** Their page does not say. So the member
 * is charged what a transcription of the same length costs — the thing this
 * replaces — which means nobody is worse off than they are today, and the real
 * number arrives on the first live call: `noteCost` reads `character-cost` off
 * the response and logs it. When that number is known, this charge is revised
 * and `docs/DIENSTE-EN-KOSTE.md` gets the row. Charging nothing until then
 * would leave a paid call with no ceiling on it, which is the one thing this
 * codebase does not do.
 *
 * **What a bad `loss` looks like.** Their scale is undocumented and this
 * machine cannot reach the API to find out. `POOR_LOSS` below is therefore a
 * threshold that has never been checked against a real answer, and it is
 * treated as such: it is not used to refuse anything, only to hand the client
 * a flag it can use to drop a rung. The number itself is always returned, so
 * the first real songs settle it.
 */

import { allowanceFor, callerFrom, metered, recordGeneration } from '@/app/lib/server/account';
import { GENERATION, refuseIfTooMany } from '@/app/lib/server/brake';
import { audioFrom, dropWork } from '@/app/lib/server/workfile';
import { CREDITS, perMinute } from '@/app/lib/credits';
import { billedSeconds } from '@/app/lib/server/audiolen';
import { charge } from '@/app/lib/server/credits';
import { noteCost } from '@/app/lib/server/eleven';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const ENDPOINT = 'https://api.elevenlabs.io/v1/forced-alignment';
/**
 * Their limit is a gigabyte; ours is the platform's.
 *
 * Same 25 MB as `/api/transcribe`, for the same reason: the file arrives
 * through `audioFrom`, and a ceiling this route can actually hold is worth
 * more than one their documentation allows and Vercel refuses.
 */
const MAX_BYTES = 25 * 1024 * 1024;
const MAX_SECONDS = 30 * 60;
/** Longer than any lyric sheet, and short enough not to be a way to post a book. */
const MAX_TEXT = 20_000;

/**
 * Above this, the alignment is treated as not worth trusting.
 *
 * **Never verified.** See the note at the top of this file. It is deliberately
 * generous — a threshold set too tight would throw away good alignments, and
 * the cost of one that is too loose is a screen that says "exact" when it
 * should have said "measured". The raw number goes back on every answer, so
 * this becomes a fact rather than a guess as soon as real songs go through.
 */
const POOR_LOSS = 1;

interface Aligned {
  text?: string;
  start?: number;
  end?: number;
  loss?: number;
}

export async function POST(request: Request): Promise<Response> {
  /* Same brake as every other route that spends money. See `GENERATION`. */
  const flood = refuseIfTooMany('align', request, GENERATION);
  if (flood) return flood;

  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) {
    return Response.json(
      { error: 'no_key', message: 'Lining the words up with the song is not switched on for this app yet.' },
      { status: 503 },
    );
  }

  let incoming: FormData;
  try {
    incoming = await request.formData();
  } catch {
    return Response.json({ error: 'bad_request', message: 'Could not read the request.' }, { status: 400 });
  }

  /* The file itself, or a key to one already in the caller's own folder — the
     4.5 MB wall at the edge is why this is not a plain part. `audioFrom` pins
     the key to whoever's token signed the request. */
  const got = await audioFrom(incoming, request, 'file');
  if ('problem' in got) return got.problem;
  const { audio: file, owner: workOwner } = got;
  if (workOwner) void dropWork(got.key, workOwner, 'wav');

  if (file.size > MAX_BYTES) {
    return Response.json({ error: 'too_big', message: 'That song is too long to line up.' }, { status: 413 });
  }

  const text = String(incoming.get('text') ?? '').trim().slice(0, MAX_TEXT);
  if (!text) {
    /* The whole point of this route is that the words are known. Without them
       there is nothing to align, and the caller wants `/api/transcribe`. */
    return Response.json(
      { error: 'no_words', message: 'There are no words to line up with this song.' },
      { status: 400 },
    );
  }

  const seconds = Number(incoming.get('seconds')) || 0;
  const asked = incoming.get('trackId');
  const trackId = typeof asked === 'string' ? asked : undefined;

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
      const credits = Math.round((seconds / 60) * 40);
      record = () => recordGeneration(caller, 'full', seconds, trackId, request, credits);
    }
  }

  /* Charged as a transcription, because that is the call it replaces and its
     own price is not published. See the note at the top. */
  const billed = await billedSeconds(file, seconds, MAX_SECONDS);
  const paid = await charge(request, perMinute(billed, CREDITS.transcribe), 'align');
  if (!paid.ok) return paid.response;

  let upstream: Response;
  try {
    const body = new FormData();
    body.append('file', file, 'song.wav');
    body.append('text', text);
    upstream = await fetch(ENDPOINT, { method: 'POST', headers: { 'xi-api-key': key }, body });
  } catch {
    await paid.refund();
    return Response.json(
      { error: 'unreachable', message: 'Could not reach the music service. Try again in a moment.' },
      { status: 502 },
    );
  }

  /* What it really cost, off their own response. This is the number that
     settles what to charge, and a request id not read here is one that cannot
     be recovered if somebody reports a bad answer. */
  noteCost(upstream, 'align');

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
      { error: 'upstream', status: upstream.status, message: theirs ? `${lead}: ${theirs}`.slice(0, 400) : `${lead}.` },
      { status: 502 },
    );
  }

  let said: { words?: Aligned[]; loss?: number };
  try {
    said = (await upstream.json()) as { words?: Aligned[]; loss?: number };
  } catch {
    return Response.json(
      { error: 'unreadable', message: 'The alignment came back in a form this app could not read.' },
      { status: 502 },
    );
  }

  const words = (said.words ?? [])
    .filter((one) => (one.text ?? '').trim())
    .filter((one) => typeof one.start === 'number' && typeof one.end === 'number')
    .map((one) => ({
      text: (one.text ?? '').trim(),
      start: one.start as number,
      end: one.end as number,
      ...(typeof one.loss === 'number' ? { loss: one.loss } : {}),
    }));

  if (!words.length) {
    /* Refunded: they were charged for a placement that did not happen. A
       transcription that hears nothing is a different case — there the work
       was done and the answer was "nothing" — but here the words were handed
       over and came back unplaced, which is the service not doing the job. */
    await paid.refund();
    return Response.json(
      { error: 'nothing_aligned', message: 'Those words could not be lined up with this song.' },
      { status: 422 },
    );
  }

  if (record) await record().catch(() => undefined);

  const loss = typeof said.loss === 'number' ? said.loss : null;
  return Response.json({
    words,
    /* Theirs, unrounded and unjudged. The flag beside it is this app's reading
       of it and may be wrong; the number is the thing that is true. */
    loss,
    /* Whether the client should believe it. A poor alignment is not an error —
       the words are still roughly where they belong — so this is a hint to
       drop a rung rather than a refusal. Null loss means they did not say, and
       "they did not say" is not "it is bad": see `/api/live` for the last
       three times that distinction went missing. */
    trust: loss === null ? 'unsaid' : loss <= POOR_LOSS ? 'good' : 'poor',
  });
}
