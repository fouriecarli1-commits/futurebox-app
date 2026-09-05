/**
 * Where the copilot sits on a phone, room by room.
 *
 * On a desktop it is a third column and its position is obvious. On a phone
 * the three panes stack, and the one that stacks last is the one nobody ever
 * scrolls to. Only the song room lifts it above the working surface, so this
 * checks both halves of that rule: lifted where it should be, and left alone
 * where it should not.
 *
 * Measured against the studio's own scroller, not the window: the studio is a
 * fixed overlay, so window.scrollY belongs to the landing page behind it and
 * adding it gives negative tops and a 23,000-pixel page.
 */
import { enter, studio, toRoom } from './enter.mjs';
import { shot } from './where.mjs';

const measure = (page) =>
  page.evaluate(() => {
    const aside = document.querySelector('aside');
    if (!aside) return { error: 'geen aside' };
    const panes = Array.from(aside.parentElement.children);
    const nav = panes.find((el) => el.tagName === 'NAV');
    /* The phone's room menu is a fourth pane and it stacks first, so a plain
       "the div that is not the rail" picked it up as the working surface and
       reported the copilot below it. Excluded by the button it holds. */
    const menu = panes.find((el) => /All rooms|Alle kamers/.test(el.innerText ?? ''));
    const work = panes.find((el) => el !== aside && el !== menu && el.tagName !== 'NAV');

    let sc = aside.parentElement;
    while (sc && sc !== document.body && sc.scrollHeight <= sc.clientHeight + 4) sc = sc.parentElement;
    if (sc) sc.scrollTop = 0;

    const zero = (sc ?? document.body).getBoundingClientRect().top;
    const top = (el) => (el ? Math.round(el.getBoundingClientRect().top - zero) : null);
    return { nav: top(nav), menu: top(menu), work: top(work), copilot: top(aside), viewport: window.innerHeight };
  });

const { browser, page, problems } = await enter({ width: 390, height: 844 });
await studio(page);
await page.waitForTimeout(1200);

let bad = 0;
for (const [room, wantFirst] of [['Make a song', true], ['Studio', false], ['The booth', false]]) {
  /* Through the phone's room menu, not the rail: the rail is hidden below md
     now, so clicking it timed out and took every measurement with it. Matched
     on the entry's first line, because the hint under it also holds room
     names. */
  /* In the way a person gets there: the door, not a dropdown. */
  try {
    await toRoom(page, room);
  } catch {
    console.log(`${room}: geen pad in nie`);
    bad += 1;
    continue;
  }
  const m = await measure(page);
  if (m.error) { console.log(`${room}: ${m.error}`); bad += 1; continue; }
  const first = m.copilot < m.work;
  console.log(
    `${room.padEnd(12)} kieslys ${String(m.menu).padStart(4)} · werkvlak ${String(m.work).padStart(5)} · copilot ${String(m.copilot).padStart(5)}  →  ${first ? 'copilot bo' : 'werkvlak bo'}`,
  );
  if (first !== wantFirst) { console.log(`  ✗ verwag ${wantFirst ? 'copilot bo' : 'werkvlak bo'}`); bad += 1; }
  if (room === 'Make a song') await page.screenshot({ path: shot('copilot-phone.png'), fullPage: false });
}

if (problems.length) console.log('probleme:', problems.slice(0, 4).join(' | '));
await browser.close();
console.log(bad ? `\n${bad} verkeerd` : '\nreg — copilot bo in die liedjie-kamer, onder oral anders');
process.exit(bad ? 1 : 0);
