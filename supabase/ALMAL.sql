-- ═══════════════════════════════════════════════════════════════════════════
-- FutureBox — die vyf lêers wat nog nooit geloop het nie, in een plak.
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Supabase → SQL Editor → plak alles → Run. Veilig om weer te loop: elke stuk
-- hieronder is geskryf om twee keer te kan loop sonder om iets te breek.
--
-- Wat dit aanskakel:
--
--   charts.sql    Spotlight se Top 10 — sonder dit bly daardie bars vir altyd
--                 leeg, want niks skryf ooit neer dat iemand 'n liedjie
--                 gespeel het nie.
--   addons.sql    Die bemarkings-byvoegsel kan gekoop of toegeken word.
--   posting.sql   Die plaas-tou. Sonder dit antwoord dit "nie opgestel nie".
--   dubs.sql      Oorklanking. Dieselfde antwoord sonder dit.
--   invites.sql   Die uitnodigingsskakel in 'n saamwerk-e-pos.
--   listens.sql   Hoeveel kere 'n liedjie geluister is, per liedjie, vir die
--                 maker. Moet ná charts.sql loop.
--   kits.sql      Die Kits.AI minuut-teller. Sonder dit weet die rem nie
--                 hoeveel van die 400 aflaaiminute oor is nie, en dan is daar
--                 geen rem nie.
--   eleven.sql    Wat ElevenLabs per oproep gehef het, langs wat ons gevat
--                 het. Sonder dit is die eerste plek waar 'n verkeerde prys
--                 wys die faktuur.
--
-- ── Twee dinge moet reeds daar wees ────────────────────────────────────────
--
-- Hierdie lêer bou op twee tabelle wat uit ouer lêers kom:
--
--   public.events    uit supabase/events.sql   — charts.sql brei dit uit
--   public.collabs   uit supabase/collab.sql   — invites.sql wys daarna
--   public.tracks    uit supabase/schema.sql   — listens.sql tel net jou eie
--
-- Die blok hieronder kyk daarvoor en sê in gewone woorde wat om eerste te
-- loop as een van hulle kort. Dit is met opset 'n sin eerder as 'n Postgres-
-- fout op reël 200 van iets wat jy pas geplak het.
--
-- ── Moenie hierdie lêer regmaak nie ────────────────────────────────────────
--
-- Dit word geskryf deur `npm run sql:bundle` uit die vyf lêers self. Verander
-- hulle en loop die skrip weer; `npm run check:sqlbundle` keer dat die kopie
-- stilweg van sy oorsprong af wegdryf.

do $$
begin
  if to_regclass('public.events') is null then
    raise exception
      'Loop eers supabase/events.sql — hierdie lêer brei public.events uit en dit bestaan nog nie.';
  end if;
  if to_regclass('public.collabs') is null then
    raise exception
      'Loop eers supabase/collab.sql — invites.sql wys na public.collabs en dit bestaan nog nie.';
  end if;
  if to_regclass('public.tracks') is null then
    raise exception
      'Loop eers supabase/schema.sql — listens.sql tel luisterbeurte per liedjie en public.tracks bestaan nog nie.';
  end if;
end $$;


-- ═══════════════════════════════════════════════════════════════════════════
-- supabase/charts.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- FutureBox — the charts on Spotlight.
--
-- Run this after events.sql, in the same project. Safe to run again.
--
-- ── What Carli asked for ───────────────────────────────────────────────────
--
--   "top 10 AI musiek in Suid afrika … Ek dink daar moet ook top 10 podcasts
--    wees, net 'n bar waarop mens kliek en dan oop maak en opsies gee wat op
--    gekliek kan word."
--
-- A chart needs a fact behind it, and until now nothing anywhere wrote down
-- that somebody played a song. `events` counted visits, videos rendered,
-- masterclasses and articles and episodes opened — everything except the one
-- thing this app is actually for.
--
-- So: one new kind, `play`, and one function that returns the top of a kind
-- over a window. Nothing else changes; the board keeps working exactly as it
-- did, because `play` rows simply are not any of the kinds it counts.
--
-- ── Why a play may be written from the browser and a song may not ──────────
--
-- events.sql is deliberate about this: songs and money are recorded by the
-- server at the moment it spends a credit or a webhook confirms payment,
-- because letting a page claim "a song was made" would make the one number
-- with a cost behind it the easiest to fake.
--
-- A play has no cost behind it and nothing to gain by faking beyond a place on
-- a list — and the unique index below is what makes even that not work. One
-- person, one song, one day, one row: playing your own song five hundred times
-- is one, and it is the same rule that already makes "1 284 masterclasses
-- watched" mean 1 284 rather than one bored afternoon.

-- ─────────────────────────────────────────────────────── the new kind ───

-- Rewritten rather than added to, because a check constraint cannot be
-- extended in place. Dropped by name first so this is safe to run again.
alter table public.events drop constraint if exists events_kind_check;
alter table public.events add constraint events_kind_check
  check (kind in ('visit', 'video', 'masterclass', 'article', 'podcast', 'play'));

-- The window queries below read by kind and date. Without this they read the
-- whole table, which is fine today and is not fine on the day it matters.
create index if not exists events_kind_day_idx
  on public.events (kind, day desc);

-- ──────────────────────────────────────────────────────── the charts ───

-- The top `want` refs of one kind over the last `days` days.
--
-- A window rather than all time, because an all-time chart stops moving: the
-- song that was first is first for ever, and a chart nobody can enter is a
-- chart nobody checks. Thirty days is long enough to be stable with the
-- handful of people currently on the app and short enough to change.
create or replace function public.charts_top(
  want_kind text,
  days integer default 30,
  want integer default 10
)
returns json
language sql
stable
as $$
  select coalesce(json_agg(row_to_json(r)), '[]'::json) from (
    select
      ref,
      count(*)::bigint as count,
      -- How many of those were in the last seven days, so a card can say
      -- whether something is climbing or is coasting on an old week.
      count(*) filter (where day >= (now() at time zone 'utc')::date - 7)::bigint as recent
    from public.events
    where kind = want_kind
      and ref is not null
      and day >= (now() at time zone 'utc')::date - greatest(days, 1)
    group by ref
    order by count(*) desc, max(created_at) desc
    limit least(greatest(want, 1), 50)
  ) r;
$$;

-- Same reasoning as stats_board: only the server calls this, with the service
-- role that writes the rows. A function nobody should call is better left
-- uncallable than left returning zeros for a confusing reason.
revoke all on function public.charts_top(text, integer, integer) from public, anon, authenticated;
grant execute on function public.charts_top(text, integer, integer) to service_role;


-- ═══════════════════════════════════════════════════════════════════════════
-- supabase/addons.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────── add-ons ──
--
-- What somebody has bought that is not a plan and is not credits.
--
-- ── Why a table and not a column on `memberships` ────────────────────────
--
-- A tier is one value: you are on Maker or you are not. An add-on is a set,
-- and it grows. Putting the first one in a boolean column means the second one
-- is a migration, and the fourth one is four booleans that can disagree with
-- each other. A row per thing owned costs nothing and never has that problem.
--
-- ── What `until` means, and why it is not a boolean ──────────────────────
--
-- A month that was paid for. The row stays after it lapses rather than being
-- deleted, because "they had this and it ran out" and "they never bought it"
-- are different situations and the second one is not a reason to show somebody
-- the sales page again as though they were new.

create table if not exists public.addons (
  owner      uuid not null references auth.users (id) on delete cascade,
  addon      text not null check (addon <> '' and length(addon) <= 40),
  -- When it runs out. Extended, never replaced — see `grant_addon`.
  until      timestamptz not null,
  -- The charge that last extended it, for reading a row backwards.
  reference  text not null default '',
  updated_at timestamptz not null default now(),
  primary key (owner, addon)
);

alter table public.addons enable row level security;

-- Reading your own is all a browser needs. Every write is the webhook's, and
-- the webhook holds the service key.
drop policy if exists "read own addons" on public.addons;
create policy "read own addons" on public.addons
  for select using (auth.uid() = owner);

-- ────────────────────────────────────────────────────────── the money ledger ──
--
-- One row per charge that has been turned into time.
--
-- Paystack retries a webhook it did not get a 200 for, and a retry carries the
-- same reference. Without this, a retry two minutes later would hand out a
-- second month for one payment — which is the failure nobody notices, because
-- it only ever errs in the customer's favour until the month somebody adds up
-- the numbers.

create table if not exists public.addon_grants (
  reference text primary key,
  owner     uuid not null references auth.users (id) on delete cascade,
  addon     text not null,
  days      integer not null,
  at        timestamptz not null default now()
);

alter table public.addon_grants enable row level security;
-- Nobody reads this from a browser. No policy: with RLS on and no policy, the
-- service key still writes and everybody else sees nothing.

-- ───────────────────────────────────────────── who the renewal belongs to ──
--
-- A first charge carries our metadata and says who it is for. A renewal, a
-- month later, is raised by Paystack from the subscription and carries none —
-- so the customer code is written down here on the first charge, and every
-- renewal after that is matched on it.
--
-- `subscriptions` does the same job for memberships, but it is keyed by owner
-- and holds one tier, so it cannot also hold this. Separate table, same idea.

create table if not exists public.addon_customers (
  customer_code text primary key,
  owner         uuid not null references auth.users (id) on delete cascade,
  at            timestamptz not null default now()
);

alter table public.addon_customers enable row level security;

-- ───────────────────────────────────────────────────────── granting time ──
--
-- Extends from the later of "now" and "when it currently runs out", so buying
-- a second month early adds to the first rather than throwing it away, and
-- buying again after a lapse starts from today rather than back-dating from a
-- date that has passed.
--
-- Returns the new end. Returns the existing end, unchanged, for a reference
-- that has already been counted.

create or replace function public.grant_addon(
  p_owner uuid,
  p_addon text,
  p_days integer,
  p_reference text
)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  ends timestamptz;
begin
  if p_days <= 0 or p_days > 400 then
    raise exception 'grant_addon: % days is not a month', p_days;
  end if;

  if coalesce(p_reference, '') <> '' then
    insert into public.addon_grants (reference, owner, addon, days)
    values (p_reference, p_owner, p_addon, p_days)
    on conflict (reference) do nothing;

    -- Already counted. Say what it currently is and change nothing.
    if not found then
      select until into ends from public.addons
       where owner = p_owner and addon = p_addon;
      return ends;
    end if;
  end if;

  insert into public.addons (owner, addon, until, reference)
  values (p_owner, p_addon, now() + make_interval(days => p_days), p_reference)
  on conflict (owner, addon) do update
     set until = greatest(public.addons.until, now()) + make_interval(days => p_days),
         reference = excluded.reference,
         updated_at = now()
  returning until into ends;

  return ends;
end;
$$;

revoke all on function public.grant_addon(uuid, text, integer, text) from public, anon, authenticated;


-- ═══════════════════════════════════════════════════════════════════════════
-- supabase/posting.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────── the posting queue ──
--
-- What goes out, where, and when.
--
-- ── What this is, and what it is honestly not ────────────────────────────
--
-- It is the half of automatic posting that needs nobody's permission: a row
-- that says "this, on Tuesday at six", and a clock that notices when Tuesday
-- at six has arrived.
--
-- It is not, yet, a thing that posts to TikTok. Every platform needs its own
-- developer account, its own client id and secret, and this app's address on
-- somebody else's redirect list — none of which the app can arrange for
-- itself, and Apple, Meta and TikTok all take days to weeks to approve one.
-- So the queue is built first and the connectors arrive one at a time behind
-- a single interface, without any of this changing.
--
-- Until a platform is connected the queue does the one thing it can do
-- honestly: it sends the person a reminder with what they planned to post, at
-- the time they planned to post it. That is a real feature rather than a
-- placeholder — a plan that reminds you on Tuesday at six is the difference
-- between a plan and a document about a plan — and it is why `handler` has a
-- 'remind' value rather than the table waiting empty for an integration.
--
-- ── Why the state is a column and not a pair of booleans ─────────────────
--
-- 'due' → 'sending' → 'sent', or → 'failed', or → 'cancelled'. A queue built
-- from `is_sent` and `is_failed` has states that mean nothing (both true) and
-- states it cannot express (in flight), and the second one is what produces
-- the same post going out twice when two workers overlap.

create table if not exists public.scheduled_posts (
  id          uuid primary key default gen_random_uuid(),
  owner       uuid not null references auth.users (id) on delete cascade,

  -- Where it is meant to go. Free text rather than an enum: the list of
  -- platforms is a product decision that moves, and a migration to add
  -- Threads is a migration nobody will run.
  platform    text not null check (platform <> '' and length(platform) <= 40),

  -- Who actually does the sending. 'remind' emails the owner; a platform name
  -- here means a connector exists for it. See `app/lib/server/posting`.
  handler     text not null default 'remind' check (handler in ('remind')),

  -- What to post. The words, and where the file is if there is one.
  caption     text not null default '' check (length(caption) <= 5000),
  -- A path in one of this project's buckets, or empty. Not a URL: a signed URL
  -- expires long before a post scheduled for next week goes out.
  media_path  text not null default '' check (length(media_path) <= 400),

  -- The moment it should go. Stored as an instant, not a local time: the
  -- person's timezone is theirs, and a queue that stores "18:00" has to guess
  -- whose six o'clock it means.
  due_at      timestamptz not null,

  state       text not null default 'due'
                check (state in ('due', 'sending', 'sent', 'failed', 'cancelled')),

  -- How many times the worker has picked it up, so a row that fails forever
  -- stops being picked up rather than being retried until the end of time.
  attempts    integer not null default 0 check (attempts >= 0),
  -- What went wrong, in words, for the screen to show.
  note        text not null default '' check (length(note) <= 500),

  created_at  timestamptz not null default now(),
  -- When a worker last took it. Distinct from `created_at`, and the release
  -- below depends on the difference: a row created two days ago and claimed a
  -- minute ago is not stuck, and comparing against `created_at` would have
  -- freed it immediately and sent it twice.
  claimed_at  timestamptz,
  sent_at     timestamptz
);

-- The worker's only query: what is due, oldest first.
create index if not exists scheduled_posts_due_idx
  on public.scheduled_posts (state, due_at)
  where state = 'due';

-- And the screen's: everything of mine, soonest first.
create index if not exists scheduled_posts_owner_idx
  on public.scheduled_posts (owner, due_at);

alter table public.scheduled_posts enable row level security;

-- Read your own. Everything else is the server's, with the service role.
drop policy if exists "read own scheduled posts" on public.scheduled_posts;
create policy "read own scheduled posts" on public.scheduled_posts
  for select using (auth.uid() = owner);

-- ──────────────────────────────────────────────────────────── claiming work ──
--
-- The one piece of this that is not obvious.
--
-- A worker that reads the due rows and then updates them has a gap between the
-- read and the write, and two workers that overlap in that gap both send the
-- same post. Vercel will happily run a cron twice — a retry after a timeout is
-- an ordinary event — so this is not a theoretical race, it is the normal one.
--
-- `for update skip locked` is the standard answer: each worker takes rows
-- nobody else has taken, in one statement, and the ones already claimed are
-- skipped rather than waited for. The state moves to 'sending' inside the same
-- statement, so a row is claimed and marked in one go.

create or replace function public.claim_due_posts(p_limit integer default 20)
returns setof public.scheduled_posts
language sql
security definer
set search_path = public
as $$
  update public.scheduled_posts
     set state = 'sending', attempts = attempts + 1, claimed_at = now()
   where id in (
     select id
       from public.scheduled_posts
      where state = 'due'
        and due_at <= now()
        -- Given up on after this many tries. A row that has failed five times
        -- is not going to succeed on the sixth, and a queue that retries
        -- forever is a queue that sends an apology every hour.
        and attempts < 5
      order by due_at
      limit greatest(1, least(p_limit, 100))
      for update skip locked
   )
  returning *;
$$;

revoke all on function public.claim_due_posts(integer) from public, anon, authenticated;

-- ─────────────────────────────────────────────────────── stuck in 'sending' ──
--
-- A worker that dies mid-send leaves a row claimed and never finished. Without
-- this it sits in 'sending' forever and is never picked up again — the quiet
-- failure that queues are famous for.
--
-- Anything claimed more than an hour ago and still in flight goes back to
-- 'due'. The attempt count is not reset, so a row that keeps dying still runs
-- out of attempts rather than looping.

create or replace function public.release_stuck_posts()
returns integer
language sql
security definer
set search_path = public
as $$
  with freed as (
    update public.scheduled_posts
       set state = 'due'
     where state = 'sending'
       and claimed_at is not null
       and claimed_at < now() - interval '1 hour'
       and attempts < 5
    returning 1
  )
  select count(*)::integer from freed;
$$;

revoke all on function public.release_stuck_posts() from public, anon, authenticated;


-- ═══════════════════════════════════════════════════════════════════════════
-- supabase/dubs.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- FutureBox — an episode being dubbed into another language.
--
-- Run this after schema.sql and credits.sql, in the same project. Safe to run
-- again.
--
-- ── Why a table, when nothing else that costs credits has one ────────────
--
-- Everything else this app buys is a request that answers. You ask, you wait a
-- few seconds, and either audio comes back or a refusal does — and the refusal
-- refunds on the spot, in the same handler that took the money.
--
-- A dub is not that. It takes minutes, it is polled, and the answer arrives
-- long after the request that started it has gone. So the two questions the
-- other routes answer in one breath have to be answered across two:
--
--   **Who does this dub belong to?** Without a row, the id ElevenLabs hands
--   back is a bearer token — anybody who has it can poll it and download the
--   audio, and ids that come back from an upstream are exactly the sort of
--   thing that ends up in a log or a screenshot. The owner is written down
--   here, and every read is checked against it.
--
--   **Has it already been refunded?** A dub that fails should give the credits
--   back, and it can only be discovered failed by a poll — which happens as
--   many times as the screen asks. Refunding on each poll refunds forever;
--   refunding on none of them charges for nothing. `refunded_at` is the mark
--   that makes it happen exactly once.
--
-- ── What is not kept ─────────────────────────────────────────────────────
--
-- Not the audio. The episode is already in storage and the dub is fetched from
-- ElevenLabs when it is asked for, so nothing here is a second copy of
-- somebody's show. Not a transcript either: a dub is translated speech, and
-- the translation is a copy of what was said.
--
-- `owner` cascades on delete rather than being set to null. There is nothing
-- to keep — unlike a refusal, which is evidence, an in-flight dub belonging to
-- a deleted account is just a job nobody will collect.

create table if not exists public.dubs (
  -- ElevenLabs' own `dubbing_id`, not one of ours. There is no second
  -- identifier to keep in step, and a poll needs theirs anyway.
  id           text primary key,
  owner        uuid not null references auth.users (id) on delete cascade,
  -- iso639-1, as sent. Empty source means they were asked to work it out.
  source_lang  text not null default '',
  target_lang  text not null,
  -- What the episode was, so a failure can say which one without the audio.
  title        text,
  seconds      integer not null default 0,
  -- What was taken when it started. The number to give back, not recomputed:
  -- prices change, and a refund must return what was actually charged.
  charged      integer not null default 0,
  -- Theirs, verbatim: 'dubbing', 'dubbed', 'failed'. Not narrowed by a check
  -- constraint — a status we have not seen before must not fail an insert.
  status       text not null default 'dubbing',
  -- Their message when it failed, kept because it is the only sentence that
  -- says what to change.
  error        text,
  refunded_at  timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists dubs_owner_idx on public.dubs (owner, created_at desc);

-- On, with no policy: every read and write goes through the server, which
-- checks the owner itself. A browser holding an anon key gets nothing.
alter table public.dubs enable row level security;

grant select, insert, update on public.dubs to service_role;

-- ── Refund exactly once ──────────────────────────────────────────────────
--
-- Two polls can arrive at the same moment, and both can see a dub that has
-- just failed. Doing the check in the route and the refund after it is the
-- shape that pays twice.
--
-- So the claim is the update, and the update is the check: it only matches a
-- row that has not been refunded, and it returns what it took. A second caller
-- matches nothing and gets nothing back, which is how it should read.
create or replace function public.claim_dub_refund(p_dub text, p_owner uuid)
returns integer
language sql
security definer
set search_path = public
as $$
  update public.dubs
     set refunded_at = now(),
         updated_at  = now()
   where id = p_dub
     and owner = p_owner
     and refunded_at is null
     and status = 'failed'
  returning charged;
$$;

revoke all on function public.claim_dub_refund(text, uuid) from public;
grant execute on function public.claim_dub_refund(text, uuid) to service_role;


-- ═══════════════════════════════════════════════════════════════════════════
-- supabase/invites.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- FutureBox — inviting somebody who is not here yet.
--
-- Run this after collab.sql, in the same project. Safe to run again.
--
-- ── What this is for ────────────────────────────────────────────────────────
--
-- The radar can draft an email to a podcast host or another maker, and that
-- email had nowhere to send them. The collab room only exists once two
-- FutureBox accounts have accepted each other, so a stranger reading the
-- email had to find the app, sign up, work out the handle, and ask — four
-- steps between "yes, interesting" and a conversation.
--
-- A link is one step. It lands on the app, survives signing up, and turns
-- into a request from the person who sent it.
--
-- ── What the token is, and what it is not ───────────────────────────────────
--
-- It is a bearer for exactly one thing: **being asked to collaborate by the
-- person who made it**. It cannot read anything, cannot write anything else,
-- and names nobody until it is redeemed. The worst somebody can do with a
-- stolen link is end up with a collaboration request they can decline.
--
-- It expires, and it has a use limit. Both because an invite pasted into an
-- email lives forever otherwise, and a link in an old email that still opens
-- a door is a door nobody is watching.
--
-- Redemption goes through the server with the service role, which is why
-- there is no select policy for anybody but the owner: the person redeeming
-- must not be able to read the table, only to hand a token to a route that
-- can.

create table if not exists public.collab_invites (
  -- Long, random, and generated in the route rather than here: a database
  -- default would be the same generator for every row and this is the only
  -- secret in the table.
  token       text primary key,
  owner       uuid not null references auth.users (id) on delete cascade,
  -- What the invite is about, carried into the request so it arrives with a
  -- reason on it rather than as a cold call.
  note        text not null default '',
  uses        integer not null default 0,
  -- Small on purpose. One email is one person; a handful covers somebody
  -- pasting the same link into a few, and stops a link becoming a public door.
  max_uses    integer not null default 5,
  expires_at  timestamptz not null,
  created_at  timestamptz not null default now(),
  constraint collab_invites_uses_check check (uses >= 0 and max_uses > 0)
);

create index if not exists collab_invites_owner_idx
  on public.collab_invites (owner, created_at desc);

alter table public.collab_invites enable row level security;

-- Only the person who made it can see their own. Nobody can see anybody
-- else's, and nobody can look a token up from the browser at all — redeeming
-- is a route, not a read.
drop policy if exists "read own invites" on public.collab_invites;
create policy "read own invites" on public.collab_invites
  for select using (auth.uid() = owner);

-- Writing is the server's, with the service role, after it has checked the
-- token — the same rule as every other table in this app.

-- ── Redeeming, as one statement ────────────────────────────────────────────
--
-- Two things have to happen together: the use is counted and the request is
-- made. Apart, a redemption that failed halfway either burns a use with no
-- request behind it, or makes a request that the count never knew about — and
-- two people redeeming the last use at the same moment would both get one.
--
-- `for update` takes the row's lock, so the second caller waits and then sees
-- the count the first one wrote.
create or replace function public.redeem_collab_invite(p_token text, p_who uuid)
returns table (collab uuid, owner uuid, note text, problem text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite public.collab_invites%rowtype;
  v_existing uuid;
  v_made uuid;
begin
  select * into v_invite
    from public.collab_invites
   where token = p_token
     for update;

  if not found then
    return query select null::uuid, null::uuid, null::text, 'unknown'::text;
    return;
  end if;
  if v_invite.expires_at < now() then
    return query select null::uuid, null::uuid, null::text, 'expired'::text;
    return;
  end if;
  if v_invite.uses >= v_invite.max_uses then
    return query select null::uuid, null::uuid, null::text, 'used_up'::text;
    return;
  end if;
  if v_invite.owner = p_who then
    -- Following your own link is not a collaboration. Said rather than
    -- silently ignored: somebody testing their own link should be told why
    -- nothing happened.
    return query select null::uuid, v_invite.owner, v_invite.note, 'yourself'::text;
    return;
  end if;

  -- Already a thread, either way round. Handing back the existing one is the
  -- useful answer, and it does not burn a use: the link did its job the first
  -- time.
  select id into v_existing
    from public.collabs
   where (asked_by = v_invite.owner and asked_of = p_who)
      or (asked_by = p_who and asked_of = v_invite.owner)
   limit 1;
  if v_existing is not null then
    return query select v_existing, v_invite.owner, v_invite.note, 'already'::text;
    return;
  end if;

  insert into public.collabs (asked_by, asked_of, because)
  values (v_invite.owner, p_who, v_invite.note)
  returning id into v_made;

  update public.collab_invites
     set uses = uses + 1
   where token = p_token;

  return query select v_made, v_invite.owner, v_invite.note, ''::text;
end;
$$;

revoke all on function public.redeem_collab_invite(text, uuid) from public;


-- ═══════════════════════════════════════════════════════════════════════════
-- supabase/listens.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- FutureBox — hoeveel keer 'n liedjie geluister is.
--
-- Loop dit ná events.sql en charts.sql, in dieselfde projek. Veilig om weer te
-- loop.
--
-- ── Wat Carli gevra het ────────────────────────────────────────────────────
--
--   "As ons top liedjies uitwys uit ons eie engine, track dit dan die
--    hoeveelheid listens per liedjie?"
--
-- Dit het nie. `events` dra 'n unieke indeks oor (soort, luisteraar, ding,
-- dag), en daardie indeks is die hele rede waarom die toplys eerlik is: dit
-- keer dat iemand homself boontoe druk. Maar dit gooi ook die herhalings weg
-- voordat hulle geskryf word, so die syfer 'n maker eintlik wil sien — my
-- liedjie is 47 keer geluister — het nêrens bestaan nie.
--
-- ── Hoekom 'n teller en nie 'n nuwe tabel nie ─────────────────────────────
--
-- 'n Tweede tabel met een ry per luisterbeurt sou werk en sou die duurste
-- moontlike antwoord wees: 'n nuwe skryfpad, 'n nuwe indeks, en 'n tabel wat
-- groei met elke keer wat iemand 'n liedjie oorspeel.
--
-- Die ry bestaan reeds. Sit 'n teller daarop, en:
--
--   · die toplys tel steeds *rye*, dus steeds luisteraars, dus onveranderd
--   · die rou syfer is die som van daardie tellers
--   · niks groei wat nie reeds gegroei het nie
--
-- Twee getalle uit een ry, en die een kan nie die ander bederf nie.

-- Bestaande rye tel as een luisterbeurt, wat hulle was.
alter table public.events add column if not exists times integer not null default 1;

-- ── Skryf, of tel op ───────────────────────────────────────────────────────
--
-- Die insetsel was 'n gewone `insert` wat op die unieke indeks misluk het en
-- stilweg geïgnoreer is — 'n herhaling is nie 'n fout nie, dit beteken die
-- persoon het teruggekom. Nou is die terugkoms die punt, so dit word getel.
--
-- In die databasis eerder as in die toep, om dieselfde rede as altyd: enigiemand
-- kan die roete bo-op dit roep, en 'n reël wat in die roeper se hande afgedwing
-- word, is nie afgedwing nie.
create or replace function public.note_event(
  want_kind text,
  want_category text,
  want_ref text,
  want_owner uuid,
  want_visitor text
)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.events (kind, category, ref, owner, visitor)
  values (want_kind, want_category, want_ref, want_owner, want_visitor)
  on conflict (kind, visitor, coalesce(ref, ''), day)
  do update set times = public.events.times + 1;
$$;

revoke all on function public.note_event(text, text, text, uuid, text) from public, anon, authenticated;
grant execute on function public.note_event(text, text, text, uuid, text) to service_role;

-- ── Wat 'n maker van sy eie liedjies mag sien ─────────────────────────────
--
-- Sy eie, en niks anders nie. Dit neem die eienaar as 'n argument eerder as om
-- `auth.uid()` te lees, want dit word deur die bediener geroep met die rol wat
-- die rye skryf — dieselfde houding as `charts_top`. Die roete daarbo weet wie
-- die roeper is; hierdie funksie weet net wie se liedjies gevra is.
--
-- `listeners` en `listens` is twee verskillende vrae en albei word geantwoord:
-- hoeveel mense, en hoeveel kere. Om net die tweede te wys sou 'n liedjie wat
-- een mens veertig keer gespeel het laat lyk soos een wat veertig mense gehoor
-- het, en dit is die presiese leuen wat die toplys se indeks voorkom.
create or replace function public.listens_for(want_owner uuid, days integer default 3650)
returns json
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(json_agg(row_to_json(r)), '[]'::json) from (
    select
      e.ref                                as ref,
      sum(e.times)::bigint                 as listens,
      count(*)::bigint                     as listeners,
      max(e.day)                           as last_day
    from public.events e
    join public.tracks t on t.id = e.ref
    where e.kind = 'play'
      and e.ref is not null
      and t.owner = want_owner
      and e.day >= (now() at time zone 'utc')::date - greatest(days, 1)
    group by e.ref
    order by sum(e.times) desc, max(e.day) desc
  ) r;
$$;

revoke all on function public.listens_for(uuid, integer) from public, anon, authenticated;
grant execute on function public.listens_for(uuid, integer) to service_role;


-- ═══════════════════════════════════════════════════════════════════════════
-- supabase/kits.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- FutureBox — die Kits.AI minuut-teller.
--
-- Loop dit ná schema.sql, in dieselfde projek. Veilig om weer te loop.
--
-- ── Waarom dit bestaan ────────────────────────────────────────────────────
--
-- Kits se Professional Plan is R640 per maand met 'n dak van **400
-- aflaaiminute**. Omskakelingstyd is onbeperk; die minute loop wanneer klank
-- afgelaai word, en hierdie toep laai elke resultaat af — dit is hoe die klank
-- hier kom. So elke minuut wat 'n lid terugkry, brand een van die 400.
--
-- R640 ÷ 400 = R1.60 per minuut. 'n Snit van drie minute kos R4.80. Dit is
-- ongeveer 133 omskakelings per maand oor al die lede saam.
--
-- Sonder 'n teller weet niemand hoeveel oor is nie, en die eerste ding wat
-- wys dat die dak gebreek is, is 'n mislukking waarvoor die lid reeds betaal
-- het. Hierdie tabel is die teller, en `lib/server/kitsminutes.ts` is die rem
-- wat stop voordat dit breek.
--
-- Een ry per omskakeling, met die sekondes wat werklik afgelaai is. Die
-- eienaar staan daarby sodat 'n mens later kan sien wie die maand se minute
-- gebruik het — nie om iemand te straf nie, maar omdat 'n plafon wat een lid
-- alleen opgebruik 'n ander soort probleem is as een wat honderd lede deel.

create table if not exists public.kits_minutes (
  id       bigint generated always as identity primary key,
  owner    uuid references auth.users (id) on delete set null,
  -- Wat gedoen is: 'sing' is stem-omskakeling, 'split' is bane skei,
  -- 'isolate' is die stem uit die musiek haal. Almal brand dieselfde minute.
  kind     text not null default 'sing' check (kind in ('sing', 'split', 'isolate')),
  -- Sekondes eerder as minute, want 'n snit is nie 'n heelgetal minute nie en
  -- afrond by elke ry maak die maand se som stelselmatig te groot.
  seconds  integer not null default 0 check (seconds >= 0),
  at       timestamptz not null default now()
);

-- Die vraag wat elke keer gevra word is "hoeveel hierdie maand", so die indeks
-- is op die tyd.
create index if not exists kits_minutes_at_idx on public.kits_minutes (at desc);

alter table public.kits_minutes enable row level security;

-- Niemand lees dit uit die blaaier nie. Die bediener skryf dit met die
-- diens-sleutel en die opsomming loop deur die funksie hieronder, wat die enige
-- pad is wat 'n getal teruggee.
drop policy if exists "kits minutes are server only" on public.kits_minutes;

-- ── Hoeveel van die maand oor is ──────────────────────────────────────────
--
-- Kalendermaand, in UTC, want dit is hoe Kits self tel. Ongebruikte minute rol
-- oor by hulle, en hierdie funksie weet niks daarvan nie: dit tel net wat
-- hierdie maand gebruik is. Die oorrol maak die werklike ruimte grôter as wat
-- hierdie getal sê, wat die veilige rigting is om verkeerd te wees.

create or replace function public.kits_seconds_this_month()
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(seconds), 0)::bigint
  from public.kits_minutes
  where at >= date_trunc('month', now() at time zone 'utc');
$$;

revoke all on function public.kits_seconds_this_month() from public, anon, authenticated;
grant execute on function public.kits_seconds_this_month() to service_role;


-- ═══════════════════════════════════════════════════════════════════════════
-- supabase/eleven.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- FutureBox — wat ElevenLabs werklik gehef het, langs wat ons gevra het.
--
-- Loop dit ná schema.sql, in dieselfde projek. Veilig om weer te loop.
--
-- ── Waarom dit bestaan ────────────────────────────────────────────────────
--
-- Elke antwoord van ElevenLabs dra 'n `character-cost` kop: presies hoeveel
-- karakters daardie oproep van die maand se toelae gevat het. Ons het dit tot
-- nou toe net in die log geskryf, waar niemand dit weer sien nie.
--
-- Die vraag wat dit moet beantwoord is een vraag: **hef ons genoeg?** Die toep
-- vra krediete per minuut. ElevenLabs hef per karakter. Daardie twee is nie
-- dieselfde ding nie, en 'n verkeerde omskakeling tussen hulle is geld wat
-- stilweg elke maand weg is. Sonder hierdie tabel is die eerste plek waar dit
-- wys die faktuur.
--
-- Een ry per oproep. Geen teks, geen klank, geen naam — net wat gedoen is,
-- hoeveel karakters dit gekos het, hoeveel krediete ons gevat het, en hulle
-- versoek-id sodat 'n ry teen hulle eie dashboard nageslaan kan word.

create table if not exists public.eleven_costs (
  id          bigint generated always as identity primary key,
  -- 'speak', 'voice-change', 'clone', 'dub', 'isolate', 'music', 'stems'.
  -- Vrye teks eerder as 'n check, want hierdie tabel moet 'n nuwe soort werk
  -- kan opneem sonder 'n migrasie; 'n naam wat verkeerd gespel is wys in die
  -- aansig as sy eie ry, wat sigbaar genoeg is.
  what        text not null,
  -- Wat hulle gehef het. Null beteken die kop was nie daar nie (nie elke
  -- eindpunt hef per karakter nie) — nie "nul karakters" nie.
  characters  integer check (characters is null or characters >= 0),
  -- Wat ons gevat het. Null beteken die roete het nie geweet nie, en so 'n ry
  -- tel nie in die vergelyking nie.
  credits     integer check (credits is null or credits >= 0),
  -- Hulle `request-id`, sodat een ry teen hulle eie rekord opgesoek kan word.
  request_id  text,
  at          timestamptz not null default now()
);

create index if not exists eleven_costs_at_idx on public.eleven_costs (at desc);

alter table public.eleven_costs enable row level security;

-- Niemand lees dit uit die blaaier nie. Die bediener skryf met die
-- diens-sleutel; die aansig hieronder is die enigste pad wat 'n getal teruggee.
drop policy if exists "eleven costs are server only" on public.eleven_costs;

-- ── Die vergelyking ───────────────────────────────────────────────────────
--
-- Per soort werk, oor die laaste 90 dae: hoeveel keer, hoeveel karakters hulle
-- gehef het, hoeveel krediete ons gevat het, en hoeveel karakters ons per
-- krediet gegee het. Daardie laaste kolom is die antwoord: as dit oor tyd
-- opstoot, gee ons meer weg as wat ons vra.
--
-- Rye sonder albei syfers word gelaat waar hulle is — 'n gemiddelde wat 'n
-- ontbrekende getal as nul lees, lieg in die duurste rigting.

create or replace view public.eleven_price_check as
  select what,
         count(*) as calls,
         sum(characters) as characters,
         sum(credits) as credits,
         round(sum(characters)::numeric / nullif(sum(credits), 0), 2) as chars_per_credit,
         min(at) as since
    from public.eleven_costs
   where at >= now() - interval '90 days'
     and characters is not null
     and credits is not null
   group by what;

revoke all on public.eleven_price_check from public, anon, authenticated;
grant select on public.eleven_price_check to service_role;


-- ═══════════════════════════════════════════════════════════════════════════
-- supabase/hearts.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- FutureBox — 'n hart op 'n liedjie in die lewendige kamer.
--
-- Loop dit ná live.sql, in dieselfde projek. Veilig om weer te loop.
--
-- ── Wat dit is ───────────────────────────────────────────────────────────
--
-- Die enigste manier om vir iemand in die kamer te sê "ek het dit gehoor en
-- ek hou daarvan", sonder om te tik. 'n Kamer waar net skryf tel, is 'n kamer
-- waar die meeste mense niks doen nie: die meeste mense lees en luister, en
-- 'n hart is die kleinste ding wat 'n mens kan doen wat nog steeds by die
-- ander persoon aankom.
--
-- ── Waarom die sleutel (post, owner) is ──────────────────────────────────
--
-- Dit is die hele reël, in die tabel eerder as in kode: **een hart per mens
-- per plasing.** Nie 'n telling wat 'n mens kan opdruk nie, en nie 'n ry per
-- druk nie. Aan- en afskakel is 'n invoeging en 'n skrapping, en die tabel
-- self keer die tweede hart — nie 'n toets in 'n roete wat iemand kan mis nie.
--
-- Geen aparte teller-kolom op `live_posts` nie. 'n Telling wat langs sy eie
-- rye gestoor word, is 'n telling wat op 'n dag daarvan gaan verskil, en dan
-- weet niemand watter een reg is nie. Veertig plasings se harte tel is een
-- oproep en dit is nie 'n som wat groot word nie.
--
-- ── Wat weggaan wanneer iets weggaan ─────────────────────────────────────
--
-- Albei kante kaskadeer. 'n Geskrapte plasing vat sy harte saam, want 'n hart
-- op niks is niks. 'n Geskrapte rekening vat syne saam: 'n hart is iemand wat
-- praat, en iemand wat weggegaan het, moet ophou praat. Dieselfde reël as
-- live.sql se plasings en boodskappe.

create table if not exists public.live_hearts (
  post        uuid not null references public.live_posts (id) on delete cascade,
  owner       uuid not null references auth.users (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (post, owner)
);

-- Om een plasing se harte te tel, en om die kamer se veertig plasings in een
-- oproep te tel. Die primêre sleutel dek al (post, owner); hierdie een dek die
-- vraag andersom — "wat het hierdie mens gehart" — vir die kieser wat wys
-- watter harte reeds joune is.
create index if not exists live_hearts_owner_idx on public.live_hearts (owner);

-- ───────────────────────────────────────────────────── wie mag wat sien ────
--
-- Aan, met geen beleid nie, soos live.sql se drie tabelle: elke lees en skryf
-- gaan deur die bediener. 'n Blaaier wat self by hierdie tabel kon kom, kon
-- iemand anders se hart skrap deur net die twee sleutels te ken.

alter table public.live_hearts enable row level security;

grant select, insert, delete on public.live_hearts to service_role;


-- ═══════════════════════════════════════════════════════════════════════════
-- supabase/buildon.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- FutureBox — mag ander op hierdie liedjie voortbou?
--
-- Loop dit ná live.sql, in dieselfde projek. Veilig om weer te loop.
--
-- ── Wat die toestemming werklik toelaat ──────────────────────────────────
--
-- Twee dinge, en dit is die moeite werd om hulle presies te stel, want die
-- app kan nie die derde ding doen wat 'n mens sou aanvaar nie:
--
--   1. Iemand anders mag 'n greep uit hierdie liedjie sny — die vertikale
--      stukkie wat die Hooks-kamer maak. Dit is regte klank, en dit is die
--      helfte waarvoor die toestemming werklik nodig is.
--
--   2. Iemand anders mag 'n nuwe liedjie begin by hierdie een se styl en
--      titel, met die maker se naam daaraan vas.
--
-- Wat dit NIE toelaat nie, omdat dit nie kan nie: die klank word nooit in 'n
-- model gevoer nie. ElevenLabs se musiek-oproep vat teks — stylwoorde,
-- koeplette, 'n aanwysing — en géén verwysingsklank nie. 'n Nuwe liedjie begin
-- dus by die wóórde, nie by die opname nie. Dieselfde muur as die liedjie-
-- skakelbalk wat uitgehaal is omdat die app nie kan luister nie.
--
-- ── Waarom die verstek vals is ───────────────────────────────────────────
--
-- Toestemming vir iemand anders se musiek word gevra, nie aanvaar nie. 'n
-- Verstek van waar sou beteken dat elke plasing wat reeds in die kamer is —
-- geplaas voordat hierdie vraag bestaan het — skielik oop is vir iets waarvoor
-- niemand ooit gevra is nie. `default false` laat hulle toe soos hulle was.

alter table public.live_posts
  add column if not exists build_on boolean not null default false;

-- Die Hooks-kamer vra net vir die oop plasings, en dit is 'n klein deel van
-- die kamer. 'n Gedeeltelike indeks dek presies daardie vraag en groei net
-- soveel soos wat daar oop plasings is.
create index if not exists live_posts_buildon_idx
  on public.live_posts (created_at desc)
  where build_on;

-- ── Die styl, want 'n titel alleen is te dun ─────────────────────────────
--
-- Punt 2 hierbo beloof dat iemand 'n nuwe liedjie by hierdie een se styl kan
-- begin. Die styl is die substansie van daardie belofte: dit is die enkele
-- string wat die musiekenjin werklik lees. Sonder hierdie kolom dra die
-- oorhandiging na Maak 'n liedjie net 'n titel oor, en 'n titel is nie 'n
-- styl nie.
--
-- Leeg by verstek, want elke plasing wat reeds in die kamer is, is geplaas
-- voordat hierdie kolom bestaan het. 'n Oop plasing sonder styl gee die
-- volgende maker steeds die titel en die krediet; dit gee net minder.
alter table public.live_posts
  add column if not exists style text not null default '';


-- ═══════════════════════════════════════════════════════════════════════════
-- supabase/elevenrem.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- FutureBox — 'n rem op wat ElevenLabs hierdie maand kos.
--
-- Loop dit ná eleven.sql, in dieselfde projek. Veilig om weer te loop.
--
-- ── Waarom dit nou nodig is ──────────────────────────────────────────────
--
-- ElevenLabs se ondersteuning, 9 September 2026: bykoop kos $0,000165 per
-- krediet, en Auto Top Up kan aangeskakel word. Carli, dieselfde dag: "Ek gaan
-- eers net krediete top up totdat ek 'n beter begrip het hoeveel mense ons
-- produk gebruik."
--
-- Dít is presies die opstelling waarin 'n rem saak maak. Sonder Auto Top Up
-- gaan die diens dood wanneer die krediete op is — sleg, maar sigbaar. Mét
-- Auto Top Up gaan dit **nooit** dood nie: dit hou aan koop, teen R3,08 per
-- duisend krediete, totdat iemand die rekening sien. 'n Waarskuwings-e-pos by
-- 75% is nie 'n rem nie; dit is 'n kennisgewing dat dit reeds gebeur.
--
-- ── Wat hierdie funksie tel ──────────────────────────────────────────────
--
-- `eleven_costs.characters` is wat ElevenLabs self vir elke oproep gehef het,
-- van hulle `character-cost`-kop af. Dit is húlle getal, nie ons skatting nie.
--
-- Kalendermaand in UTC, want dit is hoe die plan self tel. Rye waar die kop
-- ontbreek het, is null en tel as niks — wat in die bestedingsrigting verkeerd
-- is eerder as in die weierrigting, en dít is die verkeerde kant om op te dwaal.
-- Daarom is die verstek-plafon in die toepassing die plan se eie 600 000 en
-- nie meer nie: 'n telling wat kán onderskat, moet 'n plafon hê wat nie oorskat
-- nie.

create or replace function public.eleven_credits_this_month()
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(characters), 0)::bigint
  from public.eleven_costs
  where at >= date_trunc('month', now() at time zone 'utc');
$$;

revoke all on function public.eleven_credits_this_month() from public, anon, authenticated;
grant execute on function public.eleven_credits_this_month() to service_role;
