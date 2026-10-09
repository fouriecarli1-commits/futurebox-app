/**
 * An advert comes out as a still, with its words in the picture.
 *
 * ── What she asked ───────────────────────────────────────────────────────
 *
 * Carli, 9 October 2026, twice. The capability: *"onthou nano banana kan
 * woorde in foto sit."* Then: *"gaan aan met die advert desk."*
 *
 * The desk wrote adverts and handed them to the video desk or the voice
 * room, which left the commonest advert there is unmade.
 *
 * ── Why a prompt needs a check at all ────────────────────────────────────
 *
 * Because the ways it fails are all quiet. A model asked to "add a headline"
 * writes its own. One given four strings renders four strings badly. One not
 * told to keep clear of the edges puts the first letter under a feed's crop.
 * And one not told the words are the ONLY words puts a watermark, a fake
 * logo and a line of lorem ipsum in as well.
 *
 * None of that throws. Every one of them comes back as a picture, costs five
 * credits, and is wrong in a way somebody has to look closely to name.
 *
 * ── And the one about where the words really belong ─────────────────────
 *
 * This app can already set type on a picture properly — `PostStudio` has a
 * face, a size, a place and a safe zone. The reason to ask an image model
 * instead is lettering that is PART of the image: on a surface, in the
 * light of the scene. When it comes out wrong, the honest thing is to say
 * where the real text tool is. A fallback that is named is one somebody
 * uses; an unnamed one is a feature that looks broken.
 */

import { readFileSync } from 'node:fs';
import { withoutComments } from './prose.mts';
import { CREDITS } from '../app/lib/credits.ts';
import { MOST_CTA, MOST_HEADLINE, posterWords, worthDrawing } from '../app/lib/adposter.ts';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : '✗  '} ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) bad += 1;
};

console.log('\nAn advert comes out as a still, with its words in it\n');

const ad = {
  headline: 'Your voice, your record',
  cta: 'Start free',
  shot: 'a woman at a mixing desk in warm lamplight, mid shot',
};
const words = posterWords(ad, 'warm film grain, amber and teal');

/* ── 1. The words are given, not left to the model ───────────────────── */

ok('the headline is spelled out for it, in quotes',
  words.includes(`"${ad.headline}"`),
  'the model is asked for "a headline", which means it writes its own — and'
  + ' an advert whose headline is not the one that was written is not the'
  + ' advert');

ok('  and told to spell it exactly',
  /spelled exactly/i.test(words),
  'nothing says the letters matter, so a model paraphrases — which on a'
  + ' poster is a different advert');

ok('  and the call to action goes in too',
  words.includes(`"${ad.cta}"`),
  'the poster says what to feel and not what to do');

ok('  and nothing else does',
  /No other words anywhere/i.test(words) && /no logos|no watermarks/i.test(words),
  'an image model fills empty space with invented brand names, watermarks'
  + ' and lorem ipsum, and a poster carrying a fake logo is unusable');

/* Counted, not read. The first version of this also asserted the prompt did
   not contain "lorem" — while the prompt deliberately SAYS "no lorem ipsum".
   A check reading its own instruction text is the same mistake as one
   reading a comment, and this file has now made it twice in two days. */
ok('  and the body copy is left out',
  words.split('"').length === 5,
  `${(words.split('"').length - 1) / 2} quoted strings — a model given four`
  + ' renders four badly, and two is what a poster actually carries. The'
  + ' body belongs in the caption, where it is real text a person can copy');

/* ── 2. The picture is a picture, not a page ─────────────────────────── */

ok('the lettering is asked to be part of the image',
  /part of the image/i.test(words) && /same light/i.test(words),
  'it is asked for words ON a picture, which the Photo Editor already does'
  + ' better — the only reason to ask a model is lettering that sits in the'
  + ' scene');

ok('  and kept clear of the edges',
  /well inside the frame/i.test(words),
  'a feed crops, and a headline against the edge is a headline with its'
  + ' first letter missing');

ok('  and the campaign look is carried',
  words.includes('warm film grain'),
  'three posters from one brief are three unrelated pictures — the most'
  + ' noticeable thing about a generated set and the cheapest to get right');

/* ── 3. The lines are capped before the model sees them ──────────────── */

const long = posterWords({
  headline: 'x'.repeat(200),
  cta: 'y'.repeat(200),
  shot: 'a street',
});
ok('a headline too long to render is cut before it is sent',
  long.includes(`"${'x'.repeat(MOST_HEADLINE)}"`),
  'a paragraph is sent as a headline, and an image model renders a paragraph'
  + ' as a grey smear');

ok('  and so is the call to action',
  long.includes(`"${'y'.repeat(MOST_CTA)}"`),
  'the same, on the smaller line, where there is even less room');

ok('  and an advert with no headline is not worth drawing',
  !worthDrawing({ headline: '  ', cta: 'Go', shot: 'a street' })
  && !worthDrawing({ headline: 'A line', cta: 'Go', shot: '' }),
  'a poster with no words is a picture, which is what the Photo Editor is'
  + ' for — and paying five credits to find that out is the wrong way round');

/* ── 4. The desk ─────────────────────────────────────────────────────── */

const desk = withoutComments(readFileSync('app/components/Campaign.tsx', 'utf8'));

ok('the desk offers it beside "Film this one"',
  /data-adposter=/.test(desk) && /drawPoster\s*\(/.test(desk),
  'there is no button, so the prompt exists and nobody can reach it');

ok('  and says what it costs before it is pressed',
  /CREDITS\.repaint\}/.test(desk),
  'a button that spends without saying so is the one thing this app does'
  + ' not do');

ok('  and draws it in the shape the campaign is going out in',
  /aspect: shapeFor\(going\)/.test(desk),
  'a square poster for a TikTok campaign is a poster she has to crop, which'
  + ' is the crop this desk exists to avoid');

ok('  and says where the real text tool is when the lettering is wrong',
  /ads\.posterNote/.test(desk) && /Photo Editor/.test(desk),
  'rendering text is the thing image models are worst at, and a fallback'
  + ' nobody is told about is a feature that looks broken');

ok('  and lets go of the picture it replaces',
  /URL\.revokeObjectURL\(was\[key\]\)/.test(desk),
  'every redraw holds another few megabytes for as long as the tab is open,'
  + ' and redrawing is the normal thing to do with a poster');

ok('  and the price it quotes is the one the route charges',
  CREDITS.repaint > 0
  && /CREDITS\.repaint/.test(withoutComments(readFileSync('app/api/google/picture/route.ts', 'utf8'))),
  `the route charges something other than \`CREDITS.repaint\` (${CREDITS.repaint}),`
  + ' so the number on the button is not the number taken');

console.log(bad === 0 ? '\nAll good.\n' : `\n${bad} wrong.\n`);
process.exit(bad === 0 ? 0 : 1);
