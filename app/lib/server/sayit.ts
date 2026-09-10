/**
 * How Afrikaans should be said, as rules ElevenLabs can apply.
 *
 * ── Why this exists ──────────────────────────────────────────────────────
 *
 * `app/lib/server/afrikaans.ts` guards fifteen routes against a model writing
 * Dutch-flavoured Afrikaans. It works on the TEXT. Nothing guarded the SOUND:
 * once the words are right we hand them to `/v1/text-to-speech` and take
 * whatever comes back, and the same Dutch pull exists in a speech model's
 * pronunciation.
 *
 * ElevenLabs' lever is a pronunciation dictionary — a list of alias rules,
 * applied per request through `pronunciation_dictionary_locators`. An alias
 * rule is a respelling: no phonetics, no IPA. So it is easy to build and
 * impossible to build well, because what belongs in it has to come from
 * LISTENING. A list invented at this desk would be a list of words a model
 * probably says fine.
 *
 * ── The first heard fault, and the only one so far ───────────────────────
 *
 * Carli, 10 September 2026:
 *
 *   "elke woord tjie, soos voëltjie word verkeerd uitgespreek as chi. tjie
 *    moet uitgespreek word as kie dan is dit byvoorbeeld voëlkie."
 *
 * So the diminutive is read with an English "ch" instead of the Afrikaans
 * "kie". `app/api/eleven/pronounce/route.ts` had already guessed this group
 * was the likeliest thing to come out wrong — "Afrikaans has no Dutch
 * equivalent for this sound" — and she has now confirmed it by ear. A guess
 * and a confirmation are different things and only one of them belongs in a
 * dictionary.
 *
 * ── Two shapes, because one of them is unverified ────────────────────────
 *
 * A dictionary rule replaces a string. Whether ElevenLabs matches a rule
 * INSIDE a longer word or only as a whole word is not stated on the pages she
 * sent, and this machine cannot reach the API to find out. That is a real
 * fork, not a detail:
 *
 *   · If it matches inside words, one rule — "tjie" → "kie" — fixes every
 *     diminutive in the language, including ones nobody has thought of.
 *   · If it matches whole words only, that rule fires on nothing at all and
 *     the dictionary would be silently useless.
 *
 * So both are shipped. The suffix rules cost two entries and do the whole job
 * if substring matching works; the word list covers what the app actually
 * says either way. If the suffix rules do work the word entries are redundant
 * and produce the same sound, so there is no case where carrying both is
 * worse than carrying one.
 */

/** One alias rule: a string ElevenLabs reads, and what to read instead. */
export interface SayRule {
  readonly string_to_replace: string;
  readonly type: 'alias';
  readonly alias: string;
  /** Why it is here. Never sent; it is for whoever reads this file next. */
  readonly why: string;
}

/**
 * The suffix rules.
 *
 * `-tjie` is hers, word for word. `-djie` is NOT: it is my inference that the
 * same diminutive takes the same sound after a d — liedjie is said "liekie",
 * and "liedjie" is a word this app uses on almost every screen. It is marked
 * so because an inference sitting unmarked next to a confirmed observation is
 * how a dictionary built by ear stops being one.
 */
const SUFFIXES: readonly SayRule[] = [
  {
    string_to_replace: 'tjie',
    type: 'alias',
    alias: 'kie',
    why: 'Hers, 10 September 2026: read as "chi", should be "kie". voëltjie → voëlkie.',
  },
  {
    string_to_replace: 'djie',
    type: 'alias',
    alias: 'kie',
    why: 'MINE, not hers — the same diminutive after a d. liedjie → liekie. Wants her ear.',
  },
];

/**
 * The words, in case the suffix rules match nothing.
 *
 * Chosen from what the app itself says, not from a dictionary of Afrikaans:
 * `liedjie` is on nearly every screen, and the rest are the ones already in
 * the test read at `app/api/eleven/pronounce/route.ts`, which is the list she
 * was listening to when she heard this.
 *
 * Plurals are separate entries rather than assumed, for the same reason the
 * suffixes are: if matching is whole-word, "liedjie" does not cover
 * "liedjies".
 */
const WORDS: readonly SayRule[] = [
  ['liedjie', 'liekie'], ['liedjies', 'liekies'],
  ['bietjie', 'biekie'],
  ['mandjie', 'mankie'],
  ['katjie', 'kakie'], ['katjies', 'kakies'],
  ['voëltjie', 'voëlkie'], ['voëltjies', 'voëlkies'],
  ['storietjie', 'storiekie'],
  ['bakkie', 'bakkie'],
].filter(([word, said]) => word !== said).map(([word, said]) => ({
  string_to_replace: word,
  type: 'alias' as const,
  alias: said,
  why: 'The -tjie/-djie ending, spelled out in case a rule only matches whole words.',
}));

/**
 * Every rule, in the order ElevenLabs applies them.
 *
 * Words first, deliberately. If matching IS by substring then a bare "tjie"
 * rule applied first would turn "voëltjie" into "voëlkie" before the word
 * rule ever saw it — same answer, so the order does not change the sound
 * here. It will matter the first time a word needs something other than what
 * its ending would give it, and that is the day this comment saves an hour.
 */
export const SAY_RULES: readonly SayRule[] = [...WORDS, ...SUFFIXES];

/** What is sent to ElevenLabs — the `why` is ours and stays here. */
export function asRules(): { string_to_replace: string; type: 'alias'; alias: string }[] {
  return SAY_RULES.map(({ string_to_replace, type, alias }) => ({ string_to_replace, type, alias }));
}

/**
 * The dictionary to apply, when there is one.
 *
 * Two variables rather than one because a dictionary is addressed by id AND
 * version: adding a rule mints a new version, and a locator pinned to the old
 * one keeps reading the old way with nothing to show for it. Both must be set
 * or neither is used — a half-set locator is a 422 on every read, which is a
 * worse failure than the pronunciation it was meant to fix.
 */
export function locators(): { pronunciation_dictionary_id: string; version_id: string }[] {
  const id = process.env.ELEVEN_DICT_ID;
  const version = process.env.ELEVEN_DICT_VERSION;
  if (!id || !version) return [];
  return [{ pronunciation_dictionary_id: id, version_id: version }];
}

/**
 * The field to spread into a text-to-speech body.
 *
 * Spread rather than set, because ElevenLabs rejects unknown and malformed
 * fields rather than ignoring them — an empty array here would be a shape
 * they have not documented accepting, so an unset dictionary sends nothing at
 * all. This is the same rule the video wire learned from their Image & Video
 * docs on 10 September.
 */
export function sayItRight(): Record<string, unknown> {
  const list = locators();
  return list.length ? { pronunciation_dictionary_locators: list } : {};
}
