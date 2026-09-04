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

import { admin } from './account';

/** Where enquiries go when nothing else is set. */
export const ENQUIRIES = process.env.MAIL_REPLY_TO || 'futureboxapp@gmail.com';

const API = process.env.MAIL_API_URL || 'https://api.resend.com/emails';
const KEY = () => process.env.MAIL_API_KEY ?? '';
const FROM = () => process.env.MAIL_FROM ?? '';

/** Whose inbox gets told when something needs a person. */
export const OWNER = () => process.env.OWNER_EMAIL || ENQUIRIES;

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
  if (!client || !letter.once) return;
  await client
    .from('mail_log')
    .update({ ok, detail, sent_at: new Date().toISOString() })
    .eq('dedupe_key', letter.once)
    .then(
      () => undefined,
      () => undefined,
    );
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
