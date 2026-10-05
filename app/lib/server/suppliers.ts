/**
 * Who serves what, and the one door every supplier call goes out of.
 *
 * ── Why this exists ──────────────────────────────────────────────────────
 *
 * Carli, 5 October 2026, about ElevenLabs: *"Hulle antwoord my nie, en ek sal
 * nie so kan besigheid doen nie."* And then, on what she is waiting for:
 * *"'n kwotasie en wat hulle ceiling is, want ek wil groot gaan en baie
 * kliente aanneem."*
 *
 * The second sentence is the one this file is for. The risk in going big is
 * not an unanswered email — it is that thirteen capabilities rest on one
 * supplier whose ceiling nobody has been told. `docs/WEG-VAN-ELEVENLABS.md`
 * counted them: twenty routes, thirteen capabilities, one vendor.
 *
 * ── What a seam is, and what this one is not ─────────────────────────────
 *
 * A base URL that can be swapped is NOT a seam. Suppliers differ in the
 * SHAPE of what they take and return, not only in their address, so a file
 * that lets you point `/text-to-speech` at a different host and calls itself
 * portable is a label on a problem.
 *
 * So this is deliberately layer one of two:
 *
 *   **Layer one, here.** The vocabulary — thirteen named capabilities — plus
 *   routing and credentials. Every outbound call names the capability it
 *   serves and goes out of one door, so the questions "who serves this",
 *   "what did we spend there" and "what is their ceiling" have one place to
 *   be answered instead of twenty-one.
 *
 *   **Layer two, later and per capability.** Translating a request and a
 *   response between two suppliers' shapes. That cannot be written now
 *   without guessing at a supplier nobody has chosen, and a guessed adapter
 *   is worse than none: it reads as finished work.
 *
 * What layer one buys on its own is real. Before it, there were twenty-one
 * `fetch` calls each building their own URL and their own auth header, so
 * adding a second supplier meant touching all of them and no rule could say
 * whether one had been missed. After it, a second supplier is an entry here
 * and an adapter for the capabilities it actually serves.
 */

/**
 * The fifteen things this app buys from somebody else.
 *
 * It was counted as thirteen on the morning of 5 October, off the files that
 * import `eleven.ts`. Two were missed, and the way they were missed is the
 * argument for this file: `lib/server/cover.ts` and `lib/server/video/eleven.ts`
 * each carry their OWN client with their own host and their own auth header,
 * so nothing that read the shared client could see them. They are also the
 * two the cost note in `video/eleven.ts` already names as the only ElevenLabs
 * calls in the app that were never counted. A capability nobody knows about
 * cannot be quoted for, moved, or have its ceiling asked about.
 *
 * Named rather than inferred, because the name is what a route declares and
 * what a bill is read against. `check:seam` holds that every one of them has
 * exactly one supplier and that no call goes out without naming one.
 */
export type Capability =
  /** Text read aloud, with or without word timings. */
  | 'speak'
  /** More than one speaker in a single take. */
  | 'dialogue'
  /** A recording re-voiced as somebody else. */
  | 'voiceswap'
  /** Training a member's own voice. */
  | 'clone'
  /** The catalogue of stock voices, and the models behind them. */
  | 'voicelist'
  /** Words out of audio. */
  | 'transcribe'
  /** Which word lands at which second. */
  | 'align'
  /** A song from a prompt. */
  | 'music'
  /** Pulling a mix apart into lanes. */
  | 'stems'
  /** Taking the noise off a take. */
  | 'cleanup'
  /** A film in another language, with its transcript and subtitles. */
  | 'dub'
  /** What the account has spent and what it is allowed to spend. */
  | 'usage'
  /** A music model trained on her own finished songs. */
  | 'finetune'
  /** A cover picture from a prompt. */
  | 'coverart'
  /** A moving shot from a prompt. */
  | 'filmshot';

export const CAPABILITIES: readonly Capability[] = [
  'speak', 'dialogue', 'voiceswap', 'clone', 'voicelist', 'transcribe',
  'align', 'music', 'stems', 'cleanup', 'dub', 'usage', 'finetune',
  'coverart', 'filmshot',
];

/** How a supplier wants to be told who is calling. */
export interface Supplier {
  readonly id: string;
  /** What to call them in a sentence somebody reads. */
  readonly name: string;
  readonly base: string;
  /** The environment variable the key lives in. Never the key itself. */
  readonly keyFrom: string;
  /** The header they want it in. */
  readonly keyHeader: string;
  /** What this supplier is able to serve. */
  readonly serves: readonly Capability[];
}

/**
 * Everybody we buy from, with what they serve.
 *
 * One entry today. The point of the shape is that the second one is an entry
 * rather than a refactor — see `docs/WEG-VAN-ELEVENLABS.md` for the
 * candidates and for the two capabilities nothing else was found to cover.
 */
export const SUPPLIERS: readonly Supplier[] = [
  {
    id: 'elevenlabs',
    name: 'ElevenLabs',
    base: 'https://api.elevenlabs.io/v1',
    keyFrom: 'ELEVENLABS_API_KEY',
    keyHeader: 'xi-api-key',
    serves: [
      'speak', 'dialogue', 'voiceswap', 'clone', 'voicelist', 'transcribe',
      'align', 'music', 'stems', 'cleanup', 'dub', 'usage', 'finetune',
      'coverart', 'filmshot',
    ],
  },
];

/**
 * Who serves this capability.
 *
 * An environment variable can move one capability to another supplier —
 * `SUPPLIER_STEMS=musicai` — but only to a supplier that DECLARES it serves
 * it. A name that is not in `SUPPLIERS`, or one that is but does not serve
 * this, falls back rather than failing a member's press: a typo in an
 * environment variable must not take a room off the air.
 *
 * `check:seam` is what stops that fallback becoming a hiding place — it
 * fails the build when a capability has no supplier at all.
 */
export function serves(what: Capability): Supplier {
  const asked = process.env[`SUPPLIER_${what.toUpperCase()}`];
  if (asked) {
    const named = SUPPLIERS.find((one) => one.id === asked && one.serves.includes(what));
    if (named) return named;
  }
  const only = SUPPLIERS.find((one) => one.serves.includes(what));
  if (!only) throw new Error(`no supplier serves ${what}`);
  return only;
}

/** Whether the supplier for this capability is configured at all. */
export function ready(what: Capability): boolean {
  return Boolean(process.env[serves(what).keyFrom]);
}

/**
 * The one door out.
 *
 * `path` is relative to the supplier's own base, so no caller writes a host.
 * The auth header is added here and nowhere else, which is also why
 * `check:security` can say the key never leaves this file's reach.
 *
 * Headers a caller passes are merged UNDER the auth header rather than over
 * it: a caller that sets its own `xi-api-key` would otherwise silently
 * replace the real one with whatever it had, and the failure would read as
 * the supplier rejecting us.
 */
export function call(
  what: Capability,
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const supplier = serves(what);
  const headers = new Headers(init.headers);
  headers.set(supplier.keyHeader, process.env[supplier.keyFrom] ?? '');
  return fetch(`${supplier.base}${path}`, { ...init, headers });
}
