/**
 * The TONE3000 callback, opened rather than read.
 *
 * ── What is worth checking here and what is not ──────────────────────────
 *
 * `check:tone3000` holds the arithmetic — the PKCE pair, the state test, the
 * four ways back. This one holds the two things that only exist once there
 * is a route: the address we told TONE3000 to send her to, and what she sees
 * when she arrives.
 *
 * **The address is the brittle one.** It is typed into TONE3000's own
 * settings page by hand, and from then on it lives in two places that cannot
 * see each other. Rename the route folder and the app still builds, still
 * deploys, still looks right — and every sign-in fails at their end with a
 * message about an unregistered redirect. Nothing in this repository would
 * say a word. So the exact string is asserted here, against the exact string
 * in `docs/TONE3000-OPSTEL.md` that she was told to paste.
 *
 * **The trailing slash counts.** `…/callback/` and `…/callback` are two
 * different registrations to an OAuth server. It is the kind of difference
 * that is invisible in prose and total in effect.
 *
 * ── What this cannot do ──────────────────────────────────────────────────
 *
 * It cannot prove the exchange works. That needs a live `client_id`, a real
 * person signing in, and TONE3000 answering — none of which belong in a
 * check. What it does prove is that every path through the route ends in a
 * redirect she can read rather than a page of braces, including the paths
 * that only happen when something has gone wrong.
 */
import { readFileSync } from 'node:fs';
import { GET } from '../app/api/tone3000/callback/route';
import { backTo, intoApp, landing } from '../app/lib/server/tone3000session';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  if (!passed) bad += 1;
  console.log(`  ${passed ? 'ok  ' : 'NOT '} ${what}${detail ? ` — ${detail}` : ''}`);
};

const at = (host: string) => new Request(`https://${host}/api/tone3000/callback?state=x`);

/* ── The address, which lives in two places that cannot see each other ─── */

const PASTED = 'docs/TONE3000-OPSTEL.md';
const guide = readFileSync(PASTED, 'utf8');

for (const host of ['futurebox.studio', 'futurebox-app.vercel.app']) {
  const built = backTo(at(host));
  ok(`the route answers at exactly what she registered for ${host}`,
    built === `https://${host}/api/tone3000/callback` && guide.includes(built),
    `${built} — this string is typed into TONE3000's settings by hand and`
    + ' then lives in two places that cannot see each other. Rename the'
    + ' folder and the app still builds, still deploys, and every sign-in'
    + ' fails at their end with nothing here saying a word');
}

ok('  and carries no trailing slash',
  !backTo(at('futurebox.studio')).endsWith('/'),
  'to an OAuth server `…/callback/` and `…/callback` are two different'
  + ' registrations — invisible in prose and total in effect');

ok('  and both ends of the handshake build it the same way',
  /backTo\(request\)/.test(readFileSync('app/api/tone3000/callback/route.ts', 'utf8'))
  && /backTo\(request\)/.test(readFileSync('app/lib/server/tone3000session.ts', 'utf8')),
  'OAuth requires the redirect_uri at the exchange to be IDENTICAL to the'
  + ' one sent at the start. Written out twice, the two drift and the'
  + ' exchange fails with an error about the CODE, which is an hour spent on'
  + ' the wrong thing. The first draft read it from the callback query,'
  + ' where it is not');

/* ── What she sees, for all four ways back ─────────────────────────────── */

ok('a chosen tone comes back as a tone the room can use',
  JSON.stringify(landing({ how: 'chose', toneId: '42' })) === JSON.stringify({ t3k: 'ja', tone: '42' }));

ok('  a closed window that kept the authorisation is told apart',
  JSON.stringify(landing({ how: 'left' })) === JSON.stringify({ t3k: 'af' }),
  'this is the one nobody sees by accident: she closed their menu bar but'
  + ' was already signed in, so the code is still worth having. An app that'
  + ' folds it into "gone" asks her to sign in again tomorrow');

ok('  from one that kept nothing',
  JSON.stringify(landing({ how: 'gone' })) === JSON.stringify({ t3k: 'weg' }));

ok('  and a refusal says only which kind, never whose',
  JSON.stringify(landing({ how: 'refused', why: 'state' })) === JSON.stringify({ t3k: 'no', why: 'state' }),
  'terse on purpose: a message telling apart "no such state" from "a state'
  + ' belonging to somebody else" is a message written for whoever is'
  + ' testing the lock');

/* ── The room she came from, which only this side can remember ────────── */

ok('a chosen tone carries the room she pressed the button in',
  landing({ how: 'chose', toneId: '42', room: 'booth' }).room === 'booth'
  && landing({ how: 'left', room: 'booth' }).room === 'booth',
  'TONE3000 hand back `state`, `code` and `tone_id` and nothing else, so a'
  + ' callback that does not remember this returns her to the studio with a'
  + ' tone and no sign of the track she chose it for. Paystack carries its'
  + ' room in the address because we build that address; this one is built'
  + ' by somebody else');

ok('  and the two outcomes with nothing to show do not move her',
  !('room' in landing({ how: 'gone' }))
  && !('room' in landing({ how: 'refused', why: 'state' })),
  'walking her into a room to tell her nothing happened is worse than'
  + ' leaving her where she is');

ok('  and `landing` is NOT where a bad room is caught',
  intoApp(
    at('futurebox.studio'),
    landing({ how: 'chose', toneId: '1', room: 'nonsense_room' } as Parameters<typeof landing>[0]),
  ).includes('nonsense_room'),
  'stated as a fact rather than wished away. `landing` passes through what'
  + ' it is handed; the resolving happens in `begin` on the way in and in'
  + ' `finish` on the way out, which the next two assertions hold. Writing'
  + ' this one as "a bad room never reaches the address" would have been a'
  + ' green line about a guard that is not there');

ok('  and `finish` resolves the room rather than trusting its own column',
  /resolveSurfaceId\(data\.room/.test(readFileSync('app/lib/server/tone3000session.ts', 'utf8')),
  'the row is ours, but the value is about to be interpolated into a'
  + ' redirect. A column somebody can reach is a column somebody can set, so'
  + ' it is checked where it is used and not where it was written');

ok('  and `begin` resolves it before it is stored as well',
  /resolveSurfaceId\(room \?\? ''\)/.test(readFileSync('app/lib/server/tone3000session.ts', 'utf8')),
  'whatever arrives on the start route becomes a real room id or nothing —'
  + ' a value that makes a round trip through somebody else\'s service is'
  + ' not a value to keep raw');

ok('  and every outcome lands her on our own origin',
  ['chose', 'left', 'gone', 'refused'].every((how) => {
    const said = landing({ how, toneId: '1', why: 'x' } as Parameters<typeof landing>[0]);
    return intoApp(at('futurebox.studio'), said).startsWith('https://futurebox.studio/?');
  }));

/* ── And the route itself, opened ──────────────────────────────────────── */

/* Distinctive on purpose. The first version used `code=c` and then asserted
   the letter `c` was absent from the landing address — which passed, and
   would have passed for a route that leaked a code containing no `c`. A
   one-letter needle is not a needle. */
const SECRET_CODE = 'KODE-MAG-NIE-DEURKOM-NIE';
const SECRET_TONE = 'TOON-MAG-NIE-DEURKOM-NIE';
const answer = await GET(new Request(
  'https://futurebox.studio/api/tone3000/callback'
  + `?state=never-issued&code=${SECRET_CODE}&tone_id=${SECRET_TONE}`,
));

ok('the route answers a browser with a redirect, not a page of braces',
  answer.status === 303 && Boolean(answer.headers.get('location')),
  'a person is looking at this request in a browser window. JSON here is a'
  + ' white page with braces on it. Every outcome, failures included, has to'
  + ' put her back in the app');

ok('  and a state we never issued is refused without reading the rest',
  (answer.headers.get('location') ?? '').includes('t3k=no'),
  'the code and the tone are in this request and neither is believed. With'
  + ' no database configured the refusal reads `database` rather than'
  + ' `state`, which is the honest answer: nothing was checked, so nothing'
  + ' is claimed');

const went = answer.headers.get('location') ?? '';
ok('  and it never puts the code or the tone in the address it sends her to',
  !went.includes(SECRET_CODE) && !went.includes(SECRET_TONE) && !went.includes('code='),
  'an authorisation code in a landing URL is a code in her history, in any'
  + ' referrer, and in whatever logs the hop');

if (bad) {
  console.error(`\ncheck:tone3000route — ${bad} assertion(s) failed.\n`);
  process.exit(1);
}
console.log(
  '\ncheck:tone3000route — the address she was told to register is the'
  + ' address the route answers at, and all four ways back put her in the'
  + ' app rather than on a page of braces.',
);
