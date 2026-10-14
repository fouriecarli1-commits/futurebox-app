/**
 * Google Play telling us a subscription changed — renewed, recovered, lapsed.
 *
 * Play's "real-time developer notifications" arrive here as a Pub/Sub push.
 * They are how a monthly plan bought in the Android app stays a plan: the
 * renewal happens at Google with nobody signed in, and this is the only
 * thing that hears about it.
 *
 * ── Why the message is never believed ───────────────────────────────────
 *
 * The push carries a purchase token and a word for what happened. Neither
 * is taken at its word. The address ends in `PLAY_NOTIFY_SECRET`, which keeps
 * strangers from making us do work; but even a message with the right key
 * only ever causes a QUESTION — Google is asked about the token with the
 * app's own service account, and its answer is what is granted. A forged
 * notification can at most make us check a real purchase again.
 *
 * ── What happens to each ─────────────────────────────────────────────────
 *
 * Every subscription notification is handled the same way: ask Google where
 * the token stands, and if it is paid, grant the period (filed under the
 * order id, so the first month's grant and a duplicate notice are one
 * grant). A cancelled-but-still-paid subscription is still paid for until
 * its period ends, which the membership's `renews_at` already says; a lapsed
 * one is simply not renewed. Nothing is ever taken away here.
 *
 * Answered 200 for anything understood, so Pub/Sub stops retrying, and 500
 * only when Google could not be asked — then Pub/Sub retries, which is right.
 */

import { productBySku } from '@/app/lib/playproducts';
import { checkPurchase, claim, deliver, grant, ownerOfToken, packageName, playReady, sameKey } from '@/app/lib/server/playbilling';
import { admin } from '@/app/lib/server/account';
import { wrote } from '@/app/lib/server/wrote';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

interface Push {
  message?: { data?: string };
}

interface Notice {
  packageName?: string;
  subscriptionNotification?: { notificationType?: number; purchaseToken?: string; subscriptionId?: string };
  oneTimeProductNotification?: { notificationType?: number; purchaseToken?: string; sku?: string };
  voidedPurchaseNotification?: { purchaseToken?: string; orderId?: string; productType?: number };
  testNotification?: { version?: string };
}

export async function POST(request: Request): Promise<Response> {
  const expected = (process.env.PLAY_NOTIFY_SECRET ?? '').trim();
  const given = new URL(request.url).searchParams.get('key') ?? '';
  if (!expected || !playReady()) return new Response('not configured', { status: 503 });
  if (!sameKey(given, expected)) return new Response('wrong key', { status: 401 });

  const push = (await request.json().catch(() => null)) as Push | null;
  let notice: Notice;
  try {
    notice = JSON.parse(Buffer.from(push?.message?.data ?? '', 'base64').toString('utf8')) as Notice;
  } catch {
    return new Response('bad body', { status: 200 });
  }
  if (notice.packageName && notice.packageName !== packageName()) return new Response('another app', { status: 200 });
  /* The Console's "send test notification" button. Answered so she can see
     the address works. */
  if (notice.testNotification) return new Response('test received', { status: 200 });

  /* ── A refund ──────────────────────────────────────────────────────────
     Written down rather than clawed back. Taking credits out of a balance
     somebody may already have spent is a decision with a person in it, and
     the row is what she reads to make it. */
  if (notice.voidedPurchaseNotification?.purchaseToken) {
    const client = admin();
    if (client) {
      wrote(await client.from('play_purchases')
        .update({ state: 'VOIDED', updated_at: new Date().toISOString() })
        .eq('purchase_token', notice.voidedPurchaseNotification.purchaseToken), 'the voided Play purchase');
    }
    console.warn(`play: Google refunded order ${notice.voidedPurchaseNotification.orderId ?? '?'}`);
    return new Response('voided noted', { status: 200 });
  }

  const sub = notice.subscriptionNotification;
  if (!sub?.purchaseToken || !sub.subscriptionId) return new Response('nothing to do', { status: 200 });
  const product = productBySku(sub.subscriptionId);
  if (!product || product.type !== 'subscription') return new Response('not ours', { status: 200 });

  const asked = await checkPurchase(product, sub.purchaseToken);
  if (!asked.ok) return new Response(asked.message, { status: 500 });
  const checked = asked.data;
  if (!checked.paid) return new Response('not paid now', { status: 200 });

  /* Whose it is comes from the row written when it was first bought in the
     app — or, for a re-subscribe, from the token it replaced. A token nobody
     here has seen is one the phone has not shown us yet; the app's own
     start-up check (`resumePlayPurchases`) will, signed in, and claim it. */
  const owner = await ownerOfToken(sub.purchaseToken, checked.linked);
  if (!owner) return new Response('owner not known yet', { status: 200 });
  /* A new token reached through the old one gets its own row now, so the
     next renewal finds it directly. A no-op for a token already on record. */
  await claim(owner, product, sub.purchaseToken, checked);

  if (!(await grant(owner, product, sub.purchaseToken, checked))) return new Response('could not grant', { status: 500 });
  if (!checked.acknowledged) await deliver(product, sub.purchaseToken);
  return new Response('granted', { status: 200 });
}
