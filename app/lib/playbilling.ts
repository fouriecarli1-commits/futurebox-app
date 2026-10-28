/**
 * Paying through Google Play, when the app is the one from the Play Store.
 *
 * The owner, 14 October 2026: *"Wanneer ek die app op die playstore gaan sit gaan
 * ek paystack afhaal en werk met die playstore se paying system."*
 *
 * The Android app is this website inside a Trusted Web Activity
 * (`docs/PLAY-STORE.md`). Chrome gives a TWA two things a browser tab does
 * not have: `getDigitalGoodsService`, which talks to Play Billing, and a
 * Payment Request method that opens Play's own payment sheet. So the same
 * buy buttons work in both places, and only where the money goes changes:
 *
 *   on the website     `/api/checkout` → Paystack, exactly as before
 *   in the Play app    Play's sheet → `/api/play`, which asks Google
 *
 * ── How the Play app is recognised ──────────────────────────────────────
 *
 * A TWA opens the site with `document.referrer` set to
 * `android-app://<package>/`. That is noted for the rest of the session in
 * `sessionStorage` — per tab, so the same site opened in ordinary Chrome on
 * the same phone is never mistaken for the app and keeps Paystack.
 *
 * Inside the Play app, Paystack is never offered. If Play's billing cannot be
 * reached the member is told so; sending them to a card form instead would be
 * exactly what gets an app removed from Play.
 */

import { accessToken } from './cloud';
import { useEffect, useState } from 'react';
import { PLAY_PRODUCTS, skuFor, type CheckoutWant } from './playproducts';

const PLAY = 'https://play.google.com/billing';
const MARK = 'fb-play-app';

interface DigitalGoodsService {
  listPurchases(): Promise<{ itemId: string; purchaseToken: string }[]>;
  getDetails?(itemIds: string[]): Promise<{ itemId: string; price: { currency: string; value: string } }[]>;
}

type WithGoods = Window & { getDigitalGoodsService?: (method: string) => Promise<DigitalGoodsService> };

/** Notes, once per session, that this tab was opened by the Android app. */
function note(): void {
  if (typeof window === 'undefined') return;
  try {
    if (document.referrer.startsWith('android-app://')) sessionStorage.setItem(MARK, '1');
  } catch {
    /* Storage refused (a private window): the referrer is still read below. */
  }
}
note();

/** Whether this page is the Play Store app rather than a browser tab. */
export function inPlayApp(): boolean {
  if (typeof window === 'undefined') return false;
  if (document.referrer.startsWith('android-app://')) return true;
  try {
    return sessionStorage.getItem(MARK) === '1';
  } catch {
    return false;
  }
}

async function service(): Promise<DigitalGoodsService | null> {
  const ask = (window as WithGoods).getDigitalGoodsService;
  if (!ask) return null;
  try {
    return await ask.call(window, PLAY);
  } catch {
    return null;
  }
}

async function post(body: Record<string, unknown>): Promise<{ status: number; said: Record<string, unknown> }> {
  const token = await accessToken();
  const response = await fetch('/api/play', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });
  const said = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  return { status: response.status, said };
}

const SAY = {
  notSold: 'That is not sold in the Android app.',
  noBilling: 'Google Play billing could not be opened. Update the app and Chrome from the Play Store, then try again.',
  cancelled: 'Payment cancelled — nothing was charged.',
  unreachable: 'Could not reach the payment service.',
} as const;

/**
 * Buys something through Play's sheet and has the server grant it.
 *
 * Returns null when it went through, or a sentence saying why not — the
 * same contract as `startCheckout`, so a button needs no second code path.
 * `back` is where the page goes afterwards, as Paystack's return does.
 */
export async function buyOnPlay(want: CheckoutWant, back = '/?paid=1'): Promise<string | null> {
  const sku = skuFor(want);
  if (!sku) return SAY.notSold;
  /* No token check here: signed out, the server's answer to the first step
     is a 401 with the sentence to show, which is how every other press in
     this app learns it — the page does not decide who is signed in. */
  const goods = await service();
  if (!goods || typeof PaymentRequest === 'undefined') return SAY.noBilling;

  try {
    /* The same rules the website's till keeps, asked before money moves. */
    const may = await post({ step: 'may', sku });
    if (may.status !== 200) return typeof may.said.message === 'string' ? may.said.message : SAY.unreachable;

    /* The total is a placeholder Play ignores — the price is the one set on
       the product in the Play Console, and Play's sheet shows it. */
    const request = new PaymentRequest(
      [{ supportedMethods: PLAY, data: { sku } }],
      { total: { label: 'Total', amount: { currency: 'ZAR', value: '0' } } },
    );
    let response: PaymentResponse;
    try {
      response = await request.show();
    } catch {
      return SAY.cancelled;
    }
    const token = (response.details as { purchaseToken?: string } | undefined)?.purchaseToken ?? '';
    const paid = await post({ step: 'paid', sku, token });
    await response.complete(paid.status === 200 ? 'success' : 'fail').catch(() => undefined);
    if (paid.status === 202) return typeof paid.said.message === 'string' ? paid.said.message : null;
    if (paid.status !== 200) return typeof paid.said.message === 'string' ? paid.said.message : SAY.unreachable;
    window.location.href = back;
    return null;
  } catch {
    return SAY.unreachable;
  }
}

/**
 * Hands the server any Play purchase it has not finished with.
 *
 * Run once a session when the Play app starts. A purchase whose `paid` step
 * never arrived — the phone lost signal, the app was closed on Play's sheet,
 * a cash payment cleared days later — is still listed by Play until it is
 * consumed or acknowledged, and this delivers it. The server grants each
 * order once however often it is shown the same token.
 */
export async function resumePlayPurchases(): Promise<void> {
  if (!inPlayApp()) return;
  try {
    if (sessionStorage.getItem(`${MARK}-resumed`) === '1') return;
    sessionStorage.setItem(`${MARK}-resumed`, '1');
  } catch {
    /* Without storage it runs once per page load, which is still fine. */
  }
  if (!(await accessToken())) return;
  const goods = await service();
  if (!goods) return;
  const open = await goods.listPurchases().catch(() => []);
  for (const one of open) {
    await post({ step: 'paid', sku: one.itemId, token: one.purchaseToken }).catch(() => undefined);
  }
}

/** Whether the Play till is switched on at the server, for the pricing screen. */
export async function playAvailable(): Promise<boolean> {
  try {
    const response = await fetch('/api/play');
    if (!response.ok) return false;
    const said = (await response.json()) as { available?: boolean };
    return Boolean(said.available);
  } catch {
    return false;
  }
}

/* ── Play's own prices, shown in the Play app ──────────────────────────────
   The owner sets them in the Play Console, higher than the website's because
   Google keeps VAT and its fee (`PLAY_TIER_CREDITS`). A card that says R149
   above a payment sheet that says R199 is a price that changed at the till,
   so in the Play app every card shows what Play will charge. */
function shown(price: { currency: string; value: string }): string {
  const amount = Number(price.value);
  if (!Number.isFinite(amount)) return `${price.currency} ${price.value}`;
  if (price.currency === 'ZAR') return `R${Number.isInteger(amount) ? amount : amount.toFixed(2)}`;
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: price.currency }).format(amount);
  } catch {
    return `${price.currency} ${amount}`;
  }
}

let pricesAsked: Promise<ReadonlyMap<string, string>> | null = null;

/** What Play charges for each product, by its id; empty outside the Play app. */
export function playPrices(): Promise<ReadonlyMap<string, string>> {
  if (!inPlayApp()) return Promise.resolve(new Map());
  pricesAsked ??= (async () => {
    const goods = await service();
    if (!goods?.getDetails) return new Map();
    try {
      const got = await goods.getDetails(PLAY_PRODUCTS.map((one) => one.sku));
      return new Map(got.map((one) => [one.itemId, shown(one.price)]));
    } catch {
      return new Map();
    }
  })();
  return pricesAsked;
}

/** Play's prices, once known, and whether this is the Play app at all. */
export function usePlayPrices(): { readonly play: boolean; readonly prices: ReadonlyMap<string, string> } {
  const [said, setSaid] = useState<{ play: boolean; prices: ReadonlyMap<string, string> }>({ play: false, prices: new Map() });
  useEffect(() => {
    if (!inPlayApp()) return undefined;
    let alive = true;
    setSaid({ play: true, prices: new Map() });
    void playPrices().then((prices) => { if (alive) setSaid({ play: true, prices }); });
    return () => { alive = false; };
  }, []);
  return said;
}

/** The price to show for something sold: Play's own in the Play app, the website's otherwise. */
export function priceShown(prices: ReadonlyMap<string, string>, want: CheckoutWant, website: string): string {
  const sku = skuFor(want);
  return (sku && prices.get(sku)) || website;
}
