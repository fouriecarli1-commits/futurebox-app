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

/**
 * Every way of turning a canvas into a file, and why each one is allowed.
 *
 * This list was three entries long and all three said the same thing, which
 * is a helper that had not been written yet: the background remover, changing
 * its edge and the eraser each had their own `toDataURL` handing a canvas back
 * as the picture. They go through one `asPicture` now and this is one line.
 * The rule earned its keep by making that obvious.
 *
 * The rule was a count of one, which was right until the background remover
 * arrived: it makes a cut-out canvas and hands it to an `<img>` so the crop,
 * the look and the export go on working without knowing anything happened.
 * That is a second `toDataURL` and it is NOT a road out — the data URL never
 * leaves the page, there is no anchor and no element anybody can save from.
 *
 * Raising the count to two would have made this rule useless, because the
 * next one would raise it to three. So each maker is named with the reason
 * it does not leave, in the shape `check:handover` already uses for doors
 * that carry nothing: the point is not that the list is right, it is that
 * adding a way to make a file makes somebody say which kind it is, once, in
 * writing.
 */
const INSIDE: Readonly<Record<string, string>> = {
  'made.toDataURL': 'the one helper that hands a canvas back as the picture — the'
    + ' background remover, changing its edge, and the eraser all go through it. The'
    + ' data URL becomes an <img> which becomes the picture, so it never leaves the'
    + ' page: no anchor, and nothing anybody can save from',
  /* ── The shelf, added 8 October 2026 ──────────────────────────
 
     Carli: *"Daar moet ook ’n opsie wees om ’n foto binne die app te
     bêrge."* `keepInApp` draws the picture and writes it into
     `lib/assets.ts`, which is two more makers — and this rule caught both
     within the minute, which is what it is for.
 
     Its canvas is called `shelved` rather than `sheet` ON PURPOSE. The paid
     export's canvas is `sheet`, and naming `sheet.toBlob` here to let the
     free keep through would have excused the paid road out at the same time.
     A variable name is a poor fence, so the fence is somewhere else: this
     entry is only true while `check:shelf` holds that nothing in
     `assets.ts` or `Pictures.tsx` can hand the file back — no
     `downloadBlob`, no anchor with a `download`, no `createObjectURL`, no
     save picker. That check breaks when this reason stops being true. */
  'shelved.toDataURL': 'the free keep, which puts the picture on the device’s own'
    + ' twenty-picture shelf. The data URL goes into `rememberAsset` and nowhere'
    + ' else; `check:shelf` holds that the shelf has no way out, which is what'
    + ' makes the keep free rather than a second export',
  'shelved.toBlob': 'the same keep, for the byte count the shelf records so it can'
    + ' say how much room it is using. The blob is measured and dropped — see'
    + ' `check:shelf`',
  /* ── The picture on its way to be redrawn ─────────────────────
 
     It was `sent.toDataURL` in this room on 9 October 2026, and on the 9th
     it moved into `lib/packpicture.ts` so that several pictures could be
     packed to share one request body. So there is nothing to name here any
     more — and that is exactly the move this list cannot see, which is why
     the block below follows the canvas into the library rather than letting
     the rule quietly end at this file's edge. */
};
const makers = studio.match(/[\w.]*\.(?:toBlob|toDataURL)\(/g) ?? [];
const leaving = makers.filter((one) => !Object.keys(INSIDE).some((kept) => one.startsWith(kept)));
ok(`the studio makes a file that can leave in one place (${leaving.length} of ${makers.length})`,
  leaving.length === 1,
  `${makers.join(', ')} — every unnamed one is a road out, and a road added`
  + ' beside the paid one is the watermark decision reversed by nobody');

/* And a reason left behind for a maker that is gone is a reason that will be
   read as cover for the next one with a similar name. */
const stale = Object.keys(INSIDE).filter((kept) => !makers.some((one) => one.startsWith(kept)));
ok('  and no reason is left behind for one that is gone', stale.length === 0, stale.join(', '));

/* ── The canvases this room calls, which are not in this room ─────────────

   The list above reads ONE file, and on 9 October 2026 the picture-on-its-way
   canvas moved out of it into `lib/packpicture.ts` — correctly, because
   several pictures now have to be shrunk to share one request body. The
   assertion above went red, which is the right behaviour and only half of
   it: deleting the stale entry makes it green again and leaves a canvas this
   room calls with nothing holding it.

   A rule that can be escaped by moving four lines into a library is not a
   rule. So every library this room draws pictures through is read here too,
   and each has to be a dead end: a maker whose output goes onto a request
   and nowhere a person can save from.

   Not every library — the ones named. A sweep of all of `lib/` would catch
   the paid export's own helpers and read as noise within a week. */
const THROUGH: Record<string, string> = {
  'app/lib/packpicture.ts': 'shrinks pictures to fit one request body on their'
    + ' way to Google’s picture model. Its canvas output is cut at the comma and'
    + ' posted as base64; nothing in it hands a file to anybody',
};

for (const [path, why] of Object.entries(THROUGH)) {
  const source = withoutComments(readFileSync(path, 'utf8'));
  const name = path.replace('app/lib/', '');
  /* The closing quote is part of the match. Without it `packpictureX` passes
     as `packpicture`, which is how this assertion was green the first time
     it was negative-tested — a prefix is not a name. */
  const specifier = `'${path.replace('app/lib/', '../lib/').replace(/\.ts$/, '')}'`;
  ok(`  ${name} is called from this room, so it is held to the same rule`,
    studio.includes(`from ${specifier}`),
    `nothing in PostStudio imports it any more — ${why}, and a reason left`
    + ' behind for a library that is gone is cover for the next one');

  ok(`  and ${name} cannot put a file on the device`,
    !/download\s*=|downloadBlob|createObjectURL|showSaveFilePicker|document\.createElement\('a'\)/
      .test(source),
    `${why} — a canvas moved out of the room is only safe while the place it`
    + ' moved to is still a dead end');
}

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

/* `draw(sheet, false, scale)` since 7 October: Carli asked for a choice of
   size on the way out — *"Ook die formaat van export?"* — so the un-guided
   draw takes a multiplier. The flag that separates preview from file is still
   `guides`, which is what this rule is about; the third argument only says
   how many times the post's own size, and is never passed on the preview. */
ok('  and the full size is what the file is drawn at',
  /draw\(sheet, false, scale\)/.test(studio) && /const want = guides/.test(studio),
  'the guides flag is what separates the two, so the file must be the'
  + ' un-guided draw and nothing else');
ok('    and the preview never asks for a multiple of it',
  !/draw\([^,]+, true, /.test(studio),
  'a 2x preview is two megapixels redrawn on every keystroke, and a preview'
  + ' drawn at the file\u2019s size is the file, which is a free road out');

/* ── And the charge is real ──────────────────────────────────────────────── */

ok('the route charges, once per post', /charge\(request, CREDITS\.postOut/.test(route)
  && /`post:\$\{post\}`/.test(route),
  'without the post id as the reference, saving a post twice is two charges'
  + ' and putting a saved post into a film is a third');

ok(`  and the price is ${CREDITS.postOut} credits, not nothing`, CREDITS.postOut >= 1,
  'a charge of zero passes every rule above and collects nothing');

/* ── And nothing ELSE in the photo flow can write a file ───────────────

   Carli, 8 October 2026: *"Die photo editor save ook fotos op 'n mens se
   foon sonder dat mens die export gedruk het."*

   Everything above holds `PostStudio.tsx` to one way out, behind the charge.
   It said nothing about the files AROUND it — the picker, the shelf, the
   thumbnails, the resizer — and "the editor saved something" is a sentence
   about the whole room, not about one file.

   So the whole room is read. There is exactly one line in any of them that
   can put a file on a phone, and it is the one above. If a second ever
   appears, this says so by name rather than by somebody noticing a
   photograph in their gallery.

   What this canNOT rule out, and nothing in a repository can: a picture
   taken through the picker's own Camera option is saved to the gallery by
   the PHONE, before the browser is handed anything. That is the operating
   system doing its job and no code here is involved. */
const NEARBY = [
  'app/components/Pictures.tsx',
  'app/lib/assets.ts',
  'app/lib/brought.ts',
  'app/lib/imagefile.ts',
];
/* `a.download = …` is the only way a page starts a save without the person
   choosing a file themselves; the other two are the explicit pickers. */
const WRITES = /\.download\s*=|showSaveFilePicker|msSaveOrOpenBlob/;
const strays = NEARBY.filter((one) => WRITES.test(withoutComments(readFileSync(one, 'utf8'))));
ok('nothing else in the photo room can put a file on a phone',
  strays.length === 0,
  `${strays.join(', ')} — the shelf and the picker keep things INSIDE the app,`
  + ' in the browser\u2019s own storage. A save that appears among them is a free'
  + ' export wearing a different name');

ok('  and the one that can is the paid one, not a second copy of it',
  (withoutComments(readFileSync('app/components/PostStudio.tsx', 'utf8'))
    .match(/\.download\s*=/g) ?? []).length === 1,
  'two download lines is two prices, and only one of them was decided');

if (bad) {
  console.error(`\ncheck:postpaid — ${bad} assertion(s) failed. A post leaves one way, paid.`);
  process.exit(1);
}
console.log(
  `\ncheck:postpaid — ${ROADS.length} ways out of the post studio, both through the`
  + ' one charge, and a preview nobody can save instead.',
);
