/**
 * The profile picture — the part this app owns, actually measured.
 *
 * ── What is tested here, and what is not ─────────────────────────────────
 *
 * The upload goes to Supabase, which is not configured in this environment,
 * so what happens after the file leaves `squared()` cannot be exercised. That
 * boundary is stated rather than faked: a test that stubs the storage layer
 * and then asserts the stub was called proves the stub works.
 *
 * What *is* this app's own code, and is measured on a real file through a real
 * <input>:
 *
 *   • a wide photo comes back square
 *   • at 512, not at whatever the phone shot
 *   • as WebP, which is how the EXIF — including where the picture was
 *     taken — stops travelling with it
 *   • small enough to send over a mobile connection
 *
 * The module is bundled and injected rather than reimplemented in the page, so
 * the thing under test is the thing that ships.
 *
 * The panel itself is then checked in the app: the picker is there, it says
 * who can see the picture, initials stand in until there is one, and the
 * controls are thumb-sized. With storage switched off it must also *say* so
 * rather than appearing to work, which is the failure mode worth catching.
 */
import { execSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { launchOptions, serve, shot } from './where.mjs';
import { dismissDoor, toRoom } from './enter.mjs';

const PORT = Number(process.argv[2] || 3011);
const af = process.argv[3] === 'af';

/* ── The bundle, made here rather than asked for ──────────────────────────

   This used to take the path to a bundle as a fourth argument, with the
   esbuild command written in `audit/README.md` for somebody to run first. Two
   steps in a document is the same thing as one step nobody does: the file was
   never on this machine, the probe died on `ENOENT` before its first
   assertion, and that is half of why it sat on the waiting list.

   It builds its own now, into a directory of its own, and removes it however
   the run ends. A path can still be handed in as the fourth argument for
   somebody debugging a build of their own. */
const given = process.argv[4];
const mine = given ? null : mkdtempSync(join(tmpdir(), 'fb-avatar-'));
const BUNDLE = given ?? join(mine, 'avatar.bundle.js');
if (mine) {
  console.log('bundling app/lib/avatar.ts…');
  /* `--define:process.env={}` is not decoration.

     `avatar.ts` pulls in the Supabase browser client, which reads
     `process.env` at module scope. Next inlines those; esbuild does not — so
     the bundle threw `process is not defined` the instant it was injected,
     `window.AV` was never assigned, and the probe reported "Cannot read
     properties of undefined (reading 'squared')". Which reads as a broken
     module and was a missing flag.

     Obvious nonsense rather than the real values on purpose: nothing here
     talks to Supabase, every call is answered in the page, and a probe
     carrying a real project's address is how one ends up writing to
     production. The address still has to be *there*, though — `publicUrl`
     returns an empty string without one, and "a stored path becomes a public
     url" then fails on a module that is working perfectly. */
  const ENV = JSON.stringify({
    NEXT_PUBLIC_SUPABASE_URL: 'https://stub.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'stub-anon-key',
  });
  execSync(
    `npx esbuild app/lib/avatar.ts --bundle --format=iife --global-name=AV` +
      ` --define:process.env='${ENV}' --outfile=${BUNDLE}`,
    { stdio: 'ignore' },
  );
  /* In an exit handler, not at the end: a probe that throws on its first
     assertion never reaches a tidy-up written at the bottom. */
  process.on('exit', () => {
    try { rmSync(mine, { recursive: true, force: true }); } catch { /* already gone */ }
  });
}

const b = await chromium.launch(launchOptions());
/* `hasTouch`, and it is not a detail at 390px.

   `app/globals.css` keeps a whole block behind `@media (pointer: coarse)` —
   the forty-four pixel minimums this file's last assertion measures. Desktop
   Chromium reports a *fine* pointer whatever viewport it is handed, so a probe
   that only shrinks the window measures the app with those rules switched off
   and reports the thumb sizes as passing whether they hold or not. */
const p = await b.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true });
const problems = [];
const check = (label, ok, detail = '') => {
  console.log(`${ok ? '  ok  ' : '  FAIL'} ${label}${detail && !ok ? ` — ${detail}` : ''}`);
  if (!ok) problems.push(`${label}${detail ? ` (${detail})` : ''}`);
};
p.on('pageerror', (e) => problems.push(String(e).slice(0, 140)));
await p.addInitScript((l) => { try { window.localStorage.setItem('futurebox.lang.v1', l); } catch {} }, af ? 'af' : 'en');

/* ── Its own server, on its own port ─────────────────────────────────────

   This went to a port it did not start and hoped somebody had left a server
   there. That is the fault `serve()` exists to fix, and it is the reason this
   probe sat in the waiting list: it passed on the machine it was written on
   and could not run anywhere else. */
const server = await serve(PORT);

await p.goto(server.url, { waitUntil: 'networkidle' });

// ── What the module does to a photo ──────────────────────────────────────
await p.addScriptTag({ content: readFileSync(BUNDLE, 'utf8') });
const made = await p.evaluate(async () => {
  // Wide, not square, and with a mark off-centre so a squash can be told from
  // a crop: squashing keeps the mark, cropping the centre drops it.
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 600;
  const c = canvas.getContext('2d');
  c.fillStyle = '#123456';
  c.fillRect(0, 0, 1200, 600);
  c.fillStyle = '#ff8800';
  c.fillRect(20, 20, 80, 80);
  const jpeg = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', 0.92));
  const file = new File([jpeg], 'holiday.jpg', { type: 'image/jpeg' });

  const out = await window.AV.squared(file);
  if (!out.ok) return { ok: false, why: out.why, sent: jpeg.size };

  const image = new Image();
  await new Promise((done, fail) => { image.onload = done; image.onerror = fail; image.src = out.preview; });
  return {
    ok: true,
    sent: jpeg.size,
    bytes: out.blob.size,
    type: out.blob.type,
    w: image.naturalWidth,
    h: image.naturalHeight,
    preview: out.preview.slice(0, 24),
  };
});

check('a photo is accepted', made.ok, made.why || '');
if (made.ok) {
  check('it comes out square', made.w === made.h, `${made.w}x${made.h}`);
  check('it comes out 512 across', made.w === 512, String(made.w));
  check('it is re-encoded as webp, so the EXIF does not travel', made.type === 'image/webp', made.type);
  check(
    `it shrinks: ${Math.round(made.sent / 1024)}kB in, ${Math.round(made.bytes / 1024)}kB out`,
    made.bytes < made.sent && made.bytes < 200 * 1024,
    `${made.bytes} bytes`,
  );
  check('there is something to show before the upload finishes', made.preview.startsWith('data:image/webp'));
}

const refusals = await p.evaluate(async () => {
  const notImage = await window.AV.squared(new File([new Uint8Array([1, 2, 3])], 'notes.txt', { type: 'text/plain' }));
  const huge = new File([new Uint8Array(13 * 1024 * 1024)], 'huge.jpg', { type: 'image/jpeg' });
  const tooBig = await window.AV.squared(huge);
  const broken = await window.AV.squared(new File([new Uint8Array([1, 2, 3])], 'broken.jpg', { type: 'image/jpeg' }));
  return { notImage: notImage.why, tooBig: tooBig.why, broken: broken.why };
});
check('a text file is refused as not a picture', refusals.notImage === 'not_an_image', refusals.notImage);
check('a 13MB file is refused before it is decoded', refusals.tooBig === 'too_big', refusals.tooBig);
check('a file that only claims to be a jpeg is refused', refusals.broken === 'unreadable', refusals.broken);

const paths = await p.evaluate(() => ({
  built: window.AV.publicUrl('abc/123.webp'),
  empty: window.AV.publicUrl(''),
}));
check('a stored path becomes a public url', paths.built.endsWith('/avatars/abc/123.webp'), paths.built);
check('no path means no url, not a broken one', paths.empty === '', paths.empty);

// ── The panel, in the app ────────────────────────────────────────────────
const cta = p.locator('button, a').filter({ hasText: af ? /begin|gratis|teken/i : /start free|begin|sign up/i }).first();
await cta.waitFor({ state: 'visible', timeout: 40000 });
await cta.click();
await p.waitForTimeout(700);
await p.locator('input[type="email"]').first().fill('anri.fourie@futurebox.test');
const pw = p.locator('input[type="password"]').first();
if (await pw.count()) await pw.fill('toets-wagwoord-1234');
await p.locator('button[type="submit"]').first().click();
/* Waited for, not slept through. The bottom bar exists on every screen shown
   to a signed-in person and on none shown to a signed-out one, so it is the
   signal that signing in finished — a fixed 2.5 seconds on a loaded machine
   measures the signed-out page and reports the difference as a fault. */
await p.locator('nav[aria-label]').first().waitFor({ state: 'visible', timeout: 30000 }).catch(() => undefined);
await p.waitForTimeout(600);
/* The welcome door, which did not exist when this probe was written. Signing
   in lands on it and it covers the header at `z-[55]`, so going straight for
   the Studio button waits thirty seconds against an overlay and then reports
   the button as missing. */
await dismissDoor(p);
await p.locator('header button').filter({ hasText: /Studio/i }).first().click();
await p.waitForTimeout(1800);
const room = p.locator('div.fixed.inset-0.z-50').first();
await toRoom(p, af ? 'Kanaal' : 'Channel');
await p.waitForTimeout(1500);

const words = await room.innerText();
check('the picker is on the channel page', (await room.locator('#profile-photo-file').count()) > 0);
check('a button offers it', (await room.locator('label[for="profile-photo-file"]').count()) > 0);
check(
  'it says who can see it',
  af ? /kanaal kyk kan dit sien/i.test(words) : /looking at your channel can see/i.test(words),
);
check(
  'it says the location is stripped',
  af ? /waar die foto geneem is/i.test(words) : /where the photo was taken/i.test(words),
);
check('initials stand in until there is a picture', (await room.locator('[aria-hidden="true"]').filter({ hasText: /^[A-Z]{1,2}$/ }).count()) > 0);

// With storage off, choosing a file must say so rather than looking busy and
// then quietly doing nothing.
await p.locator('#profile-photo-file').setInputFiles({
  name: 'holiday.jpg',
  mimeType: 'image/jpeg',
  buffer: Buffer.from(
    await p.evaluate(async () => {
      const canvas = document.createElement('canvas');
      canvas.width = 800;
      canvas.height = 500;
      canvas.getContext('2d').fillRect(0, 0, 800, 500);
      const blob = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', 0.9));
      return Array.from(new Uint8Array(await blob.arrayBuffer()));
    }),
    'binary',
  ),
});
await p.waitForTimeout(2000);
const after = await room.innerText();
check(
  'with storage switched off it says so instead of pretending',
  af ? /Teken eers in|nie opgelaai/i.test(after) : /Sign in first|did not upload/i.test(after),
  after.slice(0, 120),
);

// Scoped to the picture panel. The first version measured the whole modal and
// reported the studio's rail — which is 38px by design and audited elsewhere —
// as this panel's problem.
const small = await p.evaluate(() => {
  const panel = document.querySelector('#profile-photo-file')?.closest('.rounded-2xl');
  if (!panel) return ['the panel could not be found'];
  const bad = [];
  for (const el of panel.querySelectorAll('label[for="profile-photo-file"], button')) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) continue;
    if (r.height < 44) bad.push(`${(el.textContent || '').trim().slice(0, 20)} ${Math.round(r.height)}px`);
  }
  return bad;
});
check('the picture controls are thumb-sized', small.length === 0, small.join(' | '));

await p.screenshot({ path: shot(`photo-${af ? 'af' : 'en'}.png`) });
await b.close();
await server.stop();

if (problems.length) {
  console.error(`\ncheck:photo — ${problems.length} problem(s):`);
  problems.forEach((one) => console.error(`  · ${one}`));
  process.exit(1);
}
console.log('\ncheck:photo — every assertion in this file holds.');
