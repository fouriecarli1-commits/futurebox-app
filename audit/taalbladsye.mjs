/**
 * The pages that are not the studio, in Afrikaans — and in English.
 *
 * Carli, 12 October 2026: *"Toets elke kamer se taal, daar is afrikaans in
 * die engelse window by cubed class."* `check:taalvas` reads the source for
 * Afrikaans typed into the markup. This reads the SCREEN: with Afrikaans
 * chosen, the Cubed room, the guide and the kids room say their words in
 * Afrikaans, the document says `lang="af"`, and the English fallback of a
 * missing dictionary row does not leak through; with English chosen, the
 * same pages carry no Afrikaans.
 *
 * Mutation that proved it: with the init script writing `en` instead of
 * `af`, every Afrikaans line fails.
 */
import { chromium } from 'playwright';
import { launchOptions, serve } from './where.mjs';

const problems = [];
const check = (label, ok, detail = '') => {
  console.log(`${ok ? '  ok  ' : '  FAIL'} ${label}${!ok && detail ? ` — ${detail}` : ''}`);
  if (!ok) problems.push(label);
};

const PORT = process.argv[2] || '3362';
const server = await serve(PORT);
const browser = await chromium.launch(launchOptions());

async function open(lang) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true });
  await page.addInitScript((one) => { try { window.localStorage.setItem('futurebox.lang.v1', one); } catch {} }, lang);
  await page.route('**/api/kids', (route) => route.fulfill({ json: { open: false } }));
  return page;
}
const text = async (page) => (await page.locator('body').innerText()).replace(/\s+/g, ' ');

/* ── Afrikaans ──────────────────────────────────────────────────────── */
{
  const page = await open('af');
  await page.goto(`${server.url}/cubed`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  let said = await text(page);
  check('the document says it is Afrikaans on the Cubed page', (await page.evaluate(() => document.documentElement.lang)) === 'af');
  check('  and the opening line is hers, in Afrikaans', said.includes('Duik die toekoms in'), said.slice(0, 120));
  /* The badge is set in capitals by CSS, and innerText reads what is drawn.
     It is drawn from `md` up only (the obsidian redesign keeps a phone's
     header to the way back and the language), so its words are read off
     the element rather than off what a phone shows. */
  const badge = (await page.locator('header').first().textContent().catch(() => '')) ?? '';
  check('  and the badge too', /op uitnodiging/i.test(badge), badge.slice(0, 120));
  check('  with no English fallback leaking through', !/By invitation|Dive into the future|classes to a masterclass/i.test(said));

  await page.goto(`${server.url}/guide`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  said = await text(page);
  check('the guide is titled in Afrikaans', said.includes('Die gids'));
  check('  and its kids block too', said.includes('Die kinderkamer'));

  await page.goto(`${server.url}/kids`, { waitUntil: 'networkidle' });
  await page.locator('[data-kidsdoor]').waitFor({ state: 'visible', timeout: 15000 }).catch(() => undefined);
  said = await text(page);
  check("the grown-up's door speaks Afrikaans", said.includes('Voordat jy die foon oorgee'), said.slice(0, 120));
  check('  with no English fallback leaking through', !/Before you hand the phone over|How much may they spend/.test(said));
  await page.close();
}

/* ── English ────────────────────────────────────────────────────────── */
{
  const page = await open('en');
  await page.goto(`${server.url}/cubed`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  let said = await text(page);
  check('the document says it is English on the Cubed page', (await page.evaluate(() => document.documentElement.lang)) === 'en');
  check('  and the opening line is in English', said.includes('Dive into the future'));
  check('  with no Afrikaans on the English screen', !/Duik die toekoms|Op uitnodiging|Winsverdeling|Klasfooi|Katalogus|Ooreenkoms|Klasse\b/i.test(said), said.match(/Duik|Winsverdeling|Klasfooi|Katalogus|Ooreenkoms/i)?.[0] ?? '');

  await page.goto(`${server.url}/kids`, { waitUntil: 'networkidle' });
  await page.locator('[data-kidsdoor]').waitFor({ state: 'visible', timeout: 15000 }).catch(() => undefined);
  said = await text(page);
  check("the grown-up's door speaks English", said.includes('Before you hand the phone over'));
  check('  with no Afrikaans on it', !/Voordat jy|toelaag|krediete/i.test(said));
  await page.close();
}

await browser.close();
server.stop();
if (problems.length) {
  console.error(`\ncheck:taalbladsye — ${problems.length} problem(s):\n  ${problems.join('\n  ')}\n`);
  process.exit(1);
}
console.log('\ncheck:taalbladsye — the pages outside the studio speak the language that was chosen, and only that one.');
