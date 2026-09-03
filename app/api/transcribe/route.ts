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
import { CREDITS, perMinute } from '@/app/lib/credits';
import { billedSeconds } from '@/app/lib/server/audiolen';
import { charge } from '@/app/lib/server/credits';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const ENDPOINT = 'https://api.elevenlabs.io/v1/speech-to-text';
/** Their newest transcriber, with the older one as a fallback for older plans. */
const MODELS = ['scribe_v2', 'scribe_v1'];
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

interface Word {
  text?: string;
  start?: number;
  end?: number;
  type?: string;
  /** Present only when diarisation was asked for. Theirs, e.g. `speaker_0`. */
  speaker_id?: string;
}

/**
 * A run of words from one person, which is what a transcript actually is.
 *
 * Speech-to-text answers with words. A wall of words with a speaker id on each
 * is not something anybody reads — a transcript is turns, and a turn is
 * everything one person said before the other one started. Grouped here rather
 * than in the browser so every reader of this route gets the same shape.
 */
export interface Turn {
  readonly speaker: string;
  readonly start: number;
  readonly end: number;
  readonly text: string;
}

/** One word as this route hands it on: always timed, sometimes attributed. */
interface Timed {
  readonly text: string;
  readonly start: number;
  readonly end: number;
  readonly speaker?: string;
}

function turnsFrom(words: readonly Timed[]): Turn[] {
  const turns: Turn[] = [];
  for (const word of words) {
    // One speaker is the honest default: a file with a single voice comes back
    // with no ids at all, and calling that "unknown" would be worse than
    // calling it the only person in the room.
    const speaker = word.speaker ?? 'speaker_0';
    const last = turns[turns.length - 1];
    if (last && last.speaker === speaker) {
      turns[turns.length - 1] = {
        ...last,
        end: word.end,
        text: `${last.text} ${word.text}`.trim(),
      };
    } else {
      turns.push({ speaker, start: word.start, end: word.end, text: word.text.trim() });
    }
  }
  return turns;
}

async function ask(key: string, file: Blob, model: string, diarize: boolean): Promise<Response> {
  const body = new FormData();
  body.append('file', file, diarize ? 'episode.mp3' : 'song.mp3');
  body.append('model_id', model);
  body.append('timestamps_granularity', 'word');
  /* Asked for, rather than always on or always off.

     A song has one singer and "(music)" is not a lyric, so both of these were
     hard-coded off — right for the booth, which was the only caller. An
     episode is two people talking, and a transcript of a conversation that
     does not say who is speaking is a wall of text nobody reads. Same for
     audio events: a laugh in the middle of an interview is part of what
     happened, and in a lyric sheet it is noise. */
  body.append('diarize', diarize ? 'true' : 'false');
  body.append('tag_audio_events', diarize ? 'true' : 'false');
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
  /** Two or more people talking, rather than one person singing. */
  const diarize = incoming.get('speakers') === 'yes';
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
  // By the minute: their speech-to-text is billed by the hour, and a flat
  // fee turned a long episode into a loss.
  const billed = await billedSeconds(file, seconds, MAX_SECONDS);
  const paid = await charge(request, perMinute(billed, CREDITS.transcribe), 'transcribe');
  if (!paid.ok) return paid.response;

  let raw = '';
  for (const model of MODELS) {
    try {
      upstream = await ask(key, file, model, diarize);
    } catch {
      await paid.refund();
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
    await paid.refund();
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
    // Spacing is never a word. An audio event is, but only where somebody
    // asked for them — see `ask`.
    .filter((word) => {
      const kind = word.type ?? 'word';
      if (!(word.text ?? '').trim()) return false;
      return kind === 'word' || (diarize && kind === 'audio_event');
    })
    .filter((word) => typeof word.start === 'number' && typeof word.end === 'number')
    .map((word) => ({
      text: (word.text ?? '').trim(),
      start: word.start as number,
      end: word.end as number,
      ...(word.speaker_id ? { speaker: word.speaker_id } : {}),
    }));

  if (!words.length) {
    return Response.json(
      { error: 'nothing_heard', message: 'No words could be heard in that song.' },
      { status: 422 },
    );
  }

  if (record) await record().catch(() => undefined);
  /* Words for the booth, which lines them up against a waveform, and turns for
     anybody reading. Both, rather than one or the other, because they are two
     views of the same answer and the second costs a loop. */
  return Response.json({
    words,
    ...(diarize ? { turns: turnsFrom(words), text: heard.text ?? '' } : {}),
  });
}
