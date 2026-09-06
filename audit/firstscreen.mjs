/**
 * How much of a phone the header takes, and whether it lets go.
 *
 * It was `sticky` at every width and three rows deep: the mark and the
 * strapline, five tab pills wrapping onto two lines, and the account row.
 * 224 pixels on an 844-pixel screen — twenty-seven per cent of the phone,
 * pinned, with the feed sliding underneath it.
 */
import { enter } from './enter.mjs';
import { serve, shot } from './where.mjs';

const problems = [];
const check = (label, ok, detail = '') => {
  console.log(`${ok ? '  ok  ' : '  FAIL'} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) problems.push(label);
};

/* This probe used to point at :3000 and assume somebody had put a server
   there. Twenty-four of its twenty-six siblings start their own; now it does
   too, so it runs on a bare machine rather than only on the one it was
   written on. `serve` explains why one per probe rather than one per job. */
const PORT = process.argv[2] || '3252';
const server = await serve(PORT);
const { browser, page } = await enter({ width: 390, height: 844, at: server.url });
await page.waitForTimeout(1400);

const read = await page.evaluate(() => {
  const header = document.querySelector('header');
  const b = header.getBoundingClientRect();
  return {
    height: Math.round(b.height),
    view: window.innerHeight,
    position: getComputedStyle(header).position,
  };
});
const share = Math.round((read.height / read.view) * 100);
console.log(`\nphone @390: header ${read.height}px of ${read.view}px = ${share}% · position: ${read.position}`);
/* From the top, whatever the way in left behind. */
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(300);
await page.screenshot({ path: shot('first-screen.png'), fullPage: false });
check('the header is not pinned on a phone', read.position === 'static');
/* A third, not a fifth. Two rows are unavoidable — the mark with the plan
   chip, and the account row with the language, the appearance and the way into
   the studio — and the five tab pills wrap onto two lines at 390. What makes
   224 pixels harmful is being pinned; unpinned it is a header you scroll past
   once. The number is here so it cannot quietly grow again. */
check('and it is under a third of the screen', share < 33, `${share}%`);

// Scrolling has to actually move it out of the way.
await page.evaluate(() => window.scrollTo(0, 600));
await page.waitForTimeout(400);
const gone = await page.evaluate(() => Math.round(document.querySelector('header').getBoundingClientRect().bottom));
check('and it scrolls away', gone <= 0, `bottom at ${gone}px`);

await browser.close();

/* The desk, signed in.

   The first version opened a bare context at 1280 and found a static header —
   which was true and meaningless: signed out, the page draws a different
   header entirely. A width check has to be looking at the same screen. */
const { browser: deskBrowser, page: desk } = await enter({ width: 1280, height: 900, at: server.url });
await desk.waitForTimeout(1200);
const deskPos = await desk.evaluate(() => getComputedStyle(document.querySelector('header')).position);
console.log(`\ndesk @1280: position: ${deskPos}`);
check('a desk keeps its pinned header', deskPos === 'sticky');
await deskBrowser.close();
server.stop();
if (problems.length) {
  console.error(`\n${problems.length} problem(s):\n  ${problems.join('\n  ')}\n`);
  process.exit(1);
}
console.log('\nthe first screen belongs to the app, not to its own header.');
