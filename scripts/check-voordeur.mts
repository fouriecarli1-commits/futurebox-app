/**
 * The front door, on a screen nobody is holding.
 *
 * ── What she asked ───────────────────────────────────────────────────────
 *
 * The owner, 9 October 2026: *"Gaan aan met die website se home page."* After
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
 * else on it. The owner, repeatedly, and about every screen: *"Kyk dan mooi dat
 * alles mooi allign en netjies is."* Counted rather than eyeballed, because
 * a fifth container added next month at a fifth width is exactly how this
 * happened the first time.
 *
 * **2. The hero cannot be a column of text on a monitor.** 896 pixels of
 * stacked paragraphs centred in a 1,920-pixel window is a phone screen with
 * black either side — it is the literal thing she objected to. At a desk the
 * words go on the left and the thing to look at goes on the right.
 * (Superseded on 13 October 2026, when she asked for one clean column with
 * the video above the door — section 2 below holds that order instead.)
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

import { existsSync, readFileSync } from 'node:fs';
import { withoutComments } from './prose.mts';
import { before } from './order.mts';
import {
  SHIPPED_COVER, SHIPPED_RECORDING, coverFor, hasWelcomeVideo, sourceFor,
} from '../app/lib/welcomevideo.ts';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : '✗  '} ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) bad += 1;
};

console.log('\nThe front door, on a screen nobody is holding\n');

const landing = withoutComments(readFileSync('app/components/Landing.tsx', 'utf8'));

/* ── 1. One gutter ───────────────────────────────────────────────────── */

/* Every section stands in the one gutter, `GUTTER`. The inner columns — the
   hero's words, the door, the price heading — are reading measures inside it
   and are a different decision, so they are not counted here; what is
   counted is that no section draws its OWN outer box at another width. */
const gutters = [...landing.matchAll(/max-w-([0-9a-z]+)\s+mx-auto\s+px-/g)].map((m) => m[1]);
ok('the landing page has one gutter at all',
  gutters.length === 1 && /const GUTTER = 'max-w-/.test(landing),
  `${gutters.length} outer boxes found — the instrument looks for \`max-w-… mx-auto px-…\`, the`
  + ' shape of `GUTTER`');
const sections = [...landing.matchAll(/<(?:section|header|footer)\b[^>]*className=\{?[`'"]([^`'"]*)/g)].map((m) => m[1]);
ok('  and every section of the page stands in it',
  sections.length >= 4 && sections.every((one) => one.includes('${GUTTER}') || !/max-w-/.test(one)),
  sections.filter((one) => !one.includes('${GUTTER}')).join(' | '));

/* ── 2. One column, in her order ─────────────────────────────────────────

   The two-column hero this file used to ask for went on 13 October 2026
   (7c7efa7), at the owner's word: *"Maak eerder die landing page baie skoon. Die
   video moet bo die log in wees. Net onder die login moet die kids room
   bemark word, en dan daarna die pricing."* So the page is one column and
   what is measured is her order — the video, the door, the kids room, the
   prices — because that order is the design now. */
ok('the welcome page runs in her order: the video, the door, the kids room, the prices',
  before(landing, 'data-landingvideo', 'data-landingdoor')
  && before(landing, 'data-landingdoor', 'data-landingkids')
  && before(landing, 'data-landingkids', 'id="pricing"'));

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

/* ── 4. The cover goes with the recording it is a frame of ───────────── */

/* The English cover ships in `public/` because without one a phone paints a
   black rectangle under the play button until somebody presses it. But it is
   a frame OF the shipped recording. Point English at some other file through
   a variable and that still is a card that lies about what is behind it — so
   the helper must hand it out only beside the recording it came from. Driven
   with the variables set and unset, like the recording above. */

const ENGLISH_VARS = ['NEXT_PUBLIC_WELCOME_VIDEO_ENGLISH', 'NEXT_PUBLIC_WELCOME_VIDEO',
  'NEXT_PUBLIC_WELCOME_VIDEO_COVERE', 'NEXT_PUBLIC_WELCOME_VIDEO_COVERA',
  'NEXT_PUBLIC_WELCOME_VIDEO_AFRIKAANS'];
for (const name of ENGLISH_VARS) delete process.env[name];

ok('the shipped English recording has a shipped cover',
  coverFor('en') === SHIPPED_COVER && sourceFor('en') === SHIPPED_RECORDING,
  `with nothing set, English plays ${sourceFor('en')} under a cover of`
  + ` '${coverFor('en')}' — the page is back to the black rectangle`);

ok('  and that cover is a file in public/',
  existsSync(`public${SHIPPED_COVER}`),
  `\`public${SHIPPED_COVER}\` is not there, so the player asks for a picture`
  + ' that 404s and paints nothing, which is the rectangle with an extra request');

/* A JPEG's size is in its SOF0 marker (FF C0): two bytes of length, one of
   precision, then height and width as big-endian shorts. The player holds a
   16:9 box and paints the cover with `object-cover`, so a still of another
   shape is cropped — the presenter's head, if the crop is top and bottom. */
const jpeg = readFileSync(`public${SHIPPED_COVER}`);
let coverW = 0; let coverH = 0;
for (let at = 2; at + 9 < jpeg.length;) {
  if (jpeg[at] !== 0xff) break;
  const marker = jpeg[at + 1];
  const size = jpeg.readUInt16BE(at + 2);
  if (marker === 0xc0 || marker === 0xc2) {
    coverH = jpeg.readUInt16BE(at + 5); coverW = jpeg.readUInt16BE(at + 7); break;
  }
  at += 2 + size;
}
ok('  and it is the shape of the box the player holds, 16:9',
  coverW > 0 && Math.abs(coverW / coverH - 16 / 9) < 0.01,
  `${coverW}×${coverH} — \`object-cover\` in a 16:9 box crops whatever does not fit`);

process.env.NEXT_PUBLIC_WELCOME_VIDEO = 'https://example.test/other.mp4';
ok('  but it does not go over somebody else\'s recording',
  coverFor('en') === '',
  `English pointed at another file still gets '${coverFor('en')}' — a still`
  + ' from one recording over the play button of another');

process.env.NEXT_PUBLIC_WELCOME_VIDEO_COVERE = 'https://example.test/other.jpg';
ok('  and a cover set for that recording wins',
  coverFor('en') === 'https://example.test/other.jpg',
  `the variable is set and the helper answers '${coverFor('en')}'`);
delete process.env.NEXT_PUBLIC_WELCOME_VIDEO;
delete process.env.NEXT_PUBLIC_WELCOME_VIDEO_COVERE;

process.env.NEXT_PUBLIC_WELCOME_VIDEO_AFRIKAANS = WITH;
ok('  and the Afrikaans page never gets the English still',
  coverFor('af') === '',
  `Afrikaans, with its own recording and no cover, answers '${coverFor('af')}'`
  + ' — the English presenter over an Afrikaans recording');
delete process.env.NEXT_PUBLIC_WELCOME_VIDEO_AFRIKAANS;

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
