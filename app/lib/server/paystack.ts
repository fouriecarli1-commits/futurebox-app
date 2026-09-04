/**
 * Paystack, for the parts of it that recur.
 *
 * A one-off charge only needs `/transaction/initialize`, which the checkout
 * route has always called. A subscription needs four more things: the plan
 * codes, the transaction behind a charge, the customer that charge belongs to,
 * and the endpoint that cancels the arrangement. They are here so that the
 * webhook and the cancel route are both talking to one description of their
 * API rather than two.
 *
 * Every endpoint and field name below is read from Paystack's own published
 * packages (`paystack-api`, `paystack-sdk`), not from memory:
 *
 *   POST /transaction/initialize   takes `plan` — a plan code — alongside
 *                                  `amount` and `email`. That is what turns a
 *                                  checkout into a subscription.
 *   GET  /transaction/verify/{ref} returns the transaction, including its
 *                                  `customer` with `email` and `customer_code`.
 *   GET  /customer/{code}          returns the customer, including their
 *                                  `subscriptions`, each with a
 *                                  `subscription_code`, an `email_token`, a
 *                                  `status`, a `next_payment_date` and the
 *                                  `plan` it is on.
 *   POST /subscription/disable     takes `code` and `token` — the subscription
 *                                  code and that email token.
 *
 * Amounts are in cents for ZAR, which is their rule for rand and the reason
 * every figure in this file is a hundred times the price on the card.
 */

import type { Tier } from '@/app/lib/plans';

const BASE = 'https://api.paystack.co';

function secret(): string {
  return process.env.PAYSTACK_SECRET_KEY ?? '';
}

/**
 * The Paystack plan behind each paid tier.
 *
 * Created once in the Paystack dashboard (or by their API) and pasted into the
 * environment, because a plan code is an account-level fact and not something
 * this repository can know. A tier with no code still sells — it just sells as
 * a single month's charge rather than as a subscription, which is what this
 * app did before subscriptions existed. That fallback is deliberate: a missing
 * environment variable should cost a renewal, not the sale.
 */
export function planCode(tier: Tier): string {
  const codes: Record<Tier, string> = {
    free: '',
    maker: process.env.PAYSTACK_PLAN_MAKER ?? '',
    studio: process.env.PAYSTACK_PLAN_STUDIO ?? '',
    label: process.env.PAYSTACK_PLAN_LABEL ?? '',
  };
  return codes[tier] ?? '';
}

/**
 * The Paystack plan behind an add-on, on the same terms as a tier's.
 *
 * Without a code the add-on still sells — as a single month's charge that
 * simply runs out, which `grant_addon` handles the same way. A missing
 * environment variable should cost a renewal, not the sale.
 */
export function addonPlanCode(addon: string): string {
  const codes: Record<string, string> = {
    marketing: process.env.PAYSTACK_PLAN_MARKETING ?? '',
  };
  return codes[addon] ?? '';
}

/**
 * Which add-on a plan code belongs to.
 *
 * This is what stops an add-on renewal being recorded as a membership. A
 * renewal carries no metadata of ours, and the old code read "no metadata" as
 * "a plan renewed" — so without this, somebody's R199 marketing month would
 * have quietly renewed their Studio membership instead.
 */
export function addonOfPlan(code: string): string | null {
  if (!code) return null;
  return addonPlanCode('marketing') === code ? 'marketing' : null;
}

/** Which tier a plan code belongs to, for reading a renewal backwards. */
export function tierOfPlan(code: string): Tier | null {
  if (!code) return null;
  for (const tier of ['maker', 'studio', 'label'] as const) {
    if (planCode(tier) === code) return tier;
  }
  return null;
}

async function get<T>(path: string): Promise<T | null> {
  const key = secret();
  if (!key) return null;
  const response = await fetch(`${BASE}${path}`, {
    headers: { Authorization: `Bearer ${key}` },
    cache: 'no-store',
  }).catch(() => null);
  if (!response?.ok) return null;
  const payload = (await response.json().catch(() => null)) as { status?: boolean; data?: T } | null;
  return payload?.status && payload.data ? payload.data : null;
}

export interface Payer {
  readonly email: string;
  readonly customerCode: string;
}

/**
 * Who a charge was for, asked of Paystack rather than read off the event.
 *
 * The webhook body is signed, so it can be trusted; it is still asked again
 * here because a renewal months later carries none of the checkout's own
 * metadata, and the customer code — the one thing that ties it back to a
 * person — has to come from somewhere reliable either way.
 */
export async function payerOf(reference: string): Promise<Payer | null> {
  const data = await get<{ customer?: { email?: string; customer_code?: string } }>(
    `/transaction/verify/${encodeURIComponent(reference)}`,
  );
  const customer = data?.customer;
  if (!customer?.customer_code) return null;
  return { email: customer.email ?? '', customerCode: customer.customer_code };
}

export interface Arrangement {
  readonly subscriptionCode: string;
  readonly emailToken: string;
  readonly planCode: string;
  readonly tier: Tier;
  readonly status: string;
  readonly nextPaymentAt: string | null;
}

/**
 * The subscription a customer is on, if it is one of ours.
 *
 * Their customer record carries the list, so one call answers both "is this a
 * subscription at all" and "which of our plans". Anything on a plan this app
 * does not sell is ignored rather than guessed at — the same Paystack account
 * may well be selling something else.
 */
export async function arrangementOf(customerCode: string): Promise<Arrangement | null> {
  const data = await get<{
    subscriptions?: Array<{
      subscription_code?: string;
      email_token?: string;
      status?: string;
      next_payment_date?: string | null;
      plan?: { plan_code?: string } | string;
    }>;
  }>(`/customer/${encodeURIComponent(customerCode)}`);

  for (const one of data?.subscriptions ?? []) {
    const code = typeof one.plan === 'string' ? one.plan : (one.plan?.plan_code ?? '');
    const tier = tierOfPlan(code);
    if (!tier) continue;
    return {
      subscriptionCode: one.subscription_code ?? '',
      emailToken: one.email_token ?? '',
      planCode: code,
      tier,
      status: one.status ?? 'active',
      nextPaymentAt: one.next_payment_date ?? null,
    };
  }
  return null;
}

/**
 * Stop the renewals.
 *
 * Paystack call it disabling rather than cancelling, and the difference is the
 * honest one: the month already paid for is not refunded and not cut short.
 * Nothing more is charged after it.
 */
export async function stopRenewing(
  subscriptionCode: string,
  emailToken: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const key = secret();
  if (!key) return { ok: false, message: 'Payments are not switched on yet.' };

  const response = await fetch(`${BASE}/subscription/disable`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: subscriptionCode, token: emailToken }),
  }).catch(() => null);
  if (!response) return { ok: false, message: 'Could not reach the payment service.' };

  const payload = (await response.json().catch(() => ({}))) as { status?: boolean; message?: string };
  if (!response.ok || !payload.status) {
    return { ok: false, message: payload.message ?? 'The payment service would not cancel that.' };
  }
  return { ok: true };
}
