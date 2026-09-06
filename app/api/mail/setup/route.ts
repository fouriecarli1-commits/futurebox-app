/**
 * Is the email actually going to work, and if not, exactly what is missing.
 *
 * ── Why a route and not a page of instructions ───────────────────────────
 *
 * Setting up sending is four things — a key, a from address on a domain you
 * control, two or three DNS records, and a wait — and every one of them fails
 * silently. The only signal this app had was `canEmail: false` buried in the
 * watch response, which says something is wrong and nothing about what.
 *
 * So this asks the provider and prints the answer: whether the key works,
 * whether the domain in `MAIL_FROM` is verified, and — the part that saves an
 * evening — the DNS rows still outstanding, with the name, type and value to
 * paste straight into a registrar. A person setting this up needs the rows,
 * not a sentence telling them to go and find the rows.
 *
 * `?test=1` sends a real letter to `OWNER_EMAIL`, because a verified domain
 * and a letter that actually arrives are different claims. The second one is
 * the only one that matters, and it is the one nobody checks until a customer
 * says they never got a receipt.
 *
 * ── And who the owner is, said out loud ──────────────────────────────────
 *
 * `OWNER()` falls back to `MAIL_REPLY_TO` when `OWNER_EMAIL` is unset, which
 * is right for the letters — a warning with nowhere to go is worse than one
 * sent to the enquiries mailbox. It was quietly wrong *here*: the test letter
 * arrived, and arriving is what somebody reads as "the owner is set". It is
 * not. An app with no owner meters the person who runs it as a free user and
 * refuses them their own name, and everything about that failure is silent.
 *
 * So the owner is reported first, before the domain, and the test letter says
 * whether it went to a real owner or to the fallback.
 *
 * ── Guarded ──────────────────────────────────────────────────────────────
 *
 * It reports the account's configuration and can send mail, so it refuses
 * without `POST_SECRET` rather than defaulting to open. Constant time, like
 * `/api/watch`, `/api/post` and `/api/analyse/setup`.
 */

import crypto from 'node:crypto';
import {
  OWNER, configured, domainDetail, domains, freeMailbox, fromDomain, send,
} from '@/app/lib/server/email';
import { ownerEmails } from '@/app/lib/server/owners';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function sameSecret(given: string, wanted: string): boolean {
  const a = Buffer.from(given);
  const b = Buffer.from(wanted);
  // `timingSafeEqual` throws on a length mismatch, which is itself a leak.
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export async function GET(request: Request): Promise<Response> {
  const wanted = process.env.POST_SECRET ?? '';
  if (!wanted) {
    return Response.json(
      { error: 'no_secret', message: 'Set POST_SECRET before using this.' },
      { status: 503 },
    );
  }
  const url = new URL(request.url);
  const given =
    url.searchParams.get('key') ??
    (request.headers.get('authorization') ?? '').replace(/^Bearer /, '');
  if (!given || !sameSecret(given, wanted)) return new Response('no', { status: 404 });

  const key = Boolean(process.env.MAIL_API_KEY);
  const from = process.env.MAIL_FROM ?? '';
  const domain = fromDomain();

  /* Who runs the place, before anything about mail.
 
     This is the one setting on the whole switch-on list that costs money
     every day it is missing, and nothing anywhere says so — the app just
     meters its own owner as a free user. The addresses are printed because
     this route already needs POST_SECRET to answer at all; the list never
     goes anywhere a browser can read it. */
  const owners = ownerEmails();
  const owner = {
    set: owners.length > 0,
    addresses: owners,
    what:
      owners.length > 0
        ? 'Set. These accounts are not metered, may use the FutureBox name, and receive the allowance warnings.'
        : 'NOT SET. Whoever runs this app is metered as a free user on their own engines, cannot use the FutureBox name as a recording name, and the allowance warnings from /api/watch have nowhere to go. Set OWNER_EMAIL in Vercel to the address you sign in with — comma-separated if more than one — and redeploy. Never with a NEXT_PUBLIC_ prefix.',
  };

  /* The two variables, before anything else. `configured()` is the same test
     the rest of the app makes before it tries to send, so this cannot say
     "ready" about an app that will refuse. */
  if (!key || !from) {
    return Response.json({
      owner,
      ready: false,
      why: !key && !from
        ? 'Neither MAIL_API_KEY nor MAIL_FROM is set.'
        : !key
          ? 'MAIL_API_KEY is not set.'
          : 'MAIL_FROM is not set.',
      next: 'Both go in Vercel, then redeploy. MAIL_FROM must be an address on a domain whose DNS you control — a gmail.com address cannot be used, because Google tells every receiving server to refuse mail claiming to be from gmail.com that did not come from Google.',
    });
  }

  /* The mistake that costs the most and shows the least. A free mailbox as the
     from address is accepted by the provider, leaves, and is refused at the
     far end — so every receipt vanishes and nothing anywhere says why. */
  if (freeMailbox(domain)) {
    return Response.json({
      owner,
      ready: false,
      from,
      why: `MAIL_FROM is on ${domain}, which cannot be sent from.`,
      next: `${domain} tells every receiving server to refuse mail that claims to come from it but did not come from ${domain}. The provider will accept the letter and it will be thrown away at the other end, where you cannot see it. MAIL_FROM has to be an address on a domain whose DNS you control. Your own mailbox belongs in MAIL_REPLY_TO instead — a reply address can be anything.`,
    });
  }

  const all = await domains();
  if (all.length === 0) {
    return Response.json({
      owner,
      ready: false,
      from,
      why: 'The key was refused, or this account has no domains on it yet.',
      next: `Add ${domain || 'your domain'} in the Resend dashboard, then come back here for the DNS rows.`,
    });
  }

  const mine = all.find((one) => one.name.toLowerCase() === domain);
  if (!mine) {
    return Response.json({
      owner,
      ready: false,
      from,
      why: `MAIL_FROM is on ${domain}, and that domain is not on this account.`,
      onTheAccount: all.map((one) => ({ name: one.name, status: one.status })),
      next: `Either add ${domain} in the Resend dashboard, or change MAIL_FROM to an address on one of the domains above.`,
    });
  }

  /* The rows. The listing does not carry them — only the detail call does —
     and they are the reason anybody opens this page. */
  const detail = await domainDetail(mine.id);
  const records = (detail?.records ?? []).map((one) => ({
    type: one.type,
    name: one.name,
    value: one.value,
    status: one.status,
    ...(one.priority !== undefined ? { priority: one.priority } : {}),
  }));
  const waiting = records.filter((one) => one.status !== 'verified');

  const verified = mine.status === 'verified';

  /* A real letter, on request. A verified domain and a letter that arrives are
     two different claims, and only the second one matters. */
  let letter: { sent: boolean; to?: string; toOwner?: boolean; note?: string; why?: string } | undefined;
  if (url.searchParams.get('test') === '1') {
    if (!configured()) {
      letter = { sent: false, why: 'not_configured' };
    } else {
      const sent = await send({
        to: OWNER(),
        subject: 'FutureBox — the email is working',
        text: [
          'This is the test letter from /api/mail/setup.',
          '',
          `It was sent from ${from}.`,
          '',
          'If it is in your spam folder, mark it as not spam — the first letter from a new domain often lands there, and telling your mail provider once fixes it for the ones after.',
        ].join('\n'),
        kind: 'setup_test',
        /* Deliberately not deduped. The whole point is to be able to send it
           again after changing something, and a `once` key would make the
           second attempt silently claim success. */
      });
      /* Where it actually went, and whether that is the owner or the
         fallback. A letter that arrives is what somebody reads as proof the
         owner is set, and with OWNER_EMAIL empty it proves the opposite. */
      letter = sent.ok
        ? {
            sent: true,
            to: OWNER(),
            toOwner: owner.set,
            ...(owner.set
              ? {}
              : { note: 'This went to MAIL_REPLY_TO, not to an owner — OWNER_EMAIL is not set. The letter arriving does not mean the owner is.' }),
          }
        : { sent: false, why: sent.why };
    }
  }

  return Response.json({
    owner,
    ready: verified,
    from,
    domain: mine.name,
    status: mine.status,
    /* Everything, not only what is outstanding: a row that says `verified` is
       how somebody knows they pasted the right thing, and a page that hides
       the ones that worked leaves them guessing about all of them. */
    dns: records,
    stillWaiting: waiting.length,
    letter,
    next: verified
      ? 'Verified. Add &test=1 to this address to send yourself a real letter.'
      : waiting.length > 0
        ? 'Put the rows above into your domain’s DNS, exactly as they are, then press Verify in the Resend dashboard. It usually takes minutes.'
        : 'The rows are in but the domain has not verified yet. Give it an hour before changing anything.',
  });
}
