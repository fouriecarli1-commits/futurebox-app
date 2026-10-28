/**
 * What can be bought inside the Play Store app, and what each one grants.
 *
 * The owner, 14 October 2026: *"Wanneer ek die app op die playstore gaan sit gaan
 * ek paystack afhaal en werk met die playstore se paying system."* Google's
 * rule is that credits and plans bought inside an app from Play go through
 * Play's own billing. On the website nothing changes — Paystack, as before.
 *
 * ── The product ids are hers to type into the Play Console ───────────────
 *
 * Each `sku` below is a product she creates in the Play Console, with exactly
 * this id, at the price she chooses there. The id is the whole contract: the
 * app asks Play for `credits_small`, Play charges what the Console says, and
 * the server grants what THIS table says `credits_small` is — never what the
 * phone says. `docs/PLAY-STORE.md` lists them in the order she types them.
 *
 * Subscriptions are the three plans and the two monthly kids packs; the rest
 * are consumables, which Play lets somebody buy again once the server has
 * consumed the last one.
 *
 * Album art is not here. A piece is an auction at a price its artist named,
 * which is not a product with a fixed price in a console, so it is not sold
 * inside the Play app at all. The app says so plainly and does not point
 * anywhere else to pay: Play's rules forbid steering a buyer out of the app
 * to a cheaper till, and breaking that gets an app removed, not warned.
 */

import type { Tier } from './plans';

export type PlayGrant =
  | { readonly kind: 'plan'; readonly tier: Exclude<Tier, 'free'> }
  | { readonly kind: 'credits'; readonly pack: string }
  | { readonly kind: 'kids'; readonly pack: string };

export interface PlayProduct {
  readonly sku: string;
  /** A subscription renews monthly at Play; a consumable is bought once each time. */
  readonly type: 'subscription' | 'consumable';
  readonly grants: PlayGrant;
}

export const PLAY_PRODUCTS: readonly PlayProduct[] = [
  { sku: 'maker_monthly', type: 'subscription', grants: { kind: 'plan', tier: 'maker' } },
  { sku: 'studio_monthly', type: 'subscription', grants: { kind: 'plan', tier: 'studio' } },
  { sku: 'label_monthly', type: 'subscription', grants: { kind: 'plan', tier: 'label' } },
  { sku: 'credits_small', type: 'consumable', grants: { kind: 'credits', pack: 'small' } },
  { sku: 'credits_mid', type: 'consumable', grants: { kind: 'credits', pack: 'mid' } },
  { sku: 'credits_large', type: 'consumable', grants: { kind: 'credits', pack: 'large' } },
  { sku: 'kids_try', type: 'consumable', grants: { kind: 'kids', pack: 'kids-try' } },
  { sku: 'kids_month', type: 'subscription', grants: { kind: 'kids', pack: 'kids-month' } },
  { sku: 'kids_plus', type: 'subscription', grants: { kind: 'kids', pack: 'kids-plus' } },
];

export function productBySku(sku: unknown): PlayProduct | null {
  return PLAY_PRODUCTS.find((one) => one.sku === sku) ?? null;
}

/** What somebody pressed, as the browser describes it. */
export type CheckoutWant =
  | { readonly kind: 'plan'; readonly tier: string }
  | { readonly kind: 'credits'; readonly pack: string }
  | { readonly kind: 'kids'; readonly pack: string }
  | { readonly kind: string; readonly [key: string]: unknown };

/** The Play product for a press, or null for one Play does not sell. */
export function skuFor(want: CheckoutWant): string | null {
  const found = PLAY_PRODUCTS.find((one) => {
    if (one.grants.kind !== want.kind) return false;
    if (one.grants.kind === 'plan') return one.grants.tier === (want as { tier?: unknown }).tier;
    return one.grants.pack === (want as { pack?: unknown }).pack;
  });
  return found?.sku ?? null;
}

/** Where a member manages a Play subscription — Play's own page, never ours. */
export function playManageUrl(sku: string, pkg: string): string {
  return `https://play.google.com/store/account/subscriptions?sku=${encodeURIComponent(sku)}&package=${encodeURIComponent(pkg)}`;
}

/**
 * The monthly credits a plan carries when it was bought through Play, where
 * it differs from the website. The owner, 28 October 2026: Label stays R899
 * in the Play Store, and its credits come down instead. Google keeps the VAT
 * it pays SARS and its 15% (`docs/PLAY-STORE.md`), so R899 brings in about
 * R664 rather than the website's R866, and 450 credits keeps each one worth
 * the same R1.45 the website's 599 are. Maker and Studio are priced higher
 * in Play instead and keep their credits.
 */
export const PLAY_TIER_CREDITS: Readonly<Partial<Record<Exclude<Tier, 'free'>, number>>> = { label: 450 };

/** The plan lines that change in the Play app, by tier and line. */
const PLAY_LINES: Readonly<Record<string, readonly number[]>> = { label: [0, 7] };

/** The words key for one of a plan's lines, as the Play app or the website says it. */
export function planLineKey(tier: string, line: number, play: boolean): string {
  return play && PLAY_LINES[tier]?.includes(line) ? `plan.${tier}.play.${line}` : `plan.${tier}.inc.${line}`;
}

/** A membership granted from a Play purchase: its reference says so. */
export function viaPlay(reference: unknown): boolean {
  return typeof reference === 'string' && reference.startsWith('play:');
}
