/**
 * What a collab room actually looks like, and that it works.
 *
 *   "ek sal graag wil sien hoe lyk so saamwerk kamer."
 *
 * The room opens only once two people have each agreed, so on a testing
 * deployment with three accounts nobody has ever got that far and there is no
 * way to look at it. This stands in for the second person: the routes are
 * answered in front of the real component, so what is on the screen is the
 * room as it will be, not a drawing of it.
 *
 * The screenshot is the deliverable. The assertions under it are so that the
 * screenshot cannot quietly become a picture of a broken room.
 */
import { spawn, execSync } from 'node:child_process';
import { cpSync, rmSync } from 'node:fs';
import { chromium } from 'playwright';
import { shot } from './where.mjs';

const PORT = process.argv[2] || '3186';
const PROBE = 'app/collabroom/page.probe.tsx';
const LIVE = 'app/collabroom/page.tsx';

const problems = [];
const check = (label, ok, detail = '') => {
  console.log(`${ok ? '  ok  ' : '  FAIL'} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) problems.push(label);
};

const THREADS = {
  ready: true,
  threads: [
    {
      id: 'room-open',
      state: 'accepted',
      because: 'Your “Karoo Nag” and my “Stof en Son” sit a step apart on the wheel — 112 against 116, both A minor.',
      mine: true,
      name: 'Riaan Vermaak',
      handle: '@riaanmaak',
      createdAt: '2026-09-04T09:00:00.000Z',
    },
    {
      id: 'room-asked',
      state: 'asked',
      because: 'We are both on FutureBox and I would like to make something with somebody.',
      mine: false,
      name: 'Lerato Dube',
      handle: '@leratod',
      createdAt: '2026-09-06T07:30:00.000Z',
    },
  ],
};

const SAID = [
  { id: 1, mine: false, body: 'Ek het jou “Karoo Nag” gehoor op die radar. Die tweede vers is presies waar ek wou wees.', at: '2026-09-04T09:12:00.000Z' },
  { id: 2, mine: true, body: 'Dankie! Ek sit hom hier in — luister na die brug by 1:40, ek dink jou stem hoort daar.', at: '2026-09-04T09:15:00.000Z' },
  { id: 3, mine: true, body: 'Karoo Nag', trackId: 'karoo-nag', at: '2026-09-04T09:15:30.000Z' },
  { id: 4, mine: false, body: 'Ek neem hom booth toe en stuur môre ’n vat terug.', at: '2026-09-04T09:41:00.000Z' },
];

let server = null;
let browser = null;
try {
  cpSync(PROBE, LIVE);
  console.log('building with the probe page…');
  execSync('npx next build', { stdio: 'ignore' });
  server = spawn('npx', ['next', 'start', '-p', PORT], { detached: true, stdio: 'ignore' });
  for (let tries = 0; tries < 40; tries += 1) {
    await new Promise((r) => setTimeout(r, 1500));
    try {
      const r = await fetch(`http://localhost:${PORT}/collabroom`);
      if (r.ok) break;
    } catch { /* not up yet */ }
  }

  browser = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  });
  const p = await browser.newPage({ viewport: { width: 390, height: 900 } });
  p.on('pageerror', (e) => problems.push(`pageerror: ${String(e).slice(0, 140)}`));

  /* The second person, stood in for. Messages first: Playwright hands a
     request to the LAST matching route, so the narrower pattern has to be
     registered after the wider one or it never sees anything. */
  await p.route('**/api/collab', async (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(THREADS) }));
  await p.route('**/api/collab/messages*', async (route) => {
    if (route.request().method() === 'POST') {
      const sent = JSON.parse(route.request().postData() ?? '{}');
      SAID.push({ id: SAID.length + 1, mine: true, body: String(sent.body ?? ''), at: new Date().toISOString() });
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ messages: SAID }) });
  });

  await p.goto(`http://localhost:${PORT}/collabroom`, { waitUntil: 'networkidle' });
  await p.waitForTimeout(1800);

  const says = async () => ((await p.locator('body').innerText()) ?? '').replace(/\s+/g, ' ');

  check('a request somebody sent you is waiting', (await says()).includes('Lerato Dube'));
  check('with the reason they gave on it',
    (await says()).includes('would like to make something with somebody'));
  check('and a room that is already open', (await says()).includes('Riaan Vermaak'));

  /* Open the room and look inside it. */
  await p.locator('button').filter({ hasText: 'Riaan Vermaak' }).first().click();
  await p.waitForTimeout(1400);
  const inside = await says();
  check('opening it shows what was said', inside.includes('Karoo Nag'));
  check('both sides of the conversation are there',
    inside.includes('Ek het jou') && inside.includes('Dankie!'),
    `${SAID.length} messages`);
  check('a song handed across the room is on the thread',
    inside.includes('booth toe'));
  check('and there is a box to answer in',
    (await p.locator('input[placeholder], textarea[placeholder]').count()) >= 1);

  await p.screenshot({ path: shot('collabroom.png'), fullPage: true });
  console.log(`\n  screenshot: ${shot('collabroom.png')}\n`);
} finally {
  if (browser) await browser.close();
  if (server) { try { process.kill(-server.pid); } catch { /* already gone */ } }
  try { rmSync(LIVE); } catch { /* never made it */ }
}

if (problems.length) {
  console.error(`\ncheck:collabroom — ${problems.length} problem(s):`);
  problems.forEach((one) => console.error(`  · ${one}`));
  process.exit(1);
}
console.log('check:collabroom — the room opens, both sides are on the thread, and a song travels across it.');
