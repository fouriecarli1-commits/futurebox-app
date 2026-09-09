/**
 * Talking to ElevenLabs, in one place.
 *
 * Cloning a voice, reading a script in it, restaging a recording in another
 * voice, taking the room out of one, listing what a person has cloned, holding
 * holding two people in conversation, and dubbing a finished episode into
 * another language. The key never leaves the server, which is the reason any of this is
 * a route handler rather than a fetch from a component.
 *
 * The error handling is the part worth reading. An upstream refusal is the only
 * sentence that says what to change — out of credits, key rejected, sample too
 * short, this needs a paid plan — and summarising it into "that did not work"
 * throws away the one useful thing in the response. So their words come back
 * first, and the status number rides along on anything unfamiliar.
 */

import { batches, type Turn } from '../dialogue.ts';
import { noteSpend } from './elevencost.ts';
import { watchEleven } from './spendwatch';
import { joinPcm } from '../pcmwav.ts';

const BASE = 'https://api.elevenlabs.io/v1';

export function configured(): boolean {
  return Boolean(process.env.ELEVENLABS_API_KEY);
}

function key(): string {
  return process.env.ELEVENLABS_API_KEY ?? '';
}

/* ── What ElevenLabs will actually charge ────────────────────────────────── */

/**
 * The bill, read off ElevenLabs rather than worked out from a table.
 *
 * ── Why this exists ──────────────────────────────────────────────────────
 *
 * Carli, standing instruction: "ek wil net hê ons moet konstant in ag neem wat
 * ek alles maandelliks betaal want dit help nie ek maak nie 'n wins nie."
 *
 * Everything we had on that was OUR arithmetic. `docs/KOSTE-EN-WINS.md` models
 * the plans, `plans.ts` holds the credit rates, and `eleven_costs` compares
 * what they charged against what we charged. All of it inferred from the
 * character-cost header, and all of it able to drift from the invoice without
 * anybody noticing.
 *
 * `GET /v1/user/subscription` just tells us. `nextInvoiceCents` is the number
 * ElevenLabs will take; `overage` is money going out beyond the plan RIGHT
 * NOW, which nothing in this app could see before.
 *
 * ── What is deliberately not returned ────────────────────────────────────
 *
 * Their answer carries account fields we have no business passing on. This
 * picks the money and the allowance and drops the rest — the page it feeds is
 * meant to be pasted into a chat, so an allow-list is the only safe shape.
 * `GET /v1/user` carries this same object nested plus the account itself,
 * which is exactly why this asks the narrower endpoint.
 *
 * NOT VERIFIED against the live API — the machine this is written on cannot
 * reach elevenlabs.io. Read off the pages Carli sent. Every field is optional
 * and every number is coerced, so a shape that differs comes back thin rather
 * than throwing.
 */
export interface Bill {
  readonly tier: string | null;
  readonly status: string | null;
  readonly billingPeriod: string | null;
  /** Credits spent this period, and what the plan includes. */
  readonly used: number | null;
  readonly included: number | null;
  /** `used` over `included`, 0-100, or null when either is missing. */
  readonly percent: number | null;
  /** When the allowance refills, as an ISO date. */
  readonly resetsAt: string | null;
  /** Whole days until that, or null. Negative is clamped to 0. */
  readonly resetsInDays: number | null;
  /** Already spent beyond the plan, in the currency they name. */
  readonly overage: { amount: number; currency: string } | null;
  /** What the next invoice comes to, in cents. The answer to her question. */
  readonly nextInvoiceCents: number | null;
  readonly openInvoices: number;
  /**
   * Whether usage-based billing is even switched on. `false` means a run past
   * the allowance FAILS rather than costing money — which is a brake, and
   * worth knowing it is there before somebody turns it off.
   */
  readonly canExceed: boolean | null;
}

function num(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export async function bill(): Promise<{ ok: true; bill: Bill } | Upstream> {
  const response = await fetch(`${BASE}/user/subscription`, {
    headers: { 'xi-api-key': key() },
    /* Their number now, not one from the last deploy. This is money. */
    cache: 'no-store',
  });
  if (!response.ok) return complain(response);
  const body = (await response.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body !== 'object') {
    return { ok: false, status: 502, message: 'The subscription read came back as something other than an answer.' };
  }

  const used = num(body.character_count);
  const included = num(body.character_limit);
  const resetUnix = num(body.next_character_count_reset_unix);
  const resetsAt = resetUnix ? new Date(resetUnix * 1000).toISOString() : null;

  const over = body.current_overage as { amount?: unknown; currency?: unknown } | null | undefined;
  const overAmount = num(over?.amount);
  const invoice = body.next_invoice as { amount_due_cents?: unknown } | null | undefined;
  const open = body.open_invoices;

  return {
    ok: true,
    bill: {
      tier: text(body.tier),
      status: text(body.status),
      billingPeriod: text(body.billing_period),
      used,
      included,
      /* Guarded against a zero allowance rather than reporting Infinity as a
         percentage, which is the kind of thing that reaches a dashboard. */
      percent: used !== null && included !== null && included > 0
        ? Math.round((used / included) * 1000) / 10
        : null,
      resetsAt,
      resetsInDays: resetUnix
        ? Math.max(0, Math.ceil((resetUnix * 1000 - Date.now()) / 86_400_000))
        : null,
      overage: overAmount !== null
        ? { amount: overAmount, currency: text(over?.currency) ?? 'usd' }
        : null,
      nextInvoiceCents: num(invoice?.amount_due_cents),
      openInvoices: Array.isArray(open) ? open.length : body.has_open_invoices === true ? 1 : 0,
      canExceed: typeof body.can_extend_character_limit === 'boolean'
        ? body.can_extend_character_limit
        : null,
    },
  };
}

/**
 * The things worth an eyebrow, in plain sentences.
 *
 * Both of these cost real money and neither is visible anywhere else in the
 * app. Running out mid-month means members' songs start failing; going into
 * overage means an invoice nobody predicted.
 *
 * Eighty per cent is the threshold because it leaves room to act. The date
 * matters as much as the number — 85% with two days to run is fine, 85% with
 * three weeks to run is not, so both go in the sentence and the reader can
 * tell them apart.
 */
export function warningsFor(money: Bill): string[] {
  const said: string[] = [];
  if (money.overage && money.overage.amount > 0) {
    said.push(
      `Already ${money.overage.amount} ${money.overage.currency.toUpperCase()} past the plan this period. That is being spent now, not at renewal.`,
    );
  }
  if (money.percent !== null && money.percent >= 80) {
    const left = money.resetsInDays;
    said.push(
      `${money.percent}% of the plan's credits are gone` +
        (left === null ? '.' : left <= 3 ? `, but it refills in ${left} day(s).` : `, with ${left} days still to run.`),
    );
  }
  if (money.openInvoices > 0) {
    said.push(`${money.openInvoices} invoice(s) are unpaid. Calls start failing when ElevenLabs suspends the account.`);
  }
  if (money.canExceed === false && money.percent !== null && money.percent >= 80) {
    said.push('Usage-based billing is off, so work will FAIL rather than cost extra once the allowance is gone.');
  }
  return said;
}

/**
 * Whether the key is fenced in, asked rather than assumed.
 *
 * ── Why this is a READ and only ever a read ──────────────────────────────
 *
 * The service-accounts surface can create, change and delete API keys. This
 * function does none of that, and nothing in this app ever should:
 *
 *   1. `POST .../api-keys` returns the new key in PLAIN TEXT. That is a
 *      secret, and a secret that passes through this app is a secret in a log.
 *   2. Creating or changing a key changes HER ElevenLabs account, not our
 *      code. That is her decision to make in front of her, not something a
 *      deployment does on a schedule.
 *
 * So: GET, an allow-list on the way out, and the key value itself is not read
 * even if they send one. What comes back answers one question — is the key we
 * are using restricted to what this app needs, and does it have a ceiling on
 * it — because that is what decides whether tightening it is three clicks in
 * their console or a script somebody has to write.
 *
 * A refusal here is not a failure of the page. A normal key may well not be
 * allowed to read the workspace's service accounts, and that answer is worth
 * printing as itself rather than as an error.
 */
export interface KeyGuard {
  readonly name: string | null;
  readonly enabled: boolean | null;
  /** The endpoint list, or null when the key is unrestricted. */
  readonly permissions: readonly string[] | null;
  /** A per-key monthly ceiling, or null when there is none. */
  readonly ceiling: number | null;
  /** CIDR ranges the key works from, or null when it works from anywhere. */
  readonly onlyFrom: readonly string[] | null;
}

export async function keyGuards(): Promise<
  { ok: true; keys: KeyGuard[] } | { ok: false; status: number; message: string }
> {
  const response = await fetch(`${BASE}/service-accounts`, {
    headers: { 'xi-api-key': key() },
    cache: 'no-store',
  });
  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      message:
        response.status === 401 || response.status === 403
          ? 'This key may not read the workspace service accounts, so the restriction cannot be checked from here. The console will show it.'
          : `The service-account read came back ${response.status}.`,
    };
  }
  const body = (await response.json().catch(() => null)) as Record<string, unknown> | null;
  const accounts = Array.isArray(body?.service_accounts) ? body!.service_accounts : [];

  const keys: KeyGuard[] = [];
  for (const account of accounts) {
    const list = (account as { api_keys?: unknown })?.api_keys;
    if (!Array.isArray(list)) continue;
    for (const one of list) {
      if (!one || typeof one !== 'object') continue;
      const record = one as Record<string, unknown>;
      /* Named fields only. Their record carries a key hint and may carry more;
         nothing goes out of here that was not asked for by name. */
      keys.push({
        name: text(record.name),
        enabled: typeof record.is_enabled === 'boolean' ? record.is_enabled : null,
        permissions: Array.isArray(record.permissions)
          ? record.permissions.filter((p): p is string => typeof p === 'string')
          : null,
        ceiling: num(record.character_limit),
        onlyFrom: Array.isArray(record.allowed_ips)
          ? record.allowed_ips.filter((ip): ip is string => typeof ip === 'string')
          : null,
      });
    }
  }
  return { ok: true, keys };
}

/**
 * What ElevenLabs says a call actually cost, off the response itself.
 *
 * ── Why this exists ─────────────────────────────────────────────────────
 *
 * Every price in `lib/credits.ts` is a number somebody worked out from a rate
 * card, and `check:prices` keeps it honest against that card. What neither can
 * do is tell you what a real song, on a real evening, actually cost. Carli:
 * "ek wil net hê ons moet konstant in ag neem wat ek alles maandelliks betaal
 * want dit help nie ek maak nie 'n wins nie."
 *
 * ElevenLabs answers that question on every response. `character-cost` is what
 * they billed; `request-id` and `x-trace-id` are what they ask for when
 * somebody reports a bad generation, and there is no way to get them back
 * afterwards — a request id not read off the response is a request id gone.
 *
 * ── Logged, not stored, and that is on purpose for now ──────────────────
 *
 * One structured line per billable call. Storing it beside the credits charged
 * is the better answer and it needs a column, which is task #111's other half.
 * A line in the log is worth having today: it is the difference between
 * believing a song costs ten credits and knowing.
 *
 * Nothing here can throw. A missing header is an older endpoint or one that
 * does not bill by character, and a cost report is never a reason for a
 * generation to fail.
 */
export function noteCost(response: Response, what: string, credits?: number): void {
  try {
    const cost = response.headers.get('character-cost');
    const request = response.headers.get('request-id');
    const trace = response.headers.get('x-trace-id');
    if (!cost && !request) return;

    const characters = cost ? Number(cost) : null;
    console.log(
      JSON.stringify({
        kind: 'eleven.cost',
        what,
        characters,
        credits: credits ?? null,
        request,
        trace,
        at: new Date().toISOString(),
      }),
    );

    /* The log is for reading one incident. The row is for answering the
       standing question — whether the credit price covers what they bill —
       which needs the two numbers side by side over months, not one line in
       a log that rotates. `credits` is undefined where the caller had no way
       to know, and such a row is left out of the comparison rather than
       counted as free. */
    noteSpend({ what, characters, credits, request });

    /* And look at where the month now stands.

       This is the one funnel every ElevenLabs call already passes through, so
       hooking the warning here is the only version of it that cannot be
       forgotten when a new route is written. Not awaited: the caller is
       holding audio and on its way out, and a letter must never be in front of
       a member's song.

       The row above is written fire-and-forget, so this read can miss the very
       call that crossed the line. That errs low by one generation and the next
       one catches it — the safe direction for a warning, and the same trade
       `usedCredits`'s thirty-second cache already makes. */
    void watchEleven();
  } catch {
    // A header that could not be read is not a reason to fail a generation.
  }
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
export async function cloneVoice(
  name: string,
  sample: Blob,
  /** What the caller charged for this, so the two can be compared later. */
  billed?: number,
): Promise<{ ok: true; voiceId: string } | Upstream> {
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
  noteCost(response, 'clone', billed);
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
  billed?: number,
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
  noteCost(response, 'speak', billed);
  if (!response.ok) return complain(response);
  return { ok: true, audio: await response.arrayBuffer() };
}

/**
 * The same read, streamed instead of waited for.
 *
 * ── Why this matters more than it looks ─────────────────────────────────
 *
 * `speak` above waits for the whole file. A podcast script is not a sentence:
 * ten minutes of speech is a minute of generating, and for that minute the
 * person is looking at a spinner with nothing to judge. If the voice is wrong,
 * they find out after paying for all ten minutes.
 *
 * Their streaming endpoint sends the audio as it is made. The first sound
 * arrives in about a second, and the browser plays it while the rest is still
 * being written.
 *
 * It also takes a real risk off the route. This app runs on functions with a
 * five-minute ceiling; a long read that has not finished generating inside it
 * fails outright and gives back nothing. A response that has already started
 * streaming is a response that has started, and the bytes keep coming.
 *
 * ── The one honest cost ─────────────────────────────────────────────────
 *
 * The status is known before a single byte is sent, so a refusal — no credit,
 * a bad voice, a rate limit — still refunds exactly as it did. What cannot be
 * refunded is a stream that breaks halfway, because by then the answer has
 * been sent and there is nothing left to turn into an error. That is rare, and
 * it is the trade for a read that starts immediately rather than one that can
 * time out having produced nothing at all.
 *
 * The body is handed back rather than read here: reading it into an
 * ArrayBuffer would be the waiting this exists to avoid.
 */
export async function speakStream(
  voiceId: string,
  text: string,
  modelId: string,
  how?: Performance,
  billed?: number,
): Promise<{ ok: true; body: ReadableStream<Uint8Array> } | Upstream> {
  const voiceSettings = settings(how);
  const response = await fetch(
    `${BASE}/text-to-speech/${encodeURIComponent(voiceId)}/stream?output_format=mp3_44100_128`,
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
  /* The cost headers ride on the first response, before any audio — so this
     still records what the read cost even though nothing has been read yet. */
  noteCost(response, 'speak', billed);
  if (!response.ok) return complain(response);
  if (!response.body) {
    return { ok: false, status: 502, message: 'The reading service sent no audio.' };
  }
  return { ok: true, body: response.body };
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
  billed?: number,
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
  noteCost(response, 'voice-change', billed);
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

/**
 * The same episode in another language, in the same voices: their dubbing.
 *
 * POST /v1/dubbing, multipart: `file`, `source_lang`, `target_lang`,
 * `num_speakers`, `watermark`, `drop_background_audio`. It answers with a
 * `dubbing_id` and an `expected_duration_sec`; GET /v1/dubbing/{id} reports
 * `status`, and GET /v1/dubbing/{id}/audio/{lang} hands back the audio once
 * that status is `dubbed`. Field names off the SDK's serialisers.
 *
 * This is the one ElevenLabs feature this app most obviously needs. An episode
 * recorded in Afrikaans reaches an English audience in the host's own voice,
 * and the other way round, which is not a translation feature — it is the same
 * show, twice.
 */
export interface Dub {
  readonly id: string;
  /** Their estimate, in seconds. Worth showing: a long episode is not quick. */
  readonly expected: number;
}

export async function dub(
  audio: Blob,
  sourceLang: string,
  targetLang: string,
  speakers: number,
  billed?: number,
): Promise<{ ok: true; dub: Dub } | Upstream> {
  const form = new FormData();
  form.append('file', audio, 'episode.mp3');
  // Their own convention: zero means work it out from the audio.
  form.append('num_speakers', String(Math.max(0, Math.round(speakers))));
  form.append('target_lang', targetLang);
  if (sourceLang) form.append('source_lang', sourceLang);
  // A watermark belongs on a video somebody might pass off as filmed. This is
  // the host's own show in their own voice, and they are publishing it.
  form.append('watermark', 'false');

  const response = await fetch(`${BASE}/dubbing`, {
    method: 'POST',
    headers: { 'xi-api-key': key() },
    body: form,
  });
  noteCost(response, 'dub', billed);
  if (!response.ok) return complain(response);
  const body = (await response.json()) as { dubbing_id?: string; expected_duration_sec?: number };
  if (!body?.dubbing_id) {
    return { ok: false, status: 502, message: 'The dub was accepted without an id to follow it by.' };
  }
  return { ok: true, dub: { id: body.dubbing_id, expected: Number(body.expected_duration_sec) || 0 } };
}

/** Where a dub has got to. `error` is theirs, and is worth passing on whole. */
export interface DubState {
  readonly status: string;
  readonly done: boolean;
  readonly failed: boolean;
  readonly error?: string;
  readonly languages: readonly string[];
}

export async function dubState(id: string): Promise<{ ok: true; state: DubState } | Upstream> {
  const response = await fetch(`${BASE}/dubbing/${encodeURIComponent(id)}`, {
    headers: { 'xi-api-key': key() },
  });
  if (!response.ok) return complain(response);
  const body = (await response.json()) as {
    status?: string;
    error?: string;
    target_languages?: string[];
  };
  const status = String(body?.status ?? '');
  return {
    ok: true,
    state: {
      status,
      done: status === 'dubbed',
      failed: status === 'failed',
      error: body?.error,
      languages: Array.isArray(body?.target_languages) ? body.target_languages : [],
    },
  };
}

/** The finished dub, in one of the languages it was made in. */
/**
 * The finished dub.
 *
 * The endpoint is called `audio` and does not only return audio: a dub of a
 * video comes back as a video, because what was sent was a video. So the
 * upstream's own content type is carried out with the bytes rather than
 * decided here — this used to be labelled `audio/mpeg` unconditionally, which
 * would have handed somebody an mp4 named as an mp3 the first time a film went
 * through it.
 */
export async function dubbed(
  id: string,
  language: string,
): Promise<{ ok: true; audio: ArrayBuffer; type: string } | Upstream> {
  const response = await fetch(
    `${BASE}/dubbing/${encodeURIComponent(id)}/audio/${encodeURIComponent(language)}`,
    { headers: { 'xi-api-key': key() } },
  );
  if (!response.ok) return complain(response);
  const said = (response.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase();
  /* Only a type this app would have sent in the first place. Anything else —
     an error page that arrived with HTTP 200, say — is treated as the audio it
     was asked for rather than passed on for a browser to decide about. */
  const type = /^(audio|video)\/[a-z0-9.+-]+$/.test(said) ? said : 'audio/mpeg';
  return { ok: true, audio: await response.arrayBuffer(), type };
}

/** The voice without the room: their audio isolation, on a recording. */
export async function isolate(
  audio: Blob,
  billed?: number,
): Promise<{ ok: true; audio: ArrayBuffer } | Upstream> {
  const form = new FormData();
  form.append('audio', audio, 'take.webm');

  const response = await fetch(`${BASE}/audio-isolation`, {
    method: 'POST',
    headers: { 'xi-api-key': key() },
    body: form,
  });
  noteCost(response, 'isolate', billed);
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
  /**
   * How it is described, in a few words: an accent, an age, what it suits.
   *
   * From their `labels`, which is the only thing that makes a list of names
   * choosable. "Rachel" and "Antoni" tell nobody anything; "American, young,
   * narration" tells them enough to pick without spending a credit to find
   * out.
   */
  readonly about?: string;
  /**
   * True where a free sample of this voice can be heard.
   *
   * The URL itself is deliberately not sent to the browser. It is on a storage
   * host that the app's Content-Security-Policy does not allow media from, and
   * widening the policy for a preview would be the wrong trade — the sample is
   * served through `/api/voice/preview` instead, which keeps it same-origin
   * and keeps the key on this side.
   */
  readonly hasSample?: boolean;
}

/** Their preview URLs, kept on the server. See `hasSample` above. */
const samples = new Map<string, string>();

/** The sample for a voice, if the list has been fetched since this process started. */
export function sampleUrlFor(id: string): string | null {
  return samples.get(id) ?? null;
}

/**
 * ElevenLabs' own voices, for people who have not cloned anything.
 *
 * Asked for rather than hard-coded. A voice id copied out of documentation is
 * a string that works until they retire it, and then the free tier fails with
 * a 404 that says nothing to the person reading it.
 *
 * ── Why more than eight, and why the labels ──────────────────────────────
 *
 * This used to take the first eight and send two fields: an id and a name.
 * Eight names with nothing to tell them apart is not a library, it is a
 * lucky dip — the only way to find out what "Antoni" sounds like was to spend
 * credits on a reading and listen to the result.
 *
 * So: their own description, flattened into a phrase, and a flag saying a free
 * sample exists. Forty rather than eight, because the list is filterable now
 * and a longer list stops being a burden the moment it can be searched.
 */
export async function stockVoices(): Promise<StockVoice[]> {
  const response = await fetch(`${BASE}/voices`, { headers: { 'xi-api-key': key() } });
  if (!response.ok) return [];
  const data = (await response.json()) as {
    voices?: Array<{
      voice_id?: string;
      name?: string;
      category?: string;
      preview_url?: string;
      labels?: Record<string, string>;
    }>;
  };
  return (data.voices ?? [])
    .filter((one) => one.category === 'premade' && one.voice_id && one.name)
    .slice(0, 40)
    .map((one) => {
      const id = one.voice_id as string;
      if (one.preview_url) samples.set(id, one.preview_url);
      // Their labels are a small unordered object — accent, age, gender, use
      // case, description. Joined in whatever order they come rather than
      // reordered, because guessing at an order that reads well is guessing.
      const about = Object.values(one.labels ?? {})
        .filter((value) => typeof value === 'string' && value.trim())
        .join(', ')
        .slice(0, 80);
      return {
        id,
        name: one.name as string,
        ...(about ? { about } : {}),
        ...(one.preview_url ? { hasSample: true } : {}),
      };
    });
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

/* ─────────────────────────────────────────────── how much is left ────────
 *
 * The number that decides whether this app works tomorrow.
 *
 * Every voice, every dub, every transcript and every note of music comes out of
 * one ElevenLabs plan, paid monthly, with a hard character ceiling. Run into it
 * and every one of those rooms starts refusing at once — not degrading, not
 * queueing, refusing — and the first anybody knows is a member being told their
 * reading failed.
 *
 * Starting on a small plan is the right call when you do not yet know whether
 * you have customers. It also means the ceiling is close, so knowing where it
 * is stops being a nice-to-have.
 *
 * The shape is theirs: `GET /v1/user/subscription` answers with
 * `character_count` and `character_limit`, and the reset date as a unix second.
 * Read defensively — a field that is missing is reported as unknown rather
 * than as zero, because "zero used" and "could not tell" lead to opposite
 * decisions.
 */

/* `allowanceLeft` and its `Allowance` type used to live here: a second fetch of
   `/user/subscription` that read four fields out of it. `bill()` above reads
   the same answer and eleven more, `/api/watch` was its only caller, and two
   readers of one endpoint is how the letter and the money page end up
   disagreeing about the same account. Removed on 8 September 2026 rather than
   left as the shorter of two truths. */
