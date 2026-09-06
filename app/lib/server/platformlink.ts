/**
 * The platforms a link in this app may point at.
 *
 * ── Why there is a list at all ───────────────────────────────────────────
 *
 *   "mense mag net toegang hê om tiktok links te post … Jy moet hierdie kan
 *    toets dat dit nie snaakse content deel nie."
 *   "youtube, tiktok, facebook, vimeo, spotify, apple music, soundcloud,
 *    alles sal kan connect."
 *
 * The room used to take any `https://` address at all. That is not a link
 * field, it is a place to publish a URL of your choosing to everybody in the
 * room, and the only thing between it and wherever somebody wanted to send
 * people was the scheme.
 *
 * Seven sites rather than one is a wider door, not a different one. What the
 * list buys is unchanged: it does not make what is on the far end good — all
 * seven are full of things nobody here would choose — but it means a link in
 * this room goes to a platform with its own moderation and its own reporting
 * rather than to an arbitrary server. That is the difference between "we
 * cannot say where this goes" and "it goes to YouTube", and it is the honest
 * version of what this feature can promise.
 *
 * ── What this cannot do, said plainly ────────────────────────────────────
 *
 * It cannot tell whether a video is decent. Nothing on this side can:
 * checking would mean fetching and watching it. What it guarantees is the
 * destination, and the room says so where somebody is about to press a link,
 * rather than implying the content has been vetted.
 *
 * ── The matching, which is where this kind of gate fails ─────────────────
 *
 * Exactly the lessons `lib/server/songlink.ts` was written with, because they
 * were learned the same way: an exact host or a real subdomain, never a
 * substring; credentials refused rather than stripped; https only. Every one
 * of those is one character away from a hole and every one of them is in
 * `scripts/check-platformlink.mts`.
 */

/**
 * The seven, and the hosts each of them actually serves from.
 *
 * The short-link hosts matter more than they look: `youtu.be`, `vm.tiktok.com`
 * and `fb.watch` are what a phone's share sheet produces, so they are what
 * people will paste. Matching is on the base domain and any real subdomain of
 * it, which covers `music.youtube.com` and `m.facebook.com` without naming
 * every one.
 *
 * A shortener that is not the platform's own — bit.ly, t.co — is refused. It
 * is a link to a link, and the whole point of this is knowing where somebody
 * is being sent.
 */
export const PLATFORMS: ReadonlyArray<{ readonly name: string; readonly hosts: readonly string[] }> = [
  { name: 'YouTube', hosts: ['youtube.com', 'youtu.be'] },
  { name: 'TikTok', hosts: ['tiktok.com'] },
  { name: 'Facebook', hosts: ['facebook.com', 'fb.watch', 'fb.com'] },
  { name: 'Vimeo', hosts: ['vimeo.com'] },
  { name: 'Spotify', hosts: ['spotify.com'] },
  { name: 'Apple Music', hosts: ['music.apple.com'] },
  { name: 'SoundCloud', hosts: ['soundcloud.com'] },
];

export type LinkRefusal = 'not_a_link' | 'bad_scheme' | 'not_listed';

/** Which platform a host belongs to, or null. */
export function platformFor(host: string): string | null {
  const clean = host.toLowerCase().replace(/^www\./, '');
  for (const one of PLATFORMS) {
    for (const allowed of one.hosts) {
      if (clean === allowed || clean.endsWith(`.${allowed}`)) return one.name;
    }
  }
  return null;
}

/**
 * A pasted link, checked all the way down to one of the seven.
 *
 * The URL is rebuilt from its own parts rather than passed through as typed:
 * `https://user:pass@tiktok.com@evil.example/` parses with a hostname of
 * `evil.example` in some readers and `tiktok.com` in others, and the one
 * thing this must never do is disagree with itself about which host it
 * approved.
 */
export function readPlatformLink(
  link: string,
): { ok: true; url: string; platform: string } | { ok: false; why: LinkRefusal } {
  let asked: URL;
  try {
    asked = new URL(link.trim());
  } catch {
    return { ok: false, why: 'not_a_link' };
  }
  /* https only, and not http: this link is shown to everybody in the room and
     handed to a browser. A downgrade to http is a link somebody on the same
     network can rewrite on its way to them. */
  if (asked.protocol !== 'https:') return { ok: false, why: 'bad_scheme' };
  /* Credentials in a link are never part of a share link to a video, and they
     are how a host is made to look like a different one. Refused rather than
     stripped: stripping would quietly turn somebody else's trick into a
     working post. */
  if (asked.username || asked.password) return { ok: false, why: 'not_listed' };
  const platform = platformFor(asked.hostname);
  if (!platform) return { ok: false, why: 'not_listed' };
  /* The fragment is dropped. It is never part of a share link, it is never
     sent to their server, and it is somewhere to hide a payload aimed at
     whatever reads the link next. */
  return { ok: true, platform, url: `${asked.protocol}//${asked.host}${asked.pathname}${asked.search}` };
}
