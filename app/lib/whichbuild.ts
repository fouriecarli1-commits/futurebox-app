'use client';

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

/** One line for a screen, in both languages' one shared shape: id and date. */
export function buildLine(): string {
  const sha = builtFrom();
  const when = builtAt();
  if (!sha && !when) return 'plaaslik · local';
  return [sha || 'onbekend · unknown', when].filter(Boolean).join(' · ');
}
