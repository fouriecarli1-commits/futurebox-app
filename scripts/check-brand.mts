/**
 * Moving to a real domain has to be one change.
 *
 * ── Why this is worth a gate ─────────────────────────────────────────────
 *
 * `futurebox.app` was once written into a dozen files — the header, the terms,
 * the privacy notice, the feed, the pitch text — and it was not ours. It was
 * pulled into `lib/brand.ts` so that the address is a variable. The failure
 * mode after that is quieter and worse: somebody adds a link, types the host
 * they can see in the browser, and it works. Then the domain is pointed at
 * this app and nine screens follow it and one does not, and the one that does
 * not is found by a customer.
 *
 * So this fails the build on an origin typed anywhere but `brand.ts`.
 *
 * ── And on the things a domain quietly breaks ────────────────────────────
 *
 * A shared link with no Open Graph image is a line of grey text on WhatsApp,
 * which is most of whether anybody presses it. A robots file naming one
 * address while the pages live at another is a map to a place nobody is.
 * Both look fine on the screen and neither is noticed until launch.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { withoutComments } from './prose.mts';

let bad = 0;
const check = (label: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? '  ok ' : '  ✗  '} ${label}${!ok && detail ? ` — ${detail}` : ''}`);
  if (!ok) bad += 1;
};

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === '.next') continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, out);
    else if (/\.tsx?$/.test(path)) out.push(path);
  }
  return out;
}

const files = walk('app');

/* ── Nobody types the address ─────────────────────────────────────────────

   `brand.ts` holds it. `owners.ts` names it inside a comment about a phishing
   trick and is allowed to. The footer carries a third-party badge on somebody
   else's host, which is theirs and not ours to move. */
const ALLOWED = ['app/lib/brand.ts', 'app/lib/server/owners.ts', 'app/components/SiteFooter.tsx'];
const OURS = /(futurebox[a-z0-9-]*\.(app|com|co\.za|io|net|studio)|futurebox-app\.vercel\.app)/;

const typed: string[] = [];
for (const path of files) {
  if (ALLOWED.includes(path)) continue;
  readFileSync(path, 'utf8')
    .split('\n')
    .forEach((line, i) => {
      if (OURS.test(line)) typed.push(`${path}:${i + 1}: ${line.trim().slice(0, 80)}`);
    });
}
check('the address is not typed anywhere but brand.ts', typed.length === 0, typed.join(' | '));

// And brand.ts still reads it from the environment rather than holding it.
{
  const brand = readFileSync('app/lib/brand.ts', 'utf8');
  check('brand.ts reads the host from the environment',
    /process\.env\.NEXT_PUBLIC_SITE_HOST/.test(brand),
    'the host has become a constant again');
  check('and NEXT_PUBLIC_SITE_HOST is written out in full, not computed',
    !/process\.env\[/.test(brand),
    'Next only substitutes what it can see literally; a computed name arrives undefined');
}

/* ── The things a new domain takes with it ────────────────────────────────
   Each of these has to derive from the same host, or the day it changes they
   point at the old one and nothing says so. */
{
  const layout = readFileSync('app/layout.tsx', 'utf8');
  check('the metadata has a base to resolve links against',
    /metadataBase/.test(layout),
    'a relative Open Graph image resolves against nothing and the tag is dropped');
  check('and that base is the site host, not a literal',
    /metadataBase:\s*new URL\(SITE_URL\)/.test(layout));
  check('a shared link carries a picture',
    /openGraph/.test(layout) && /images/.test(layout),
    'a link on WhatsApp is a line of grey text');
}
{
  const robots = readFileSync('app/robots.ts', 'utf8');
  check('robots names a sitemap', /sitemap:/.test(robots));
  check('and builds it from the site host', /SITE_URL/.test(robots),
    'robots points at one address while the pages live at another');
  check('and still keeps crawlers out of the API',
    /'\/api\/'/.test(robots),
    'a crawler walking the API spends somebody’s credits');
}
{
  const sitemap = readFileSync('app/sitemap.ts', 'utf8');
  check('the sitemap is built from the site host', /SITE_URL/.test(sitemap));
  /* A creator's channel is not in it on purpose: those are made by people and
     a list of them goes stale the moment somebody deletes an account.

     Tested against the URLs rather than the file, because the first version
     searched the whole source and matched the word "channel" in the comment
     explaining why there are no channels in it. A check that reads the prose
     around the code is a check that fails on its own documentation. */
  const urls = [...sitemap.matchAll(/url:\s*`([^`]+)`/g)].map((m) => m[1]);
  check('the sitemap actually lists something', urls.length > 0, String(urls.length));
  check('and lists the pages rather than people',
    urls.every((one) => !one.includes('@') && !one.includes('channel')),
    urls.join(' | '));
}

/* ── The NAME, which had drifted the way the address once did ─────────────

   3 October 2026. Carli: *"die naam is nogsteeds nie verander nie."*

   The app was calling itself three different things in three files — "FutureBox
   — Digital Learning & Creative AI Platform" on the tab, "FutureBox" in the
   Open Graph tags, and "FutureBox — write it, sing it, film it" under the icon
   of an installed app — none of them read from anywhere, all of them typed.

   The first was written before the app made a single song, and it was the one
   on the tab and in search.

   `docs/GOING_LIVE.md` §2 settled the name and wrote the reason down: every
   short form of the plain name is taken and serving, FIVE of them by other
   people using the FutureBox name itself, so the distinctive part of ours is
   "Studio". The domain followed that and so did the company. The public title
   did not — and the one place a name has to carry its distinctive part is the
   place the public reads it.

   This is the address rule applied to the name, for the same reason: one
   source, and everything that prints it reads that source. */
{
  const brand = readFileSync('app/lib/brand.ts', 'utf8');
  check('the name lives in brand.ts', /export const APP_NAME/.test(brand));
  check('  and carries the word that makes it distinctive',
    /APP_NAME = '[^']*Studio'/.test(brand),
    'GOING_LIVE §2: five other parties serve the plain name, so "Studio" is the'
    + ' distinctive part — a public title without it puts somebody else\'s mark'
    + ' at the centre of ours');
  check('  and says what the app does in one line',
    /export const APP_LINE/.test(brand));

  for (const [file, what] of [
    ['app/layout.tsx', 'the tab and the shared link'],
    ['app/manifest.ts', 'the label under an installed icon'],
  ] as const) {
    const text = readFileSync(file, 'utf8');
    check(`${what} reads the name rather than typing it`,
      /APP_NAME/.test(text),
      file);
    /* Through `withoutComments`, and this check caught itself on the first run
       without it: the comment in `layout.tsx` explaining WHY the name changed
       quotes the old title, in double quotes, and the scan read its own
       documentation as the fault it describes. Exactly what check:brand's
       sitemap rule met once already, and the third time this repository has
       made it.
 
       `withoutComments` and not `code`: `code` blanks string bodies too, and a
       hard-coded name IS a string body — the thing being looked for. Getting
       that pair the wrong way round has caused three separate false negatives
       in this repository, so it is named here as well. */
    const typed = [...withoutComments(text).matchAll(/['"`][^'"`\n]*FutureBox[^'"`\n]*['"`]/g)]
      .map((m) => m[0])
      .filter((one) => !one.includes('${'));
    check(`  and names it nowhere else in ${file}`,
      typed.length === 0,
      typed.join(' | '));
  }
}

if (bad) {
  console.error(`\ncheck:brand — ${bad} wrong. Moving domain has to be one change.`);
  process.exit(1);
}
console.log('check:brand — the address lives in one file, and everything that prints it reads that file.');
