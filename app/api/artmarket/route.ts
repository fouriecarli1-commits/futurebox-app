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
import { ownerEmails } from '@/app/lib/server/owners';
import { filterSafe } from '@/app/lib/server/filtersafe';
import {
  ART_MAX_BYTES, BID_STEP, BIDDER_RAND, SNIPE_MINUTES, START_RAND, UNIQUE_RAND, WINDOWS,
  endsAt, nextBid, split,
} from '@/app/data/artmarket';

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
  /* Null for a house artist: somebody Carli brought in who has no account.
     See `supabase/albumart.sql` for why that had to be allowed. */
  owner: string | null;
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
  /* The marked 1000px preview. `path` is the clean 3000px master, and the
     difference between them is the whole of this room's answer to a
     screenshot. Empty on a work uploaded before the column existed. */
  preview?: string;
  /* What was actually paid for it, which is NOT `rand`: `rand` is where the
     bidding opened. Written by the webhook out of the charge, and by
     `deliver` out of the commission's own price. Null on anything sold
     before the column existed, where the two were the same thing. */
  paid_rand?: number | null;
  /** When the bidding closes. Null on a work hung before this existed. */
  ends_at?: string | null;
  /** Who was leading when it closed. Not a sale: `sold_to` is the sale. */
  won_by?: string | null;
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

/**
 * Put the database's own words in the log, where only we can read them.
 *
 * ── Why this exists ──────────────────────────────────────────────────────
 *
 * Carli, 20 September 2026, holding her phone: *"The gallery could not be
 * read just now."* That sentence is honest and completely useless. Five
 * reads in this route can produce it, each against a different table, and
 * the difference between "you have not run the SQL" and "one column is
 * missing" is the difference between a minute and an evening. Neither she
 * nor I could tell which from the screen, and I had no way to reach her
 * database to find out.
 *
 * So two halves, and the split is the point. The browser is told `which`
 * read fell over, in OUR word for it — `works`, `bids`, `commissions` —
 * which is a label this file chose and not a sentence a database wrote.
 * The database's own message goes here, to the server log, because it
 * names columns and constraints and is exactly the thing `check:aifault`
 * exists to keep off a stranger's screen.
 */
function say(which: string, error: { message?: string; code?: string } | null): void {
  console.error(
    `[artmarket] the ${which} read failed.`
    + ` code=${error?.code ?? 'none'} — ${error?.message ?? 'no message'}`,
  );
}

/**
 * Which of the columns we asked for are not in the table.
 *
 * ── Why the room names them ──────────────────────────────────────────────
 *
 * `which` was a real improvement and it was not enough. It got Carli to
 * *"(works)"* and then to a hand-written `information_schema` query I had
 * to compose for her, which found `ends_at` and `won_by` missing. That is
 * the second evening lost to a migration that only half landed, and the
 * cause both times is the same and is nobody's mistake: the Supabase SQL
 * editor runs a script as ONE transaction, so a statement that fails at
 * the bottom rolls back the twenty above it. It looks like an ordinary
 * error message. It means none of that block is there.
 *
 * A column name is not a secret. It is this file's own vocabulary — the
 * same list four lines up in the `.select()` — and it is already in the
 * repository. What must not reach a browser is the DATABASE's sentence,
 * which names constraints and internals and is what `check:aifault` is
 * about. So the names come from OUR list and never from the error: each
 * one is asked for on its own, and the ones that come back refused are the
 * ones that are missing. Nothing is parsed out of Postgres' words.
 *
 * Only ever called after a read has already failed, so the cost is a dozen
 * empty queries on a screen that is broken anyway. `limit(0)` asks for no
 * rows: this is a question about the shape of the table, not its contents.
 */
async function missingFrom(
  client: ReturnType<typeof admin>,
  table: string,
  columns: readonly string[],
): Promise<string[]> {
  if (!client) return [];
  const gone: string[] = [];
  for (const column of columns) {
    const { error } = await client.from(table).select(column).limit(0);
    /* 42703 is "column does not exist" and 42P01 is "no such table". Any
       other refusal — a timeout, a permission — is not a missing column and
       must not be reported as one. */
    if (error && (error.code === '42703' || error.code === '42P01')) gone.push(column);
  }
  return gone;
}

/** What the gallery read asks `art_works` for. Named once, used twice. */
const WORK_COLUMNS = [
  'id', 'artist', 'title', 'path', 'preview', 'rand', 'paid_rand',
  'ends_at', 'won_by', 'sold_to', 'sold_at', 'paid_out', 'created_at',
] as const;

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
      { error: 'not_set_up', message: 'The art market tables are not in this project yet.', which: 'artists' },
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
    .select(WORK_COLUMNS.join(', '))
    .order('created_at', { ascending: false });
  if (workError) {
    say('works', workError);
    const missing = await missingFrom(client, 'art_works', WORK_COLUMNS);
    return Response.json(
      {
        error: 'not_read',
        message: 'The gallery could not be read just now.',
        which: 'works',
        missing,
      },
      { status: 503 },
    );
  }
  /* Through `unknown`, because the select is built from `WORK_COLUMNS` at
     runtime and supabase-js can only infer a row shape from a literal
     string. That is the price of one list instead of two — and two lists
     is exactly how the browser ends up asking for a column the diagnostic
     does not check, which is the failure this whole path is for. */
  const works = (workRows ?? []) as unknown as WorkRow[];

  /* ── The standing bids ───────────────────────────────────────────────
     One read for the whole wall, from a view, so "who is leading" has one
     answer rather than one per screen. */
  const { data: topRows, error: topError } = await client.from('art_top_bids').select('work, top, bids');
  /* A failed read here is the worst kind: `?? []` would make every piece
     show its OPENING bid as the standing one, which is a wrong price on
     the screen where the money is decided — and it would look completely
     normal. `check:couldnotask` caught this the first time it ran over
     the auction. */
  if (topError) {
    say('bids', topError);
    return Response.json(
      {
        error: 'not_read',
        message: 'The bids could not be read just now. Nothing is shown rather than the wrong amount.',
        which: 'bids',
      },
      { status: 503 },
    );
  }
  const tops = new Map(
    ((topRows ?? []) as { work: string; top: number; bids: number }[]).map((one) => [
      one.work,
      { top: one.top, bids: one.bids },
    ]),
  );

  /* ── Closing the clock, without a cron ───────────────────────────────

     Carli: *"die hoogste bee wen die art binne 36 hours."*

     There is no scheduler behind this app that runs every minute, and
     adding one for this would be a second thing to keep alive. So an
     auction closes the next time anybody looks: a work whose `ends_at`
     has passed and that has a leading bid gets `won_by` written, once.

     `.is('won_by', null)` makes it conditional, so two people opening the
     room in the same second cannot write it twice — and the read below
     uses what the write returned rather than what was read a moment ago,
     because between those two the clock may have run out.

     The honest limit: nothing happens until somebody opens the room. A
     piece whose clock ended at three in the morning is decided at the
     first visit after that, not at three. Nobody is worse off — the
     winner is whoever had the highest bid when the clock ran out, and
     that is a fact about the past. */
  const nowAt = Date.now();
  for (const one of works) {
    if (one.sold_to || one.won_by || !one.ends_at) continue;
    if (new Date(one.ends_at).getTime() > nowAt) continue;
    const leading = tops.get(one.id);
    if (!leading) continue;
    const { data: highest } = await client
      .from('art_bids')
      .select('bidder')
      .eq('work', one.id)
      .order('rand', { ascending: false })
      .order('at', { ascending: true })
      .limit(1)
      .maybeSingle();
    const winner = (highest as { bidder: string } | null)?.bidder;
    if (!winner) continue;
    const { data: closed } = await client
      .from('art_works')
      .update({ won_by: winner, won_at: new Date().toISOString() })
      .eq('id', one.id)
      .is('won_by', null)
      .is('sold_to', null)
      .select('id');
    if (((closed ?? []) as unknown[]).length > 0) one.won_by = winner;
  }

  /* ── The wall ───────────────────────────────────────────────────────
     Unsold pieces by an approved artist. Sold pieces leave the wall
     entirely rather than being greyed out: her rule is that a piece is
     sold ONCE, and a sold piece still hanging there with a line through
     it is an invitation to ask whether it really is. */
  /* Whether the caller is the one leading, per work. Their own bids only:
     everybody else's are nobody's business, and a leaderboard is how an
     auction turns into a fight. */
  const { data: mineRows, error: mineError } = await client
    .from('art_bids')
    .select('work, rand')
    .eq('bidder', caller.id);
  /* And this one decides whether somebody is told they are winning. An
     empty list on a failed read tells a person who IS leading that they
     are not, which is how they lose a piece they thought they had. */
  if (mineError) {
    say('my bids', mineError);
    return Response.json(
      { error: 'not_read', message: 'Your bids could not be read just now.', which: 'my bids' },
      { status: 503 },
    );
  }
  const myBest = new Map<string, number>();
  for (const one of (mineRows ?? []) as { work: string; rand: number }[]) {
    myBest.set(one.work, Math.max(myBest.get(one.work) ?? 0, one.rand));
  }

  const wall = await Promise.all(
    works
      .filter((one) => !one.sold_to && byId.get(one.artist)?.approved)
      .map(async (one) => ({
        id: one.id,
        title: one.title,
        /* The opening bid, which is what `rand` means now. What will be
           paid is `top`, when the clock runs out. */
        rand: one.rand,
        top: tops.get(one.id)?.top ?? null,
        bids: tops.get(one.id)?.bids ?? 0,
        next: nextBid(tops.get(one.id)?.top ?? null),
        endsAt: one.ends_at ?? null,
        /* Over, and who it went to — said as two booleans rather than an
           id, because the browser has no business knowing who else bid. */
        /* Not started is not over. A piece nobody has bid on has no
           clock at all, and waits. */
        started: Boolean(one.ends_at),
        over: Boolean(one.won_by) || (one.ends_at ? new Date(one.ends_at).getTime() <= nowAt : false),
        wonByMe: one.won_by === caller.id,
        leadingMe: (myBest.get(one.id) ?? 0) > 0 && (myBest.get(one.id) ?? 0) === (tops.get(one.id)?.top ?? -1),
        artist: one.artist,
        by: byId.get(one.artist)?.name ?? '',
        /* ── The marked one, never the master ────────────────────────

           Nothing a web page can do stops a screenshot or a phone camera
           pointed at the screen. What stops the copy being USEFUL is that
           the only file anybody can reach before paying is 1000 pixels
           with a band of text baked through it. See `app/lib/artmark.ts`.

           The fallback to `path` is for works uploaded before the preview
           column existed — a handful, replaceable by hand, and a room
           that shows nothing is worse than one that shows too much. */
        url: await look(client, one.preview || one.path),
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
        /* The clean master, and this is the only place it is handed out:
           `sold_to === caller.id` above is what earns it. */
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
    say('commissions', requestError);
    return Response.json(
      { error: 'not_read', message: 'Your commissions could not be read just now.', which: 'commissions' },
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
        /* On what was PAID, never on the opening bid. A piece that
           closed at R900 owes the artist R606.55, not the R133.70 that
           R200 works out to. `?? one.rand` is for rows sold before the
           column existed, where the two were the same thing. */
        rand: Math.round((was.rand + split(one.paid_rand ?? one.rand).artist) * 100) / 100,
      });
    }
    owing = [...byArtist.entries()].map(([id, one]) => ({ artist: id, ...one }));
  }

  /* ── Every artist's own work, on their own profile ───────────────────

     Carli: *"Elke kunstenaar moet ook 'n profile hê met hulle eie kunswerk
     in, want een kunstenaar kan nogal baie album art hê."*

     Counted here rather than filtered in the browser: the crate shows one
     piece at a time and a painter with eleven works was eleven separate
     sleeves scattered through it, with no way to see them as a body of
     work. `sold` is a number and not a list — a portfolio of things
     nobody can buy is a wall of disappointments, and the count says the
     same thing in four characters. */
  const worksOf = (artist: string) =>
    wall.filter((one) => one.artist === artist).map((one) => one.id);
  const soldBy = (artist: string) =>
    works.filter((one) => one.artist === artist && one.sold_to).length;

  /* Whether this person has the pass. One read, so the screen can say
     "take the pass" instead of letting somebody type a bid and be
     refused at the end of it. */
  const { data: pass } = await client
    .from('art_bidders')
    .select('owner')
    .eq('owner', caller.id)
    .maybeSingle();

  return Response.json({
    owing,
    /* Her R50, once. See `app/data/artmarket.ts`. */
    canBid: Boolean(pass),
    bidderRand: BIDDER_RAND,
    /* The gallery shows approved artists only. An application in the
       waiting room is between that person and the owner. */
    artists: artists
      .filter((one) => one.approved)
      .map((one) => ({
        id: one.id,
        name: one.name,
        about: one.about,
        place: one.place,
        avatar: one.avatar,
        works: worksOf(one.id),
        sold: soldBy(one.id),
      })),
    /* ── When nobody is the owner ────────────────────────────────────

       `OWNER_EMAIL` is a Vercel variable, and until it is set nobody is
       the owner — so the fold that brings an artist in is invisible, and
       invisible for a reason no screen explains. That is the exact shape
       of `docs/OPEN-QUESTIONS.md` §T: *"dit het aangekom" is nie "iemand
       kan dit sien nie*.

       So the room says it. It is the absence of a setting, not a secret:
       nothing grants owner access without a matching address, so telling
       a signed-in member that no owner is configured costs nothing and
       saves the person who set this up an hour of looking for a button
       that was never going to be drawn. */
    noOwner: ownerEmails().length === 0,
    /* Everybody, approved or not, for the owner alone — the list she works
       from when she lets somebody in. Null for everybody else, so the
       waiting room is not a thing an ordinary member can enumerate. */
    everyArtist: callerIsOwner(caller)
      ? artists.map((one) => ({
          id: one.id,
          name: one.name,
          about: one.about,
          place: one.place,
          approved: one.approved,
          house: one.owner === null,
          works: worksOf(one.id).length,
          sold: soldBy(one.id),
        }))
      : null,
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
  /** The marked preview's path, beside the master's. */
  preview?: string;
  title?: string;
  for?: string;
  /* Bidding, and putting a bought piece on one of your own songs. */
  work?: string;
  trackId?: string;
  /* Marking an artist paid: the owner's own reference off her bank statement. */
  note?: string;
  /* The owner letting somebody in, and acting for them. */
  approved?: boolean;
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

  /**
   * Which artist this request is acting as.
   *
   * Normally the caller's own row. The owner may name one instead, because
   * a house artist has no account to sign in with — Carli uploads their
   * work and pays them by hand, which is the arrangement she has anyway.
   *
   * The override is owner-only and it is checked here, once, rather than
   * in each of the four operations that take an artist: an escape hatch
   * repeated four times is an escape hatch that is wrong in one of them.
   */
  const asArtist = async (named?: string): Promise<ArtistRow | null> => {
    if (named && callerIsOwner(caller)) {
      const { data } = await client
        .from('art_artists')
        .select('id, owner, name, about, place, avatar, approved')
        .eq('id', named)
        .maybeSingle();
      return (data ?? null) as ArtistRow | null;
    }
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
      const artist = await asArtist(body.artist);
      if (!artist) {
        return Response.json({ error: 'not_an_artist', message: 'Only our artists upload here.' }, { status: 403 });
      }
      /* Three kinds, and the names are only for a human reading the
         bucket — what makes a path safe is the artist-id prefix below. */
      const kind =
        body.for === 'delivery' ? 'delivery' : body.for === 'preview' ? 'preview' : 'work';
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
      const artist = await asArtist(body.artist);
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
      /* The marked preview, checked to be this artist's own file for the
         same reason the master is: without it, an artist could name
         somebody else's picture as the preview for their own work. */
      const preview = String(body.preview ?? '');
      if (preview && !preview.startsWith(`${artist.id}/`)) {
        return Response.json({ error: 'not_yours', message: 'That is not a file you uploaded.' }, { status: 403 });
      }
      /* No clock yet. Carli: *"Die beeing begin wanneer iemand begin
         bee."* A piece that goes up on a Tuesday and that nobody sees
         until Wednesday had already closed under the old rule. `ends_at`
         stays null until the first bid, which is what starts it. */
      const { error } = await client
        .from('art_works')
        .insert({ artist: artist.id, title, path, preview, rand });
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
      const artist = await asArtist(body.artist);
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
      const artist = await asArtist(body.artist);
      if (!artist) {
        return Response.json({ error: 'not_an_artist', message: 'Only our artists deliver here.' }, { status: 403 });
      }
      const path = String(body.path ?? '');
      if (!path.startsWith(`${artist.id}/`)) {
        return Response.json({ error: 'not_yours', message: 'That is not a file you uploaded.' }, { status: 403 });
      }
      const { data: offer } = await client
        .from('art_offers')
        .select('id, request, state, rand')
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
      /* `rand` has to clear the table's R200 floor, so the commission's
         real price goes in `paid_rand` — which is the column the payout
         statement reads. Without it a R500 commission would have paid
         the artist as though it were a R200 auction. */
      await client.from('art_works').insert({
        artist: artist.id,
        title: (ask as RequestRow).song_title || 'Commission',
        path,
        rand: START_RAND,
        paid_rand: (offer as OfferRow).rand,
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

    /* ── A bid ───────────────────────────────────────────────────────

       Carli: *"mense moet op die bee, en die hoogste bee wen die art
       binne 36 hours."*

       Every rule that decides who wins is enforced here and nowhere else.
       A browser that can write its own bid is an auction without rules,
       which is why `art_bids` has row level security on and no policy at
       all. */
    case 'bid': {
      const { data: found } = await client
        .from('art_works')
        .select('id, artist, rand, ends_at, won_by, sold_to')
        .eq('id', String(body.work ?? ''))
        .maybeSingle();
      const work = (found ?? null) as WorkRow | null;
      if (!work) {
        return Response.json({ error: 'no_work', message: 'There is no such piece.' }, { status: 404 });
      }
      if (work.sold_to || work.won_by) {
        return Response.json({ error: 'over', message: 'The bidding on that piece is over.' }, { status: 409 });
      }
      /* ── You have to be a bidder ─────────────────────────────────
         *"Elke persoon sal 'n R50 by in moet hê om te mag bee, want
         anders kan enige random mens die prys opstoot."* A bid is a
         promise to pay, and a promise that costs nothing is worth
         nothing. Checked here and nowhere else: a browser that can bid
         without this is the thing the fee exists to stop. */
      const { data: pass } = await client
        .from('art_bidders')
        .select('owner')
        .eq('owner', caller.id)
        .maybeSingle();
      if (!pass) {
        return Response.json(
          { error: 'no_pass', message: 'Take the bidder pass first.', rand: BIDDER_RAND },
          { status: 402 },
        );
      }

      /* The clock, read from the row rather than from the request. A
         browser with a slow phone and an old page would otherwise be
         bidding on an auction that ended ten minutes ago.

         Null means nobody has bid yet, which is not "over" — it is "not
         started", and this bid is what starts it. */
      const closes = work.ends_at ? new Date(work.ends_at).getTime() : null;
      if (closes !== null && closes <= Date.now()) {
        return Response.json({ error: 'over', message: 'The bidding on that piece is over.' }, { status: 409 });
      }
      /* An artist may not bid their own work up. This is the one rule an
         auction cannot do without, and it costs one comparison. */
      const { data: they } = await client
        .from('art_artists')
        .select('owner')
        .eq('id', work.artist)
        .maybeSingle();
      if ((they as { owner: string | null } | null)?.owner === caller.id) {
        return Response.json(
          { error: 'your_own', message: 'You cannot bid on your own work.' },
          { status: 403 },
        );
      }

      const { data: standing } = await client.from('art_top_bids').select('top').eq('work', work.id).maybeSingle();
      const top = (standing as { top: number } | null)?.top ?? null;
      const least = Math.max(nextBid(top), work.rand);
      const rand = Math.round(Number(body.rand) || 0);
      if (rand < least) {
        return Response.json(
          { error: 'too_low', message: `The next bid is R${least}.`, least },
          { status: 409 },
        );
      }

      const { error } = await client.from('art_bids').insert({ work: work.id, bidder: caller.id, rand });
      if (error) {
        return Response.json({ error: 'not_saved', message: 'That bid did not go through.' }, { status: 500 });
      }

      if (closes === null) {
        /* ── The first bid starts the clock ──────────────────────────
           `.is('ends_at', null)` makes it the FIRST bid that does it and
           not the second: two people bidding in the same second would
           otherwise each set a clock, and the later one would quietly
           give the piece another thirty-six hours. */
        await client
          .from('art_works')
          .update({ ends_at: endsAt() })
          .eq('id', work.id)
          .is('ends_at', null);
      } else if (closes - Date.now() < SNIPE_MINUTES * 60 * 1000) {
        /* ── The late bid pushes the end out ─────────────────────────
           Otherwise the thirty-six hours is theatre and the auction is
           really one second long: everybody waits for the end and the
           fastest connection wins. */
        await client
          .from('art_works')
          .update({ ends_at: new Date(Date.now() + SNIPE_MINUTES * 60 * 1000).toISOString() })
          .eq('id', work.id)
          .is('won_by', null);
      }
      return Response.json({ bid: rand, next: rand + BID_STEP });
    }

    /* ── Bring an artist in, or change one ───────────────────────────

       Carli: *"Ek het nou reeds 'n kunstenaar wat ek wil in sit."*

       Owner only, and it is the one place `approved` is ever written.
       `apply` above deliberately cannot touch it — a marketplace anybody
       can list on is a marketplace nobody trusts — so letting somebody in
       is a separate act by a separate person, here.

       It creates a HOUSE artist when no id is given: a row with no
       `owner`, for a painter who has no FutureBox account and does not
       want one. Carli uploads their work and pays them by hand, which is
       the arrangement she already has with them. */
    case 'artist': {
      if (!callerIsOwner(caller)) {
        return Response.json({ error: 'not_yours', message: 'That is not yours to do.' }, { status: 403 });
      }
      const name = String(body.name ?? '').trim().slice(0, 60);
      const fields = {
        name,
        about: String(body.about ?? '').trim().slice(0, 1200),
        place: String(body.place ?? '').trim().slice(0, 60),
        approved: body.approved === true,
      };
      const named = String(body.artist ?? '');
      if (named) {
        const { error } = await client.from('art_artists').update(fields).eq('id', named);
        if (error) {
          return Response.json({ error: 'not_saved', message: 'That did not save.' }, { status: 500 });
        }
        return Response.json({ saved: true, artist: named });
      }
      if (!name) {
        return Response.json({ error: 'no_name', message: 'An artist needs a name.' }, { status: 400 });
      }
      /* `owner: null` is the whole of what makes this a house artist. It
         is written explicitly rather than left out, so the intent is on
         the row and not only in this comment. */
      const { data, error } = await client
        .from('art_artists')
        .insert({ ...fields, owner: null })
        .select('id')
        .maybeSingle();
      if (error || !data) {
        return Response.json({ error: 'not_saved', message: 'That did not save.' }, { status: 500 });
      }
      return Response.json({ saved: true, artist: (data as { id: string }).id });
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
