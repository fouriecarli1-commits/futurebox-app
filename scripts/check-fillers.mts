/**
 * Cut the ums: only hesitations are cut, never into a word either side, and
 * the joins fade rather than click.
 */
import { readFileSync } from 'node:fs';
import { EDGE, fillerCuts, isFiller, joinKept, keptSpans, secondsCut } from '../app/lib/fillers.ts';
import { withoutComments } from './prose.mts';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  if (!passed) bad += 1;
  console.log(`  ${passed ? 'ok  ' : 'NOT '} ${what}${passed || !detail ? '' : ` — ${detail}`}`);
};

ok('hesitations are fillers, whatever their case or punctuation', ['um', 'Um,', 'uh...', 'ERM', 'ehm', 'hmm?'].every(isFiller));
ok('  and words somebody may have meant are not', !['like', 'so', 'you', 'know', 'mhm', 'mm', 'ah', 'e', 'a', 'ah-ha', 'umbrella', 'her'].some(isFiller));

const words = [
  { text: 'So', start: 0.2, end: 0.5 },
  { text: 'um,', start: 0.51, end: 0.9 },
  { text: 'uh', start: 0.92, end: 1.2 },
  { text: 'this', start: 1.21, end: 1.5 },
  { text: 'hmm', start: 3.0, end: 3.3 },
];
const cuts = fillerCuts(words);
ok('two fillers side by side are one cut', cuts.length === 2, JSON.stringify(cuts));
ok('  and a cut never reaches into the word before or after', cuts[0].start >= 0.5 && cuts[0].end <= 1.21, JSON.stringify(cuts[0]));
ok('  and takes a little room either side where there is room', Math.abs(cuts[1].start - (3.0 - EDGE)) < 1e-9 && Math.abs(cuts[1].end - (3.3 + EDGE)) < 1e-9);
const kept = keptSpans(cuts, 4);
ok('what stays is the episode between the cuts', kept.length === 3 && kept[0].start === 0 && kept[2].end === 4);
ok('  and what stays and what is cut add up to the whole', Math.abs(kept.reduce((s, k) => s + k.end - k.start, 0) + secondsCut(cuts) - 4) < 1e-9);
ok('nothing to cut is the whole episode kept', keptSpans(fillerCuts([{ text: 'hello', start: 0, end: 1 }]), 2).length === 1);

const rate = 1000;
const flat = new Float32Array(4 * rate).fill(1);
const joined = joinKept(flat, rate, kept);
ok('the joined sound is the kept length', Math.abs(joined.length - Math.round(kept.reduce((s, k) => s + k.end - k.start, 0) * rate)) <= kept.length);
const join = Math.round((kept[0].end - kept[0].start) * rate);
ok('  and a join fades out and back in rather than clicking', joined[join - 1] < 0.2 && joined[join] < 0.2 && joined[Math.round(join / 2)] === 1);
ok('  and the very start and end are not faded', joined[0] === 1 && joined[joined.length - 1] === 1);

const panel = withoutComments(readFileSync('app/components/Transcript.tsx', 'utf8'));
ok('the cut is made on the device, not sent', /decodeAudioData/.test(panel) && /encodeMp3/.test(panel) && !/fetch\('\/api\/[^']*clean/.test(panel));
ok('  and the press says it takes no credits', /'script\.noCredits', 'no credits'/.test(panel));
const room = withoutComments(readFileSync('app/components/PodcastStudio.tsx', 'utf8'));
ok('the cut episode goes back to the draft, made as the episode was', /onCleaned=\{\(audio\) => \{\s*setDraft\(\{ audio, how: ep\.made \}\)/.test(room));

if (bad) {
  console.error(`\ncheck:fillers — ${bad} assertion(s) failed.`);
  process.exit(1);
}
console.log('\ncheck:fillers — only hesitations are cut, cleanly, on the device.');
