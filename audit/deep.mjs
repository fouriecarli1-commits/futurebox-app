/**
 * Press each control from a known-good starting point.
 *
 * The first version pressed everything in sequence, which works until a
 * control opens something over the rail — after that every later press is
 * measured in a state nobody would be in, and a room that cannot be reopened
 * reads as a broken room when the harness is what is broken.
 *
 * So: the room is reopened before every press. Slower, and the only way a
 * "nothing changed on screen" result means anything.
 */
import { dismissDoor, enter, studio } from './enter.mjs';

const ROOMS_ALL = ['Make a song', 'Studio', 'The Booth', 'Your voice', 'Soundboard', 'Music video',
  'Video desk', 'Hooks', 'Channel', 'Live', 'Podcast', 'Adverts', 'Collab Radar'];
const name = process.argv[2];
const SKIP = /^(delete|sign out|back to futurebox|upgrade|choose |buy|pay)/i;
const nameOf = (t) => (t ?? '').split('\n')[0].trim().replace(/\s+/g, ' ').slice(0, 50);

const { browser, page, problems } = await enter();
let room = await studio(page);

async function openRoom() {
  await page.keyboard.press('Escape').catch(() => {});
  await page.waitForTimeout(200);
  /* Pressing everything in a room includes pressing "Sign out", and signing
     back in from the front page opens the welcome screen over the header — so
     the door has to be cleared on every pass, not only on the way in. Without
     this the run dies part-way through against a door and reports the room as
     untestable. */
  await dismissDoor(page);
  if (!(await page.locator('div.fixed.inset-0.z-50').count())) room = await studio(page);
  else room = page.locator('div.fixed.inset-0.z-50').first();
  await room.locator('button').filter({ hasText: new RegExp(`^${name}`, 'i') }).first()
    .click({ timeout: 8000 });
  await page.waitForTimeout(900);
}

await openRoom();
const labels = [];
for (const b of await room.locator('button:visible').all()) {
  const label = nameOf(await b.innerText().catch(() => ''));
  if (!label || ROOMS_ALL.includes(label) || /^(Search|Back to FutureBox)/.test(label)) continue;
  labels.push(label);
}

console.log(`════ ${name} — ${labels.length} controls ════`);
for (let i = 0; i < labels.length; i += 1) {
  await openRoom();
  const buttons = room.locator('button:visible');
  // Re-find by position among the same filtered set, so the index still means
  // the control it meant when the list was taken.
  const all = await buttons.all();
  const kept = [];
  for (const b of all) {
    const label = nameOf(await b.innerText().catch(() => ''));
    if (!label || ROOMS_ALL.includes(label) || /^(Search|Back to FutureBox)/.test(label)) continue;
    kept.push({ b, label });
  }
  const target = kept[i];
  if (!target) { console.log(`  — ${labels[i]}: gone from the room on reopen`); continue; }
  if (SKIP.test(target.label)) { console.log(`  · skipped: ${target.label}`); continue; }

  const before = problems.length;
  /* Markup, not text.

     Comparing the words on screen calls every toggle broken: the platform
     chips in the advert room change colour and an aria-pressed attribute and
     not a single character, so a text comparison reported six working buttons
     as dead. */
  const domBefore = await page.locator('body').innerHTML().catch(() => '');
  try {
    await target.b.click({ timeout: 4000 });
    await page.waitForTimeout(700);
  } catch (e) {
    console.log(`  ✗ ${target.label} — click refused: ${String(e).split('\n')[0].slice(0, 60)}`);
    continue;
  }
  const domAfter = await page.locator('body').innerHTML().catch(() => '');
  const fresh = problems.slice(before);
  if (fresh.length) console.log(`  ✗ ${target.label} — ${fresh.join(' ;; ')}`);
  else if (domBefore === domAfter) console.log(`  ? ${target.label} — nothing changed on screen`);
  else console.log(`  ✓ ${target.label}`);
}
await browser.close();
