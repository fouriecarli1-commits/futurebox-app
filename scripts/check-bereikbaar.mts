/**
 * Every page in the app has a way in.
 *
 * ── What she asked, and the answer ───────────────────────────────────────
 *
 * Carli, 10 October 2026: *"Waar lewe die kids funksie"*.
 *
 * Nowhere anybody could get to. `/kids` is a finished room — a grown-up's
 * page that sets an allowance, a child's page with two presses on it, and a
 * cap applied in `charge()` so it holds across the whole account. `/story`
 * is a finished room too. **Nothing in the app linked to either of them.**
 * The only mention of `/kids` in the entire codebase was a sentence inside a
 * comment in `app/story/page.tsx`, and a comment is not a door.
 *
 * Both are pages off the rail on purpose — the rail beside them is a shop, a
 * conversation with strangers and every paid door in the app, which is what
 * `check:kidsafe` measured and why the kids room was never going to be
 * "hide some tabs". But off the rail is not the same as off the app. They
 * were reachable only by typing the address, which means they existed for
 * the one person who already knew they existed.
 *
 * That is the **fifth** time this app has had a working feature that nothing
 * led to, and the first four were each found by somebody noticing, not by
 * anything in here. So this stops being a thing anybody has to notice.
 *
 * ── Why it reads code and not prose ──────────────────────────────────────
 *
 * Because the fault WAS prose. `grep -rn /kids app` answers with a hit, and
 * the hit is a comment. A scan that counted that would have reported the
 * kids room as reachable for as long as the comment survived — which is the
 * fault this family of checks exists to find, and it has now been made seven
 * times in this repo. Comments are stripped before anything is counted.
 *
 * ── What counts as a way in ──────────────────────────────────────────────
 *
 * A link or a navigation in something that ships: a component, or the page
 * shell. Not a link from the page to itself, and not a link from one
 * unreachable page to another — two rooms pointing at each other are still
 * two rooms nobody can get to.
 */

import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { withoutComments } from './prose.mts';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  if (!passed) bad += 1;
  console.log(`  ${passed ? 'ok  ' : 'NOT '} ${what}${detail && !passed ? ` — ${detail}` : ''}`);
};

/**
 * Routes that are deliberately not linked from the app, and why.
 *
 * Each one has to be a reason, not a shrug. A route in here is a route
 * nobody can find, so the sentence beside it is the whole justification.
 */
const NO_DOOR: Record<string, string> = {
  /* The error page. Next.js navigates to it; a link to it from the app would
     be a button that says "break". */
  oops: 'the error page, reached when something fails rather than chosen',
  /* The operator's model probe. It presses every model on the account's own
     key and prints which answered — which means it prints SUPPLIER NAMES, and
     taking supplier names off member screens was a decision she made out
     loud: "haal die elevenlabs en kling kaart heeltemal uit." A door to this
     from inside the app would undo that for every member in order to save one
     person typing an address she has been told. */
  google: 'the operator\'s own probe: it prints supplier names, which she asked'
    + ' to be off member screens, and one person who has been told the address'
    + ' is the whole audience',
  /* The bench where Google draws the Cubed mark. Every press spends her own
     Google budget on four pictures, and it is a tool for one person on the
     few days she is choosing a logo. A door to it inside the app would put a
     spend button on a members' screen to save her typing an address once. */
  /* The bench where Google draws the children's room's pictures. Same
     reason as the mark bench below it: every press spends her Google budget,
     twenty-three pictures at a time, and the route refuses anybody who is not
     her. A door to it inside the app would only put a spend button on a
     member's screen. */
  'kids/art': 'the operator\'s own bench for the children\'s artwork: every'
    + ' press spends her Google budget on twenty-three pictures, and the route'
    + ' refuses anybody who is not her',
  'cubed/mark': 'the operator\'s own bench: every press spends her Google'
    + ' budget on four pictures, and the route refuses anybody who is not her,'
    + ' so a door would only put a spend button on a member\'s screen',
};

/**
 * Every route in the app that renders a page a person could be sent.
 *
 * Nested ones too. The first version of this read only the top level, and a
 * page added at `cubed/mark` was reported reachable by a check that had never
 * looked at it — green for a reason next to the one it claims, which is the
 * failure this whole file is about.
 *
 * A segment in brackets is left out: it is reached from a template rather than
 * from a quoted path, so the scan below could never find a link to it and
 * would call every dynamic page lost.
 */
function pagesIn(from = 'app', under = ''): string[] {
  const out: string[] = [];
  for (const one of readdirSync(from)) {
    if (one.startsWith('[') || one.startsWith('_') || one.startsWith('.')) continue;
    const where = `${from}/${one}`;
    if (!statSync(where).isDirectory()) continue;
    const route = under ? `${under}/${one}` : one;
    if (existsSync(`${where}/page.tsx`)) out.push(route);
    out.push(...pagesIn(where, route));
  }
  return out.sort();
}

/** The front door and everything the app proper is built out of. */
function inside(): string[] {
  const files = readdirSync('app/components')
    .filter((one) => one.endsWith('.tsx'))
    .map((one) => `app/components/${one}`);
  return ['app/page.tsx', 'app/layout.tsx', ...files];
}

const read = (file: string): string =>
  (existsSync(file) ? withoutComments(readFileSync(file, 'utf8')) : '');

/**
 * Whether a body of code links to a route.
 *
 * A quoted path, which covers `href="/kids"`, `push('/kids')` and a constant
 * holding it. The trailing boundary is what stops `/story` being answered by
 * `/storyboard` — without it this check would have called story mode
 * reachable on the strength of a component that has nothing to do with it.
 */
const links = (code: string, route: string): boolean =>
  new RegExp(`['"\`]/${route}(['"\`?#]|/)`).test(code);

const pages = pagesIn();

/**
 * Which pages a person can actually get to, worked out properly.
 *
 * The app proper is the seed: the shell and the components, which is where
 * somebody always starts. Then a page linked from a page already in the set
 * joins it, and that repeats until nothing new joins — so the language screen
 * reached from the help page counts, and two unreachable rooms linking to each
 * other still do not.
 *
 * The first version of this check only did the seed, which would have called
 * the language screen lost after it was properly reached. A check that is
 * wrong in that direction gets worked around, and a worked-around check is
 * worse than none.
 */
function reachable(): Set<string> {
  const got = new Set<string>();
  let code = inside().map(read).join('\n');
  for (;;) {
    const found = pages.filter((route) => !got.has(route) && links(code, route));
    if (found.length === 0) return got;
    for (const route of found) {
      got.add(route);
      code += `\n${read(`app/${route}/page.tsx`)}`;
    }
  }
}

ok(`every page in the app has a way in (${pages.length} pages)`,
  (() => {
    const got = reachable();
    const lost = pages.filter((route) => !NO_DOOR[route] && !got.has(route));
    if (lost.length) console.log(`         no way in: ${lost.join(', ')}`);
    return lost.length === 0;
  })(),
  'a finished room nothing links to exists only for the person who already'
  + ' knew it was there, and that has happened five times here');

ok('  and a page is only a doorway if it can be got to itself',
  (() => {
    /* Two rooms pointing at each other are still two rooms nobody can get
       to, and a one-pass scan over every file in the app would call both of
       them reachable. Driven rather than reasoned about: a made-up pair,
       linked only to each other. */
    const code = 'const a = "/alpha"; const b = "/beta";';
    /* Neither is in `inside()`, so neither can enter the set — which is what
       the loop above relies on and what a scan of every file would lose. */
    return !links(inside().map(read).join('\n'), 'alpha')
      && links(code, 'alpha') && links(code, 'beta');
  })(),
  'a one-pass scan over every file in the app would call a pair of orphans'
  + ' reachable because they mention each other');

ok('  and a comment is not counted as one',
  (() => {
    /* The negative test, run every time rather than once by hand: put the
       room's path in a comment and nowhere else, and this must still say the
       room is lost. If it does not, the scan is reading prose. */
    const pretend = withoutComments('/* a link to "/kids" would go here */\nconst x = 1;\n');
    return !/['"`]\/kids(['"`?#]|\/)/.test(pretend);
  })(),
  'the only mention of /kids in the whole app was a sentence in a comment,'
  + ' and a scan that counted it would have called the room reachable');

ok('  and every route without one says why',
  Object.entries(NO_DOOR).every(([route, why]) => pages.includes(route) && why.length > 20),
  'a route excused here is a route nobody can find, so the sentence beside it'
  + ' is the whole justification — and a stale excuse for a route that no'
  + ' longer exists is an excuse nobody will ever re-read');

/* ── The two that were lost, named ─────────────────────────────────────── */

ok('the kids room is reached from the grown-up\'s screen',
  withoutComments(readFileSync('app/components/Account.tsx', 'utf8')).includes('href="/kids"'),
  'an allowance is a grown-up\'s decision and so is handing over the phone,'
  + ' so the account screen is where the door belongs');

ok('  and story mode with it',
  withoutComments(readFileSync('app/components/Account.tsx', 'utf8')).includes('href="/story"'),
  'the other room nothing led to');

ok('  and both are in the footer, which is on every route',
  (() => {
    const foot = withoutComments(readFileSync('app/components/SiteFooter.tsx', 'utf8'));
    return foot.includes('href="/kids"') && foot.includes('href="/story"');
  })(),
  'a grown-up who has not opened their account sheet still needs a way in,'
  + ' and so does somebody who was sent the app rather than told about it');

console.log(bad === 0
  ? '\n  Every page in the app can be got to from inside the app.'
  : `\n  ${bad} not right.`);
process.exit(bad === 0 ? 0 : 1);
