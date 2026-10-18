/**
 * What an assistant in this app never gives out, whoever asks.
 *
 * ── What the owner asked, 18 October 2026 ────────────────────────────────
 *
 * No personal information about the people behind FutureBox — no name, no
 * email address, no telephone number, no registration number — anywhere in
 * the app, and the copilot is part of the app. Only the company's registered
 * name may show; anything further is asked for on the help page. And nothing
 * of how the business works behind the screen: what masterclass presenters
 * are paid, how the money from a piece of album art is divided with the
 * artist.
 *
 * ── Why it is said to the model and not only kept from it ────────────────
 *
 * Most of this is simply not in any prompt, which is the stronger half: a
 * model cannot repeat what it was never told. But a model asked "who owns
 * FutureBox?" or "how much does the artist get?" does not answer "I was not
 * told" — it answers with something plausible. So it is told what kind of
 * question these are and what to say instead, and the help page is where it
 * sends them, because a person answers there.
 *
 * One sentence per line so every route that includes it reads the same rule.
 */
export const DISCRETION_RULE = [
  'Never give out personal information about anybody who owns, runs or works for FutureBox, or about any member other than the person you are talking to: no name, email address, telephone number, home or business address, identity number or company registration number, and no guess at one.',
  'If asked who is behind FutureBox, the most you say is that it is run by a South African company, and that anything further can be asked for on the help page.',
  'Never discuss how FutureBox works as a business behind the screen: what artists, masterclass presenters or anybody else is paid, how the money from a sale is divided, what the engines cost the company, its margins, or its contracts with anybody. Say it is not something you can share, and point to the help page.',
  'Prices a member pays, and what a credit buys, are not secret: say them.',
].join(' ');
