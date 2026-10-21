/**
 * Google as the second voice: reading aloud and writing down what was said.
 *
 * ── Why this exists ──────────────────────────────────────────────────────
 *
 * The owner, 21 October 2026: *"so lank as wat elevenlabs nie die dienste kan
 * lewer nie gaan ons op google steun totdat ons situasie met elevenlabs
 * verander"* — and then *"Ja, bou die Google rugsteun vir stem en
 * transkripsie."*
 *
 * ElevenLabs is still the first choice for both. This is what answers when
 * they cannot: busy (a 429 that is still a 429 after `suppliers.ts` has asked
 * three times), down (5xx, or no answer at all), switched off (no key), or
 * out of the month's room (`elevenroom.ts`). Google is the supplier this app
 * already has a contract, a key and a spend ceiling with, so it costs no new
 * account and no new agreement.
 *
 * ── What it can and cannot stand in for ──────────────────────────────────
 *
 * - **Reading aloud** — Gemini's speech models, with one of Google's own
 *   voices. NOT a member's cloned voice: that voice exists only at
 *   ElevenLabs, and reading her script in somebody else's voice while she
 *   believes it is her own would be worse than saying "busy". The routes
 *   only come here for a stock voice.
 * - **Writing down what was said** — a Flash model listening to the file.
 *   Its times come per phrase rather than per word, so the words inside a
 *   phrase are spread across it by length. Close enough to light a lyric
 *   line; not as exact as ElevenLabs' per-word times, and said so on the
 *   answer.
 *
 * ── What it is charged at ───────────────────────────────────────────────
 *
 * The member pays exactly what they would have paid ElevenLabs — the charge
 * is taken before either supplier is asked, and nothing is charged twice.
 * Our side of it is counted against Google's `music` ceiling (`googlespend`),
 * the sound engines' month, so it is inside a cap from the first call and
 * needs no new table.
 *
 * ── The model names, and how sure they are ──────────────────────────────
 *
 * Google's docs could not be read from where this was written. The speech
 * ids below are the ones Google publishes for Gemini-TTS; the list is walked
 * the way `flashCall` walks the Flash models — the next is asked only when
 * one answers 404, and a 404 is not billed. Afrikaans is not on Google's
 * first published language list for these voices, so an Afrikaans read here
 * must be listened to before anybody relies on it.
 */

import { addressOf, configured as googleConfigured, flashCall } from './google';
import { enough, note } from './googlespend';

/** Whether Google can stand in at all on this deployment. */
export const backupReady = (): boolean => googleConfigured();

/**
 * Whether an answer from ElevenLabs is one Google should take over.
 *
 * Busy (429) and broken (5xx), and 0 for "nobody answered". A 4xx other than
 * 429 is about the request — a refused script, a bad voice — and another
 * supplier would refuse it too or, worse, read what ElevenLabs would not.
 */
export const fallsBack = (status: number): boolean => status === 0 || status === 429 || status >= 500;

/* ── Reading aloud ─────────────────────────────────────────────────────── */

/** Newest first; the next is asked only when one answers 404. */
export const SPEECH_ORDER: readonly string[] = [
  'gemini-2.5-flash-tts', 'gemini-2.5-flash-preview-tts', 'gemini-2.5-pro-tts',
];

const speechGone = new Set<string>();

/**
 * Google's voice for one of ElevenLabs' stock voices.
 *
 * By what the stock voice says about itself — their labels carry the gender
 * — so a man's voice is not answered by a woman's. Two of each, picked by
 * the id so the same stock voice always gets the same stand-in.
 */
export function voiceFor(stockId: string, about = ''): string {
  const said = about.toLowerCase();
  const pick = (from: readonly string[]): string => {
    let sum = 0;
    for (const one of stockId) sum = (sum + one.charCodeAt(0)) % 997;
    return from[sum % from.length];
  };
  if (/\bfemale\b|\bwoman\b|\bgirl\b/.test(said)) return pick(['Kore', 'Aoede']);
  if (/\bmale\b|\bman\b|\bboy\b/.test(said)) return pick(['Charon', 'Puck']);
  return pick(['Kore', 'Charon']);
}

/**
 * A script cut where a sentence ends, into pieces a speech model reads
 * steadily. A long read in one request drifts and can outlast the request;
 * pieces of about a minute each do neither.
 */
export function piecesOf(text: string, most = 1200): string[] {
  const sentences = text.replace(/\s+/g, ' ').trim().match(/[^.!?…]+[.!?…]+["')\]]*\s*|[^.!?…]+$/g) ?? [];
  const pieces: string[] = [];
  let now = '';
  for (const sentence of sentences) {
    /* One sentence longer than a piece is cut at a space, never mid-word. */
    let rest = sentence;
    while (rest.length > most) {
      const at = rest.lastIndexOf(' ', most);
      const cut = at > most / 2 ? at : most;
      if (now) { pieces.push(now.trim()); now = ''; }
      pieces.push(rest.slice(0, cut).trim());
      rest = rest.slice(cut);
    }
    if ((now + rest).length > most && now) {
      pieces.push(now.trim());
      now = '';
    }
    now += rest;
  }
  if (now.trim()) pieces.push(now.trim());
  return pieces.filter(Boolean);
}

/** Raw 16-bit mono PCM as a WAV file, which every player and editor here opens. */
export function wavOf(pcm: Uint8Array, rate: number): ArrayBuffer {
  const out = new ArrayBuffer(44 + pcm.byteLength);
  const view = new DataView(out);
  const put = (at: number, text: string) => { for (let i = 0; i < text.length; i += 1) view.setUint8(at + i, text.charCodeAt(i)); };
  put(0, 'RIFF');
  view.setUint32(4, 36 + pcm.byteLength, true);
  put(8, 'WAVE');
  put(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, rate, true);
  view.setUint32(28, rate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  put(36, 'data');
  view.setUint32(40, pcm.byteLength, true);
  new Uint8Array(out, 44).set(pcm);
  return out;
}

/** The sound out of a speech answer: every audio part, and the rate it says it is at. */
export function soundIn(body: unknown): { pcm: Uint8Array; rate: number } | null {
  const candidates = (body as { candidates?: unknown })?.candidates;
  if (!Array.isArray(candidates)) return null;
  const chunks: Uint8Array[] = [];
  let rate = 24000;
  for (const one of candidates) {
    const parts = (one as { content?: { parts?: unknown } })?.content?.parts;
    if (!Array.isArray(parts)) continue;
    for (const part of parts) {
      const inline = (part as { inlineData?: { mimeType?: unknown; data?: unknown } })?.inlineData;
      if (!inline || typeof inline.data !== 'string' || !inline.data) continue;
      const said = /rate=(\d+)/.exec(String(inline.mimeType ?? ''));
      if (said) rate = Number(said[1]);
      chunks.push(new Uint8Array(Buffer.from(inline.data, 'base64')));
    }
    if (chunks.length) break;
  }
  if (!chunks.length) return null;
  const length = chunks.reduce((sum, one) => sum + one.byteLength, 0);
  const pcm = new Uint8Array(length);
  let at = 0;
  for (const one of chunks) { pcm.set(one, at); at += one.byteLength; }
  return { pcm, rate };
}

const LANGUAGE_NAMES: Readonly<Record<string, string>> = {
  af: 'Afrikaans', en: 'English', zu: 'isiZulu', xh: 'isiXhosa', st: 'Sesotho', tn: 'Setswana',
  nl: 'Dutch', de: 'German', fr: 'French', es: 'Spanish', pt: 'Portuguese',
};

/**
 * Micro-dollars per character read, rounded up.
 *
 * Google's published Flash speech rate is $10 a million audio tokens out at
 * 25 tokens a second; speech runs at about fifteen characters a second, so a
 * character is about 17 micro-dollars of audio. 20 leaves room for the text
 * going in. A published rate, not an invoice — see `googlespend`.
 */
export const SPEAK_MICROS_PER_CHAR = 20;

export type Backed =
  | { readonly ok: true; readonly audio: ArrayBuffer; readonly model: string }
  | { readonly ok: false; readonly status: number; readonly message: string };

const BUSY = 'The voice service is very busy right now. Try again in a minute.';

/** One piece read by the first speech model that answers. */
async function readPiece(text: string, voice: string, language: string): Promise<{ ok: true; pcm: Uint8Array; rate: number; model: string } | { ok: false; status: number }> {
  const name = LANGUAGE_NAMES[language.toLowerCase().split('-')[0]] ?? '';
  /* An instruction ahead of the words is how these models are told a
     language; the part after the colon is what is read. English needs none. */
  const said = name && name !== 'English' ? `Read this aloud in ${name}, exactly as written: ${text}` : text;
  const order = SPEECH_ORDER.filter((one) => !speechGone.has(one));
  let status = 404;
  for (const model of order.length ? order : SPEECH_ORDER) {
    let response: Response;
    try {
      response = await fetch(addressOf(model, 'generateContent'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GOOGLE_VERTEX_KEY ?? '' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: said }] }],
          generationConfig: {
            responseModalities: ['AUDIO'],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } },
          },
        }),
        signal: AbortSignal.timeout(120_000),
      });
    } catch {
      return { ok: false, status: 0 };
    }
    if (response.status === 404) {
      speechGone.add(model);
      continue;
    }
    if (!response.ok) {
      status = response.status;
      break;
    }
    const sound = soundIn(await response.json().catch(() => null));
    if (!sound) return { ok: false, status: 502 };
    return { ok: true, ...sound, model };
  }
  return { ok: false, status };
}

/**
 * A whole script read by Google, as one WAV.
 *
 * Three pieces at a time — enough to finish a long episode inside the
 * function's ceiling without asking Google for more at once than a person
 * pressing one button deserves.
 */
export async function speakBackup(
  text: string,
  opts: { voice: string; language?: string; owner?: string | null },
): Promise<Backed> {
  if (!backupReady()) return { ok: false, status: 503, message: BUSY };
  const micros = text.length * SPEAK_MICROS_PER_CHAR;
  const refused = await enough('music', micros, opts.owner);
  if (refused) return { ok: false, status: 503, message: BUSY };

  const pieces = piecesOf(text);
  const read: Uint8Array[] = new Array(pieces.length);
  let rate = 24000;
  let model = SPEECH_ORDER[0];
  for (let start = 0; start < pieces.length; start += 3) {
    const batch = await Promise.all(
      pieces.slice(start, start + 3).map((piece) => readPiece(piece, opts.voice, opts.language ?? '')),
    );
    for (let i = 0; i < batch.length; i += 1) {
      const one = batch[i];
      if (!one.ok) {
        /* The member is refunded by the route; what Google read before the
           failure was still read, and the ceiling has to know about it. */
        const done = pieces.slice(0, start).reduce((sum, piece) => sum + piece.length, 0)
          + batch.reduce((sum, other, k) => sum + (other.ok ? pieces[start + k].length : 0), 0);
        await note('music', done * SPEAK_MICROS_PER_CHAR, `${model}:speak`, opts.owner).catch(() => undefined);
        return { ok: false, status: 503, message: BUSY };
      }
      read[start + i] = one.pcm;
      rate = one.rate;
      model = one.model;
    }
  }

  /* A breath between pieces, so a cut at a full stop sounds like one. */
  const gap = new Uint8Array(Math.round(rate * 0.18) * 2);
  const length = read.reduce((sum, one) => sum + one.byteLength, 0) + gap.byteLength * (read.length - 1);
  const pcm = new Uint8Array(length);
  let at = 0;
  read.forEach((one, i) => {
    if (i) { pcm.set(gap, at); at += gap.byteLength; }
    pcm.set(one, at);
    at += one.byteLength;
  });

  await note('music', micros, `${model}:speak`, opts.owner).catch(() => undefined);
  return { ok: true, audio: wavOf(pcm, rate), model };
}

/* ── Writing down what was said ────────────────────────────────────────── */

/**
 * The largest file Google is handed in the request itself. Base64 makes it a
 * third bigger, and the request has a ceiling of its own; past this the
 * route says busy rather than sending something that will be refused.
 */
export const HEAR_MOST_BYTES = 14 * 1024 * 1024;

/**
 * Micro-dollars per second listened to, rounded up.
 *
 * Flash reads audio at 32 tokens a second at about $1 a million, so 32; the
 * answer it writes back is a few words a second. 50 covers both.
 */
export const HEAR_MICROS_PER_SECOND = 50;

export interface HeardWord {
  readonly text: string;
  readonly start: number;
  readonly end: number;
  readonly speaker?: string;
}

export interface Segment {
  readonly start: number;
  readonly end: number;
  readonly text: string;
  readonly speaker?: string;
}

/**
 * Words out of phrases: each phrase's time shared among its words by length.
 *
 * Google gives a time per phrase, not per word. Spreading by length is what
 * a reader's eye does anyway — a long word takes longer to say — and it
 * keeps every word inside the phrase it was really said in, which is the
 * part a lyric line or a transcript turn actually depends on.
 */
export function wordsFromSegments(segments: readonly Segment[]): HeardWord[] {
  const words: HeardWord[] = [];
  for (const one of segments) {
    const parts = one.text.split(/\s+/).map((w) => w.trim()).filter(Boolean);
    if (!parts.length || !(one.end > one.start)) continue;
    const total = parts.reduce((sum, w) => sum + w.length, 0) || 1;
    let at = one.start;
    for (const word of parts) {
      const end = at + ((one.end - one.start) * word.length) / total;
      words.push({
        text: word,
        start: Math.round(at * 1000) / 1000,
        end: Math.round(end * 1000) / 1000,
        ...(one.speaker ? { speaker: one.speaker } : {}),
      });
      at = end;
    }
  }
  return words;
}

/** The phrases out of a listening answer, whatever it wrapped them in. */
export function segmentsIn(body: unknown): Segment[] | null {
  const candidates = (body as { candidates?: unknown })?.candidates;
  if (!Array.isArray(candidates)) return null;
  for (const one of candidates) {
    const parts = (one as { content?: { parts?: unknown } })?.content?.parts;
    if (!Array.isArray(parts)) continue;
    for (const part of parts) {
      const said = (part as { text?: unknown })?.text;
      if (typeof said !== 'string') continue;
      const fenced = /```(?:json)?\s*([\s\S]*?)```/.exec(said);
      let parsed: unknown;
      try { parsed = JSON.parse((fenced ? fenced[1] : said).trim()); } catch { continue; }
      const list = Array.isArray(parsed) ? parsed : (parsed as { segments?: unknown })?.segments;
      if (!Array.isArray(list)) continue;
      const seconds = (value: unknown): number => {
        if (typeof value === 'number') return value;
        /* "1:05.2" as well as 65.2: a model asked for seconds sometimes writes a clock. */
        const clock = /^(?:(\d+):)?(\d+):(\d+(?:\.\d+)?)$/.exec(String(value ?? '').trim());
        if (clock) return Number(clock[1] ?? 0) * 3600 + Number(clock[2]) * 60 + Number(clock[3]);
        return Number(value);
      };
      return list
        .map((row) => row as { start?: unknown; end?: unknown; text?: unknown; speaker?: unknown })
        .map((row) => ({
          start: seconds(row.start),
          end: seconds(row.end),
          text: typeof row.text === 'string' ? row.text.trim() : '',
          ...(typeof row.speaker === 'string' && row.speaker.trim() ? { speaker: row.speaker.trim() } : {}),
        }))
        .filter((row) => row.text && Number.isFinite(row.start) && Number.isFinite(row.end) && row.end > row.start);
    }
  }
  return null;
}

export type HeardBack =
  | { readonly ok: true; readonly words: HeardWord[]; readonly text: string; readonly model: string }
  | { readonly ok: false; readonly status: number; readonly message: string };

/** What was said in a file, by Google, with a time on every word. */
export async function hearBackup(
  file: Blob,
  opts: { seconds: number; speakers: boolean; owner?: string | null },
): Promise<HeardBack> {
  const busy = { ok: false as const, status: 503, message: 'Reading the words is very busy right now. Try again in a minute.' };
  if (!backupReady() || file.size > HEAR_MOST_BYTES) return busy;
  const micros = Math.max(1, Math.round(opts.seconds)) * HEAR_MICROS_PER_SECOND;
  if (await enough('music', micros, opts.owner)) return busy;

  const mime = (file.type || 'audio/mpeg').split(';')[0];
  const data = Buffer.from(await file.arrayBuffer()).toString('base64');
  const ask = opts.speakers
    ? 'Transcribe this recording of people talking. Return JSON: {"segments":[{"start":seconds,"end":seconds,"speaker":"speaker_0","text":"..."}]}. One segment per phrase, in order, times in seconds from the start of the file. Give each distinct voice its own speaker id (speaker_0, speaker_1, ...). Write exactly what is said, in the language it is said in. Do not translate, summarise or add anything.'
    : 'Transcribe the words sung or spoken in this recording. Return JSON: {"segments":[{"start":seconds,"end":seconds,"text":"..."}]}. One segment per line or phrase, in order, times in seconds from the start of the file. Write exactly the words heard, in the language they are in. Do not translate, add, or describe the music.';
  const body = {
    contents: [{ role: 'user', parts: [{ inlineData: { mimeType: mime, data } }, { text: ask }] }],
    generationConfig: { temperature: 0, responseMimeType: 'application/json', maxOutputTokens: 32_000 },
  };

  let answer: { response: Response; model: string };
  try {
    answer = await flashCall((one) => fetch(addressOf(one, 'generateContent'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GOOGLE_VERTEX_KEY ?? '' },
      /* Thinking off where it can be (2.5); a transcript is listening, not reasoning. */
      body: JSON.stringify(one.startsWith('gemini-2.5')
        ? { ...body, generationConfig: { ...body.generationConfig, thinkingConfig: { thinkingBudget: 0 } } }
        : body),
      signal: AbortSignal.timeout(240_000),
    }));
  } catch {
    return busy;
  }
  if (!answer.response.ok) return busy;
  const segments = segmentsIn(await answer.response.json().catch(() => null));
  if (!segments) return { ok: false, status: 502, message: 'The words came back in a form this app could not read.' };
  await note('music', micros, `${answer.model}:transcribe`, opts.owner).catch(() => undefined);
  const words = wordsFromSegments(segments);
  return { ok: true, words, text: segments.map((one) => one.text).join(' ').replace(/\s+/g, ' ').trim(), model: answer.model };
}
