/**
 * ProBooth's keyboard (`KeysSheet.tsx`): the computer's keys are a piano, a
 * played note snaps to the beat when asked, and what is played lands on a
 * lane with its notes kept.
 */
import { readFileSync } from 'node:fs';
import { KEYMAP, nameOf, quantised } from '../app/components/KeysSheet.tsx';
import { withoutComments } from './prose.mts';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  if (!passed) bad += 1;
  console.log(`  ${passed ? 'ok  ' : 'NOT '} ${what}${passed || !detail ? '' : ` — ${detail}`}`);
};

ok('the home row is the white keys, from C', KEYMAP.a === 0 && KEYMAP.s === 2 && KEYMAP.d === 4 && KEYMAP.f === 5 && KEYMAP.g === 7 && KEYMAP.h === 9 && KEYMAP.j === 11 && KEYMAP.k === 12);
ok('  and the row above is the black keys between them', KEYMAP.w === 1 && KEYMAP.e === 3 && KEYMAP.t === 6 && KEYMAP.y === 8 && KEYMAP.u === 10);
ok('middle C is C4', nameOf(60) === 'C4' && nameOf(57) === 'A3');
const step = 0.125;
const snapped = quantised([{ midi: 60, from: 0.13, to: 0.2, loud: 1 }, { midi: 62, from: 0.49, to: 0.52, loud: 1 }], step);
ok('on the beat, a note starts on the nearest sixteenth', Math.abs(snapped[0].from - 0.125) < 1e-9 && Math.abs(snapped[1].from - 0.5) < 1e-9);
ok('  and is never shorter than one', snapped.every((one) => one.to - one.from >= step - 1e-9));
ok('  and off the beat, nothing moves', quantised([{ midi: 60, from: 0.13, to: 0.2, loud: 1 }], 0)[0].from === 0.13);

const sheet = withoutComments(readFileSync('app/components/KeysSheet.tsx', 'utf8'));
const booth = withoutComments(readFileSync('app/components/ProBooth.tsx', 'utf8'));
ok('a MIDI keyboard is listened to where the browser has Web MIDI, and only there', /typeof navigator\.requestMIDIAccess !== 'function'/.test(sheet) && /kind === 0x90 && data\[2\] > 0/.test(sheet));
ok('the take is counted in by a bar on the click', /const lead = beat \* beats;/.test(sheet) && /started\.current = begin \+ lead;/.test(sheet));
ok('what is played lands on a lane on the bar the line is in, its notes kept', /id: `keys-\$\{Date\.now\(\)\}`/.test(booth) && /notes,\s*\}\]\);/.test(booth) && /renderHum\(notes, voice, seconds, ctx\.sampleRate\)/.test(booth));
ok('  and the press says it takes no credits', /'script\.noCredits', 'no credits'/.test(sheet));

if (bad) {
  console.error(`\ncheck:keys — ${bad} assertion(s) failed.`);
  process.exit(1);
}
console.log('\ncheck:keys — the computer keys are a piano, the notes snap when asked, and they land on a lane kept as notes.');
