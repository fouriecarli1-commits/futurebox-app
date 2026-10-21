/**
 * A Cubed³ presenter's own registration, opened by the key in their link.
 *
 *   GET    what they have filled in so far, what they signed, and what they uploaded
 *   PUT    { details }                      keep what they have typed (until signed)
 *   POST   { sign: { details, signature, agreed, terms } }   sign the agreement
 *   POST   { upload: { slot, name, type, size } }           a signed upload, once signed
 *   PUT    { link: { slot, url } }          a link to a file too big to upload
 *   DELETE ?path=…                          take back one of their own files
 *
 * No account: the key is the access (see `lib/server/cubedhost.ts`). Every
 * path a presenter can touch starts with their own row's id, so a key opens
 * its own files and nobody else's.
 */

import { admin, metered } from '@/app/lib/server/account';
import { configured, OWNER, send } from '@/app/lib/server/email';
import {
  BUCKET, allFiles, cleanSignature, filesIn, hostFrom, siteOf, whereFrom, type HostRow,
} from '@/app/lib/server/cubedhost';
import {
  TERMS_VERSION, cleanDetails, cleanLink, fits, problemsWith, safeName, slotOf,
} from '@/app/lib/cubedhost';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SAID = {
  missing: 'This link does not open a registration. Ask FutureBox for a new one.',
  revoked: 'This link has been switched off. Ask FutureBox for a new one.',
  not_ready: 'Registrations are not set up yet. Please try again later.',
} as const;

async function opened(request: Request): Promise<{ row: HostRow; client: NonNullable<ReturnType<typeof admin>> } | Response> {
  if (!metered()) return Response.json({ error: 'not_ready', message: SAID.not_ready }, { status: 503 });
  const client = admin();
  if (!client) return Response.json({ error: 'not_ready', message: SAID.not_ready }, { status: 503 });
  const found = await hostFrom(request, client);
  if ('why' in found) {
    return Response.json({ error: found.why, message: SAID[found.why] }, { status: found.why === 'not_ready' ? 503 : 404 });
  }
  return { row: found.row, client };
}

const shown = (row: HostRow, kept: { files: Record<string, unknown>; unread: boolean }): Record<string, unknown> => ({
  ready: true,
  email: row.email,
  details: cleanDetails(row.details),
  savedAt: row.saved_at,
  signedAt: row.signed_at,
  termsVersion: row.terms_version,
  signature: row.signature,
  links: row.links ?? {},
  files: kept.files,
  /* Said apart from an empty block: "nothing uploaded" would be a lie the day storage is slow. */
  filesUnread: kept.unread,
});

async function body(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const got = await request.json();
    return got && typeof got === 'object' && !Array.isArray(got) ? got as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

export async function GET(request: Request): Promise<Response> {
  const open = await opened(request);
  if (open instanceof Response) return open;
  const { row, client } = open;
  if (!row.opened_at) await client.from('cubed_hosts').update({ opened_at: new Date().toISOString() }).eq('id', row.id);
  return Response.json(shown(row, await allFiles(client, row.id)));
}

export async function PUT(request: Request): Promise<Response> {
  const open = await opened(request);
  if (open instanceof Response) return open;
  const { row, client } = open;
  const got = await body(request);
  if (!got) return Response.json({ error: 'bad_request' }, { status: 400 });

  /* A link to a file kept elsewhere — a video too big for the upload. */
  if (got.link && typeof got.link === 'object') {
    const ask = got.link as { slot?: unknown; url?: unknown };
    const slot = slotOf(ask.slot);
    if (!slot) return Response.json({ error: 'bad_slot' }, { status: 400 });
    if (!row.signed_at) return Response.json({ error: 'sign_first', message: 'Sign the agreement first, then the upload blocks open.' }, { status: 409 });
    const url = cleanLink(ask.url);
    if (ask.url && !url) return Response.json({ error: 'bad_link', message: 'That has to be a full https:// link.' }, { status: 422 });
    const links = { ...(row.links ?? {}) } as Record<string, string>;
    if (url) links[slot.id] = url;
    else delete links[slot.id];
    const { error } = await client.from('cubed_hosts').update({ links }).eq('id', row.id);
    if (error) return Response.json({ error: 'failed', message: 'That could not be kept just now.' }, { status: 500 });
    return Response.json({ ok: true, links });
  }

  /* What they have typed, kept as they go — until they sign. */
  if (row.signed_at) return Response.json({ error: 'signed', message: 'This registration is signed. Ask FutureBox to reopen it if something needs to change.' }, { status: 409 });
  const details = cleanDetails(got.details);
  const at = new Date().toISOString();
  const { error } = await client.from('cubed_hosts').update({ details, saved_at: at }).eq('id', row.id);
  if (error) return Response.json({ error: 'failed', message: 'That could not be kept just now.' }, { status: 500 });
  return Response.json({ ok: true, savedAt: at });
}

export async function POST(request: Request): Promise<Response> {
  const open = await opened(request);
  if (open instanceof Response) return open;
  const { row, client } = open;
  const got = await body(request);
  if (!got) return Response.json({ error: 'bad_request' }, { status: 400 });

  /* ── Signing ── */
  if (got.sign && typeof got.sign === 'object') {
    if (row.signed_at) return Response.json({ error: 'signed', message: 'This registration is already signed.' }, { status: 409 });
    const ask = got.sign as { details?: unknown; signature?: unknown; agreed?: unknown; terms?: unknown };
    const details = cleanDetails(ask.details);
    const problems = problemsWith(details);
    if (Object.keys(problems).length) {
      return Response.json({ error: 'incomplete', message: 'Some details are still missing.', problems }, { status: 422 });
    }
    if (ask.agreed !== true) return Response.json({ error: 'not_agreed', message: 'Tick that you have read and agree to the terms.' }, { status: 422 });
    if (ask.terms !== TERMS_VERSION) {
      return Response.json({ error: 'terms_changed', message: 'The terms were updated while you had the page open. Reload it, read them again and sign.' }, { status: 409 });
    }
    const signature = cleanSignature(ask.signature);
    if (!signature) return Response.json({ error: 'no_signature', message: 'Sign on the pad first.' }, { status: 422 });
    const where = whereFrom(request);
    const at = new Date().toISOString();
    const { error } = await client
      .from('cubed_hosts')
      .update({
        details, saved_at: at, signed_at: at, terms_version: TERMS_VERSION, signature,
        signed_ip_hash: where.ipHash || null, signed_agent: where.agent || null,
      })
      .eq('id', row.id)
      .is('signed_at', null);
    if (error) return Response.json({ error: 'failed', message: 'That could not be signed just now. Please try again.' }, { status: 500 });

    /* It lands on her side: the inbox always, and a letter when mail is set up. */
    if (configured()) {
      void send({
        kind: 'cubed_signed',
        once: `cubed_signed:${row.id}:${at}`,
        to: OWNER(),
        subject: `Cubed³ registration signed: ${details.stageName || details.legalName}`,
        text: `${details.stageName || details.legalName} signed the Cubed³ presenter agreement for “${details.classTitle}”.\n\nOpen the presenter inbox to see it: ${siteOf(request)}/cubed/hosts`,
      });
    }
    return Response.json({ ok: true, signedAt: at });
  }

  /* ── An upload, straight to storage ── */
  if (got.upload && typeof got.upload === 'object') {
    if (!row.signed_at) return Response.json({ error: 'sign_first', message: 'Sign the agreement first, then the upload blocks open.' }, { status: 409 });
    const ask = got.upload as { slot?: unknown; name?: unknown; type?: unknown };
    const slot = slotOf(ask.slot);
    if (!slot) return Response.json({ error: 'bad_slot' }, { status: 400 });
    const type = typeof ask.type === 'string' ? ask.type : '';
    if (!fits(slot, type)) {
      return Response.json({
        error: 'wrong_kind',
        message: slot.kind === 'photo' ? 'This block takes photographs (JPG, PNG, WebP or HEIC).' : 'This block takes video files.',
      }, { status: 422 });
    }
    const already = await filesIn(client, row.id, slot.id);
    if (!already) return Response.json({ error: 'unread', message: 'The upload block could not be read just now. Please try again.' }, { status: 503 });
    if (already.length >= slot.most) {
      return Response.json({ error: 'full', message: `This block holds ${slot.most} files. Remove one to add another.` }, { status: 409 });
    }
    const path = `${row.id}/${slot.id}/${Date.now()}-${safeName(typeof ask.name === 'string' ? ask.name : 'file')}`;
    const { data, error } = await client.storage.from(BUCKET).createSignedUploadUrl(path);
    if (error || !data) return Response.json({ error: 'no_upload', message: 'Uploads are not set up yet. Please try again later.' }, { status: 503 });
    return Response.json({ bucket: BUCKET, path, token: data.token });
  }

  return Response.json({ error: 'bad_request' }, { status: 400 });
}

export async function DELETE(request: Request): Promise<Response> {
  const open = await opened(request);
  if (open instanceof Response) return open;
  const { row, client } = open;
  const path = new URL(request.url).searchParams.get('path') ?? '';
  const [id, slot, name, more] = path.split('/');
  if (id !== row.id || !slotOf(slot) || !name || more !== undefined || name.includes('..')) {
    return Response.json({ error: 'bad_request' }, { status: 400 });
  }
  const { error } = await client.storage.from(BUCKET).remove([path]);
  if (error) return Response.json({ error: 'failed', message: 'That could not be removed just now.' }, { status: 500 });
  return Response.json({ ok: true });
}
