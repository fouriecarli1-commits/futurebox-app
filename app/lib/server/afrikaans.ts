/**
 * Afrikaans that is Afrikaans, and not Dutch.
 *
 * ── What she saw ─────────────────────────────────────────────────────────
 *
 * "die prompt in copilot is ook geneig om nederlands te prompt met afrikaanse
 *  goed."
 *
 * ── Why it happens ───────────────────────────────────────────────────────
 *
 * "Answer in Afrikaans" is not enough of an instruction. Afrikaans and Dutch
 * are close enough, and Dutch is common enough in training data, that a model
 * asked only for Afrikaans slides into Dutch-flavoured Afrikaans — `je` for
 * `jy`, `niet` for `nie`, `het` for `die`, a single negative where Afrikaans
 * uses two. To a South African it does not read as a translation error. It
 * reads as an app written by somebody who is not from here, which is the one
 * impression this product cannot afford.
 *
 * `app/api/help/route.ts` has asked for "plain South African Afrikaans rather
 * than Dutch-sounding formal Afrikaans" since it was written. Fifteen other
 * routes that write Afrikaans — the copilot, the songwriter, the campaign
 * copy, the podcast dialogue, the presenter's script — said only "in
 * Afrikaans". The good instruction existed in one place and was never applied
 * anywhere else.
 *
 * ── Why the markers are spelled out ──────────────────────────────────────
 *
 * "Do not write Dutch" is an instruction about a label. The pairs below are
 * about the words actually on the page, and the double negative is the single
 * strongest signal: Afrikaans closes a negated sentence with a second `nie`
 * and Dutch has nothing like it, so a model that gets that right is almost
 * never producing Dutch by accident.
 */
export const AFRIKAANS_RULE = [
  'When you write Afrikaans, write South African Afrikaans as it is actually spoken — not Dutch, and not Dutch-flavoured formal Afrikaans.',
  'Use jy and jou, never je, jij or jouw. Use die, never het. Use nie, never niet. Use baie, never veel or erg. Use is, never zijn. Use maak, never maken.',
  'Negate twice, the way Afrikaans does: "Ek weet nie daarvan nie", not "Ek weet niet daarvan".',
  'Plain and spoken, the way somebody talks in a car. Not academic, not churchy, and never a word a person would not say out loud.',
].join(' ');
