/**
 * Sending email, and the one rule that matters: it may never break the thing
 * that triggered it.
 *
 * ── Why every caller ignores the result ──────────────────────────────────
 *
 * The most important email this app sends is a receipt, and it is sent from
 * the payment webhook. If a provider outage made `send()` throw there, Paystack
 * would get a 500, retry, and the retry would hit `recordPurchase` again. The
 * purchase guards are idempotent so nothing would be double-counted — but the
 * member would still be waiting on an unlock that a mail server is holding up.
 *
 * A missing receipt is an annoyance. A failed payment is a refund and an angry
 * message. So nothing here throws, every failure is recorded rather than
 * raised, and every caller sends and moves on.
 *
 * ── Why no SDK ───────────────────────────────────────────────────────────
 *
 * Resend's send endpoint is one POST with a JSON body. A dependency to write
 * that is a dependency to update forever. `MAIL_API_URL` is overridable, so a
 * different provider with the same shape needs an environment variable rather
 * than a rewrite.
 *
 * ── The from address, which is not the enquiries address ─────────────────
 *
 * These are two different things and conflating them is the usual mistake.
 *
 * `MAIL_FROM` is where mail is sent *from*, and it has to be on a domain whose
 * DNS you control, with SPF and DKIM records the provider gives you. A free
 * mailbox — gmail.com, outlook.com — cannot be used here: Gmail publishes a
 * DMARC policy that tells every receiving server to reject mail claiming to be
 * from gmail.com that did not come from Google. Sending "from"
 * futureboxapp@gmail.com through any provider means the receipt lands in spam
 * or is refused outright.
 *
 * `MAIL_REPLY_TO` is where a reply goes, and that can be any mailbox at all.
 * It defaults to the enquiries address, so somebody hitting reply on a receipt
 * reaches a person.
 *
 * Until a domain is settled — see `docs/GOING_LIVE.md` §2, which is still open
 * — `MAIL_FROM` cannot be set, and nothing here sends. That is the honest
 * state and it is reported rather than hidden.
 */

import crypto from 'node:crypto';
import { admin } from './account';

/** Where enquiries go when nothing else is set. */
export const ENQUIRIES = process.env.MAIL_REPLY_TO || 'futureboxapp@gmail.com';

const API = process.env.MAIL_API_URL || 'https://api.resend.com/emails';
const KEY = () => process.env.MAIL_API_KEY ?? '';
const FROM = () => process.env.MAIL_FROM ?? '';

/** Whose inbox gets told when something needs a person. */
export const OWNER = () => process.env.OWNER_EMAIL || ENQUIRIES;

/**
 * The provider's own base, worked out from the send endpoint.
 *
 * `MAIL_API_URL` is overridable so a different provider with the same shape is
 * an environment variable rather than a rewrite — so the base is derived from
 * it rather than written down twice and left to drift.
 */
export function apiBase(): string {
  return API.replace(/\/emails\/?$/, '');
}

/**
 * Mailboxes that cannot be sent *from*, whatever a provider accepts.
 *
 * Not a preference. Google publishes a DMARC policy that tells every receiving
 * server to reject mail claiming to be from gmail.com that did not come from
 * Google, and the big free providers all do the same. Setting one of these as
 * `MAIL_FROM` does not fail at send time — the provider takes it, the letter
 * leaves, and it is refused or filed as spam at the far end, where nobody
 * running the app can see it happen.
 *
 * So it is named, and the setup route says so before a single receipt is lost.
 */
export const FREE_MAILBOXES = [
  'gmail.com', 'googlemail.com', 'yahoo.com', 'yahoo.co.uk', 'outlook.com',
  'hotmail.com', 'hotmail.co.uk', 'live.com', 'msn.com', 'icloud.com', 'me.com',
  'mac.com', 'aol.com', 'protonmail.com', 'proton.me', 'zoho.com', 'mail.com',
  'yandex.com', 'gmx.com', 'web.de', 'webmail.co.za', 'vodamail.co.za',
] as const;

export function freeMailbox(domain: string): boolean {
  return FREE_MAILBOXES.includes(domain.toLowerCase() as (typeof FREE_MAILBOXES)[number]);
}

/** The domain the from address belongs to, which is the one that must verify. */
export function fromDomain(): string {
  const at = FROM().lastIndexOf('@');
  if (at < 0) return '';
  return FROM()
    .slice(at + 1)
    .replace(/>$/, '')
    .trim()
    .toLowerCase();
}

export type DomainStatus =
  | 'pending'
  | 'verified'
  | 'failed'
  | 'not_started'
  | 'partially_verified'
  | 'partially_failed';

export interface DnsRecord {
  readonly record?: string;
  readonly name: string;
  readonly value: string;
  readonly type: string;
  readonly ttl?: string;
  readonly status?: string;
  readonly priority?: number;
}

export interface MailDomain {
  readonly id: string;
  readonly name: string;
  readonly status: DomainStatus;
  readonly records?: readonly DnsRecord[];
}

/**
 * Ask the provider what it thinks of a domain.
 *
 * Read off `resend` v6.26.0 rather than from memory, like every other supplier
 * in this app: `GET /domains` lists them with a status, and `GET /domains/{id}`
 * adds the DNS records with a status on each one. Those records are the whole
 * point — a person setting this up needs the rows to paste, not a sentence
 * telling them to go and find them.
 */
async function ask<T>(path: string): Promise<T | null> {
  if (!KEY()) return null;
  try {
    const response = await fetch(`${apiBase()}${path}`, {
      headers: { authorization: `Bearer ${KEY()}` },
      cache: 'no-store',
    });
    if (!response.ok) return null;
    return (await response.json().catch(() => null)) as T | null;
  } catch {
    return null;
  }
}

export async function domains(): Promise<MailDomain[]> {
  const said = await ask<{ data?: MailDomain[] }>('/domains');
  return said?.data ?? [];
}

export async function domainDetail(id: string): Promise<MailDomain | null> {
  return ask<MailDomain>(`/domains/${encodeURIComponent(id)}`);
}

/**
 * Where the app lives, for the one link every letter carries.
 *
 * `NEXT_PUBLIC_SITE_HOST` is the same value the rest of the app builds its
 * public URLs from. The fallback is a relative-looking string rather than a
 * guess at a domain: a letter that names the wrong host is worse than one
 * that names none, and this is only reached when nothing is configured.
 */
const SITE = () =>
  process.env.NEXT_PUBLIC_SITE_HOST
    ? `https://${process.env.NEXT_PUBLIC_SITE_HOST}`
    : 'the app';

export function configured(): boolean {
  return Boolean(KEY() && FROM());
}

export type Sent =
  | { readonly ok: true; readonly skipped?: 'already_sent' }
  | { readonly ok: false; readonly why: string };

export interface Letter {
  readonly to: string;
  readonly subject: string;
  /** Plain text. Always sent — see `wrap` for why it is not optional. */
  readonly text: string;
  /**
   * A dedupe key, where sending twice would be wrong.
   *
   * A payment webhook is retried on any non-2xx, and a receipt is exactly the
   * kind of thing nobody wants twice. The key is written to `mail_log` under a
   * unique constraint, so the second attempt loses the race in the database
   * rather than in application logic that assumes one process.
   */
  readonly once?: string;
  readonly kind: string;
  /**
   * Where a reply should go, when it is not the enquiries mailbox.
   *
   * Every letter to a member replies to enquiries, which is right: they wrote
   * to us. An enquiry *forwarded* to whoever runs the place is the other
   * direction — it should reply to the person who asked, so answering it is
   * hitting reply rather than copying an address out of the body and hoping it
   * was typed correctly.
   */
  readonly replyTo?: string;
}

/**
 * The same frame around every letter.
 *
 * Plain text rather than HTML, and that is a decision rather than laziness.
 * A receipt is read, kept, and occasionally forwarded to an accountant; text
 * survives all three. It cannot break in a client that blocks images, it
 * cannot look wrong in dark mode, and it never lands in the Promotions tab for
 * being a marketing-shaped HTML mail. The one thing HTML buys — a logo — is
 * not worth the deliverability.
 */
function wrap(body: string): string {
  /* No address in the footer.

     Every letter goes out with `reply_to` set, so pressing reply reaches the
     right inbox without the address being written anywhere it could be
     scraped, forwarded or screenshotted. The help page is named instead,
     because somebody who deleted the letter still needs a way back. */
  return `${body.trim()}

—
FutureBox
Reply to this message, or ask at ${SITE()}/help
`;
}

/**
 * Send it, or write down why not. Never throws.
 *
 * The `once` key is claimed *before* the send, not after. If the process dies
 * mid-flight the letter is not sent again — which is the safer failure for a
 * receipt, where a duplicate is worse than a miss, and the miss is visible in
 * `mail_log` for anybody looking.
 */
export async function send(letter: Letter): Promise<Sent> {
  if (!configured()) return { ok: false, why: 'not_configured' };

  const client = admin();

  if (letter.once && client) {
    const { error } = await client
      .from('mail_log')
      .insert({ dedupe_key: letter.once, kind: letter.kind, to_email: letter.to });
    // A unique-constraint violation means somebody already claimed this one.
    if (error) return { ok: true, skipped: 'already_sent' };
  }

  try {
    const response = await fetch(API, {
      method: 'POST',
      headers: { authorization: `Bearer ${KEY()}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        from: FROM(),
        to: [letter.to],
        reply_to: letter.replyTo || ENQUIRIES,
        subject: letter.subject,
        text: wrap(letter.text),
      }),
    });
    if (!response.ok) {
      const why = `${response.status}: ${(await response.text().catch(() => '')).slice(0, 200)}`;
      await note(client, letter, false, why);
      return { ok: false, why };
    }
    await note(client, letter, true, null);
    return { ok: true };
  } catch (problem) {
    const why = String(problem).slice(0, 200);
    await note(client, letter, false, why);
    return { ok: false, why };
  }
}

/** What happened, against the claim. Best effort — this must not throw either. */
async function note(
  client: ReturnType<typeof admin>,
  letter: Letter,
  ok: boolean,
  detail: string | null,
): Promise<void> {
  if (!client) return;
  const when = new Date().toISOString();

  /* A letter with a claim already has a row; this fills in how it went.

     One without a claim had none at all, which meant every letter that is not
     deduped — an enquiry forwarded, a warning to the owner, a test — left no
     trace whether it went or not. `mail.sql` says this table is the answer
     when somebody says they never got a letter, and it was only the answer for
     about half of them. A generated key keeps the unique constraint honest
     without pretending the letter was deduped. */
  if (!letter.once) {
    await client
      .from('mail_log')
      .insert({
        dedupe_key: `${letter.kind}:${crypto.randomUUID()}`,
        kind: letter.kind,
        to_email: letter.to,
        ok,
        detail,
        sent_at: when,
      })
      .then(
        () => undefined,
        () => undefined,
      );
    return;
  }

  await client
    .from('mail_log')
    .update({ ok, detail, sent_at: when })
    .eq('dedupe_key', letter.once)
    .then(
      () => undefined,
      () => undefined,
    );
}

/**
 * Letters that were claimed and never arrived.
 *
 * `ok` false is a refusal from the provider; `ok` still null is worse — the
 * row was claimed and the process died before it finished, so the dedupe key
 * is spent and the letter will never be sent again. Both are somebody who did
 * not get their receipt, and neither is visible anywhere until this is asked.
 */
export async function unsent(days = 7): Promise<{ failed: number; stuck: number } | null> {
  const client = admin();
  if (!client) return null;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const [bad, hanging] = await Promise.all([
    client
      .from('mail_log')
      .select('id', { count: 'exact', head: true })
      .gte('claimed_at', since)
      .eq('ok', false),
    client
      .from('mail_log')
      .select('id', { count: 'exact', head: true })
      .gte('claimed_at', since)
      /* Older than a few minutes, so a letter being sent right now is not
         counted as one that never arrived. */
      .lt('claimed_at', new Date(Date.now() - 5 * 60 * 1000).toISOString())
      .is('ok', null),
  ]);

  if (bad.error || hanging.error) return null;
  return { failed: bad.count ?? 0, stuck: hanging.count ?? 0 };
}

/**
 * Tell whoever runs the place that something needs them.
 *
 * Separate from `send` because the audience is different and so is the bar: a
 * member gets letters they asked for by using the app, and the operator gets
 * letters about things that are broken. Mixing them means either the operator
 * is spammed or a real problem is quiet.
 *
 * `once` is used for anything that could fire repeatedly — a credit warning
 * that arrives hourly for a week is a warning that gets filtered.
 */
export async function tellOwner(
  subject: string,
  text: string,
  options: { once?: string; kind?: string; replyTo?: string } = {},
): Promise<Sent> {
  return send({
    to: OWNER(),
    subject: `[FutureBox] ${subject}`,
    text,
    kind: options.kind ?? 'operator',
    ...(options.once ? { once: options.once } : {}),
    ...(options.replyTo ? { replyTo: options.replyTo } : {}),
  });
}

/**
 * Where to write, and which language to write in.
 *
 * The payment webhook knows an owner's uuid and nothing else — Paystack tells
 * us who paid in *their* terms, and the metadata carries our uuid. Both the
 * address and the preference live in Supabase's auth schema, which only the
 * service key can read.
 *
 * Null rather than a throw when it cannot be found: a receipt with nowhere to
 * go is a thing to record, not a reason to fail a payment.
 *
 * ── Why the language lives on the auth user ──────────────────────────────
 *
 * A receipt for a renewal is sent months later with nobody present: no
 * browser, no request from the member, nothing to read a preference off. The
 * webhook knows one thing about them — the uuid Paystack carries in its
 * metadata — so the language has to be somewhere that uuid can reach.
 *
 * It could have been a table. It is `user_metadata` on the auth user instead,
 * for two reasons that both matter more than tidiness. There is no per-account
 * settings table in this app and adding one for a single string means a
 * migration, a policy, and a second thing to get wrong. And this lookup was
 * already happening: the address comes from `getUserById`, so the language
 * comes back in the same call rather than a second round trip on a path that
 * runs inside a payment webhook.
 *
 * `i18n.tsx` writes it whenever somebody chooses, and only when they are
 * signed in — the browser's own copy stays the source of truth for the page
 * they are looking at.
 *
 * Falls back to English rather than guessing. An address or a name says
 * nothing reliable about what somebody reads, and a receipt in the wrong
 * language is worse than one in the language the whole app defaults to.
 */
export async function accountFor(
  owner: string,
): Promise<{ email: string; lang: 'en' | 'af' } | null> {
  const client = admin();
  if (!client) return null;
  try {
    const { data, error } = await client.auth.admin.getUserById(owner);
    if (error || !data.user?.email) return null;
    const said = (data.user.user_metadata as { lang?: unknown } | null)?.lang;
    return { email: data.user.email, lang: said === 'af' ? 'af' : 'en' };
  } catch {
    return null;
  }
}
