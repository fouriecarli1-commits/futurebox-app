/**
 * Make a song's two sliders reach the engine, and the podcast room speaks
 * the app's language.
 *
 * The owner, 14 October 2026: *"Ek wil ook hê daar moet sliders wees by
 * everything in make a song. Light heavy, en weirdness level. Sal die ai
 * musiek masjien dit kan optel?"* — and: *"Kyk net in podcasts. In die
 * engelse app is alles afrikaans daar binne."* And: *"Onthou om in make a
 * song 'n Afrikaans word feedback button te hê."*
 */
import { readFileSync } from 'node:fs';
import { withoutComments } from './prose.mts';
import { weightWords, weirdWords } from '../app/lib/songweight.ts';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : '✗  '} ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) bad += 1;
};
const make = withoutComments(readFileSync('app/components/MakeMusic.tsx', 'utf8'));
const pod = withoutComments(readFileSync('app/components/PodcastStudio.tsx', 'utf8'));

/* ── 1. The sliders, as words the engine reads ────────────────────────── */
ok('the middle of light-to-heavy adds nothing', weightWords(50).length === 0);
ok('  and each end says its side', weightWords(0).includes('very light') && weightWords(100).includes('very heavy'));
ok('weirdness near its default adds nothing', weirdWords(15).length === 0);
ok('  and at the top it asks for the experimental', weirdWords(100).includes('experimental production'));
ok('both go into the style the song is made from',
  /weightWords\(weight\)/.test(make) && /weirdWords\(weirdness\)/.test(make));
ok('  with a slider for each in Everything', /id="make-weight"/.test(make) && /id="make-weirdness"/.test(make));
ok('  and Simple says when either is still set', /weight !== 50/.test(make) && /weirdness !== 15/.test(make));

/* ── 2. The Afrikaans word button beside the song she is hearing ──────── */
ok('the newest song has the Afrikaans word button',
  /<SayItWrong[\s\S]{0,120}said=\{activeTrack\.title\}/.test(make));

/* ── 3. The podcast room in the app's language ────────────────────────── */
const AFRIKAANS_ONLY = ['Aanbieder 1', 'Aanbieder 2', 'Applous', '>Spoed', '>Grootte', 'Tik of plak jou skrip'];
const left = AFRIKAANS_ONLY.filter((one) => pod.includes(one) && !pod.includes(`'${one}`));
ok('no Afrikaans is typed straight into the podcast room', left.length === 0, left.join(', '));
ok('  and the teleprompter starts in the app’s language', /lang === 'af'\s*\?\s*'Welkom/.test(pod));

console.log(bad === 0 ? '\nAll good.\n' : `\n${bad} wrong.\n`);
process.exit(bad === 0 ? 0 : 1);
