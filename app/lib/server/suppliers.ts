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
 * The sixteen things this app buys from somebody else.
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
  | 'filmshot'
  /** How a word she cares about is said. */
  | 'pronounce';

export const CAPABILITIES: readonly Capability[] = [
  'speak', 'dialogue', 'voiceswap', 'clone', 'voicelist', 'transcribe',
  'align', 'music', 'stems', 'cleanup', 'dub', 'usage', 'finetune',
  'coverart', 'filmshot', 'pronounce',
];

/** How a supplier wants to be told who is calling. */
export interface Supplier {
  readonly id: string;
  /** What to call them in a sentence somebody reads. */
  readonly name: string;
  /** The host, with no path on it. See the note on ElevenLabs' entry. */
  readonly base: string;
  /**
   * The environment variable the key lives in, as a NAME — for the switch-on
   * page, and so `check:envdoc` can see that something reads it.
   */
  readonly keyFrom: string;
  /**
   * And the reader, which names the variable literally.
   *
   * It would be shorter to write `process.env[supplier.keyFrom]` and drop
   * this. `check:envdoc` refuses that, and it is right to: a variable read
   * through a computed name is invisible to every rule that asks "is this one
   * written down where she works from", and the way that fails is a feature
   * that quietly takes the off path on a machine where nobody set it.
   *
   * So the name is here for the documentation and the literal read is here
   * for the code, and they sit two lines apart where they cannot drift.
   */
  readonly key: () => string;
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
    /* The host only. The version belongs to the path, because one
       supplier serves more than one — ElevenLabs' voice catalogue is
       v2 while everything else is v1. Written with the version on it
       first, which doubled every path to `/v1/v1/…`; `check:readmodel`
       caught it by executing the model read rather than reading it. */
    base: 'https://api.elevenlabs.io',
    keyFrom: 'ELEVENLABS_API_KEY',
    key: () => process.env.ELEVENLABS_API_KEY ?? '',
    keyHeader: 'xi-api-key',
    serves: [
      'speak', 'dialogue', 'voiceswap', 'clone', 'voicelist', 'transcribe',
      'align', 'music', 'stems', 'cleanup', 'dub', 'usage', 'finetune',
      'coverart', 'filmshot', 'pronounce',
    ],
  },
];

/**
 * Who serves this capability.
 *
 * ── Why there is no environment override here ────────────────────────────
 *
 * The first draft had one: `SUPPLIER_STEMS=musicai` would move a single
 * capability to another supplier without a deploy. It read well and it could
 * not work. Routing is layer one; a second supplier also needs layer two —
 * the translation between two request and response shapes — and without it
 * that variable would have sent ElevenLabs' request body to Music.ai's host
 * and called the failure theirs.
 *
 * A switch that looks like it works and does not is worse than no switch,
 * because somebody will reach for it on the day something is already wrong.
 * It comes back with layer two, when there is a second supplier to switch to
 * and an adapter that knows how to speak to it.
 *
 * `check:envdoc` is what turned this up, within the hour, by refusing a
 * variable read through a computed name. The rule is about documentation and
 * it caught a design fault — which is the argument for keeping rules that
 * seem narrower than the thing they protect.
 */
export function serves(what: Capability): Supplier {
  const only = SUPPLIERS.find((one) => one.serves.includes(what));
  if (!only) throw new Error(`no supplier serves ${what}`);
  return only;
}

/** Whether the supplier for this capability is configured at all. */
export function ready(what: Capability): boolean {
  return Boolean(serves(what).key());
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
  headers.set(supplier.keyHeader, supplier.key());
  return fetch(`${supplier.base}${path}`, { ...init, headers });
}
