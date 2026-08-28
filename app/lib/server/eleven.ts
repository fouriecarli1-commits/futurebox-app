/**
 * Talking to ElevenLabs, in one place.
 *
 * Four things are called from here — cloning a voice, reading a script in it,
 * taking the room out of a recording, and listing what a person has cloned. The
 * key never leaves the server, which is the reason any of this is a route
 * handler rather than a fetch from a component.
 *
 * The error handling is the part worth reading. An upstream refusal is the only
 * sentence that says what to change — out of credits, key rejected, sample too
 * short, this needs a paid plan — and summarising it into "that did not work"
 * throws away the one useful thing in the response. So their words come back
 * first, and the status number rides along on anything unfamiliar.
 */

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

/** Reads a script aloud. Returns audio bytes, not JSON. */
export async function speak(
  voiceId: string,
  text: string,
  modelId: string,
): Promise<{ ok: true; audio: ArrayBuffer } | Upstream> {
  const response = await fetch(
    `${BASE}/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`,
    {
      method: 'POST',
      headers: { 'xi-api-key': key(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, model_id: modelId }),
    },
  );
  if (!response.ok) return complain(response);
  return { ok: true, audio: await response.arrayBuffer() };
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
