/**
 * No picture leaves the post studio without being charged for.
 *
 * ── The decision this protects ───────────────────────────────────────────
 *
 * Carli, 6 October 2026, asked whether the image tools needed a watermark:
 *
 *   "Onthou dat alles wat ons bied krediete kos, elke keer wanneer iets
 *    afgelaai word kos dit krediete, so 'n watermerk sal nie nodig wees
 *    nie, want hulle sal nie kan export sonder krediete nie."
 *
 * A watermark makes every post worse in order to pay for itself; a credit on
 * the way out leaves the picture clean. That trade only holds while there is
 * exactly one way out and it is the paid one. The day a second road appears,
 * the watermark decision has been reversed by nobody — and it will not look
 * like a reversal, it will look like a convenience.
 *
 * ── Both roads it nearly lost ────────────────────────────────────────────
 *
 * The first came with the film. The video editor cuts and exports entirely
 * on the device — *"no credits, no queue, no waiting"* — so handing a post
 * into it as the film's cover was a free way off the phone through a longer
 * door. It goes through `/api/post/export` for that reason, and because the
 * charge is taken once per post id, a post she already saved is free to put
 * into a film and one that was never saved costs what saving it would have.
 *
 * The second was already there and nobody had noticed. The preview canvas
 * was the full 1080x1920 picture, scaled down by CSS. Right-click on a
 * canvas offers "Save image as…", and that does not hand over a screenshot
 * of a phone screen — it hands over the exact file, at full size, for
 * nothing. The route's own prose says a screenshot is not worth preventing,
 * and that is true and is a different thing.
 *
 * ── What is checked ──────────────────────────────────────────────────────
 *
 * The studio makes a file in exactly one place, that place asks the route
 * first, every way out goes through it, and the preview is drawn smaller
 * than the frame. The last one is also measured in the browser by
 * `audit/postwalk.mjs`, off the canvas rather than the CSS — because CSS is
 * what made this look fine while it was wrong.
 *
 *   npm run check:postpaid
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { withoutComments } from './prose.mts';
import { before, from, upTo } from './order.mts';
import { CREDITS } from '../app/lib/credits';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  if (!passed) bad += 1;
  console.log(`  ${passed ? 'ok  ' : 'NOT '} ${what}${detail && !passed ? ` — ${detail}` : ''}`);
};

const studio = withoutComments(readFileSync(join('app', 'components', 'PostStudio.tsx'), 'utf8'));
const route = withoutComments(readFileSync(join('app', 'api', 'post', 'export', 'route.ts'), 'utf8'));

/* ── One place makes a file ──────────────────────────────────────────────── */

const makers = (studio.match(/\.toBlob\(|\.toDataURL\(/g) ?? []).length;
ok(`the studio turns the canvas into a file in one place (${makers})`, makers === 1,
  'every one of them is a road out, and a road added beside the paid one is'
  + ' the watermark decision reversed by nobody');

/* And that place asks the route BEFORE it draws. Read as a slice rather than
   by "both strings appear", which is true of any order. */
const paid = upTo(from(studio, 'const paidPicture'), '\n  };');
/* `before` and not two `indexOf` calls compared by hand.
 
   check:ordering refused the first version of this line, and it was right to:
   comparing two raw positions reads a missing thing as the first thing. The
   guard I had written happened to be correct and that is not the point — the
   shape is the fault, because the next person copies the shape. */
ok('  and asks to be charged before it draws it',
  paid.length > 0 && before(paid, "'/api/post/export'", '.toBlob('),
  paid.length === 0
    ? 'there is no `paidPicture`, so this rule is reading nothing'
    : 'a charge after the draw is a charge somebody declines by closing the tab');

/* ── Every way out goes through it ───────────────────────────────────────── */

/** Each way a picture can leave, and the function it leaves from. */
const ROADS = [
  { what: 'saved to the device', in: 'const take', by: 'a.download' },
  { what: "handed to the film's cover", in: 'const intoFilm', by: 'onIntoFilm(' },
] as const;

for (const road of ROADS) {
  const body = upTo(from(studio, road.in), '\n  };');
  ok(`  ${road.what} is downstream of the charge`,
    body.length > 0 && body.includes('paidPicture()') && body.includes(road.by),
    body.length === 0
      ? `${road.in} is gone, so this road is not where this rule thinks it is`
      : `it reaches ${road.by} without calling paidPicture()`);
}

/* The list has to be the whole list, or it holds the roads it happens to
   name while a third one is open. `onIntoFilm` and the download anchor are
   the only two things in this file that hand bytes anywhere. */
const handOvers = (studio.match(/\bonIntoFilm\(|a\.download\s*=/g) ?? []).length;
ok(`  and those are all the ways out there are (${handOvers})`,
  handOvers === ROADS.length, 'something hands the picture somewhere this rule does not read');

/* ── The preview is not a deliverable ───────────────────────────────────── */

ok('the preview is drawn smaller than the frame it stands for',
  /const PREVIEW_LONGEST = \d{3};/.test(studio)
  && /to\.width = Math\.ceil\(size\.width \* want\)/.test(studio),
  'right-click on a canvas offers "Save image as…" and hands over the exact'
  + ' file — the preview being the finished picture is a free road out');

ok('  and the full size is what the file is drawn at',
  /draw\(sheet, false\)/.test(studio) && /const want = guides/.test(studio),
  'the guides flag is what separates the two, so the file must be the'
  + ' un-guided draw and nothing else');

/* ── And the charge is real ──────────────────────────────────────────────── */

ok('the route charges, once per post', /charge\(request, CREDITS\.postOut/.test(route)
  && /`post:\$\{post\}`/.test(route),
  'without the post id as the reference, saving a post twice is two charges'
  + ' and putting a saved post into a film is a third');

ok(`  and the price is ${CREDITS.postOut} credit, not nothing`, CREDITS.postOut >= 1,
  'a charge of zero passes every rule above and collects nothing');

if (bad) {
  console.error(`\ncheck:postpaid — ${bad} assertion(s) failed. A post leaves one way, paid.`);
  process.exit(1);
}
console.log(
  `\ncheck:postpaid — ${ROADS.length} ways out of the post studio, both through the`
  + ' one charge, and a preview nobody can save instead.',
);
