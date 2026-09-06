/**
 * The email path, in the places it fails without saying so.
 *
 * Three of the four ways sending goes wrong leave nothing on any screen: a
 * wire field renamed so replies go to the wrong place, a letter that is never
 * recorded so nobody can tell whether it went, and a from address on a free
 * mailbox that the provider accepts and the far end throws away.
 *
 * None of them throws. None of them fails a build. All of them are found by a
 * customer saying they never got a receipt.
 */
import { readFileSync } from 'node:fs';
import { FREE_MAILBOXES, freeMailbox, fromDomain, recipients } from '../app/lib/server/email.ts';
import { isOwnerEmail, ownerEmails } from '../app/lib/server/owners.ts';

let bad = 0;
const check = (label: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? '  ok ' : '  ✗  '} ${label}${!ok && detail ? ` — ${detail}` : ''}`);
  if (!ok) bad += 1;
};

const email = readFileSync('app/lib/server/email.ts', 'utf8');
const setup = readFileSync('app/api/mail/setup/route.ts', 'utf8');

/* ── The wire field ───────────────────────────────────────────────────────
   `resend` v6.26.0 takes `replyTo` in its own API and sends `reply_to` over
   the wire. This app posts the JSON itself, so it must use the wire name.
   Renaming it to the SDK's spelling is a one-character-looking change that
   silently sends every reply to the from address instead — which is a mailbox
   nobody reads. */
check('the reply address is sent as reply_to, which is the wire field',
  /reply_to:/.test(email), 'replies would go to the from address, which nobody reads');
check('and not as the SDK spelling, which this app does not use',
  !/replyTo:\s*(letter|email)/.test(email));

/* ── Every letter is recorded ─────────────────────────────────────────────
   `mail.sql` says this table is the answer when somebody says they never got
   a letter. It was only the answer for the deduped ones: a letter with no
   claim had no row at all, sent or not. */
check('a letter without a dedupe key is still written down',
  /if \(!letter\.once\)/.test(email) && /\.insert\(\{[\s\S]{0,200}dedupe_key/.test(email),
  'letters that are not deduped leave no trace either way');
check('and the generated key does not collide with a real claim',
  /randomUUID\(\)/.test(email),
  'two undeduped letters of the same kind would fight over one row');

/* ── The from address ─────────────────────────────────────────────────── */
check('the free mailboxes are actually listed', FREE_MAILBOXES.length >= 15,
  String(FREE_MAILBOXES.length));
for (const one of ['gmail.com', 'GMAIL.COM', 'outlook.com', 'icloud.com', 'webmail.co.za']) {
  check(`${one} is refused as a sender`, freeMailbox(one));
}
for (const one of ['futureboxstudio.co.za', 'anything.com', '']) {
  check(`${one || '(empty)'} is not treated as a free mailbox`, !freeMailbox(one));
}
check('the setup route checks it before it checks anything upstream',
  setup.indexOf('freeMailbox(') > 0 && setup.indexOf('freeMailbox(') < setup.indexOf('await domains()'),
  'the account is asked about a domain that could never have worked');

/* ── The from domain is read off the address, not guessed ─────────────── */
{
  const cases: [string, string][] = [
    ['futurebox@futureboxstudio.co.za', 'futureboxstudio.co.za'],
    ['FutureBox <hello@Example.COM>', 'example.com'],
    ['no-at-sign', ''],
  ];
  for (const [value, want] of cases) {
    process.env.MAIL_FROM = value;
    check(`the domain of "${value}" reads as "${want || 'nothing'}"`,
      fromDomain() === want, fromDomain());
  }
  delete process.env.MAIL_FROM;
}

/* ── The setup route is guarded ───────────────────────────────────────── */
check('the setup route refuses without a secret',
  /POST_SECRET/.test(setup) && /status: 503/.test(setup));
check('and compares it in constant time',
  /timingSafeEqual/.test(setup),
  'a plain comparison leaks how much of the secret was right');
check('and its test letter is deliberately not deduped',
  /Deliberately not deduped/.test(setup),
  'a second test would silently claim success without sending anything');

/* ── The footer carries no address ────────────────────────────────────── */
check('no mailbox is written into the letter footer',
  !/@[a-z0-9-]+\.[a-z]{2,}/i.test(email.slice(email.indexOf('function wrap'), email.indexOf('function wrap') + 900)),
  'an address in every letter is an address in every forwarded letter');


/* ── A second owner ─────────────────────────────────────────────────────
 
   "Kan ek 'n tweede owner stel, sodat anrefourie@gmail.com ook die app kan
    toets saam met my?"
 
   Yes, and asking turned up a bug that would have answered "no" without ever
   saying so. The sender wrapped the address in an array — `to: [letter.to]` —
   which is right for one address and silently wrong for a list: the allowance
   warnings would have gone to one recipient literally named
   "a@x.com,b@y.com", been refused at the far end, and stopped arriving with
   nothing anywhere to say why. */
check('one address is one recipient', recipients('one@futurebox.studio').length === 1);
check('two become two, not one malformed one',
  recipients('a@futurebox.studio,b@futurebox.studio').length === 2,
  recipients('a@futurebox.studio,b@futurebox.studio').join(' | '));
check('with the spaces around the comma taken off',
  recipients(' a@futurebox.studio , b@futurebox.studio ').join('|') === 'a@futurebox.studio|b@futurebox.studio');
check('a trailing comma does not become an empty recipient',
  recipients('a@futurebox.studio,').length === 1);
check('and nothing at all is nobody, rather than one empty address',
  recipients('').length === 0 && recipients('  ,  ').length === 0);

/* ── Who runs the place ─────────────────────────────────────────────────
 
   The one setting on the whole switch-on list that costs money every day it
   is missing, and the only one whose absence is completely silent: an app
   with no owner meters the person who runs it as a free user, refuses them
   their own name, and sends the allowance warnings nowhere.
 
   `/api/mail/setup` reports it now. What is asserted here is the matching
   itself, because it is an allowlist that grants exemptions, and the two
   ways an allowlist becomes a hole are both one character wide. */
const KEEP = process.env.OWNER_EMAIL;
process.env.OWNER_EMAIL = ' Boss@FutureBox.Studio , second@futurebox.studio ';
check('an owner is matched whatever case they typed', isOwnerEmail('boss@futurebox.studio'));
check('and with the spaces around a comma-separated entry trimmed',
  isOwnerEmail('second@futurebox.studio'));
check('a stranger is not an owner', !isOwnerEmail('someone@example.com'));
/* The standard way an allowlist becomes a hole: a substring test. */
check('a lookalike that merely contains an owner address is refused',
  !isOwnerEmail('boss@futurebox.studio.evil.example'));
check('and one that an owner address contains is refused too',
  !isOwnerEmail('boss@futurebox.stud'));
check('an empty address is nobody', !isOwnerEmail('') && !isOwnerEmail('   '));
process.env.OWNER_EMAIL = '';
check('with nothing set, nobody is an owner', !isOwnerEmail('boss@futurebox.studio'));
check('and the list is empty rather than one empty string',
  ownerEmails().length === 0, `${ownerEmails().length}`);
if (KEEP === undefined) delete process.env.OWNER_EMAIL;
else process.env.OWNER_EMAIL = KEEP;

/* And the prefix that would ship the list of who is privileged to every
   visitor. check:security scans the built bundle; this catches it in source,
   which is where somebody would type it. */
const owners = readFileSync('app/lib/server/owners.ts', 'utf8');
check('the owner list is never read from a NEXT_PUBLIC_ variable',
  !/NEXT_PUBLIC_OWNER/.test(owners));

if (bad) {
  console.error(`\ncheck:mail — ${bad} wrong.`);
  process.exit(1);
}
console.log('check:mail — replies land, every letter is written down, and a sender that cannot work is refused.');
