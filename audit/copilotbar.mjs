/**
 * Can she reach the thing she types into?
 *
 * "copilot se promting baar is nogsteeds weggesteek agter die button bar heel
 *  onder." — said twice, the second time after it was supposedly fixed.
 *
 * `check:tabbar` passes, and looking at what it asserts explains why: it reads
 * `app/page.tsx` for `paddingBottom` values and checks each one uses
 * `barClearance()`. That is a rule about the page's own padding. It never
 * looks at the copilot, never opens a browser, and cannot see whether the box
 * a person types into is actually under the bar on a 390-pixel screen.
 *
 * So this measures it: the input's rectangle against the bar's, in each room,
 * after scrolling to the bottom. An overlap is the bug; the number is how bad.
 */
import { enter, studio, toRoom } from './enter.mjs';
import { serve, shot } from './where.mjs';

const ROOMS = ['Make a song', 'Video desk', 'Adverts', 'Your voice', 'Podcast', 'The Booth'];
const PORT = process.argv[2] || '3081';

const problems = [];
const check = (label, ok, detail = '') => {
  console.log(`${ok ? '  ok  ' : '  FAIL'} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) problems.push(label);
};

const server = await serve(PORT);
const { browser, page } = await enter({ width: 390, height: 844, at: server.url, touch: true });

try {
  await studio(page);

  for (const name of ROOMS) {
    await toRoom(page, name);
    await page.waitForTimeout(700);
    /* Playwright finds the scroller, because two hand-rolled attempts did not.

       The studio is inside a fixed, independently scrolling layer with the
       body behind it set to `overflow: hidden`, and neither scrolling the
       window nor walking up for an `overflow-y: auto` ancestor moved it. The
       numbers came back byte-identical both times, which is the tell that the
       measurement never changed rather than that the bug is that stable.

       `scrollIntoViewIfNeeded` is the right tool and deliberately does not
       account for a fixed bar painted over the top — that overlap is the
       thing being measured. */
    const box = page.locator('[data-copilot-ask]');
    await box.scrollIntoViewIfNeeded().catch(() => undefined);
    /* And then all the way down.
 
       `scrollIntoViewIfNeeded` stops the moment the element is inside the
       viewport, which for the last element on a page means its bottom edge
       lands just above the fold — and a fixed bar painted over that fold then
       covers it. That is a property of the scrolling, not of the app, and
       measuring it would have reported a bug the person does not have.
       Scrolling the container to its end is what she does with her thumb. */
    const scrolled = await page.evaluate(() => {
      /* Every scrollable ancestor inside the studio — and not the document.

         Two wrong versions of this line came before it. The first stopped at
         the first scroller above the input, which in the voice room is the
         copilot's own transcript: scrolling it moves the conversation, not
         the page, so the input stayed where `scrollIntoViewIfNeeded` left it
         and the number read like a bug in that room. The second scrolled
         everything including `html`, which scrolls the page *behind* the
         fixed studio layer — that carried the input 1788 pixels above the
         fold and the check passed because nothing that is off the screen can
         overlap the bar. A pass earned by hiding the element is worse than
         the failure it replaced.

         So: the scrollers between the input and the studio's fixed layer,
         stopping there, and an assertion below that the box is still on the
         screen when the overlap is measured. */
      const el = document.querySelector('[data-copilot-ask]');
      const moved = [];
      let at = el?.parentElement ?? null;
      while (at && at !== document.body && at !== document.documentElement) {
        if (at.scrollHeight > at.clientHeight + 4) {
          const was = at.scrollTop;
          at.scrollTop = at.scrollHeight;
          moved.push(`${at.tagName.toLowerCase()}.${(at.className || '').split(' ')[0]} ${was}->${at.scrollTop}`);
        }
        at = at.parentElement;
      }
      return moved;
    });
    console.log('    scrollers:', scrolled.join(' | ') || '(none)');
    await page.waitForTimeout(400);

    const how = await page.evaluate(() => ({
      scrollY: Math.round(window.scrollY),
      bodyH: Math.round(document.body.scrollHeight),
      docH: Math.round(document.documentElement.scrollHeight),
      viewport: window.innerHeight,
      bodyOverflow: getComputedStyle(document.body).overflow,
      htmlOverflow: getComputedStyle(document.documentElement).overflow,
    }));
    console.log('    scroll:', JSON.stringify(how));

    const seen = await page.evaluate(() => {
      const bar = document.querySelector('nav[aria-label]');
      /* The copilot's own box: the one text input inside the pane that holds
         the conversation. Matched on the placeholder rather than a class, so
         restyling it does not quietly stop this looking. */
      const el = document.querySelector('[data-copilot-ask]');
      if (!bar || !el) return null;
      const box = { el, r: el.getBoundingClientRect() };
      const b = bar.getBoundingClientRect();
      return {
        input: { top: Math.round(box.r.top), bottom: Math.round(box.r.bottom) },
        bar: { top: Math.round(b.top), bottom: Math.round(b.bottom) },
        overlap: Math.round(Math.max(0, box.r.bottom - b.top)),
        placeholder: box.el.getAttribute('placeholder') || '(none)',
      };
    });

    if (!seen) {
      check(`${name}: the copilot's box was found`, false, 'no input or no bar on this screen');
      continue;
    }
    /* Is there any scroll position where she can see the whole box clear of
       the bar?

       Scrolling to the end is the worst case only for a box at the foot of
       the page. In Make a song, Adverts and the voice room the copilot is
       first on a phone, so the end of the scroll is well past it — three
       rooms failed "is it on the screen" for a box that is perfectly
       reachable, which is a bug in the question, not in the room.

       The box clears the bar when its bottom is above the bar's top, and its
       bottom only rises as she scrolls down, so the end of the scroll is
       where it is highest. Two ways that can be fine:

         - at the end of the scroll the box is still fully on the screen and
           already above the bar; or
         - at the end of the scroll it has gone off the top, which means she
           passed a position where its top was at the fold — and there it
           clears the bar as long as the box is shorter than the gap above
           the bar.

       Anything else is the thing she reported: scrolled as far as it goes,
       and part of the box is still painted over. */
    const height = seen.input.bottom - seen.input.top;
    const past = seen.input.top < 0;
    const reachable = past ? height <= seen.bar.top : seen.input.bottom <= seen.bar.top;
    check(
      `${name}: she can see the whole box she types into, clear of the bar`,
      reachable,
      past
        ? `it scrolls past the top; ${height}px tall against ${seen.bar.top}px above the bar`
        : `${seen.overlap}px of it is behind the bar — input ends ${seen.input.bottom}, bar starts ${seen.bar.top}, "${seen.placeholder}"`,
    );
  }

  await page.screenshot({ path: shot('copilotbar.png'), fullPage: false });
} finally {
  await browser.close();
  server.stop();
}

if (problems.length) {
  console.error(`\n${problems.length} problem(s):\n  ${problems.join('\n  ')}\n`);
  process.exitCode = 1;
} else {
  console.log('\nthe copilot box clears the bar in every room.');
}
