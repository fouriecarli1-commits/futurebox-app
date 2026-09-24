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
 * Exactly the lessons `lib/server/songlink.ts` was written with — it is gone
 * with the link bar, and the lessons are not, because they
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

/**
 * A TikTok **live** link, and nothing else.
 *
 * ── Why the room's message box became this ───────────────────────────────
 *
 * Carli, 24 September 2026: *"Daai open chat moenie kan werk nie, as dit
 * werk moet daar net tiktok live links gedeel word."*
 *
 * The box took five hundred characters of anything. Free text in a room of
 * strangers is the one surface here whose audience is people rather than a
 * model, and it is the surface that needs the most watching and is the least
 * worth having: nobody came to FutureBox to chat. So the box stops being a
 * chat and becomes one thing — where you are live right now.
 *
 * ── What is actually being checked, said plainly ─────────────────────────
 *
 * The host, the path and the handle. Not the video. Nothing here can see
 * what is on the far end of a live stream, and a check that implied it could
 * would be the worst kind of reassurance.
 *
 * What it does buy:
 *
 * - The destination is TikTok Live, which has its own moderation, its own
 *   age rules and its own reporting — a far bigger apparatus than this app
 *   will ever have.
 * - `/live` in the path, so it is a stream and not a profile, a video or a
 *   shop page.
 * - The handle is words, and words can be screened before anybody reads them.
 *
 * ── Why a short link is refused ──────────────────────────────────────────
 *
 * `vm.tiktok.com/ZM8abc` is a real TikTok host and its path says nothing. It
 * could be a live stream, a video, or a profile, and the only way to find
 * out is to follow it — which means this app fetching an arbitrary redirect
 * on somebody else's say-so. Refused, with a sentence saying to use the full
 * address, which the browser shows while somebody is watching a stream.
 */
export type LiveRefusal = LinkRefusal | 'not_tiktok' | 'not_live' | 'shortened';

export function readTikTokLive(
  link: string,
): { ok: true; url: string; handle: string } | { ok: false; why: LiveRefusal } {
  const read = readPlatformLink(link);
  if (!read.ok) return { ok: false, why: read.why };
  if (read.platform !== 'TikTok') return { ok: false, why: 'not_tiktok' };

  const asked = new URL(read.url);
  const host = asked.hostname.toLowerCase().replace(/^www\./, '');
  if (host !== 'tiktok.com') return { ok: false, why: 'shortened' };

  /* `/@handle/live`, with nothing else allowed after it. A trailing slash is
     normal from a share sheet; a further segment is a different page. */
  const path = asked.pathname.replace(/\/+$/, '');
  const parts = path.split('/').filter(Boolean);
  if (parts.length !== 2 || parts[1].toLowerCase() !== 'live') {
    return { ok: false, why: 'not_live' };
  }
  const handle = parts[0];
  if (!/^@[A-Za-z0-9._]{1,24}$/.test(handle)) return { ok: false, why: 'not_live' };

  /* Rebuilt, and the query dropped. A live address needs no parameters, and
     the ones a share sheet adds are tracking that would be republished to
     everybody in the room under the sharer's name. */
  return { ok: true, url: `https://www.tiktok.com/${handle}/live`, handle };
}
