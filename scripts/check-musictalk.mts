/**
 * What a measurement means, and the ways saying so could go wrong.
 *
 * `docs/MUSIEKDENKE.md` §3.2. `lib/listen.ts` has always measured tempo, key,
 * brightness, weight, density and punch, and has always shown them as numbers.
 * One clause each turns four numbers into what a musician knows. Which makes
 * three things worth guarding, because a confident wrong clause teaches a
 * wrong idea and looks exactly like a right one.
 *
 * 1. **A reading for a measurement that was not taken.** `keyOf` returns ''
 *    when no key was clear and `tempoOf` returns 0 when nothing steady was
 *    found. Inventing "C major" for silence is the single thing this idea
 *    cannot afford.
 * 2. **The relative key, backwards.** A minor key's relative is a major and
 *    the other way round, and "the same seven notes with a different home" is
 *    only true if the pair is right. E♭ minor's relative is G♭ major — six
 *    flats — and not F♯ major, which is a different key on the page.
 * 3. **A band that nothing falls in, or two that overlap.** The bands are
 *    walked in order and the last one catches everything; a gap would give a
 *    number with no reading and no error.
 *
 *   npm run check:musictalk
 */
import { readFileSync } from 'node:fs';
import { readingsOf, type Measured } from '../app/lib/musictalk';

let failures = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : 'NOT'}  ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) failures += 1;
};

const heard = (over: Partial<Measured> = {}): Measured => ({
  bpm: 112, key: 'A minor', brightness: 0.4, weight: 0.2, density: 3, punch: 4, ...over,
});
const noteFor = (m: Measured, of: string) => readingsOf(m).find((one) => one.of === of);

/* ── Nothing measured, nothing said ────────────────────────────────────── */
ok('a song with no steady tempo gets no tempo reading', !noteFor(heard({ bpm: 0 }), 'tempo'));
ok('and a song with no clear key gets no key reading', !noteFor(heard({ key: '' }), 'key'));
/* The rest are always measurable — brightness of silence is a number — so
   they are always there, which is why they need no such guard. */
ok('but the tone readings are still there', readingsOf(heard({ bpm: 0, key: '' })).length === 4,
  String(readingsOf(heard({ bpm: 0, key: '' })).length));

/* ── The relative key ──────────────────────────────────────────────────── */
const minor = noteFor(heard({ key: 'A minor' }), 'key');
ok('a minor key is named as one', minor?.note === 'talk.key.minor');
ok("and A minor's relative is C major", minor?.then === 'C {major}', String(minor?.then));
const major = noteFor(heard({ key: 'C major' }), 'key');
ok('a major key is named as one', major?.note === 'talk.key.major');
ok("and C major's relative is A minor", major?.then === 'A {minor}', String(major?.then));
/* Six flats, not six sharps. The same sounds, a different key on the page,
   and the one a singer was told they were in. */
ok('E flat minor goes to G flat major',
  /^G[♭b] \{major\}$/.test(noteFor(heard({ key: 'E♭ minor' }), 'key')?.then ?? ''),
  String(noteFor(heard({ key: 'E♭ minor' }), 'key')?.then));

/* ── And the word "major" never reaches the screen in English ──────────── */
/* `keyOf` speaks English because the notation is English; the *word* is not
   notation and does not belong on an Afrikaans screen. The library leaves it
   as a token and whoever draws it fills it in. `audit/heard.mjs` found this
   on the page — the clause was Afrikaans and the key above it said "major". */
for (const key of ['A minor', 'C major', 'E♭ major', 'F♯ minor']) {
  const one = noteFor(heard({ key }), 'key');
  /* The tokens are stripped before looking for a bare word, because `\b`
     sits happily between `{` and `m` and the first version of this called
     "A {minor}" a failure. */
  const bare = (one?.value ?? '').replace(/\{(major|minor)\}/g, '');
  ok(`${key} carries its quality as a token`,
    /\{(major|minor)\}/.test(one?.value ?? '') && !/\b(major|minor)\b/i.test(bare),
    String(one?.value));
}

/* ── The bands cover everything ────────────────────────────────────────── */
for (const bpm of [1, 40, 69, 70, 94, 95, 119, 120, 139, 140, 167, 168, 300, 900]) {
  const one = noteFor(heard({ bpm }), 'tempo');
  ok(`${bpm} BPM gets a reading`, Boolean(one && one.note && one.english), String(one?.note));
}
for (const value of [0, 0.0001, 0.2999, 0.3, 0.5499, 0.55, 0.99, 1]) {
  ok(`brightness ${value} gets a reading`, Boolean(noteFor(heard({ brightness: value }), 'brightness')?.note));
}
/* A measurement outside the range the bands were written for still lands
   somewhere. A number with no reading and no error is the failure that would
   never be noticed. */
ok('an impossible punch still gets a reading', Boolean(noteFor(heard({ punch: 9999 }), 'punch')?.note));
ok('and a negative one does too', Boolean(noteFor(heard({ punch: -5 }), 'punch')?.note));

/* ── Every reading it can produce is in the dictionary ─────────────────── */
/* An English clause showing on an Afrikaans screen is silent — the reader
   cannot tell a missing translation from a deliberate one — which is what
   `check:afrikaans` exists for. That check only sees keys that are in the
   dictionary; this one sees the keys this file can emit. */
const dictionary = readFileSync('app/lib/i18n.tsx', 'utf8');
const keys = new Set<string>();
for (const bpm of [50, 80, 110, 130, 150, 200]) keys.add(noteFor(heard({ bpm }), 'tempo')!.note);
for (const b of [0.1, 0.4, 0.8]) keys.add(noteFor(heard({ brightness: b }), 'brightness')!.note);
for (const w of [0.05, 0.2, 0.6]) keys.add(noteFor(heard({ weight: w }), 'weight')!.note);
for (const d of [1, 4, 9]) keys.add(noteFor(heard({ density: d }), 'density')!.note);
for (const p of [2, 4, 9]) keys.add(noteFor(heard({ punch: p }), 'punch')!.note);
keys.add('talk.key.minor');
keys.add('talk.key.major');
const missing = [...keys].filter((one) => !dictionary.includes(`"${one}"`));
ok('every clause this can say is in the dictionary', missing.length === 0, missing.join(', '));
ok('and there are as many as there are bands', keys.size === 20, `${keys.size}`);

console.log(
  failures
    ? `\ncheck:musictalk — ${failures} assertion(s) failed.`
    : '\ncheck:musictalk — nothing measured is nothing said, the relatives are right, and every band lands.',
);
process.exit(failures ? 1 : 0);
