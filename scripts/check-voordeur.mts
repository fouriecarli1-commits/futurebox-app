/**
 * The front door, on a screen nobody is holding.
 *
 * ── What she asked ───────────────────────────────────────────────────────
 *
 * Carli, 9 October 2026: *"Gaan aan met die website se home page."* After
 * the rooms were given a desk layout, and after she said the thing this file
 * exists for: *"Die website moet nie lyk soos 'n foon app nie."*
 *
 * ── Which page that is, which is not the obvious one ─────────────────────
 *
 * Signed in, home is the feed in `app/page.tsx`. Signed OUT — which is
 * everybody arriving for the first time — `page.tsx` returns `<Landing />`
 * and nothing else. So the home page of the website is
 * `app/components/Landing.tsx`, and it is the one screen where somebody
 * decides in about a second whether this is a real product.
 *
 * ── The three things measured, and why each is the phone look ────────────
 *
 * **1. One gutter, not two.** The page had four centred containers at two
 * different widths: the header and the hero at `max-w-4xl`, the prices and
 * the footer at `max-w-6xl`. So the logo at the top sat 128 pixels inside
 * the price cards below it, and nothing on the page lined up with anything
 * else on it. Carli, repeatedly, and about every screen: *"Kyk dan mooi dat
 * alles mooi allign en netjies is."* Counted rather than eyeballed, because
 * a fifth container added next month at a fifth width is exactly how this
 * happened the first time.
 *
 * **2. The hero cannot be a column of text on a monitor.** 896 pixels of
 * stacked paragraphs centred in a 1,920-pixel window is a phone screen with
 * black either side — it is the literal thing she objected to. At a desk the
 * words go on the left and the thing to look at goes on the right.
 *
 * **3. And the thing on the right cannot be allowed to be nothing.** This is
 * the assertion worth having. `WelcomeVideo` returns `null` when there is no
 * recording in the visitor's language, and the Afrikaans recording is an
 * environment variable that may not be set — so a hero with the video in a
 * fixed second column is a hero that is correct in English and half empty in
 * HER language. That is the shape of mistake this repo keeps finding: a thing
 * that is green because it was measured in the one case that works.
 *
 * So `WelcomeVideo` exports the question, `Landing` asks it before choosing a
 * layout, and the two answers are DRIVEN against each other below rather
 * than read — because a condition copied into two files is two conditions
 * the first time one of them moves.
 */

import { readFileSync } from 'node:fs';
import { withoutComments } from './prose.mts';
import { hasWelcomeVideo } from '../app/lib/welcomevideo.ts';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : '✗  '} ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) bad += 1;
};

console.log('\nThe front door, on a screen nobody is holding\n');

const landing = withoutComments(readFileSync('app/components/Landing.tsx', 'utf8'));

/* ── 1. One gutter ───────────────────────────────────────────────────── */

/* A centred container is `max-w-…` next to `mx-auto`. A `max-w-` without it
   is a measure on a paragraph — how wide a line of text is allowed to get —
   and those are a different decision that should not be counted here. */
const widths = new Set(
  [...landing.matchAll(/max-w-([0-9a-z]+)\s+mx-auto|mx-auto\s+max-w-([0-9a-z]+)/g)]
    .map((m) => m[1] ?? m[2]),
);
ok('the landing page has centred containers at all',
  widths.size > 0,
  'none found — the instrument looks for `max-w-… mx-auto`, and finding none'
  + ' means it is measuring nothing rather than that the page has no gutter');

ok('  and all of them are the same width',
  widths.size === 1,
  `${widths.size} different widths (${[...widths].sort().join(', ')}) — the`
  + ' header, the hero, the prices and the footer are four centred boxes, and'
  + ' two widths among them means the logo at the top is inset from the cards'
  + ' below it by the difference');

/* ── 2. A hero that is not a column of text at a desk ────────────────── */

ok('the hero becomes two columns on a wide screen',
  /lg:grid-cols-\[/.test(landing) || /lg:grid-cols-2/.test(landing),
  'nothing in the hero changes shape past `lg`, so a monitor gets the phone'
  + " layout: one narrow column of stacked paragraphs with the window's"
  + ' width unused either side of it');

ok('  and the six things it offers widen too',
  /lg:grid-cols-3/.test(landing),
  'the offer list stops at two columns, which inside a hero column is two'
  + ' long lines of text and outside one is half a monitor of white space');

/* ── 3. The second column cannot be empty ────────────────────────────── */

ok('the hero asks whether there is a video before putting one beside the words',
  /hasWelcomeVideo\s*\(/.test(landing),
  '`hasWelcomeVideo` is never called, so the layout does not know whether the'
  + ' thing it is making room for exists — and in a language with no'
  + ' recording that room is empty');

/* Driven, not read. `WelcomeVideo` has the English default and Afrikaans has
   none unless an environment variable is set, which is exactly the case that
   would be missed by looking at the page in English. */
const WITH = 'https://example.test/af.mp4';

delete process.env.NEXT_PUBLIC_WELCOME_VIDEO_AFRIKAANS;
ok('and with no Afrikaans recording set, the question answers no',
  hasWelcomeVideo('af') === false,
  'it says there is a video for a language that has none, so the hero would'
  + ' hold a column open for a player that renders nothing');

process.env.NEXT_PUBLIC_WELCOME_VIDEO_AFRIKAANS = WITH;
ok('  and yes once one is',
  hasWelcomeVideo('af') === true,
  'setting the recording does not change the answer, so the column would stay'
  + ' shut on a language that now has something to put in it');
delete process.env.NEXT_PUBLIC_WELCOME_VIDEO_AFRIKAANS;

ok('  and English always has one, because it has a file in the repo',
  hasWelcomeVideo('en') === true,
  '`/welcome.mp4` ships in `public/`, so English is the one language that'
  + ' cannot be unset — an answer of no here means the helper is not reading'
  + ' the same default the player does');

/* The one that keeps the two from drifting: the player's own `return null`
   must be the helper's answer and not a second copy of it. */
const player = withoutComments(readFileSync('app/components/WelcomeVideo.tsx', 'utf8'));
ok('  and the player decides by asking the same helper',
  /hasWelcomeVideo\s*\(/.test(player) || /sourceFor\s*\(/.test(player),
  'the player works out whether it has a recording with its own copy of the'
  + ' condition, so the page and the player can disagree — the page holds a'
  + ' column open and the player puts nothing in it, or the reverse');

/* ── And the signed-in home, which is the same complaint ─────────────── */

const feed = withoutComments(readFileSync('app/page.tsx', 'utf8'));
const stops = [...feed.matchAll(/grid-cols-2 md:grid-cols-3([^"'`]*)/g)]
  .filter((m) => !/\b(lg|xl|2xl):grid-cols-/.test(m[1]));
ok('no shelf on the signed-in home stops widening at three columns',
  stops.length === 0,
  `${stops.length} shelf/shelves stop at \`md:grid-cols-3\` — past 768 pixels`
  + ' the cards simply grow, so on a monitor the feed is three enormous'
  + ' tiles where a website would show four or five');

console.log(bad === 0 ? '\nAll good.\n' : `\n${bad} wrong.\n`);
process.exit(bad === 0 ? 0 : 1);
