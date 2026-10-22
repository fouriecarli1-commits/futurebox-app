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
import { cleanNote, draftFor, draftText } from '@/app/lib/pairdraft';
import { screen } from '@/app/lib/moderation';
import { guard } from '@/app/lib/server/safety';

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
/** A project where the tick columns have not been added yet (`pairs.sql`, re-run). */
const NO_COLUMN = /42703|PGRST204|column .* does not exist|could not find .* column/i;
const missingColumn = (error: { code?: string; message?: string } | null): boolean =>
  !!error && NO_COLUMN.test(`${error.code ?? ''} ${error.message ?? ''}`);

/** The stored side ('half', 'a', 'b') as the caller reads it. */
const paysFor = (row: { a: string; pays?: unknown }, caller: string): 'half' | 'me' | 'them' => {
  if (row.pays !== 'a' && row.pays !== 'b') return 'half';
  return (row.pays === 'a') === (row.a === caller) ? 'me' : 'them';
};

const ordered = (one: string, two: string): [string, string] =>
  (one < two ? [one, two] : [two, one]);

export async function GET(request: Request): Promise<Response> {
  const caller = await callerFrom(request);
  const client = admin();
  if (!caller || !client) return Response.json({ ...NOT_SET_UP, signedIn: false });
  if (!filterSafe(caller.id)) return Response.json({ ...NOT_SET_UP, message: 'Not a caller this app made.' });

  /* With the two approval ticks when the columns are there; without them,
     and saying so, when `pairs.sql` has not been re-run since they were
     added — the rooms still open, they just cannot hold a yes yet. */
  let approvals = true;
  /* And the song so far, once its columns are there too — the same
     stepping down, one set of columns at a time. */
  let drafts = true;
  /* And who pays, once that column is there as well. */
  let payments = true;
  let read = await client
    .from('pairs')
    .select('id, surface, a, b, pen, pen_at, pen_wanted, ok_a, ok_b, draft, draft_at, pays')
    .or(`a.eq.${caller.id},b.eq.${caller.id}`)
    .order('created_at', { ascending: false });
  if (missingColumn(read.error)) {
    payments = false;
    read = await client
      .from('pairs')
      .select('id, surface, a, b, pen, pen_at, pen_wanted, ok_a, ok_b, draft, draft_at')
      .or(`a.eq.${caller.id},b.eq.${caller.id}`)
      .order('created_at', { ascending: false }) as typeof read;
  }
  if (missingColumn(read.error)) {
    drafts = false;
    read = await client
      .from('pairs')
      .select('id, surface, a, b, pen, pen_at, pen_wanted, ok_a, ok_b')
      .or(`a.eq.${caller.id},b.eq.${caller.id}`)
      .order('created_at', { ascending: false }) as typeof read;
  }
  if (missingColumn(read.error)) {
    approvals = false;
    read = await client
      .from('pairs')
      .select('id, surface, a, b, pen, pen_at, pen_wanted')
      .or(`a.eq.${caller.id},b.eq.${caller.id}`)
      .order('created_at', { ascending: false }) as typeof read;
  }
  const { data: rows, error } = read;
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
        withName: who?.name || (who?.handle ? `@${who.handle}` : 'someone'),
        withHandle: who?.handle || '',
        mine: row.pen === caller.id,
        wanted: Boolean(row.pen_wanted) && row.pen_wanted !== caller.id,
        penAt: row.pen_at,
        theirLink: links.get(`${row.id}:${other}`),
        myLink: links.get(`${row.id}:${caller.id}`),
        approvals,
        okMine: approvals ? Boolean(row.a === caller.id ? row.ok_a : row.ok_b) : false,
        okTheirs: approvals ? Boolean(row.a === caller.id ? row.ok_b : row.ok_a) : false,
        drafts,
        draft: drafts ? draftFor(row.surface, row.draft) : null,
        draftAt: drafts && row.draft_at ? new Date(row.draft_at).toISOString() : '',
        /* The note left with the turn, kept in the same column as the song
           (`draft.note`), and whose it is — each side shows the other's. */
        note: drafts ? cleanNote((row.draft as { note?: unknown } | null)?.note) : '',
        noteMine: drafts ? (row.draft as { noteBy?: unknown } | null)?.noteBy === caller.id : false,
        /* Who pays for the song: half each, me, or them. */
        payments,
        pays: payments ? paysFor(row as { a: string; pays?: unknown }, caller.id) : 'half',
      };
    }),
  });
}

export async function POST(request: Request): Promise<Response> {
  const caller = await callerFrom(request);
  const client = admin();
  if (!caller || !client) return Response.json({ message: 'Sign in first.' }, { status: 401 });
  if (!filterSafe(caller.id)) return Response.json({ message: 'Not a caller this app made.' }, { status: 400 });

  let body: { what?: string; collab?: string; surface?: string; id?: string; link?: string; platform?: string; handle?: string; yes?: boolean; draft?: unknown; note?: unknown; pays?: string };
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
        withName: who?.name || (who?.handle ? `@${who.handle}` : 'someone'),
        withHandle: who?.handle || '',
        mine: row.pen === caller.id,
        wanted: Boolean(row.pen_wanted) && row.pen_wanted !== caller.id,
        penAt: row.pen_at,
      },
    });
  }

  /* ── The pen ───────────────────────────────────────────────────────── */
  if (body.what === 'pen_ask' || body.what === 'pen_give' || body.what === 'draft') {
    const id = String(body.id ?? '').trim();
    if (!filterSafe(id)) return Response.json({ message: 'Which room?' }, { status: 400 });
    const { data: row, error } = await client
      .from('pairs').select('id, a, b, pen, surface').eq('id', id).maybeSingle();
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

    /* The song so far, saved as it is written so the other person watches it
       arrive. Only from the hand holding the pen: the one waiting can type,
       but what they type is not the room's until it is their turn. */
    const draft = draftFor(row.surface, body.draft);
    const at = new Date().toISOString();
    if (body.what === 'draft') {
      if (row.pen !== caller.id) {
        return Response.json({ message: 'It is their turn — what you write is kept once the turn is yours.' }, { status: 403 });
      }
      if (!draft) return Response.json({ message: 'Nothing in this room travels between you yet.' }, { status: 400 });
      /* The fixed rules on every save, because this is the other person's
         screen filling up as it is typed. The model's reading waits for the
         handover — saved every two seconds, it would be a model call per
         pause in somebody's typing. */
      const ruled = screen(draftText(draft), 'room');
      if (ruled) return Response.json({ message: ruled.message, rule: ruled.rule }, { status: 422 });
      /* The note left with the last turn stays until the next handover. */
      const { data: was } = await client.from('pairs').select('draft').eq('id', id).maybeSingle();
      const kept = (was?.draft ?? {}) as { note?: unknown; noteBy?: unknown };
      /* Built apart from the update: these are keys inside the draft's JSON,
         not columns (`check:sqlcolumns` reads an update's keys as columns). */
      const merged = kept.note ? { ...draft, note: kept.note, noteBy: kept.noteBy } : draft;
      const { error: draftError } = await client
        .from('pairs')
        .update({ draft: merged, draft_at: at })
        .eq('id', id);
      if (missingColumn(draftError)) {
        return Response.json(
          { message: 'Sharing the song as you write is not switched on yet — supabase/pairs.sql needs to be run again.', notSetUp: true },
          { status: 503 },
        );
      }
      if (draftError) return Response.json(NOT_SET_UP, { status: 503 });
      return Response.json({ ok: true, draftAt: at });
    }

    /* Giving, and only giving. There is no route that takes the pen out of
       somebody's hand — the person working is the person who decides when
       they have stopped, and a room where it can be snatched is a room where
       your take can be interrupted by somebody who got impatient. */
    if (row.pen !== caller.id) {
      return Response.json({ message: 'You are not the one holding it.' }, { status: 403 });
    }
    const other = row.a === caller.id ? row.b : row.a;
    /* The ticks go with the turn: what they approved is about to change in
       somebody else's hands, so a yes given before is not a yes to that. */
    /* And the song goes with it, so the turn arrives at the page as it was
       left. Stepped down a set of columns at a time on a project that has
       not re-run `pairs.sql`: the turn still moves, and the answer says
       whether the words went too. */
    /* The note bar: a line or two for the other person, handed over with
       the song (the owner, 21 October 2026: "'n notabalk waar iemand 'n nota
       kan los"). The song and the note go past the whole gate here — the
       rules and the model's reading — because this is the press that puts
       them in front of somebody else: "harmful musiekwoorde en notas" are
       refused before they arrive. */
    const note = cleanNote(body.note);
    const allowed = await guard(request, draftText(draft, note), 'room', caller);
    if (!allowed.ok) return allowed.response;
    const handOver = { pen: other, pen_at: at, pen_wanted: null };
    const carried = draft ? { ...draft, ...(note ? { note, noteBy: caller.id } : {}) } : null;
    const tries: Record<string, unknown>[] = [
      ...(carried ? [{ ...handOver, ok_a: false, ok_b: false, draft: carried, draft_at: at }] : []),
      { ...handOver, ok_a: false, ok_b: false },
      handOver,
    ];
    let giveError: { code?: string; message?: string } | null = null;
    let used = 0;
    for (; used < tries.length; used += 1) {
      ({ error: giveError } = await client.from('pairs').update(tries[used]).eq('id', id));
      if (!missingColumn(giveError)) break;
    }
    if (giveError) return Response.json(NOT_SET_UP, { status: 503 });
    return Response.json({ ok: true, draftSent: Boolean(draft) && used === 0 });
  }

  /* ── A yes to the song as it stands, or taking it back ──────────────── */
  if (body.what === 'approve') {
    const id = String(body.id ?? '').trim();
    if (!filterSafe(id)) return Response.json({ message: 'Which room?' }, { status: 400 });
    const { data: row, error } = await client
      .from('pairs').select('id, a, b').eq('id', id).maybeSingle();
    if (error) return Response.json(NOT_SET_UP, { status: 503 });
    if (!row || (row.a !== caller.id && row.b !== caller.id)) {
      return Response.json({ message: 'That room is not yours.' }, { status: 403 });
    }
    const field = row.a === caller.id ? 'ok_a' : 'ok_b';
    const { error: approveError } = await client
      .from('pairs').update({ [field]: body.yes !== false }).eq('id', id);
    if (missingColumn(approveError)) {
      return Response.json(
        { message: 'Approving together is not switched on yet — supabase/pairs.sql needs to be run again.' },
        { status: 503 },
      );
    }
    if (approveError) return Response.json(NOT_SET_UP, { status: 503 });
    return Response.json({ ok: true });
  }

  /* ── Who pays for the song ──────────────────────────────────────────

     The owner, 21 October 2026: *"Ja, verdeel dit half-half, en gee die
     opsie van 1 persoon wat alles dra."* Half each, or "I pay it all" — and
     only ever for yourself: nobody can put the whole bill on somebody else.
     Either way both ticks are cleared, because a yes was a yes to the song
     at the price it had. */
  if (body.what === 'pays') {
    const id = String(body.id ?? '').trim();
    if (!filterSafe(id)) return Response.json({ message: 'Which room?' }, { status: 400 });
    const { data: row, error } = await client
      .from('pairs').select('id, a, b').eq('id', id).maybeSingle();
    if (error) return Response.json(NOT_SET_UP, { status: 503 });
    if (!row || (row.a !== caller.id && row.b !== caller.id)) {
      return Response.json({ message: 'That room is not yours.' }, { status: 403 });
    }
    const pays = body.pays === 'me' ? (row.a === caller.id ? 'a' : 'b') : 'half';
    const { error: paysError } = await client
      .from('pairs').update({ pays, ok_a: false, ok_b: false }).eq('id', id);
    if (missingColumn(paysError)) {
      return Response.json(
        { message: 'Splitting the cost is not switched on yet — supabase/pairs.sql needs to be run again.' },
        { status: 503 },
      );
    }
    if (paysError) return Response.json(NOT_SET_UP, { status: 503 });
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
