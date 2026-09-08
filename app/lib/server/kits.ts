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
 * Which of the three files a caller wants back.
 *
 * A conversion of a whole song comes back three ways, and picking wrongly is
 * not a small mistake: `recombinedAudioFileUrl` is the new voice put back over
 * the music, and `outputFileUrl` is the bare voice with the music gone. Hand
 * somebody the second when they asked to hear their song, and the answer is a
 * dry acapella they did not ask for.
 *
 *   · `mix`   — "sing my song in my voice". The music comes back with it.
 *   · `voice` — a lane in the Pro Booth, which already has the music on its
 *               own lanes and wants only the voice.
 */
export type Want = 'mix' | 'voice';

/**
 * The finished audio's address, read off the fields Kits documents.
 *
 * ── What is now known, and what this replaces ────────────────────────────
 *
 * This used to be a scan of every https URL in the answer, scored by what its
 * field was called, because nothing about their answer had ever been seen.
 * Carli sent the Inference Job type on 8 September 2026 and the guessing is
 * over. An inference job carries:
 *
 *     outputFileUrl           the converted audio
 *     lossyOutputFileUrl      the same thing, smaller and worse
 *     recombinedAudioFileUrl  the converted voice back over the music
 *
 * The scan had a fault worth recording. It scored a field name containing
 * "output" at four, and `lossyOutputFileUrl` contains "output" — so the good
 * file and the lossy one tied, and a tie went to whichever came first in their
 * JSON. The penalty it did have was for `lq|low|preview|demo`, and "lossy" is
 * none of those. It could have handed her the worse file on a paid plan,
 * silently, and the only way anybody would have known is by listening.
 *
 * All three expire four hours after the job finishes, which is why nothing
 * here stores one: `fetchResult` is called immediately and the bytes are kept,
 * not the address.
 *
 * The scan is still here, underneath, for an answer shaped in some way this
 * does not expect. It never runs when a documented field is present.
 */
export function outputIn(value: unknown, want: Want = 'voice'): string | null {
  const record = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>;
  const at = (name: string): string | null => {
    const found = record[name];
    return typeof found === 'string' && /^https:\/\//i.test(found) ? found : null;
  };
  const order = want === 'mix'
    ? ['recombinedAudioFileUrl', 'outputFileUrl', 'lossyOutputFileUrl']
    : ['outputFileUrl', 'recombinedAudioFileUrl', 'lossyOutputFileUrl'];
  for (const name of order) {
    const found = at(name);
    if (found) return found;
  }
  return audioUrlIn(value);
}

/**
 * The same question asked of an answer whose shape is not one of theirs.
 *
 * Kept as the fallback under `outputIn`, and kept exported because it is what
 * `check:sing` exercises. Any https URL that looks like audio, ranked rather
 * than taken first — an RVC service returns a preview beside the real thing
 * often enough that the first URL is a coin toss, and the file that was just
 * uploaded can come back in the same object.
 *
 * "lossy" is a penalty now. It was not, and that was the fault above.
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
      (/output|converted|result|recombined/.test(named) ? 4 : 0) +
      (/\.wav$/.test(path) ? 2 : 0) +
      (/lossy|lq|low|preview|demo/.test(named) ? -6 : 0);
    if (score > bestScore) {
      best = text;
      bestScore = score;
    }
  }
  return best;
}

/**
 * The stems out of a separation job, by instrument.
 *
 * Their Vocal Separation Job carries `stemFileUrls` as `{ instrument, url }`,
 * with a `lossyStemFileUrls` beside it and a deprecated `backingAudioFileUrl`
 * their own documentation says to stop using — the backing track is a stem
 * named "backing" now.
 *
 * Nothing calls this yet. It is here because the shape is known today and will
 * not be known any better later, and because the room that needs it — the Pro
 * Booth, which splits a lane over Music.ai per use — is the one place moving
 * to Kits saves money rather than adding a feature.
 *
 * ── CONFIRMED against a real job, 8 September 2026 ─────────────────────────
 *
 * This was written off their documentation. Carli's account had one finished
 * stem split on it, and `/api/kits/setup` read its field names back:
 *
 *     id, createdAt, type, status, jobStartTime, jobEndTime,
 *     backingAudioFileUrl, vocalAudioFileUrl, lossyVocalAudioFileUrl,
 *     stemFileUrls, lossyStemFileUrls
 *
 * Every field this function reaches for is there, spelled the way it is
 * spelled here. So is `status`, which `stateIn` reads, and `id`, which `idIn`
 * reads. Three guesses, all three right — recorded because next time they
 * might not be, and because "we checked" is worth more than "it looks right".
 *
 * Three fields are real and unused: `type` (which format the split came back
 * in) and `jobStartTime`/`jobEndTime`. The last two are the ones to remember —
 * they are how long the job actually took, which is a better number to charge
 * the minute counter than the estimate it makes today. See task #100.
 *
 * And the limit of what was learned: `voice-conversions`, `vocal-separations`
 * and `voice-blender` were all EMPTY on her account, so they returned no field
 * names at all. Those three endpoints are proven to exist and to accept her
 * key; their record shapes are still documentation, not observation. The first
 * real job through each is what settles them.
 */
export function stemsIn(value: unknown): { instrument: string; url: string }[] {
  const record = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>;
  const list = Array.isArray(record.stemFileUrls)
    ? record.stemFileUrls
    : Array.isArray(record.lossyStemFileUrls)
      ? record.lossyStemFileUrls
      : [];
  const found: { instrument: string; url: string }[] = [];
  for (const one of list) {
    if (!one || typeof one !== 'object') continue;
    const stem = one as { instrument?: unknown; url?: unknown };
    if (typeof stem.instrument !== 'string' || typeof stem.url !== 'string') continue;
    if (!/^https:\/\//i.test(stem.url)) continue;
    found.push({ instrument: stem.instrument, url: stem.url });
  }
  /* The bare voice as a stem too, so a caller asking for "vocals" gets it
     whichever field it arrived in. */
  if (typeof record.vocalAudioFileUrl === 'string' && /^https:\/\//i.test(record.vocalAudioFileUrl)
      && !found.some((one) => /vocal/i.test(one.instrument))) {
    found.unshift({ instrument: 'vocals', url: record.vocalAudioFileUrl });
  }
  return found;
}

export const CANDIDATES = [
  /* Their documentation's own contents page, 8 September 2026. Five APIs and
     no more:

         Voice Conversion API   — list, fetch one by id, create a job
         Voice Model API
         Vocal Separations API
         Stem Splitter API
         Voice Blender API

     That is the whole reachable surface, and it settles what "use everything
     Kits has" can mean. Harmonies, Lead Vocals, AI Mastering, AI Vocal Repair,
     Key and BPM Finder and the Voice Designer are on their website and not in
     their API — see `docs/KITS-KAART.md`, which now says which is which.

     The four names below the documented five are the account itself. They are
     not in the contents page either, but a plan with a four-hundred-minute
     ceiling has to have a number somewhere, and one request each is a cheap
     way to find out.

     ── ASKED, AND ANSWERED. There is no account API. ──────────────────────

     Carli ran this against the live account on 8 September 2026. All four
     answered **200 with 5925 bytes of text/html** — their website's own page,
     the same body for all four. Not a 404, which is the trap: a status check
     alone would have reported four working endpoints and this file would now
     be parsing a marketing page for a minute count.

     The content-type guard in `probe` below is the only reason that is
     legible, and it earned its keep here. Keep it.

     What follows from it, and it is not small: **Kits will never tell us how
     many of the 400 minutes are gone.** `kitsminutes.ts` counting what this
     app itself spent is not a stopgap until a real endpoint turns up — it is
     the only brake there is ever going to be, and `supabase/kits.sql` is what
     makes it work. A member converting on kits.ai directly is spending minutes
     we cannot see, so the two numbers drift apart by design; her dashboard is
     the authority and ours is the brake.

     These four stay in the list rather than being deleted. One request each,
     nine in total, and if Kits ever ships an account endpoint this page is
     where it shows up. A candidate that has been answered is still worth
     asking. */
  'voice-conversions',
  'voice-models',
  'vocal-separations',
  'stem-splits',
  'voice-blender',

  /* What is left of the month. */
  'user',
  'me',
  'account',
  'usage',
] as const;

/**
 * What one candidate answers, described rather than dumped.
 *
 * The shape, not the content: how many, and what the fields of one of them are
 * called. That is what is needed to wire an endpoint, and it keeps somebody
 * else's audio and account details out of a page that gets pasted into a chat.
 */
export async function probe(path: string): Promise<{
  path: string;
  status: number;
  count?: number;
  fields?: string[];
  note?: string;
}> {
  let response: Response;
  try {
    response = await fetch(`${BASE}/${path}`, { headers: { Authorization: `Bearer ${key()}` } });
  } catch {
    return { path, status: 0, note: 'could not be reached' };
  }
  if (!response.ok) {
    const raw = await response.text().catch(() => '');
    return { path, status: response.status, note: raw.slice(0, 160) };
  }

  /* A 200 is not the same as an endpoint.
     Their website answers an unknown path with a page, and a page parses as
     no JSON at all — which the first version reported as `status 200, fields
     []`, indistinguishable from a real endpoint that happens to be empty. Nine
     of the thirteen candidates came back looking real that way. What tells
     them apart is the content type and whether the body is JSON at all. */
  const type = response.headers.get('content-type') ?? '';
  const raw = await response.text().catch(() => '');
  if (!/json/i.test(type)) {
    return {
      path,
      status: response.status,
      note: `not an endpoint — answered ${type || 'an unknown type'}, ${raw.length} bytes`,
    };
  }
  let answer: unknown = null;
  try {
    answer = JSON.parse(raw) as unknown;
  } catch {
    return { path, status: response.status, note: 'answered something that is not JSON' };
  }
  const list = Array.isArray(answer)
    ? answer
    : Array.isArray((answer as { data?: unknown })?.data)
      ? ((answer as { data: unknown[] }).data)
      : null;
  if (list) {
    const first = list[0];
    return {
      path,
      status: response.status,
      count: list.length,
      fields: first && typeof first === 'object' ? Object.keys(first as object).slice(0, 24) : [],
    };
  }
  return {
    path,
    status: response.status,
    fields: answer && typeof answer === 'object' ? Object.keys(answer as object).slice(0, 24) : [],
  };
}

/* ── Her own trained voices ─────────────────────────────────────────────── */

/**
 * One trained voice, as this app needs it: a number and a name.
 */
export interface Model {
  readonly id: string;
  readonly name: string;
  /** A short clip of the voice, from their public bucket. Null on most of hers. */
  readonly demo: string | null;
  /** What it is good for, in their words: "Singing", "Chest Voice", "Opera". */
  readonly tags: string[];
}

/**
 * The name in a model record.
 *
 * `title` is the documented field. The rest are kept as fallbacks costing
 * nothing, and the id is the last resort — a picker showing a number because
 * there genuinely is no name is honest; one showing a number because the field
 * was called something else is not.
 */
function nameIn(record: Record<string, unknown>, id: string): string {
  for (const field of ['title', 'name', 'modelName', 'displayName', 'label']) {
    const value = record[field];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return id;
}

function httpsIn(value: unknown): string | null {
  return typeof value === 'string' && /^https:\/\//i.test(value) ? value : null;
}

/**
 * Voice models off the account, or out of Kits' own catalogue.
 *
 * ── The parameter that decides which, and why it nearly went wrong ──────
 *
 * `GET /voice-models` with no query returns **everything Kits has** — their
 * hundred-and-something public voices, "Male Pop" and the rest. Hers are
 * behind `myModels=true`. This code asked without it for a day, which would
 * have put a stranger's voice at the top of a picker labelled "your trained
 * voices" and left hers somewhere on page four.
 *
 * The catalogue is not a mistake to be avoided, though — it is the answer to
 * the emptiest screen in this app. Somebody who has never trained a voice has
 * nothing to sing in, and "go and make one at kits.ai first" is where they
 * stop. A hundred voices they can use immediately is a first day that works.
 * So both are fetched, and the room shows them as two groups that say which
 * is which.
 *
 * `instruments=true` filters to their instrument models — a sung line turned
 * into a saxophone. Not used yet; recorded because it is one query parameter
 * away and nobody would guess it exists.
 *
 * Failure is an empty list rather than a thrown error. Every caller draws a
 * screen, the number field is still under the picker, and a voice room that
 * will not draw because a list could not be fetched is the worse answer.
 *
 * ── CONFIRMED against the live account, 8 September 2026 ───────────────────
 *
 * A voice model record carries:
 *
 *     id, title, isUsable, tags, twitterLink, instagramLink, tiktokLink,
 *     spotifyLink, youtubeLink, imageUrl, demoUrl
 *
 * `title`, `isUsable`, `tags` and `demoUrl` are the four this function reads,
 * and all four are spelled as written here. `nameIn` falling through to
 * `name`/`modelName`/`displayName`/`label` never fires — `title` is always
 * there — but it costs nothing and it is what makes the fallthrough honest.
 *
 * `imageUrl` is real and unused. The picker shows names; it could show faces.
 *
 * ── And the fact that matters more than any field name ─────────────────────
 *
 * `myModels=true` came back EMPTY. Carli has trained no voices. So the
 * catalogue read — `listModels(false)`, cached by `catalogue()` below — is not
 * the nice-to-have that comment describes it as. Today it is the ONLY thing
 * anybody can sing in, hers included. If it fails, every voice picker in this
 * app is empty and the room is dead, and the empty-list-on-failure rule above
 * means it fails quietly. Worth knowing before somebody "simplifies" it away.
 */
export async function listModels(mine = true): Promise<Model[]> {
  if (!configured()) return [];
  /* `perPage`, because their lists are paged at ten. Without it a picker
     silently shows the first ten and looks like a complete list — the worst
     kind of wrong. A hundred is past what any account has and still one
     request; the catalogue is longer than that and one page of it is plenty
     to choose from. */
  const query = `perPage=100${mine ? '&myModels=true' : ''}`;
  let response: Response;
  try {
    response = await fetch(`${BASE}/voice-models?${query}`, {
      headers: { Authorization: `Bearer ${key()}` },
      /* Their list, not a copy from an hour ago that no longer has the voice
         somebody trained ten minutes back. Next caches fetches in route
         handlers by default, which would do exactly that. */
      cache: 'no-store',
    });
  } catch {
    return [];
  }
  if (!response.ok) return [];
  const answer = (await response.json().catch(() => null)) as unknown;
  const list = Array.isArray(answer)
    ? answer
    : Array.isArray((answer as { data?: unknown })?.data)
      ? (answer as { data: unknown[] }).data
      : [];

  const found: Model[] = [];
  for (const one of list) {
    if (!one || typeof one !== 'object') continue;
    const record = one as Record<string, unknown>;
    /* A model that is still training or still blending is not usable yet, and
       their own type says so. Offering it is offering a voice that fails. */
    if (record.isUsable === false) continue;
    /* `safeModelId` rather than a cast: this id goes back out in a form field
       and in a URL, and the rule for both is digits only however friendly the
       source looks. */
    const raw = record.id ?? record.voiceModelId ?? record.modelId;
    const id = safeModelId(typeof raw === 'number' ? String(raw) : raw);
    if (!id || found.some((had) => had.id === id)) continue;
    found.push({
      id,
      name: nameIn(record, id),
      demo: httpsIn(record.demoUrl),
      tags: Array.isArray(record.tags)
        ? record.tags.filter((tag): tag is string => typeof tag === 'string').slice(0, 6)
        : [],
    });
  }
  return found;
}

/**
 * Her voices, named the way she wants them named.
 *
 * `KITS_VOICE_MODELS` is the override rather than the source: a name set there
 * wins, a model that is only at Kits still appears, and a name in the variable
 * for a model that no longer exists is dropped rather than shown as a voice
 * that cannot be sung in.
 */
export async function models(): Promise<Model[]> {
  const theirs = await listModels(true);
  const named = new Map(namedModels().map((one) => [one.id, one.name]));
  if (theirs.length === 0) {
    return namedModels().map((one) => ({ ...one, demo: null, tags: [] }));
  }
  return theirs.map((one) => ({ ...one, name: named.get(one.id) ?? one.name }));
}

/**
 * Kits' own voices — the ones anybody can sing in without training anything.
 *
 * This is the first-day answer. Cached for an hour in the module: their
 * catalogue does not change between two people opening the Pro Booth, and one
 * request per hour against a limit of a thousand a minute is nothing.
 */
let catalogueAt = 0;
let catalogued: Model[] = [];
const AN_HOUR = 3_600_000;

export async function catalogue(): Promise<Model[]> {
  if (catalogued.length > 0 && Date.now() - catalogueAt < AN_HOUR) return catalogued;
  const found = await listModels(false);
  if (found.length > 0) {
    catalogued = found;
    catalogueAt = Date.now();
  }
  return found;
}

/* ── The two requests ────────────────────────────────────────────────────── */

/**
 * Cleaning done before the voice is changed, by them rather than by us.
 *
 * Their `PreProcessingEffects` — a noise gate, a high pass, a low pass and a
 * compressor, each optional. This matters more here than it looks: most of
 * what arrives from this app is a phone microphone in a bedroom, and an RVC
 * model converts whatever it is given, hum and room and all. A gate and a high
 * pass in front of it is the difference between a take that sounds sung and
 * one that sounds recorded on a phone in a bedroom.
 *
 * Numbers are theirs to validate; the shapes are pinned here so a typo is a
 * compile error rather than a silently ignored field.
 */
export interface Cleanup {
  readonly noiseGate?: {
    threshold_db: number;
    ratio: number;
    attack_ms: number;
    release_ms: number;
  };
  readonly highPassFilter?: { cutoff_frequency_hz: number };
  readonly lowPassFilter?: { cutoff_frequency_hz: number };
  readonly compressor?: {
    threshold_db: number;
    ratio: number;
    attack_ms: number;
    release_ms: number;
  };
}

/**
 * What a phone in a bedroom needs, and nothing a studio take would resent.
 *
 * A gate at −45 dB takes the room out between phrases without chewing the ends
 * of words; a high pass at 80 Hz takes out desk rumble and the low end a phone
 * microphone invents; nothing here touches the top or squashes the dynamics,
 * because the model is about to do its own thing to both.
 */
export const PHONE_CLEANUP: Cleanup = {
  noiseGate: { threshold_db: -45, ratio: 4, attack_ms: 5, release_ms: 120 },
  highPassFilter: { cutoff_frequency_hz: 80 },
};

/**
 * Effects put on the voice *after* it has been converted.
 *
 * Their `PostProcessingEffects` — chorus, reverb, compressor, delay. This is
 * the thing a singer expects to find and this app cannot currently offer on a
 * converted take: a dry RVC output sounds like a dry RVC output, and a little
 * room on it is the difference between a demo and something worth posting.
 *
 * Nothing sends these yet. They are pinned here because the shapes are known
 * today, and because the room they belong in — the Pro Booth's own effects,
 * beside the tone drawer — is a screen rather than a request.
 */
export interface Polish {
  readonly chorus?: {
    rate_hz: number;
    depth: number;
    centre_delay_ms: number;
    feedback: number;
    mix: number;
  };
  readonly reverb?: {
    room_size: number;
    damping: number;
    wet_level: number;
    dry_level: number;
    width: number;
    freeze_mode: number;
  };
  readonly compressor?: {
    threshold_db: number;
    ratio: number;
    attack_ms: number;
    release_ms: number;
  };
  readonly delay?: { delay_seconds: number; feedback: number; mix: number };
}

/**
 * One job a minute, for everybody together.
 *
 * Their rate limit is **1 POST per minute**, and it is counted against the
 * Kits *account* rather than the key — so every member of this app shares one
 * allowance. Two people pressing "Sing it" in the same minute is not a rare
 * case; it is the ordinary case on any evening when more than one person is
 * awake.
 *
 * This is not a queue. A queue is task #109's business, with somewhere to keep
 * it that survives a cold start. This is the honest failure in the meantime:
 * the second person is told what happened, in words that name the wait, and
 * their credits are given back by the route above.
 *
 * The clock is per server instance, which on Vercel means it undercounts —
 * two instances can each believe they are first. That is why the 429 below is
 * handled as well: the local clock saves the common case, and their answer is
 * what actually decides.
 */
let lastPost = 0;
const A_MINUTE = 60_000;

/** Starts a conversion. The shape of this one is hers, not a guess. */
/**
 * The three dials on a conversion, from their own request body.
 *
 * `pitchShift` is the one that matters most and the one nobody would guess:
 * a man singing through a woman's model, or the other way round, is an octave
 * out and sounds like a mistake rather than a voice. Twelve semitones is that
 * octave. Their range is -24 to 24.
 *
 * `conversionStrength` is how much of the model's accent comes through — their
 * own note says high values mispronounce. `modelVolumeMix` trades the input's
 * dynamics against the model's level, and their note says high values
 * accentuate noise, which on a phone recording is the whole problem.
 *
 * Left out entirely rather than sent at a default: an omitted field is theirs
 * to choose, and a number this app invented is a number nobody tuned.
 */
export interface Dials {
  /** -24 to 24 semitones. 12 is an octave. */
  readonly pitchShift?: number;
  /** 0 to 1. More accent from the model, and more mispronunciation with it. */
  readonly conversionStrength?: number;
  /** 0 to 1. Up for the model's level, down to keep the input's dynamics. */
  readonly modelVolumeMix?: number;
}

/** Their ceiling on a conversion, which is twice the splitters'. */
export const CONVERT_MAX_BYTES = 100 * 1024 * 1024;

function clamp(value: number, low: number, high: number): number {
  return Math.min(high, Math.max(low, value));
}

export async function startConversion(
  voiceModelId: string,
  audio: Blob,
  filename: string,
  cleanup: Cleanup | null = PHONE_CLEANUP,
  dials: Dials = {},
  polish: Polish | null = null,
): Promise<{ ok: true; id: string; answer: unknown } | Upstream> {
  const since = Date.now() - lastPost;
  if (lastPost > 0 && since < A_MINUTE) {
    const wait = Math.ceil((A_MINUTE - since) / 1000);
    return {
      ok: false,
      status: 429,
      message: `The singing service takes one job a minute for the whole app. Try again in ${wait} seconds.`,
    };
  }

  const form = new FormData();
  form.append('voiceModelId', voiceModelId);
  form.append('soundFile', audio, filename);
  /* Their effects go as JSON in fields called `pre` and `post`.

     Named from their request body rather than from the type reference: the
     types are called `PreProcessingEffects` and `PostProcessingEffects`, and
     the fields are called `pre` and `post`. This code sent
     `preProcessingEffects` for an afternoon, which their server would have
     ignored without saying so — the take would simply have come back ungated,
     and nobody would have known which of the two it was.

     Sent only when there is something to send: an empty object is a field they
     have to parse for no reason. */
  if (cleanup && Object.keys(cleanup).length > 0) form.append('pre', JSON.stringify(cleanup));
  if (polish && Object.keys(polish).length > 0) form.append('post', JSON.stringify(polish));

  /* And the dials, each clamped to their documented range rather than trusted.
     These arrive from a form in the end, and a pitch shift of 400 semitones is
     a request their server has to refuse on our behalf. */
  if (typeof dials.pitchShift === 'number' && Number.isFinite(dials.pitchShift)) {
    form.append('pitchShift', String(Math.round(clamp(dials.pitchShift, -24, 24))));
  }
  if (typeof dials.conversionStrength === 'number' && Number.isFinite(dials.conversionStrength)) {
    form.append('conversionStrength', String(clamp(dials.conversionStrength, 0, 1)));
  }
  if (typeof dials.modelVolumeMix === 'number' && Number.isFinite(dials.modelVolumeMix)) {
    form.append('modelVolumeMix', String(clamp(dials.modelVolumeMix, 0, 1)));
  }

  let response: Response;
  try {
    lastPost = Date.now();
    response = await fetch(`${BASE}/voice-conversions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key()}` },
      body: form,
    });
  } catch {
    return { ok: false, status: 502, message: 'Could not reach the singing service.' };
  }
  /* Their answer, not ours, and it is the one that counts. */
  if (response.status === 429) {
    return {
      ok: false,
      status: 429,
      message: 'The singing service takes one job a minute for the whole app, and one has just started. Try again in a minute.',
    };
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

/* ── Splitting a song into its parts ─────────────────────────────────────── */

/** What Kits will take apart. Their own list, and their own 50 MB ceiling. */
export const SPLIT_TYPES = ['wav', 'webm', 'mp3', 'flac'] as const;
export const SPLIT_MAX_BYTES = 50 * 1024 * 1024;

/**
 * Splits a recording into its instruments.
 *
 * `POST /stem-splits`, multipart, one field called `inputFile`. The job is
 * polled the same way a conversion is, and comes back as `stemFileUrls` —
 * `{ instrument, url }` for each part, signed and good for four hours.
 *
 * ── Why this exists and is not wired to anything yet ────────────────────
 *
 * `/api/stems` splits over ElevenLabs today, per use, per minute. Kits does
 * the same thing inside a monthly fee that is already paid, which is the whole
 * shape of the saving in `docs/KITS-KAART.md`.
 *
 * What stops it being a one-line swap is the ceiling. Kits' plan carries 400
 * download minutes a month and singing conversion is what it was bought for —
 * the one thing this app promised and could not do. Splitting songs out of the
 * same 400 minutes takes them away from that, and nobody can see how many are
 * left, because the counter does not exist yet. That is task #109, and it
 * comes first: a saving that quietly starves the headline feature is not a
 * saving, it is a bill moved somewhere nobody is looking.
 *
 * So this is ready and deliberately unused. When the counter can answer "how
 * many minutes are left this month", the swap is small and the trade is
 * visible.
 */
export async function splitStems(
  audio: Blob,
  filename: string,
  deadline: number,
  /* Which of the two takes it apart.

     `stem-splits` gives the instruments; `vocal-separations` gives the voice
     out of the music. Their request and their answer are the same shape to the
     field — the same multipart `inputFile`, the same 50 MB, the same
     `stemFileUrls` back — so this is one function with the address as an
     argument rather than two files that drift apart. */
  which: 'stem-splits' | 'vocal-separations' = 'stem-splits',
): Promise<{ ok: true; stems: { instrument: string; url: string }[] } | Upstream> {
  if (audio.size > SPLIT_MAX_BYTES) {
    return {
      ok: false,
      status: 413,
      message: 'That recording is larger than the 50 MB the splitting service takes.',
    };
  }

  const since = Date.now() - lastPost;
  if (lastPost > 0 && since < A_MINUTE) {
    const wait = Math.ceil((A_MINUTE - since) / 1000);
    return {
      ok: false,
      status: 429,
      message: `The splitting service takes one job a minute for the whole app. Try again in ${wait} seconds.`,
    };
  }

  const form = new FormData();
  form.append('inputFile', audio, filename);

  let response: Response;
  try {
    lastPost = Date.now();
    response = await fetch(`${BASE}/${which}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key()}` },
      body: form,
    });
  } catch {
    return { ok: false, status: 502, message: 'Could not reach the splitting service.' };
  }
  if (response.status === 429) {
    return {
      ok: false,
      status: 429,
      message: 'The splitting service takes one job a minute for the whole app. Try again in a minute.',
    };
  }
  if (!response.ok) return complain(response);

  let answer = (await response.json().catch(() => null)) as unknown;
  const id = idIn(answer);
  if (!id) {
    return {
      ok: false,
      status: 502,
      message: `The splitting service started the job without saying which one it is: ${whatCameBack(answer)}`,
    };
  }

  let waited = 0;
  for (;;) {
    if (stateIn(answer) === 'failed') {
      return {
        ok: false,
        status: 502,
        message: `The splitting service could not take that recording apart: ${whatCameBack(answer)}`,
      };
    }
    const stems = stateIn(answer) === 'done' ? stemsIn(answer) : [];
    if (stems.length > 0) return { ok: true, stems };

    if (Date.now() >= deadline) {
      return {
        ok: false,
        status: 504,
        message: 'The splitting service is still working on that recording. Try a shorter piece.',
      };
    }
    waited += 1;
    const gap = Math.min(10_000, 3_000 + waited * 500);
    await new Promise((wake) => setTimeout(wake, Math.min(gap, Math.max(0, deadline - Date.now()))));

    let asked: Response;
    try {
      asked = await fetch(`${BASE}/${which}/${encodeURIComponent(id)}`, {
        headers: { Authorization: `Bearer ${key()}` },
      });
    } catch {
      return { ok: false, status: 502, message: 'Could not reach the splitting service.' };
    }
    if (!asked.ok) return complain(asked);
    answer = (await asked.json().catch(() => null)) as unknown;
  }
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
  /* Whether the music comes back with the voice. See `Want`: getting this
     wrong hands somebody a dry acapella of a song they asked to hear. */
  want: Want = 'voice',
  dials: Dials = {},
): Promise<{ ok: true; audio: ArrayBuffer; type: string } | Upstream> {
  if (audio.size > CONVERT_MAX_BYTES) {
    return {
      ok: false,
      status: 413,
      message: 'That take is larger than the 100 MB the singing service takes.',
    };
  }
  const started = await startConversion(voiceModelId, audio, filename, PHONE_CLEANUP, dials);
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
    const url = stateIn(answer) === 'done' ? outputIn(answer, want) : null;
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
