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

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${SITE_URL}/help`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/terms`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE_URL}/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE_URL}/legal`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
  ];
}
