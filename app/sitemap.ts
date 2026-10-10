/**
 * The pages worth finding.
 *
 * Only what is genuinely public and genuinely a page. Not the API, which costs
 * money to answer, and not a creator's channel — those are made by people and
 * a list of them would be a list that goes stale the moment somebody deletes
 * an account.
 *
 * Built from `SITE_HOST` like everything else, so pointing a real domain at
 * this app moves the sitemap with it rather than leaving Google a map to an
 * address nobody uses.
 */

import type { MetadataRoute } from 'next';
import { SITE_URL } from './lib/brand';
import { PIECES } from './lib/blog';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${SITE_URL}/help`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/terms`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE_URL}/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE_URL}/legal`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    /* The articles, and the index above them.

       Every one of these exists as a file at build time — see
       `generateStaticParams` in `app/blog/[piece]/page.tsx` — so the map
       cannot name a page that is not there. `lastModified` is each piece's own
       date rather than today's: telling a crawler that an article written in
       October changed this morning is how a site teaches Google to stop
       believing its own sitemap. */
    { url: `${SITE_URL}/blog`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    ...PIECES.map((piece) => ({
      url: `${SITE_URL}/blog/${piece.id}`,
      lastModified: new Date(piece.on),
      changeFrequency: 'yearly' as const,
      priority: 0.5,
    })),
  ];
}
