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
 *
 * ── Still open, and the test that closes it ─────────────────────────────
 *
 * 18 September 2026: `liedjie` now comes out right. That proves the
 * dictionary is reaching the reads and that alias rules work. It does not
 * say WHICH fork we are on, because `liedjie` is in both halves — the suffix
 * rule and the word list — and either alone would produce that sound.
 *
 * The test that separates them is one word this file has never heard of:
 * hondjie, kindjie, blommetjie. Said right, matching is by substring and the
 * word list is redundant belt-and-braces. Said wrong while liedjie is right,
 * matching is whole-word and every future diminutive needs its own entry —
 * which is a different feature, not a bigger list, because nobody will keep
 * a list of a language's diminutives up to date by hand.
 */

import { admin } from './account';

/** One alias rule: a string ElevenLabs reads, and what to read instead. */
export interface SayRule {
  readonly string_to_replace: string;
  readonly type: 'alias';
  readonly alias: string;
  /** Why it is here. Never sent; it is for whoever reads this file next. */
  readonly why: string;
}

/**
 * The suffix rules. Both approved by her; both interpreted by me.
 *
 * Worth separating, because they are different things and a dictionary built
 * by ear is only worth what its provenance is worth.
 *
 * **What she heard**, 10 September 2026: the -tjie ending comes back as an
 * English "ch", and it should be "kie" — voëltjie said as voëlkie. That is
 * an observation about a sound, and it is entirely hers.
 *
 * **What I interpreted**: that the fix takes the form of an ALIAS RULE — a
 * respelling ElevenLabs substitutes before reading — rather than a phoneme
 * rule in IPA, and that the respelling is the literal letters "kie". She
 * approved that reading the same day, in those words: "ek het jou
 * interpretasie van tjie as kie goedgekeur."
 *
 * **What I inferred and she then approved**: -djie, the same diminutive
 * after a d. liedjie said "liekie". It shipped marked MINE and unheard,
 * because an inference sitting unmarked beside an observation is how this
 * list stops being a record of anything; she confirmed it within the hour.
 *
 * The distinction earns its keep the day one of these turns out wrong. An
 * observation being wrong means her ear was misled. An interpretation being
 * wrong means the alias form is the wrong tool and a phoneme rule is needed,
 * which is a different fix in a different place.
 *
 * **Heard working, 18 September 2026.** The dictionary went onto the account
 * and its two ids into Vercel, and she listened: *"Die liedjie, dus djie na
 * kie het perfek gewerk. Die uitspraak is nou 100%."* So the alias form was
 * the right tool — no phoneme rule needed — and the inferred -djie rule was
 * a correct inference. That is the whole chain confirmed by the only
 * instrument that can confirm it.
 *
 * What that test did NOT settle is below: `liedjie` is in the word list too,
 * so it cannot say which of the two rules fired.
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
    why: 'Hers, 10 September 2026, confirming my inference from the -tjie rule. liedjie → liekie.',
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

/* ── The words she has HEARD said ────────────────────────────────────────

   Carli, 10 October 2026: *"Gaan aan met die keep button."*

   Everything above was written by a person reasoning about a language. What
   follows was heard from a speaker's mouth in the booth at `/uitspraak`, and
   it is kept in a table rather than in this file because a web page cannot
   edit source — and handing her JSON to paste into the repo by hand is what
   the booth already did, which is what she was saying is not good enough.

   The split stays visible on purpose. `sayit.ts` is still the record of the
   rules somebody argued for; `said_words` is the record of the rules
   somebody said. A dictionary built by ear is only worth what its provenance
   is worth, which is the argument this file already makes about its own two
   halves.

   And these are PHONEME rules, which no rule in this file has ever been. A
   click has no respelling in any other language's letters, so an alias
   cannot carry isiXhosa at all. */

/** One rule as ElevenLabs takes it, of either kind. */
export interface AnyRule {
  readonly string_to_replace: string;
  readonly type: 'alias' | 'phoneme';
  readonly alias?: string;
  readonly phoneme?: string;
  readonly alphabet?: 'ipa';
}

/**
 * The heard rules, out of the table.
 *
 * An empty list where there is no database, no table yet, or nothing in it —
 * and those three are deliberately the same answer here. This is read on the
 * way to a paid read of somebody's text, and a dictionary that cannot be
 * looked up must not be the thing that stops a song being sung. The source
 * rules still go.
 *
 * The error is TAKEN rather than discarded, because a listing that failed
 * silently becoming "there are no heard rules" is the whole category of
 * fault `check:couldnotask` exists for: it would mean her isiXhosa quietly
 * reverting to the English pronunciation with nothing anywhere saying why.
 */
export async function heardRules(): Promise<AnyRule[]> {
  const db = admin();
  if (!db) return [];
  const got = await db
    .from('said_words')
    .select('word, ipa, alias')
    .order('word');
  if (got.error) {
    console.error(`sayit: the heard words could not be read, so only the`
      + ` written rules are being sent: ${got.error.message}`);
    return [];
  }
  const out: AnyRule[] = [];
  for (const row of got.data ?? []) {
    const word = String((row as { word?: unknown }).word ?? '').trim();
    const ipa = String((row as { ipa?: unknown }).ipa ?? '').trim();
    if (!word || !ipa) continue;
    out.push({ string_to_replace: word, type: 'phoneme', phoneme: ipa, alphabet: 'ipa' });
    /* The respelling beside it, where one was given. ElevenLabs refuses
       phoneme rules on some models, and a dictionary rejected wholesale over
       one rule of the wrong kind helps nobody. Never invented — see
       `rulesFor` in `hearword.ts`. */
    const alias = String((row as { alias?: unknown }).alias ?? '').trim();
    if (alias) out.push({ string_to_replace: word, type: 'alias', alias });
  }
  return out;
}

/**
 * Everything that goes onto the account: written first, heard after.
 *
 * Written first for the ordering reason `SAY_RULES` already gives — a
 * specific word should be matched before a general ending. A heard rule is
 * always a whole word, so it sits after the suffixes without changing what
 * any of them do.
 */
export async function allRules(): Promise<AnyRule[]> {
  return [...asRules(), ...await heardRules()];
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
 * The dictionary that is actually live, preferring what was last pushed.
 *
 * ── The step this removes, and why it was the worst kind of step ─────────
 *
 * A dictionary is addressed by an id AND a version, and adding a rule mints
 * a NEW version. Until 10 October 2026 both lived only in environment
 * variables, so every change to the rules meant pasting a new version id
 * into Vercel by hand.
 *
 * Forgetting it fails in silence. The push worked, the rule is on her
 * account, the locator still points at the old version, and the app goes on
 * saying the word wrong — with nothing anywhere to suggest the button did
 * not work. That is not a step somebody occasionally forgets; it is a step
 * whose omission is invisible.
 *
 * So the push route writes the pair into `said_dictionary` and this reads
 * it. The environment variables stay as the fallback, which is what keeps an
 * old deployment and a fresh database both working: nothing has to be set
 * for this to be no worse than it was.
 *
 * A lookup that FAILS falls back too, rather than returning none — because
 * none means every read in the app loses its pronunciation at once, and a
 * stale version is better than no version.
 */
export async function liveLocators(): Promise<
  { pronunciation_dictionary_id: string; version_id: string }[]
> {
  const db = admin();
  if (!db) return locators();
  const got = await db
    .from('said_dictionary')
    .select('dict_id, version')
    .limit(1)
    .maybeSingle();
  if (got.error) {
    console.error(`sayit: which dictionary is live could not be read, so the`
      + ` environment variables are being used: ${got.error.message}`);
    return locators();
  }
  const id = String((got.data as { dict_id?: unknown } | null)?.dict_id ?? '').trim();
  const version = String((got.data as { version?: unknown } | null)?.version ?? '').trim();
  if (!id || !version) return locators();
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

/**
 * The same, asking the database first.
 *
 * Async, which is why it is a second function rather than a change to the
 * one above: `sayItRight` is spread into request bodies and a few of its
 * callers are not the right shape for an await. The ones that ARE — every
 * text-to-speech call in `eleven.ts` — use this, so a rule she kept in the
 * booth is live on the next read without anybody touching Vercel.
 */
export async function sayItRightNow(): Promise<Record<string, unknown>> {
  const list = await liveLocators();
  return list.length ? { pronunciation_dictionary_locators: list } : {};
}
