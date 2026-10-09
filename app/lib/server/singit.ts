/**
 * Afrikaans lyrics, respelled for a model that reads English.
 *
 * ── What she sent ────────────────────────────────────────────────────────
 *
 * Carli, 9 October 2026, with four techniques for getting Afrikaans and
 * African languages sung properly. The first one:
 *
 *   *"Aangesien Engels die primêre opleidingstaal vir die vokale uitspraak
 *   is, herken die model nie Afrikaanse of Zoeloe spellingreëls nie. Jy kan
 *   die lirieke spreekwoordelik/foneties skryf soos 'n Engelse spreker dit
 *   sou lees."*
 *
 *   Oorspronklik: "Ek is baie lief vir jou"
 *   Foneties:     "Eck iss buy-a leef fir yo"
 *
 * She is describing exactly what `sayit.ts` does for SPEECH — and nothing in
 * this app did it for SINGING. The pronunciation dictionary goes to
 * ElevenLabs text-to-speech; the lyrics went to the music engine in
 * Afrikaans spelling and were sung the way an English reader would read
 * them. Her `tjie → kie` fix, which she heard working and called *"100%"*,
 * never reached a single song.
 *
 * ── Why a word list and not spelling rules ───────────────────────────────
 *
 * The tempting version of this is grapheme rules: Afrikaans `w` is English
 * `v`, `oe` is `oo`, `ie` is `ee`. Three lines and it generalises to every
 * word.
 *
 * It also destroys mixed lyrics, which is most of what people actually
 * write. `w → v` turns "wow" into "vov"; `v → f` turns "very" into "fery".
 * An Afrikaans chorus with an English hook in it is the normal case here,
 * not the edge case, and a rule that cannot tell the two apart is a rule
 * that ruins the hook to fix the verse.
 *
 * A word list cannot do that. A word that is not in the list is sent exactly
 * as it was written, so every English word in a lyric is safe by
 * construction rather than by a language detector that has to be right. The
 * cost is that it only covers words somebody put in it, which is a cost that
 * shows up as "that word was sung wrong" — reportable, fixable, one line —
 * rather than as "the chorus is gibberish".
 *
 * ── Whose rules these are ────────────────────────────────────────────────
 *
 * The suffixes are HERS, already approved and already heard: `tjie → kie`,
 * which she tested on 10 September and reported *"kie het perfek gewerk.
 * Die uitspraak is nou 100%."* Those are reused from `sayit.ts` rather than
 * copied, so there is one place a suffix rule lives.
 *
 * The six words in her own example are hers, spelled exactly as she wrote
 * them — `jou → yo`, not the "yoh" I would have picked, because her ear has
 * been right about this twice and mine has not been asked.
 *
 * **Everything else is mine and is marked `mine: true`.** Each one is a
 * guess at how an English reader would have to see the word to say it the
 * Afrikaans way, and not one of them has been heard by anybody. That is the
 * same arrangement `sayit.ts` runs under and for the same reason: the list
 * is written to be contradicted, one word at a time, by somebody listening.
 */

import { hasAfrikaansWord } from '../lyriclang';
import { SAY_RULES } from './sayit';

export interface SingRule {
  /** The Afrikaans word, lower case. Matched whole, never inside another. */
  readonly from: string;
  /** How an English reader has to see it. */
  readonly to: string;
  /**
   * False where she wrote this one herself. True where I did.
   *
   * Kept per rule rather than as a comment because the day one of these is
   * wrong, the first question is whose it was — and a file where that is a
   * comment is a file where nobody can answer it.
   */
  readonly mine: boolean;
  /**
   * True where this word is ALSO an English word.
   *
   * ── The hole this closes, found while testing the first version ───
   *
   * The argument for a word list over spelling rules was that it cannot
   * touch an English word, so a mixed lyric is safe by construction. That
   * argument is wrong, and it took one line to disprove: `I was so kind`
   * came back `I vus soh kint`. Nineteen of these words live in both
   * languages — is, my, so, was, water, wind, see, kind, pad, stem, sing,
   * met, as, word, more, loop, son, die, pa — and `is` is one of HER six.
   *
   * Dropping them is not the answer: they are the commonest words in an
   * Afrikaans lyric, and a respelling that skips `ek is` has skipped the
   * line. So they are marked, and a line is only respelled at all when it
   * carries at least one word that could not be English — see
   * `looksAfrikaans`. `I was so kind` has none and is left alone. `Ek was
   * so kind` has `Ek` and is respelled whole.
   */
  readonly shared?: boolean;
}

/**
 * Her own six, from the example she sent.
 *
 * Spelled exactly as she wrote them. `yo` rather than `yoh`, `buy-a` with
 * the hyphen: a respelling is a judgement about how it SOUNDS and she made
 * these ones.
 */
const HERS: readonly SingRule[] = [
  { from: 'ek', to: 'eck', mine: false },
  /* Also an English word — see `shared` above. */
  { from: 'is', to: 'iss', mine: false, shared: true },
  { from: 'baie', to: 'buy-a', mine: false },
  { from: 'lief', to: 'leef', mine: false },
  { from: 'vir', to: 'fir', mine: false },
  { from: 'jou', to: 'yo', mine: false },
];

/**
 * Mine, and every one of them is a guess nobody has heard.
 *
 * Chosen from the words that actually turn up in a lyric — pronouns, the
 * verbs a song is built from, the handful of nouns every love song has —
 * rather than from a dictionary. A long list of rare words would be more
 * impressive and would never fire.
 *
 * The test each one has to pass is narrow: would an English speaker reading
 * this aloud land near the Afrikaans word? Not "is this good phonetics".
 * `my → may` is wrong as phonetics and right as instructions to an English
 * reader, which is the whole trick of her technique.
 */
const MINE: readonly SingRule[] = [
  /* The words a song cannot avoid. */
  { from: 'my', to: 'may', mine: true, shared: true },
  { from: 'jy', to: 'yay', mine: true },
  { from: 'hy', to: 'hay', mine: true },
  { from: 'sy', to: 'say', mine: true },
  { from: 'ons', to: 'onns', mine: true },
  { from: 'hulle', to: 'hull-a', mine: true },
  { from: 'julle', to: 'yull-a', mine: true },
  { from: 'die', to: 'dee', mine: true, shared: true },
  { from: 'nie', to: 'nee', mine: true },
  { from: 'wat', to: 'vut', mine: true },
  { from: 'want', to: 'vunt', mine: true },
  { from: 'as', to: 'us', mine: true, shared: true },
  { from: 'so', to: 'soh', mine: true, shared: true },
  { from: 'nou', to: 'no', mine: true },
  { from: 'weer', to: 'vair', mine: true },
  { from: 'nog', to: 'nokh', mine: true },
  { from: 'altyd', to: 'ull-tate', mine: true },
  { from: 'saam', to: 'sahm', mine: true },
  { from: 'hier', to: 'heer', mine: true },
  { from: 'daar', to: 'dahr', mine: true },
  { from: 'waar', to: 'vahr', mine: true },
  { from: 'waarheen', to: 'vahr-hane', mine: true },
  /* What a love song is made of. */
  { from: 'liefde', to: 'leef-da', mine: true },
  { from: 'hart', to: 'hurt', mine: true },
  { from: 'hande', to: 'hun-da', mine: true },
  { from: 'oë', to: 'oo-a', mine: true },
  { from: 'siel', to: 'seel', mine: true },
  /* `drome`, not `drohm`, was the first version and it collided: `drome` is
     the next rule's INPUT. `check:singit` caught it on its first run — the
     cascade rule is there precisely because a respelling that feeds another
     rule makes the result depend on the order somebody typed them in. */
  { from: 'droom', to: 'drohm', mine: true },
  { from: 'drome', to: 'droh-ma', mine: true },
  { from: 'lied', to: 'leet', mine: true },
  { from: 'liedjie', to: 'leet-kie', mine: true },
  { from: 'son', to: 'sonn', mine: true, shared: true },
  { from: 'maan', to: 'mahn', mine: true },
  { from: 'nag', to: 'nukh', mine: true },
  { from: 'dag', to: 'dukh', mine: true },
  { from: 'more', to: 'moh-ra', mine: true, shared: true },
  { from: 'môre', to: 'moh-ra', mine: true },
  { from: 'vuur', to: 'fewer', mine: true },
  { from: 'water', to: 'vah-ter', mine: true, shared: true },
  { from: 'wind', to: 'vint', mine: true, shared: true },
  { from: 'reën', to: 'ray-un', mine: true },
  { from: 'see', to: 'sea', mine: true, shared: true },
  { from: 'berg', to: 'bairkh', mine: true },
  { from: 'pad', to: 'put', mine: true, shared: true },
  { from: 'huis', to: 'hase', mine: true },
  { from: 'vriend', to: 'freent', mine: true },
  { from: 'kind', to: 'kint', mine: true, shared: true },
  { from: 'ma', to: 'mah', mine: true },
  { from: 'pa', to: 'pah', mine: true, shared: true },
  /* The verbs. */
  { from: 'gaan', to: 'gahn', mine: true },
  { from: 'kom', to: 'comb', mine: true },
  { from: 'bly', to: 'blay', mine: true },
  { from: 'hou', to: 'ho', mine: true },
  { from: 'sien', to: 'seen', mine: true },
  { from: 'weet', to: 'vate', mine: true },
  { from: 'voel', to: 'fool', mine: true },
  { from: 'praat', to: 'praht', mine: true },
  { from: 'loop', to: 'lope', mine: true, shared: true },
  { from: 'staan', to: 'stahn', mine: true },
  { from: 'val', to: 'full', mine: true },
  { from: 'hardloop', to: 'hurt-lope', mine: true },
  { from: 'wag', to: 'vukh', mine: true },
  { from: 'soek', to: 'sook', mine: true },
  { from: 'vra', to: 'frah', mine: true },
  { from: 'gee', to: 'gay', mine: true },
  { from: 'vat', to: 'fut', mine: true },
  { from: 'maak', to: 'mahk', mine: true },
  { from: 'word', to: 'vort', mine: true, shared: true },
  { from: 'kan', to: 'cun', mine: true },
  { from: 'sal', to: 'sull', mine: true },
  { from: 'moet', to: 'moot', mine: true },
  { from: 'wil', to: 'vil', mine: true },
  { from: 'was', to: 'vus', mine: true, shared: true },
];

/** Her rules first, then mine. Longest first inside both — see `respell`. */
export const SING_RULES: readonly SingRule[] = [...HERS, ...MINE];

/**
 * The suffixes, borrowed from the speech dictionary rather than copied.
 *
 * `tjie → kie` is hers, she heard it work, and it belongs to every voice
 * this app has — spoken or sung. Importing it means a suffix rule she
 * changes tomorrow changes in both places; a copy means one of them goes
 * stale and the sound tells nobody which.
 *
 * Only the suffix rules come across. The word rules in `sayit.ts` are
 * ALIASES for a dictionary that applies them inside a sentence; these are
 * whole-word substitutions in a lyric, and the two lists happen to overlap
 * in purpose and not in form.
 */
const SUFFIXES: readonly { readonly from: string; readonly to: string }[] =
  SAY_RULES
    .filter((one) => /^(tjie|djie)$/.test(one.string_to_replace))
    .map((one) => ({ from: one.string_to_replace, to: one.alias }));

/** Every rule as a map, longest word first so `liedjie` beats `lied`. */
const BY_WORD = new Map<string, string>(
  [...SING_RULES]
    .sort((a, b) => b.from.length - a.from.length)
    .map((one) => [one.from, one.to]),
);

/**
 * One word, respelled, with its shape kept.
 *
 * Capitalisation is carried across rather than dropped: a line that starts
 * "Ek" must not come back "eck", because the lyric is also what gets shown
 * and sung back, and a model reading a lower-case line where every other
 * line is capitalised has been told something about emphasis that nobody
 * meant.
 */
function oneWord(word: string): string {
  const plain = word.toLocaleLowerCase('af');
  let said = BY_WORD.get(plain);
  if (said === undefined) {
    /* No whole-word rule. The suffix rules still apply, which is how
       `voëltjie` becomes `voëlkie` without `voëltjie` being in the list. */
    for (const { from, to } of SUFFIXES) {
      if (plain.endsWith(from) && plain.length > from.length) {
        said = plain.slice(0, -from.length) + to;
        break;
      }
    }
  }
  if (said === undefined) return word;
  /* Her example keeps the first letter's case and nothing else: a lyric is
     not SHOUTED because one word of it was. */
  return /^[A-ZÀ-Þ]/.test(word) ? said.charAt(0).toUpperCase() + said.slice(1) : said;
}

/**
 * A line of lyric, respelled — or handed back exactly as it came.
 *
 * ── The gate, and the duplicate that nearly shipped ─────────────────────
 *
 * Nineteen of the words in the list above are also English words, `is`
 * among them, so respelling every line would turn "I was so kind" into
 * "I vus soh kint". The first version of this file closed that with its own
 * marker list and its own `looksAfrikaans`.
 *
 * `app/lib/lyriclang.ts` already had both, and had thought about it harder:
 * it needs TWO markers rather than one, on the ground that a single "nie" in
 * an English lyric is somebody quoting, and it had already tried and REMOVED
 * `is`, `my`, `was`, `in`, `so` and `die` as markers for exactly the reason
 * I rediscovered from scratch. `check:makesong` is what surfaced it — it
 * imports both, and the duplicate was two lines apart in its own import
 * block.
 *
 * So the second list is gone. The whole-song gate is `looksAfrikaans`, in
 * `buildRequest` where the whole lyric is in one place; this per-line test
 * is `hasAfrikaansWord` from the same file and the same list. Two
 * thresholds, one list, and the reasoning about which borderline words
 * belong in it lives where somebody will find it.
 *
 * Splits on word characters so punctuation, apostrophes and the spacing a
 * singer reads as phrasing all survive untouched. An apostrophe is part of
 * the word — `'n` is a word in Afrikaans and splitting it would make two.
 */
export function singable(line: string): string {
  if (!hasAfrikaansWord(line)) return line;
  return line.replace(/[\p{L}\p{M}'’-]+/gu, (word) => oneWord(word));
}

/**
 * Every line of a section.
 *
 * Takes and returns an array because that is the shape the request is built
 * from, and because joining and re-splitting a lyric is how a blank line
 * that meant a pause gets lost.
 */
export function singableLines(lines: readonly string[]): string[] {
  return lines.map((one) => singable(one));
}

/**
 * Whether to do this at all.
 *
 * ── On by default, and off with one variable ─────────────────────────────
 *
 * On, because the alternative is what the app did until today: send
 * Afrikaans spelling to a model that reads English and hope. Her technique
 * is the fix for a fault she has heard.
 *
 * Off with `SING_PHONETIC=off`, because it is a judgement about sound and
 * the only instrument that can settle it is her ear. If a respelled song
 * comes out worse, the answer has to be one variable in Vercel and a
 * redeploy — not a commit, not a deploy of mine, and not an argument. A
 * feature that can only be withdrawn by the person who wrote it is a
 * feature its owner does not own.
 */
export const respelling = (): boolean => process.env.SING_PHONETIC !== 'off';
