/**
 * Press every button in every room and report what happened.
 *
 * Three things are looked for: a button that throws, a button that asks the
 * server and is refused, and a button that changes nothing at all. The last is
 * the interesting one — a control that looks live and is not is the hardest
 * kind of breakage to find by reading code.
 *
 * Clicked by position rather than by label. Labels here are two lines — a name
 * and a description — and matching on the collapsed text finds nothing, which
 * looks exactly like a broken button and is not one.
 *
 * Destructive and paid controls are named and skipped: signing out would end
 * the run, and deleting the account would end the account.
 */
import { enter, studio } from './enter.mjs';

const ROOMS_ALL = ['Make a song', 'Studio', 'The Booth', 'Your voice', 'Soundboard', 'Music video',
  'Video desk', 'Hooks', 'Channel', 'Live', 'Podcast', 'Adverts', 'Collab Radar'];
const ROOMS = process.argv[2] ? [process.argv[2]] : ROOMS_ALL;

const SKIP = /^(delete|sign out|back to futurebox|upgrade|choose |buy|pay)/i;

const { browser, page, problems } = await enter();
let room = await studio(page);

/** The studio can be closed by something we pressed. Put it back. */
async function ensureStudio() {
  await page.keyboard.press('Escape').catch(() => {});
  await page.waitForTimeout(250);
  if (await page.locator('div.fixed.inset-0.z-50').count()) {
    room = page.locator('div.fixed.inset-0.z-50').first();
    return;
  }
  room = await studio(page);
}

/** The first line of a control's label, which is its name. */
const nameOf = (text) => (text ?? '').split('\n')[0].trim().replace(/\s+/g, ' ').slice(0, 50);

for (const name of ROOMS) {
  console.log(`\n════ ${name} ════`);
  const open = async () => {
    await ensureStudio();
    await room.locator('button').filter({ hasText: new RegExp(`^${name}`, 'i') }).first()
      .click({ timeout: 8000 });
    await page.waitForTimeout(1100);
  };
  try {
    await open();
  } catch {
    // One retry from a known-good state before calling it unreachable.
    try { await ensureStudio(); await open(); }
    catch { console.log('  could not open'); continue; }
  }

  const count = await room.locator('button:visible').count();
  for (let i = 0; i < count; i += 1) {
    const buttons = room.locator('button:visible');
    if (i >= (await buttons.count())) break;
    const el = buttons.nth(i);
    const label = nameOf(await el.innerText().catch(() => ''));
    if (!label) continue;
    if (ROOMS_ALL.includes(label) || /^(Search|Back to FutureBox)/.test(label)) continue;
    if (SKIP.test(label)) { console.log(`  · skipped: ${label}`); continue; }

    const before = problems.length;
    const domBefore = await room.innerText().catch(() => '');
    try {
      await el.click({ timeout: 4000 });
      await page.waitForTimeout(550);
      // Something we pressed may have taken the studio away. Everything after
      // this reads the overlay, so put it back before reading it.
      if (!(await page.locator('div.fixed.inset-0.z-50').count())) await ensureStudio();
    } catch (e) {
      console.log(`  ✗ ${label} — click refused: ${String(e).split('\n')[0].slice(0, 70)}`);
      continue;
    }
    const domAfter = await room.innerText().catch(() => '');
    const fresh = problems.slice(before);
    if (fresh.length) console.log(`  ✗ ${label} — ${fresh.join(' ;; ')}`);
    else if (domBefore === domAfter) console.log(`  ? ${label} — nothing changed on screen`);
    else console.log(`  ✓ ${label}`);
  }
}
await browser.close();
