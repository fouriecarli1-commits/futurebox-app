/**
 * Nobody may stand at the front of this app's own room and speak as the app.
 *
 * The recording name goes out on every release, sits beside every post in the
 * live room, and is what a stranger on the collab radar reads. So the rule is
 * not a naming convention, it is an impersonation rule, and the only honest
 * way to hold it is a list of the spellings people actually try.
 *
 * Two ways to fail, and they cost different things. **Letting one through** is
 * somebody asking for money in the app's own voice. **Blocking a real name**
 * costs somebody a second choice. So the brand words are matched anywhere in
 * a name and the role words only as the whole of one, and both halves are
 * tested here — including the names that must NOT be refused, which is the
 * half a rule like this quietly gets wrong.
 */
import { fold, isReserved } from '../app/lib/reserved';

const problems: string[] = [];
const check = (label: string, ok: boolean, detail = '') => {
  console.log(`${ok ? '  ok  ' : '  FAIL'} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) problems.push(label);
};

/* The folding is the actual work: every one of these is the same claim to a
   reader and a different string to a computer. */
const SAME = [
  'FutureBox',
  'futurebox',
  'Future Box',
  'Future-Box',
  'future_box',
  'f.u.t.u.r.e.b.o.x',
  'FutureB0x',
  'Fütürebox',
  '  FUTUREBOX  ',
  'fuuuturebox',
  'F u t u r e B o x',
];
for (const one of SAME) {
  check(`"${one}" folds to the same word`, fold(one) === 'futurebox', fold(one));
}

/* What must be refused. Every one of these is somebody claiming to be us. */
const REFUSED = [
  'FutureBox_Official',
  'FutureBox Official',
  'The FutureBox Team',
  'futurebox studio',
  'FutureBoxSupport',
  'futureb0x',
  'Vibefy',
  'official',
  'Official',
  'ADMIN',
  'support',
  'verified',
  'FutureBox',
  // Folds to "administrator": the lookalike map is doing its job, and this is
  // the case that proves it rather than a false positive.
  'admin1strator',
];
for (const one of REFUSED) {
  check(`"${one}" is refused`, isReserved(one));
}

/* And what must not be. A rule that blocks these is a rule that has stopped
   being about impersonation and started being about the word "box". */
const ALLOWED = [
  'Anré Fourie',
  'Official Records',
  'The Box',
  'Boxer',
  'Future Sounds',
  'Box of Rain',
  'Modest Mouse',
  'Mod Sun', // a real artist. "mod" is reserved; "modsun" is not the word.
  'Team Dynamite',
  'The Future',
  'anref.01',
  '',
];
for (const one of ALLOWED) {
  check(`"${one}" is left alone`, !isReserved(one));
}

if (problems.length) {
  console.error(`\n${problems.length} problem(s):\n  ${problems.join('\n  ')}\n`);
  process.exit(1);
}
console.log('\ncheck:reserved — the app’s own name is the app’s own, and real names are not.');
