/**
 * The one page in this app that prints an address.
 *
 * ── Two states, and both have to be right ────────────────────────────────
 *
 * Section 43 of the Electronic Communications and Transactions Act requires a
 * supplier selling to South Africans to publish its name, legal status,
 * registration number, physical address and telephone number before somebody
 * transacts. Everywhere else this app deliberately prints no address at all,
 * so this page is a single deliberate exception and it is worth checking that
 * it is exactly that: the particulars where the law wants them, and nowhere
 * else.
 *
 * The second state is the one that matters more today. The company is not
 * registered, so there is nothing true to publish — and the page has to say so
 * rather than showing a blank list or a plausible-looking placeholder. A
 * fabricated registration number on a legal page is a false statement about a
 * legal person; an admitted gap while a company is being registered is not.
 *
 * The run also checks the address does not reach the client bundle. It is read
 * on the server and rendered into HTML, which is what lets the page exist
 * without undoing the rule it appears to break.
 */
/*
 * ── Why this had never run ───────────────────────────────────────────────
 *
 * It was written against a server somebody had left on port 3000 — the fault
 * `serve()` exists to fix and `check:probes` holds every wired probe to — so
 * it was never given a `check:` name and has sat here being run by nobody.
 * Assertions about the one page in this app with a legal duty attached to it.
 *
 * Three states are checked in one run, on three servers. The unset state is
 * what she had before registering; the configured state is what she gets with
 * every variable filled in; and the third is the one she is actually in — a
 * registered company whose owner works from home and does not want her own
 * mobile number on a public page. That third state used to render as "the
 * company is being registered", months after it was, and this is the probe
 * that would have caught it.
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
};

/* The state she is actually likely to be in: registered, addressed, and with
   no business telephone line yet — because the only number she has is her own
   mobile and she has said she does not want it published. This used to make
   the page fall back to "the company is being registered", which is both
   untrue and the shape a payments reviewer stops on. */
const NO_PHONE = { ...FIXTURE, FUTUREBOX_LEGAL_PHONE: '' };

const problems = [];
/* The detail here is written for the failure — "name missing", "one appeared"
   — so printing it beside a pass reads as the opposite of what happened. It
   is shown only when the line is red. */
const check = (label, ok, detail = '') => {
  console.log(`${ok ? '  ok  ' : '  FAIL'} ${label}${!ok && detail ? ` — ${detail}` : ''}`);
  if (!ok) problems.push(`${label}${detail ? ` (${detail})` : ''}`);
};

/** One pass over the page, in one of its three states. */
async function look(state) {
  const configured = state !== 'unset';
  const HOW = {
    unset: 'with nothing set',
    full: 'with the particulars set',
    nophone: 'registered, but with no telephone number to publish',
  };
  console.log(`\n  ${HOW[state]}:`);
  const OFFSET = { unset: 0, full: 1, nophone: 2 };
  const ENV = { unset: {}, full: FIXTURE, nophone: NO_PHONE };
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
    check('the registration number is printed', /2026\/123456\/07/.test(words), 'number missing');
    check('the address is printed, line by line',
      /12 Voorbeeldstraat/.test(words) && /Kaapstad/.test(words), 'address missing');
    check('an address to write to is printed', /toetsdoos@voorbeeld\.co\.za/.test(words), 'email missing');
    check('and it does not still claim the details are unpublished',
      !/not published yet/.test(words));

    if (state === 'full') {
      check('a telephone number is printed', /\+27 21 555 0100/.test(words), 'phone missing');
    } else {
      /* The point of this state. Four true particulars are published, the one
         that is missing is named out loud, and no number is invented to fill
         the row — the failure this page exists to prevent is a plausible
         particular, not an admitted gap. */
      check('the registered name is still published without a telephone number',
        /Toetsdoos \(Edms\) Bpk/.test(words), 'the page went dark over the missing number');
      check('the telephone row says it is not published, rather than vanishing',
        /Telephone/.test(words) && /Not published/.test(words), 'no telephone row at all');
      check('and no number is invented to fill it',
        !/\+27\s*\d/.test(words), 'a telephone number appeared from somewhere');
      check('and the reader is sent somewhere that answers',
        /form on the help page/.test(words));
    }

    /* The whole reason this page is a server component. If the address is in a
       JavaScript file, the page has undone the rule it was allowed to break. */
    let inBundle = null;
    for (const r of scripts) {
      const text = await r.text().catch(() => '');
      if (/12 Voorbeeldstraat|2026\/123456\/07|\+27 21 555 0100|toetsdoos@voorbeeld\.co\.za/.test(text)) {
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
await look('nophone');

if (problems.length) {
  console.error(`\ncheck:legalpage — ${problems.length} problem(s):`);
  problems.forEach((one) => console.error(`  · ${one}`));
  process.exit(1);
}
console.log('\ncheck:legalpage — the particulars appear where the law asks, and nowhere else.');
