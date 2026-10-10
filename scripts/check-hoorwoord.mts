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

/* ── 7. The booth, and the one thing it must not do ────────────────────

   Carli: *"Does that mean that I can use the booth to record phonetic
   sounds?"* Yes — and the booth is an OWNER's page rather than a room,
   because there is one dictionary for the whole app: `sayit.ts` applies it
   to every read through `ELEVEN_DICT_ID` and `ELEVEN_DICT_VERSION`, one id
   shared by everybody. A rule contributed from a member's room would change
   how the app speaks for every other member, and one bad rule would break
   every read at once.

   So the guard is the same one `/api/eleven/pronounce` uses, and these hold
   it — an owner tool that quietly opens is the kind of thing nobody
   notices until it is being used. */

const route = withoutComments(readFileSync('app/api/hearword/route.ts', 'utf8'));

ok('the listening route is behind the owner secret',
  /POST_SECRET/.test(route) && /sameSecret\(given, wanted\)/.test(route),
  'one dictionary serves every read in the app, so a rule written by anybody'
  + ' changes how it speaks for everybody');

ok('  and compares it in constant time',
  /timingSafeEqual/.test(route),
  'a comparison that returns early leaks the secret one character at a time');

ok('  and answers 404 rather than 403',
  /new Response\('no', \{ status: 404 \}\)/.test(route),
  'a 403 confirms the address is real, which is half of finding it');

ok('  and bounds the recording, because one word is under a second',
  /MOST_BYTES/.test(route) && /audio\.length > MOST_BYTES/.test(route),
  'a ceiling that would let a whole song through is a way to post a song to'
  + ' a listening model on her key');

ok('  and refuses without the word or the language, in words',
  /Say which word was recorded/.test(route) && /Say which language it is/.test(route),
  'without the written word the model cannot say that what it heard does not'
  + ' match it, and without the language it guesses one — and a guessed'
  + ' language is where the clicks go');

const booth = withoutComments(readFileSync('app/uitspraak/page.tsx', 'utf8'));

ok('the booth records, plays back, and shows the sounds',
  /data-uitspraakrec/.test(booth) && /data-uitspraaktake/.test(booth)
  && /data-uitspraakipa/.test(booth),
  'a transcription she cannot hear beside the recording is a transcription'
  + ' she has to take on trust');

ok('  and says plainly when it is not sure enough to keep',
  /data-uitspraakunsure/.test(booth),
  'the gate is in the library and the room has to SHOW it, or an unsure'
  + ' answer looks the same as a confident one');

/* This said "writes nothing itself" until 10 October 2026, when the keep
   button went in — and a rule that is simply deleted when it becomes
   inconvenient was never a rule. What it was really protecting is still
   here: the booth must not reach ElevenLabs' dictionary endpoints ITSELF.
   Everything that touches her account goes through the owner route, which
   has the guard, the brake and the stale-id recovery; a page with its own
   copy of that call is a second path where all three have to be remembered
   again. */
/* Matched on the ADDRESS and not on the name. The first version looked for
   the string "elevenlabs" anywhere and went red on the button's own label,
   which says "Put them on ElevenLabs" — a check reading the page's prose
   instead of its code, which is the fault this repository has now made four
   times in a week. `withoutComments` blanks comments; it does not blank the
   words on a button. */
ok('  and never calls her ElevenLabs account itself',
  !/pronunciation-dictionaries/.test(booth)
  && !/api\.elevenlabs\.io/.test(booth)
  && !/xi-api-key/i.test(booth),
  'the owner route has the guard, the rate brake and the recovery from a'
  + ' stale dictionary id. A page with its own copy of that call is a second'
  + ' path where every one of those has to be remembered again');

ok('  and the transcription press still writes nothing',
  (() => {
    const at = booth.indexOf('const listen =');
    return at >= 0 && !/method: 'PUT'/.test(booth.slice(at, booth.indexOf('const keep =')));
  })(),
  'hearing and keeping are different decisions and a person listens between'
  + ' them — if the first press saved, the playback would be decorative');

ok('  and names the languages rather than taking a typed one',
  /isiXhosa/.test(booth) && /LANGUAGES\.map/.test(booth),
  'a typo in the language is a model guessing, which is the one failure that'
  + ' gives a confident wrong answer instead of a refusal');

/* ── 8. Keeping it, which is a different decision ──────────────────────

   Carli: *"Gaan aan met die keep button."*

   Three presses, and the gaps between them are the whole design: a person
   LISTENS between the transcription and the keep, and the difference between
   "kept in FutureBox's list" and "live on her account" is exactly where
   somebody assumes the job is done.

   The faults here are all silent ones. A keep that also pushed would make
   the playback decorative. A keep that let an unsure answer through would
   put a confidently wrong word in the dictionary every member's reads use. A
   push that did not record WHICH version is live would work perfectly and
   leave the app still saying the word the old way. */

ok('keeping is a different verb from hearing',
  /export async function PUT/.test(route) && /export async function POST/.test(route),
  'a route that transcribed and saved in one call would make the playback'
  + ' decorative — the rule would be on the account by the time she heard it'
  + ' was wrong');

ok('  and the keep is behind the same owner secret',
  (route.match(/sameSecret\(given, wanted\)/g) ?? []).length >= 2,
  'one guarded verb and one open one on the same route is the open one'
  + ' being the whole route');

ok('  and it refuses an unsure transcription too, not only the room',
  /sure < SURE_ENOUGH/.test(route),
  'a room can be changed and a request can be made by hand. The line has to'
  + ' be drawn where the write happens, or an unsure rule reaches every'
  + ' member with nobody having heard it');

ok('  and the word is the key, so saying it again replaces it',
  /onConflict: 'word'/.test(route),
  'two rules that disagree about one word is a dictionary where the answer'
  + ' depends on the order ElevenLabs happens to apply them in');

ok('  and a failed write is reported rather than called success',
  /if \(put\.error\)/.test(route),
  'a word she believes is kept and is not is a fault she next meets as the'
  + ' app still saying it wrong, three days later');

ok('  and it does not keep the recording',
  !/audio/.test(route.slice(route.indexOf('export async function PUT'))),
  'the recording has done its job the moment the IPA is read off it, and a'
  + ' voice is personal information in a way a word is not');

/* ── The two halves reach the account, and the live one is written down ─ */

const push = withoutComments(readFileSync('app/api/eleven/dictionary/route.ts', 'utf8'));

ok('the push sends the written rules AND the heard ones',
  /await allRules\(\)/.test(push) && !/const rules = asRules\(\)/.test(push),
  'a keep button that fills a table nothing reads is a button that does'
  + ' nothing, which is the hardest kind of nothing to notice');

ok('  and writes down which dictionary is live',
  /said_dictionary/.test(push) && /version, rules: rules\.length/.test(push),
  'a dictionary is addressed by an id AND a version, and this call mints a'
  + ' new version. Forgetting to record it fails in silence: the push'
  + ' worked, the rules are up, and the app goes on saying the word wrong');

ok('  and says plainly whether that worked',
  /pointed/.test(push),
  'the difference between "and now paste two values into Vercel" and "and'
  + ' that is it"');

const say = withoutComments(readFileSync('app/lib/server/sayit.ts', 'utf8'));

ok('every read asks which dictionary is live',
  /export async function liveLocators/.test(say)
  && /from\('said_dictionary'\)/.test(say),
  'the env vars alone mean a version pasted by hand after every change, and'
  + ' forgetting is invisible');

ok('  and falls back to the environment rather than to nothing',
  (() => {
    const at = say.indexOf('export async function liveLocators');
    const body = say.slice(at, at + 1400);
    return (body.match(/return locators\(\);/g) ?? []).length >= 3;
  })(),
  'no database, a failed lookup and an empty row are three different'
  + ' things and all three must mean "use what was set before" — returning'
  + ' none would take the pronunciation off every read in the app at once');

ok('  and a failed lookup of the heard words does not silently empty them',
  /if \(got\.error\)/.test(say) && /console\.error/.test(say),
  'a listing that failed becoming "there are no heard rules" is her isiXhosa'
  + ' quietly reverting to the English pronunciation with nothing saying why');

const booth2 = withoutComments(readFileSync('app/uitspraak/page.tsx', 'utf8'));

ok('the booth has the keep button and the push button, and they are not one',
  /data-uitspraakkeep/.test(booth2) && /data-uitspraakpush/.test(booth2),
  'one button doing both would save before she had heard it');

ok('  and it says which of the two has happened',
  /data-uitspraakkept/.test(booth2),
  '"kept" and "live" are different states and the page has to say which,'
  + ' or the gap between them is where the job is assumed done');

console.log(bad === 0
  ? '\n  A word said once: transcribed, never trusted on its own, and never'
    + ' written anywhere without somebody hearing it first.'
  : `\n  ${bad} not right.`);
process.exit(bad === 0 ? 0 : 1);
