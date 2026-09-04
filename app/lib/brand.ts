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
/* There is deliberately no exported contact address.
 
   There was one, and it was rendered on /terms, /privacy and into a `mailto:`
   on the sponsorship form — three public places, on a NEXT_PUBLIC_ variable,
   which means it also sat in the client bundle for anybody who opened dev
   tools. One mailbox behind the whole app is one mailbox to lose to scrapers.
 
   Contact is `/help` now: a form that reaches the same inbox with the sender's
   own address as reply-to. `check:security` fails the build if an address
   finds its way back into anything the browser can see. */

/** The full origin, for links rather than for printing. */
export const SITE_URL = `https://${SITE_HOST}`;

/** A creator's public address, as it is shown to them. */
export function profileAddress(handle: string): string {
  return `${SITE_HOST}/@${handle.replace(/^@/, '')}`;
}
