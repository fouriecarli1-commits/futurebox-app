/**
 * The key a Cubed³ presenter's link carries, and the row it opens.
 *
 * ── The key, and where it is not kept ────────────────────────────────────
 *
 * A link is the whole of a presenter's access: nobody signs up, because the
 * owner chose who is invited by typing their address. So the key is long
 * (256 random bits, which nobody guesses), it travels after the `#` — the
 * part of an address a browser never sends to a server, so it is in no
 * access log — and the table keeps only its SHA-256. A copy of the table
 * opens nothing. A new link replaces the old one, so a link sent to the
 * wrong address is fixed by sending another.
 *
 * The page sends the key back in a header of its own on every request,
 * never in the address.
 */

import crypto from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SLOTS, cleanTransfer, type SlotId, type Transfer } from '@/app/lib/cubedhost';
import { addressKey } from '@/app/lib/server/identity';

export const BUCKET = 'cubed';
export const KEY_HEADER = 'x-cubed-key';

const KEY_SHAPE = /^[A-Za-z0-9_-]{40,64}$/;

/** A fresh key: 32 random bytes, URL-safe. */
export const newKey = (): string => crypto.randomBytes(32).toString('base64url');

export const hashKey = (key: string): string => crypto.createHash('sha256').update(key).digest('hex');

/** The address of the site, for a link in a letter: the configured host, or where the request came from. */
export function siteOf(request: Request): string {
  const host = process.env.NEXT_PUBLIC_SITE_HOST;
  if (host) return `https://${host.replace(/^https?:\/\//, '').replace(/\/+$/, '')}`;
  return new URL(request.url).origin;
}

export const linkFor = (site: string, key: string): string => `${site}/cubed/host#k=${key}`;

export interface HostRow {
  readonly id: string;
  readonly email: string;
  readonly note: string;
  readonly created_at: string;
  readonly opened_at: string | null;
  readonly details: unknown;
  readonly saved_at: string | null;
  readonly signed_at: string | null;
  readonly terms_version: string | null;
  readonly signature: string | null;
  readonly signed_ip_hash: string | null;
  readonly signed_agent: string | null;
  /** Per block: links to its files and how else they are coming — see `cleanTransfer`. */
  readonly links: Record<string, unknown> | null;
  readonly revoked_at: string | null;
}

export const ROW = 'id, email, note, created_at, opened_at, details, saved_at, signed_at, terms_version, signature, signed_ip_hash, signed_agent, links, revoked_at';

/**
 * The invitation this request's key opens, or why not.
 *
 * `missing` for no key or one that matches nothing, `revoked` for one the
 * owner has switched off — said apart, because "ask for a new link" and
 * "this link was switched off" are different sentences to the person
 * holding it.
 */
export async function hostFrom(
  request: Request,
  client: SupabaseClient,
): Promise<{ row: HostRow } | { why: 'missing' | 'revoked' | 'not_ready' }> {
  const key = request.headers.get(KEY_HEADER) ?? '';
  if (!KEY_SHAPE.test(key)) return { why: 'missing' };
  const { data, error } = await client.from('cubed_hosts').select(ROW).eq('key_hash', hashKey(key)).maybeSingle();
  if (error) return { why: error.code === '42P01' ? 'not_ready' : 'missing' };
  if (!data) return { why: 'missing' };
  const row = data as HostRow;
  if (row.revoked_at) return { why: 'revoked' };
  return { row };
}

export interface Kept {
  readonly name: string;
  readonly path: string;
  readonly bytes: number;
  readonly at: string | null;
}

/**
 * What is in one block, newest last — or null when storage could not be
 * read, which is not the same as an empty block and is never shown as one.
 */
export async function filesIn(client: SupabaseClient, id: string, slot: SlotId): Promise<Kept[] | null> {
  const { data, error } = await client.storage.from(BUCKET).list(`${id}/${slot}`, { limit: 100, sortBy: { column: 'created_at', order: 'asc' } });
  if (error || !data) return null;
  return data
    .filter((one) => one.id && one.name && one.name !== '.emptyFolderPlaceholder')
    .map((one) => ({
      /* The stored name starts with the moment it came in; the person's own name follows. */
      name: one.name.replace(/^\d+-/, ''),
      path: `${id}/${slot}/${one.name}`,
      bytes: Number((one.metadata as { size?: unknown } | null)?.size ?? 0),
      at: one.created_at ?? null,
    }));
}

/** Every block's files, and whether any block could not be read. */
export async function allFiles(client: SupabaseClient, id: string): Promise<{ files: Record<string, Kept[]>; unread: boolean }> {
  const lists = await Promise.all(SLOTS.map((slot) => filesIn(client, id, slot.id)));
  return {
    files: Object.fromEntries(SLOTS.map((slot, i) => [slot.id, lists[i] ?? []])),
    unread: lists.some((one) => one === null),
  };
}

/** Every block's other ways, cleaned, whatever shape the row kept them in. */
export const transfersOf = (raw: HostRow['links']): Record<string, Transfer> =>
  Object.fromEntries(Object.entries(raw ?? {}).map(([slot, one]) => [slot, cleanTransfer(one)]));

/**
 * Where a signature came from: a salted hash of the first forwarded address
 * (never the address — it is personal information, and matching is all a
 * dispute needs), and the browser.
 */
export function whereFrom(request: Request): { ipHash: string; agent: string } {
  const forwarded = request.headers.get('x-forwarded-for') ?? '';
  const address = (forwarded.split(',')[0] || request.headers.get('x-real-ip') || '').trim().slice(0, 64);
  return { ipHash: addressKey(address), agent: (request.headers.get('user-agent') ?? '').slice(0, 300) };
}

/** A signature as the page sends it: a PNG data address, of a sane size. */
export function cleanSignature(raw: unknown): string | null {
  const value = typeof raw === 'string' ? raw : '';
  if (!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(value)) return null;
  if (value.length < 200 || value.length > 400000) return null;
  return value;
}
