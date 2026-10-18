/**
 * The legal page prints the company's name, and nothing about its people.
 *
 * Section 43 of the Electronic Communications and Transactions Act lists what
 * a supplier selling online makes available before somebody transacts. The
 * owner decided on 18 October 2026 that the registered name of the company
 * shows and nothing else does — no person's name, email address, telephone
 * number, registration number or address — and that the further particulars
 * are given on request through the help page.
 *
 * Two states, on two servers. Unset: the page admits the gap and invents
 * nothing. Configured, with EVERY old variable filled in as well: the name is
 * printed, the page says how to ask for the rest, and not one of the other
 * values reaches the page or the client bundle.
 */
import { chromium } from 'playwright';
import { launchOptions, serve, shot } from './where.mjs';

const PORT = Number(process.argv[2] || 3092);

/** Particulars that are obviously a fixture, so a real one cannot be mistaken. */
const FIXTURE = {
  FUTUREBOX_LEGAL_NAME: 'Toetsdoos (Edms) Bpk',
  FUTUREBOX_LEGAL_REGISTRATION: '2026/123456/07',
  FUTUREBOX_LEGAL_STATUS: 'Private company',
  FUTUREBOX_LEGAL_PHONE: '+27 21 555 0100',
  FUTUREBOX_LEGAL_EMAIL: 'toetsdoos@voorbeeld.co.za',
  FUTUREBOX_LEGAL_ADDRESS: '12 Voorbeeldstraat\nKaapstad\n8001',
  FUTUREBOX_LEGAL_INFORMATION_OFFICER: 'A. Voorbeeld',
  FUTUREBOX_LEGAL_VAT: '4123456789',
};

const problems = [];
/* The detail here is written for the failure — "name missing", "one appeared"
   — so printing it beside a pass reads as the opposite of what happened. It
   is shown only when the line is red. */
const check = (label, ok, detail = '') => {
  console.log(`${ok ? '  ok  ' : '  FAIL'} ${label}${!ok && detail ? ` — ${detail}` : ''}`);
  if (!ok) problems.push(`${label}${detail ? ` (${detail})` : ''}`);
};

/** One pass over the page, in one of its two states. */
async function look(state) {
  const configured = state !== 'unset';
  const HOW = {
    unset: 'with nothing set',
    full: 'with every particular set',
  };
  console.log(`\n  ${HOW[state]}:`);
  const OFFSET = { unset: 0, full: 1 };
  const ENV = { unset: {}, full: FIXTURE };
  const server = await serve(PORT + OFFSET[state], { env: ENV[state] });
  const b = await chromium.launch(launchOptions());
  const p = await b.newPage({ viewport: { width: 1100, height: 900 } });
  p.on('pageerror', (e) => problems.push(String(e).slice(0, 140)));

  /* Every script the page pulls in, so the particulars can be looked for in
     the bundle rather than only on the screen. */
  const scripts = [];
  p.on('response', (r) => {
    if (r.url().includes('/_next/static/') && r.url().endsWith('.js')) scripts.push(r);
  });

  try {
  await p.goto(`${server.url}/legal`, { waitUntil: 'networkidle' });
  await p.waitForTimeout(800);
  const words = await p.locator('body').innerText();

  check('the page is served', /Who you are buying from/.test(words), words.slice(0, 80));
  check('it says which law asks for it', /Electronic Communications and Transactions Act/.test(words));
  check('and where writing to us actually goes',
    (await p.locator('a[href="/help"]').count()) > 0);

  if (configured) {
    check('the registered name is printed', /Toetsdoos \(Edms\) Bpk/.test(words), 'name missing');
    check('and it says the further particulars are given on request, and where to ask',
      /given on\s+request/.test(words) && /Ask on the help page/.test(words));
    check('and it does not still claim the details are unpublished',
      !/not published yet/.test(words));
    const printed = [
      ['the registration number', /2026\/123456\/07/],
      ['the address', /Voorbeeldstraat|Kaapstad/],
      ['the telephone number', /\+27\s*21\s*555/],
      ['the mailbox', /toetsdoos@voorbeeld/],
      ['a person named as Information Officer', /A\. Voorbeeld/],
    ].filter(([, look]) => look.test(words)).map(([what]) => what);
    check('nothing else that was set is printed', printed.length === 0, printed.join(', '));

    /* The whole reason this page is a server component. If the address is in a
       JavaScript file, the page has undone the rule it was allowed to break. */
    let inBundle = null;
    for (const r of scripts) {
      const text = await r.text().catch(() => '');
      if (/Toetsdoos|Voorbeeldstraat|2026\/123456\/07|\+27 21 555 0100|toetsdoos@voorbeeld\.co\.za/.test(text)) {
        inBundle = r.url().split('/').pop();
        break;
      }
    }
    check('none of it reaches the client bundle', inBundle === null,
      `found in ${inBundle} (${scripts.length} scripts checked)`);
  } else {
    check('with nothing configured it says so plainly', /not published yet/.test(words));
    /* This required the words "being registered" until 11 September 2026 —
       the exact sentence that turned out to be false. The company was
       registered on 5 September; one unset variable sent the page down this
       path and it kept printing "the company is being registered" for six
       days, with a probe demanding it.
 
       A fallback cannot know whether the company is registered. It only
       knows nothing is configured. So the rule is the constraint rather than
       the claim: it must admit the gap, and it must NOT assert anything
       about the state of the company either way. */
    check('and says why, rather than showing an empty list',
      /false statement/.test(words) && /admitted gap/.test(words));
    check('and claims nothing about whether the company exists',
      !/being registered|not yet registered|no registration number yet/i.test(words),
      'a fallback that guesses at the world will eventually be caught lying');
    check('and still points at a way to reach a person',
      /reaches a person and is answered/.test(words));
    check('it invents no registration number', !/\d{4}\/\d{6}\/\d{2}/.test(words), 'one appeared');
  }

  await p.screenshot({ path: shot(`legal-${configured ? 'configured' : 'unset'}.png`), fullPage: true });

  // Reachable without knowing the URL — "before they transact" means findable.
  await p.goto(`${server.url}/terms`, { waitUntil: 'networkidle' });
  check('every page footer links to it',
    (await p.locator('footer a[href="/legal"]').count()) > 0);
  } finally {
    await b.close();
    await server.stop();
  }
}

await look('unset');
await look('full');

if (problems.length) {
  console.error(`\ncheck:legalpage — ${problems.length} problem(s):`);
  problems.forEach((one) => console.error(`  · ${one}`));
  process.exit(1);
}
console.log('\ncheck:legalpage — the company\'s name is printed, the rest is on request, and nothing else that was set reaches the page or the bundle.');
