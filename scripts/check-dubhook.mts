/**
 * The dub webhook, and the two things that make it safe to have at all.
 *
 * ── What it is for ───────────────────────────────────────────────────────
 *
 * `/api/dub?id=` is polled from the browser while a dub runs. Every poll is a
 * Vercel invocation and a call to ElevenLabs. The webhook lets them tell us
 * once instead, and the poll then answers off our own row.
 *
 * ── Why it needs a check more than most routes ───────────────────────────
 *
 * It is a public, unauthenticated address that writes a dub's status, and the
 * status is not decoration: `/api/dub` refunds a dub it sees as failed. An
 * endpoint that believed what it was posted would be a way to mark strangers'
 * dubs failed and mint credits.
 *
 * So two properties, and the check exists for them rather than for the
 * feature:
 *
 *   1. **It fails closed.** No secret, nothing accepted — never a fallback to
 *      trusting the body, because a webhook that works without its secret was
 *      never checking one.
 *   2. **It never touches money.** It writes `status` and `error`. The refund
 *      stays in the GET, on a request carrying the owner's own token.
 *
 * And one more, which is why this could ship today: **polling still works**. A
 * webhook nobody has registered must change nothing.
 */
import { readFileSync } from 'node:fs';

let failures = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok  ' : 'FAIL'} ${what}${!passed && detail ? ` — ${detail}` : ''}`);
  if (!passed) failures += 1;
};

const hook = readFileSync('app/api/dub/hook/route.ts', 'utf8');
const poll = readFileSync('app/api/dub/route.ts', 'utf8');

/**
 * The file with its comments taken out.
 *
 * The two assertions below look for words that must not appear in the code —
 * `refunded_at`, `charged`, `claim_dub_refund`. Run over the whole file they
 * both failed on the first run, on the paragraph *explaining* that those
 * things are deliberately absent. A check that a file never mentions a word is
 * a check that punishes documenting the decision, which is exactly backwards
 * in a codebase that documents decisions.
 */
const codeOnly = (source: string): string =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const hookCode = codeOnly(hook);

/* ── 1. It fails closed ────────────────────────────────────────────────── */
ok('no secret means nothing is accepted',
  /if \(!secret\) \{[\s\S]{0,300}?return new Response\('no', \{ status: 404 \}\);/.test(hook),
  'an unset secret must refuse, not wave things through');
ok('and there is no path that skips the signature when one is missing',
  !/if \(!secret\)[\s\S]{0,400}?(continue|\/\/ trust|skip)/i.test(hook));
ok('the signature is checked in constant time', /timingSafeEqual/.test(hook));
ok('over the raw body, not a re-serialised one',
  poll.length > 0 && /await request\.text\(\)/.test(hook) &&
    hook.indexOf('await request.text()') < hook.indexOf('JSON.parse(raw)'),
  'hashing a re-stringified document hashes a different document');
ok('an old delivery is refused however well signed it is',
  /OLDEST_MS/.test(hook) && /Math\.abs\(Date\.now\(\) - signed\.at\) > OLDEST_MS/.test(hook));
ok('the header is read by name rather than by position',
  /name\?\.trim\(\) === 't'/.test(hook),
  'reading parts in order breaks the day a third one is added in front');

/* ── 2. It never touches money ─────────────────────────────────────────── */
ok('the hook writes only the status and the error',
  /\.update\(\{ status: said\.status, error: said\.error, updated_at/.test(hook));
ok('and never the columns that decide money',
  !/refunded_at|charged/.test(hookCode),
  'nothing that decides a refund may be writable from the open internet');
ok('it never claims a refund itself', !/claim_dub_refund|refund\(/.test(hookCode));
ok('the refund is still claimed on a request carrying the owner’s token',
  /claim_dub_refund', \{ p_dub: id, p_owner: caller\.id \}/.test(poll));
ok('including for a failure the webhook recorded rather than the poll',
  /settled && state\.state\.failed/.test(poll),
  'a webhook-marked failure still owes its credits back');

/* ── 3. Polling still works, unchanged ─────────────────────────────────── */
ok('a dub still running is asked about, exactly as before',
  /: await dubState\(id\);/.test(poll));
ok('only a settled row short-circuits the call',
  /const settled = row\?\.status === 'dubbed' \|\| row\?\.status === 'failed';/.test(poll),
  'anything looser would freeze a dub that is still working');
ok('and a settled row is not written back onto itself',
  /if \(caller && client && !settled\) \{/.test(poll));

/* ── And it is a real variable somebody has to set ─────────────────────── */
const env = readFileSync('.env.example', 'utf8');
ok('the secret is in .env.example, so it is not a hidden switch',
  /ELEVEN_WEBHOOK_SECRET/.test(env),
  'a variable the app reads and no document mentions is a dark feature');

console.log(
  failures
    ? `\ncheck:dubhook — ${failures} wrong.`
    : '\ncheck:dubhook — signed or refused, never near the money, and polling still works without it.',
);
process.exit(failures ? 1 : 0);
