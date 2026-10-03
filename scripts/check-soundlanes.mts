/**
 * The sound lanes are lanes, not pictures of lanes.
 *
 * ── What she asked for ───────────────────────────────────────────────────
 *
 * Carli, 5 October 2026: *"Die sound tracks onder videos moet ook geselect kan
 * word, sodat mens daardie tyd lyne ook kan split. Huidiglik kan mens nie die
 * musiek tydlyne select nie."*
 *
 * Three lanes that were not equals. The picture lane could be tapped, the
 * shots' sound lane was `pointer-events: none` — a drawing of a wave — and the
 * music lane could be dragged along and nothing else. So "cut" could only ever
 * mean one thing, and two of the three timelines were things to look at.
 *
 * ── The thing this check is really for ───────────────────────────────────
 *
 * That the song cut is the SAME cut the interlock has been making since the
 * red lines were built, rather than a second mechanism beside it. One answer
 * to "what does the song do when something comes out of it" is what keeps the
 * lines, the interlock and the renderer agreeing; two would disagree the first
 * time either was touched, and the disagreement would be audible rather than
 * visible — which is the kind nobody can point at.
 */
import { readFileSync } from 'node:fs';
import { withoutComments } from './prose.mts';
import { cutSong, runs, type Edit, type Piece } from '../app/lib/videoedit';
import { stretches } from '../app/lib/videospan';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  if (!passed) bad += 1;
  console.log(`  ${passed ? 'ok  ' : 'NOT '} ${what}${detail ? ` — ${detail}` : ''}`);
};

const room = withoutComments(readFileSync('app/components/VideoEditor.tsx', 'utf8'));

/* ── All three can be picked ───────────────────────────────────────────── */

ok('the room knows which lane is being worked on',
  /const \[lane, setLane\] = useState<'film' \| 'shots' \| 'music'>/.test(room),
  'with one lane that can be cut, "cut" needs no subject; with three, it is'
  + ' the first thing somebody has to know');

ok('the shots’ sound lane can be pressed at all',
  /data-editorownsound=\{one\.id\}/.test(room)
  && !/pointer-events-none absolute inset-y-1 overflow-hidden rounded-md/.test(room),
  'it was `pointer-events: none` — a picture of a wave under a picture of a'
  + ' film');

ok('  and picking a wave picks the shot it belongs to',
  /setPicked\(one\.id\); setLane\('shots'\)/.test(room),
  'a shot’s sound IS that shot: splitting one without the other would be'
  + ' two clips claiming the same seconds. So every control that acts on a'
  + ' shot — Split in two among them — now reaches it from the sound lane');

ok('the music lane can be picked',
  /aria-pressed=\{lane === 'music'\}/.test(room)
  && /setLane\('music'\); scrubBed\(event\)/.test(room),
  'her sentence exactly: "huidiglik kan mens nie die musiek tydlyne select'
  + ' nie"');

ok('  without taking the drag that was already there away',
  /scrubBed\(event\)/.test(room),
  'the bed has always been scrubbed along the film, and a new press rule that'
  + ' quietly ended that would be a fix that costs a feature');

ok('picking the picture lane says so too',
  /setPicked\(one\.id\); setLane\('film'\)/.test(room),
  'three lanes and only two that can claim the controls is a room where the'
  + ' way back is to guess');

/* ── And the controls say what they are aimed at ───────────────────────── */

ok('the cutting panel says which lane the lines are on',
  /data-editorlanesays/.test(room)
  && /edit\.cuttingMusic/.test(room) && /edit\.cuttingFilm/.test(room),
  'these are the buttons that take something out, and "out of what" is the'
  + ' one thing nobody should have to guess');

ok('  and the cut goes to the lane that is picked',
  /lane === 'music'\s*\?\s*cutSong\(was, span\)\s*:\s*cutOut\(was, span\)/.test(room),
  'a red line on the music lane that cuts the picture is worse than a red'
  + ' line that does nothing');

ok('  and splitting a shot is not offered while the song is picked',
  /\{lane !== 'music' && \(/.test(room),
  'a song is cut with the two lines; a Split button that quietly cut the'
  + ' picture instead would be the same lie as above');

/* ── The song cut is the interlock's cut ───────────────────────────────── */

const shot = (id: string): Piece => ({ id, clip: new Blob(), name: id, from: 0, to: 10 });
const film: Edit = {
  pieces: [shot('a'), shot('b')],
  under: new Blob(),
  underFrom: 0,
};

const cut = cutSong(film, { from: 4, to: 7 });

ok('cutting the song takes the stretch out of it',
  cut.underSkips?.length === 1
  && cut.underSkips?.[0]?.from === 4 && cut.underSkips?.[0]?.to === 7,
  JSON.stringify(cut.underSkips));

ok('  and leaves the picture exactly as it was',
  cut.pieces === film.pieces && runs(cut) === runs(film),
  `${runs(cut)}s, was ${runs(film)}s — "die prent bly waar dit is"`);

ok('  and puts the lines away, as cutting the film does',
  cut.span === null,
  'lines left standing over a cut that has happened are lines she has to'
  + ' clear before the next one means anything');

ok('  and the renderer really plays the song in two runs',
  stretches(cut.underSkips ?? [], 0, 20).length === 2
  && stretches(cut.underSkips ?? [], 0, 20)[1]?.from === 7,
  JSON.stringify(stretches(cut.underSkips ?? [], 0, 20))
  + ' — this is the assertion the request rests on: a skip list that nothing'
  + ' schedules is a number in a file');

ok('a second cut is measured against what is already gone',
  cutSong(cut, { from: 4, to: 5 }).underSkips?.[1]?.from === 7,
  JSON.stringify(cutSong(cut, { from: 4, to: 5 }).underSkips)
  + ' — the lines are on the film’s clock and the skips are on the'
  + ' song’s, so the second cut has to be pushed past the first');

ok('a film with no song under it records no skips',
  cutSong({ pieces: [shot('a')] }, { from: 1, to: 2 }).underSkips === undefined,
  'a skip list on a film with no track is a fact about nothing, and it would'
  + ' survive a track being added later and silently chop the new one');

ok('  and neither does a line with no length',
  cutSong(film, { from: 3, to: 3 }).underSkips === undefined,
  'a zero-length cut is a press that should do nothing, not a skip of nought'
  + ' seconds for the scheduler to step over forever');

if (bad) {
  console.error(`\ncheck:soundlanes — ${bad} assertion(s) failed.\n`);
  process.exit(1);
}
console.log(
  '\ncheck:soundlanes — all three lanes can be picked, the panel says which one'
  + ' the lines are cutting, and cutting the song is the same cut the interlock'
  + ' has always made rather than a second one beside it.',
);
