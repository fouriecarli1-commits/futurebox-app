/**
 * What a crawler may look at.
 *
 * Everything public is open, because the whole point of the Spotlight page and
 * the podcast feeds is to be found. What is closed is anything that costs
 * money to answer or belongs to one person: the API is not content, and a
 * crawler walking it would spend somebody's credits and learn nothing.
 */

import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // /api is the important one. The rest are Next's own plumbing.
      disallow: ['/api/', '/_next/static/chunks/'],
    },
  };
}
