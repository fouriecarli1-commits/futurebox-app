/**
 * The advert desk, in Afrikaans, end to end.
 *
 * Every visible string, the brand kit, the platform chips, the brief and the
 * steps — and, the part most likely to be wrong, whether any English is still
 * showing. Client strings go through the dictionary; a message the *server*
 * writes does not, and the advert route writes several.
 *
 * ── Why this file was rewritten, 20 September 2026 ───────────────────────
 *
 * It was found by `check:probefiles`, which was written the same morning to
 * answer "how many of the 120 files in audit/ are actually tests". This one
 * was in the gap, and it was in the gap in the worst way: **it did all the
 * work and then printed the answer.**
 *
 * Twenty-three strings looked for, fifteen English leaks looked for, page
 * errors and HTTP failures collected into `problems` — and then
 * `console.log('missing Afrikaans strings:', missing)` and exit 0. Every run
 * of it was green. Nothing ran it, and if anything had, it would have passed
 * with every string missing.
 *
 * Two faults, and they are the same fault twice:
 *
 *   1. It went to `http://localhost:3000` and assumed somebody had put a
 *      server there — the exact thing `check:probes` forbids, and the reason
 *      it could never be wired into CI.
 *   2. It counted faults instead of failing on them. A test that reports is
 *      a person's job to read; a test that fails is the machine's job to
 *      stop. Only one of those survives being forgotten about.
 *
 * Both are fixed here: its own server on its own port, and `problems`
 * actually decides the exit code.
 */
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';
import { agreeAndSubmit, launchOptions, shot } from './where.mjs';
import { dismissDoor, unfold } from './enter.mjs';

const PORT = 3321;
const HERE = `http://localhost:${PORT}`;
const problems = [];

let b = null;
let server = null;
try {
server = spawn('npx', ['next', 'start', '-p', String(PORT)], { detached: true, stdio: 'ignore' });
for (let tries = 0; tries < 40; tries += 1) {
  await new Promise((r) => setTimeout(r, 1500));
  try {
    const r = await fetch(`${HERE}/`);
    if (r.ok) break;
  } catch { /* not up yet */ }
}

b = await chromium.launch(launchOptions());
const p = await b.newPage({ viewport: { width: 1280, height: 950 } });
p.on('pageerror', (e) => problems.push(`pageerror: ${String(e).slice(0, 160)}`));
p.on('response', (r) => {
  if (r.status() >= 400 && r.url().startsWith(HERE)) {
    problems.push(`HTTP ${r.status()}: ${r.url().replace(HERE, '')}`);
  }
});

await p.goto(HERE, { waitUntil: 'networkidle' });
await p.locator('button').filter({ hasText: /^Afrikaans$/ }).first().click();
await p.waitForTimeout(900);

// Sign in. Without Supabase the account stays on the device, which is what
// makes an unattended run possible at all.
const cta = p.locator('button, a').filter({ hasText: /begin|gratis|teken/i }).first();
await cta.waitFor({ state: 'visible', timeout: 40000 });
await cta.click();
await p.waitForTimeout(700);
await p.locator('input[type="email"]').first().fill('toets@futurebox.test');
const pw = p.locator('input[type="password"]').first();
if (await pw.count()) await pw.fill('toets-wagwoord-1234');
await agreeAndSubmit(p);
/* Waited for, not slept through. A fixed timeout reads whatever is on the
   screen when it expires, which on a slow run is the sign-in form — and the
   probe then reports every Afrikaans string as missing from a page that was
   never the room. The tab bar is the first thing that only exists once the
   app is actually up. `check:probes` holds this for every probe that signs
   in, and this one predates the rule. */
await p.locator('nav[aria-label]').first().waitFor({ state: 'visible', timeout: 40000 });
await p.waitForTimeout(600);

/* The welcome door, waited for and then gone.

   This probe was written before `dismissDoor` existed and never got the
   lesson, because nothing ever ran it: the door draws over the header a
   beat after sign-in, and the Studio button underneath it is visible,
   enabled, stable and unclickable. Fifty-six retries and a timeout.
   `enter.mjs` has said so in a comment since the day it was written. */
await dismissDoor(p);
await p.waitForTimeout(900);

await p.locator('header button').filter({ hasText: /Studio/i }).first().click();
await p.waitForTimeout(1800);

/* The studio opens on its own door — every room as a card — so the rail
   entry may be behind that rather than beside it. Both are tried, in the
   order a person meets them. */
const doorRooms = p.locator('div.fixed.inset-0.z-\\[55\\] button');
const manyDoors = await doorRooms.count();
for (let i = 0; i < manyDoors; i += 1) {
  const first = ((await doorRooms.nth(i).innerText().catch(() => '')) ?? '').split('\n')[0].trim();
  if (/^Advertensies/i.test(first)) {
    await doorRooms.nth(i).click();
    break;
  }
}
await p.waitForTimeout(1600);

const room = p.locator('div.fixed.inset-0.z-50').first();

// The rail entry is Afrikaans now, so find it by its Afrikaans name.
const entry = room.locator('button').filter({ hasText: /^Advertensies/ });
if (await entry.count()) {
  await entry.first().click();
  await p.waitForTimeout(1600);
}
/* Every panel starts folded, so the strings this probe looks for are inside
   cards nobody has opened. Unfolded here for the same reason `makesong` does
   it: a probe that reaches its room without `toRoom` does not get the
   unfolding that lives there. */
await unfold(p);
await p.waitForTimeout(600);

const text = await room.innerText();

// ── Every string this room should be showing in Afrikaans ────────────────
const WANT = [
  ['heading',        /Advertensies/],
  ['what it does',   /Sê wat jy verkoop/],
  ['step 1',         /Sê wat jy verkoop|Sê wat jy verkoop/],
  ['step 2',         /Dit skryf die advertensies/],
  ['step 3',         /Verfilm dit|Verfilm/],
  ['step 4',         /Sit dit uit/],
  ['brand kit',      /Vir wie hierdie advertensies is/],
  ['kit hint',       /Stel dit een keer/],
  ['kit name',       /Wat word dit genoem\?/],
  ['kit voice',      /Hoe klink dit\?/],
  ['kit logo',       /Die logo/],
  ['kit colour',     /Die kleur/],
  ['kit save',       /Hou dit/],
  ['picture strip',  /Voeg .n prent by/],
  ['where',          /Waar gaan dit heen\?|Waar is dit oppad|Waar/],
  ['what label',     /Wat adverteer jy\?/],
  ['who label',      /Vir wie is dit\?/],
  ['offer label',    /Is daar .n aanbod\?/],
  ['tone label',     /Hoe moet dit klink\?/],
  ['market label',   /Geskryf in/],
  ['write button',   /Skryf die advertensies/],
  ['free',           /gratis/i],
];
for (const [what, re] of WANT) {
  const found = re.test(text);
  console.log(`  ${found ? 'ok ' : 'NOT'}  ${what}`);
  if (!found) problems.push(`the room does not show: ${what}`);
}

// ── Anything still in English? ───────────────────────────────────────────
const ENGLISH = [
  'What are you advertising', 'Who is it for', 'Is there an offer',
  'How should it sound', 'Write the adverts', 'Who these adverts are for',
  'Set it once', 'What is it called', 'How does it sound', 'The logo',
  'The colour', 'Keep this', 'Add a picture', 'Written in', 'Where does it run',
];
const leaks = ENGLISH.filter((s) => text.includes(s));
console.log(`\nEnglish left on screen: ${leaks.length ? leaks.join(' | ') : 'none'}`);
for (const one of leaks) problems.push(`still English on the screen: "${one}"`);

await p.screenshot({ path: shot('ads-af.png') });

} finally {
  if (b) await b.close();
  if (server?.pid) { try { process.kill(-server.pid); } catch { /* already gone */ } }
}

if (problems.length) {
  console.error(`\ncheck:adsaf — ${problems.length} problem(s):`);
  problems.forEach((one) => console.error(`  · ${one}`));
  process.exit(1);
}
console.log('\ncheck:adsaf — the advert desk is Afrikaans all the way through, with no English left on it.');
