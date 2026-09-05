/**
 * The address this app actually lives at, in one place.
 *
 * `futurebox.app` was written into a dozen files — the studio header, the terms,
 * the privacy notice, the sample feed, the pitch text, the contact address. It
 * is not ours. DNS resolves it to a server that is not ours either, and the
 * studio was showing people `futurebox.app/@theirhandle` as **their own
 * address**, which is a promise the product cannot keep.
 *
 * The name is settled: `futurebox.studio`, with `futureboxstudio.co.za` beside
 * it. Every short form of the plain name was taken and serving — five of them
 * by other people using the FutureBox name itself — which is why it carries a
 * word of its own. See `docs/GOING_LIVE.md` §2, and for what is still open,
 * which is the trademark rather than the DNS.
 *
 * The default below stays the Vercel address on purpose. It is what a preview
 * deployment and a local run genuinely are, and a default that claimed the
 * real domain would have every branch and every developer's laptop printing an
 * address they are not served from. The real one is set once, in the
 * environment, on the deployment that actually answers to it.
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
