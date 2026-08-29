/**
 * Who is calling, and what they may spend — decided on the server.
 *
 * Everything in `app/lib/entitlements.ts` runs in the browser and is therefore
 * a courtesy: it shapes the UI so nobody is surprised, and it can be defeated
 * by clearing site data. That was fine while generating cost nothing. It is not
 * fine now that every song spends real credits on the owner's account.
 *
 * So the limit lives here. The browser sends its Supabase access token, this
 * module asks Supabase who that token belongs to, reads the day's count from
 * Postgres, and answers. A caller who lies about their tier is simply wrong:
 * the tier is read from the database, never from the request.
 *
 * Two keys, and the difference is the whole design:
 *   · the anon key is public and obeys row-level security — what the browser
 *     holds, and what it is safe for the browser to hold.
 *   · the service-role key bypasses row-level security entirely. It writes the
 *     generation and purchase rows, because those must not be writable by the
 *     person they bill. It has no NEXT_PUBLIC_ prefix for exactly that reason
 *     and must never reach a page.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { TIER_SPECS, type Tier } from '../plans';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

/**
 * Accounts that always have full access, whatever the database says.
 *
 * For the owner, and for anyone demonstrating the app: testing the paid product
 * should not need a hand-written SQL insert every time, and a demo that hits a
 * free-tier wall in front of an audience is a bad demo.
 *
 * Comma-separated, matched case-insensitively on the verified email from the
 * token — not on anything the request claims about itself. It has no
 * NEXT_PUBLIC_ prefix, so the list never reaches a browser and nobody can read
 * off who is privileged.
 */
const OWNERS = (process.env.OWNER_EMAIL ?? '')
  .split(',')
  .map((entry) => entry.trim().toLowerCase())
  .filter(Boolean);

function isOwner(email: string): boolean {
  return email !== '' && OWNERS.indexOf(email.toLowerCase()) !== -1;
}

/**
 * Whether this caller runs the place.
 *
 * Used where an action is the operator's alone — opening a competition,
 * naming a winner. Matched on the verified email from the token, never on
 * anything the request says about itself.
 */
export function callerIsOwner(caller: Caller | null): boolean {
  return Boolean(caller && isOwner(caller.email));
}

/** True when metering can actually be enforced. */
export function metered(): boolean {
  return Boolean(URL && ANON && SERVICE);
}

/** The privileged client. Never hand this, or its output, to a page. */
export function admin(): SupabaseClient | null {
  if (!URL || !SERVICE) return null;
  return createClient(URL, SERVICE, { auth: { persistSession: false } });
}

export interface Caller {
  readonly id: string;
  readonly email: string;
  readonly tier: Tier;
}

/**
 * The signed-in person behind a request, or null.
 *
 * The token is verified by asking Supabase who it belongs to rather than by
 * decoding it here. Decoding a JWT tells you what it claims; only the issuer
 * can tell you whether it is real and still valid.
 */
export async function callerFrom(request: Request): Promise<Caller | null> {
  const header = request.headers.get('authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token || !URL || !ANON) return null;

  const client = createClient(URL, ANON, { auth: { persistSession: false } });
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) return null;

  const email = data.user.email ?? '';
  // The owner check comes first and skips the database read entirely: it must
  // keep working even when the memberships table is missing or empty, which is
  // exactly the state it exists to get someone out of.
  const tier = isOwner(email) ? 'label' : await tierOf(data.user.id);
  return { id: data.user.id, email, tier };
}

/** Which tier someone is on, from the database. Free unless told otherwise. */
async function tierOf(owner: string): Promise<Tier> {
  const db = admin();
  if (!db) return 'free';
  const { data } = await db
    .from('memberships')
    .select('tier, renews_at')
    .eq('owner', owner)
    .maybeSingle();
  if (!data) return 'free';
  // A lapsed membership is a free membership, whatever the row still says.
  if (data.renews_at && new Date(data.renews_at as string) < new Date()) return 'free';
  const tier = data.tier as Tier;
  return TIER_SPECS[tier] ? tier : 'free';
}

/* ─────────────────────────────────────────────────────────── allowances ─── */

export const FREE_PREVIEWS_PER_DAY = 2;
export const PREVIEW_SECONDS = 15;

/**
 * A month's songs spread across the month, so one enthusiastic day cannot eat
 * the whole allowance and leave three weeks of nothing. The small bonus makes
 * a burst of work on a weekend possible without unlocking a farm.
 */
function dailyFullSongs(tier: Tier): number {
  const monthly = TIER_SPECS[tier].songs;
  return monthly === 0 ? 0 : Math.max(1, Math.ceil(monthly / 30) + 2);
}

export interface Allowance {
  readonly kind: 'preview' | 'full';
  /** Forced length for previews; 0 means the caller's own choice stands. */
  readonly seconds: number;
  readonly allowed: boolean;
  readonly reason: string;
  readonly usedToday: number;
  readonly limit: number;
}

/**
 * What this caller may do right now.
 *
 * Free accounts get short previews and nothing longer — that is the entire
 * cost model. At a 5% purchase rate one buyer carries twenty free users, so
 * whatever the free tier costs gets multiplied by twenty before anyone pays.
 */
export async function allowanceFor(caller: Caller | null): Promise<Allowance> {
  if (!caller) {
    return {
      kind: 'preview',
      seconds: PREVIEW_SECONDS,
      allowed: false,
      reason: 'Sign in first — that is how a song stays yours.',
      usedToday: 0,
      limit: 0,
    };
  }

  const db = admin();
  const counts: Record<string, number> = { preview: 0, full: 0 };
  if (db) {
    const { data } = await db.rpc('generations_today', { p_owner: caller.id });
    (data as { kind: string; used: number }[] | null)?.forEach((row) => {
      counts[row.kind] = Number(row.used);
    });
  }

  if (caller.tier === 'free') {
    const used = counts.preview;
    return {
      kind: 'preview',
      seconds: PREVIEW_SECONDS,
      allowed: used < FREE_PREVIEWS_PER_DAY,
      reason:
        used < FREE_PREVIEWS_PER_DAY
          ? ''
          : 'That is both previews for today. Open one into the full song, or pick a plan.',
      usedToday: used,
      limit: FREE_PREVIEWS_PER_DAY,
    };
  }

  const limit = dailyFullSongs(caller.tier);
  const used = counts.full;
  return {
    kind: 'full',
    seconds: 0,
    allowed: used < limit,
    reason: used < limit ? '' : `That is today's ${limit}. They come back tomorrow.`,
    usedToday: used,
    limit,
  };
}

/** Writes the row that makes the next count true. */
export async function recordGeneration(
  caller: Caller,
  kind: 'preview' | 'full',
  seconds: number,
  trackId?: string,
): Promise<void> {
  const db = admin();
  if (!db) return;
  await db.from('generations').insert({
    owner: caller.id,
    kind,
    seconds: Math.round(seconds),
    track_id: trackId ?? null,
    credits: Math.round((seconds / 60) * 900),
  });
}

/** What this person has bought for one track. */
export async function purchaseLevel(
  caller: Caller,
  trackId: string,
): Promise<'none' | 'opened' | 'owned'> {
  const db = admin();
  if (!db) return 'none';
  const { data } = await db
    .from('purchases')
    .select('level')
    .eq('owner', caller.id)
    .eq('track_id', trackId);
  const rows = (data as { level: string }[] | null) ?? [];
  if (rows.some((row) => row.level === 'owned')) return 'owned';
  if (rows.some((row) => row.level === 'opened')) return 'opened';
  return 'none';
}

/** Records a paid unlock. Called only from the payment webhook. */
export async function recordPurchase(
  ownerId: string,
  trackId: string,
  level: 'opened' | 'owned',
  amountCents: number,
  reference: string,
): Promise<boolean> {
  const db = admin();
  if (!db) return false;
  const { error } = await db
    .from('purchases')
    .upsert(
      { owner: ownerId, track_id: trackId, level, amount_cents: amountCents, currency: 'ZAR', reference },
      { onConflict: 'owner,track_id,level' },
    );
  return !error;
}
