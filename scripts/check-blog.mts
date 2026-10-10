/**
 * The blog says things that are true of this app.
 *
 * ── What she asked ───────────────────────────────────────────────────────
 *
 * Carli, 10 October 2026: *"Ek besef ook in spotlight gaan ons 'n Blog ook moet
 * hê, daarin sal ek artikels moet deel oor hoe die verskillende funksies in die
 * app werk."*
 *
 * ── The one way a blog like this fails ───────────────────────────────────
 *
 * Not by being empty. By going quietly out of date.
 *
 * An article that says *"press Add one under Blur a patch"* is a document that
 * breaks the day that button is renamed — and it breaks in the worst possible
 * way, because the article still reads perfectly. Somebody following it cannot
 * find the button, assumes they are looking in the wrong place, and never
 * reports it. The app is then actively teaching people something false about
 * itself, in writing, from the landing page.
 *
 * This repository already has that lesson twice over. `docs/HANDOVER-ECTA.md`
 * is a list for an attorney of what each page says and where, and the whole of
 * `check:handover` exists because an attorney reads a list like that and does
 * not go and look. `check:findable` exists for the same reason about the
 * copilot. Prose written for members is no different, and it is read by more
 * people than either.
 *
 * So every article lists the controls it tells somebody to press, as i18n keys,
 * and this refuses a key the dictionary does not have. Rename a button and the
 * article fails the build. Take a feature out and the article fails the build.
 *
 * ── And it holds the ordinary things too ─────────────────────────────────
 *
 * Both languages for every paragraph, because an article is prose on a public
 * page and half of this app's readers read Afrikaans. A sitemap entry per
 * piece, with the PIECE's date rather than today's — telling a crawler that an
 * article written in October changed this morning is how a site teaches Google
 * to stop believing its own sitemap. And a url that never moves, because a
 * published address is a promise.
 */

import { readFileSync } from 'node:fs';
import { withoutComments } from './prose.mts';
import { PIECES, headingOf, inOrder, isHeading, pieceById, saidIn } from '../app/lib/blog.ts';
import { SURFACE_IDS } from '../app/lib/surfaces.ts';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  if (!passed) bad += 1;
  console.log(`  ${passed ? 'ok  ' : 'NOT '} ${what}${detail && !passed ? ` — ${detail}` : ''}`);
};

const dict = readFileSync('app/lib/i18n.tsx', 'utf8');
const hasKey = (key: string): boolean =>
  new RegExp(`^\\s{2}"${key.replace(/\./g, '\\.')}":`, 'm').test(dict);

/* ── 1. There is a blog at all ────────────────────────────────────────── */

ok(`there are articles to read (${PIECES.length})`,
  PIECES.length >= 3,
  'a blog with one article on it reads as a blog somebody abandoned, which is'
  + ' worse for a landing page than no blog');

/* ── 2. Every article describes controls that exist ───────────────────── */

ok('every control an article tells somebody to press exists',
  (() => {
    const missing: string[] = [];
    for (const piece of PIECES) {
      for (const key of piece.needs) {
        if (!hasKey(key)) missing.push(`${piece.id} → ${key}`);
      }
    }
    for (const one of missing) console.log(`         ${one}`);
    return missing.length === 0;
  })(),
  'an article that names a button which has been renamed still reads'
  + ' perfectly, and the person following it assumes they are looking in the'
  + ' wrong place and never reports it');

ok('  and every article names some',
  PIECES.every((one) => one.needs.length >= 3),
  'an article with nothing to hold it against is an article that can rot'
  + ' without anything noticing');

ok('  and names the room it is about, truthfully',
  (() => {
    const wrong = PIECES
      .filter((one) => one.about !== null && !(SURFACE_IDS as readonly string[]).includes(one.about))
      .map((one) => `${one.id} → ${one.about}`);
    for (const one of wrong) console.log(`         ${one}`);
    return wrong.length === 0;
  })(),
  'an article about a room that is not there is the landing page promising'
  + ' something, and the person finds out on the second click');

/* ── 3. Both languages, all the way through ──────────────────────────── */

ok('every paragraph is written in both languages',
  (() => {
    const thin: string[] = [];
    for (const piece of PIECES) {
      for (const said of [piece.title, piece.blurb, ...piece.body]) {
        if (!said[1]?.trim() || !said[2]?.trim()) thin.push(`${piece.id} → ${said[0]}`);
      }
    }
    for (const one of thin) console.log(`         ${one}`);
    return thin.length === 0;
  })(),
  'half of this app’s readers read Afrikaans, and an article in one language'
  + ' on a page that offers two is a page that says who it was written for');

ok('  and the Afrikaans is not the English pasted twice',
  (() => {
    const copied: string[] = [];
    for (const piece of PIECES) {
      for (const said of [piece.title, piece.blurb, ...piece.body]) {
        /* A heading of one borrowed word is allowed to be the same; a
           sentence is not. Ten characters is past any single word. */
        if (said[1].trim() === said[2].trim() && said[1].trim().length > 10) {
          copied.push(`${piece.id} → ${said[0]}`);
        }
      }
    }
    for (const one of copied) console.log(`         ${one}`);
    return copied.length === 0;
  })(),
  'an untranslated paragraph is silent: the reader cannot tell it from a'
  + ' deliberate one, so nobody ever reports it');

ok('  and a heading is a heading in both',
  PIECES.every((piece) => piece.body.every((said) =>
    said[1].startsWith('## ') === said[2].startsWith('## '))),
  'a paragraph that is a heading in English and prose in Afrikaans comes out'
  + ' as a page with a different shape in each language');

ok('  and a heading loses its marks when it is drawn, in both languages',
  (() => {
    const heading = PIECES.flatMap((one) => one.body).find(isHeading);
    if (!heading) return false;
    return !headingOf(heading, 'en').startsWith('#')
      && !headingOf(heading, 'af').startsWith('#');
  })(),
  'a page with "## " printed on it is a page that leaked its own format');

ok('  and an article is drawn in the language being read, not through the dictionary',
  (() => {
    /* The Afrikaans lives in the article. Handing it to `t(key, english)`
       would put the same sentence in two files, and a key the dictionary has
       never heard of falls back to the English SILENTLY — an Afrikaans reader
       would get an English article and nothing anywhere would say so.
       `check:afrikaans` cannot catch that either: the key is an array index
       here, so its scan cannot see these at all. */
    const spot = withoutComments(readFileSync('app/components/Spotlight.tsx', 'utf8'));
    const body = withoutComments(readFileSync('app/components/BlogBody.tsx', 'utf8'));
    const list = withoutComments(readFileSync('app/components/BlogList.tsx', 'utf8'));
    const reads = (text: string): boolean =>
      /saidIn\(/.test(text) && !/t\(piece\.(title|blurb)\[0\]/.test(text);
    return reads(spot) && reads(body) && reads(list)
      && saidIn(['k', 'English', 'Afrikaans'], 'af') === 'Afrikaans'
      && saidIn(['k', 'English', 'Afrikaans'], 'en') === 'English'
      /* An empty Afrikaans half falls back rather than drawing nothing. The
         check above refuses one, and a blank page would be the worse of the
         two ways to fail. */
      && saidIn(['k', 'English', ''], 'af') === 'English';
  })(),
  'an article written in two languages and only ever drawn in one is the fault'
  + ' this app keeps finding in itself: something built, working, and'
  + ' unreachable');

/* ── 4. The addresses ────────────────────────────────────────────────── */

ok('every article has a url that can be published',
  PIECES.every((one) => /^[a-z0-9]+(-[a-z0-9]+)*$/.test(one.id)),
  'a capital, a space or an accent in a url is a link that half the places it'
  + ' gets pasted will break');

ok('  and no two share one',
  new Set(PIECES.map((one) => one.id)).size === PIECES.length,
  'two articles at one address is one article nobody can reach');

ok('  and an id that is not there answers nothing rather than an empty page',
  pieceById('no-such-article') === undefined,
  'an empty article at a made-up address is a page a crawler indexes');

ok('  and the index reads newest first',
  (() => {
    const order = inOrder().map((one) => one.on);
    return order.every((one, at) => at === 0 || order[at - 1] >= one);
  })(),
  'a blog in the order somebody happened to write the file in is a blog whose'
  + ' newest piece is buried');

/* ── 5. The map, and the dates on it ─────────────────────────────────── */

const sitemap = withoutComments(readFileSync('app/sitemap.ts', 'utf8'));

ok('the sitemap carries the index and every article',
  /\$\{SITE_URL\}\/blog`/.test(sitemap)
  && /\.\.\.PIECES\.map\(\(piece\) => \(\{/.test(sitemap)
  && /\$\{SITE_URL\}\/blog\/\$\{piece\.id\}`/.test(sitemap),
  'these are written to be found, and a page that is not on the map is a page'
  + ' nobody finds');

ok('  and dates each one by when it was written',
  /lastModified: new Date\(piece\.on\)/.test(sitemap),
  'telling a crawler that an article written in October changed this morning'
  + ' is how a site teaches Google to stop believing its own sitemap');

ok('  and the article pages are built rather than rendered on demand',
  /export function generateStaticParams/.test(
    withoutComments(readFileSync('app/blog/[piece]/page.tsx', 'utf8')),
  ),
  'a page rendered on demand answers a crawler slowly and costs money to'
  + ' answer at all');

/* ── 6. The way in ──────────────────────────────────────────────────── */

const spot = withoutComments(readFileSync('app/components/Spotlight.tsx', 'utf8'));
const foot = withoutComments(readFileSync('app/components/SiteFooter.tsx', 'utf8'));

ok('the landing page carries it, which is where she asked for it',
  /data-spotlightblog/.test(spot) && /href="\/blog"/.test(spot),
  'her words: "in spotlight gaan ons ’n Blog ook moet hê"');

ok('  and shows a few rather than all of them',
  /inOrder\(\)\.slice\(0, 3\)/.test(spot),
  'a list of every article on the landing page is a landing page that grows'
  + ' into an index, which is the fault the hero above it was already fixed'
  + ' for');

ok('  and they are links rather than buttons',
  /<Link\s+href=\{`\/blog\/\$\{piece\.id\}`\}/.test(spot),
  'these are pages with their own addresses, meant to be opened in a tab,'
  + ' shared, and found by a crawler — a button does none of that');

ok('  and the footer carries it from every route',
  /href="\/blog"/.test(foot),
  'they are written for somebody who has not signed up, and the footer is the'
  + ' one thing on every page');

console.log(bad === 0
  ? '\n  Every article is in both languages, at an address that will not move,\n'
    + '  on the map with its own date — and every control it names exists.'
  : `\n  ${bad} not right.`);
process.exit(bad === 0 ? 0 : 1);
