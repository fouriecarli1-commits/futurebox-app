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
 * Needs the stub build — see `audit/README.md`.
 */
import { chromium } from 'playwright';
import { launchOptions, shot } from './where.mjs';

const PORT = process.argv[2] || '3049';
const af = process.argv[3] === 'af';

const b = await chromium.launch(launchOptions());
const p = await b.newPage({ viewport: { width: 1280, height: 950 } });
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

/* Owned or not, flipped part-way through the run — because the interesting
   assertion is not what each state looks like, it is that paying moves you
   from one to the other. */
let owned = false;
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

await p.goto(`http://localhost:${PORT}`, { waitUntil: 'networkidle' });
await p.waitForTimeout(2000);
await p.locator('header button').filter({ hasText: /Studio/i }).first().click();
await p.waitForTimeout(1800);
const room = p.locator('div.fixed.inset-0.z-50').first();
await room.locator('button').filter({ hasText: af ? /^Advertensies/ : /^Adverts/ }).first().click();
await p.waitForTimeout(2000);

// ── Not bought ───────────────────────────────────────────────────────────
const shut = await room.innerText();
check('the sales screen is there when it is not bought',
  af ? /Die bemarkingslessenaar/.test(shut) : /The marketing desk/.test(shut),
  shut.slice(0, 160).replace(/\n/g, ' / '));
check('it names the price the server gave, not one typed into the page',
  /R\s?249/.test(shut) && !/R\s?199/.test(shut),
  (shut.match(/R\s?\d+/g) || ['no price']).join(' | '));
check('and says it is monthly', af ? /per maand/.test(shut) : /a month/.test(shut));

/* The line this whole screen turns on. */
check('it says what stays free, so this does not read as something taken away',
  af ? /bly oop op elke plan/.test(shut) : /stay open on every plan/.test(shut),
  'the sales screen reads as a hostage note');

check('it lists what is actually behind the lock',
  (af ? /week se plasings/ : /week of posting/).test(shut) &&
  (af ? /Die ry:/ : /The queue:/).test(shut),
  'somebody is asked to pay without being told for what');

/* And what it must never say. The queue reminds; it does not post. A sales
   screen that promises posting is a refund request with a card number. */
check('it does not promise to post for them',
  !/(post|plaas) (for you|vir jou) (automatically|outomaties)/i.test(shut) &&
  !/(automatic|outomatiese) (posting|plasing)/i.test(shut),
  'the sales screen promises something this app cannot do');

// The advert writer above it is untouched.
check('the brief is still usable while it is locked',
  await room.locator('textarea, input[type="text"]').first().isEditable(),
  'locking the add-on locked the free half too');
check('and the queue is not shown as a dead control',
  af ? !/Sit dit in die ry/.test(shut) : !/Put it in the queue/.test(shut),
  'a button that cannot work is on screen');

await p.screenshot({ path: shot(`addon-shut-${af ? 'af' : 'en'}.png`), fullPage: true });

// ── Bought ───────────────────────────────────────────────────────────────
owned = true;
/* Through the room's own reload rather than a page refresh, because what is
   being tested is that coming back from a checkout opens the desk. */
await room.locator('button').filter({ hasText: af ? /^Kanaal/ : /^Channel/ }).first().click();
await p.waitForTimeout(1200);
await room.locator('button').filter({ hasText: af ? /^Advertensies/ : /^Adverts/ }).first().click();
await p.waitForTimeout(2000);

const open = await room.innerText();
check('paying opens the desk', af ? /Die mark, en die week/.test(open) : /The market, and the week/.test(open),
  open.slice(0, 160).replace(/\n/g, ' / '));
check('and the queue with it',
  af ? /Wanneer dit uitgaan/.test(open) : /When it goes out/.test(open));
check('the sales screen is gone once it is owned',
  af ? !/Sluit die bemarkingslessenaar oop/.test(open) : !/Unlock the marketing desk/.test(open),
  'still being sold something they own');
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
await room.locator('button').filter({ hasText: af ? /^Werk die plan uit$/ : /^Work out the plan$/ }).first().click();
await p.waitForTimeout(700);
check('it refuses to plan for a brief that is empty, and says which field',
  af ? /Sê eers in die opdrag hierbo/.test(await room.innerText())
     : /Say what you are selling in the brief above/.test(await room.innerText()),
  'an empty brief produces a page of generalities instead of a refusal');

await room.locator('#ads-what').fill('A one-person leather workshop in Paarl. Handmade bags, made to order.');
await room.locator('button').filter({ hasText: af ? /^Werk die plan uit$/ : /^Work out the plan$/ }).first().click();
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

await p.screenshot({ path: shot(`addon-open-${af ? 'af' : 'en'}.png`), fullPage: true });
console.log('problems:', problems.join(' ;; ') || 'none');
await b.close();
process.exit(problems.length ? 1 : 0);
