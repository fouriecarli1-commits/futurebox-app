/**
 * A film that arrived with its lyrics, cut into one shot per line.
 *
 *   npm run check:lyriccut
 *
 * ── What this holds ──────────────────────────────────────────────────────
 *
 * `check:timedtext` holds the reading: the lines come out of an MP4 one each,
 * in order, with the second each one lands on. This holds what is done with
 * them, and the two things that must not change when it is done:
 *
 *   **The film is exactly as long afterwards.** The cuts are boundaries
 *   inside one window, so a feature that quietly shortened her song by the
 *   instrumental would be worse than no feature at all.
 *
 *   **No frame is lost.** The twelve seconds before the first line is sung is
 *   a shot with no words on it, not twelve seconds thrown away.
 *
 * Both are measured rather than reasoned about: the segments are added up and
 * checked for gaps, and the same thing is done again at the end on the real
 * reading of a real file.
 */
import { lyricCount, lyricPieces } from '../app/lib/lyriccut.ts';
import { SHORTEST_PIECE, lengthOfPiece } from '../app/lib/videoedit.ts';
import type { Piece } from '../app/lib/videoedit.ts';
import { linesFrom } from '../app/lib/timedtext.ts';
import type { Timed } from '../app/lib/timedtext.ts';
import { filmSeconds, filmWithLyrics, firstChunkBytes } from './lyricfilm.mts';
import { readFileSync } from 'node:fs';
import { withoutComments } from './prose.mts';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  if (!passed) bad += 1;
  console.log(`  ${passed ? 'ok  ' : 'NOT '} ${what}${detail && !passed ? ` — ${detail}` : ''}`);
};

const CLIP = { size: 1, type: 'video/mp4' } as unknown as Blob;
const piece = (over: Partial<Piece> = {}): Piece =>
  ({ id: 'one', clip: CLIP, name: 'Vrye Vlug', from: 0, to: 60, ...over });

const line = (from: number, to: number, text: string): Timed => ({ from, to, text });

/** The sum of the shots, in film seconds. */
const totalOf = (pieces: readonly Piece[]): number =>
  pieces.reduce((sum, one) => sum + lengthOfPiece(one), 0);

/** Where the shots do not meet, if anywhere. */
const gapsIn = (pieces: readonly Piece[]): string[] => {
  const out: string[] = [];
  pieces.forEach((one, n) => {
    if (n === 0) return;
    if (Math.abs(one.from - pieces[n - 1].to) > 1e-9) {
      out.push(`${pieces[n - 1].to} → ${one.from}`);
    }
  });
  return out;
};

/* ── 1. A song: three sung lines and an instrumental in the middle ───── */

const song: readonly Timed[] = [
  line(12, 15, 'Ek sit hier stil en word van alles waar'),
  line(15, 18, 'Daar buite in die vroeë lig se gloed'),
  /* Nine seconds of nothing being sung after this one, which is the case
     `wordsTo` exists for. */
  line(18, 21, 'Altyd vry... altyd vry...'),
];

const cut = lyricPieces(piece(), song);

ok('the film is exactly as long afterwards',
  Math.abs(totalOf(cut) - 60) < 1e-9,
  `${totalOf(cut)} seconds instead of 60`);

ok('and no frame falls between the shots',
  gapsIn(cut).length === 0 && cut[0].from === 0 && cut[cut.length - 1].to === 60,
  gapsIn(cut).join(', ') || `runs ${cut[0]?.from} → ${cut[cut.length - 1]?.to}`);

ok('one shot per sung line, plus the one before the singing starts',
  cut.length === 4,
  `${cut.length} shots: ${JSON.stringify(cut.map((one) => [one.from, one.to]))}`);

ok('the twelve seconds before the first line is a shot with no words on it',
  cut[0].from === 0 && cut[0].to === 12 && cut[0].words === undefined,
  `${cut[0].from}–${cut[0].to}, words ${JSON.stringify(cut[0].words)}`);

ok('each line lands on the frame it was sung on',
  cut[1].from === 12 && cut[2].from === 15 && cut[3].from === 18,
  JSON.stringify(cut.slice(1).map((one) => one.from)));

ok('and the words on each shot are that shot’s line, in order',
  cut.slice(1).map((one) => one.words).join(' | ') === song.map((one) => one.text).join(' | '),
  JSON.stringify(cut.map((one) => one.words)));

ok('the last line’s shot runs to the end of the film',
  cut[3].to === 60,
  String(cut[3].to));

/* ── 2. The words go DOWN when the line stops being sung ─────────────── */

ok('a line followed by an instrumental goes down with the singing',
  cut[3].wordsFrom === 0 && Math.abs((cut[3].wordsTo ?? 0) - 3) < 1e-9,
  `up from ${cut[3].wordsFrom} to ${cut[3].wordsTo} on a shot ${lengthOfPiece(cut[3])}s long —`
  + ' a caption that hangs there for the remaining 39 seconds is a lyric'
  + ' sheet rather than a lyric video');

ok('a line sung right up to the next one stays up for its whole shot',
  Math.abs((cut[1].wordsTo ?? 0) - 3) < 1e-9 && Math.abs(lengthOfPiece(cut[1]) - 3) < 1e-9,
  `${cut[1].wordsTo} on a ${lengthOfPiece(cut[1])}s shot`);

/* ── 3. The counter counts what the cutter cuts ──────────────────────── */

ok('the number on the button is the number of lines hung',
  lyricCount(piece(), song) === 3 && lyricCount(piece(), song) === cut.filter((one) => one.words).length,
  `${lyricCount(piece(), song)} against ${cut.filter((one) => one.words).length}`);

/* ── 4. A trimmed film: lines outside the window ─────────────────────── */

const trimmed = lyricPieces(piece({ from: 16, to: 40 }), song);

ok('a line still being sung when the trim begins lands on the first shot',
  trimmed.length === 2 && trimmed[0].words === 'Daar buite in die vroeë lig se gloed'
  && trimmed[0].from === 16,
  `${trimmed.length} shots, first words ${JSON.stringify(trimmed[0]?.words)}`);

ok('a line finished before the trim begins is not on it',
  !trimmed.some((one) => one.words === 'Ek sit hier stil en word van alles waar'),
  JSON.stringify(trimmed.map((one) => one.words)));

const early = lyricPieces(piece({ from: 0, to: 14 }), song);
ok('a line sung after the trim ends is left out',
  early.length === 2 && !early.some((one) => one.words?.startsWith('Daar buite')),
  `${early.length} shots: ${JSON.stringify(early.map((one) => one.words))}`);

ok('and a trimmed film is still exactly as long as its trim',
  Math.abs(totalOf(trimmed) - 24) < 1e-9 && Math.abs(totalOf(early) - 14) < 1e-9,
  `${totalOf(trimmed)} and ${totalOf(early)}`);

/* ── 5. Lines too close together to be shots ─────────────────────────── */

const rushed = lyricPieces(piece({ from: 0, to: 10 }), [
  line(2, 3, 'first'),
  /* Two hundredths of a second after it. A shot of that length is four
     frames, which is nothing anybody wanted. */
  line(2.02, 3, 'crammed'),
  line(5, 6, 'third'),
]);

ok('a line crammed against the one before it is dropped, not nudged',
  rushed.length === 3 && !rushed.some((one) => one.words === 'crammed'),
  `${rushed.length} shots: ${JSON.stringify(rushed.map((one) => one.words))}`);

ok('and the kept lines are still on the frames they were sung on',
  rushed[1].from === 2 && rushed[2].from === 5,
  JSON.stringify(rushed.map((one) => one.from)));

ok('nudging is what is being refused here',
  SHORTEST_PIECE === 0.1,
  'moving the cut to make room would move the words off the frame they'
  + ' were sung on, which is the one thing this feature is for');

/* ── 6. Nothing to cut on ────────────────────────────────────────────── */

const alone = piece();
ok('a film with no lyrics in it comes back as itself',
  lyricPieces(alone, []).length === 1 && lyricPieces(alone, [])[0] === alone,
  'so a caller can replace unconditionally');

ok('and so does one whose every line is outside the window',
  lyricPieces(piece({ from: 30, to: 40 }), song).length === 1,
  JSON.stringify(lyricPieces(piece({ from: 30, to: 40 }), song).map((one) => [one.from, one.to])));

ok('a line with no words in it makes no cut',
  lyricPieces(piece(), [line(12, 15, '')]).length === 1,
  'an empty sample is not a shot');

/* ── 7. What must NOT be copied on to every shot ─────────────────────── */

const joined = lyricPieces(piece({ join: 'dissolve', joinFor: 0.5 }), song);
ok('the join stays on the first shot and is not repeated at every line',
  joined[0].join === 'dissolve' && joined.slice(1).every((one) => one.join === undefined),
  JSON.stringify(joined.map((one) => one.join)));

const typed = lyricPieces(piece({ words: 'typed by hand', wordsFrom: 1, wordsTo: 2 }), song);
ok('a caption typed before this ran does not survive on the wordless shot',
  typed[0].words === undefined && typed[0].wordsFrom === undefined,
  `${JSON.stringify(typed[0].words)} at ${typed[0].wordsFrom}–${typed[0].wordsTo}`);

ok('the material is kept on every shot, so each can be trimmed back out',
  joined.every((one) => one.clip === CLIP && one.holds === piece().holds),
  'a shot that forgot which file it came from cannot be dragged open again');

ok('and every shot has its own id',
  new Set(cut.map((one) => one.id)).size === cut.length,
  JSON.stringify(cut.map((one) => one.id)));

/* ── 8. A shot that plays at a speed ─────────────────────────────────── */

const fast = lyricPieces(piece({ speed: 2 }), song);
ok('the cuts are file positions, so a line cannot drift at double speed',
  fast[1].from === 12 && fast[2].from === 15 && fast[3].from === 18,
  JSON.stringify(fast.slice(1).map((one) => one.from)));

ok('but how long the words stay up is film time, so it is halved',
  Math.abs((fast[3].wordsTo ?? 0) - 1.5) < 1e-9,
  `${fast[3].wordsTo} instead of 1.5 — three seconds of file at double speed`
  + ' is a second and a half on screen');

/* ── 9. A song's worth of lines ──────────────────────────────────────── */

/* Fifty-one of them, which is what her own song came back with. Not for the
   arithmetic — that is held above — but because the thing a 52-piece film
   would break is the total, and a rounding error that is invisible on three
   shots is not invisible on fifty-two. */
const real: Timed[] = [];
for (let n = 0; n < 51; n += 1) {
  real.push(line(12.3 + n * 3.07, 12.3 + n * 3.07 + 2.8, `line ${n + 1}`));
}
const whole = lyricPieces(piece({ from: 0, to: 169, holds: 169 }), real);

ok('fifty-one lines make fifty-one shots and the one before the singing',
  whole.length === 52 && lyricCount(piece({ from: 0, to: 169 }), real) === 51,
  `${whole.length} shots`);

ok('and the song is still 169 seconds long, to the frame',
  Math.abs(totalOf(whole) - 169) < 1e-9 && gapsIn(whole).length === 0,
  `${totalOf(whole)} seconds, gaps: ${gapsIn(whole).join(', ') || 'none'}`);

/* ── 10. A real MP4, read and cut, end to end ────────────────────────── */

/* Everything above hands `lyricPieces` lines I typed. This hands it lines
   that came out of a file — `public/welcome.mp4`, made by an encoder nobody
   here wrote, with a timed-text track put into it. `scripts/lyricfilm.mts`
   says why that is a different claim from the hand-built MP4 in
   `check:timedtext`, and why it is this check that makes it rather than a
   browser probe.
   The samples carry the rolling karaoke window AND a silent lead-in, which
   is the shape her song really had. */
const film = filmWithLyrics([
  ['', 2000],
  ['Line one', 2000],
  ['Line one\nLine two', 2000],
  ['Line two\nLine three', 2000],
  ['', 2042],
]);
const plain = readFileSync('public/welcome.mp4');
const sung = linesFrom(film.buffer.slice(film.byteOffset, film.byteOffset + film.byteLength) as ArrayBuffer);

ok('the lines come back out of a real film, one each and in order',
  sung.map((one) => one.text).join(' | ') === 'Line one | Line two | Line three',
  JSON.stringify(sung.map((one) => one.text)));

ok('  on the seconds they were written on, in amongst two real tracks',
  sung.map((one) => `${one.from}-${one.to}`).join(' ') === '2-4 4-6 6-8',
  JSON.stringify(sung.map((one) => [one.from, one.to])));

ok('  and the silent lead-in is not a line',
  sung.length === 3,
  `${sung.length} lines — a sample of length nought is a gap between verses`);

/* The fixture's own integrity, because a wrongly moved chunk offset would
   make the picture point at the wrong bytes and nothing above would notice:
   neither track is being decoded here. */
ok('the film\u2019s own tracks still point at the data they pointed at',
  firstChunkBytes(film, 0) === firstChunkBytes(plain, 0)
  && firstChunkBytes(film, 1) === firstChunkBytes(plain, 1),
  `${firstChunkBytes(film, 0).slice(0, 24)} against ${firstChunkBytes(plain, 0).slice(0, 24)}`
  + ' — putting a track into the moov pushes the mdat down the file, and every'
  + ' offset in the tracks that were already there has to move with it');

const long = filmSeconds();
const played = lyricPieces(piece({ from: 0, to: long, holds: long }), sung);

ok('and cutting that film on its own lines leaves it exactly as long',
  played.length === 4 && Math.abs(totalOf(played) - long) < 1e-9 && gapsIn(played).length === 0,
  `${played.length} shots, ${totalOf(played)} of ${long} seconds,`
  + ` gaps: ${gapsIn(played).join(', ') || 'none'}`);

ok('  with the two seconds before the first line kept as a wordless shot',
  played[0].from === 0 && played[0].to === 2 && played[0].words === undefined,
  `${played[0].from}\u2013${played[0].to}, words ${JSON.stringify(played[0].words)}`);

ok('  and the last line running to the end of the film',
  played[3].words === 'Line three' && Math.abs(played[3].to - long) < 1e-9,
  `${JSON.stringify(played[3].words)} to ${played[3].to}`);

/* ── 11. The wire from the file to the button ────────────────────────── */

/* ── What these are, and what they are not ──────────────────────────────

   These read the room's source. They hold that the wire EXISTS — that the
   lines are read on the way in, that the button is joined to the thing that
   cuts, that cutting goes through the history so one press of undo puts it
   back. They do not hold that any of it works on a screen, and nothing here
   should be read as if they did.

   The press itself cannot be walked in a browser, and that is not laziness:
   the Chromium Playwright installs has no H.264 in it, so the film this
   feature is for fails to decode before the room is involved at all —
   `DEMUXER_ERROR_NO_SUPPORTED_STREAMS`, which is also why every video probe
   in `audit/` records its own WebM. WebM has no timed-text track. See
   `scripts/lyricfilm.mts`.

   So the behaviour is held either side of the screen — the reading, the
   cutting, and the two joined on a real file above — and the press was walked
   by hand. A reviewer reading this list is entitled to know which of those
   two kinds of claim each line is. */

const room = withoutComments(readFileSync('app/components/VideoEditor.tsx', 'utf8'));

ok('the lines are read as the film comes in, not behind a second button',
  /linesFrom\(await file\.arrayBuffer\(\)\)/.test(room),
  'both ways into the room go through `bringIn`, so reading them there is'
  + ' what makes a film out of her channel behave like one off the phone');

ok('  but not on a file too big to hold in memory',
  /file\.size <= LYRIC_MAX_BYTES/.test(room),
  'the whole file has to be in memory to follow the offsets, and half a'
  + ' gigabyte on a phone to find a few hundred bytes of text is not a trade'
  + ' worth making');

ok('  and a failed read does not take the clip off the clock',
  /const sung = linesFrom[\s\S]{0,200}?\} catch \{/.test(room),
  'the clip is already in; a film with no lyric offer on it is the same film');

ok('the button is joined to the thing that cuts',
  /data-editorlyrichang[\s\S]{0,120}?onClick=\{hangLyrics\}/.test(room),
  'a button wired to nothing looks identical in the markup to one wired to'
  + ' `hangLyrics`');

ok('  and the offer is only drawn where there are lines to offer',
  /\(lyrics\[piece\.id\]\?\.length \?\? 0\) > 0 && \(/.test(room),
  'a clip with no text track in it should get no button and no explanation'
  + ' of a button it cannot have');

ok('cutting on the lyrics is one step on the history',
  /const hangLyrics = useCallback\(\(\) => \{[\s\S]{0,600}?commit\(\(was\) => \(\{/.test(room),
  'it turns one shot into fifty-two; if that is not one undo it is fifty-two'
  + ' presses to get her film back');

ok('  and the bench is moved on to a shot that still exists',
  /const hangLyrics = useCallback\(\(\) => \{[\s\S]{0,900}?setPicked\(cut\[0\]\.id\)/.test(room),
  'the piece the bench was pointing at is gone, and a bench pointing at'
  + ' nothing is a room that looks broken');

ok('the words bench is marked when a film arrives with lines in it',
  /waiting=\{\(piece && lyrics\[piece\.id\]\?\.length\) \|\| sungIsGood \? 'words' : null\}/.test(room),
  'the offer lives on one bench and nowhere else, so without a mark on the bar'
  + ' she would only find it by opening a bench she had no reason to open —'
  + ' which is how the blur was built and then not found');

ok('  and the mark is in the button\u2019s name as well as drawn on it',
  /aria-label=\{`\$\{label\}\. \$\{what\}\$\{waiting \? ` \$\{t\('dock\.waiting'/
    .test(withoutComments(readFileSync('app/components/CutDock.tsx', 'utf8'))),
  'a dot is a colour, and a mark somebody cannot see is a mark that was not'
  + ' made — the same objection that got the format chips a fill instead of a'
  + ' second shade');

ok('the lines are kept beside the edit and not inside it',
  !/pieces: [\s\S]{0,80}lyrics/.test(room)
  && /const \[lyrics, setLyrics\] = useState/.test(room),
  'a reading of a file is not a decision somebody made: in the edit it would'
  + ' be saved to disk and walked through by undo');

if (bad) {
  console.error(`\ncheck:lyriccut — ${bad} assertion(s) failed.\n`);
  process.exit(1);
}
console.log(
  '\ncheck:lyriccut — a film that arrived with its lyrics is cut into one shot'
  + ' per line, each line on the frame it was sung on and down again when the'
  + ' singing stops, with the film exactly as long afterwards and no frame'
  + ' lost between the shots.',
);
