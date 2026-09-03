/**
 * The address this app actually lives at, in one place.
 *
 * `futurebox.app` was written into a dozen files — the studio header, the terms,
 * the privacy notice, the sample feed, the pitch text, the contact address. It
 * is not ours. DNS resolves it to a server that is not ours either, and the
 * studio was showing people `futurebox.app/@theirhandle` as **their own
 * address**, which is a promise the product cannot keep.
 *
 * Eight of the ten obvious FutureBox domains are taken; see `docs/GOING_LIVE.md`
 * for the list and for what still has to be checked, which is the trademark
 * rather than the DNS.
 *
 * So the default here is the address we genuinely have today, and the real one
 * is a variable rather than an edit in twelve files. When the domain is settled,
 * set it once.
 *
 * `NEXT_PUBLIC_` because the browser prints these, and written out in full
 * rather than looked up by a computed key: Next only substitutes what it can
 * see literally in the source, and a computed name arrives in the browser as
 * undefined with no error to explain it.
 */

/** Where the app is served from. No scheme — it is printed as often as it is linked. */
export const SITE_HOST = process.env.NEXT_PUBLIC_SITE_HOST || 'futurebox-app.vercel.app';

/** Where somebody writes when something needs a person. */
export const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL || `admin@${SITE_HOST}`;

/** The full origin, for links rather than for printing. */
export const SITE_URL = `https://${SITE_HOST}`;

/** A creator's public address, as it is shown to them. */
export function profileAddress(handle: string): string {
  return `${SITE_HOST}/@${handle.replace(/^@/, '')}`;
}
