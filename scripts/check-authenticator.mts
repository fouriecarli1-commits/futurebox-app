/**
 * The second lock, and the two ways a second lock makes things worse.
 *
 * ── What she asked for ───────────────────────────────────────────────────
 *
 * Carli, 23 September 2026: *"Ek dink ons moet mense 'n opsie gee om die app
 * te beveilig met 'n authenticator app as hulle wil."*
 *
 * ── The two properties worth a rule, and why they are these two ──────────
 *
 * **A password sign-in must not open the studio.** This is the one that is
 * easy to get wrong and impossible to notice: `signInWithPassword` against an
 * account with an authenticator SUCCEEDS. There is a real session, the
 * account handler fires, every screen draws — at assurance level one, which
 * is exactly the level the authenticator was switched on to stop being
 * enough. An app that forgets to ask has a second factor that protects
 * nothing while looking like it protects everything, which is worse than not
 * offering one.
 *
 * **It must not eat accounts.** An authenticator is five seconds to switch on
 * and a locked account to get out of. Supabase has no backup codes, so the
 * backup is the secret itself — shown as text, kept where passwords are kept
 * — and the screen has to say so BEFORE the switch, not after.
 *
 * And a third that follows from the first: taking the lock off has to cost a
 * code. Otherwise whoever holds the password — the thing this was switched
 * on to stop being enough — turns it off in one press.
 */

import { readFileSync } from 'node:fs';

let failures = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : 'NOT'}  ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) failures += 1;
};

/**
 * `first` appears before `second`, and BOTH appear.
 *
 * Written as a helper because the naive version — comparing two `indexOf`
 * results — has now been got wrong three times in one day in this
 * repository: in `check:ownfootage`, in `check:ampshelf`, and twice more in
 * the first draft of this file. Deleting the first thing gives -1, which is
 * less than any position, so a file that does not do the thing AT ALL reads
 * as one that does it first. It is the same shape as the `startOpen` rule
 * that once landed on a parameter four hundred lines above its call.
 *
 * An index into a string is only an answer once you know the thing is there.
 */
const before = (text: string, first: string, second: string): boolean => {
  const a = text.indexOf(first);
  const b = text.indexOf(second);
  return a !== -1 && b !== -1 && a < b;
};

const cloud = readFileSync('app/lib/cloud.ts', 'utf8');
const screen = readFileSync('app/components/Authenticators.tsx', 'utf8');
const page = readFileSync('app/page.tsx', 'utf8');
const account = readFileSync('app/components/Account.tsx', 'utf8');
const words = readFileSync('app/lib/i18n.tsx', 'utf8');

/* ── It exists, and it is reachable ──────────────────────────────────── */

ok('an authenticator can be added', /mfa\.enroll\(/.test(cloud) && /data-mfaadd/.test(screen),
  'there is no way to switch a second lock on');

ok('  and it is on the account screen', /<Authenticators \/>/.test(account),
  'the component exists and no screen draws it');

ok('  and it is optional', !/required|must|verplig/i.test(
  /export default function Authenticators[\s\S]{0,600}/.exec(screen)?.[0] ?? ''),
  'she asked for an option, not a requirement');

/* ── A password alone must not be enough ─────────────────────────────── */

ok('the app asks whether a session still owes a code',
  /getAuthenticatorAssuranceLevel\(/.test(cloud) && /nextLevel === 'aal2'/.test(cloud),
  'a password sign-in succeeds at level one and every screen would draw the studio');

ok('  and it asks on every load, not only after a press',
  /cloud\.authenticatorWanted\(\)/.test(page) && /useEffect\(\(\) => \{[\s\S]{0,400}?authenticatorWanted/.test(page),
  'a reload in the middle of the challenge leaves a valid level-one session and walks straight in');

const panel = (() => {
  const at = page.indexOf('data-owescode');
  return at === -1 ? '' : page.slice(Math.max(0, at - 400), at);
})();
ok('  and the code box sits over the studio', Boolean(panel) && /z-\[100\]/.test(panel),
  panel ? 'the session is real, so anything below the studio is behind it'
        : 'no code panel found in page.tsx');

const drawn = [...page.matchAll(/\{codePanel\}/g)].length;
ok('  drawn signed out as well as signed in', drawn >= 2,
  `${drawn} place(s) — a level-one session is a signed-in session either way`);

/* No cancel. A way out of that panel that left the session in place would be
   a way into the studio at the level the lock refuses. Signing out is the
   way out, and it is on the panel. */
const whole = (() => {
  const at = page.indexOf('const codePanel = owesCode ?');
  return at === -1 ? '' : page.slice(at, page.indexOf('\n  ) : null;', at));
})();
ok('  with no way out of it but signing out',
  Boolean(whole) && /handleSignOut\(\)/.test(whole) && !/common\.cancel/.test(whole),
  'a cancel on this panel is a door into the studio at the level the lock refuses');

/* ── It must not eat accounts ────────────────────────────────────────── */

ok('the secret is shown as text, not only as a square', /data-mfasecret/.test(screen),
  'the square is a camera away from useless, and the text is the only backup there is');

ok('  and the screen says to keep it', /mfa\.secretKeep/.test(screen)
  && /"mfa\.secretKeep":[^\n]*only backup/i.test(words),
  'a secret shown with no sentence beside it is a string nobody copies');

ok('  and warns before the switch, not after',
  before(screen, "t('mfa.what')", 'data-mfaadd'),
  'the warning about a lost phone is missing, or arrives after the lock is on \u2014 which is not a warning');

ok('  and a second one is asked for', /mfa\.addSecond/.test(screen),
  'one authenticator is one phone, and one phone is the thing that gets lost');

/* ── Taking it off costs a code ──────────────────────────────────────── */

const off = /export async function dropAuthenticator[\s\S]*?\n\}/.exec(cloud)?.[0] ?? '';
ok('taking the lock off needs a code from it',
  before(off, 'confirmAuthenticator(', 'unenroll('),
  off ? 'whoever holds the password turns the lock off in one press'
      : 'no dropAuthenticator found');

ok('  and the screen asks for it before offering the button', /mfa\.proveOff/.test(screen),
  'the code is demanded with no sentence saying why');

/* ── In her language ─────────────────────────────────────────────────── */

const KEYS = [...new Set([
  ...[...screen.matchAll(/t\('(mfa\.[A-Za-z]*)'/g)].map((one) => one[1]),
  ...[...page.matchAll(/t\('(mfa\.[A-Za-z]*)'/g)].map((one) => one[1]),
])];
const noAf = KEYS.filter((key) =>
  !new RegExp(`"${key.replace('.', '\\.')}":\\s*\\{[^}]*\\baf:\\s*"[^"]{2,}"`).test(words));
ok(`the whole of it is in Afrikaans too — ${KEYS.length} keys`,
  KEYS.length >= 14 && noAf.length === 0,
  noAf.length ? noAf.join(', ') : `${KEYS.length} keys is fewer than these screens have sentences`);

if (failures) {
  console.error(`\ncheck:authenticator — ${failures} failure(s).\n`);
  process.exit(1);
}
console.log(
  '\ncheck:authenticator — optional, the secret is shown as the backup it is before the switch, '
  + 'a password alone does not open the studio, and taking the lock off costs a code.',
);
