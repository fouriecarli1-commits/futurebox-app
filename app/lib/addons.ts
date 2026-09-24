/**
 * What used to be sold on top of a plan, and no longer is.
 *
 * ── Carli, 24 September 2026 ─────────────────────────────────────────────
 *
 * *"Ek dink dieselfde met advert, dit moenie 'n ekstra produk wees nie,
 * eerder dit monotise en krediete vra saam met die pakkette wat ons reeds
 * het. Te veel aankoop punte gaan mense afsit."*
 *
 * The marketing desk was R199 a month with its own checkout, its own Paystack
 * subscription and its own table of who had bought it. It is now part of
 * every paid plan, and what is made in it costs credits out of the same
 * wallet as a song — `CREDITS.marketPlan` and `CREDITS.adLines`. The door is
 * `paidRoom(request, 'market.desk')`.
 *
 * ── Why this file is not simply deleted ──────────────────────────────────
 *
 * Because the R199 was a real recurring subscription at Paystack, and one was
 * taken out. Deleting the plan code would not stop the charge — it would only
 * stop this app RECOGNISING it. The webhook's renewal branch has a comment
 * calling that line load-bearing, and it is: a renewal carries none of our
 * metadata, so an unrecognised R199 charge reads as "a plan renewed" and would
 * quietly set somebody's membership from whatever it is to whatever the
 * arrangement says.
 *
 * So the shelf is empty and nothing can be bought, while the id stays known
 * long enough for any charge still in flight to be recognised and ignored
 * rather than misread. It goes when the subscription at Paystack is cancelled
 * and the last renewal has passed.
 */

/** The marketing desk. No longer sold; kept so a stray renewal is legible. */
export const MARKETING = 'marketing';

/**
 * Empty, and that is the point: there is nothing to buy beside a plan.
 *
 * Two tills in this app, and only two — a plan, and a top-up when the plan's
 * credits run out. `check:sold` holds the cards against what is priced.
 */
export const ADDONS: readonly never[] = [];
