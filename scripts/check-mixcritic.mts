/**
 * ProBooth's mix critic (`lib/mixcritic.ts`), held to what it says on sounds
 * built here so the right answer is known: a voice 15 dB under the song is
 * buried and its fix lands it 4 dB under; rumble under a take is heard and a
 * clean take is left alone; a quiet mix is told to match the loudness; four
 * lanes in the middle are spread with the loudest left there; and a good
 * mix gets nothing said about it.
 */
import { readFileSync } from 'node:fs';
import {
  BURIED_DB, MOST_GAIN, UNDER_SONG_DB, activeDb, critique, fill, gainFor, lowShare, type LaneHeard,
} from '../app/lib/mixcritic.ts';
import { withoutComments } from './prose.mts';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  if (!passed) bad += 1;
  console.log(`  ${passed ? 'ok  ' : 'NOT '} ${what}${passed || !detail ? '' : ` — ${detail}`}`);
};

const rate = 22050;
const tone = (hz: number, amp: number, seconds = 3): Float32Array =>
  Float32Array.from({ length: seconds * rate }, (_, i) => amp * Math.sin((2 * Math.PI * hz * i) / rate));
const add = (a: Float32Array, b: Float32Array): Float32Array => a.map((v, i) => v + (b[i] ?? 0));
const lane = (id: string, kind: LaneHeard['kind'], samples: Float32Array, more: Partial<LaneHeard> = {}): LaneHeard => ({
  id, name: id, kind, samples, rate, gain: 1, pan: 0, space: 0, reverb: false, rumbleOff: false, ...more,
});
const db = (amp: number): number => 20 * Math.log10(amp / Math.SQRT2);

ok('a steady tone reads at its RMS', Math.abs(activeDb(tone(440, 0.5), rate) - db(0.5)) < 0.1);
const gappy = new Float32Array(rate * 4);
gappy.set(tone(440, 0.5, 1), 0);
ok('  and the silence around a phrase does not make it read quieter', Math.abs(activeDb(gappy, rate) - db(0.5)) < 0.2);
ok('  and silence reads as nothing at all', activeDb(new Float32Array(rate), rate) === -Infinity);
ok('40 Hz is nearly all below 80 Hz, a voice at 220 Hz nearly none of it', lowShare(tone(40, 0.5), rate, 80) > 0.3 && lowShare(tone(220, 0.5), rate, 80) < 0.02);

const song = lane('song', 'song', tone(330, 0.5));
const buried = critique([song, lane('Voice', 'take', tone(220, 0.5 * 10 ** (-15 / 20)), { space: 0.2, gain: 0.3 })], null);
const up = buried.find((one) => one.what === 'gain');
ok(`a voice 15 dB under the song is buried (more than ${BURIED_DB})`, Boolean(up), JSON.stringify(buried.map((one) => one.id)));
ok(`  and the fix brings it to ${UNDER_SONG_DB} dB under`, up?.fix.kind === 'gain' && Math.abs(up.fix.gain - 0.3 * 10 ** (11 / 20)) < 0.01, JSON.stringify(up?.fix));
ok('  and says how far under, in words', up ? fill(up.say[1], up.values) === 'Voice is buried: 15 dB under the song.' : false);
ok(`no fix pushes a fader past its top (${MOST_GAIN})`, gainFor(1, -60, 0) === MOST_GAIN);
const loud = critique([lane('song', 'song', tone(330, 0.25)), lane('Voice', 'take', tone(220, 0.99), { space: 0.2 }), lane('Pad', 'keys', tone(440, 0.05))], null);
ok('  and one sitting well over the song is told to come down', loud.some((one) => one.what === 'loud' && one.fix.kind === 'gain' && one.fix.gain < 1));

const rumbly = critique([song, lane('Voice', 'take', add(tone(220, 0.3), tone(35, 0.3)), { space: 0.2 })], null);
ok('rumble under a take is heard, with the rumble filter as the fix', rumbly.some((one) => one.fix.kind === 'rumble' && one.fix.ids.join() === 'Voice'));
const passes = critique([song, ...[1, 2, 3].map((n) => lane(`Pass ${n}`, 'take', add(tone(220, 0.3), tone(35, 0.3)), { space: 0.2 }))], null).filter((one) => one.what === 'rumble');
ok('  and three passes of one rumbly take are one finding that fixes them all', passes.length === 1 && passes[0].fix.kind === 'rumble' && passes[0].fix.ids.length === 3);
ok('  and not once the filter is on', !critique([song, lane('Voice', 'take', add(tone(220, 0.3), tone(35, 0.3)), { rumbleOff: true, space: 0.2 })], null).some((one) => one.what === 'rumble'));
ok('  and never on the song or a beat, whose low end is the point', !critique([lane('Song', 'song', tone(40, 0.5)), lane('Beat', 'beat', tone(45, 0.5))], null).some((one) => one.what === 'rumble'));

const quiet = critique([song], { lufs: -23, target: -14, matching: false });
ok('a mix at -23 LUFS is told to match the loudness', quiet.some((one) => one.fix.kind === 'match'));
ok('  and not when it already does', !critique([song], { lufs: -23, target: -14, matching: true }).some((one) => one.fix.kind === 'match'));

const dry = critique([song, lane('Voice', 'take', tone(220, 0.3))], null);
ok('a dry lead voice over a song is offered a little room', dry.some((one) => one.fix.kind === 'space' && one.fix.id === 'Voice'));

const crowd = critique([song, lane('Lead', 'take', tone(220, 0.3), { space: 0.2 }), lane('Two', 'take', tone(250, 0.2), { space: 0.2 }), lane('Three', 'keys', tone(300, 0.2)), lane('Four', 'beat', tone(90, 0.2))], null);
const spread = crowd.find((one) => one.fix.kind === 'pan');
ok('four lanes all in the middle are spread', Boolean(spread));
ok('  with the loudest left in the middle and the others to alternating sides',
  spread?.fix.kind === 'pan' && !spread.fix.moves.some((one) => one.id === 'Lead') && spread.fix.moves.some((one) => one.pan < 0) && spread.fix.moves.some((one) => one.pan > 0));

const good = critique([song, lane('Voice', 'take', tone(220, 0.35), { space: 0.2, rumbleOff: true })], { lufs: -14.5, target: -14, matching: true });
ok('a mix with nothing wrong gets nothing said about it', good.length === 0, JSON.stringify(good.map((one) => one.id)));

const booth = withoutComments(readFileSync('app/components/ProBooth.tsx', 'utf8'));
const card = withoutComments(readFileSync('app/components/MixCritic.tsx', 'utf8'));
ok('every fix is one undoable step', /const applyFix[\s\S]{0,300}remember\(t\('undo\.mixfix'/.test(booth));
ok('  and the critic hears each lane as it plays, at its fader', /playsOf\(lane, ctx\)[\s\S]{0,400}lane\.gain/.test(booth));
ok('the press says it takes no credits', /data-mixcritic[\s\S]{0,600}script\.noCredits/.test(card));

if (bad) {
  console.error(`\ncheck:mixcritic — ${bad} assertion(s) failed.`);
  process.exit(1);
}
console.log('\ncheck:mixcritic — the critic hears what is there, says nothing about what is not, and every fix is one step.');
