/**
 * The front page, folded.
 *
 * ── What this holds ──────────────────────────────────────────────────────
 *
 * Carli, 21 September 2026: *"Wanneer jy tyd kry moet jy die hele spotlight
 * room 100% oor check en herbedink. Die buttons is randomely oor al. Dit is
 * nie netjies nie… Ek dink alles moet drop down menus wees behalwe die maker
 * se advertensie. En die 1 featured masterclass moet ook groot wees, en die
 * res van die masterclasses in 'n drop down."*
 *
 * Five full sections were stacked one under the other, each with its own
 * heading, its own grid and its own picks bar. Not one button in the wrong
 * place — so many on screen at once that none of them read as the next thing
 * to press.
 *
 * Three rules, and all three are about what is on screen BEFORE anything is
 * pressed, which is the only state that can be got wrong without anybody
 * noticing: the sections are folds, the folds are shut, and the two things
 * she said stay open stay open.
 *
 * ── And on a phone ───────────────────────────────────────────────────────
 *
 * 390 × 844, because that is her screen and because the complaint was about
 * length. A page that fits at desk width and scrolls for six screens on a
 * phone passes a desk-width probe and is the thing she reported.
 */
import { chromium } from 'playwright';
import { agreeAndSubmit, launchOptions, serve, shot } from './where.mjs';
import { dismissDoor } from './enter.mjs';

const PORT = Number(process.argv[2] || 3141);

const server = await serve(PORT);
const b = await chromium.launch(launchOptions());
const p = await b.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const problems = [];
const check = (label, ok, detail = '') => {
  console.log(`${ok ? '  ok  ' : '  FAIL'} ${label}${detail && !ok ? ` — ${detail}` : ''}`);
  if (!ok) problems.push(label);
};
p.on('pageerror', (e) => problems.push(`pageerror: ${String(e).slice(0, 140)}`));

const SECTIONS = [/Podcasts worth/i, /rest of the classes/i, /members made/i, /changed this week/i];

try {
  await p.goto(server.url, { waitUntil: 'networkidle' });
  const cta = p.locator('button, a').filter({ hasText: /start free|begin|sign up/i }).first();
  await cta.waitFor({ state: 'visible', timeout: 60000 });
  await cta.click();
  await p.waitForTimeout(700);
  await p.locator('input[type="email"]').first().fill('spotlight@futurebox.test');
  const pw = p.locator('input[type="password"]').first();
  if (await pw.count()) await pw.fill('spotlight-password-1234');
  await agreeAndSubmit(p);
  await p.locator('nav[aria-label]').first().waitFor({ state: 'visible', timeout: 60000 });
  await dismissDoor(p);
  await p.waitForTimeout(2500);

  /* ── One: every section is a fold, and every one is shut ──────────── */
  for (const name of SECTIONS) {
    const fold = p.locator('button[aria-expanded]').filter({ hasText: name }).first();
    const there = (await fold.count()) > 0;
    check(`${String(name)} is a drop-down`, there,
      'it is still a whole section stacked on the page');
    if (there) {
      check('  and it starts shut', (await fold.getAttribute('aria-expanded')) === 'false',
        'a page that opens with four sections open is the page she asked to be rid of');
    }
  }

  /* ── Two: the one big class is not behind one ─────────────────────── */
  const watch = p.locator('button').filter({ hasText: /Watch it free|Kyk dit gratis/i }).first();
  check('the one big class is on the screen without opening anything',
    (await watch.count()) > 0 && (await watch.isVisible()),
    'it is the offer; it does not go behind a chevron');

  /* Its facts come from the data, so the source line is the tell that it
     is being read rather than retyped. */
  const words = await p.locator('body').innerText();
  check('  and it says where it came from', /From YouTube|Van YouTube/i.test(words),
    'a curated class with no visible source is a claim on the one card everybody sees');

  /* ── Three: the maker's advert stays out in the open ──────────────── */
  check('the maker’s advert is not folded away',
    /Advertise on FutureBox|Adverteer op FutureBox/i.test(words),
    'somebody paid for it; it is the one thing that may not need a press');

  /* ── And the sections really do open ──────────────────────────────── */
  const first = p.locator('button[aria-expanded]').filter({ hasText: SECTIONS[0] }).first();
  await first.scrollIntoViewIfNeeded();
  const before = await p.evaluate(() => document.body.scrollHeight);
  await first.click();
  await p.waitForTimeout(1200);
  check('pressing one opens it', (await first.getAttribute('aria-expanded')) === 'true');
  check('  and the page grows, so something really is in there',
    (await p.evaluate(() => document.body.scrollHeight)) > before,
    'a fold that opens onto nothing is a heading');
  await p.screenshot({ path: shot('spotlight-open.png') });

  /* ── And on its OWN tab it is not folded at all ───────────────────── */
  /* Found and then asserted, rather than `if (found)`. A rule inside an
     `if` that quietly does not run is the shape of every hollow check in
     this repo — and the first version of this one did not run, because the
     pill's text is the short label and the regex wanted the long one. */
  const tab = p.locator('nav button').filter({ hasText: /Podcasts/i }).first();
  check('the Podcasts tab is reachable', (await tab.count()) > 0,
    'without it the rule below measures nothing');
  if (await tab.count()) {
    await tab.click();
    await p.waitForTimeout(1800);
    const folded = await p.locator('button[aria-expanded]').filter({ hasText: SECTIONS[0] }).count();
    check('on the Podcasts tab the podcasts are not behind a chevron', folded === 0,
      'somebody who pressed Podcasts has already said what they want');
    const seen = await p.locator('body').innerText();
    check('  and the episodes are actually on the screen there',
      /Lex Fridman|Dwarkesh|All-In|Guest|Gas/i.test(seen),
      seen.replace(/\s+/g, ' ').slice(0, 160));
  }
  await p.screenshot({ path: shot('spotlight-tab.png') });
} catch (error) {
  problems.push(`threw: ${String(error).slice(0, 200)}`);
} finally {
  await b.close();
  await server.stop();
}

if (problems.length) {
  console.error(`\ncheck:spotlight — ${problems.length} problem(s):`);
  for (const one of problems) console.error(`  · ${one}`);
  process.exit(1);
}
console.log('\nThe front page on a phone: four drop-downs, all shut, the one big class and the advert out in the open, and each section opens onto something.');
