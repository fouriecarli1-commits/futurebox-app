/**
 * Afrikaans lyrics respelled for a model that reads English.
 *
 * ── What this holds, and why each one is here ────────────────────────────
 *
 * Carli's technique, 9 October 2026: write the lyrics the way an English
 * speaker would have to read them, because the vocal model was trained on
 * English and does not know Afrikaans spelling. Her example is the sharpest
 * assertion in this file — if her own sentence does not come out as she
 * wrote it, the list has been edited by somebody who was not listening.
 *
 * The rest is about the two ways this can do damage rather than good:
 *
 *   1. **Respelling something that is not a lyric.** The section name is an
 *      instruction to the engine and the styles are a description of a
 *      sound, both in English. Respelling either turns `[Chorus]` or "warm
 *      analog synths" into nonsense the engine then tries to obey.
 *
 *   2. **Respelling English.** Nineteen of these words live in both
 *      languages, `is` among them, and the first version of this turned
 *      "I was so kind" into "I vus soh kint". That is not a small fault:
 *      an Afrikaans chorus with an English hook is the normal thing people
 *      write here, and ruining the hook to fix the verse is worse than
 *      doing nothing at all.
 *
 * ── And one thing it deliberately does not assert ────────────────────────
 *
 * Whether any respelling is RIGHT. That is her ear, exactly as it is in
 * `check:sayit`. Seventy-three of these are mine and have been heard by
 * nobody; what is asserted is that hers survive unaltered, that mine are
 * marked as mine, and that the machinery cannot do the two kinds of damage
 * above.
 */

import { readFileSync } from 'node:fs';
import { withoutComments } from './prose.mts';
import { SING_RULES, singable, singableLines } from '../app/lib/server/singit.ts';
import { hasAfrikaansWord, looksAfrikaans } from '../app/lib/lyriclang.ts';
import { SAY_RULES } from '../app/lib/server/sayit.ts';
import { buildRequest } from '../app/lib/server/musicplan.ts';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  if (!passed) bad += 1;
  console.log(`  ${passed ? 'ok  ' : 'NOT '} ${what}${detail && !passed ? ` — ${detail}` : ''}`);
};

/* ── 1. Her own example, which is the whole point ──────────────────────── */

ok('her own sentence comes out exactly as she wrote it',
  singable('Ek is baie lief vir jou') === 'Eck iss buy-a leef fir yo',
  `got "${singable('Ek is baie lief vir jou')}" — she sent "Eck iss buy-a leef`
  + ' fir yo" on 9 October 2026, and if that no longer holds then somebody'
  + ' has edited her six words without listening to them');

ok('  and her suffix rule reaches a sung word, which it never used to',
  singable('My voëltjie sing') === 'May voëlkie sing',
  `got "${singable('My voëltjie sing')}" — she heard tjie→kie work on`
  + ' 10 September and called it "100%", and until today it applied only to'
  + ' SPEECH. A rule she approved that never reached a song is the fault'
  + ' this file exists for');

ok('  and the suffixes are borrowed from the speech dictionary, not copied',
  (() => {
    const lib = withoutComments(readFileSync('app/lib/server/singit.ts', 'utf8'));
    return /from '\.\/sayit'/.test(lib)
      && SAY_RULES.some((one) => one.string_to_replace === 'tjie' && one.alias === 'kie');
  })(),
  'a copy means one of the two goes stale and the sound tells nobody which');

/* ── 2. English is left alone ──────────────────────────────────────────── */

for (const line of [
  'I was so kind',
  'Hold me close tonight',
  'Water is my son',
  'So is the pad',
  'My love is a wind',
]) {
  ok(`"${line}" is handed back untouched`,
    singable(line) === line,
    `got "${singable(line)}" — every word in it exists in English, so there`
    + ' is nothing here to say this is Afrikaans. Respelling it would ruin'
    + ' an English line to fix a line that was never Afrikaans');
}

ok('a mixed line IS respelled, once something could not be English',
  singable('Ek was so kind') === 'Eck vus soh kint',
  `got "${singable('Ek was so kind')}" — "Ek" cannot be English, so the`
  + ' shared words in the same line are Afrikaans too');

ok('  and the marker test is per line, so a chorus can be English',
  (() => {
    const out = singableLines(['Ek is lief vir jou', 'Hold me close tonight']);
    return out[0] !== 'Ek is lief vir jou' && out[1] === 'Hold me close tonight';
  })(),
  'an Afrikaans verse under an English hook is the normal thing people'
  + ' write here, and a song-level decision gets one of the two wrong');

/* ── 3. It cannot mangle what is not a lyric ───────────────────────────── */

const made = buildRequest({
  style: 'warm analog synths, slow and wide',
  sections: [{ name: 'Chorus', lines: ['Ek is baie lief vir jou'], seconds: 20 }],
} as Parameters<typeof buildRequest>[0]);
const chunk = ((made.composition_plan as { chunks?: unknown[] } | undefined)?.chunks
  ?? [])[0] as { text?: string; positive_styles?: string[] } | undefined;

ok('the section name is NOT respelled',
  (chunk?.text ?? '').startsWith('[Chorus]'),
  `${chunk?.text} — the name in square brackets is how the engine is told`
  + ' what this part of the song is. "[Chorus]" respelled is an instruction'
  + ' the engine tries to obey and cannot');

ok('  and the words under it ARE',
  (chunk?.text ?? '').includes('Eck iss buy-a leef fir yo'),
  `${chunk?.text}`);

ok('  and the styles are left in English',
  (chunk?.positive_styles ?? []).some((one) => /analog|synth|warm/.test(one))
  && !(chunk?.positive_styles ?? []).some((one) => /vah|soh|eck/.test(one)),
  `${JSON.stringify(chunk?.positive_styles)} — a style is a description of a`
  + ' SOUND, written in English for a model that reads English. Respelling'
  + ' it is turning the one part of the request that was already right into'
  + ' nonsense');

/* ── 4. The list's own hygiene ─────────────────────────────────────────── */

ok('no rule is written twice',
  new Set(SING_RULES.map((one) => one.from)).size === SING_RULES.length,
  'two rules for one word means the second never fires, and which one won'
  + ' depends on the order somebody typed them in');

ok('  and no rule does nothing',
  SING_RULES.every((one) => one.from !== one.to),
  SING_RULES.filter((one) => one.from === one.to).map((one) => one.from).join(', ')
  + ' — a rule that returns its own word is noise in a list somebody has to'
  + ' read and argue with');

ok('  and no respelling re-triggers another rule',
  (() => {
    const inputs = new Set(SING_RULES.map((one) => one.from));
    return SING_RULES.every((one) => !inputs.has(one.to));
  })(),
  'a cascade makes the result depend on the order, and makes respelling'
  + ' twice different from respelling once');

ok('  and respelling twice is the same as respelling once',
  (() => {
    const lines = ['Ek is baie lief vir jou', 'My voëltjie sing ’n liedjie', 'Ek was so kind'];
    return lines.every((one) => singable(singable(one)) === singable(one));
  })(),
  'the request is built in one place today. The day somebody builds it'
  + ' twice — a retry, a preview that becomes the real thing — a'
  + ' respelling that compounds is a lyric nobody can read');

ok('her rules are marked as hers and mine as mine',
  SING_RULES.some((one) => !one.mine) && SING_RULES.some((one) => one.mine),
  'the day one of these is wrong the first question is whose it was');

ok('  and every word that is also English is marked shared',
  (() => {
    /* The nineteen found by hand on 9 October 2026, when "I was so kind"
       came back "I vus soh kint". Named rather than detected: there is no
       English dictionary in this repository, and a list typed out once is
       honest about being a list typed out once. */
    const ALSO_ENGLISH = ['is', 'my', 'so', 'was', 'water', 'wind', 'see', 'kind',
      'pad', 'stem', 'sing', 'met', 'as', 'word', 'more', 'loop', 'son', 'die', 'pa'];
    const missed = SING_RULES
      .filter((one) => ALSO_ENGLISH.includes(one.from) && !one.shared)
      .map((one) => one.from);
    return missed.length === 0;
  })(),
  'an unmarked shared word is a word that makes an English line look'
  + ' Afrikaans, which is how "I was so kind" became "I vus soh kint"');

ok('  and the Afrikaans detector is the app’s own, not a second one',
  (() => {
    const lib = withoutComments(readFileSync('app/lib/server/singit.ts', 'utf8'));
    return /from '\.\.\/lyriclang'/.test(lib) && !/const MARKERS/.test(lib);
  })(),
  'this file shipped with its own marker list for an hour. `lyriclang.ts`'
  + ' already had one, needed TWO markers rather than one, and had already'
  + ' tried and removed is/my/was/in/so/die for the reason this file'
  + ' rediscovered from scratch. One list, two thresholds');

ok('  and the song-level gate is the two-marker one, asked on the whole lyric',
  (() => {
    const plan = withoutComments(readFileSync('app/lib/server/musicplan.ts', 'utf8'));
    return /looksAfrikaans\(sections\.flatMap/.test(plan);
  })(),
  'asked per line, the two-marker test would respell an English song that'
  + ' happened to contain one Afrikaans word');

ok('  and the one-marker test leaves out the words its own list calls borderline',
  !hasAfrikaansWord('So is the pad') && !hasAfrikaansWord('Hold the pad'),
  '`pad`, `hou` and `ry` are English words too. `lyriclang.ts` keeps them'
  + ' because TWO markers are needed there; at one they fire on English, and'
  + ' "So is the pad" came back "Soh iss the put" the first time this file'
  + " borrowed that list");

ok('  and a line of only shared words is left alone, which is the safe miss',
  !hasAfrikaansWord('So is die pad'),
  '"So is die pad" is Afrikaans and this will not respell it, because every'
  + ' word in it is also English. A missed line is sung the way it was sung'
  + ' yesterday; a wrongly respelled English line is gibberish. Erring'
  + ' towards the first is deliberate and is written down here so nobody'
  + ' reads it as an oversight');

/* ── 5. She can switch it off without a deploy ─────────────────────────── */

ok('it can be switched off with one variable',
  /SING_PHONETIC !== 'off'/.test(withoutComments(readFileSync('app/lib/server/singit.ts', 'utf8'))),
  'this is a judgement about SOUND and the only instrument that can settle'
  + ' it is her ear. A feature that can only be withdrawn by the person who'
  + ' wrote it is a feature its owner does not own');

console.log(bad === 0
  ? '\ncheck:singit — her own sentence survives, her suffix rule reaches a song at'
  + ' last, English lines are left alone, the section names and the styles are'
  + ' never touched, and respelling twice is the same as once.'
  : `\ncheck:singit — ${bad} assertion(s) failed.`);
process.exit(bad === 0 ? 0 : 1);
