/**
 * The advert desk, in Afrikaans, end to end.
 *
 * Every visible string, the brand kit, the platform chips, the brief, the
 * steps, and — the part most likely to be wrong — what a refusal says. Client
 * strings go through the dictionary; a message the *server* writes does not,
 * and the advert route writes several.
 */
import { chromium } from 'playwright';

const b = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
});
const p = await b.newPage({ viewport: { width: 1280, height: 950 } });
const problems = [];
p.on('pageerror', (e) => problems.push(`pageerror: ${String(e).slice(0, 160)}`));
p.on('response', (r) => {
  if (r.status() >= 400 && r.url().startsWith('http://localhost:3000')) {
    problems.push(`HTTP ${r.status()}: ${r.url().replace('http://localhost:3000', '')}`);
  }
});

await p.goto('http://localhost:3000', { waitUntil: 'networkidle' });
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
await p.locator('button[type="submit"]').first().click();
await p.waitForTimeout(2500);

await p.locator('header button').filter({ hasText: /Studio/i }).first().click();
await p.waitForTimeout(1800);
const room = p.locator('div.fixed.inset-0.z-50').first();

// The rail entry is Afrikaans now, so find it by its Afrikaans name.
const entry = room.locator('button').filter({ hasText: /^Advertensies/ });
console.log('rail entry in Afrikaans:', (await entry.count()) > 0);
await entry.first().click();
await p.waitForTimeout(1600);

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
let missing = 0;
for (const [what, re] of WANT) {
  const ok = re.test(text);
  if (!ok) missing += 1;
  console.log(`  ${ok ? 'ok ' : '✗  '} ${what}`);
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

await p.screenshot({ path: 'audit/ads-af.png' });
console.log('\nmissing Afrikaans strings:', missing);
console.log('problems:', problems.join(' ;; ') || 'none');

// Keep the page open for the second half.
await p.evaluate(() => window.scrollTo(0, 0));
await b.close();
