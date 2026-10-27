/**
 * A fal.ai job's ticket, sealed so the phone can hold it and cannot change it.
 *
 * The queue answers with two links (where the job is, and its answer) that
 * only our key can read. Rather than keep every job in the database, the
 * links travel back to the phone inside a ticket signed with a secret the
 * phone never sees; the phone shows it again to ask how the job is going,
 * and an altered ticket fails the signature. Used by `app/api/footage` and
 * `app/api/become`.
 */
import crypto from 'node:crypto';

function secret(): string {
  return process.env.FAL_TICKET_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.FAL_KEY || '';
}

export function seal<T extends object>(ticket: T): string {
  const body = Buffer.from(JSON.stringify(ticket)).toString('base64url');
  const mark = crypto.createHmac('sha256', secret()).update(body).digest('base64url');
  return `${body}.${mark}`;
}

export function unseal<T extends object>(sealed: string): T | null {
  const [body, mark] = sealed.split('.');
  if (!body || !mark || !secret()) return null;
  const want = crypto.createHmac('sha256', secret()).update(body).digest('base64url');
  const a = Buffer.from(mark);
  const b = Buffer.from(want);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    return JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as T;
  } catch {
    return null;
  }
}
