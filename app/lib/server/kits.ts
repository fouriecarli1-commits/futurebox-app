/**
 * Talking to Kits.AI, which is the one service that actually sings.
 *
 * ── Why this file exists ─────────────────────────────────────────────────
 *
 * Everything else in this app that changes whose voice is on a recording runs
 * over `eleven_multilingual_sts_v2` — speech to speech. §A1 of
 * `docs/OPEN-QUESTIONS.md` records what that means on a sung lane: it keeps a
 * melody badly, and the Pro Booth has had a warning on the button saying so.
 * §9 of `docs/DIENSTE-EN-KOSTE.md` called singing conversion the one thing the
 * app promises and cannot deliver.
 *
 * Kits.AI is an RVC service: models trained on a single singer, converting a
 * sung performance rather than a spoken one. Carli chose it on 7 September
 * 2026 and put the key in Vercel.
 *
 * ── What is known here, and what is inferred ─────────────────────────────
 *
 * This matters, because none of it could be checked from this machine —
 * arpeggi.io is blocked here, so every line below is written from what she
 * sent rather than from a request that was actually made.
 *
 * **Known**, from her own curl and Kits' Quick Start page:
 *
 *     POST https://arpeggi.io/api/kits/v1/voice-conversions
 *     Authorization: Bearer <key>
 *     multipart: voiceModelId=<number>, soundFile=@<file>
 *
 * and that every POST that starts a job is a multipart form.
 *
 * **Inferred**: everything about getting the result back. Conversion is a job,
 * not an answer, so there has to be a way to ask how it went; the REST
 * convention for a collection at `/voice-conversions` is `/voice-conversions/
 * <id>`, and that is the only thing worth guessing.
 *
 * So nothing here insists on a field name. The job id is whichever of a small
 * set of names came back, the state is read out of whatever `status` says, and
 * the finished audio is any https URL in the answer that points at an audio
 * file — preferring the full-quality one over a preview when both are there.
 * When none of that fits, `whatCameBack` puts their actual answer in the
 * error, because on the day this first runs against the real service that
 * sentence is the whole debugging session.
 */

const BASE = 'https://arpeggi.io/api/kits/v1';

/** Whether singing conversion is switched on for this deployment. */
export function configured(): boolean {
  return Boolean(process.env.KITS_API_KEY);
}

function key(): string {
  return process.env.KITS_API_KEY ?? '';
}

/**
 * The voice models she has put on the account, named.
 *
 * Kits' own ids are bare numbers — `1014961` — which is not a thing to show
 * anybody. `KITS_VOICE_MODELS` pairs them with names, the same shape the rest
 * of this app uses for a list in an environment variable:
 *
 *     KITS_VOICE_MODELS=1014961=Carli, 1023456=Die koor
 *
 * Unset is not an error. The room then asks for an id and remembers it in the
 * browser, which is the honest fallback for a list this app cannot fetch: a
 * "list your models" endpoint is exactly the kind of thing worth guessing at
 * and getting wrong, and a wrong guess here is an empty picker with no
 * explanation.
 */
export function namedModels(): { id: string; name: string }[] {
  const raw = process.env.KITS_VOICE_MODELS ?? '';
  return raw
    .split(',')
    .map((one) => one.trim())
    .filter(Boolean)
    .map((one) => {
      const at = one.indexOf('=');
      const id = (at === -1 ? one : one.slice(0, at)).trim();
      const name = (at === -1 ? one : one.slice(at + 1)).trim();
      return { id, name: name || id };
    })
    .filter((one) => /^[0-9]{1,20}$/.test(one.id));
}

/**
 * A model id that is safe to put in a URL and in a form.
 *
 * Digits only. Their ids are numeric, and anything else arriving here came
 * from a form rather than from Kits — refused rather than escaped, which is
 * the same rule `lib/server/ownedpath.ts` works under.
 */
export function safeModelId(value: unknown): string | null {
  return typeof value === 'string' && /^[0-9]{1,20}$/.test(value) ? value : null;
}

export interface Upstream {
  /** Always false, so a union with a success case discriminates on it. */
  readonly ok: false;
  readonly status: number;
  /** Their own words where there are any, ours where there are not. */
  readonly message: string;
}

/** Whatever Kits said, dug out of the shapes an error might arrive in. */
async function complain(response: Response): Promise<Upstream> {
  const raw = await response.text().catch(() => '');
  let theirs = '';
  try {
    const parsed = JSON.parse(raw) as {
      message?: unknown;
      error?: unknown;
      detail?: unknown;
      errors?: unknown;
    };
    const first = (value: unknown): string =>
      typeof value === 'string'
        ? value
        : Array.isArray(value)
          ? value.map(first).filter(Boolean).join('; ')
          : value && typeof value === 'object'
            ? ((value as { message?: string }).message ?? '')
            : '';
    theirs =
      first(parsed.message) || first(parsed.error) || first(parsed.detail) || first(parsed.errors);
  } catch {
    theirs = raw.slice(0, 300);
  }

  const known =
    response.status === 401 || response.status === 403
      ? 'The singing service rejected the key'
      : response.status === 402
        ? 'The singing service says this needs a paid plan'
        : response.status === 404
          ? 'The singing service does not know that voice model'
          : response.status === 429
            ? 'The singing service is being asked for too much at once'
            : `The singing service said no (${response.status})`;

  return { ok: false, status: response.status, message: theirs ? `${known}: ${theirs}` : `${known}.` };
}

/** What actually arrived, for an error message, when nothing in it fitted. */
function whatCameBack(value: unknown): string {
  try {
    return JSON.stringify(value).slice(0, 300);
  } catch {
    return String(value).slice(0, 300);
  }
}

/* ── Reading an answer whose exact shape is not known ────────────────────── */

/** Every string in the answer, however deep, with the key it sat under. */
function strings(value: unknown, at = '', found: [string, string][] = [], depth = 0): [string, string][] {
  if (depth > 6 || value === null || value === undefined) return found;
  if (typeof value === 'string') {
    found.push([at, value]);
    return found;
  }
  if (typeof value === 'number') {
    found.push([at, String(value)]);
    return found;
  }
  if (Array.isArray(value)) {
    value.forEach((one, index) => strings(one, `${at}[${index}]`, found, depth + 1));
    return found;
  }
  if (typeof value === 'object') {
    for (const [name, one] of Object.entries(value as Record<string, unknown>)) {
      strings(one, name, found, depth + 1);
    }
  }
  return found;
}

/** The job's id, under whichever of the usual names it arrived. */
export function idIn(value: unknown): string | null {
  const names = ['id', 'jobId', 'job_id', 'conversionId', 'conversion_id', 'voiceConversionId'];
  for (const [name, text] of strings(value)) {
    if (names.includes(name) && /^[A-Za-z0-9_-]{1,64}$/.test(text)) return text;
  }
  return null;
}

/** Where a job has got to. Unknown words count as still running, not as done. */
export type State = 'running' | 'done' | 'failed';

export function stateIn(value: unknown): State {
  for (const [name, text] of strings(value)) {
    if (!/^(status|state|jobStatus|job_status)$/.test(name)) continue;
    const word = text.toLowerCase();
    if (/success|succeed|complete|done|finish|ready/.test(word)) return 'done';
    if (/fail|error|cancel|reject/.test(word)) return 'failed';
    return 'running';
  }
  return 'running';
}

/**
 * The finished audio's address, if the answer carries one.
 *
 * Any https URL in the answer that looks like an audio file. Ranked rather
 * than picked: RVC services return a low-quality preview beside the real one
 * often enough that taking the first URL would quietly hand her the worse
 * file. The input she just uploaded can come back in the same object, so a
 * URL that names the input is skipped.
 */
export function audioUrlIn(value: unknown): string | null {
  let best: string | null = null;
  let bestScore = -1;
  for (const [name, text] of strings(value)) {
    if (!/^https:\/\//i.test(text)) continue;
    let path = '';
    try {
      path = new URL(text).pathname.toLowerCase();
    } catch {
      continue;
    }
    const named = name.toLowerCase();
    if (!/\.(wav|mp3|flac|ogg|m4a|aac)$/.test(path) && !/audio|output|file|url/.test(named)) continue;
    if (/input|source|sound_?file|soundfile|original/.test(named)) continue;
    const score =
      (/output|converted|result/.test(named) ? 4 : 0) +
      (/\.wav$/.test(path) ? 2 : 0) +
      (/lq|low|preview|demo/.test(named) ? -3 : 0);
    if (score > bestScore) {
      best = text;
      bestScore = score;
    }
  }
  return best;
}

/* ── The two requests ────────────────────────────────────────────────────── */

/** Starts a conversion. The shape of this one is hers, not a guess. */
export async function startConversion(
  voiceModelId: string,
  audio: Blob,
  filename: string,
): Promise<{ ok: true; id: string; answer: unknown } | Upstream> {
  const form = new FormData();
  form.append('voiceModelId', voiceModelId);
  form.append('soundFile', audio, filename);

  let response: Response;
  try {
    response = await fetch(`${BASE}/voice-conversions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key()}` },
      body: form,
    });
  } catch {
    return { ok: false, status: 502, message: 'Could not reach the singing service.' };
  }
  if (!response.ok) return complain(response);

  const answer = (await response.json().catch(() => null)) as unknown;
  const id = idIn(answer);
  if (!id) {
    return {
      ok: false,
      status: 502,
      message: `The singing service started the job without saying which one it is: ${whatCameBack(answer)}`,
    };
  }
  return { ok: true, id, answer };
}

/** Asks how a conversion went. The address is the inferred half — see above. */
export async function conversionStatus(
  id: string,
): Promise<{ ok: true; answer: unknown } | Upstream> {
  let response: Response;
  try {
    response = await fetch(`${BASE}/voice-conversions/${encodeURIComponent(id)}`, {
      headers: { Authorization: `Bearer ${key()}` },
    });
  } catch {
    return { ok: false, status: 502, message: 'Could not reach the singing service.' };
  }
  if (!response.ok) return complain(response);
  return { ok: true, answer: (await response.json().catch(() => null)) as unknown };
}

/**
 * Fetches the finished file.
 *
 * The URL comes from Kits' own answer and from nowhere else — never from the
 * form, which is the rule `/api/analyse/part` exists under: a route that
 * fetched any URL handed to it is an open proxy. The key rides along only when
 * the file is on their own host; a signed storage URL should not be shown a
 * bearer token.
 */
export async function fetchResult(
  url: string,
): Promise<{ ok: true; audio: ArrayBuffer; type: string } | Upstream> {
  let host = '';
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') throw new Error('not https');
    host = parsed.hostname.toLowerCase();
  } catch {
    return { ok: false, status: 502, message: 'The singing service answered with an address this app will not open.' };
  }
  const theirs = host === 'arpeggi.io' || host.endsWith('.arpeggi.io');

  let response: Response;
  try {
    response = await fetch(url, theirs ? { headers: { Authorization: `Bearer ${key()}` } } : {});
  } catch {
    return { ok: false, status: 502, message: 'Could not fetch the sung take back.' };
  }
  if (!response.ok) return complain(response);

  const audio = await response.arrayBuffer();
  if (audio.byteLength === 0) {
    return { ok: false, status: 502, message: 'The sung take came back empty.' };
  }
  return {
    ok: true,
    audio,
    type: response.headers.get('content-type') ?? 'audio/wav',
  };
}

/**
 * The whole job: start it, wait for it, fetch it.
 *
 * Waiting inside the request rather than handing the browser a job id. A job
 * id would have to be remembered against whoever started it — another table —
 * or handed out unguarded, and an unguarded id is somebody else's recording
 * for the asking. The route's `maxDuration` bounds the wait instead, and a
 * lane that outlasts it says so plainly and is refunded.
 *
 * @param deadline when to give up, as a `Date.now()` reading.
 */
export async function convert(
  voiceModelId: string,
  audio: Blob,
  filename: string,
  deadline: number,
): Promise<{ ok: true; audio: ArrayBuffer; type: string } | Upstream> {
  const started = await startConversion(voiceModelId, audio, filename);
  if (!started.ok) return started;

  /* The answer to the POST may already carry the file on a short take. */
  let answer: unknown = started.answer;
  let waited = 0;

  for (;;) {
    if (stateIn(answer) === 'failed') {
      return {
        ok: false,
        status: 502,
        message: `The singing service could not convert that take: ${whatCameBack(answer)}`,
      };
    }
    const url = stateIn(answer) === 'done' ? audioUrlIn(answer) : null;
    if (url) return fetchResult(url);

    if (Date.now() >= deadline) {
      return {
        ok: false,
        status: 504,
        message: 'The singing service is still working on that take. Try a shorter piece.',
      };
    }

    /* Every three seconds, easing to ten. A conversion takes about as long as
       the audio does, so hammering it for a four-minute song is a hundred
       requests to be told the same thing. */
    waited += 1;
    const gap = Math.min(10_000, 3_000 + waited * 500);
    await new Promise((wake) => setTimeout(wake, Math.min(gap, Math.max(0, deadline - Date.now()))));

    const asked = await conversionStatus(started.id);
    if (!asked.ok) return asked;
    answer = asked.answer;
  }
}
