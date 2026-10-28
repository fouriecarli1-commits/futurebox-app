/**
 * What is in a marked piece: a voice, instruments, a hum, or quiet.
 *
 * The owner, 28 October 2026: *"Hierdie marker se AI magic moet dalk ook 'n
 * gedeelte hê wat sê hum and instrument or vocal in this part."* Held on
 * made sounds whose answer is known: a held tone is a hum, a sung line with
 * syllables and moving notes is a voice, a beat is instruments, the two
 * together are both, and nothing is quiet.
 */
import { readFileSync } from 'node:fs';
import { whatsIn } from '../app/lib/whatsin.ts';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : '✗  '} ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) bad += 1;
};

const rate = 44100;
let seed = 7;
const noise = (): number => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
const make = (seconds: number, f: (t: number) => number): Float32Array => {
  const out = new Float32Array(rate * seconds);
  for (let i = 0; i < out.length; i += 1) out[i] = f(i / rate);
  return out;
};
const hum = make(3, (t) => Math.sin(2 * Math.PI * 110 * t) * 0.4 + Math.sin(2 * Math.PI * 220 * t) * 0.1);
const voice = (() => {
  const out = new Float32Array(rate * 4);
  let phase = 0;
  for (let i = 0; i < out.length; i += 1) {
    const t = i / rate;
    const syllable = t % 0.4 < 0.32 ? 1 : 0;
    const f0 = 200 * 2 ** (((Math.floor(t / 0.4) % 5) * 2) / 12) * (1 + 0.02 * Math.sin(2 * Math.PI * 5.5 * t));
    phase += (2 * Math.PI * f0) / rate;
    let v = 0;
    for (let h = 1; h <= 12; h += 1) {
      const hz = f0 * h;
      const formant = Math.exp(-((hz - 700) ** 2) / (2 * 400 ** 2)) + 0.6 * Math.exp(-((hz - 1800) ** 2) / (2 * 500 ** 2));
      v += Math.sin(phase * h) * formant * 0.3;
    }
    out[i] = v * syllable;
  }
  return out;
})();
const beat = make(4, (t) => {
  const b = t % 0.5;
  return Math.sin(2 * Math.PI * 60 * t) * Math.exp(-b * 10) * 0.7 + ((t + 0.25) % 0.5 < 0.05 ? noise() * 0.4 : 0) + Math.sin(2 * Math.PI * 82 * t) * 0.2;
});
const band = voice.map((v, i) => v * 0.8 + (beat[i] ?? 0) * 0.8);

ok('a held tone is a hum', JSON.stringify(whatsIn(hum, rate)) === '["hum"]', JSON.stringify(whatsIn(hum, rate)));
ok('a sung line is a voice', JSON.stringify(whatsIn(voice, rate)) === '["voice"]', JSON.stringify(whatsIn(voice, rate)));
ok('a beat is instruments', JSON.stringify(whatsIn(beat, rate)) === '["instruments"]', JSON.stringify(whatsIn(beat, rate)));
ok('a voice over a beat is both', JSON.stringify(whatsIn(band, rate)) === '["voice","instruments"]', JSON.stringify(whatsIn(band, rate)));
ok('nothing is quiet', JSON.stringify(whatsIn(new Float32Array(rate * 2), rate)) === '["quiet"]');
const booth = readFileSync('app/components/ProBooth.tsx', 'utf8');
ok('the AI magic sheet says what the marked piece sounds like', /setPieceHeard\(whatsIn\(/.test(booth) && /data-pieceheard/.test(booth));

console.log(bad === 0 ? '\ncheck:whatsin — a hum, a voice, instruments and quiet are told apart, and the booth says which.' : `\ncheck:whatsin — ${bad} wrong.`);
process.exit(bad === 0 ? 0 : 1);
