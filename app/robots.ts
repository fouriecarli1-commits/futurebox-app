/**
 * What a crawler may look at.
 *
 * Everything public is open, because the whole point of the Spotlight page and
 * the podcast feeds is to be found. What is closed is anything that costs
 * money to answer or belongs to one person: the API is not content, and a
 * crawler walking it would spend somebody's credits and learn nothing.
 */

import type { MetadataRoute } from 'next';
import { SITE_URL } from './lib/brand';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // /api is the important one. The rest are Next's own plumbing.
      disallow: ['/api/', '/_next/static/chunks/'],
    },
    /* Pointed at the sitemap, and built from the same host as everything else
       — a robots file that names one address while the pages live at another
       is a map to a place nobody is. */
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
