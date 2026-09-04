/**
 * Reading an answer whose shape nobody promised.
 *
 * A Music.ai workflow's outputs are named by whoever built it. This app cannot
 * know in advance whether the tempo comes back under "bpm" or "tempo", nested
 * or flat, as a number or as a string — and a screen that only understood one
 * spelling would show nothing for the other and look broken rather than
 * unconfigured.
 *
 * So the readers take whatever is there. Which means they can also take the
 * wrong thing, quietly, and put the metronome at half speed. This pins both
 * halves: what they must find, and what they must refuse.
 */
import { keyIn, spansIn, tempoIn } from '../app/lib/analyse.ts';

let bad = 0;
const check = (label: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? '  ok ' : '  ✗  '} ${label}${!ok && detail ? ` — ${detail}` : ''}`);
  if (!ok) bad += 1;
};

// ── The tempo, however it is spelled and however deep ────────────────────
check('flat, under bpm', tempoIn({ analysis: { bpm: 128 } }) === 128);
check('flat, under tempo', tempoIn({ out: { tempo: 92 } }) === 92);
check('as a string', tempoIn({ out: { bpm: '140' } }) === 140);
check('rounded', tempoIn({ out: { bpm: 128.4 } }) === 128);
check('nested three deep', tempoIn({ a: { b: { c: { tempo: 174 } } } }) === 174);
check('inside an array of one', tempoIn({ results: [{ bpm: 100 }] }) === 100);

/* The trap this function exists for. Some workflows report a per-beat array
   under the same word, and taking its first element as the tempo puts the
   metronome at 0.5 — which is not obviously wrong on screen and is completely
   wrong to play to. */
check('a per-beat array under the same name is not mistaken for a tempo',
  tempoIn({ bpm: [0.5, 1.0, 1.5, 2.0] }) === null,
  String(tempoIn({ bpm: [0.5, 1.0, 1.5, 2.0] })));
check('and neither is an impossible one', tempoIn({ bpm: 4 }) === null, String(tempoIn({ bpm: 4 })));
check('nor one faster than any music', tempoIn({ bpm: 1200 }) === null);
check('nothing at all is null, not zero', tempoIn({ other: 'thing' }) === null);
check('an empty answer is null', tempoIn({}) === null);

// ── The key ──────────────────────────────────────────────────────────────
check('a key under key', keyIn({ out: { key: 'F# minor' } }) === 'F# minor');
check('a key under rootKey', keyIn({ out: { rootKey: 'C' } }) === 'C');
check('a key under tonic', keyIn({ tonic: 'Bb' }) === 'Bb');
/* "key" is the commonest word in any JSON object. Something under it that is
   not a musical key must not be shown as one. */
check('a value under key that is not a key is refused',
  keyIn({ key: 'output-1' }) === null, String(keyIn({ key: 'output-1' })));
check('and a whole paragraph under it is refused',
  keyIn({ key: 'the key of this piece is somewhat ambiguous throughout' }) === null);

// ── Chords, sections, beats: anything with a name and a time ─────────────
{
  const chords = spansIn({
    chords: [
      { start: 0, end: 2, chord: 'Am' },
      { start: 2, end: 4, chord: 'F' },
      { start: 4, end: 6, chord: 'C' },
    ],
  });
  check('chords come back as a list', chords.length === 3, String(chords.length));
  check('in time order and labelled',
    chords[0].label === 'Am' && chords[0].at === 0 && chords[2].label === 'C');
}
{
  /* A different workflow, different words, same shape. This is the whole
     reason these read by shape rather than by name. */
  const sections = spansIn({ output: { segments: [{ time: 12.5, label: 'chorus' }] } });
  check('sections under other words are read the same way',
    sections.length === 1 && sections[0].label === 'chorus' && sections[0].at === 12.5,
    JSON.stringify(sections));
}
{
  const mixed = spansIn({
    chords: [{ start: 3, chord: 'G' }],
    sections: [{ startTime: 1, name: 'verse' }],
  });
  check('two lists are merged and sorted by time',
    mixed.length === 2 && mixed[0].label === 'verse' && mixed[1].label === 'G',
    JSON.stringify(mixed));
}
check('a row with a time and no name is skipped', spansIn({ a: [{ start: 1 }] }).length === 0);
check('a row with a name and no time is skipped', spansIn({ a: [{ chord: 'C' }] }).length === 0);
check('something that is not a list is not a list of spans', spansIn({ a: { start: 1, chord: 'C' } }).length === 0);
check('an empty answer gives an empty list', spansIn({}).length === 0);

/* Bounded. A beat-level reading of a five-minute song is a thousand rows, and
   putting all of them on a screen is a screen nobody can use. */
{
  const many = spansIn({
    beats: Array.from({ length: 900 }, (_, i) => ({ start: i * 0.5, label: String(i % 4 + 1) })),
  });
  check('a beat-level reading is cut to something a screen can show',
    many.length === 400, String(many.length));
}

// ── Nothing throws on rubbish ────────────────────────────────────────────
for (const rubbish of [{ a: null }, { a: [null, 1, 'x'] }, { a: [[[{ chord: 'C' }]]] }]) {
  try {
    spansIn(rubbish as Record<string, unknown>);
    tempoIn(rubbish as Record<string, unknown>);
    keyIn(rubbish as Record<string, unknown>);
    check(`rubbish is survived: ${JSON.stringify(rubbish).slice(0, 30)}`, true);
  } catch (thrown) {
    check(`rubbish is survived: ${JSON.stringify(rubbish).slice(0, 30)}`, false, String(thrown));
  }
}

if (bad) {
  console.error(`\ncheck:analyse — ${bad} wrong.`);
  process.exit(1);
}
console.log('check:analyse — reads whatever the workflow was called, and refuses what is not an answer.');
