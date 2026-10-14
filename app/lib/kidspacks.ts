/**
 * The kids room's own prices: credits for the kids room and nowhere else.
 *
 * Carli, 14 October 2026: *"In die pricing page moet die kids room ook 'n
 * aparte prys hê."* And on the three suggested: *"Prys voorstelle is reg vir
 * kids studio. Moet net nie die family ding sê nie, ek dink ons app kan op
 * enige device oop maak, en sodra credits op raak is dit hulle saak."*
 *
 * So the third pack is simply the bigger one. Nothing here counts children
 * or devices: the credits are the account's kids balance, opened on
 * whatever device the grown-up hands over.
 *
 * ── Why these numbers ────────────────────────────────────────────────────
 *
 * A kids credit sells at R1.70–R1.97. At the kids room's own prices (a song
 * 8, a video 9, a story 15, a picture 6) the two dearest things to make, a
 * video and a story, still keep 44–55% after the supplier, and songs and
 * pictures 80–90%. Worked out on the margins page published 14 October.
 *
 * The monthly two are Paystack subscriptions, like the plans: each needs a
 * plan made in her Paystack dashboard at exactly this price, and its code
 * in `PAYSTACK_PLAN_KIDS_MONTH` / `PAYSTACK_PLAN_KIDS_PLUS`. Until a code is
 * there the till refuses that pack with a sentence rather than selling a
 * "monthly" that charges once.
 *
 * The webhook reads how many credits a pack holds from here, never from the
 * payment, so a charge can say which pack it was and not how big.
 */

export type KidsPackId = 'kids-try' | 'kids-month' | 'kids-plus';

export interface KidsPack {
  readonly id: KidsPackId;
  readonly rand: number;
  readonly credits: number;
  /** A Paystack subscription that renews every month, or a single payment. */
  readonly monthly: boolean;
  /** The one the price card lights. */
  readonly pick?: boolean;
  readonly name: readonly [string, string];
  /** What it buys, in the kids room's own prices, for the card to say. */
  readonly buys: readonly [string, string];
}

export const KIDS_PACKS: readonly KidsPack[] = [
  {
    id: 'kids-try',
    rand: 59,
    credits: 30,
    monthly: false,
    name: ['Kids Try', 'Kids Probeer'],
    buys: ['About 3 songs and a picture', 'Omtrent 3 liedjies en ’n prent'],
  },
  {
    id: 'kids-month',
    rand: 119,
    credits: 65,
    monthly: true,
    pick: true,
    name: ['Kids Monthly', 'Kids Maandeliks'],
    buys: ['About 4 songs, 2 videos and a story', 'Omtrent 4 liedjies, 2 video’s en ’n storie'],
  },
  {
    id: 'kids-plus',
    rand: 229,
    credits: 135,
    monthly: true,
    name: ['Kids Plus', 'Kids Plus'],
    buys: ['About 9 songs, 4 videos, a story and 2 pictures', 'Omtrent 9 liedjies, 4 video’s, ’n storie en 2 prente'],
  },
];

export function kidsPackById(id: unknown): KidsPack | null {
  return KIDS_PACKS.find((one) => one.id === id) ?? null;
}
