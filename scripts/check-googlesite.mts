/**
 * Google's site-verification file stays where Google reads it.
 *
 *   npm run check:googlesite
 *
 * The owner, 19 October 2026, with the file Google gave her for the Play
 * Console's "Verify your organisation's website": *"vir die verification om te
 * werk moet hierdie nie na verification afgehaal word nie. dit moet in die app
 * bly."* Google keeps reading it after the first check; a tidy-up that removes
 * an odd-looking .html file from `public/` would quietly un-verify the
 * developer account. So this fails if the file is gone, moved, or changed.
 *
 * And the meta tag Search Console gave her the same day, for the same check:
 * *"To stay verified, don't remove the meta tag, even after verification
 * succeeds."* It is in `app/layout.tsx`, on every page's head.
 */
import { existsSync, readFileSync } from 'node:fs';

const FILE = 'public/google100e5babb70b4d72.html';
const SAYS = 'google-site-verification: google100e5babb70b4d72.html';

const problems: string[] = [];
if (!existsSync(FILE)) problems.push(`${FILE} is gone — Google reads it at /google100e5babb70b4d72.html`);
else if (readFileSync(FILE, 'utf8').trim() !== SAYS) problems.push(`${FILE} no longer says exactly "${SAYS}"`);

const TAG = 'an-qhR7QCq85bGt34BF5QZQaY06FuyQt_86quoCfkp0';
const layout = readFileSync('app/layout.tsx', 'utf8');
if (!layout.includes(`'${TAG}'`) || !/verification:\s*\{\s*google:/.test(layout)) {
  problems.push('app/layout.tsx no longer gives Google its site-verification meta tag');
}

for (const config of ['next.config.mjs', 'vercel.json']) {
  if (existsSync(config) && /google100e5babb70b4d72/.test(readFileSync(config, 'utf8'))) {
    problems.push(`${config} mentions the verification file — a redirect or rewrite of it breaks the check Google makes`);
  }
}

if (problems.length) {
  for (const one of problems) console.error(`  ✗ ${one}`);
  console.error('\ncheck:googlesite — the Play Console website verification would fail.\n');
  process.exit(1);
}
console.log('  ok   the Google site-verification file is in public/, word for word');
console.log('  ok   and every page carries the google-site-verification meta tag');
console.log('\ncheck:googlesite — Google can still find the file that verifies the website.');
