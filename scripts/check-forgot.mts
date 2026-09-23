/**
 * A way back in, and the two things it must never do.
 *
 * ── Why this had to be built at all ──────────────────────────────────────
 *
 * Carli, 23 September 2026, going through the account screens before launch:
 * *"ek wil net seker maak dat die login 'n forget password funksie het."*
 *
 * It did not. There was no `resetPasswordForEmail` anywhere in this
 * repository, which means somebody who forgot their password was locked out
 * for good: the only way back was a second account on a second address,
 * abandoning every song, every video and every credit on the first.
 *
 * ── The two properties worth a rule ──────────────────────────────────────
 *
 * **It must not say whether an address has an account.** A screen that
 * answers "no account with that address" will tell anybody, one address at a
 * time, exactly who is a member here — and for a music app that is a list of
 * which artists are on it. Supabase answers the same way for the same reason,
 * so the only way to break this is for us to add the distinction ourselves,
 * which is exactly the kind of "helpful" change somebody makes later.
 *
 * **The screen must sit over the studio, not behind it.** On a recovery there
 * IS a session — Supabase puts one in place the moment the link is followed.
 * So the obvious implementation, a fourth `authMode`, opens the studio with
 * somebody signed in who still does not know their password, and buries the
 * one thing they came to do behind a modal they have no reason to look for.
 */

import { readFileSync } from 'node:fs';

let failures = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : 'NOT'}  ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) failures += 1;
};

const cloud = readFileSync('app/lib/cloud.ts', 'utf8');
const page = readFileSync('app/page.tsx', 'utf8');
const words = readFileSync('app/lib/i18n.tsx', 'utf8');

/* ── It exists at all ────────────────────────────────────────────────── */

ok('a forgotten password can be reset', /resetPasswordForEmail\(/.test(cloud),
  'somebody who forgets is locked out for good: a second account on a second address '
  + 'is the only way back, and every song and credit stays on the first');

ok('  and the new one can be set', /updateUser\(\{ password \}\)/.test(cloud),
  'the letter arrives and there is nothing to do with it');

ok('  and the letter comes back to this app', /redirectTo:/.test(
  /export async function askPasswordReset[\s\S]*?\n\}/.exec(cloud)?.[0] ?? ''),
  'the link lands on Supabase’s own page, which is not this app and is not in her language');

/* The mark in the address carries the language, exactly as the OAuth return
   does — a reset that comes back in English for somebody using the app in
   Afrikaans is the app changing language at the worst moment. */
ok('  carrying the language with it',
  /CHOSE_LANG/.test(/export async function askPasswordReset[\s\S]*?\n\}/.exec(cloud)?.[0] ?? ''),
  'the round trip loses which language they were using');

/* ── It does not say who is a member ─────────────────────────────────── */

const ask = /if \(authMode === 'forgot'\)[\s\S]*?\n    \}/.exec(page)?.[0] ?? '';
ok('the answer is the same whether or not the address is one of ours',
  Boolean(ask) && !/no account|not found|unknown|geen rekening|onbekend/i.test(ask),
  ask ? 'this screen will tell anybody, one address at a time, who has an account here'
      : 'no forgot branch found in page.tsx');

/* And the sentence itself is conditional. "A letter is on its way" states a
   fact about an address; "if that address has an account" states nothing. */
const sent = /"auth\.resetSent":[^\n]*/.exec(words)?.[0] ?? '';
ok('  and the sentence says "if", not "we have sent"',
  /\bIf\b/.test(sent) && /\bAs\b/.test(sent),
  sent ? 'it confirms the address exists in the act of being reassuring' : 'auth.resetSent is missing');

/* ── The screen is reachable, and lands over the studio ──────────────── */

ok('there is a way to reach it from the sign-in form', /data-forgot/.test(page),
  'the function exists and nothing on screen leads to it');

ok('  offered on the sign-in form and not while creating an account',
  /authMode === 'signin' && \(\s*<p className="text-sm text-center">/.test(page),
  'offering to recover an account somebody has not made yet');

ok('  and no password box on the way back in', /authMode !== 'forgot' && \(/.test(page),
  'a field for the thing they are here because they do not know');

/* Anchored on the strip's own mark and read backwards, rather than on the
   shape of the conditional around it. The first version matched
   `{recovering && (`, and moving the panel into a `const … = recovering ? (`
   so it could be drawn twice broke the rule without breaking anything it was
   about. A rule about a screen should survive the screen being moved. */
const markAt = page.indexOf('data-recovering');
const panel = markAt === -1 ? '' : page.slice(Math.max(0, markAt - 400), markAt);
ok('the new-password screen sits over the studio', markAt !== -1 && /z-\[100\]/.test(panel),
  markAt === -1 ? 'no recovering panel found in page.tsx'
    : 'on a recovery there is already a session, so anything below the studio is behind it');

/* ── And it is drawn signed OUT as well ──────────────────────────────
 
   `audit/forgot.mjs` found this and it is the sharpest fault in the whole
   feature: the panel lived below `if (!user) { return … }`, so the one
   screen whose entire premise is that somebody CANNOT sign in was drawn
   only for people who already had.
 
   Most of the time a recovery does carry a session and `user` fills in.
   Most of the time is not the case worth building for — a session that has
   not arrived yet, keys half set, a browser that blocked the storage. Every
   one of those lands somebody back where they started. */
const drawn = [...page.matchAll(/\{recoveryPanel\}/g)].length;
ok('  and is drawn signed out as well as signed in', drawn >= 2,
  `${drawn} place(s): a screen for somebody who cannot sign in, behind signing in`);

ok('  and is opened by the event as well as by the address',
  /onPasswordRecovery\(/.test(page) && /RECOVERING\) === '1'/.test(page),
  'the event fires once, during the load that spent the token — a remount after that '
  + 'comes back to a signed-in studio with no sign of why');

/* The mark must come off once it is done, or a reload lands somebody back on
   a screen whose token is already spent and which cannot be finished. */
ok('  and takes its mark off the address when it is done',
  /searchParams\.delete\(cloud\.RECOVERING\)/.test(page),
  'a reload drops them back onto a screen with nothing left to do');

/* ── In her language ─────────────────────────────────────────────────── */

const KEYS = [...new Set([...page.matchAll(/t\('(auth\.(?:forgot|reset)[A-Za-z]*)'/g)].map((one) => one[1]))];
const noAf = KEYS.filter((key) =>
  !new RegExp(`"${key.replace('.', '\\.')}":\\s*\\{[^}]*\\baf:\\s*"[^"]{2,}"`).test(words));
ok(`the whole way back is in Afrikaans too — ${KEYS.length} keys`,
  KEYS.length >= 7 && noAf.length === 0,
  noAf.length ? noAf.join(', ') : `${KEYS.length} keys is fewer than these screens have sentences`);

if (failures) {
  console.error(`\ncheck:forgot — ${failures} failure(s).\n`);
  process.exit(1);
}
console.log(
  '\ncheck:forgot — a forgotten password has a way back, the screen never says whether '
  + 'an address is one of ours, and the new one is set over the studio rather than behind it.',
);
