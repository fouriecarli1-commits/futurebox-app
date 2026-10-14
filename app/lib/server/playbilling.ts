/**
 * Asking Google whether a Play purchase is real, and granting what it bought.
 *
 * Carli, 14 October 2026: *"Wanneer ek die app op die playstore gaan sit gaan
 * ek paystack afhaal en werk met die playstore se paying system."*
 *
 * ── The one rule ─────────────────────────────────────────────────────────
 *
 * The phone's word is never a receipt. The Android app hands us a purchase
 * token after Play's sheet closes, and the ONLY thing that turns that into
 * credits or a plan is Google's own answer to "what is this token?", asked
 * from here with the app's service account. The same rule the Paystack
 * webhook keeps for the website: a page that can grant itself an unlock is a
 * page that will.
 *
 * ── What it needs, all from the environment ──────────────────────────────
 *
 *   ANDROID_PACKAGE               the app id, already used by asset links
 *   GOOGLE_PLAY_SERVICE_ACCOUNT   the service account's JSON key, as it
 *                                 downloads (or base64 of it); the account
 *                                 is invited in the Play Console with
 *                                 "View financial data" and "Manage orders"
 *   PLAY_NOTIFY_SECRET               a long random string; the end of the
 *                                 Pub/Sub push address, see `api/play/notify`
 *
 * Without the first two every Play route answers 503 with a reason, the way
 * every other service in this app does, and nothing is granted.
 */

import crypto from 'node:crypto';
import { admin } from './account';
import { topUp } from './credits';
import { kidsWalletAdd } from './kidsmode';
import { wrote } from './wrote';
import { packById } from '../credits';
import { kidsPackById } from '../kidspacks';
import { PLAY_PRODUCTS, type PlayProduct } from '../playproducts';

const SCOPE = 'https://www.googleapis.com/auth/androidpublisher';
const API = 'https://androidpublisher.googleapis.com/androidpublisher/v3/applications';

interface ServiceAccount {
  readonly client_email: string;
  readonly private_key: string;
  readonly token_uri?: string;
}

/** The service account, read from the environment, or null when it is not set. */
function account(): ServiceAccount | null {
  const raw = (process.env.GOOGLE_PLAY_SERVICE_ACCOUNT ?? '').trim();
  if (!raw) return null;
  const text = raw.startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8');
  try {
    const parsed = JSON.parse(text) as Partial<ServiceAccount>;
    if (!parsed.client_email || !parsed.private_key) return null;
    return { client_email: parsed.client_email, private_key: parsed.private_key, token_uri: parsed.token_uri };
  } catch {
    return null;
  }
}

export function packageName(): string {
  return (process.env.ANDROID_PACKAGE ?? '').trim();
}

/** Whether Play purchases can be checked at all on this deployment. */
export function playReady(): boolean {
  return Boolean(account() && packageName());
}

const b64url = (data: Buffer | string): string =>
  Buffer.from(data).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');

let cached: { token: string; until: number } | null = null;

/**
 * An access token for the Play Developer API.
 *
 * A JWT signed with the service account's own key and traded at Google's
 * token address — the documented server-to-server flow, done with `crypto`
 * rather than a library, because this is the only place the app needs it.
 * Kept until a minute before it lapses.
 */
async function googleToken(): Promise<string | null> {
  const sa = account();
  if (!sa) return null;
  if (cached && cached.until > Date.now() + 60_000) return cached.token;
  const aud = sa.token_uri || 'https://oauth2.googleapis.com/token';
  const now = Math.floor(Date.now() / 1000);
  const head = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = b64url(JSON.stringify({ iss: sa.client_email, scope: SCOPE, aud, iat: now, exp: now + 3600 }));
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(`${head}.${claims}`);
  const signature = b64url(signer.sign(sa.private_key));
  const response = await fetch(aud, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${head}.${claims}.${signature}`,
    }),
  }).catch(() => null);
  if (!response?.ok) return null;
  const said = (await response.json().catch(() => null)) as { access_token?: string; expires_in?: number } | null;
  if (!said?.access_token) return null;
  cached = { token: said.access_token, until: Date.now() + (said.expires_in ?? 3600) * 1000 };
  return said.access_token;
}

type Asked<T> = { ok: true; data: T } | { ok: false; status: number; message: string };

async function ask<T>(path: string, method: 'GET' | 'POST' = 'GET'): Promise<Asked<T>> {
  const token = await googleToken();
  if (!token) return { ok: false, status: 503, message: 'Google Play could not be reached with this app’s key.' };
  const response = await fetch(`${API}/${encodeURIComponent(packageName())}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, ...(method === 'POST' ? { 'Content-Type': 'application/json' } : {}) },
    ...(method === 'POST' ? { body: '{}' } : {}),
  }).catch(() => null);
  if (!response) return { ok: false, status: 502, message: 'Google Play did not answer.' };
  if (!response.ok) {
    const said = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
    return { ok: false, status: response.status, message: said?.error?.message ?? `Google Play answered ${response.status}.` };
  }
  const text = await response.text();
  return { ok: true, data: (text ? JSON.parse(text) : {}) as T };
}

/** What Google says about a purchase, reduced to what a grant needs. */
export interface Checked {
  /** Paid for and standing: a one-time purchase in state PURCHASED, or an active subscription. */
  readonly paid: boolean;
  /** Google's order id — the reference a grant is filed under, so it happens once. */
  readonly order: string;
  readonly state: string;
  readonly acknowledged: boolean;
  /** When a subscription's paid period ends. */
  readonly expires: string | null;
  /** The token this one replaced, for an upgrade or a re-subscribe. */
  readonly linked: string | null;
  /** For a subscription, which product Google says this token is for. */
  readonly sku: string | null;
}

interface ProductPurchase {
  purchaseState?: number;
  consumptionState?: number;
  acknowledgementState?: number;
  orderId?: string;
}

interface SubscriptionPurchaseV2 {
  subscriptionState?: string;
  acknowledgementState?: string;
  latestOrderId?: string;
  linkedPurchaseToken?: string;
  lineItems?: { productId?: string; expiryTime?: string; latestSuccessfulOrderId?: string }[];
}

/** Asks Google about one purchase token for one product. */
export async function checkPurchase(product: PlayProduct, token: string): Promise<Asked<Checked>> {
  if (product.type === 'consumable') {
    const got = await ask<ProductPurchase>(`/purchases/products/${encodeURIComponent(product.sku)}/tokens/${encodeURIComponent(token)}`);
    if (!got.ok) return got;
    const one = got.data;
    return {
      ok: true,
      data: {
        /* 0 is purchased; 1 cancelled; 2 pending (a cash payment not yet made). */
        paid: one.purchaseState === 0,
        order: one.orderId ?? '',
        state: one.purchaseState === 0 ? (one.consumptionState === 1 ? 'CONSUMED' : 'PURCHASED') : one.purchaseState === 2 ? 'PENDING' : 'CANCELLED',
        acknowledged: one.acknowledgementState === 1,
        expires: null,
        linked: null,
        sku: product.sku,
      },
    };
  }
  const got = await ask<SubscriptionPurchaseV2>(`/purchases/subscriptionsv2/tokens/${encodeURIComponent(token)}`);
  if (!got.ok) return got;
  const sub = got.data;
  const line = sub.lineItems?.[0];
  const state = sub.subscriptionState ?? '';
  return {
    ok: true,
    data: {
      /* A grace period is still paid for: the card failed and Play is retrying,
         and the member keeps what they have while it does. */
      paid: state === 'SUBSCRIPTION_STATE_ACTIVE' || state === 'SUBSCRIPTION_STATE_IN_GRACE_PERIOD',
      order: line?.latestSuccessfulOrderId || sub.latestOrderId || '',
      state,
      acknowledged: sub.acknowledgementState === 'ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED',
      expires: line?.expiryTime ?? null,
      linked: sub.linkedPurchaseToken ?? null,
      sku: line?.productId ?? null,
    },
  };
}

/**
 * Tells Google the purchase was delivered.
 *
 * A consumable is CONSUMED, which is what lets the member buy the same pack
 * again. A subscription is ACKNOWLEDGED. Play refunds anything left
 * unacknowledged for three days, so this is not optional — and it happens
 * only after the grant has been written, so a grant that failed leaves the
 * purchase unacknowledged and refunded rather than paid for and missing.
 */
export async function deliver(product: PlayProduct, token: string): Promise<Asked<unknown>> {
  const path = product.type === 'consumable'
    ? `/purchases/products/${encodeURIComponent(product.sku)}/tokens/${encodeURIComponent(token)}:consume`
    : `/purchases/subscriptions/${encodeURIComponent(product.sku)}/tokens/${encodeURIComponent(token)}:acknowledge`;
  return ask(path, 'POST');
}

/**
 * Whose a token is, claiming it for `owner` the first time it is seen.
 *
 * Returns the owner on record. A caller whose id does not match the answer
 * is presenting somebody else's purchase and is refused by the route.
 */
export async function claim(
  owner: string,
  product: PlayProduct,
  token: string,
  checked: Checked,
): Promise<string | null> {
  const client = admin();
  if (!client) return null;
  const { data } = await client.from('play_purchases').select('owner').eq('purchase_token', token).maybeSingle();
  const had = (data as { owner?: string } | null)?.owner;
  if (had) return had;
  /* A re-subscribe or an upgrade names the token it replaced. The owner of
     that one is the owner of this one, whoever is signed in on the phone. */
  if (checked.linked) {
    const { data: linked } = await client.from('play_purchases').select('owner').eq('purchase_token', checked.linked).maybeSingle();
    const was = (linked as { owner?: string } | null)?.owner;
    if (was && was !== owner) return was;
  }
  const { error } = await client.from('play_purchases').insert({
    purchase_token: token,
    owner,
    sku: product.sku,
    kind: product.type,
    linked_token: checked.linked,
    state: checked.state,
    expires_at: checked.expires,
  });
  if (error) {
    /* Two requests for the same token in the same moment: the second insert
       loses on the primary key, and the row the first one wrote decides. */
    const { data: again } = await client.from('play_purchases').select('owner').eq('purchase_token', token).maybeSingle();
    return (again as { owner?: string } | null)?.owner ?? null;
  }
  return owner;
}

/** The owner of a token already on record — for a renewal nobody is present for. */
export async function ownerOfToken(token: string, linked: string | null): Promise<string | null> {
  const client = admin();
  if (!client) return null;
  for (const one of [token, linked]) {
    if (!one) continue;
    const { data } = await client.from('play_purchases').select('owner').eq('purchase_token', one).maybeSingle();
    const owner = (data as { owner?: string } | null)?.owner;
    if (owner) return owner;
  }
  return null;
}

/**
 * Grants what a checked purchase bought, once per order.
 *
 * The amount is read from this app's own tables — `PACKS`, `KIDS_PACKS`, the
 * tier on the product — never from anything the phone or the notification
 * said. Every grant is filed under `play:<order id>`, and the two ledgers
 * already refuse a reference they have seen, so a token presented twice, or
 * a renewal announced twice, grants once.
 */
export async function grant(owner: string, product: PlayProduct, token: string, checked: Checked): Promise<boolean> {
  const client = admin();
  if (!client || !checked.paid || !checked.order) return false;
  const reference = `play:${checked.order}`;
  const what = product.grants;
  if (what.kind === 'credits') {
    const pack = packById(what.pack);
    if (!pack) return false;
    await topUp(owner, pack.credits, reference);
  } else if (what.kind === 'kids') {
    const pack = kidsPackById(what.pack);
    if (!pack) return false;
    await kidsWalletAdd(owner, pack.credits, reference, null);
  } else {
    /* A plan lasts until Play says the paid period ends. A day's grace on
       top, because Google's renewal notice can arrive after the moment the
       old period ran out, and a member should not drop to free for an hour
       every month because a message was late. */
    const until = checked.expires ? new Date(new Date(checked.expires).getTime() + 24 * 60 * 60 * 1000) : null;
    wrote(await client.from('memberships').upsert({
      owner,
      tier: what.tier,
      renews_at: until ? until.toISOString() : null,
      reference,
      updated_at: new Date().toISOString(),
    }), 'the membership from Play');
  }
  wrote(await client.from('play_purchases').update({
    state: checked.state,
    expires_at: checked.expires,
    last_order: checked.order,
    updated_at: new Date().toISOString(),
  }).eq('purchase_token', token), 'the Play purchase');
  return true;
}

/** The member's standing Play subscription, for the account screen. */
export async function playSubscriptionOf(owner: string): Promise<{ sku: string; state: string; expires: string | null } | null> {
  const client = admin();
  if (!client) return null;
  const { data } = await client
    .from('play_purchases')
    .select('sku, state, expires_at')
    .eq('owner', owner)
    .eq('kind', 'subscription')
    /* The plan, not a monthly kids pack, which is also a subscription. */
    .in('sku', PLAY_PRODUCTS.filter((one) => one.grants.kind === 'plan').map((one) => one.sku))
    .order('expires_at', { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();
  const row = data as { sku?: string; state?: string; expires_at?: string | null } | null;
  if (!row?.sku) return null;
  if (row.expires_at && new Date(row.expires_at) < new Date()) return null;
  return { sku: row.sku, state: row.state ?? '', expires: row.expires_at ?? null };
}

/** Constant-time comparison for the notification key. */
export function sameKey(given: string, expected: string): boolean {
  const a = Buffer.from(given, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
