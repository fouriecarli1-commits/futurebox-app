/**
 * The words we already have, placed rather than guessed at — and only when the
 * placement worked.
 *
 * ── What this guards ─────────────────────────────────────────────────────
 *
 * `/api/align` calls ElevenLabs' forced alignment: it is handed the lyrics and
 * only has to say where they fall. That is a better answer than transcription
 * for a sung Afrikaans line, where a transcriber can get the *words* wrong and
 * no amount of timing work saves a screen lighting up a word nobody sang.
 *
 * The part worth a check is not that it works. It is the `loss`.
 *
 * Alignment reports how well it managed. That number is the only thing in this
 * ladder that can tell a right answer from a confident wrong one — `heard` has
 * no equivalent, which is why a bad transcription has always looked exactly
 * like a good one. So the rule is: a poor alignment is not used, and the
 * ladder drops to `phrases` instead of drawing exact-looking nonsense.
 *
 * And the rule underneath that one, which this codebase has now got wrong four
 * times in one day: **a missing loss is not a bad loss.** `unsaid` must be
 * kept, because "they did not report it" and "it was poor" are different
 * answers and only one of them is a reason to throw the work away.
 */
import { readFileSync } from 'node:fs';

let failures = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok  ' : 'FAIL'} ${what}${!passed && detail ? ` — ${detail}` : ''}`);
  if (!passed) failures += 1;
};

const route = readFileSync('app/api/align/route.ts', 'utf8');
const ladder = readFileSync('app/lib/lyrictime.ts', 'utf8');

/* ── The route ─────────────────────────────────────────────────────────── */
ok('it calls forced alignment, not transcription',
  /v1\/forced-alignment/.test(route) && !/speech-to-text/.test(route));
ok('and hands over the words, which is the whole point',
  /body\.append\('text', text\)/.test(route));
ok('a request with no words is refused rather than quietly transcribed',
  /error: 'no_words'/.test(route));
ok('the brake runs before anything is charged',
  route.indexOf('refuseIfTooMany') < route.indexOf('await charge('),
  'a retry loop must be stopped before the money');
ok('what it really cost is read off their own response',
  /noteCost\(upstream, 'align'\)/.test(route));
ok('an upstream refusal refunds', /await paid\.refund\(\)/.test(route));
ok('and so does an answer with nothing placed in it',
  /nothing_aligned[\s\S]{0,200}/.test(route) &&
    route.slice(0, route.indexOf("error: 'nothing_aligned'")).lastIndexOf('await paid.refund()') >
      route.indexOf("if (!words.length)") - 400,
  'the words were handed over and came back unplaced, so the work was not done');

/* ── The loss, and the direction of an unknown answer ──────────────────── */
ok('the loss is sent back raw, not only judged', /loss,/.test(route));
ok('the threshold is named rather than inlined', /const POOR_LOSS = /.test(route));
ok('and is admitted to be unverified',
  /[Nn]ever verified|has never been checked/.test(route),
  'a number nobody has checked against a real answer must say so');
ok('a missing loss reads as unsaid, never as poor',
  /loss === null \? 'unsaid'/.test(route),
  'they did not say is not the same as it was bad');

/* ── The ladder ────────────────────────────────────────────────────────── */
ok('there is a rung for it', /'aligned'/.test(ladder));
ok('and it sits above heard in the type', 
  ladder.indexOf("export type Timing = 'aligned'") > -1);
ok('a poor alignment is refused rather than drawn',
  /if \(said\.trust === 'poor'\) return \{ lines: \[\], how: 'none' \};/.test(ladder));
ok('an unsaid one is kept, for the same reason as the route',
  !/said\.trust !== 'good'/.test(ladder),
  'refusing anything that is not good would throw away every unreported loss');
ok('alignment is tried before transcription where there are words',
  /const lined = await alignedFor\(/.test(ladder) &&
    ladder.indexOf('await alignedFor(') < ladder.indexOf('return heardFor(track, audio);'));
ok('and transcription is still there for a song with no words on file',
  /return heardFor\(track, audio\);/.test(ladder));
ok('the choice is made in one place, not once per room',
  /export async function exactFor\(/.test(ladder));

for (const room of ['app/components/NowPlaying.tsx', 'app/components/Channel.tsx']) {
  const said = readFileSync(room, 'utf8');
  ok(`${room.split('/').pop()} climbs the whole ladder`,
    /await exactFor\(/.test(said) && !/await heardFor\(/.test(said));
}

/* ── And the screens know the new rung is exact ────────────────────────── */
const song = readFileSync('app/components/SongScreen.tsx', 'utf8');
ok('the words screen does not label an aligned song as a guess',
  /its\.how !== 'aligned'/.test(song));
const video = readFileSync('app/components/VideoPanel.tsx', 'utf8');
ok('and the video desk counts it as listened to',
  /timedHow === 'aligned'/.test(video));

console.log(
  failures
    ? `\ncheck:align — ${failures} wrong.`
    : '\ncheck:align — the words are placed rather than guessed, and a poor placement is not drawn as an exact one.',
);
process.exit(failures ? 1 : 0);
