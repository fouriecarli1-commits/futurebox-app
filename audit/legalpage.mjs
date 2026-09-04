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
import { chromium } from 'playwright';

const PORT = process.argv[2] || '3000';
/** Passed when the run is against a build with the particulars configured. */
const configured = process.argv[3] === 'configured';

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: { width: 1100, height: 900 } });
const problems = [];
const check = (label, ok, detail = '') => {
  console.log(`${label}: ${ok}`);
  if (!ok) problems.push(`${label}${detail ? ` (${detail})` : ''}`);
};
p.on('pageerror', (e) => problems.push(String(e).slice(0, 140)));

/* Every script the page pulls in, so the particulars can be looked for in the
   bundle rather than only on the screen. */
const scripts = [];
p.on('response', (r) => {
  if (r.url().includes('/_next/static/') && r.url().endsWith('.js')) scripts.push(r);
});

await p.goto(`http://localhost:${PORT}/legal`, { waitUntil: 'networkidle' });
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

await p.screenshot({ path: `audit/legal-${configured ? 'configured' : 'unset'}.png`, fullPage: true });

// Reachable without knowing the URL — "before they transact" means findable.
await p.goto(`http://localhost:${PORT}/terms`, { waitUntil: 'networkidle' });
check('every page footer links to it',
  (await p.locator('footer a[href="/legal"]').count()) > 0);
console.log('problems:', problems.join(' ;; ') || 'none');
await b.close();
process.exit(problems.length ? 1 : 0);
