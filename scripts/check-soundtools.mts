/**
 * The speed on the song, the repeat, and reducing noise.
 *
 * ── What she asked for ───────────────────────────────────────────────────
 *
 * Carli, 5 October 2026: *"Op die sound tracks moet mens die spoed van die
 * klank ook kan verstel, daar moet ook 'n reduce noise funksie wees.
 * Duplicate funksie."*
 *
 * ── The rule this file is really here for ────────────────────────────────
 *
 * A rate on the song breaks two sums at once, and both of them are invisible
 * at one times — which is every film made before today and every test anybody
 * writes first.
 *
 * `stretches` answers in FILM seconds. The renderer's `start(when, offset,
 * duration)` wants a duration in the BUFFER's seconds, and `songSecond` has
 * to answer in them too. A song at one and a half consumes one and a half
 * seconds of itself per second of film, so both have to multiply. Leaving it
 * out gives a song that ends early on a sped-up film with skips in it, and
 * nothing at all on anything else.
 *
 * ── And a name that does not promise what it cannot do ───────────────────
 *
 * "Reduce noise" is two filters. There is no model in a browser that lifts a
 * voice out of a room, so the label says what comes out — the rumble below a
 * voice and the hiss above it — rather than borrowing the phrase people know
 * from software that really does separate them.
 */
import { readFileSync } from 'node:fs';
import { withoutComments } from './prose.mts';
import { cutFrom, cutSong, songSecond, type Edit, type Piece } from '../app/lib/videoedit';
import { NOISE_HIGH, NOISE_LOW } from '../app/lib/stitch';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  if (!passed) bad += 1;
  console.log(`  ${passed ? 'ok  ' : 'NOT '} ${what}${detail ? ` — ${detail}` : ''}`);
};

const room = withoutComments(readFileSync('app/components/VideoEditor.tsx', 'utf8'));
const render = withoutComments(readFileSync('app/lib/stitch.ts', 'utf8'));
const booth = withoutComments(readFileSync('app/components/VocalBooth.tsx', 'utf8'));

const talker = (id: string): Piece => ({
  id, clip: new Blob(), name: id, from: 0, to: 10, sound: true,
});
const film: Edit = { pieces: [talker('a'), talker('b')], under: new Blob() };

/* ── The speed, in both clocks ─────────────────────────────────────────── */

ok('a speed on the song reaches the renderer',
  cutFrom({ ...film, underSpeed: 1.5 }).audioSpeed === 1.5
  && cutFrom(film).audioSpeed === undefined,
  'absent is as recorded, so nothing already made changes');

ok('  and one times is not sent at all',
  cutFrom({ ...film, underSpeed: 1 }).audioSpeed === undefined,
  'a field that says "do nothing" is a field the renderer has to decide to'
  + ' ignore');

ok('  and it is held to what a playback rate can do',
  cutFrom({ ...film, underSpeed: 9 }).audioSpeed === 2
  && cutFrom({ ...film, underSpeed: 0.01 }).audioSpeed === 0.5,
  `${cutFrom({ ...film, underSpeed: 9 }).audioSpeed}× — past these the`
  + ' song is a chipmunk or a drone and neither is a thing anybody wanted');

ok('the film clock and the song clock agree about the speed',
  songSecond({ ...film, underSpeed: 2 }, 5) === 10
  && songSecond({ ...film, underSpeed: 0.5 }, 5) === 2.5,
  `${songSecond({ ...film, underSpeed: 2 }, 5)} — at double, five seconds of`
  + ' film is ten seconds of song, and a preview that answered five would'
  + ' drift further from the film every second');

/* Three seconds taken out at four, played at double. The second run starts
   at film four and at song seven, so one second of film later the song is at
   seven plus two. Nine, and the first version of this rule said ten — the
   arithmetic was written out here before it was trusted, and the file was
   right. */
const cutFast: Edit = { ...cutSong({ ...film, underSpeed: 2 }, { from: 4, to: 7 }), underSpeed: 2 };

ok('  and still do after a stretch has been cut out of the song',
  songSecond(cutFast, 3) === 6 && songSecond(cutFast, 5) === 9,
  `${songSecond(cutFast, 3)} then ${songSecond(cutFast, 5)} — the skip moves`
  + ' where the run starts and the rate moves how fast it is eaten, and the'
  + ' two have to compose');

ok('the renderer measures a stretch in the song’s own seconds',
  /piece\.start\(begin \+ run\.at, run\.from, run\.long \* rate\)/.test(render),
  '`stretches` answers in FILM seconds and the third argument of `start` is a'
  + ' duration in the buffer — without the multiplication the song ends early'
  + ' on a sped-up film and is perfect at one times, which is every test'
  + ' anybody writes first');

ok('  and sets the rate on every run, not only the first',
  /if \(rate !== 1\) piece\.playbackRate\.value = rate/.test(render),
  'one source per surviving stretch, so a rate set once is a rate on one'
  + ' stretch');

/* ── The repeat ────────────────────────────────────────────────────────── */

ok('the song can be told to play again when the film outlasts it',
  cutFrom({ ...film, underLoop: true }).audioLoop === true
  && cutFrom(film).audioLoop === undefined,
  'Carli: "Duplicate funksie" — the song stopped and the rest of the film was'
  + ' silent');

ok('  and the renderer really loops the source',
  /if \(cut\.audioLoop\) song\.loop = true/.test(render),
  'a flag nothing reads is a switch that does nothing');

ok('  and the preview loops with it',
  /a\.loop = Boolean\(edit\.underLoop\)/.test(room)
  && /a\.playbackRate = Math\.max\(0\.5, Math\.min\(2, edit\.underSpeed \?\? 1\)\)/.test(room),
  'held to the same range as the film, or the preview lies at the edges');

/* ── Reducing noise ────────────────────────────────────────────────────── */

ok('reducing noise reaches the renderer only when a shot speaks',
  cutFrom({ ...film, denoise: true }).denoise === true
  && cutFrom({ pieces: [{ ...talker('a'), sound: false }], under: new Blob(), denoise: true })
    .denoise === undefined,
  'filtering silence is work for nothing');

ok('  and not when the shots are muted',
  cutFrom({ ...film, denoise: true, shotsMute: true }).denoise === undefined,
  'two filters on a lane nobody can hear');

ok('it is two filters on the shots, not on the song',
  /low\.type = 'highpass'/.test(render) && /high\.type = 'lowpass'/.test(render)
  && /from\.connect\(low\)/.test(render),
  'the noise is in the room the camera was in; cutting the top off a finished'
  + ' record is damage');

ok('  rolling off below a voice and above it',
  NOISE_LOW >= 60 && NOISE_LOW <= 120 && NOISE_HIGH >= 7000 && NOISE_HIGH <= 12000,
  `${NOISE_LOW}Hz and ${NOISE_HIGH}Hz — the lowest note a bass voice reaches`
  + ' is about eighty-five, and consonants live below four thousand, so lower'
  + ' at the top would dull the one thing a voice cannot spare');

ok('  and the room says what it cannot do',
  /data-editordenoisewhy/.test(room) && /edit\.denoiseWhy/.test(room),
  '"reduce noise" is a phrase people know from software that really does'
  + ' separate a voice from a room. Nothing in a browser does, so the label'
  + ' has to say what comes out rather than borrow the promise');

/* ── And the booth can ask for its words again ─────────────────────────── */

ok('the booth can put the words back where it measured them',
  /data-boothlisten/.test(booth)
  && /setIntroAt\(null\); setWordsShift\(0\)/.test(booth),
  'Carli asked whether a listen-to-the-words was already inside the booth. It'
  + ' was — `phrasesOf` and `vocalSpanOf` run free on every open — but once a'
  + ' hand had moved `introAt` or `wordsShift` there was no way back to it,'
  + ' so the thing somebody reaches for when the words drift was also what'
  + ' could be causing it');

ok('  and only offers it when a hand has moved something',
  /\{\(introAt !== null \|\| wordsShift !== 0\) && \(/.test(booth),
  'with nothing moved it would be a button that does nothing');

if (bad) {
  console.error(`\ncheck:soundtools — ${bad} assertion(s) failed.\n`);
  process.exit(1);
}
console.log(
  '\ncheck:soundtools — the song can be sped up and repeated with the film'
  + ' clock and the song clock agreeing about both, reducing noise is two'
  + ' filters that say so, and the booth can go back to the timing it'
  + ' measured.',
);
