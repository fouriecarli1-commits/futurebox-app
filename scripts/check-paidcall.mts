/**
 * Every call that spends credits carries the token that says who is spending.
 *
 * ── The fault ────────────────────────────────────────────────────────────
 *
 * Carli, 5 October 2026, with a photograph of the cutting room: *"Wanneer ek
 * die video wil export sê dit so. Al is ek in geteken"* — over the sentence
 * "Sign in first — credits belong to an account."
 *
 * She was signed in. The call sent a content type and nothing else.
 *
 * `callerFrom` reads the `Authorization` header and only that. There is no
 * cookie session anywhere in this app — the browser holds a Supabase token
 * and every request that needs an identity has to carry it — so a call
 * without the header is a call from nobody. The route answered 401 honestly,
 * the room printed the route's own sentence, and the sentence was true about
 * the request and wrong about the person reading it.
 *
 * ── Why a whole check, for three missing lines ───────────────────────────
 *
 * Because when this was found in the cutting room, a scan of the other
 * eighteen routes that charge turned up two more: Pro Booth's paid mix and
 * the advert desk's lines. All three had been unpayable since the day they
 * were written, and all three failed in the one way nobody reports as a bug
 * in the app — it says SIGN IN, so people go and sign in, and it says it
 * again.
 *
 * Three in one morning is not three mistakes. It is a shape the code makes
 * easy, and the only thing that stops the fourth is a rule.
 *
 * ── What it looks at ─────────────────────────────────────────────────────
 *
 * Every route under `app/api` whose handler calls `charge`, and then every
 * `fetch` to one of those paths. A call is a fault only when its headers are
 * written out as a literal with no `Authorization` and no spread in it: a
 * `headers` variable, `await auth()` or `...(await headers())` are all real
 * answers, and flagging those would be a check that cries wolf until it is
 * switched off.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { withoutComments } from './prose.mts';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  if (!passed) bad += 1;
  console.log(`  ${passed ? 'ok  ' : 'NOT '} ${what}${detail ? ` — ${detail}` : ''}`);
};

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === '.next') continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, out);
    else if (/\.tsx?$/.test(path)) out.push(path);
  }
  return out;
}

/* ── The routes that spend ─────────────────────────────────────────────── */

const paid: string[] = [];
for (const file of walk('app/api')) {
  if (!/\/route\.ts$/.test(file)) continue;
  if (!/\bcharge\(/.test(withoutComments(readFileSync(file, 'utf8')))) continue;
  paid.push(`/${file.replace(/^app\//, '').replace(/\/route\.ts$/, '')}`);
}

ok('the routes that spend credits are found by reading them',
  paid.length >= 15 && paid.includes('/api/madehere'),
  `${paid.length} routes call charge() — listed by reading the handlers rather`
  + ' than by keeping a list here, so a new paid route is covered the day it'
  + ' is written');

/* ── And every call to one of them ─────────────────────────────────────── */

interface Call { readonly file: string; readonly route: string; readonly headers: string }

const calls: Call[] = [];
for (const file of [...walk('app/components'), ...walk('app/lib')]) {
  if (/\/server\//.test(file)) continue;
  const text = withoutComments(readFileSync(file, 'utf8'));
  for (const route of paid) {
    /* Only a POST: the GET on several of these is an "is this engine up"
       probe that charges nothing and needs nobody. */
    const hits = [...text.matchAll(new RegExp(`fetch\\(\\s*'${route}'\\s*,`, 'g'))];
    for (const hit of hits) {
      /* Cut at the call's own close, not at a fixed number of characters.
         Read 700 characters flat, a call whose headers are a ternary —
         `headers: token ? { Authorization: … } : undefined`, which is a
         correct answer — found the `headers: {` of the NEXT fetch down the
         file and reported a working call as naked. `PromptCards.tsx` was
         that call, and the first run of this check named it. */
      const whole = text.slice(hit.index ?? 0);
      const ends = whole.indexOf('});');
      const body = whole.slice(0, ends === -1 ? 700 : ends + 3);
      if (!/method:\s*'POST'/.test(body)) continue;
      const written = /headers:\s*\{([\s\S]*?)\}/.exec(body);
      calls.push({ file, route, headers: written?.[1] ?? 'not written out' });
    }
  }
}

ok('  and the calls that reach them',
  calls.length >= 10,
  `${calls.length} POSTs to a route that charges`);

/* A headers object written out in full with no `Authorization` and no spread
   in it is the fault, exactly. A variable, an `await auth()` or a spread are
   all real answers, and flagging those would be a check that cries wolf
   until somebody switches it off. */
const naked = calls.filter(
  (one) => one.headers !== 'not written out'
    && !/Authorization/i.test(one.headers)
    && !/\.\.\./.test(one.headers),
);

ok('every one of them carries the token that says who is spending',
  naked.length === 0,
  naked.length
    ? naked.map((one) => `${one.file} → ${one.route}`).join('; ')
    : `${calls.length} checked. \`callerFrom\` reads the Authorization header`
      + ' and nothing else, so a call without it is a call from nobody —'
      + ' answered with "Sign in first" to somebody who is signed in');

/* ── And the three that were found this way ───────────────────────────── */

const named = [
  ['app/components/VideoEditor.tsx', '/api/madehere'],
  ['app/components/ProBooth.tsx', '/api/madehere'],
  ['app/components/Campaign.tsx', '/api/campaign'],
] as const;

for (const [file, route] of named) {
  const found = calls.find((one) => one.file === file && one.route === route);
  ok(`  ${file.split('/').pop()} still sends it to ${route}`,
    !!found && /Authorization/i.test(found.headers),
    'one of the three that were unpayable, named so that a revert shows up'
    + ' here rather than in a photograph of a red sentence');
}

ok('there is still no cookie session to fall back on',
  /const header = request\.headers\.get\('authorization'\)/.test(
    withoutComments(readFileSync('app/lib/server/account.ts', 'utf8')),
  ),
  'the day a cookie session is added this rule can be relaxed; until then it'
  + ' is the only way a route learns who is asking');

if (bad) {
  console.error(`\ncheck:paidcall — ${bad} assertion(s) failed.\n`);
  process.exit(1);
}
console.log(
  `\ncheck:paidcall — ${paid.length} routes charge credits and all ${calls.length}`
  + ' calls that reach them say who is spending.',
);
