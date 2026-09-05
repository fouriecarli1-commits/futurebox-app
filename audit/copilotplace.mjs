/**
 * Where the copilot sits on a phone.
 *
 * On a desktop it is a third column and its position is obvious. On a phone
 * the three panes stack, and the one that stacks last is the one nobody ever
 * scrolls to. This measures the order they actually come out in, in pixels.
 *
 * Measured against the studio's own scroller, not the window: the studio is a
 * fixed overlay, so window.scrollY belongs to the landing page behind it and
 * adding it gives negative tops and a 23,000-pixel page.
 */
import { enter, studio } from './enter.mjs';
import { shot } from './where.mjs';

const { browser, page, problems } = await enter({ width: 390, height: 844 });
await studio(page);
await page.waitForTimeout(1200);

const place = await page.evaluate(() => {
  const aside = document.querySelector('aside');
  if (!aside) return { error: 'geen aside' };
  const panes = Array.from(aside.parentElement.children);
  const nav = panes.find((el) => el.tagName === 'NAV');
  const work = panes.find((el) => el !== aside && el.tagName !== 'NAV');

  // The scroller is the nearest ancestor that actually overflows.
  let sc = aside.parentElement;
  while (sc && sc !== document.body && sc.scrollHeight <= sc.clientHeight + 4) sc = sc.parentElement;
  if (sc) sc.scrollTop = 0;

  const zero = (sc ?? document.body).getBoundingClientRect().top;
  const box = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { top: Math.round(r.top - zero), h: Math.round(r.height) };
  };
  return {
    order: panes.map((el) => el.tagName.toLowerCase()),
    nav: box(nav),
    work: box(work),
    copilot: box(aside),
    scroll: sc ? Math.round(sc.scrollHeight) : null,
    viewport: window.innerHeight,
  };
});

if (place.error) {
  console.log(place.error);
} else {
  console.log('panes in volgorde :', place.order.join(' → '));
  console.log('rail              : top', place.nav?.top, '· hoogte', place.nav?.h);
  console.log('werkvlak          : top', place.work?.top, '· hoogte', place.work?.h);
  console.log('copilot           : top', place.copilot?.top, '· hoogte', place.copilot?.h);
  console.log('scroller          :', place.scroll, 'px · venster', place.viewport, 'px');
  const need = place.copilot.top;
  console.log(
    need > place.viewport
      ? `→ copilot begin ${need} px af — ${Math.round(need / place.viewport)} skerms se blaai`
      : '→ copilot is bo, sonder om te blaai',
  );
}
if (problems.length) console.log('probleme:', problems.slice(0, 4).join(' | '));

await page.screenshot({ path: shot('copilot-phone.png'), fullPage: false });
await browser.close();
