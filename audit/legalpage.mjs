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
 * Fourteen assertions about the one page in this app with a legal duty
 * attached to it.
 *
 * Both states are checked in one run now, on two servers. The unset state is
 * hers today; the configured state is what she gets the moment she puts the
 * four variables into Vercel, and it has to be right before she does rather
 * than after.
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
  FUTUREBOX_LEGAL_ADDRESS: '12 Voorbeeldstraat\nKaapstad\n8001',
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
async function look(configured) {
  console.log(`\n  ${configured ? 'with the particulars set' : 'with nothing set'}:`);
  const server = await serve(configured ? PORT + 1 : PORT, configured ? { env: FIXTURE } : {});
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
    check('a telephone number is printed', /\+27 21 555 0100/.test(words), 'phone missing');
    check('and it does not still claim the details are unpublished',
      !/not published yet/.test(words));

    /* The whole reason this page is a server component. If the address is in a
       JavaScript file, the page has undone the rule it was allowed to break. */
    let inBundle = null;
    for (const r of scripts) {
      const text = await r.text().catch(() => '');
      if (/12 Voorbeeldstraat|2026\/123456\/07|\+27 21 555 0100/.test(text)) {
        inBundle = r.url().split('/').pop();
        break;
      }
    }
    check('none of it reaches the client bundle', inBundle === null,
      `found in ${inBundle} (${scripts.length} scripts checked)`);
  } else {
    check('with nothing configured it says so plainly', /not published yet/.test(words));
    check('and says why, rather than showing an empty list',
      /being registered/.test(words) && /false statement/.test(words));
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

await look(false);
await look(true);

if (problems.length) {
  console.error(`\ncheck:legalpage — ${problems.length} problem(s):`);
  problems.forEach((one) => console.error(`  · ${one}`));
  process.exit(1);
}
console.log('\ncheck:legalpage — the particulars appear where the law asks, and nowhere else.');
