/**
 * What was actually sung, and when.
 *
 * The words on the booth's screen are the words that were *sent* to the music
 * engine. The engine does not promise to sing them: it repeats a line, drops a
 * word, bends a phrase to fit the melody. So the screen has been showing a
 * lyric sheet that is close to, but not the same as, the record — and no
 * amount of moving it about in time fixes a word that is not there.
 *
 * The fix is to stop guessing and ask. ElevenLabs transcribes with a timestamp
 * on every word: POST /v1/speech-to-text, multipart, `file` and `model_id`,
 * `timestamps_granularity` set to word. That gives both halves of the problem
 * at once — the words that were really sung, at the times they were really
 * sung — and it is measured rather than estimated.
 *
 * It is best fed the separated voice. On a full mix a transcriber has drums
 * and bass to argue with; on one voice it has a voice. The booth sends the
 * stem when there is one.
 *
 * The wire format is read off the official SDK's own serialisers. The key
 * stays on the server, which is why this is a route.
 */

import { allowanceFor, callerFrom, metered, recordGeneration } from '@/app/lib/server/account';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const ENDPOINT = 'https://api.elevenlabs.io/v1/speech-to-text';
/** Their newest transcriber, with the older one as a fallback for older plans. */
const MODELS = ['scribe_v2', 'scribe_v1'];
const MAX_BYTES = 25 * 1024 * 1024;

interface Word {
  text?: string;
  start?: number;
  end?: number;
  type?: string;
}

async function ask(key: string, file: Blob, model: string): Promise<Response> {
  const body = new FormData();
  body.append('file', file, 'song.mp3');
  body.append('model_id', model);
  body.append('timestamps_granularity', 'word');
  // Neither helps here: there is one singer, and "(music)" is not a lyric.
  body.append('diarize', 'false');
  body.append('tag_audio_events', 'false');
  return fetch(ENDPOINT, { method: 'POST', headers: { 'xi-api-key': key }, body });
}

export async function POST(request: Request): Promise<Response> {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) {
    return Response.json(
      { error: 'no_key', message: 'Reading the words off a song is not switched on for this app yet.' },
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
    return Response.json({ error: 'too_big', message: 'That song is too long to read.' }, { status: 413 });
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
    // Transcribing costs a fraction of what generating the same length costs.
    // It is still spent against the day's allowance, because it is a call to a
    // paid service and a page that pretends otherwise is how a bill surprises
    // somebody.
    if (caller) {
      const credits = Math.round((seconds / 60) * 40);
      record = () => recordGeneration(caller, 'full', seconds, trackId, request, credits);
    }
  }

  let upstream: Response | null = null;
  let raw = '';
  for (const model of MODELS) {
    try {
      upstream = await ask(key, file, model);
    } catch {
      return Response.json(
        { error: 'unreachable', message: 'Could not reach the music service. Try again in a moment.' },
        { status: 502 },
      );
    }
    if (upstream.ok) break;
    raw = await upstream.text().catch(() => '');
    // Only an argument about the model is worth trying the older one for.
    if (upstream.status !== 422 && upstream.status !== 400) break;
  }

  if (!upstream || !upstream.ok) {
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
    const status = upstream?.status ?? 502;
    const lead =
      status === 401
        ? 'The music service rejected the key'
        : status === 429
          ? 'Out of credits, or too many requests at once'
          : `The music service said no (${status})`;
    return Response.json(
      { error: 'upstream', status, message: theirs ? `${lead}: ${theirs}`.slice(0, 400) : `${lead}.` },
      { status: 502 },
    );
  }

  let heard: { text?: string; words?: Word[] };
  try {
    heard = (await upstream.json()) as { text?: string; words?: Word[] };
  } catch {
    return Response.json(
      { error: 'unreadable', message: 'The transcription came back in a form this app could not read.' },
      { status: 502 },
    );
  }

  const words = (heard.words ?? [])
    // Spacing and audio events are not words somebody sings.
    .filter((word) => (word.type ?? 'word') === 'word' && (word.text ?? '').trim().length > 0)
    .filter((word) => typeof word.start === 'number' && typeof word.end === 'number')
    .map((word) => ({ text: (word.text ?? '').trim(), start: word.start as number, end: word.end as number }));

  if (!words.length) {
    return Response.json(
      { error: 'nothing_heard', message: 'No words could be heard in that song.' },
      { status: 422 },
    );
  }

  if (record) await record().catch(() => undefined);
  return Response.json({ words });
}
