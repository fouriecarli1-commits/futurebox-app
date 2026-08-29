/**
 * A winner asking for their prize.
 *
 * The account details go to Paystack and are **not** stored here. What comes
 * back is a recipient code, and that is all this app keeps — so a leak of the
 * winners table cannot empty anybody's account. That is the whole reason this
 * route exists rather than a form that emails bank details to the operator.
 *
 * The bank list is fetched from Paystack rather than written down here: a bank
 * code copied out of documentation is a string that works until they change it,
 * and then a real person's prize fails with a number that means nothing to
 * them.
 *
 * The transfer itself is deliberately not initiated from here. Moving money out
 * needs transfers enabled on the account and, depending on its settings, an
 * OTP — so the app takes the claim as far as a ready recipient and the operator
 * sends it. An app that silently tries to move money and fails halfway is worse
 * than one that says where the handover is.
 */

import { admin, callerFrom, metered } from '@/app/lib/server/account';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const PAYSTACK = 'https://api.paystack.co';

/**
 * Paystack's own name for "a bank account in this country".
 *
 * South Africa is `basa`; Nigeria is `nuban`. Anything not listed is refused
 * here rather than sent and rejected upstream with a less useful message.
 */
const RECIPIENT_TYPE: Record<string, string> = { ZA: 'basa', NG: 'nuban' };

export async function GET(): Promise<Response> {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) return Response.json({ banks: [] });
  try {
    const response = await fetch(`${PAYSTACK}/bank?country=south%20africa&currency=ZAR`, {
      headers: { Authorization: `Bearer ${secret}` },
    });
    const payload = (await response.json()) as {
      data?: Array<{ name?: string; code?: string }>;
    };
    return Response.json({
      banks: (payload.data ?? [])
        .filter((one) => one.name && one.code)
        .map((one) => ({ name: one.name as string, code: one.code as string })),
    });
  } catch {
    return Response.json({ banks: [] });
  }
}

export async function POST(request: Request): Promise<Response> {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) {
    return Response.json({ message: 'Payouts are not switched on yet.' }, { status: 503 });
  }
  if (!metered()) return Response.json({ message: 'Accounts are not configured.' }, { status: 503 });

  const caller = await callerFrom(request);
  if (!caller) return Response.json({ message: 'Sign in first.' }, { status: 401 });

  let body: { competitionId?: unknown; accountNumber?: unknown; bankCode?: unknown; name?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ message: 'Could not read the request.' }, { status: 400 });
  }

  const client = admin();
  if (!client) return Response.json({ message: 'Storage is not configured.' }, { status: 503 });

  // Only a real winner of that competition, checked against the table rather
  // than against anything the request claims.
  const { data: win } = await client
    .from('winners')
    .select('competition_id, place, prize_rand, paid_at')
    .eq('competition_id', String(body.competitionId ?? ''))
    .eq('owner', caller.id)
    .maybeSingle();
  if (!win) return Response.json({ message: 'You did not win that one.' }, { status: 403 });
  if (win.paid_at) return Response.json({ message: 'That prize has already been paid.' }, { status: 409 });

  const accountNumber = String(body.accountNumber ?? '').replace(/\s/g, '');
  const bankCode = String(body.bankCode ?? '').trim();
  const name = String(body.name ?? '').trim().slice(0, 100);
  if (!/^\d{6,17}$/.test(accountNumber) || !bankCode || !name) {
    return Response.json({ message: 'Name, bank and account number are all needed.' }, { status: 400 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${PAYSTACK}/transferrecipient`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: RECIPIENT_TYPE.ZA,
        name,
        account_number: accountNumber,
        bank_code: bankCode,
        currency: 'ZAR',
      }),
    });
  } catch {
    return Response.json({ message: 'Could not reach the payment service.' }, { status: 502 });
  }

  const payload = (await upstream.json().catch(() => ({}))) as {
    status?: boolean;
    message?: string;
    data?: { recipient_code?: string };
  };
  if (!upstream.ok || !payload.status || !payload.data?.recipient_code) {
    // Their words: "account number is invalid" is a sentence somebody can act
    // on, and "could not save" is not.
    return Response.json(
      { message: payload.message ?? 'The payment service would not accept those details.' },
      { status: 400 },
    );
  }

  await client
    .from('winners')
    .update({ claimed_at: new Date().toISOString(), recipient_code: payload.data.recipient_code })
    .eq('competition_id', win.competition_id)
    .eq('place', win.place);

  // The account number is not written down anywhere in this app. Only the code.
  return Response.json({ claimed: true, prizeRand: win.prize_rand });
}
