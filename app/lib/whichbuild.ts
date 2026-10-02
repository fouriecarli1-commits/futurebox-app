'use client';

import { SITE_HOST } from './brand';

/**
 * Which build of this app is on this phone.
 *
 * ── Why this had to exist ────────────────────────────────────────────────
 *
 * Carli has now reported the same list of five faults three times. Two of
 * them were fixed and pushed between the first report and the third, and
 * neither of us had any way to tell whether what she was looking at
 * contained the fix. So a repeat could mean the fix did not work, or it could
 * mean her phone was still holding yesterday's app — and those two need
 * completely different next moves.
 *
 * Every hour spent on the wrong one of those is an hour spent rewriting code
 * that was already right, which is most of what went wrong this week.
 *
 * ── What it is ───────────────────────────────────────────────────────────
 *
 * The commit the deploy was built from, baked in at build time by Vercel's
 * own variable, and the date it was built. Seven characters and a date: short
 * enough to read down a phone line, long enough to name one commit.
 *
 * `NEXT_PUBLIC_` because it is read in the browser, which is the whole point.
 * It is not a secret — the repository is the source of it and a commit id
 * says nothing the repository does not.
 *
 * ── And it is honest about not knowing ───────────────────────────────────
 *
 * Nothing is inferred. A local run has no Vercel variable and says so rather
 * than printing something that looks like an answer: "unknown" sends somebody
 * to check, and a made-up number sends them nowhere.
 */

/** The commit, short. Empty where nothing set it. */
export function builtFrom(): string {
  const sha = process.env.NEXT_PUBLIC_BUILD_SHA ?? '';
  return sha.slice(0, 7);
}

/** When it was built, as a plain date. Empty where nothing set it. */
export function builtAt(): string {
  return process.env.NEXT_PUBLIC_BUILT_AT ?? '';
}

/**
 * Which address this build thinks it is served from.
 *
 * ── Why this is on the screen and not only in a dashboard ────────────────
 *
 * `SITE_HOST` falls back to the Vercel address on purpose — a preview
 * deployment and a laptop genuinely are that, and a default claiming the real
 * domain would have every branch printing an address it is not served from.
 *
 * The cost of that correct default is that a PRODUCTION deploy with
 * `NEXT_PUBLIC_SITE_HOST` unset looks exactly like a working one. Every
 * canonical link, every sitemap entry and every Open Graph tag then points at
 * `futurebox-app.vercel.app` while the app answers on `futurebox.studio` — a
 * map to a place nobody is, with nothing on any screen to say so.
 *
 * `docs/GOING_LIVE.md` §2 says to set it once the domain is added. Whether it
 * WAS set is not something a check in this repository can know, because it is a
 * setting in somebody else's dashboard. So the app prints what it believes,
 * beside the build it belongs to, and a wrong answer is readable at a glance
 * instead of invisible until a shared link goes to the wrong place.
 */
export function builtFor(): string {
  return SITE_HOST;
}

/**
 * One line for a screen: which commit, when, and where it thinks it lives.
 *
 * Three facts and not two. Carli, 3 October 2026, looking at
 * `futurebox-app.vercel.app` in her own browser bar and asking whether anything
 * had been pushed at all: the commit answers that question, and the host
 * answers the one she had not asked yet.
 */
export function buildLine(): string {
  const sha = builtFrom();
  const when = builtAt();
  const where = builtFor();
  if (!sha && !when) return `plaaslik · local · ${where}`;
  return [sha || 'onbekend · unknown', when, where].filter(Boolean).join(' · ');
}
