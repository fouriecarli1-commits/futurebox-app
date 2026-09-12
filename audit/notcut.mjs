/**
 * A name is never cut off.
 *
 * ── What this is for ─────────────────────────────────────────────────────
 *
 * The channel header called itself "Your chan…" on a 390-pixel phone. Five
 * pixels short, on the shortest name the app can show — a real one loses
 * considerably more, and the one thing on that card that must not be guessed
 * at is whose channel it is. `Card` carries a comment about the same fault
 * in its own header ("A card whose name has been truncated to one letter is
 * a card with no name"), which was fixed by hand and never turned into a
 * rule. So it came back somewhere else.
 *
 * Nothing measured it. `audit/phone.mjs` measures whether the PAGE spills
 * sideways, which is a different question: a `truncate` never spills, it
 * eats the word instead and the layout stays perfect.
 *
 * ── The line between a name and a teaser ─────────────────────────────────
 *
 * Most clipped text in this app is deliberate. Every room's explanations
 * were moved behind a question mark, and what is left on the line is a
 * one-line teaser that is SUPPOSED to end in an ellipsis — there are forty
 * of those and they are all `text-xs` at weight 400.
 *
 * So the rule is drawn where the app itself draws it: **semibold or heavier,
 * at 14 pixels or more, is a name or a heading and must fit.** Lighter or
 * smaller is prose, and prose may be trimmed. That is a property of the
 * rendered element, not of a class name — a rule that reads a class passes a
 * class that has been renamed and stopped working.
 *
 * Both languages, because hers is the longer one and every string in this
 * app is two strings. "From a photo" fit and "Uit ’n foto" did not.
 */
import { enter, studio, toRoom, unfold } from './enter.mjs';
import { serve, shot } from './where.mjs';
import { ROOMS, ROOMS_AF } from './rooms.mjs';

const PORT = process.argv[2] || '3193';

const problems = [];
const check = (label, ok, detail = '') => {
  console.log(`${ok ? '  ok  ' : '  FAIL'} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) problems.push(label);
};

/** Clipped, and big and bold enough that being clipped is a fault. */
const CUT = () => {
  const out = [];
  const root = document.querySelector('div.fixed.inset-0.z-50') ?? document.body;
  for (const el of root.querySelectorAll('*')) {
    const cs = getComputedStyle(el);
    if (cs.textOverflow !== 'ellipsis') continue;
    /* One pixel of slack: a sub-pixel font metric rounds the two apart on a
       line that is drawing perfectly. */
    if (el.scrollWidth <= el.clientWidth + 1) continue;
    if (parseFloat(cs.fontSize) < 14) continue;
    if (Number(cs.fontWeight) < 600) continue;
    /* An input reports a scrollWidth against its placeholder, which is not
       a name and is not being cut off — it scrolls when you type in it. */
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') continue;
    out.push(`${(el.textContent || '').trim().slice(0, 34)} (${el.scrollWidth - el.clientWidth}px short)`);
  }
  return out;
};

const server = await serve(PORT);
let browser = null;
try {
  for (const lang of ['en', 'af']) {
    console.log(`\n— ${lang}`);
    const opened = await enter({ at: server.url, width: 390, height: 844, touch: true, lang });
    browser = opened.browser;
    const page = opened.page;
    await studio(page);

    const cut = [];
    const missed = [];
    for (const english of ROOMS) {
      const name = lang === 'af' ? ROOMS_AF[english] : english;
      if (!name) { missed.push(english); continue; }
      try {
        await toRoom(page, name);
      } catch {
        /* A room this probe cannot reach is reported, never skipped. A rename
           that made twelve rooms into eleven is exactly what `rooms.mjs`
           exists to stop, and a silent `catch` here would put it back. */
        missed.push(`${english} → ${name}`);
        continue;
      }
      await page.waitForTimeout(600);
      await unfold(page);
      for (const one of await page.evaluate(CUT)) cut.push(`${english}: ${one}`);
    }

    check(`${lang} · every room on the door was found`, missed.length === 0, missed.join(', '));
    check(`${lang} · no name or heading is cut off`, cut.length === 0,
      cut.slice(0, 6).join(' · ') + (cut.length > 6 ? ` (+${cut.length - 6} more)` : ''));

    await page.screenshot({ path: shot(`notcut-${lang}.png`) });
    await browser.close();
    browser = null;
  }
} finally {
  if (browser) await browser.close();
  await server.stop();
}

if (problems.length) {
  console.error(`\ncheck:notcut — ${problems.length} problem(s):`);
  problems.forEach((one) => console.error(`  · ${one}`));
  process.exit(1);
}
console.log('\ncheck:notcut — every name and heading fits, in both languages, at 390 pixels.');
