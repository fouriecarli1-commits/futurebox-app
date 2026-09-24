/**
 * A room two people share, and the pen that says whose turn it is.
 *
 * ── The rules that live here and not in the browser ──────────────────────
 *
 * - **A pair cannot exist without an accepted collab.** Nobody can be pulled
 *   into a room: the only way a row gets made is with a `collabs` id that is
 *   already `accepted`, and the caller has to be one of its two people.
 * - **Only the holder may hand the pen over.** Taking it from somebody is
 *   not a thing this route does. The other side asks, and the holder gives.
 * - **A link is read before it is stored.** What goes in the table is the
 *   platform the reader returned and an address rebuilt from its own parts
 *   — never the label the sender chose, which is a label that can say
 *   "Instagram" over an address that goes somewhere else.
 */

import { admin, callerFrom } from '@/app/lib/server/account';
import { filterSafe } from '@/app/lib/server/filtersafe';
import { SURFACE_IDS, type SurfaceId } from '@/app/lib/surfaces';
import { readHandle, readShareLink } from '@/app/lib/sociallink';

const NOT_SET_UP = {
  ready: false,
  pairs: [],
  message: 'Working in a room together is not switched on for this app yet — supabase/pairs.sql has not been run.',
};

/**
 * The rooms two people may share.
 *
 * The rooms where something is MADE, which is what she asked for: *"elke
 * kamer waarin create word."* Live, the channel list, the hooks feed and the
 * collab desk itself are not places two people make one thing, so a pair in
 * them would be a strip drawn over a room with nothing to take turns at.
 */
const PAIRABLE: readonly SurfaceId[] = [
  'make', 'studio', 'booth', 'canvas', 'voice_studio', 'sound', 'podcast', 'campaign', 'albumart',
];

/** Their two ids, in the order the table stores them. */
const ordered = (one: string, two: string): [string, string] =>
  (one < two ? [one, two] : [two, one]);

export async function GET(request: Request): Promise<Response> {
  const caller = await callerFrom(request);
  const client = admin();
  if (!caller || !client) return Response.json({ ...NOT_SET_UP, signedIn: false });
  if (!filterSafe(caller.id)) return Response.json({ ...NOT_SET_UP, message: 'Not a caller this app made.' });

  const { data: rows, error } = await client
    .from('pairs')
    .select('id, surface, a, b, pen, pen_at, pen_wanted')
    .or(`a.eq.${caller.id},b.eq.${caller.id}`)
    .order('created_at', { ascending: false });
  /* A missing table is not an empty list. The collab room learned this the
     hard way: "no collaborations yet" and "the tables were never created"
     look identical from a chair, and one of them is a feature that has been
     switched off for weeks without anybody noticing. */
  if (error) return Response.json(NOT_SET_UP, { status: 503 });

  const mine = rows ?? [];
  const others = mine.map((row) => (row.a === caller.id ? row.b : row.a));
  /**
   * True when the detail about these rooms could not be read.
   *
   * One flag for both reads below, because they share a remedy: try again in
   * a moment. Said rather than swallowed, for the reason the sign-in screen
   * was fixed for on the same day — "they left no link" and "we could not
   * find out" look identical and are not the same, and the second is the one
   * way two people in a room have of reaching each other.
   *
   * Naming these in `check:couldnotask` instead would have needed its
   * ratchet raised, and that constant says in as many words that it may go
   * down and must never go up. It is a good rule. So they are fixed.
   */
  let detailUnread = false;

  const names = new Map<string, { name: string; handle: string }>();
  if (others.length) {
    const { data: creators, error: nameError } = await client
      .from('creators')
      .select('owner, name, handle')
      .in('owner', others);
    if (nameError) detailUnread = true;
    for (const one of (creators ?? []) as { owner: string; name: string; handle: string }[]) {
      names.set(one.owner, { name: one.name, handle: one.handle });
    }
  }

  const links = new Map<string, { platform: string; url: string; shown: string }>();
  if (mine.length) {
    const { data: shared, error: linkError } = await client
      .from('pair_links')
      .select('pair, owner, platform, url, shown')
      .in('pair', mine.map((row) => row.id));
    if (linkError) detailUnread = true;
    for (const one of (shared ?? []) as { pair: string; owner: string; platform: string; url: string; shown: string }[]) {
      links.set(`${one.pair}:${one.owner}`, { platform: one.platform, url: one.url, shown: one.shown });
    }
  }

  return Response.json({
    ready: true,
    signedIn: true,
    detailUnread,
    pairs: mine.map((row) => {
      const other = row.a === caller.id ? row.b : row.a;
      const who = names.get(other);
      return {
        id: row.id,
        surface: row.surface,
        withName: who?.name || 'someone',
        withHandle: who?.handle || '',
        mine: row.pen === caller.id,
        wanted: Boolean(row.pen_wanted) && row.pen_wanted !== caller.id,
        penAt: row.pen_at,
        theirLink: links.get(`${row.id}:${other}`),
        myLink: links.get(`${row.id}:${caller.id}`),
      };
    }),
  });
}

export async function POST(request: Request): Promise<Response> {
  const caller = await callerFrom(request);
  const client = admin();
  if (!caller || !client) return Response.json({ message: 'Sign in first.' }, { status: 401 });
  if (!filterSafe(caller.id)) return Response.json({ message: 'Not a caller this app made.' }, { status: 400 });

  let body: { what?: string; collab?: string; surface?: string; id?: string; link?: string; platform?: string; handle?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ message: 'That was not readable.' }, { status: 400 });
  }

  /* ── Open the room ─────────────────────────────────────────────────── */
  if (body.what === 'open') {
    const collab = String(body.collab ?? '').trim();
    const surface = String(body.surface ?? '') as SurfaceId;
    if (!filterSafe(collab)) return Response.json({ message: 'Which agreement?' }, { status: 400 });
    if (!PAIRABLE.includes(surface)) {
      return Response.json({ message: 'That is not a room two people make something in.' }, { status: 400 });
    }

    /* The agreement, read rather than trusted. This is the whole of the rule
       that nobody can pull you into a room, so it is one query and not a
       flag on the request. */
    const { data: agreed, error: collabError } = await client
      .from('collabs')
      .select('id, asked_by, asked_of, state')
      .eq('id', collab)
      .maybeSingle();
    if (collabError) return Response.json(NOT_SET_UP, { status: 503 });
    if (!agreed || agreed.state !== 'accepted') {
      return Response.json({ message: 'That is not an agreement both of you have accepted.' }, { status: 403 });
    }
    if (agreed.asked_by !== caller.id && agreed.asked_of !== caller.id) {
      return Response.json({ message: 'That agreement is not yours.' }, { status: 403 });
    }

    const [a, b] = ordered(agreed.asked_by, agreed.asked_of);
    /* Whoever opens it starts with the pen. Not the asker and not the older
       account: the person who just pressed the button is the one about to
       do something, and handing it to the other one would mean the room
       opens with both of them unable to act. */
    const { data: made, error: madeError } = await client
      .from('pairs')
      .upsert(
        { collab, a, b, surface, pen: caller.id, pen_at: new Date().toISOString(), pen_wanted: null },
        { onConflict: 'a,b,surface', ignoreDuplicates: true },
      )
      .select('id, surface, a, b, pen, pen_at, pen_wanted')
      .maybeSingle();
    if (madeError) return Response.json(NOT_SET_UP, { status: 503 });

    /* `ignoreDuplicates` answers nothing when the room was already there,
       which is the ordinary case of walking back into it. Read it back
       rather than treating that as a failure — and rather than overwriting
       the pen, which would take it out of the other person's hand every
       time somebody opened the door. */
    const row = made ?? (await client
      .from('pairs')
      .select('id, surface, a, b, pen, pen_at, pen_wanted')
      .eq('a', a).eq('b', b).eq('surface', surface)
      .maybeSingle()).data;
    if (!row) return Response.json(NOT_SET_UP, { status: 503 });

    const other = row.a === caller.id ? row.b : row.a;
    const { data: who } = await client
      .from('creators').select('name, handle').eq('owner', other).maybeSingle();
    return Response.json({
      pair: {
        id: row.id,
        surface: row.surface,
        withName: who?.name || 'someone',
        withHandle: who?.handle || '',
        mine: row.pen === caller.id,
        wanted: Boolean(row.pen_wanted) && row.pen_wanted !== caller.id,
        penAt: row.pen_at,
      },
    });
  }

  /* ── The pen ───────────────────────────────────────────────────────── */
  if (body.what === 'pen_ask' || body.what === 'pen_give') {
    const id = String(body.id ?? '').trim();
    if (!filterSafe(id)) return Response.json({ message: 'Which room?' }, { status: 400 });
    const { data: row, error } = await client
      .from('pairs').select('id, a, b, pen').eq('id', id).maybeSingle();
    if (error) return Response.json(NOT_SET_UP, { status: 503 });
    if (!row || (row.a !== caller.id && row.b !== caller.id)) {
      return Response.json({ message: 'That room is not yours.' }, { status: 403 });
    }

    if (body.what === 'pen_ask') {
      if (row.pen === caller.id) return Response.json({ ok: true, mine: true });
      const { error: askError } = await client
        .from('pairs').update({ pen_wanted: caller.id }).eq('id', id);
      if (askError) return Response.json(NOT_SET_UP, { status: 503 });
      return Response.json({ ok: true });
    }

    /* Giving, and only giving. There is no route that takes the pen out of
       somebody's hand — the person working is the person who decides when
       they have stopped, and a room where it can be snatched is a room where
       your take can be interrupted by somebody who got impatient. */
    if (row.pen !== caller.id) {
      return Response.json({ message: 'You are not the one holding it.' }, { status: 403 });
    }
    const other = row.a === caller.id ? row.b : row.a;
    const { error: giveError } = await client
      .from('pairs')
      .update({ pen: other, pen_at: new Date().toISOString(), pen_wanted: null })
      .eq('id', id);
    if (giveError) return Response.json(NOT_SET_UP, { status: 503 });
    return Response.json({ ok: true });
  }

  /* ── One address, or one handle ────────────────────────────────────── */
  if (body.what === 'link') {
    const id = String(body.id ?? '').trim();
    if (!filterSafe(id)) return Response.json({ message: 'Which room?' }, { status: 400 });
    const { data: row, error } = await client
      .from('pairs').select('id, a, b').eq('id', id).maybeSingle();
    if (error) return Response.json(NOT_SET_UP, { status: 503 });
    if (!row || (row.a !== caller.id && row.b !== caller.id)) {
      return Response.json({ message: 'That room is not yours.' }, { status: 403 });
    }

    const given = body.link
      ? readShareLink(String(body.link).slice(0, 500))
      : readHandle(String(body.platform ?? ''), String(body.handle ?? '').slice(0, 60));
    if ('ok' in given) {
      const why: Record<string, string> = {
        empty: 'Put an address or a handle in first.',
        not_a_link: 'That is not an address. Paste the whole thing, or give a handle instead.',
        not_listed: 'Links here go to YouTube, TikTok, Instagram, WhatsApp, Facebook, Vimeo, Spotify, Apple Music or SoundCloud — so the other person knows where they are going before they press it.',
        bad_handle: 'A handle is letters, numbers, dots, dashes and underscores.',
        bad_platform: 'Say which platform that handle is on.',
      };
      return Response.json({ message: why[given.why] ?? why.not_a_link }, { status: 400 });
    }

    const { error: wrote } = await client.from('pair_links').upsert(
      { pair: id, owner: caller.id, platform: given.platform, url: given.url, shown: given.shown },
      { onConflict: 'pair,owner' },
    );
    if (wrote) return Response.json(NOT_SET_UP, { status: 503 });
    return Response.json({ ok: true, shared: given });
  }

  return Response.json({ message: 'That is not something this room does.' }, { status: 400 });
}
