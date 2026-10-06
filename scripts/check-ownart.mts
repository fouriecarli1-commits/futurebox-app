/**
 * A member's own picture cannot become album art.
 *
 * ── Her decision, in her words ───────────────────────────────────────────
 *
 * Carli, 5 October 2026: *"'n Album art kan net op die spot generate word, of
 * kuns kan gekoop word. Ons blok mense om hulle eie prente in te sit,
 * andersins gaan hulle nooit album art koop nie."*
 *
 * This is a commercial decision and not a safety one, which is exactly why it
 * needs a rule. A safety rule gets re-argued and kept. A commercial rule looks
 * like a missing feature: somebody — me, on some later night — reads "there is
 * no way to use your own picture as a cover" as an obvious gap and closes it
 * in twenty lines, and the artists' side of the market quietly stops paying.
 *
 * ── Two doors, and nothing else ──────────────────────────────────────────
 *
 * A song's cover comes from one of exactly two places:
 *
 *   generated  the file at `<owner>/<trackId>.cover.png`, written only by
 *              `/api/cover` from the picture the engine returns
 *   bought     `art_work`, `art_title` and `art_by` on the `tracks` row,
 *              written only by `/api/artmarket` after a sale
 *
 * ── What is already held, and is not repeated ────────────────────────────
 *
 * `check:coverwall` holds the SERVER side of the first door thoroughly:
 * exactly one route writes a cover file, its bytes come off the engine and not
 * off the request, it never opens the request as a file at all, and a bought
 * piece goes on as a reference rather than an upload.
 *
 * So the server cannot be handed a picture. What nothing held is the other
 * direction — the CLIENT side — and that gap went live the night the post
 * studio was built, because the post studio is a screen whose whole purpose is
 * to take a member's own photograph. Eight screens now accept one. The fault
 * this file is written against is one of those eight growing a line that
 * reaches a cover, which no amount of server-side rigour would see: the server
 * would be handed a prompt or a work id, properly, by a screen that got the
 * picture from the member's camera roll.
 *
 * ── The rule ─────────────────────────────────────────────────────────────
 *
 * No screen that accepts a member's image file may name the cover route or
 * write either half of the bought-art credit. And the one panel that CAN set a
 * cover must not accept an image file.
 *
 * ── What this is NOT about, so it does not get "fixed" ───────────────────
 *
 * A FILM's cover is a different thing and she asked for it herself on 4
 * October: *"Daar moet ook 'n opsie wees om 'n cover foto vir die video te
 * screen shot uit die video, of een in te bring."* The video editor's
 * `data-editorcoverbring` takes a member's own picture on purpose, and must
 * go on doing so.
 *
 * It is a poster saved beside the exported film — `coverName(filmName)` in
 * `lib/videocover.ts`, a jpeg the browser downloads — and it never reaches
 * the covers bucket, the `tracks` row or `/api/cover`. That is why this rule
 * is written against those three names and not against the word "cover":
 * a rule that matched the word would have to either break the film poster or
 * carve out an exception, and an exception is where the next free cover gets
 * in. Album art is the thing artists are paid for. A thumbnail is not.
 *
 *   npm run check:ownart
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { withoutComments } from './prose.mts';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  if (!passed) bad += 1;
  console.log(`  ${passed ? 'ok  ' : 'NOT '} ${what}${detail && !passed ? ` — ${detail}` : ''}`);
};

function files(dir: string, found: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) files(path, found);
    else if (/\.tsx?$/.test(name)) found.push(path);
  }
  return found;
}

/* Prose out first. Every file here explains itself at length and several of
   those notes quote the very strings below — including this one. */
const read = (path: string): string => withoutComments(readFileSync(path, 'utf8'));

/** A screen that takes a picture off the member's device. */
const TAKES_A_PICTURE = /\bACCEPTS\b|accept="image|accept={ACCEPTS}|accept='image/;

const COVER_PANEL = join('app', 'components', 'Sleeve.tsx');

const pickers = files(join('app', 'components'))
  .concat(files(join('app', 'lib')).filter((one) => !one.includes(`${join('lib', 'server')}`)))
  .filter((one) => TAKES_A_PICTURE.test(read(one)))
  .sort();

/* A pattern that stops matching reports a spotless app. Eight screens take a
   picture today; if this ever reads as two, the rule has gone blind and the
   number is the only thing that would say so. */
ok(`screens that take a member's own picture (${pickers.length})`,
  pickers.length >= 6,
  `only ${pickers.length} found — the pattern has stopped matching, not the app stopped asking`);
for (const one of pickers) console.log(`         ${one.replace('app/', '')}`);

/* ── Door one: generated. No picture screen may name the route ─────────── */

for (const path of pickers) {
  const source = read(path);
  ok(`  ${path.replace('app/', '')} does not reach the cover route`,
    !/\/api\/cover/.test(source),
    'a cover is generated from a prompt or bought from an artist; a screen '
      + "holding a member's photograph must not be able to ask for one");
}

/* ── Door two: bought. Nor may one write the credit ────────────────────── */

const CREDIT = /\bart_work\b|\bart_title\b|\bart_by\b/;
for (const path of pickers) {
  ok(`  ${path.replace('app/', '')} does not write the bought-art credit`,
    !CREDIT.test(read(path)),
    'art_work, art_title and art_by are set by /api/artmarket after a sale '
      + 'and by nothing else — a client that sets them is a free cover');
}

/* And the credit really is server-only, or the rule above guards a door that
   is standing open somewhere this list does not look. */
const setsCredit = files(join('app', 'api'))
  .filter((one) => /art_work\s*:/.test(read(one)))
  .sort();
ok(`the bought-art credit is written in exactly one route (${setsCredit.length})`,
  setsCredit.length === 1 && setsCredit[0] === join('app', 'api', 'artmarket', 'route.ts'),
  setsCredit.join(', ') || 'nothing writes art_work, so no sale ever puts a piece on a song');

/* ── The cover panel takes no picture ──────────────────────────────────── */

const panel = read(COVER_PANEL);
ok('the cover panel is the one screen that can set a cover', /\/api\/cover/.test(panel),
  `${COVER_PANEL} no longer asks for a cover, so this check is aimed at the wrong file`);
ok('  and it accepts no file from the member at all',
  !TAKES_A_PICTURE.test(panel) && !/type="file"/.test(panel),
  'an upload field here is the whole decision undone in one line');

/* ── And the post studio's export stays a download ─────────────────────── */

const exportRoute = join('app', 'api', 'post', 'export', 'route.ts');
const exporter = read(exportRoute);
ok('the post export writes nothing into the covers bucket',
  !/\.cover\.png/.test(exporter) && !/\bfrom\('tracks'\)/.test(exporter)
    && !/\.upload\(/.test(exporter),
  'it charges a credit and the browser saves the picture; a post that lands '
    + 'in storage beside a song is a cover by another name');

if (bad) {
  console.error(`\ncheck:ownart — ${bad} assertion(s) failed. A cover is generated or bought.`);
  process.exit(1);
}
console.log(
  `\ncheck:ownart — ${pickers.length} screens take a member's picture and not one of them`
  + ' can turn it into album art.',
);
