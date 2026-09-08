/**
 * The notes somebody sang, written down the way a musician would write them.
 *
 * `docs/MUSIEKDENKE.md` §3.4. Nobody is taught to read music; their own voice
 * is engraved beside the take they just sang, and somebody who records forty
 * takes ends up able to read the shape of a line without opening a lesson.
 *
 * Which means a wrong stave teaches something untrue, and there are three
 * specific ways to be wrong here — every one of them invisible on the screen,
 * because a wrong spelling looks exactly as confident as a right one.
 *
 * 1. **Spelling by pitch instead of by key.** MIDI 61 is C♯ in D major and
 *    D♭ in A♭ major: one sound, two names, and only one of them reads.
 * 2. **An accidental the key signature already gives.** A stave with a sharp
 *    printed on every F is what somebody who has never engraved anything
 *    produces, and it is unreadable. The harder half is the other direction:
 *    an F *natural* in G major must carry a ♮, or it is read as F♯.
 * 3. **Note values snapped arithmetically.** Duration is heard
 *    multiplicatively, so the boundary between a crotchet and a quaver
 *    belongs at their geometric mean rather than halfway between them. The
 *    two readings agree almost everywhere and part company in a narrow band
 *    around every boundary — three and a half beats is a semibreve to anybody
 *    listening and a dotted minim to the arithmetic.
 *
 *   npm run check:notation
 */
import { clefFor, engrave, signatureOf, spell, valueOf } from '../app/lib/notation';

let failures = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : 'NOT'}  ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) failures += 1;
};

/* ── The key signature ─────────────────────────────────────────────────── */
ok('C major has nothing', signatureOf('C Major') === 0);
ok('G major has one sharp', signatureOf('G Major') === 1, String(signatureOf('G Major')));
ok('F major has one flat', signatureOf('F Major') === -1, String(signatureOf('F Major')));
/* A minor is drawn with nothing, because it shares C major's signature. A
   file that treated minor as a key of its own would print sharps that are
   not there. */
ok('A minor is drawn like C major', signatureOf('A Minor') === 0, String(signatureOf('A Minor')));
ok('E minor has one sharp', signatureOf('E Minor') === 1, String(signatureOf('E Minor')));
ok('D minor has one flat', signatureOf('D Minor') === -1, String(signatureOf('D Minor')));
/* E♭ minor's relative is G♭ major — six flats — and not F♯ major, which is
   six sharps and a different key on the page for the same sounds. */
ok('E flat minor is six flats, not six sharps', signatureOf('Eb Minor') === -6, String(signatureOf('Eb Minor')));
ok('F sharp major is six sharps', signatureOf('F#') === 6, String(signatureOf('F#')));
ok('a song whose key nobody worked out is drawn as C', signatureOf('') === 0);
ok('and so is a key this does not understand', signatureOf('kwaito') === 0);

/* ── Spelling ──────────────────────────────────────────────────────────── */
const inC = spell(61, 0);
ok('a black key in C major is a sharp, and says so', inC.letter === 0 && inC.accidental === '#');
const inD = spell(61, 2);
ok('the same sound in D major is spelled C sharp', inD.letter === 0);
ok('and carries no accidental, because the key already said it', inD.accidental === '', inD.accidental);
const inAb = spell(61, -4);
ok('and in A flat major it is D flat', inAb.letter === 1, String(inAb.letter));
ok('with no accidental there either', inAb.accidental === '', inAb.accidental);
/* The direction that is easy to get wrong: the key sharpens F, so an F
   natural has to say so or it is read as F sharp. */
const fNatural = spell(65, 1);
ok('an F natural in G major carries a natural sign', fNatural.accidental === 'n', fNatural.accidental);
ok('and an F sharp in G major carries nothing', spell(66, 1).accidental === '', spell(66, 1).accidental);

/* ── Where it sits ─────────────────────────────────────────────────────── */
const trebleE = engrave([{ from: 0, to: 0.5, midi: 64 }]);
ok('E4 is the bottom line of the treble stave', trebleE.notes[0].step === 0, String(trebleE.notes[0].step));
const middleC = engrave([{ from: 0, to: 0.5, midi: 60 }, { from: 1, to: 1.5, midi: 72 }]);
ok('middle C is a ledger line below it', middleC.notes[0].step === -2, String(middleC.notes[0].step));
/* Two spellings of one letter share a line. That is the entire reason
   accidentals exist, and a chromatic position would put C sharp above C. */
const sameLine = engrave([{ from: 0, to: 0.5, midi: 60 }, { from: 1, to: 1.5, midi: 61 }]);
ok('C and C sharp sit on the same line', sameLine.notes[0].step === sameLine.notes[1].step,
  `${sameLine.notes[0].step} vs ${sameLine.notes[1].step}`);

/* ── The clef ──────────────────────────────────────────────────────────── */
ok('a soprano line is treble', clefFor([{ from: 0, to: 1, midi: 72 }, { from: 1, to: 2, midi: 76 }]) === 'treble');
ok('a bass line is bass', clefFor([{ from: 0, to: 1, midi: 45 }, { from: 1, to: 2, midi: 48 }]) === 'bass');
/* By the middle of the range, not the extremes: one low note at the end of a
   phrase must not drop a soprano onto the bass stave. */
const mostlyHigh = [
  { from: 0, to: 1, midi: 72 }, { from: 1, to: 2, midi: 74 },
  { from: 2, to: 3, midi: 76 }, { from: 3, to: 4, midi: 40 },
];
ok('one low note does not move the clef', clefFor(mostlyHigh) === 'treble');
const bassStave = engrave([{ from: 0, to: 1, midi: 43 }, { from: 1, to: 2, midi: 45 }]);
ok('G2 is the bottom line of the bass stave', bassStave.notes[0].step === 0, String(bassStave.notes[0].step));

/* ── How long it is ────────────────────────────────────────────────────── */
ok('one beat is a quarter', valueOf(0.5, 120).value === 'quarter');
ok('two beats is a half', valueOf(1.0, 120).value === 'half');
ok('four beats is a whole', valueOf(2.0, 120).value === 'whole');
const dotted = valueOf(0.75, 120);
ok('a beat and a half is a dotted quarter', dotted.value === 'quarter' && dotted.dotted, dotted.value);
ok('half a beat is an eighth', valueOf(0.25, 120).value === 'eighth');
/* The two places the metrics actually part company, and the reason the
   ratio one is right. Three and a half beats is much nearer four than three
   to anybody listening; arithmetic calls it a dotted minim. */
ok('just under three and a half beats is a whole, not a dotted half',
  valueOf(1.745, 120).value === 'whole' && !valueOf(1.745, 120).dotted,
  `${valueOf(1.745, 120).value}${valueOf(1.745, 120).dotted ? ' dotted' : ''}`);
ok('and 0.62 of a beat is a dotted eighth, not an eighth',
  valueOf(0.31, 120).value === 'eighth' && valueOf(0.31, 120).dotted,
  `${valueOf(0.31, 120).value}${valueOf(0.31, 120).dotted ? ' dotted' : ''}`);
/* A song with no tempo still gets a line whose notes are right relative to
   each other, which is the shape — the thing being taught. */
const noTempo = engrave([{ from: 0, to: 0.6, midi: 60 }, { from: 1, to: 2.2, midi: 62 }], { bpm: 0 });
ok('a song with no tempo still has relative lengths',
  noTempo.notes[0].value === 'quarter' && noTempo.notes[1].value === 'half',
  `${noTempo.notes[0].value} then ${noTempo.notes[1].value}`);

/* ── Names, and nothing ────────────────────────────────────────────────── */
ok('a note in G major is named F sharp 4', engrave([{ from: 0, to: 0.5, midi: 66 }], { key: 'G' }).notes[0].name === 'F♯4',
  engrave([{ from: 0, to: 0.5, midi: 66 }], { key: 'G' }).notes[0].name);
ok('and the natural is named as one', engrave([{ from: 0, to: 0.5, midi: 65 }], { key: 'G' }).notes[0].name === 'F♮4',
  engrave([{ from: 0, to: 0.5, midi: 65 }], { key: 'G' }).notes[0].name);
const nothing = engrave([]);
ok('nothing sung is nothing drawn', nothing.notes.length === 0 && nothing.seconds === 0);

console.log(
  failures
    ? `\ncheck:notation — ${failures} assertion(s) failed.`
    : '\ncheck:notation — spelled by the key, no accidental the signature already gives, and values by ratio.',
);
process.exit(failures ? 1 : 0);
