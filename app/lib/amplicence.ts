/**
 * Who made a capture, and what somebody is allowed to do with a song made
 * through it.
 *
 * ── The question, and who asked it ───────────────────────────────────────
 *
 * Carli, 7 October 2026: *"Didn't Tone3000 give us permission if we add their
 * name on products? That is how I understood it."*
 *
 * Partly, and the part that is not is the part that matters. Every tone on
 * TONE3000 carries one of eight licences — `docs/TONE3000-API.md` records the
 * set — and they do not say the same thing:
 *
 *   · `cc0` is "do what you like, no credit needed".
 *   · `cc-by` and `cc-by-sa` are exactly what she understood: use it freely,
 *     name the person who made it.
 *   · **Three of them are NonCommercial.** FutureBox is a paid product and
 *     some of its members sell what they make, and no amount of crediting
 *     makes a NonCommercial licence permit that.
 *   · **Two are NoDerivatives.**
 *   · `t3k` is TONE3000's own, and what it says is theirs to tell us.
 *
 * And the credit goes to the MAKER, not to TONE3000. `cc-by` says "attribute
 * the person who made this", and a line on a product saying "TONE3000" does
 * not do that.
 *
 * ── Why this exists before the integration does ──────────────────────────
 *
 * Because the shelf already exists. `lib/amps.ts` takes a capture off her
 * phone today — one she downloaded from anywhere — and it stored a name and
 * nothing else, so nothing in the app could tell a `cc-by` capture from a
 * `cc-by-nc` one. The licence has to travel WITH the capture from the moment
 * it arrives, because the question it answers is asked much later: when
 * somebody sells the song.
 *
 * The file itself does not carry it. A NAM capture has a name, the gear and
 * often `modeled_by`, and no licence field at all — so the maker is read and
 * the licence is asked, once, when it comes in.
 *
 * ── What this file does NOT do ───────────────────────────────────────────
 *
 * It does not stop anything. Nothing here is a lock, and a lock would be the
 * wrong shape anyway: whether a particular song may be sold depends on what
 * was used to make it and what is being sold, which is a question for the
 * person selling it. What it does is make the answer KNOWABLE — stored,
 * shown, and said plainly where it matters — instead of a thing nobody
 * recorded and nobody can reconstruct.
 */

/** The eight TONE3000 licences, and a ninth for a capture of one's own. */
export const LICENCES = [
  {
    id: 'mine',
    name: ['amp.licMine', 'I made this capture'],
    credit: false,
    commercial: true,
    changes: true,
  },
  {
    id: 'cc0',
    name: ['amp.licCc0', 'CC0 — public domain'],
    credit: false,
    commercial: true,
    changes: true,
  },
  {
    id: 'cc-by',
    name: ['amp.licBy', 'CC BY — credit the maker'],
    credit: true,
    commercial: true,
    changes: true,
  },
  {
    id: 'cc-by-sa',
    name: ['amp.licBySa', 'CC BY-SA — credit, share alike'],
    credit: true,
    commercial: true,
    changes: true,
  },
  {
    id: 'cc-by-nd',
    name: ['amp.licByNd', 'CC BY-ND — credit, no changes'],
    credit: true,
    commercial: true,
    changes: false,
  },
  {
    id: 'cc-by-nc',
    name: ['amp.licByNc', 'CC BY-NC — not for selling'],
    credit: true,
    commercial: false,
    changes: true,
  },
  {
    id: 'cc-by-nc-sa',
    name: ['amp.licByNcSa', 'CC BY-NC-SA — not for selling'],
    credit: true,
    commercial: false,
    changes: true,
  },
  {
    id: 'cc-by-nc-nd',
    name: ['amp.licByNcNd', 'CC BY-NC-ND — not for selling, no changes'],
    credit: true,
    commercial: false,
    changes: false,
  },
  {
    /* Theirs, and what it permits is theirs to tell us. Treated as the
       cautious answer until they do — which is the safe direction to be
       wrong in, and is the one being asked about in `docs/EPOS-TONE3000.md`. */
    id: 't3k',
    name: ['amp.licT3k', 'TONE3000 licence'],
    credit: true,
    commercial: false,
    changes: true,
  },
  {
    /* The honest default. Somebody who does not know what a capture came
       under has not got permission to sell through it; they have got a
       capture and a question. */
    id: 'unknown',
    name: ['amp.licUnknown', 'I do not know'],
    credit: true,
    commercial: false,
    changes: true,
  },
] as const;

export type LicenceId = (typeof LICENCES)[number]['id'];

export const licenceOf = (id: string | undefined): (typeof LICENCES)[number] =>
  LICENCES.find((one) => one.id === id) ?? LICENCES[LICENCES.length - 1];

/** The cautious answer, which is what a capture gets until somebody says. */
export const UNKNOWN: LicenceId = 'unknown';

/** May a song made through this capture be sold? */
export const mayBeSold = (id: string | undefined): boolean => licenceOf(id).commercial;

/** Must the maker be named wherever it is used? */
export const needsCredit = (id: string | undefined): boolean => licenceOf(id).credit;

/**
 * The line to print beside a song, or `null` when nothing is owed.
 *
 * The maker and not the site, because that is what the licence asks for. A
 * capture with no maker recorded still prints the licence, because "CC BY"
 * with nobody named is a visible hole rather than a silent one.
 */
export function creditLine(
  maker: string | undefined,
  licence: string | undefined,
): string | null {
  if (!needsCredit(licence)) return null;
  const which = licenceOf(licence);
  const who = (maker ?? '').trim();
  return who ? `${who} (${which.id})` : which.id;
}

/** Every capture used in a piece of work, as one line, with none repeated. */
export function creditsFor(
  used: readonly { readonly maker?: string; readonly licence?: string }[],
): string {
  const lines = new Set<string>();
  for (const one of used) {
    const line = creditLine(one.maker, one.licence);
    if (line) lines.add(line);
  }
  return [...lines].join(' · ');
}
