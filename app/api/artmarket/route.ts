/**
 * Album art by real artists — the one way in and out of the room.
 *
 * ── Why every read goes through here ─────────────────────────────────────
 *
 * The four tables in `supabase/albumart.sql` have row level security on and
 * no policy at all, which in Postgres means the anon key reaches nothing.
 * That is deliberate. The rules in this room are not "your own rows":
 *
 *   a work      is visible to everybody until it sells, then to its buyer
 *   an offer    is readable by exactly two people who are not each other
 *   a delivery  is readable by one person, and the artist who made it
 *   a sale      happens once, and the second press must lose
 *
 * Each of those is a sentence, and a policy that is a sentence is a policy
 * somebody gets subtly wrong. One route, one place to read, one place to be
 * wrong.
 *
 * ── Why the messages are buttons ─────────────────────────────────────────
 *
 * Carli: *"Ek as eienaar van die app moet bewus wees van dit, sodat
 * kunstenaar nie agter my rug kan kunswerk verkoop nie. Daarom net daai
 * buttons."*
 *
 * There is no free text between a buyer and an artist anywhere in this file,
 * and there is nowhere in the schema to put any. A buyer can say one thing —
 * "I want unique art", and which of their own songs it is for. An artist
 * answers with a price and one of four windows. That is the whole vocabulary.
 * It is enough to do the deal and not enough to arrange one elsewhere.
 *
 * ── What this route deliberately does not do ─────────────────────────────
 *
 * It does not take money. `/api/checkout` does, because that is where prices
 * are decided on the server and never read from a request, and the webhook is
 * what marks a work sold or an offer paid. A route that could be told "this
 * is paid for" is a route that will be.
 */

import { admin, callerFrom, callerIsOwner, metered } from '@/app/lib/server/account';
import { filterSafe } from '@/app/lib/server/filtersafe';
import { ART_MAX_BYTES, START_RAND, UNIQUE_RAND, WINDOWS, split } from '@/app/data/artmarket';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const BUCKET = 'art';

/** How long a handed-out address for a picture is good for. */
const LINK_SECONDS = 60 * 60;

const NO_ACCOUNTS = {
  error: 'no_accounts',
  message: 'This app has no accounts, so there is no art market.',
};

interface ArtistRow {
  id: string;
  owner: string;
  name: string;
  about: string;
  place: string;
  avatar: string | null;
  approved: boolean;
}

interface WorkRow {
  id: string;
  artist: string;
  title: string;
  path: string;
  rand: number;
  sold_to: string | null;
  sold_at: string | null;
  /* Null until the owner has actually transferred the artist's share. See
     the statement below, and `supabase/albumart.sql` for why this is one
     column rather than a payouts table: there is one payment per piece and
     one person making it. */
  paid_out?: string | null;
}

interface RequestRow {
  id: string;
  buyer: string;
  artist: string;
  song_id: string;
  song_title: string;
  created_at: string;
}

interface OfferRow {
  id: string;
  request: string;
  rand: number;
  days: number;
  state: 'offered' | 'paid' | 'accepted' | 'delivered' | 'declined';
  path: string | null;
  due_at: string | null;
}

/** A short-lived address for a stored picture, or null when there is none. */
async function look(
  client: ReturnType<typeof admin>,
  path: string | null,
): Promise<string | null> {
  if (!client || !path) return null;
  const { data } = await client.storage.from(BUCKET).createSignedUrl(path, LINK_SECONDS);
  return data?.signedUrl ?? null;
}

/* ─────────────────────────────────────────────────────────────── reading ── */

export async function GET(request: Request): Promise<Response> {
  const client = admin();
  if (!client) return Response.json({ ...NO_ACCOUNTS }, { status: 503 });

  const caller = await callerFrom(request);
  if (!caller) {
    return Response.json({ error: 'signed_out', message: 'Sign in to see the art market.' }, { status: 401 });
  }

  /* The artists first, because everything else is read against them: the
     caller's own artist row decides whether they see an inbox at all. */
  const { data: artistRows, error: artistError } = await client
    .from('art_artists')
    .select('id, owner, name, about, place, avatar, approved')
    .order('created_at', { ascending: true });

  /* A project that has not run `albumart.sql` yet answers with a missing
     table rather than an empty one. The room says so in a line instead of
     showing a gallery that is empty for a reason nobody can guess. */
  if (artistError) {
    return Response.json(
      { error: 'not_set_up', message: 'The art market tables are not in this project yet.' },
      { status: 503 },
    );
  }

  const artists = (artistRows ?? []) as ArtistRow[];
  const byId = new Map(artists.map((one) => [one.id, one]));
  const mine = artists.find((one) => one.owner === caller.id) ?? null;

  /* The error is read rather than shrugged off. `?? []` on a failed read
     draws an empty gallery, which says "our artists have made nothing" to
     somebody looking at a broken database — and nobody reports a room that
     looks merely quiet. */
  const { data: workRows, error: workError } = await client
    .from('art_works')
    .select('id, artist, title, path, rand, sold_to, sold_at, paid_out')
    .order('created_at', { ascending: false });
  if (workError) {
    return Response.json(
      { error: 'not_read', message: 'The gallery could not be read just now.' },
      { status: 503 },
    );
  }
  const works = (workRows ?? []) as WorkRow[];

  /* ── The wall ───────────────────────────────────────────────────────
     Unsold pieces by an approved artist. Sold pieces leave the wall
     entirely rather than being greyed out: her rule is that a piece is
     sold ONCE, and a sold piece still hanging there with a line through
     it is an invitation to ask whether it really is. */
  const wall = await Promise.all(
    works
      .filter((one) => !one.sold_to && byId.get(one.artist)?.approved)
      .map(async (one) => ({
        id: one.id,
        title: one.title,
        rand: one.rand,
        artist: one.artist,
        by: byId.get(one.artist)?.name ?? '',
        url: await look(client, one.path),
      })),
  );

  /* ── What the caller has bought ─────────────────────────────────────
     Off the wall and commissioned, in one list, because from the buyer's
     side there is no difference: it is their picture and they choose
     which song wears it. */
  const bought = await Promise.all(
    works
      .filter((one) => one.sold_to === caller.id)
      .map(async (one) => ({
        id: one.id,
        title: one.title,
        by: byId.get(one.artist)?.name ?? '',
        url: await look(client, one.path),
      })),
  );

  /* ── The two sides of a commission ──────────────────────────────────
     A request is read by its buyer and by the artist it was sent to, and
     by nobody else. Both sides are built here from the same rows so the
     two screens cannot come to disagree about what state a deal is in. */
  /* `or()` takes one string and has no parameterised form, so the filter is
     built by interpolation. Both ids come from us — one from a verified
     token, one from a row we just read — and both are checked anyway, here,
     next to where they are spliced in. A guard two lookups away from its
     use is a guard somebody deletes. */
  const ids = [caller.id, ...(mine ? [mine.id] : [])];
  if (!ids.every(filterSafe)) {
    return Response.json({ error: 'bad_request', message: 'Could not read that.' }, { status: 400 });
  }
  const { data: requestRows, error: requestError } = await client
    .from('art_requests')
    .select('id, buyer, artist, song_id, song_title, created_at')
    .or(`buyer.eq.${caller.id}${mine ? `,artist.eq.${mine.id}` : ''}`)
    .order('created_at', { ascending: false });
  /* Same reason as the gallery, and sharper: an empty list here says "you
     have asked nobody for anything", to somebody who is waiting on a piece
     they have already paid for. */
  if (requestError) {
    return Response.json(
      { error: 'not_read', message: 'Your commissions could not be read just now.' },
      { status: 503 },
    );
  }
  const requests = (requestRows ?? []) as RequestRow[];

  const offerRows = requests.length
    ? ((
        await client
          .from('art_offers')
          .select('id, request, rand, days, state, path, due_at')
          .in(
            'request',
            requests.map((one) => one.id),
          )
      ).data ?? [])
    : [];
  const offers = offerRows as OfferRow[];
  const offerOf = new Map(offers.map((one) => [one.request, one]));

  const dress = async (row: RequestRow) => {
    const offer = offerOf.get(row.id) ?? null;
    return {
      id: row.id,
      songId: row.song_id,
      songTitle: row.song_title,
      artist: row.artist,
      by: byId.get(row.artist)?.name ?? '',
      at: row.created_at,
      offer: offer
        ? {
            id: offer.id,
            rand: offer.rand,
            days: offer.days,
            state: offer.state,
            dueAt: offer.due_at,
            /* The delivered picture, and only once it has been delivered.
               A signed address made before that would be an address for a
               file that is not there yet — and once made, it is a link,
               and a link outlives the state it was made in. */
            url: offer.state === 'delivered' ? await look(client, offer.path) : null,
          }
        : null,
    };
  };

  const asBuyer = await Promise.all(requests.filter((one) => one.buyer === caller.id).map(dress));
  const asArtist = mine
    ? await Promise.all(requests.filter((one) => one.artist === mine.id).map(dress))
    : [];

  /* ── What the owner owes, and to whom ────────────────────────────────

     Carli, 20 September 2026: *"Ek dink nie paystack doen sulke ekstra
     uitbetalings nie. Dit sal in my rekening uitbetaal word en ek betaal
     dit uit aan die kunstenaar."*

     She is right, and it changes what the app has to do. If the money
     lands in her account and she forwards it by hand, the one thing she
     needs is a statement: per artist, what sold, what they are owed, and
     what has already gone out. Without it, "I pay them myself" means
     working it out from Paystack exports every month.

     Owner only. It is on this route rather than on a page of its own
     because it is the same data three lines up, and a second route
     reading the same rows is a second place for the 70/30 to be wrong.

     The rand comes from `split()`, per piece, never from the view: the
     gateway's cut and the 70/30 live in one file and a copy of them in
     SQL is how two answers to one sum begin. */
  let owing: unknown = null;
  if (callerIsOwner(caller)) {
    const unpaid = works.filter((one) => one.sold_to && !one.paid_out);
    const byArtist = new Map<string, { name: string; pieces: number; rand: number }>();
    for (const one of unpaid) {
      const artist = byId.get(one.artist);
      if (!artist) continue;
      const was = byArtist.get(one.artist) ?? { name: artist.name, pieces: 0, rand: 0 };
      byArtist.set(one.artist, {
        name: artist.name,
        pieces: was.pieces + 1,
        /* Rounded to the cent per piece and then added, not added and then
           rounded. A statement that disagrees with the sum of its own
           lines by a cent is a statement somebody stops trusting. */
        rand: Math.round((was.rand + split(one.rand).artist) * 100) / 100,
      });
    }
    owing = [...byArtist.entries()].map(([id, one]) => ({ artist: id, ...one }));
  }

  return Response.json({
    owing,
    /* The gallery shows approved artists only. An application in the
       waiting room is between that person and the owner. */
    artists: artists
      .filter((one) => one.approved)
      .map((one) => ({ id: one.id, name: one.name, about: one.about, place: one.place, avatar: one.avatar })),
    wall,
    bought,
    asBuyer,
    asArtist,
    /* The caller's own artist row, approved or not — this is the one place
       an unapproved application is visible, to the person who made it, so
       "we are looking at it" is a state they can see rather than silence. */
    me: mine ? { id: mine.id, name: mine.name, about: mine.about, place: mine.place, approved: mine.approved } : null,
    startRand: START_RAND,
    uniqueRand: UNIQUE_RAND,
  });
}

/* ─────────────────────────────────────────────────────────────── writing ── */

type Body = {
  what?: string;
  /* Applying as an artist. */
  name?: string;
  about?: string;
  place?: string;
  /* Asking for a one-off. Two ids and nothing typed. */
  artist?: string;
  songId?: string;
  songTitle?: string;
  /* Answering with a price and a window. */
  request?: string;
  rand?: number;
  days?: number;
  /* Delivering, and listing. */
  offer?: string;
  path?: string;
  title?: string;
  for?: string;
  /* Putting a bought piece on one of your own songs. */
  work?: string;
  trackId?: string;
  /* Marking an artist paid: the owner's own reference off her bank statement. */
  note?: string;
};

export async function POST(request: Request): Promise<Response> {
  if (!metered()) return Response.json({ ...NO_ACCOUNTS }, { status: 503 });
  const client = admin();
  if (!client) return Response.json({ ...NO_ACCOUNTS }, { status: 503 });

  const caller = await callerFrom(request);
  if (!caller) {
    return Response.json({ error: 'signed_out', message: 'Sign in first.' }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return Response.json({ error: 'bad_request', message: 'Could not read that.' }, { status: 400 });
  }

  /** The caller's artist row, when they have one and it has been let in. */
  const asArtist = async (): Promise<ArtistRow | null> => {
    const { data } = await client
      .from('art_artists')
      .select('id, owner, name, about, place, avatar, approved')
      .eq('owner', caller.id)
      .maybeSingle();
    const row = (data ?? null) as ArtistRow | null;
    return row && row.approved ? row : null;
  };

  switch (body.what) {
    /* ── Apply to sell here ──────────────────────────────────────────
       `approved` is never written from a request. A marketplace anybody
       can list on is a marketplace nobody trusts, and the column's
       default is false for exactly that reason. */
    case 'apply': {
      const name = String(body.name ?? '').trim().slice(0, 60);
      if (!name) {
        return Response.json({ error: 'no_name', message: 'An artist needs a name.' }, { status: 400 });
      }
      const { error } = await client.from('art_artists').upsert(
        {
          owner: caller.id,
          name,
          about: String(body.about ?? '').trim().slice(0, 600),
          place: String(body.place ?? '').trim().slice(0, 60),
        },
        { onConflict: 'owner' },
      );
      if (error) {
        return Response.json({ error: 'not_saved', message: 'That did not save.' }, { status: 500 });
      }
      return Response.json({ applied: true });
    }

    /* ── An address to upload a picture to ───────────────────────────
       The file goes from the browser straight to storage, not through
       this route. Six routes in this app already promise ceilings the
       platform will not pass — 4.5 MB is the wall — and a 3000×3000
       painting is comfortably over it. A signed upload address has no
       such wall and keeps the bucket shut to everybody else. */
    case 'upload': {
      const artist = await asArtist();
      if (!artist) {
        return Response.json({ error: 'not_an_artist', message: 'Only our artists upload here.' }, { status: 403 });
      }
      const kind = body.for === 'delivery' ? 'delivery' : 'work';
      const path = `${artist.id}/${kind}-${crypto.randomUUID()}.webp`;
      const { data, error } = await client.storage.from(BUCKET).createSignedUploadUrl(path);
      if (error || !data) {
        return Response.json({ error: 'no_upload', message: 'Could not open an upload.' }, { status: 502 });
      }
      return Response.json({ path, token: data.token, maxBytes: ART_MAX_BYTES });
    }

    /* ── Hang a finished piece on the wall ───────────────────────────
       The path has to be one this artist was given, which is what the
       prefix check is: without it, an artist could name somebody else's
       delivered commission and put it up for sale. */
    case 'listed': {
      const artist = await asArtist();
      if (!artist) {
        return Response.json({ error: 'not_an_artist', message: 'Only our artists list here.' }, { status: 403 });
      }
      const path = String(body.path ?? '');
      if (!path.startsWith(`${artist.id}/`)) {
        return Response.json({ error: 'not_yours', message: 'That is not a file you uploaded.' }, { status: 403 });
      }
      const title = String(body.title ?? '').trim().slice(0, 80);
      if (!title) {
        return Response.json({ error: 'no_title', message: 'Give the piece a name.' }, { status: 400 });
      }
      /* The floor is the floor. An artist may ask more than R200 and may
         not ask less, and the database says so too — `rand >= 200` — so
         this is the polite refusal rather than the only one. */
      const rand = Math.max(START_RAND, Math.round(Number(body.rand) || START_RAND));
      const { error } = await client.from('art_works').insert({ artist: artist.id, title, path, rand });
      if (error) {
        return Response.json({ error: 'not_saved', message: 'That did not save.' }, { status: 500 });
      }
      return Response.json({ listed: true });
    }

    /* ── "I want unique art", and which song it is for ───────────────
       The entire message. Two ids and a title the buyer did not type —
       it is the name of one of their own songs, read back from their own
       channel. */
    case 'ask': {
      const artist = String(body.artist ?? '');
      const songId = String(body.songId ?? '').slice(0, 80);
      const songTitle = String(body.songTitle ?? '').trim().slice(0, 120);
      if (!artist || !songId) {
        return Response.json({ error: 'bad_request', message: 'Pick an artist and a song.' }, { status: 400 });
      }
      const { data: they } = await client
        .from('art_artists')
        .select('id, approved')
        .eq('id', artist)
        .maybeSingle();
      if (!they || !(they as { approved: boolean }).approved) {
        return Response.json({ error: 'no_artist', message: 'That artist is not listed here.' }, { status: 404 });
      }
      const { error } = await client
        .from('art_requests')
        .insert({ buyer: caller.id, artist, song_id: songId, song_title: songTitle });
      if (error) {
        return Response.json({ error: 'not_saved', message: 'That did not send.' }, { status: 500 });
      }
      return Response.json({ asked: true });
    }

    /* ── The artist's answer: a price and one of four windows ────────
       The window is checked against our own list rather than trusted,
       and the database checks it again. A date somebody types is a date
       nobody agreed to. */
    case 'offer': {
      const artist = await asArtist();
      if (!artist) {
        return Response.json({ error: 'not_an_artist', message: 'Only our artists answer here.' }, { status: 403 });
      }
      const days = Number(body.days);
      if (!WINDOWS.some((one) => one.days === days)) {
        return Response.json({ error: 'bad_window', message: 'Pick one of the four windows.' }, { status: 400 });
      }
      const { data: ask } = await client
        .from('art_requests')
        .select('id, artist')
        .eq('id', String(body.request ?? ''))
        .maybeSingle();
      if (!ask || (ask as RequestRow).artist !== artist.id) {
        return Response.json({ error: 'not_yours', message: 'That request is not yours.' }, { status: 403 });
      }
      const rand = Math.max(1, Math.round(Number(body.rand) || UNIQUE_RAND));
      const { error } = await client
        .from('art_offers')
        .upsert({ request: ask.id, rand, days, state: 'offered' }, { onConflict: 'request' });
      if (error) {
        return Response.json({ error: 'not_saved', message: 'That did not send.' }, { status: 500 });
      }
      return Response.json({ offered: true });
    }

    /* ── Accept, after paying ────────────────────────────────────────
       Her order exactly: *"as die betaling deur is, druk die koper
       accept"*. The state has to be `paid` already, and only the webhook
       writes that — so accept cannot be pressed into existence by a
       browser that skipped the till. */
    case 'accept': {
      const { data: offer } = await client
        .from('art_offers')
        .select('id, request, days, state')
        .eq('id', String(body.offer ?? ''))
        .maybeSingle();
      if (!offer) {
        return Response.json({ error: 'no_offer', message: 'There is no such offer.' }, { status: 404 });
      }
      const { data: ask } = await client
        .from('art_requests')
        .select('id, buyer')
        .eq('id', (offer as OfferRow).request)
        .maybeSingle();
      if (!ask || (ask as RequestRow).buyer !== caller.id) {
        return Response.json({ error: 'not_yours', message: 'That offer is not yours.' }, { status: 403 });
      }
      if ((offer as OfferRow).state !== 'paid') {
        return Response.json(
          { error: 'not_paid', message: 'Pay for it first — accept is what starts the clock.' },
          { status: 409 },
        );
      }
      /* The clock starts when accept is pressed, not when the offer was
         made. An artist's four days are four days of work, and a buyer
         who took a week to pay has not eaten three of them. */
      const due = new Date(Date.now() + (offer as OfferRow).days * 24 * 60 * 60 * 1000).toISOString();
      const { error } = await client
        .from('art_offers')
        .update({ state: 'accepted', due_at: due })
        .eq('id', offer.id)
        .eq('state', 'paid');
      if (error) {
        return Response.json({ error: 'not_saved', message: 'That did not go through.' }, { status: 500 });
      }
      return Response.json({ accepted: true, dueAt: due });
    }

    /* ── Deliver, to one person ──────────────────────────────────────
       Her words: *"die kunstenaar kry 'n upload button wat net aan
       daardie persoon geupload kan word."* The file lands in a private
       bucket and the only address for it is handed out by the GET above,
       to the buyer, for an hour at a time. */
    case 'deliver': {
      const artist = await asArtist();
      if (!artist) {
        return Response.json({ error: 'not_an_artist', message: 'Only our artists deliver here.' }, { status: 403 });
      }
      const path = String(body.path ?? '');
      if (!path.startsWith(`${artist.id}/`)) {
        return Response.json({ error: 'not_yours', message: 'That is not a file you uploaded.' }, { status: 403 });
      }
      const { data: offer } = await client
        .from('art_offers')
        .select('id, request, state')
        .eq('id', String(body.offer ?? ''))
        .maybeSingle();
      if (!offer) {
        return Response.json({ error: 'no_offer', message: 'There is no such offer.' }, { status: 404 });
      }
      const { data: ask } = await client
        .from('art_requests')
        .select('id, artist, buyer, song_title')
        .eq('id', (offer as OfferRow).request)
        .maybeSingle();
      if (!ask || (ask as RequestRow).artist !== artist.id) {
        return Response.json({ error: 'not_yours', message: 'That commission is not yours.' }, { status: 403 });
      }
      if ((offer as OfferRow).state !== 'accepted') {
        return Response.json(
          { error: 'not_accepted', message: 'The buyer has not accepted this yet.' },
          { status: 409 },
        );
      }
      const { error } = await client
        .from('art_offers')
        .update({ state: 'delivered', path })
        .eq('id', offer.id)
        .eq('state', 'accepted');
      if (error) {
        return Response.json({ error: 'not_saved', message: 'That did not go through.' }, { status: 500 });
      }
      /* A commissioned piece becomes a work too, already sold, so it
         appears in the buyer's collection beside anything they bought
         off the wall. One list, because from the buyer's side there is
         no difference: it is their picture. */
      await client.from('art_works').insert({
        artist: artist.id,
        title: (ask as RequestRow).song_title || 'Commission',
        path,
        rand: START_RAND,
        sold_to: (ask as RequestRow).buyer,
        sold_at: new Date().toISOString(),
      });
      return Response.json({ delivered: true });
    }

    /* ── Put a bought piece on one of your own songs ─────────────────
       The credit is written onto the song's row, which is what makes it
       travel: the channel, the full-screen player and the live post all
       read it from there. See `app/lib/artcredit.ts`.

       Only a piece this person actually bought, and only onto a song
       they actually own. Both are checked here rather than in the
       browser, because both are ids in a body anybody can post. */
    case 'wear': {
      const trackId = String(body.trackId ?? '');
      const { data: work } = await client
        .from('art_works')
        .select('id, artist, title, sold_to')
        .eq('id', String(body.work ?? ''))
        .maybeSingle();
      if (!work || (work as WorkRow).sold_to !== caller.id) {
        return Response.json({ error: 'not_yours', message: 'That piece is not yours.' }, { status: 403 });
      }
      const { data: they } = await client
        .from('art_artists')
        .select('name')
        .eq('id', (work as WorkRow).artist)
        .maybeSingle();
      const { error } = await client
        .from('tracks')
        .update({
          art_title: (work as WorkRow).title,
          art_by: (they as { name: string } | null)?.name ?? '',
          art_work: work.id,
        })
        .eq('id', trackId)
        .eq('owner', caller.id);
      if (error) {
        return Response.json({ error: 'not_saved', message: 'That did not go onto the song.' }, { status: 500 });
      }
      return Response.json({ worn: true });
    }

    /* ── Mark an artist paid ─────────────────────────────────────────
       Owner only, and it writes a timestamp rather than deleting a debt:
       a payout that can be un-recorded silently is a payout somebody
       eventually claims twice. `paid_note` is her own reference off the
       bank statement, in her own words. */
    case 'paidout': {
      if (!callerIsOwner(caller)) {
        return Response.json({ error: 'not_yours', message: 'That is not yours to do.' }, { status: 403 });
      }
      const artist = String(body.artist ?? '');
      if (!artist) {
        return Response.json({ error: 'bad_request', message: 'Which artist?' }, { status: 400 });
      }
      const { error } = await client
        .from('art_works')
        .update({ paid_out: new Date().toISOString(), paid_note: String(body.note ?? '').trim().slice(0, 120) })
        .eq('artist', artist)
        .not('sold_to', 'is', null)
        .is('paid_out', null);
      if (error) {
        return Response.json({ error: 'not_saved', message: 'That did not save.' }, { status: 500 });
      }
      return Response.json({ paidOut: true });
    }

    default:
      return Response.json({ error: 'bad_request', message: 'Nothing is done by that name.' }, { status: 400 });
  }
}
