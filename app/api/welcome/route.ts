/**
 * The welcome letter, sent once per account.
 *
 * ── Why a route and not a database trigger ───────────────────────────────
 *
 * Supabase can fire a webhook when a row lands in `auth.users`, and that is
 * the tidier-sounding design. It is also a second thing to configure in a
 * dashboard, invisible from this repository, that breaks silently when
 * somebody restores a project from a backup. This app's whole posture is that
 * what it does should be readable in its own files.
 *
 * So the browser asks, once, after signing in. The `once` key is the account's
 * own id, so it does not matter how many times it asks — the second one loses
 * the claim in the database and nothing is sent.
 *
 * ── Why not on sign-up specifically ──────────────────────────────────────
 *
 * Because sign-up is not when an account starts existing. With email
 * confirmation switched on, `signUp` returns no session at all: the person
 * clicks a link in their inbox and comes back later, and a welcome sent at the
 * moment of the form arrives before the account is usable. Asking on the first
 * *signed-in* load covers both paths — confirmed or not — and cannot fire for
 * an account that never completed.
 *
 * ── Why it answers 200 even when it sent nothing ─────────────────────────
 *
 * The browser has nothing useful to do with a failure here, and a red error in
 * the console on first sign-in is a bad first impression for a letter nobody
 * asked about. What happened is in `mail_log`, which is where somebody
 * debugging a missing welcome would actually look.
 */

import { callerFrom, metered } from '@/app/lib/server/account';
import { accountFor, send } from '@/app/lib/server/email';
import { welcomeLetter } from '@/app/lib/server/letters';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request): Promise<Response> {
  if (!metered()) return Response.json({ sent: false });
  const caller = await callerFrom(request);
  if (!caller) return Response.json({ sent: false });

  /* What they are reading now, then what the account remembers.

     A welcome is sent on the first signed-in load, so the parameter is nearly
     always there and is the better answer — it is the language of the page
     they are on. The account is the fallback for the case where it is not. */
  const asked = new URL(request.url).searchParams.get('lang');
  const lang =
    asked === 'af' || asked === 'en'
      ? asked
      : ((await accountFor(caller.id))?.lang ?? 'en');
  const letter = welcomeLetter(lang);

  const said = await send({
    to: caller.email,
    subject: letter.subject,
    text: letter.text,
    kind: 'welcome',
    // The account id, so this is once per person for the life of the account
    // rather than once per sign-in.
    once: `welcome:${caller.id}`,
  });

  return Response.json({ sent: said.ok && !('skipped' in said && said.skipped) });
}
