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

if (bad) {
  console.error(`\ncheck:brand — ${bad} wrong. Moving domain has to be one change.`);
  process.exit(1);
}
console.log('check:brand — the address lives in one file, and everything that prints it reads that file.');
