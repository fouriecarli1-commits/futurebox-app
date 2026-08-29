/**
 * Telling one person from a hundred accounts.
 *
 * The free tier gives two previews a day per account, and an account is an
 * email address — so somebody with a hundred addresses has two hundred
 * previews a day, each spending real credits on the owner's ElevenLabs
 * account. A limit that is trivially multiplied is not a limit.
 *
 * Three cheap signals, none of them clever, all of them enforced on the free
 * tier only. Somebody paying has been through a card and is not what this is
 * for.
 *
 * The honest limits of it: none of this stops a determined person with a
 * phone and a VPN, and it is not meant to. It closes the *free* multiplication
 * — one browser, one inbox, a hundred sign-ups — which is what turns a
 * generous free tier into a bill.
 */

import crypto from 'node:crypto';

/**
 * Domains that exist to be thrown away.
 *
 * Kept short on purpose. A long blocklist is a maintenance job and every entry
 * is a chance to lock out somebody real; these are the ones whose entire
 * product is a disposable inbox. It only gates the free tier — anybody on one
 * of these may still sign up, and may still pay.
 */
const DISPOSABLE = [
  'mailinator.com', 'guerrillamail.com', 'guerrillamail.info', 'sharklasers.com',
  '10minutemail.com', 'tempmail.com', 'temp-mail.org', 'throwawaymail.com',
  'yopmail.com', 'trashmail.com', 'getnada.com', 'dispostable.com',
  'maildrop.cc', 'fakeinbox.com', 'mintemail.com', 'moakt.com',
  'emailondeck.com', 'tempr.email', 'inboxkitten.com', 'mailnesia.com',
];

/** Providers where a dot in the local part is not part of the address. */
const DOTLESS = ['gmail.com', 'googlemail.com'];

/**
 * One inbox, one string.
 *
 * `a.n.r.e+test@googlemail.com` and `anre@gmail.com` are the same person's
 * inbox, and this returns the same key for both. Plus-addressing is stripped
 * everywhere because every provider that supports it treats the suffix as
 * routing rather than as part of the address; dots are only stripped where the
 * provider says they mean nothing, because elsewhere they do.
 */
export function emailKey(email: string): string {
  const trimmed = email.trim().toLowerCase();
  const at = trimmed.lastIndexOf('@');
  if (at < 1) return trimmed;

  let local = trimmed.slice(0, at);
  let domain = trimmed.slice(at + 1);

  const plus = local.indexOf('+');
  if (plus !== -1) local = local.slice(0, plus);

  if (domain === 'googlemail.com') domain = 'gmail.com';
  if (DOTLESS.indexOf(domain) !== -1) local = local.split('.').join('');

  return `${local}@${domain}`;
}

export function isDisposable(email: string): boolean {
  const at = email.lastIndexOf('@');
  if (at < 1) return false;
  const domain = email.slice(at + 1).trim().toLowerCase();
  return DISPOSABLE.indexOf(domain) !== -1;
}

/**
 * The caller's address, as far as it can be trusted.
 *
 * `x-forwarded-for` is a list the proxies appended to; the first entry is what
 * the client claimed and the ones after it were added by hops. On Vercel the
 * first is the real client address, which is why it is the one taken — behind
 * a different proxy this would need revisiting, and it is a brake rather than
 * a gate either way.
 */
export function addressOf(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    request.headers.get('x-real-ip') ||
    ''
  );
}

/**
 * A salted hash of an address, or empty when there is no salt.
 *
 * Hashed because equality is all this needs and an address is personal data;
 * **salted** because the whole IPv4 space is four billion values and an
 * unsalted hash of one is a lookup table away from the address itself.
 *
 * The salt falls back to the service-role key, which is server-only and
 * already secret. The trade is stated rather than hidden: if that key leaks,
 * these hashes become enumerable — but a leaked service-role key is already
 * the worse problem. Set IP_SALT to keep the two apart.
 */
export function addressKey(address: string): string {
  const salt = process.env.IP_SALT || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!address || !salt) return '';
  return crypto.createHmac('sha256', salt).update(address).digest('hex').slice(0, 32);
}
