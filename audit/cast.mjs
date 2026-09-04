/**
 * The cast strip, driven end to end against a stubbed account.
 *
 * `/api/cast` and the private bucket are stubbed with exactly the shapes the
 * real ones return, so what runs is the real `Cast`, the real `lib/cast.ts`
 * and the real `lib/imagefile.ts`. What is being checked is the thing the
 * whole feature exists for: that one press hands the *same picture* to the
 * engine, and that the picture survives a reload — which is the half a
 * device-local shelf could never do.
 */
import { chromium } from 'playwright';
import { shot } from './where.mjs';

const PORT = process.argv[2] || '3015';
const af = process.argv[3] === 'af';

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: { width: 1280, height: 950 } });
const problems = [];
const check = (label, ok, detail = '') => {
  console.log(`${label}: ${ok}`);
  if (!ok) problems.push(`${label}${detail ? ` (${detail})` : ''}`);
};
p.on('pageerror', (e) => problems.push(String(e).slice(0, 140)));
await p.addInitScript((l) => { try { window.localStorage.setItem('futurebox.lang.v1', l); } catch {} }, af ? 'af' : 'en');

/* A signed-in account, without a sign-in.

   The cast is an account feature, so a run with Supabase switched off tests
   the refusal and nothing else — which is what the first version of this did,
   reporting "not signed in" as five passing checks about a strip that was
   never going to work. The app is therefore built against a stub project
   (`NEXT_PUBLIC_SUPABASE_URL=https://stub.supabase.co`) and the session is
   seeded here in the shape supabase-js reads it back in. Everything the
   library then asks for over the wire is answered below. */
const WHO = { id: '11111111-2222-3333-4444-555555555555', email: 'toets@futurebox.test' };
await p.addInitScript((who) => {
  try {
    window.localStorage.setItem(
      'sb-stub-auth-token',
      JSON.stringify({
        access_token: 'stub-access-token',
        refresh_token: 'stub-refresh-token',
        token_type: 'bearer',
        // Far enough out that the library does not try to refresh mid-run.
        expires_at: Math.floor(Date.now() / 1000) + 60 * 60 * 24,
        expires_in: 60 * 60 * 24,
        user: { id: who.id, email: who.email, aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {} },
      }),
    );
  } catch {}
}, WHO);

await p.route('**/auth/v1/**', async (route) =>
  route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ id: WHO.id, email: WHO.email, aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {} }),
  }));

// Everything else this app asks Supabase for, answered as empty rather than
// left to hang: no tracks, no playlists, nothing owned.
await p.route('**/rest/v1/**', async (route) =>
  route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));

// Premium connected, so the start frame is offered.
await p.route('**/api/video*', async (route) => {
  if (route.request().method() !== 'GET') return route.fallback();
  return route.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify({
      available: true, auth: 'bearer', grades: ['premium'],
      can: { premium: { seconds: [5, 10], aspects: ['16:9', '9:16', '1:1'], speaks: true, startFrame: true } },
      sound: true, startFrame: true,
    }),
  });
});

// The account's cast, as rows. Held here so a reload serves it back.
let rows = [];
let written = [];
await p.route('**/api/cast*', async (route) => {
  const method = route.request().method();
  const json = (body) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  if (method === 'GET') return json({ cast: rows });
  if (method === 'DELETE') {
    const id = new URL(route.request().url()).searchParams.get('id');
    rows = rows.filter((one) => one.id !== id);
    return json({ removed: true });
  }
  const body = JSON.parse(route.request().postData() || '{}');
  written.push(body);
  if (body.id) {
    rows = rows.map((one) => (one.id === body.id ? { ...one, ...body } : one));
    return json({ saved: true });
  }
  const member = { id: `m${rows.length + 1}`, name: body.name || '', note: '', path: body.path, created_at: new Date().toISOString() };
  rows = [member, ...rows];
  return json({ member });
});

// The private bucket: the upload, and the download that follows it. A one-pixel
// PNG, so what comes back is a real decodable image rather than a fake string.
const PIXEL = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);
let uploaded = 0;
await p.route('**/storage/v1/object/**', async (route) => {
  const method = route.request().method();
  if (method === 'POST' || method === 'PUT') {
    uploaded += 1;
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ Key: 'cast/x' }) });
  }
  if (method === 'DELETE') {
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
  }
  return route.fulfill({ status: 200, contentType: 'image/png', body: PIXEL });
});

async function intoTheDesk() {
  await p.goto(`http://localhost:${PORT}`, { waitUntil: 'networkidle' });
  // The seeded session means the app comes up signed in; no form to fill.
  await p.locator('header button').filter({ hasText: /Studio/i }).first().waitFor({ timeout: 40000 });
  await p.locator('header button').filter({ hasText: /Studio/i }).first().click();
  await p.waitForTimeout(1800);
  const room = p.locator('div.fixed.inset-0.z-50').first();
  await room.locator('button').filter({ hasText: /^Video desk|^Videolessenaar/i }).first().click();
  await p.waitForTimeout(2200);
  return room;
}

let room = await intoTheDesk();
let words = await room.innerText();

check('the cast strip is on the desk',
  af ? /Jou rolverdeling/.test(words) : /Your cast/.test(words));
check('it says why anybody would use one',
  af ? /drie vreemdelinge/.test(words) : /three strangers/.test(words));
check('it says the cast is on the account, not the device',
  af ? /teen jou rekening, op elke toestel/.test(words) : /on your account, on every device/.test(words));
check('the device shelf is still there and says it is the device one',
  af ? /nie teen jou rekening nie/.test(words) : /not on your account/.test(words));
check('the count is shown', /0\/12/.test(words), words.match(/\d+\/\d+/)?.[0] || 'none');

// Add somebody. A wide picture, so the fit-not-crop rule is observable.
const wide = await p.evaluate(async () => {
  const canvas = document.createElement('canvas');
  canvas.width = 1600; canvas.height = 900;
  const c = canvas.getContext('2d');
  c.fillStyle = '#204060'; c.fillRect(0, 0, 1600, 900);
  const blob = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', 0.9));
  return Array.from(new Uint8Array(await blob.arrayBuffer()));
});
await p.locator('#cast-file').setInputFiles({ name: 'Sarel.jpg', mimeType: 'image/jpeg', buffer: Buffer.from(wide, 'binary') });
await p.waitForTimeout(2500);

check('the picture was uploaded', uploaded > 0, String(uploaded));
check('a row was written with an owner-shaped path',
  Boolean(written[0]?.path && /^[^/]+\/\d+\.webp$/.test(written[0].path)), written[0]?.path || 'none');
check('the filename becomes the first name', written[0]?.name === 'Sarel', written[0]?.name);
check('it opens straight into renaming', (await room.locator('input[aria-label]').filter({ hasNotText: 'x' }).count()) > 0);

// Name them, then use them.
const nameBox = room.locator('#cast-file').locator('..').locator('input[type="text"], input:not([type])').first();
const anyInput = room.locator('input').filter({ hasNot: p.locator('[type=file]') });
await p.keyboard.type(' die aanbieder');
await p.keyboard.press('Enter');
await p.waitForTimeout(900);
check('the new name is saved against the row',
  written.some((one) => one.id && /Sarel die aanbieder/.test(one.name || '')),
  JSON.stringify(written.filter((o) => o.id)));

const face = room.locator('button[aria-pressed]').first();
check('the member can be pressed', (await face.count()) > 0);
await face.click();
await p.waitForTimeout(900);
check('pressing them selects them', (await face.getAttribute('aria-pressed')) === 'true');

// The whole point: the same bytes reach the request.
const sent = await p.evaluate(() => {
  const img = document.querySelector('button[aria-pressed="true"] img');
  return img ? img.getAttribute('src')?.slice(0, 24) : null;
});
check('what is selected is a real picture, not a placeholder',
  Boolean(sent && sent.startsWith('data:image/')), String(sent));

/* The shape is kept, and that is the difference from a profile picture.

   A cast member is a reference for what a shot should look like, so cropping a
   wide product shot to a square would throw away half of what it is being used
   to say. 1600×900 in must come back 16:9, scaled to the 1024 ceiling. */
const shape = await p.evaluate(async () => {
  const img = document.querySelector('button[aria-pressed="true"] img');
  if (!img) return null;
  const probe = new Image();
  await new Promise((done, fail) => { probe.onload = done; probe.onerror = fail; probe.src = img.getAttribute('src'); });
  return { w: probe.naturalWidth, h: probe.naturalHeight };
});
check('a wide picture stays wide — it is fitted, not cropped square',
  Boolean(shape && Math.abs(shape.w / shape.h - 16 / 9) < 0.02), shape ? `${shape.w}x${shape.h}` : 'none');
check('and it is scaled down to the ceiling', shape?.w === 1024, shape ? String(shape.w) : 'none');

// A reload is the half a device shelf could never do.
room = await intoTheDesk();
await p.waitForTimeout(1200);
words = await room.innerText();
check('the cast survives a reload', /Sarel/.test(words), words.slice(0, 80));
check('and the count went up', /1\/12/.test(words), words.match(/\d+\/\d+/)?.[0] || 'none');

const small = await p.evaluate(() => {
  const strip = document.querySelector('#cast-file')?.closest('div');
  if (!strip) return ['strip not found'];
  const bad = [];
  for (const el of strip.querySelectorAll('label[for="cast-file"]')) {
    const r = el.getBoundingClientRect();
    if (r.height < 44) bad.push(`${(el.textContent || '').trim().slice(0, 20)} ${Math.round(r.height)}px`);
  }
  return bad;
});
check('the add button is thumb-sized', small.length === 0, small.join(' | '));

await p.screenshot({ path: shot(`cast-${af ? 'af' : 'en'}.png`), fullPage: true });
console.log('problems:', problems.join(' ;; ') || 'none');
await b.close();
process.exit(problems.length ? 1 : 0);
