/**
 * A member's own picture cannot become a song's cover.
 *
 * ── Whose rule this is ───────────────────────────────────────────────────
 *
 * Carli, 6 October 2026, about the image tools she had just asked for:
 *
 *   "'n Album art kan net op die spot generate word, of kuns kan gekoop
 *    word. Ons blok mense om hulle eie prente in te sit, andersins gaan
 *    hulle nooit album art koop nie."
 *
 * That is not a technical preference. The art market pays a real person
 * R200 for a piece and sells it once. A member who can upload their own
 * square has no reason to buy one, and the market quietly stops being a
 * market — not by anybody deciding to close it, but by a convenient button.
 *
 * ── Why a check and not a comment ────────────────────────────────────────
 *
 * On the day this was written the rule already held, and held by ACCIDENT.
 * `/api/cover` happens to take only words, and the one route that does take
 * a photograph happens never to write a cover. Nothing anywhere said either
 * of those was load-bearing, and the next person to add an image editor —
 * which is the very feature this was written alongside — would have had no
 * way to know that "set this as your cover" is the one button they must not
 * build.
 *
 * ── The two legitimate doors, and no third ───────────────────────────────
 *
 *   generated   `/api/cover` POST fetches the finished picture from the
 *               engine's own URL and keeps a copy. The bytes come from the
 *               supplier, never from the request.
 *   bought      `/api/artmarket` sets `art_work` on the track row. No file
 *               moves at all; the artist's piece stays where it is.
 *
 * Everything below is a grep over the routes, which is a weaker instrument
 * than running them — a determined rewrite could satisfy it and still breach
 * the rule. It is not written to defeat somebody who means to; it is written
 * to stop the accident, which is how this rule will actually die.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { withoutComments } from './prose.mts';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  if (!passed) bad += 1;
  console.log(`  ${passed ? 'ok  ' : 'NOT '} ${what}${detail ? ` — ${detail}` : ''}`);
};

/** Every route file under app/api. */
function routes(dir = 'app/api'): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) out.push(...routes(path));
    else if (name === 'route.ts') out.push(path);
  }
  return out;
}

const all = routes();
const COVER = 'app/api/cover/route.ts';

/* ── One writer, and it is the generator ──────────────────────────────── */

/** A file that puts bytes at a path ending `.cover.png`. */
const writesACover = (source: string): boolean =>
  /\.cover\.png/.test(source) && /\.upload\(/.test(source);

const writers = all.filter((one) => writesACover(readFileSync(one, 'utf8')));

ok(`exactly one route writes a cover file (${writers.length})`,
  writers.length === 1 && writers[0] === COVER,
  `${writers.join(', ') || 'none'} — the art market sets a column on the track`
  + ' row and moves no file, and the generator keeps what the engine made. A'
  + ' third writer is a third way to get a picture onto a song, which is the'
  + ' one thing the art market cannot survive');

const cover = readFileSync(COVER, 'utf8');

/* ── And the bytes it writes are the engine's, not the caller's ───────── */

/**
 * The upload's argument, read rather than assumed.
 *
 * `upload(path, await file.arrayBuffer())` where `file` came from
 * `fetch(progress.url)` is the generator keeping its own output. The same
 * line where `file` came from the REQUEST is a member's picture, and the two
 * are three characters apart.
 */
const uploads = cover.match(/\.upload\([^)]*\)/g) ?? [];
ok('  and it uploads exactly once', uploads.length === 1, uploads.join(' | '));

ok('  from a picture fetched off the engine, not off the request',
  /const file = await fetch\(progress\.url\)/.test(cover),
  'the bytes that land at <owner>/<trackId>.cover.png must come from the'
  + ' supplier that just made them. A member supplying those bytes is the'
  + ' upload button this rule exists to prevent');

ok('  and the route never opens the request as a file at all',
  !/request\.(formData|blob|arrayBuffer)\(/.test(cover),
  'a route that can read a file out of its request is one edit away from'
  + ' writing that file to the cover path, however it reads today');

/* ── Others may READ a cover. None may write one ──────────────────────── */

/**
 * `/api/live` names the path too, and that is right: the feed draws the
 * covers of the songs in it. Reading is not the danger. Writing is.
 *
 * Rule one already says only one route uploads to a cover path, so this one
 * asks the other question a second speller raises: do they spell it the SAME?
 * The path is derived rather than stored, which means two spellings are two
 * opinions about where a file lives. Change one and the feed shows blank
 * squares for covers that exist — a failure that looks like a broken
 * generator and is nothing of the sort.
 */
/* The first version of this matched the exact shape
   `${a}/${b}.cover.png`, and that made it blind in the one direction it
   exists to watch: changing `/api/live` to `${a}/covers/${b}.cover.png`
   stopped it MATCHING rather than making it disagree, so the file dropped
   out of the comparison and the rule went green on a broken feed.

   A rule that stops seeing a thing when the thing changes is not a rule. So
   the net is cast on `.cover.png` — which is the part that cannot move
   without the whole idea moving — and whatever literal holds it is read,
   whatever shape it has. */
const spellings = new Map<string, string>();
const names = new Map<string, string>();
const unreadable: string[] = [];
for (const one of all) {
  /* Comments blanked first. This file's own comments quote the path in
     backticks, and so does half the prose in these routes — an earlier
     version of this rule read that prose as code and compared a sentence
     against a path. `withoutComments` leaves the strings, which is what is
     wanted here: the path IS a string. */
  const source = withoutComments(readFileSync(one, 'utf8'));
  /* Anchored on the CLOSING backtick: a cover path literal ends at the file
     name. Allowing anything after it let a stray backtick elsewhere in the
     file pair up with this one and produce a "shape" of punctuation, which
     failed the comparison for the wrong reason and said nothing useful. */
  const found = source.match(/`[^`]*\.cover\.png`/g) ?? [];
  for (const whole of found) {
    /* Normalised by shape rather than by the local variable names, which
       differ between files and are not the thing that has to agree. */
    const shape = whole.replace(/\$\{[^}]+\}/g, '<x>');
    /* A PATH and a NAME are two different literals and both are right.
       `/api/cover` holds the full path to write to, and also the bare file
       name, which it hands to storage as a search term when it asks whether
       a cover already exists. Comparing those two against each other was the
       third wrong version of this rule. */
    if (shape.includes('/')) spellings.set(one, shape);
    else names.set(one, shape);
  }
  if (/\.cover\.png/.test(source) && found.length === 0) unreadable.push(one);
}

const shapes = new Set(spellings.values());
ok(`every route that spells a cover PATH spells it the same (${spellings.size})`,
  shapes.size <= 1,
  [...spellings].map(([where, how]) => `${where}: ${how}`).join(' | ')
  + ' — the path is derived rather than stored, so a disagreement is a cover'
  + ' that exists and cannot be found');

const path = [...shapes][0] ?? '';
const strays = [...names].filter(([, how]) => !path.endsWith(how.replace(/`/g, '') + '`'));
ok('  and a bare file name is the tail of that path',
  strays.length === 0,
  `${strays.map(([w, h]) => `${w}: ${h}`).join(' | ')} against ${path} — the`
  + ' name is handed to storage as a search term, so one that no longer'
  + ' matches the file answers "there is no cover" about a cover that is'
  + ' sitting right there');

ok('  and every mention of a cover sits in a literal this can read',
  unreadable.length === 0,
  `${unreadable.join(', ')} — a path built by joining strings is a path this`
  + ' rule cannot compare, and an earlier version of it simply went quiet'
  + ' when that happened, which is the failure it exists to prevent');

const writers2 = [...spellings.keys()].filter(
  (one) => one !== COVER && /\.upload\(/.test(readFileSync(one, 'utf8')),
);
ok('  and none of the others uploads anything at all',
  writers2.length === 0,
  `${writers2.join(', ')} — a file that can both spell the path and put bytes`
  + ' somewhere is one line away from putting them there');

/* ── The bought door stays a column, not a file ───────────────────────── */

const market = readFileSync('app/api/artmarket/route.ts', 'utf8');
ok('a bought piece goes onto the song as a reference, not as an upload',
  /art_work:/.test(market) && !/\.cover\.png/.test(market),
  'the artist keeps the file and the song points at it. Copying it to the'
  + " member's own storage is how a piece sold once becomes a piece they have");

ok('  and only to a song the caller owns, for a piece sold to them',
  /sold_to !== caller\.id/.test(market) && /\.eq\('owner', caller\.id\)/.test(market),
  'without both, somebody wears a piece they did not buy or puts it on'
  + " somebody else's song");

if (bad) {
  console.error(`\ncheck:coverwall — ${bad} assertion(s) failed.\n`);
  process.exit(1);
}
console.log(
  '\ncheck:coverwall — a cover comes from the generator or from the art'
  + ' market, and from nowhere else.',
);
