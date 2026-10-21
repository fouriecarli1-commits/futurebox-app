/**
 * The owner's side of Cubed³ presenter registrations.
 *
 *   GET    ?peek=1          { owner: true } — whether to show her the inbox button
 *   GET                     every invitation, newest first, in a line each
 *   GET    ?id=…            one in full: details, signature, files, links
 *   GET    ?file=…          a short-lived download address for one file
 *   POST   { emails, note } invite: a row and a link per address, mailed when mail is set up
 *   PATCH  { id, action }   relink | revoke | restore | reopen
 *   DELETE ?id=…            the registration and every file in it, gone
 *
 * Behind the owner's door (`lib/server/ownerdoor.ts`), which answers 404 to
 * anybody else. The owner, 21 October 2026: *"die registrasie moet weer aan my
 * kant land."*
 */

import { admin, callerFrom } from '@/app/lib/server/account';
import { opened } from '@/app/lib/server/ownerdoor';
import { configured, send } from '@/app/lib/server/email';
import {
  BUCKET, ROW, allFiles, hashKey, linkFor, newKey, siteOf, type HostRow,
} from '@/app/lib/server/cubedhost';
import { cleanDetails } from '@/app/lib/cubedhost';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MOST_AT_ONCE = 30;
const EMAIL = /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/;

const notReady = (): Response =>
  Response.json({ error: 'not_ready', message: 'The presenter table is not there yet: run supabase/cubedhosts.sql.' }, { status: 503 });

function letter(link: string, note: string): string {
  return [
    'Hello,',
    '',
    'You are invited to present a Cubed³ masterclass on FutureBox.',
    note ? `\n${note}\n` : '',
    'Register here. The link is yours alone, so please do not share it:',
    '',
    link,
    '',
    'The page explains every step: your details and the agreement, what to record, and where to upload it. You can stop and come back with the same link at any time.',
    '',
    'We look forward to working with you.',
  ].filter((line, i, all) => !(line === '' && all[i - 1] === '')).join('\n');
}

export async function GET(request: Request): Promise<Response> {
  const door = await opened(request);
  if (!door.open) return door.answer;
  const url = new URL(request.url);
  if (url.searchParams.get('peek')) return Response.json({ owner: true });
  const client = admin();
  if (!client) return notReady();

  /* One file, to download. */
  const file = url.searchParams.get('file');
  if (file) {
    if (!/^[0-9a-f-]{36}\/[a-z0-9]+\/[^/]+$/.test(file) || file.includes('..')) return Response.json({ error: 'bad_request' }, { status: 400 });
    const { data, error } = await client.storage.from(BUCKET).createSignedUrl(file, 60 * 60, { download: true });
    if (error || !data) return Response.json({ error: 'gone', message: 'That file is not there any more.' }, { status: 404 });
    return Response.json({ url: data.signedUrl });
  }

  /* One registration, in full. */
  const id = url.searchParams.get('id');
  if (id) {
    if (!/^[0-9a-f-]{36}$/.test(id)) return Response.json({ error: 'bad_request' }, { status: 400 });
    const { data, error } = await client.from('cubed_hosts').select(ROW).eq('id', id).maybeSingle();
    if (error) return error.code === '42P01' ? notReady() : Response.json({ error: 'failed' }, { status: 500 });
    if (!data) return Response.json({ error: 'gone' }, { status: 404 });
    const row = data as HostRow;
    const kept = await allFiles(client, row.id);
    return Response.json({ ...row, details: cleanDetails(row.details), files: kept.files, filesUnread: kept.unread });
  }

  /* Every invitation, a line each. */
  const { data, error } = await client
    .from('cubed_hosts')
    .select('id, email, note, created_at, opened_at, saved_at, signed_at, revoked_at, details')
    .order('created_at', { ascending: false })
    .limit(300);
  if (error) return error.code === '42P01' ? notReady() : Response.json({ error: 'failed' }, { status: 500 });
  const hosts = (data ?? []).map((row) => {
    const details = cleanDetails(row.details);
    return {
      id: row.id, email: row.email, note: row.note, createdAt: row.created_at, openedAt: row.opened_at,
      savedAt: row.saved_at, signedAt: row.signed_at, revokedAt: row.revoked_at,
      name: details.stageName || details.legalName, classTitle: details.classTitle,
    };
  });
  return Response.json({ ready: true, hosts, mail: configured() });
}

export async function POST(request: Request): Promise<Response> {
  const door = await opened(request);
  if (!door.open) return door.answer;
  const client = admin();
  if (!client) return notReady();
  let got: { emails?: unknown; note?: unknown };
  try {
    got = await request.json();
  } catch {
    return Response.json({ error: 'bad_request' }, { status: 400 });
  }
  const typed = typeof got.emails === 'string' ? got.emails : Array.isArray(got.emails) ? got.emails.join('\n') : '';
  const emails = [...new Set(typed.split(/[\s,;]+/).map((one) => one.trim().toLowerCase()).filter(Boolean))];
  const wrong = emails.filter((one) => !EMAIL.test(one));
  if (!emails.length) return Response.json({ error: 'none', message: 'Type at least one email address.' }, { status: 422 });
  if (wrong.length) return Response.json({ error: 'bad_email', message: `These are not email addresses: ${wrong.join(', ')}` }, { status: 422 });
  if (emails.length > MOST_AT_ONCE) return Response.json({ error: 'too_many', message: `Up to ${MOST_AT_ONCE} at a time.` }, { status: 422 });
  const note = (typeof got.note === 'string' ? got.note : '').trim().slice(0, 200);
  /* Which owner sent it, when it was one of them rather than the secret. */
  const caller = door.as === 'owner' ? await callerFrom(request) : null;
  const by = caller ? caller.id : null;
  const site = siteOf(request);
  const mail = configured();

  const made: { email: string; id: string; link: string; mailed: boolean }[] = [];
  for (const email of emails) {
    const key = newKey();
    const { data, error } = await client
      .from('cubed_hosts')
      .insert({ email, note, key_hash: hashKey(key), created_by: by })
      .select('id')
      .single();
    if (error) return error.code === '42P01' ? notReady() : Response.json({ error: 'failed', message: 'The invitations could not be made just now.', made }, { status: 500 });
    const link = linkFor(site, key);
    let mailed = false;
    if (mail) {
      const sent = await send({ kind: 'cubed_invite', to: email, subject: 'Your invitation to present a FutureBox Cubed³ class', text: letter(link, note) });
      mailed = sent.ok;
    }
    made.push({ email, id: String(data.id), link, mailed });
  }
  return Response.json({ ok: true, made, mail });
}

export async function PATCH(request: Request): Promise<Response> {
  const door = await opened(request);
  if (!door.open) return door.answer;
  const client = admin();
  if (!client) return notReady();
  let got: { id?: unknown; action?: unknown };
  try {
    got = await request.json();
  } catch {
    return Response.json({ error: 'bad_request' }, { status: 400 });
  }
  const id = typeof got.id === 'string' && /^[0-9a-f-]{36}$/.test(got.id) ? got.id : '';
  if (!id) return Response.json({ error: 'bad_request' }, { status: 400 });

  if (got.action === 'relink') {
    const key = newKey();
    const { error } = await client.from('cubed_hosts').update({ key_hash: hashKey(key), revoked_at: null }).eq('id', id);
    if (error) return Response.json({ error: 'failed' }, { status: 500 });
    return Response.json({ ok: true, link: linkFor(siteOf(request), key) });
  }
  const change: Record<string, unknown> | null = got.action === 'revoke'
    ? { revoked_at: new Date().toISOString() }
    : got.action === 'restore'
      ? { revoked_at: null }
      /* Reopened to be changed and signed again: the old signature cannot stand under new details. */
      : got.action === 'reopen'
        ? { signed_at: null, signature: null, terms_version: null, signed_ip: null, signed_agent: null }
        : null;
  if (!change) return Response.json({ error: 'bad_request' }, { status: 400 });
  const { error } = await client.from('cubed_hosts').update(change).eq('id', id);
  if (error) return Response.json({ error: 'failed' }, { status: 500 });
  return Response.json({ ok: true });
}

export async function DELETE(request: Request): Promise<Response> {
  const door = await opened(request);
  if (!door.open) return door.answer;
  const client = admin();
  if (!client) return notReady();
  const id = new URL(request.url).searchParams.get('id') ?? '';
  if (!/^[0-9a-f-]{36}$/.test(id)) return Response.json({ error: 'bad_request' }, { status: 400 });
  /* The files first: a row without files is tidy, files without a row are orphans nobody can find. */
  const kept = await allFiles(client, id);
  if (kept.unread) return Response.json({ error: 'unread', message: 'The files could not be read, so nothing was deleted. Try again.' }, { status: 503 });
  const files = Object.values(kept.files).flat().map((one) => one.path);
  if (files.length) {
    const { error } = await client.storage.from(BUCKET).remove(files);
    if (error) return Response.json({ error: 'failed', message: 'The files could not be removed, so the registration was kept.' }, { status: 500 });
  }
  const { error } = await client.from('cubed_hosts').delete().eq('id', id);
  if (error) return Response.json({ error: 'failed' }, { status: 500 });
  return Response.json({ ok: true });
}
