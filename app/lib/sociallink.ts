/**
 * The one way two people in a paired room reach each other.
 *
 * ── Why there is no chat ─────────────────────────────────────────────────
 *
 * Carli, 24 September 2026: *"Ek wonder oor kommunikasie en hoe hulle kan
 * kommunikeer. Ek dink nie ek wil 'n chat plek in sit nie. Dalk net die opsie
 * om 'n social link te kan share. Dan chat hulle maar op 'n ander platform."*
 *
 * That is the right call and not only for effort. A chat inside the app is a
 * surface with an audience of one stranger and no history: it needs
 * moderation, reporting, blocking, retention and a way to leave, and every
 * one of those is a thing to get wrong. Handing somebody your Instagram is
 * the same decision people already make, on a platform that has all of that
 * built.
 *
 * ── Three ways to give it, because she asked for all three ───────────────
 *
 * The seven the rest of the app already allows, plus Instagram and WhatsApp
 * because that is where people in South Africa actually talk, plus a handle
 * on its own with no clickable link at all.
 *
 * WhatsApp is different from the rest and the screen has to say so: a wa.me
 * address carries a **phone number**, which is a heavier thing to hand a
 * stranger than a profile name. It is allowed because she asked for it after
 * that was put to her; it is never the default, and the room prints the
 * warning beside it rather than in a policy page.
 */

import { PLATFORMS, readPlatformLink } from './server/platformlink';

/** The two this adds on top of the seven the room already takes. */
export const EXTRA_PLATFORMS: ReadonlyArray<{ readonly name: string; readonly hosts: readonly string[] }> = [
  { name: 'Instagram', hosts: ['instagram.com'] },
  { name: 'WhatsApp', hosts: ['wa.me', 'whatsapp.com'] },
];

/** Everything a shared link may point at, in one list. */
export const SHAREABLE = [...PLATFORMS, ...EXTRA_PLATFORMS] as const;

/** The platforms you may name when giving a handle rather than a link. */
export const HANDLE_PLATFORMS = SHAREABLE.map((one) => one.name);

/** A link carries a phone number rather than a profile name. */
export const CARRIES_A_NUMBER = 'WhatsApp';

export type ShareRefusal = 'empty' | 'not_a_link' | 'not_listed' | 'bad_handle' | 'bad_platform';

export interface Shared {
  /** Which platform, by name. Never what the sender called it. */
  readonly platform: string;
  /** The address, when one was given. Empty for a handle on its own. */
  readonly url: string;
  /** What to print: the handle, or the address with its host stripped. */
  readonly shown: string;
}

/**
 * A handle on its own: `@name` and a platform, and nothing clickable.
 *
 * The safest of the three and the one that asks the most of the other
 * person, which is the trade she wanted available rather than chosen for
 * her. Nothing is built into a URL here — if this returned
 * `instagram.com/<handle>` it would be a link wearing a handle's clothes,
 * and the whole point of the option is that there is nothing to press.
 */
export function readHandle(platform: string, handle: string): Shared | { ok: false; why: ShareRefusal } {
  const named = HANDLE_PLATFORMS.find((one) => one.toLowerCase() === platform.trim().toLowerCase());
  if (!named) return { ok: false, why: 'bad_platform' };
  const clean = handle.trim().replace(/^@+/, '');
  if (!/^[A-Za-z0-9._-]{1,30}$/.test(clean)) return { ok: false, why: 'bad_handle' };
  return { platform: named, url: '', shown: `@${clean}` };
}

/** A pasted address, checked down to one of the nine. */
export function readShareLink(link: string): Shared | { ok: false; why: ShareRefusal } {
  const asked = link.trim();
  if (!asked) return { ok: false, why: 'empty' };

  /* The seven go through the reader that already exists, so a host dressed
     up as another one is refused by the same code the room is judged on
     rather than by a second copy of that reasoning here. */
  const seven = readPlatformLink(asked);
  if (seven.ok) {
    return { platform: seven.platform, url: seven.url, shown: strip(seven.url) };
  }
  if (seven.why === 'not_a_link' || seven.why === 'bad_scheme') return { ok: false, why: 'not_a_link' };

  /* The two extras, read the same way: rebuilt from the URL's own parts, so
     `https://user:pass@instagram.com@evil.example/` cannot be approved as
     one host and followed to another. */
  let url: URL;
  try {
    url = new URL(asked);
  } catch {
    return { ok: false, why: 'not_a_link' };
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return { ok: false, why: 'not_a_link' };
  const host = url.hostname.toLowerCase().replace(/^www\./, '');
  for (const one of EXTRA_PLATFORMS) {
    for (const allowed of one.hosts) {
      if (host === allowed || host.endsWith(`.${allowed}`)) {
        const rebuilt = `${url.protocol}//${url.host}${url.pathname}`;
        return { platform: one.name, url: rebuilt, shown: strip(rebuilt) };
      }
    }
  }
  return { ok: false, why: 'not_listed' };
}

/** The address without its scheme or host, which is the part worth reading. */
function strip(url: string): string {
  return url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
}
