/**
 * The lock, from the buyer's side.
 *
 * ── What this checks that `check:addons` cannot ──────────────────────────
 *
 * The gate proves the routes refuse. This proves the room does the other half
 * honestly: that somebody who has not bought it is told what it costs and what
 * is in it rather than shown a dead button; that the advert writer they were
 * already using is still there; and that buying it actually opens the desk
 * rather than leaving them on the sales page having paid.
 *
 * The sentence that matters most is the one about what stays free. Selling by
 * taking away something somebody was already using is how an app loses the
 * customer it already has, and that is a failure of words — so this is the
 * only place it can be caught.
 *
 * ── Why this had never run ───────────────────────────────────────────────
 *
 * It was written against a server somebody had left running on a port, which
 * is the fault `serve()` exists to fix — so it never earned a `check:` name
 * and sat here being run by nobody. Twenty assertions about the one screen in
 * this app that asks for money for something other than credits.
 *
 * It builds its own stubbed project and starts its own server now, and puts
 * the ordinary build back in an exit handler however the run ends.
 */
import { execSync } from 'node:child_process';
import { chromium } from 'playwright';
import { launchOptions, serve, shot } from './where.mjs';
import { dismissDoor, toRoom, unfold } from './enter.mjs';

const PORT = Number(process.argv[2] || 3049);
const af = process.argv[3] === 'af';

/* A project that has accounts, so the header draws a signed-in person at all.
   `stub.supabase.co` is nonsense on purpose — nothing here reaches Supabase —
   and the storage key the app derives from it is `sb-stub-auth-token`, which
   is what this probe seeds below. */
const STUB = {
  NEXT_PUBLIC_SUPABASE_URL: 'https://stub.supabase.co',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'stub-anon-key',
};
console.log('building with a project that has accounts…');
execSync('npx next build', { stdio: 'ignore', env: { ...process.env, ...STUB } });

/* Put back however this run ends — in an exit handler rather than at the
   bottom, because a probe that throws on its first assertion never reaches a
   tidy-up written at the end, and the stubbed build it leaves behind is read
   by the next probe as a broken app. */
let putBack = false;
process.on('exit', () => {
  if (putBack) return;
  putBack = true;
  console.log('putting the ordinary build back…');
  try {
    execSync('npx next build', { stdio: 'ignore' });
  } catch {
    console.error('the ordinary build could not be put back — run `npx next build`');
  }
});

const server = await serve(PORT, { env: STUB });
const b = await chromium.launch(launchOptions());
/* acceptDownloads, because the plan leaves this app as a file and a probe
   that cannot receive one can only ever check that a button exists. */
const p = await b.newPage({ viewport: { width: 1280, height: 950 }, acceptDownloads: true });
const problems = [];
const check = (label, ok, detail = '') => {
  console.log(`${label}: ${ok}`);
  if (!ok) problems.push(`${label}${detail ? ` (${detail})` : ''}`);
};
p.on('pageerror', (e) => problems.push(String(e).slice(0, 140)));
await p.addInitScript((l) => { try { window.localStorage.setItem('futurebox.lang.v1', l); } catch {} }, af ? 'af' : 'en');

const WHO = { id: '11111111-2222-3333-4444-555555555555', email: 'carli@futurebox.test' };
await p.addInitScript((who) => {
  try {
    window.localStorage.setItem('sb-stub-auth-token', JSON.stringify({
      access_token: 'stub-access-token', refresh_token: 'stub-refresh-token', token_type: 'bearer',
      expires_at: Math.floor(Date.now() / 1000) + 86400, expires_in: 86400,
      user: { id: who.id, email: who.email, aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {} },
    }));
  } catch {}
}, WHO);
await p.route('**/auth/v1/**', (r) => r.fulfill({ status: 200, contentType: 'application/json',
  body: JSON.stringify({ id: WHO.id, email: WHO.email, aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {} }) }));
await p.route('**/rest/v1/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
await p.route('**/api/taste*', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ taste: [], ready: true }) }));
await p.route('**/api/schedule*', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ posts: [], ready: true, sends: true }) }));

/* Nothing is owned, and nothing can be.
 
   This used to flip part-way through the run so the probe could watch a
   checkout move somebody from one state to the other. There is no checkout:
   `ADDONS` in `app/lib/addons.ts` is an empty list, deliberately, and the
   marketing desk comes with every paid plan.
 
   The route is still answered rather than removed, because the app still asks
   it — `addons.ts` keeps the id alive on purpose so a stray R199 renewal still
   in flight at Paystack is recognised and ignored rather than misread as a plan
   renewal. A probe that stopped answering would be testing a screen that had
   given up waiting. */
const owned = false;
await p.route('**/api/addons*', (r) => r.fulfill({
  status: 200, contentType: 'application/json',
  body: JSON.stringify({
    owns: owned ? { marketing: new Date(Date.now() + 2.6e9).toISOString() } : {},
    ready: true,
    /* Deliberately not 199. The screen must show what the server said, so a
       number typed into the markup would show up here as a mismatch. */
    sells: [{ id: 'marketing', rand: 249 }],
  }),
}));

await p.goto(server.url, { waitUntil: 'networkidle' });
await p.waitForTimeout(2000);
/* The welcome door, which did not exist when this probe was written. It is
   `fixed inset-0 z-[55]` and sits over the header, so going straight for the
   Studio button times out against a door rather than against a fault — and a
   probe that cannot get in reports nothing at all, which is worse than one
   that fails. Fourth control found under it. */
await dismissDoor(p);
await p.locator('header button').filter({ hasText: /Studio/i }).first().click();
await p.waitForTimeout(1800);
const room = p.locator('div.fixed.inset-0.z-50').first();
/* Through the shared helper rather than a hand-rolled click, because the way
   into a room has changed twice — a dropdown, then a rail, then the studio's
   own front door — and every probe that spelled it out itself broke silently
   each time by finding no button and passing anyway. */
/* ── Rewritten 3 October 2026 ─────────────────────────────────────────────

   Everything between here and the plan below used to walk a SALE: a folded
   panel with a price on it, a sales screen, a checkout, and then the desk
   opening once it was owned.

   None of that exists. Carli, 24 September 2026: *"Ek dink dieselfde met
   advert, dit moenie 'n ekstra produk wees nie, eerder dit monotise en
   krediete vra saam met die pakkette wat ons reeds het. Te veel aankoop punte
   gaan mense afsit."* The marketing desk was R199 a month with its own
   checkout; it is in every paid plan now, and what is made in it costs credits
   out of the same wallet as a song.

   So this probe had been red since that day, asserting a price on a panel that
   no longer names one. Nine days of a check failing for being out of date, in a
   shard CI could not run anyway.

   What replaces it is the rule that is actually worth holding, and it is the
   one `addons.ts` was written around: **there is nothing to buy beside a plan
   and a top-up.** Two tills, and only two. An add-on checkout coming back is
   the regression; the desk's own contents, which this file goes on to walk at
   length, are the rest. */
await toRoom(p, af ? 'Advertensies' : 'Adverts');
await p.waitForTimeout(1600);

const open = await room.innerText();
check('the marketing desk is open on a paid plan, with nothing to buy first',
  af ? /Die mark, en die week/.test(open) : /The market, and the week/.test(open),
  open.slice(0, 160).replace(/\n/g, ' / '));
check('  and the queue with it',
  af ? /Wanneer dit uitgaan/.test(open) : /When it goes out/.test(open));
check('  and nothing in it starts a monthly charge',
  (await room.locator('button').filter({
    hasText: af ? /Sluit die bemarkingslessenaar oop|R\s?\d+\s*\/?\s*maand/ : /Unlock the marketing desk|R\s?\d+\s*(a|per)\s*month/,
  }).count()) === 0,
  'two tills in this app and only two — a plan, and a top-up when it runs out');
check('  and no price is named inside the room at all',
  !/R\s?199|R\s?249/.test(open),
  'the add-on was R199 with its own Paystack subscription; a page still naming'
  + ' it is a page selling something that cannot be bought');
/* ── And the plan itself ─────────────────────────────────────────────────
   Stubbed, because the real one is a paid model call taking up to two
   minutes. What is being checked is the screen: that a week renders as days
   and times somebody can read, that each slot carries the reason it rests on,
   and that the whole thing says out loud it is a starting point. A schedule
   presented as fact is a schedule nobody can argue with. */
await p.route('**/api/plan*', (r) => r.fulfill({
  status: 200, contentType: 'application/json',
  body: JSON.stringify({ plan: {
    category: 'Handmade leather goods, direct to buyer',
    demand: 'People are choosing between this and a factory bag at a third of the price.',
    buyers: [{ who: 'Someone replacing a bag that fell apart', wants: 'One that lasts ten years', doubt: 'Whether it really will' }],
    angles: [{ angle: 'Show the stitching', why: 'It is the difference, and it is visible', against: 'Every leather account opens on a close-up' }],
    platforms: [{ platform: 'Instagram', why: 'The buyers browse there before they search', format: 'One object, one hand, daylight', effort: 'medium' }],
    week: [
      { day: 'tuesday', at: '18:00', platform: 'Instagram', what: 'The stitching, close', why: 'Evening is when they browse rather than work' },
      { day: 'saturday', at: '09:00', platform: 'Instagram', what: 'A finished bag in use', why: 'Weekend mornings are when they buy' },
    ],
    beyondSocial: [{ what: 'A listing on the local craft marketplace', why: 'People arrive there already deciding', effort: 'low' }],
    watch: [{ number: 'Saves per post', why: 'It says they will come back, which likes do not', healthy: 'Roughly 2-5% of reach, and that is a rough number' }],
  } }),
}));
/* The brief first. The plan refuses without it, and rightly — a market read
   of nothing is a page of generalities. That refusal is checked below. */
/* Anchored at the start only. Both ends was right until 5 October 2026,
   when the price went onto that button — seventy-five credits, which
   `check:priceonit` now requires of every room that spends — so the label
   is no longer the whole of the button's text. The opening anchor still
   does what the closing one was there for: not matching a different,
   longer button. */
await room.locator('button').filter({ hasText: af ? /^Werk die plan uit/ : /^Work out the plan/ }).first().click();
await p.waitForTimeout(700);
check('it refuses to plan for a brief that is empty, and says which field',
  af ? /Sê eers in die opdrag hierbo/.test(await room.innerText())
     : /Say what you are selling in the brief above/.test(await room.innerText()),
  'an empty brief produces a page of generalities instead of a refusal');

await room.locator('#ads-what').fill('A one-person leather workshop in Paarl. Handmade bags, made to order.');
await room.locator('button').filter({ hasText: af ? /^Werk die plan uit/ : /^Work out the plan/ }).first().click();
await p.waitForTimeout(1800);
const planned = await room.innerText();

check('a week renders as days and times somebody can read',
  (af ? /Dinsdag/ : /Tuesday/).test(planned) && /18:00/.test(planned),
  (planned.match(/\d\d:\d\d/g) || ['no times']).join(' | '));
check('and every slot carries the reason it rests on',
  /Evening is when they browse/.test(planned),
  'the times are given with no reason, so nobody can disagree with them');
check('the plan says its times are a starting point rather than a finding',
  af ? /beginpunt, nie ’n bevinding nie/.test(planned) : /starting point, not a finding/.test(planned),
  'the plan presents guesses as facts');
check('and says whether it was built on their own report or on the category',
  af ? /beginskatting vir hierdie kategorie/.test(planned) : /starting guess for this category/.test(planned),
  'a plan built on nothing is presented as if built on their numbers');
check('the calendar file is offered once there is a week',
  af ? /Sit die week in my kalender/.test(planned) : /Put the week in my calendar/.test(planned));

/* ── The whole plan, out of the app ──────────────────────────────────────
 
   The calendar file carries the week and drops the other six parts. This
   is the document that carries all of it, and the only way to know it
   does is to press the button and read what comes out — the function can
   be correct and the button wired to nothing, which is most of what this
   file has ever caught.
 
   The download is a blob the page makes itself, so the browser's own
   download event is what proves a file actually left. */
const wants = af ? /Laai die hele plan af/ : /Download the whole plan/;
check('the whole plan can be downloaded, not only the week', 
  (await room.locator('button').filter({ hasText: wants }).count()) > 0,
  'the week leaves and the market read, the buyers and the numbers stay behind');

if ((await room.locator('button').filter({ hasText: wants }).count()) > 0) {
  const [file] = await Promise.all([
    p.waitForEvent('download', { timeout: 8000 }).catch(() => null),
    room.locator('button').filter({ hasText: wants }).first().click(),
  ]);
  check('pressing it actually produces a file', Boolean(file), 'the button is wired to nothing');
  if (file) {
    const paper = await file.createReadStream().then(async (stream) => {
      let out = '';
      for await (const chunk of stream) out += chunk;
      return out;
    });
    /* One assertion per part of the plan, named, because "the document is
       not empty" is the assertion that let the week-only export read as a
       whole plan for months. */
    const has = (what, text) => check(`the file carries ${what}`, paper.includes(text), text);
    has('the category', 'Handmade leather goods');
    has('the buyers', 'Someone replacing a bag that fell apart');
    has('what stops them', 'Whether it really will');
    has('the angles', 'Show the stitching');
    has('what the angle is up against', 'Every leather account opens on a close-up');
    has('the platforms', 'One object, one hand, daylight');
    has('the week', 'The stitching, close');
    has('the reason under a slot', 'Evening is when they browse');
    has('what is not a feed', 'local craft marketplace');
    has('the numbers to watch', 'Saves per post');
    has('the brief it was built from', 'leather workshop in Paarl');
    check('and it is a document that can be opened on its own',
      /^<!doctype html>/i.test(paper.trim()) && /@media print/.test(paper),
      paper.slice(0, 60));
    check('and it is written in the language the room is in',
      new RegExp(`<html lang="${af ? 'af' : 'en'}"`).test(paper),
      (paper.match(/<html lang="\w+"/) || ['no lang'])[0]);
  }
}

await p.screenshot({ path: shot(`addon-open-${af ? 'af' : 'en'}.png`), fullPage: true });
console.log('problems:', problems.join(' ;; ') || 'none');
await b.close();
process.exit(problems.length ? 1 : 0);
