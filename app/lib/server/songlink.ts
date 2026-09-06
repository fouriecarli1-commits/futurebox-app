/**
 * Which sites a pasted link may be read from, and how the matching is done.
 *
 * Split out of the route for one reason: this is the part with a security
 * property worth testing on its own. The route never fetches the URL it is
 * handed — it looks the host up here and then fetches *that provider's* oEmbed
 * endpoint. So `providerFor` is the gate, and a gate nobody can call from a
 * test is a gate nobody checks.
 *
 * `scripts/check-songlink.mts` puts the near-misses through it: the lookalike
 * host, the subdomain, the userinfo trick, the scheme that is not a link.
 */

export type Provider = {
  readonly name: string;
  readonly hosts: readonly string[];
  readonly oembed: string;
};

/**
 * The closed list.
 *
 * Every one of these publishes oEmbed as a documented, public, no-key API
 * whose whole purpose is letting another site show what a link points at.
 * Nothing here downloads audio; see the note at the top of the route.
 */
export const PROVIDERS: readonly Provider[] = [
  { name: 'YouTube', hosts: ['youtube.com', 'youtu.be'], oembed: 'https://www.youtube.com/oembed' },
  { name: 'Spotify', hosts: ['spotify.com'], oembed: 'https://open.spotify.com/oembed' },
  { name: 'SoundCloud', hosts: ['soundcloud.com'], oembed: 'https://soundcloud.com/oembed' },
  { name: 'Apple Music', hosts: ['music.apple.com'], oembed: 'https://music.apple.com/api/oembed' },
  { name: 'TikTok', hosts: ['tiktok.com'], oembed: 'https://www.tiktok.com/oembed' },
];

/**
 * The provider a host belongs to, or null.
 *
 * Exact match or a real subdomain — `endsWith('.youtube.com')` rather than
 * `includes('youtube.com')`, because `youtube.com.evil.example` contains the
 * second one and is not YouTube. That single character is the difference
 * between a closed list and a decorative one.
 */
export function providerFor(host: string): Provider | null {
  const clean = host.toLowerCase().replace(/^www\./, '');
  for (const one of PROVIDERS) {
    for (const allowed of one.hosts) {
      if (clean === allowed || clean.endsWith(`.${allowed}`)) return one;
    }
  }
  return null;
}

/**
 * The link a person pasted, checked all the way down to a provider.
 *
 * Returns the provider and the URL to ask about, or the reason it was refused.
 * The URL is rebuilt from its own parts rather than passed through as typed:
 * `https://user:pass@youtube.com@evil.example/` parses with a hostname of
 * `evil.example` in some readers and `youtube.com` in others, and the one
 * thing this must never do is disagree with itself about which host it
 * approved.
 */
export function readLink(
  link: string,
): { ok: true; provider: Provider; url: string } | { ok: false; why: 'not_a_link' | 'bad_scheme' | 'not_supported' } {
  let asked: URL;
  try {
    asked = new URL(link);
  } catch {
    return { ok: false, why: 'not_a_link' };
  }
  if (asked.protocol !== 'https:' && asked.protocol !== 'http:') return { ok: false, why: 'bad_scheme' };
  /* Credentials in a link are never part of a share link to a song, and they
     are how a host is made to look like a different one. Refused rather than
     stripped: stripping would quietly turn somebody else's trick into a
     working request. */
  if (asked.username || asked.password) return { ok: false, why: 'not_supported' };
  const provider = providerFor(asked.hostname);
  if (!provider) return { ok: false, why: 'not_supported' };
  return { ok: true, provider, url: `${asked.protocol}//${asked.host}${asked.pathname}${asked.search}` };
}
