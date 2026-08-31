/**
 * Talking to ElevenLabs, in one place.
 *
 * Cloning a voice, reading a script in it, restaging a recording in another
 * voice, taking the room out of one, listing what a person has cloned, holding
 * and holding two people in conversation. The key never leaves the server, which is the reason any of this is
 * a route handler rather than a fetch from a component.
 *
 * The error handling is the part worth reading. An upstream refusal is the only
 * sentence that says what to change — out of credits, key rejected, sample too
 * short, this needs a paid plan — and summarising it into "that did not work"
 * throws away the one useful thing in the response. So their words come back
 * first, and the status number rides along on anything unfamiliar.
 */

import { batches, type Turn } from '../dialogue.ts';
import { joinPcm } from '../pcmwav.ts';

const BASE = 'https://api.elevenlabs.io/v1';

export function configured(): boolean {
  return Boolean(process.env.ELEVENLABS_API_KEY);
}

function key(): string {
  return process.env.ELEVENLABS_API_KEY ?? '';
}

export interface Upstream {
  /** Always false, so a union with a success case discriminates on it. */
  readonly ok: false;
  readonly status: number;
  /** Their own words, as close to verbatim as the shape allows. */
  readonly message: string;
}

/**
 * Whatever ElevenLabs said, dug out of the several shapes they say it in.
 *
 * FastAPI answers with `detail` as a string, as an object with a message, or
 * as an array of validation errors. Anything else falls back to the raw body,
 * truncated, which is still more useful than a bucket name.
 */
export async function complain(response: Response): Promise<Upstream> {
  const raw = await response.text().catch(() => '');
  let theirs = '';
  try {
    const parsed = JSON.parse(raw) as {
      detail?: unknown;
      message?: string;
      error?: { message?: string };
    };
    const detail = parsed.detail;
    theirs =
      (typeof detail === 'string' ? detail : '') ||
      (Array.isArray(detail)
        ? detail.map((one) => (one as { msg?: string }).msg ?? '').filter(Boolean).join('; ')
        : '') ||
      (detail && typeof detail === 'object'
        ? ((detail as { message?: string }).message ?? JSON.stringify(detail))
        : '') ||
      parsed.message ||
      parsed.error?.message ||
      '';
  } catch {
    theirs = raw.slice(0, 300);
  }

  const known =
    response.status === 401
      ? 'The voice service rejected the key.'
      : response.status === 402
        ? 'This needs a paid ElevenLabs plan.'
        : response.status === 429
          ? 'Out of voice credits, or too many requests at once.'
          : '';

  const lead = (known || `The voice service said no (${response.status})`).replace(/\.$/, '');
  return { ok: false, status: response.status, message: theirs ? `${lead}: ${theirs}` : `${lead}.` };
}

/** A voice made from recordings of one person, kept on the app's account. */
export async function cloneVoice(name: string, sample: Blob): Promise<
  { ok: true; voiceId: string } | Upstream
> {
  const form = new FormData();
  form.append('name', name);
  // The field is repeated for several samples; one good one is enough for an
  // instant clone and is all this app ever sends.
  form.append('files', sample, 'sample.webm');
  // Their own cleanup on the way in, which matters more here than anywhere:
  // a clone learns the room as readily as it learns the voice.
  form.append('remove_background_noise', 'true');

  const response = await fetch(`${BASE}/voices/add`, {
    method: 'POST',
    headers: { 'xi-api-key': key() },
    body: form,
  });
  if (!response.ok) return complain(response);

  const data = (await response.json()) as { voice_id?: string };
  if (!data.voice_id) {
    return { ok: false, status: 502, message: 'The voice service answered without a voice id.' };
  }
  return { ok: true, voiceId: data.voice_id };
}

/**
 * How a voice is performed, rather than which voice it is.
 *
 * These are the four dials ElevenLabs' own screen puts next to a voice, and
 * the difference between "a voice" and "this voice, read like this". Leaving
 * them out meant every read came back at whatever the defaults happened to be,
 * which for a podcast is the difference between a presenter and a announcement.
 */
export interface Performance {
  /** 0–1. Low is more expressive and less predictable; high is steady, and flat. */
  readonly stability?: number;
  /** 0–1. How closely it holds to the original speaker. */
  readonly similarity?: number;
  /** 0–1. How far it pushes the speaker's own manner. Costs latency above zero. */
  readonly style?: number;
  /** Below 1 is slower, above is faster. */
  readonly speed?: number;
  readonly speakerBoost?: boolean;
}

/** Their field names, from the SDK's own serialisers rather than memory. */
function settings(how?: Performance): Record<string, unknown> | undefined {
  if (!how) return undefined;
  const out: Record<string, unknown> = {};
  if (typeof how.stability === 'number') out.stability = how.stability;
  if (typeof how.similarity === 'number') out.similarity_boost = how.similarity;
  if (typeof how.style === 'number') out.style = how.style;
  if (typeof how.speed === 'number') out.speed = how.speed;
  if (typeof how.speakerBoost === 'boolean') out.use_speaker_boost = how.speakerBoost;
  return Object.keys(out).length ? out : undefined;
}

/** Reads a script aloud. Returns audio bytes, not JSON. */
export async function speak(
  voiceId: string,
  text: string,
  modelId: string,
  how?: Performance,
): Promise<{ ok: true; audio: ArrayBuffer } | Upstream> {
  const voiceSettings = settings(how);
  const response = await fetch(
    `${BASE}/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`,
    {
      method: 'POST',
      headers: { 'xi-api-key': key(), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        model_id: modelId,
        ...(voiceSettings ? { voice_settings: voiceSettings } : {}),
      }),
    },
  );
  if (!response.ok) return complain(response);
  return { ok: true, audio: await response.arrayBuffer() };
}

/**
 * The same words, in a different voice: their speech-to-speech.
 *
 * A recording goes up and comes back performed by the chosen voice, with the
 * timing and the phrasing of whoever actually said it. For a podcast that is
 * the useful direction — a host who does not like the sound of their own
 * voice keeps their delivery and loses their tone, and a story can be read by
 * several people who are all one person.
 *
 * POST /v1/speech-to-speech/{voice_id}, multipart, `audio` alongside
 * `model_id`, `voice_settings` and `remove_background_noise`. Read off the
 * SDK's serialisers.
 */
export async function restage(
  voiceId: string,
  audio: Blob,
  modelId: string,
  how?: Performance,
  removeNoise = false,
): Promise<{ ok: true; audio: ArrayBuffer } | Upstream> {
  const form = new FormData();
  form.append('audio', audio, 'take.webm');
  form.append('model_id', modelId);
  const voiceSettings = settings(how);
  if (voiceSettings) form.append('voice_settings', JSON.stringify(voiceSettings));
  if (removeNoise) form.append('remove_background_noise', 'true');

  const response = await fetch(
    `${BASE}/speech-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`,
    { method: 'POST', headers: { 'xi-api-key': key() }, body: form },
  );
  if (!response.ok) return complain(response);
  return { ok: true, audio: await response.arrayBuffer() };
}

/**
 * Two people talking: their text-to-dialogue.
 *
 * POST /v1/text-to-dialogue, JSON, `inputs` as a list of `{ text, voice_id }`
 * with `model_id`, `language_code`, `settings`, `seed` and
 * `apply_text_normalization` alongside; `output_format` on the query string.
 * Read off the SDK's serialisers, not remembered.
 *
 * The difference between this and calling text-to-speech twice is that the
 * speakers hear each other. One request is one conversation, and the model
 * puts the second person's answer where an answer goes.
 *
 * Which is exactly why the joins matter. Their own limit is 2,000 characters
 * per request, so an episode is several requests, and across a join the model
 * does not know how the last one ended. `app/lib/dialogue.ts` makes those joins
 * as rare as the limit allows and puts them between turns.
 *
 * PCM rather than MP3, deliberately: several MP3 streams stuck together leave a
 * seam and a header that lies about the length. Several runs of PCM stuck
 * together are one longer run. 24kHz because their note says 44.1kHz PCM is a
 * Pro-tier format, and speech does not need it.
 */
export const DIALOGUE_RATE = 24000;
/** Their newest, with the one before it as a fallback for older plans. */
const DIALOGUE_MODELS = ['eleven_v3', 'eleven_multilingual_v2'];

export interface Spoken {
  readonly pcm: Uint8Array;
  readonly rate: number;
  /** How many requests it took, so the screen can say what it is waiting on. */
  readonly requests: number;
  readonly model: string;
}

async function sayTurns(
  turns: readonly Turn[],
  modelId: string,
  languageCode?: string,
): Promise<Response> {
  return fetch(`${BASE}/text-to-dialogue?output_format=pcm_${DIALOGUE_RATE}`, {
    method: 'POST',
    headers: { 'xi-api-key': key(), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      inputs: turns.map((turn) => ({ text: turn.text, voice_id: turn.voiceId })),
      model_id: modelId,
      ...(languageCode ? { language_code: languageCode } : {}),
      apply_text_normalization: 'auto',
    }),
  });
}

export async function converse(
  turns: readonly Turn[],
  languageCode?: string,
): Promise<{ ok: true; spoken: Spoken } | Upstream> {
  const parts = batches(turns);
  if (parts.length === 0) {
    return { ok: false, status: 400, message: 'There is nothing for anybody to say.' };
  }

  const pieces: Uint8Array[] = [];
  let model = DIALOGUE_MODELS[0];
  for (let at = 0; at < parts.length; at += 1) {
    let response = await sayTurns(parts[at], model, languageCode);
    // Only the first request tries the fallback. Once one has been accepted,
    // a later refusal is about the words in it, not about the model — and
    // switching models mid-episode would change the voices halfway through.
    if (!response.ok && at === 0 && model === DIALOGUE_MODELS[0]) {
      model = DIALOGUE_MODELS[1];
      response = await sayTurns(parts[at], model, languageCode);
    }
    if (!response.ok) return complain(response);
    pieces.push(new Uint8Array(await response.arrayBuffer()));
  }

  return {
    ok: true,
    spoken: { pcm: joinPcm(pieces), rate: DIALOGUE_RATE, requests: parts.length, model },
  };
}

/** The voice without the room: their audio isolation, on a recording. */
export async function isolate(audio: Blob): Promise<{ ok: true; audio: ArrayBuffer } | Upstream> {
  const form = new FormData();
  form.append('audio', audio, 'take.webm');

  const response = await fetch(`${BASE}/audio-isolation`, {
    method: 'POST',
    headers: { 'xi-api-key': key() },
    body: form,
  });
  if (!response.ok) return complain(response);
  return { ok: true, audio: await response.arrayBuffer() };
}

/** Removes a clone from the account, for when somebody withdraws consent. */
export async function forgetVoice(voiceId: string): Promise<boolean> {
  const response = await fetch(`${BASE}/voices/${encodeURIComponent(voiceId)}`, {
    method: 'DELETE',
    headers: { 'xi-api-key': key() },
  });
  return response.ok;
}

export interface StockVoice {
  readonly id: string;
  readonly name: string;
}

/**
 * One of ElevenLabs' own voices, for people who have not cloned anything.
 *
 * Asked for rather than hard-coded. A voice id copied out of documentation is
 * a string that works until they retire it, and then the free tier fails with
 * a 404 that says nothing to the person reading it.
 */
export async function stockVoices(): Promise<StockVoice[]> {
  const response = await fetch(`${BASE}/voices`, { headers: { 'xi-api-key': key() } });
  if (!response.ok) return [];
  const data = (await response.json()) as {
    voices?: Array<{ voice_id?: string; name?: string; category?: string }>;
  };
  return (data.voices ?? [])
    .filter((one) => one.category === 'premade' && one.voice_id && one.name)
    .map((one) => ({ id: one.voice_id as string, name: one.name as string }))
    .slice(0, 8);
}

/**
 * A sound of your own: their music finetunes.
 *
 * Training takes a handful of finished tracks and comes back with a model that
 * generates in that sound. It runs for five or ten minutes on their side, so
 * nothing here waits for it — creating returns immediately with a status, and
 * the screen asks again later.
 *
 * The wire names below are read from their own published package (the
 * multipart fields are `name`, `primary_genre`, repeated `files` and `tags`,
 * `visibility`, `model_id`), not from memory. Visibility is always private:
 * a workspace finetune would be visible to every other person on this app's
 * single ElevenLabs account, which is precisely what must not happen.
 */
export interface Finetune {
  readonly id: string;
  readonly name: string;
  readonly genre: string;
  /** pending | in_progress | completed | failed | blocked. */
  readonly status: string;
  /** 0 to 1. */
  readonly progress: number;
  /** Set when it failed or was blocked — copyright_violation among them. */
  readonly why?: string;
}

/** Their shape, flattened to ours, so nothing downstream reads snake_case. */
function toFinetune(row: Record<string, unknown>): Finetune {
  return {
    id: String(row.id ?? ''),
    name: String(row.name ?? ''),
    genre: String(row.primary_genre ?? ''),
    status: String(row.status ?? 'pending'),
    progress: typeof row.training_progress === 'number' ? row.training_progress : 0,
    why: typeof row.failure_reason === 'string' ? row.failure_reason : undefined,
  };
}

export async function createFinetune(
  name: string,
  genre: string,
  files: readonly { blob: Blob; filename: string }[],
  modelId: string,
): Promise<{ ok: true; finetune: Finetune } | Upstream> {
  const form = new FormData();
  form.append('name', name);
  form.append('primary_genre', genre);
  for (const file of files) form.append('files', file.blob, file.filename);
  form.append('visibility', 'private');
  form.append('model_id', modelId);

  const response = await fetch(`${BASE}/music/finetunes`, {
    method: 'POST',
    headers: { 'xi-api-key': key() },
    body: form,
  });
  if (!response.ok) return complain(response);

  const data = (await response.json()) as Record<string, unknown>;
  if (!data.id) {
    return { ok: false, status: 502, message: 'The music service answered without a finetune id.' };
  }
  return { ok: true, finetune: toFinetune(data) };
}

/**
 * Where one has got to.
 *
 * Asked one at a time rather than listing everything: the list on their side
 * is every finetune on the app's account, and walking it to find one person's
 * is both slower and a way to hand somebody a row that is not theirs.
 */
export async function finetuneStatus(id: string): Promise<Finetune | null> {
  const response = await fetch(`${BASE}/music/finetunes/${encodeURIComponent(id)}`, {
    headers: { 'xi-api-key': key() },
  });
  if (!response.ok) return null;
  return toFinetune((await response.json()) as Record<string, unknown>);
}

/** Removes a finetune from the account, for when somebody deletes theirs. */
export async function dropFinetune(id: string): Promise<boolean> {
  const response = await fetch(`${BASE}/music/finetunes/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: { 'xi-api-key': key() },
  });
  return response.ok;
}
