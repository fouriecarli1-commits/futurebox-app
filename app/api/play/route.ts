/**
 * Google Play purchases, from inside the Play Store app.
 *
 * The owner, 14 October 2026: *"Wanneer ek die app op die playstore gaan sit gaan
 * ek paystack afhaal en werk met die playstore se paying system."* On the
 * website `/api/checkout` and Paystack carry on exactly as before; inside the
 * Android app the same buttons come here instead (`lib/playbilling.ts`).
 *
 *   GET                         whether Play purchases can be checked here
 *   POST { step: 'may',  sku }  before Play's sheet opens: is this member
 *                               allowed to buy this? The same rules the
 *                               Paystack till keeps, asked BEFORE money moves
 *   POST { step: 'paid', sku, token }
 *                               after the sheet closes: Google is asked about
 *                               the token, the purchase is claimed for this
 *                               account, granted from our own tables, and
 *                               only then consumed or acknowledged
 *
 * The phone's word is never the receipt — see `lib/server/playbilling.ts`.
 */

import { callerFrom, metered } from '@/app/lib/server/account';
import { mayTopUp } from '@/app/lib/credits';
import { kidsPackById } from '@/app/lib/kidspacks';
import { productBySku } from '@/app/lib/playproducts';
import { checkPurchase, claim, deliver, grant, playReady } from '@/app/lib/server/playbilling';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function GET(): Promise<Response> {
  return Response.json({ available: playReady() && metered() });
}

export async function POST(request: Request): Promise<Response> {
  if (!playReady() || !metered()) {
    return Response.json(
      { message: 'Paying through Google Play is not switched on yet.' },
      { status: 503 },
    );
  }
  const caller = await callerFrom(request);
  if (!caller) return Response.json({ message: 'Sign in before paying.' }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { step?: unknown; sku?: unknown; token?: unknown } | null;
  const product = productBySku(body?.sku);
  if (!product) return Response.json({ message: 'That is not something sold in the app.' }, { status: 400 });

  if (body?.step === 'may') {
    /* The same door the Paystack till keeps: extra credits are for members
       on a plan. Asked before Play's sheet opens, because after it there is
       money taken and the only honest thing left is to grant it. */
    if (product.grants.kind === 'credits' && !mayTopUp(caller.tier)) {
      return Response.json(
        {
          error: 'needs_plan',
          message: 'Extra credits are for members on a plan. Take a plan first — it includes credits every month.',
          needsPlan: true,
        },
        { status: 403 },
      );
    }
    if (product.grants.kind === 'kids' && !kidsPackById(product.grants.pack)) {
      return Response.json({ message: 'That kids pack is not sold any more.' }, { status: 400 });
    }
    return Response.json({ ok: true });
  }

  if (body?.step !== 'paid') return Response.json({ message: 'Say which step this is.' }, { status: 400 });
  const token = typeof body.token === 'string' ? body.token.trim() : '';
  if (!token || token.length > 4096) return Response.json({ message: 'No purchase to check.' }, { status: 400 });

  const asked = await checkPurchase(product, token);
  if (!asked.ok) {
    /* Google could not say. Nothing is granted and nothing is acknowledged —
       the purchase stays open, and the app asks again next time it starts
       (`resumePlayPurchases`), so a bad minute at Google costs nobody. */
    return Response.json({ message: asked.message }, { status: asked.status === 404 ? 404 : 502 });
  }
  const checked = asked.data;
  /* A subscription token says which product it is for; one that says
     something else is a token from another product presented under this
     one's name. */
  if (checked.sku && checked.sku !== product.sku) {
    return Response.json({ message: 'That purchase is for something else.' }, { status: 400 });
  }
  if (!checked.paid) {
    const pending = checked.state === 'PENDING';
    return Response.json(
      {
        pending,
        message: pending
          ? 'Google Play is still waiting for that payment. It arrives as soon as Play says it is paid.'
          : 'Google Play says that purchase is not paid for.',
      },
      { status: pending ? 202 : 402 },
    );
  }

  const owner = await claim(caller.id, product, token, checked);
  if (!owner) return Response.json({ message: 'The purchase could not be recorded just now.' }, { status: 503 });
  if (owner !== caller.id) {
    return Response.json({ message: 'That purchase belongs to another account.' }, { status: 409 });
  }

  const granted = await grant(owner, product, token, checked);
  if (!granted) return Response.json({ message: 'The purchase could not be delivered just now.' }, { status: 503 });

  /* Only now, after the grant is written. Unacknowledged purchases are
     refunded by Play after three days, which is the right outcome for one we
     failed to deliver — and the wrong one for one we did. */
  if (!(product.type === 'consumable' ? checked.state === 'CONSUMED' : checked.acknowledged)) {
    const told = await deliver(product, token);
    if (!told.ok) console.warn(`play: granted ${product.sku} but Google was not told: ${told.message}`);
  }
  return Response.json({ ok: true, granted: product.grants });
}
