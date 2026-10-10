/**
 * Somebody says a word, and the machine writes down the sounds.
 *
 * ── Why this is a check and not a try ────────────────────────────────────
 *
 * Carli, 10 October 2026: *"But isn't there a way for an AI to listen to the
 * phonetic sounds of someone speaking isiXhosa?"* There is, and I had just
 * said otherwise about something adjacent — turning a whole audio Bible into
 * a lexicon IS a pipeline; transcribing one word is one call.
 *
 * What can go wrong here is not the call. It is that **a wrong phoneme rule
 * is worse than no rule at all.** An alias that is a bit off sounds a bit
 * off; a phoneme rule that is wrong makes the voice say a DIFFERENT WORD
 * with total confidence, in a language the person who wrote the rule does
 * not speak. So the three things held below are the three that keep that
 * from happening quietly:
 *
 *   · the model is told not to guess, and is asked how sure it is;
 *   · an unsure answer is not offered for keeping;
 *   · nothing in this file writes to a dictionary — a person listens first.
 *
 * And one that is pure plumbing and would otherwise be found by a whole
 * dictionary being rejected: a phoneme rule is refused by some ElevenLabs
 * models, so a respelling travels beside it.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { withoutComments } from './prose.mts';
import {
  LISTEN_SYSTEM, SURE_ENOUGH, heardIn, listenBody, rulesFor, worthKeeping,
} from '../app/lib/server/hearword.ts';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  if (!passed) bad += 1;
  console.log(`  ${passed ? 'ok  ' : 'NOT '} ${what}${detail && !passed ? ` — ${detail}` : ''}`);
};

/** An answer in the shape Gemini returns, with the JSON inside the text. */
const answerOf = (said: unknown): unknown => ({
  candidates: [{ content: { parts: [{ text: JSON.stringify(said) }] } }],
});

/* ── 1. The reader ─────────────────────────────────────────────────────── */

const REAL = { ipa: 'ǁʰosa', spelt: 'Xhosa', sure: 0.86, trouble: '' };

ok('what it heard is read off the answer',
  heardIn(answerOf(REAL))?.ipa === 'ǁʰosa');

ok('  and so is how sure it was',
  heardIn(answerOf(REAL))?.sure === 0.86,
  'without it there is nothing to tell a clear recording from a shrug');

ok('  and JSON inside a fenced block is still read',
  heardIn({
    candidates: [{
      content: { parts: [{ text: '```json\n{"ipa":"ǃʰaba","sure":0.7}\n```' }] },
    }],
  })?.ipa === 'ǃʰaba',
  'a fence is the commonest wrapping a model puts round JSON and the one'
  + ' that breaks a bare JSON.parse');

ok('  and an answer with no transcription in it is nothing, not a blank rule',
  heardIn(answerOf({ sure: 0.9, trouble: 'I could not hear it' })) === null
  && heardIn({}) === null && heardIn(null) === null,
  'an empty `ipa` written into a dictionary is a rule that makes the voice'
  + ' say nothing where the word should be');

ok('  and a confidence outside 0 to 1 is pulled back into it',
  heardIn(answerOf({ ...REAL, sure: 7 }))?.sure === 1
  && heardIn(answerOf({ ...REAL, sure: -3 }))?.sure === 0
  && heardIn(answerOf({ ...REAL, sure: 'very' }))?.sure === 0,
  'a model answering `sure: 7` would clear every threshold in this file,'
  + ' and a missing one must read as "not sure" rather than as sure');

/* ── 2. An unsure answer is not offered for keeping ────────────────────── */

ok('a clear recording is worth keeping',
  worthKeeping({ ...REAL, sure: 0.9 }));

ok('  and an unsure one is not',
  !worthKeeping({ ...REAL, sure: SURE_ENOUGH - 0.01 })
  && !worthKeeping(null)
  && !worthKeeping({ ...REAL, ipa: '' }),
  'a wrong phoneme rule makes the voice say a different word with total'
  + ' confidence, which is worse than no rule at all');

ok('  and the line is where a person can still judge it',
  SURE_ENOUGH >= 0.4 && SURE_ENOUGH <= 0.8,
  `${SURE_ENOUGH} — high would throw away a usable transcription of a quiet`
  + ' recording, and zero would offer to save the model’s shrug. A person'
  + ' listens to the playback either way; this is only the line between'
  + ' "worth hearing" and "record it again"');

/* ── 3. The model is told the things it will otherwise get wrong ───────── */

ok('it is asked for what was actually said, not the dictionary form',
  /narrow IPA/i.test(LISTEN_SYSTEM) && /ACTUALLY HEAR/i.test(LISTEN_SYSTEM),
  'the broad form is the dictionary’s idea of the word, and the whole'
  + ' point of recording a speaker is the speaker');

ok('  and the clicks are named, because the letters mean something else',
  /click/i.test(LISTEN_SYSTEM) && /isiXhosa/i.test(LISTEN_SYSTEM)
  && /Never substitute an ordinary consonant/i.test(LISTEN_SYSTEM),
  'c, q and x are clicks in Nguni languages and ordinary consonants in every'
  + ' language a model has seen more of, so unprompted it writes k or x or'
  + ' leaves them out — and those are the exact words this exists for');

ok('  and tone is marked where it is real and not invented',
  /tonal/i.test(LISTEN_SYSTEM) && /Do not mark tone you cannot hear/i.test(LISTEN_SYSTEM),
  'Sesotho, Setswana and Shona are tonal; tone invented is a different word');

ok('  and it is told to say so rather than guess',
  /Do not guess/i.test(LISTEN_SYSTEM) && /trouble/.test(LISTEN_SYSTEM),
  'a model handed audio it cannot place returns a plausible word in a'
  + ' language it knows better, and says nothing about having done so');

/* ── 4. The request ────────────────────────────────────────────────────── */

const sent = JSON.parse(listenBody(
  { data: 'AAAA', mime: 'audio/webm' }, 'Xhosa', 'isiXhosa',
)) as {
  contents?: { parts?: { inlineData?: unknown; text?: string }[] }[];
  generationConfig?: { temperature?: number };
  systemInstruction?: unknown;
};

ok('the recording goes up before the question about it',
  Boolean(sent.contents?.[0]?.parts?.[0]?.inlineData)
  && Boolean(sent.contents?.[0]?.parts?.[1]?.text),
  'a model reads a turn in order, so a question that arrives before the'
  + ' thing it is about is a question about nothing');

ok('  and the language and the spelling are both told to it',
  /isiXhosa/.test(sent.contents?.[0]?.parts?.[1]?.text ?? '')
  && /"Xhosa"/.test(sent.contents?.[0]?.parts?.[1]?.text ?? ''),
  'without the language it guesses one; without the spelling it cannot say'
  + ' that what it heard does not match');

ok('  and it is asked for no variety at all',
  sent.generationConfig?.temperature === 0,
  'a model inventing variety in a transcription is a model inventing'
  + ' phonemes');

/* ── 5. The rules, and the fallback beside them ────────────────────────── */

const rules = rulesFor('Xhosa', REAL, 'KHOH-sa');

ok('a heard word becomes a PHONEME rule, which is the whole point',
  rules[0]?.type === 'phoneme' && rules[0]?.phoneme === 'ǁʰosa'
  && rules[0]?.alphabet === 'ipa',
  'every rule this app has ever written is an alias — a respelling guessed'
  + ' at by somebody who does not speak the language. A click has no'
  + ' respelling in any other language’s letters');

ok('  with a respelling beside it, because some models refuse phonemes',
  rules[1]?.type === 'alias' && rules[1]?.alias === 'KHOH-sa',
  'ElevenLabs refuses phoneme rules on some models with a 400 naming'
  + ' pronunciation_dictionary_locators — `refusedTheDictionary` reads that'
  + ' exact refusal — and a dictionary rejected wholesale over one rule of'
  + ' the wrong kind helps nobody');

ok('  and no respelling is INVENTED when there is none to give',
  rulesFor('Xhosa', REAL).length === 1,
  'an invented respelling of a click is worse than no rule: it makes the'
  + ' voice say a confidently wrong word in the one case this exists for');

ok('  and a word with nothing heard for it becomes no rules at all',
  rulesFor('', REAL).length === 0
  && rulesFor('Xhosa', { ...REAL, ipa: '' }).length === 0);

/* ── 6. Nothing here writes to a dictionary ────────────────────────────── */

function routes(dir = 'app/api', found: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) routes(path, found);
    else if (name === 'route.ts') found.push(path);
  }
  return found;
}

const writing = routes().filter((path) => {
  const source = withoutComments(readFileSync(path, 'utf8'));
  return /hearWord\(|rulesFor\(/.test(source)
    && /pronunciation-dictionaries/.test(source);
});

ok('no route turns what it heard straight into a dictionary entry',
  writing.length === 0,
  `${writing.join(', ')} — the model’s IPA for a language it has heard`
  + ' little of is a guess with symbols in it. A person hears the playback'
  + ' and presses save; that loop is the same one /api/eleven/pronounce was'
  + ' built around, because Carli can hear it and this desk cannot');

const lib = withoutComments(readFileSync('app/lib/server/hearword.ts', 'utf8'));
ok('  and the library itself keeps no state and saves nothing',
  !/pronunciation-dictionaries/.test(lib) && !/supabase/i.test(lib),
  'a library that writes is a library that can write the wrong thing while'
  + ' nobody is looking at the playback');

console.log(bad === 0
  ? '\n  A word said once: transcribed, never trusted on its own, and never'
    + ' written anywhere without somebody hearing it first.'
  : `\n  ${bad} not right.`);
process.exit(bad === 0 ? 0 : 1);
