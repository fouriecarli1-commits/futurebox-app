-- ═══════════════════════════════════════════════════════════════════════════
-- FutureBox — die 21 lêers wat nog nooit geloop het nie, in een plak.
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Supabase → SQL Editor → plak alles → Run. Veilig om weer te loop: elke stuk
-- hieronder is geskryf om twee keer te kan loop sonder om iets te breek.
--
-- Wat dit aanskakel:
--
--   charts.sql    Spotlight se Top 10 — sonder dit bly daardie bars vir
--                 altyd leeg, want niks skryf ooit neer dat iemand ’n
--                 liedjie gespeel het nie.
--   addons.sql    Die bemarkings-byvoegsel kan gekoop of toegeken word.
--   posting.sql   Die plaas-tou. Sonder dit antwoord dit "nie opgestel nie".
--   dubs.sql      Oorklanking. Dieselfde antwoord sonder dit.
--   invites.sql   Die uitnodigingsskakel in ’n saamwerk-e-pos.
--   listens.sql   Hoeveel kere ’n liedjie geluister is, per liedjie, vir die
--                 maker. Moet ná charts.sql loop.
--   kits.sql      Die Kits.AI minuut-teller. Sonder dit weet die rem nie
--                 hoeveel van die 400 aflaaiminute oor is nie, en dan is
--                 daar geen rem nie.
--   eleven.sql    Wat ElevenLabs per oproep gehef het, langs wat ons gevat
--                 het. Sonder dit is die eerste plek waar ’n verkeerde prys
--                 wys die faktuur.
--   hearts.sql    Harte op ’n plasing in die kamer, een per mens per
--                 liedjie.
--   buildon.sql   Mag iemand anders op hierdie liedjie voortbou — ’n greep
--                 daaruit sny, of by sy styl begin. Bring ook die styl self
--                 saam met die plasing.
--   elevenrem.sql Die rem op die ElevenLabs-toelae. Sonder dit is daar ’n
--                 waarskuwing per e-pos en niks wat keer nie.
--   roomwords.sql Die woorde van ’n liedjie, saam met die plasing. Sonder
--                 dit speel die kamer die liedjie en wys niks om by saam te
--                 lees nie.
--   livevideo.sql Video’s in die speelkamer, en ’n opname wat jy self gefilm
--                 het wat in jou kanaal bly. Sonder dit is daar geen knoppie
--                 om ’n video te plaas nie.
--   albumart.sql  Album art by regte kunstenaars: wie hulle is, wat te koop
--                 is, en die krediet wat saam met ’n liedjie na die
--                 speelkamer reis. Sonder dit is die kamer leeg en wys Live
--                 geen kunstenaar se naam nie.
--   aikoste.sql   Wat elke model-oproep gekos het, en wat die kas werklik
--                 gespaar het. Sonder dit bly die besparing ’n skatting — en
--                 ’n kas wat nooit tref nie lyk presies soos een wat altyd
--                 tref, behalwe op die rekening.
--   avatars.sql   Jou eie foto op jou profiel. Sonder dit is daar net ’n
--                 letter in ’n sirkel, en die oplaai antwoord dat dit nie
--                 opgestel is nie.
--   cast.sql      Die cast — gesigte wat jy een keer oplaai en in elke video
--                 weer gebruik. Sonder dit lyk die knoppie reg en die oplaai
--                 misluk elke keer.
--   mail.sql      Watter e-pos ons al gestuur het. Sonder dit kan niks keer
--                 dat dieselfde brief twee keer uitgaan nie.
--   taste.sql     Waarheen jy die meeste gaan en wat jy die meeste maak,
--                 sodat ’n voorstel joune is eerder as generies.
--   kitsmine.sql  Jou eie Kits.AI minute, los van die huis s’n. Sonder dit
--                 trek elke aflaai aan dieselfde teller.
--   afrikaans.sql Wanneer Afrikaans verkeerd uitkom, gese deur die mense wat
--                 dit hoor. Sonder dit is die knoppie daar en die verslag
--                 gaan nooit îrens heen nie.
--
-- ── Twee dinge moet reeds daar wees ────────────────────────────────────────
--
-- Hierdie lêer bou op twee tabelle wat uit ouer lêers kom:
--
--   public.events    uit supabase/events.sql   — charts.sql brei dit uit
--   public.collabs   uit supabase/collab.sql   — invites.sql wys daarna
--   public.tracks    uit supabase/schema.sql   — listens.sql tel net jou eie
--   public.creators  uit supabase/schema.sql   — avatars.sql hang 'n kolom aan
--
-- Die blok hieronder kyk daarvoor en sê in gewone woorde wat om eerste te
-- loop as een van hulle kort. Dit is met opset 'n sin eerder as 'n Postgres-
-- fout op reël 200 van iets wat jy pas geplak het.
--
-- ── Moenie hierdie lêer regmaak nie ────────────────────────────────────────
--
-- Dit word geskryf deur `npm run sql:bundle` uit die 21 lêers self.
-- Verander hulle en loop die skrip weer; `npm run check:sqlbundle` keer dat
-- die kopie stilweg van sy oorsprong af wegdryf.

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
  -- avatars.sql hang 'n kolom aan public.creators, en 'n kolom aan 'n tabel
  -- wat nie bestaan nie is 'n fout diep in iets wat jy pas geplak het.
  if to_regclass('public.creators') is null then
    raise exception
      'Loop eers supabase/schema.sql — avatars.sql hang jou profielfoto aan public.creators en dit bestaan nog nie.';
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

-- ── Wat één lid hierdie maand van Kits gebruik het ──────────────────────────
--
-- Carli, 9 September 2026: "Ek dink ons gaan baie streng cap op elke user moet
-- sit vir kits se stemkloning. Dus iets soos 5min per persoon. Dan stop ons die
-- funksie wanneer dit opgebruik word deur 'n maand."
--
-- `kits_seconds_this_month()` hierbo tel die hele werkskerm. Dit is die dak wat
-- Kits self stel, en dit keer dat die rekening opraak — maar dit sê niks oor
-- wié dit opgebruik het nie. Een lid wat vyftig minute omskakel, laat die ander
-- nege-en-sewentig met niks, en die eerste wat hulle daarvan weet is 'n
-- weiering.
--
-- Hierdie een tel dieselfde ding vir één eienaar. Dieselfde kalendermaand in
-- UTC, dieselfde tabel, dieselfde rede — dit is die per-lid helfte van 'n
-- antwoord waarvan die werkskerm-helfte reeds bestaan.
--
-- Let op: die per-lid dop voeg geen kapasiteit by nie. 400 minute gedeel deur
-- 5 is 80 lede, en dit bly 80. Wat dit verander is wié die 400 kry: eerlik
-- verdeel eerder as eerste-kom.
--
-- ── Hoekom dit hier staan en nie net in ALMAL.sql nie ───────────────────────
--
-- Dit is op 9 September met die hand in `ALMAL.sql` ingeskryf en nooit hier
-- nie. `ALMAL.sql` word gegenereer: die volgende `npm run sql:bundle` het dit
-- doodeenvoudig uitgevee, want die bron het dit nooit gehad nie.
-- `check:sqlbundle` het die hele tyd rooi gestaan en dít was hoekom.
-- Wat gegenereer word, word nie geredigeer nie.

create or replace function public.kits_seconds_this_month_for(p_owner uuid)
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(seconds), 0)::bigint
  from public.kits_minutes
  where owner = p_owner
    and at >= date_trunc('month', now() at time zone 'utc');
$$;

revoke all on function public.kits_seconds_this_month_for(uuid) from public, anon, authenticated;
grant execute on function public.kits_seconds_this_month_for(uuid) to service_role;

-- Een indeks vir albei funksies. Sonder die eienaar in die sleutel doen die
-- per-lid vraag 'n volledige skandering van 'n tabel wat by elke omskakeling
-- groei.
create index if not exists kits_minutes_owner_month_idx
  on public.kits_minutes (owner, at desc);


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


-- ═══════════════════════════════════════════════════════════════════════════
-- supabase/roomwords.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- FutureBox — die woorde van 'n liedjie, saam met die plasing in die kamer.
--
-- Loop dit ná live.sql, in dieselfde projek. Veilig om weer te loop.
--
-- ── Wat dit regmaak ──────────────────────────────────────────────────────
--
-- Carli, 14 September 2026: *"Die play room moet die liedjie se woorde
-- speel."*
--
-- Die speelkamer het die woorde nie gehad nie, en dit was nie 'n skerm wat
-- vergeet het om hulle te wys nie — hulle was nooit daar nie. 'n Plasing dra
-- die klank, die omslag, die titel en die genre, en die woorde het by die
-- maker se eie liedjie agtergebly. Iemand wat 'n liedjie in die kamer oopmaak
-- kon hom hoor en nie saamlees nie.
--
-- ── Waarom jsonb en nie teks nie ─────────────────────────────────────────
--
-- Omdat die kamer die woorde *speel* en nie net wys nie. 'n Reël wat oplig
-- wanneer sy beurt kom het 'n tyd nodig, nie net 'n string nie, en dit is
-- presies die vorm waarin die opname se woorde reeds hier rondgaan: 'n lys
-- van reëls, elk met sy eie begin. Teks sou beteken die tydsberekening word
-- elke keer weer geraai, en 'n geraaide tydsberekening is presies wat 'n
-- mens sien wanneer die woorde agter die sang aansleep.
--
-- Leeg toegelaat, want elke plasing wat reeds in die kamer is, is geplaas
-- voordat hierdie kolom bestaan het. Sonder woorde wys die kamer die
-- liedjie soos hy was; met woorde lees hy saam.

-- ── Dieselfde kolom staan ook in supabase/live.sql ─────────────────
--
-- Carli, 15 September: *"Dit lyk of ek 2 sql's moet hardloop."*
--
-- Dit is EEN verandering. live.sql bou die tabel, so die kolom hoort daar
-- vir 'n nuwe projek; hierdie lêer bestaan omdat live.sql reeds geloop het
-- op die projek wat loop, en 'n kolom wat by 'n reeds-gelope lêer bygevoeg
-- word, bereik niemand wat net die groot plak loop nie.
--
-- Albei is `if not exists`. Loop net een; albei is ook veilig.

alter table public.live_posts
  add column if not exists words jsonb;


-- ═══════════════════════════════════════════════════════════════════════════
-- supabase/livevideo.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- FutureBox — a filmed take is kept, and a video can go in the live room.
--
-- Run this after video.sql and live.sql, in the same project. Safe to run again.
--
-- ── What this is for ─────────────────────────────────────────────────────
--
-- Carli: *"Music videos en music shorts moet ook na live toe kan post. Ek sien
-- huidiglik dat my videos nie 'n opsie het om na live toe te kan post nie."*
--
-- She was right and the reason was in the schema rather than in the screen:
-- `live_posts.kind` is checked against three values and none of them is a
-- video, so there was no button to add. A room that cannot hold the thing is
-- not a room missing a button.
--
-- And *"die video nie in die channel save nie, sodat dit later in die live
-- channel gedeel kan word nie."* A take filmed in the words screen was
-- downloaded and forgotten. It has to be kept before it can be posted, which
-- is why both halves are in one file: neither is any use without the other.

-- ─────────────────────────────────────────────── a video in the room ────

-- The constraint is dropped and rebuilt rather than altered, because a check
-- constraint has no ALTER. Named explicitly: Postgres names an inline check
-- `<table>_<column>_check`, and a rebuild that guessed wrong would silently
-- leave the old three-value one in place beside a new one.
alter table public.live_posts drop constraint if exists live_posts_kind_check;
alter table public.live_posts
  add constraint live_posts_kind_check
  check (kind in ('track', 'episode', 'elsewhere', 'video'));

-- ──────────────────────────────────────────── a video worth posting ────
--
-- `videos` was written for Kling: a prompt, an aspect, a grade and what the
-- engine charged. A take somebody filmed on their own phone has none of
-- those and needs two things the table never held — a name a person chose,
-- and whether it was generated or filmed.
--
-- `source` is not decoration. It is what separates a row that cost credits
-- from one that cost nothing, which is the whole of the argument for letting
-- a browser cause a row to exist at all (see the policy below).
alter table public.videos
  add column if not exists title text not null default '',
  add column if not exists source text not null default 'engine',
  -- How long it runs, in seconds. `seconds` already exists and is what was
  -- *asked* for; a filmed take's length is what was actually recorded, and
  -- for a generated one the two are the same.
  add column if not exists seconds_real integer not null default 0;

-- Older rows are all generated, and saying so is truer than leaving them
-- empty: empty would read as "unknown" when it is known.
update public.videos set source = 'engine' where source = '' or source is null;

create index if not exists videos_owner_source_idx
  on public.videos (owner, source, created_at desc);

-- ───────────────────────────────────────────────────── the bucket ────
--
-- `video.sql` says "Nothing writes here from a browser. The file arrives from
-- Kling, through the server, which is the only party that has ever seen it."
-- That was true and it is no longer the whole story: a take filmed in this
-- app never touches a server until it is kept, and posting it through a
-- route would put a video file through the platform's four-and-a-half
-- megabyte body wall — which a minute of 1080p is over several times.
--
-- So the browser writes the FILE and the server still writes the ROW. The
-- rule that note was protecting is the row: "a browser that could insert its
-- own row could grant itself a video". That rule is untouched.
--
-- And the write is pinned to a `filmed/` folder inside the member's own
-- folder. Without that second clause this policy would also let a browser
-- overwrite `<owner>/<video id>.mp4` — a paid Kling render, replaced by
-- whatever it liked, in the account that paid for it. One clause, and the
-- two kinds of file cannot reach each other.
drop policy if exists "put own filmed video" on storage.objects;
create policy "put own filmed video" on storage.objects
  for insert with check (
    bucket_id = 'videos'
    and auth.uid()::text = (storage.foldername(name))[1]
    and (storage.foldername(name))[2] = 'filmed'
  );

-- Updating is NOT granted. An insert that lands on an existing key fails,
-- which is what we want: every take gets a name of its own, and a policy that
-- allowed replacement would be the overwrite the folder split just closed.


-- ═══════════════════════════════════════════════════════════════════════════
-- supabase/albumart.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────
-- Album art by real artists.
--
-- Carli, 20 September 2026: a room under SELL IT where real artists sell
-- album art. R200 a piece off the wall, R500 for a commissioned one-off.
-- Every piece unique and sold exactly once. An artist has a profile that
-- pops out, and a button — not a text box — that asks them for a one-off.
--
-- ── Why the messages are buttons and nothing else ───────────────────────
--
-- Her words: *"Ek as eienaar van die app moet bewus wees van dit, sodat
-- kunstenaar nie agter my rug kan kunswerk verkoop nie. Daarom net daai
-- buttons."*
--
-- A free-text message between a buyer and an artist is a place to swap a
-- phone number and do the deal off the platform, and the platform then
-- carries the cost of finding them each other and earns nothing. So there
-- is no message body in this schema at ALL. Not a nullable column, not an
-- empty string — there is nowhere to put one. A column that exists is a
-- column somebody wires a box to.
--
-- What a buyer can say is: "I want unique art", and which of their own
-- songs it is for. That is the whole vocabulary, and it is enough, because
-- the artist answers with a price and a date rather than with prose.
--
-- ── Run this in Supabase ────────────────────────────────────────────────
-- Paste the whole file into the SQL editor and run it. It is safe to run
-- twice; every statement is `if not exists`.
-- ─────────────────────────────────────────────────────────────────────────

-- ── The artists ─────────────────────────────────────────────────────────
-- Not every member. An artist is somebody the owner has let in, which is
-- why `approved` defaults to false: a marketplace anybody can list on is a
-- marketplace nobody trusts, and this one has the studio's name on it.
create table if not exists public.art_artists (
  id          uuid primary key default gen_random_uuid(),
  owner       uuid not null references auth.users (id) on delete cascade,
  name        text not null,
  -- What the pop-out says about them. Their words, written once.
  about       text not null default '',
  -- Where they are, because a buyer asking for something local cares.
  place       text not null default '',
  avatar      text,
  approved    boolean not null default false,
  created_at  timestamptz not null default now(),
  unique (owner)
);

-- ── The works ───────────────────────────────────────────────────────────
create table if not exists public.art_works (
  id          uuid primary key default gen_random_uuid(),
  artist      uuid not null references public.art_artists (id) on delete cascade,
  title       text not null,
  -- The stored file. 3000x3000, made by the browser, in the art bucket.
  path        text not null,
  -- Rand. The floor is R200 and an artist may ask more for a piece off the
  -- wall; a commission is settled per request in `art_offers` instead.
  rand        integer not null default 200 check (rand >= 200),
  -- ── Sold once, and the database is what says so ──────────────────────
  -- Her rule: *"elke kunswerk wat te koop is uniek is en net een keer
  -- verkoop."* A screen that hides a sold piece is a screen; two people
  -- pressing buy in the same second is a race, and a race is settled here
  -- or it is not settled. `sold_to` is the constraint: once it is set, the
  -- partial unique index below refuses a second sale of the same work.
  sold_to     uuid references auth.users (id) on delete set null,
  sold_at     timestamptz,
  created_at  timestamptz not null default now()
);

-- One sale per work, enforced rather than promised. Without this the rule
-- lives in whichever code path happens to check first.
create unique index if not exists art_works_sold_once
  on public.art_works (id)
  where sold_to is not null;

create index if not exists art_works_forsale_idx
  on public.art_works (created_at desc)
  where sold_to is null;

-- ── Asking an artist for a one-off ──────────────────────────────────────
-- Two buttons' worth of information and no more: who asked, whose art they
-- asked for, and which of their own songs it is for.
create table if not exists public.art_requests (
  id          uuid primary key default gen_random_uuid(),
  buyer       uuid not null references auth.users (id) on delete cascade,
  artist      uuid not null references public.art_artists (id) on delete cascade,
  -- The song they shared from their own channel. A title and an id, so the
  -- artist can hear it; nothing the buyer typed.
  song_id     text not null,
  song_title  text not null,
  created_at  timestamptz not null default now()
);

create index if not exists art_requests_artist_idx
  on public.art_requests (artist, created_at desc);

-- ── The artist's answer: a price and a date ─────────────────────────────
create table if not exists public.art_offers (
  id          uuid primary key default gen_random_uuid(),
  request     uuid not null references public.art_requests (id) on delete cascade,
  rand        integer not null default 500 check (rand > 0),
  -- Her four windows. Held here as well as in the app, because a database
  -- that accepts 37 days is a database that will one day contain 37 days.
  days        integer not null check (days in (2, 4, 6, 14)),
  -- paid → the buyer has been charged. accepted → the buyer pressed accept.
  -- delivered → the artist has uploaded, and only to that person.
  state       text not null default 'offered'
              check (state in ('offered', 'paid', 'accepted', 'delivered', 'declined')),
  -- The delivered file, readable by the buyer and nobody else.
  path        text,
  due_at      timestamptz,
  created_at  timestamptz not null default now(),
  unique (request)
);

-- ── Row-level security: shut, and shut on purpose ───────────────────────
--
-- All four tables are switched on and given no policy at all, which in
-- Postgres means the anon key reaches nothing. That is the intent, not an
-- oversight: every read and every write in this room goes through
-- `/api/artmarket`, which holds the service key and checks who is asking.
--
-- It has to work that way. The rules here are not "your own rows": a work is
-- visible to everybody until it sells and then to nobody but its buyer; an
-- offer is readable by exactly two people who are not each other; and the
-- sold-once race is settled by a conditional update that a browser must not
-- be able to phrase itself. Each of those is a sentence, and a policy that
-- is a sentence is a policy somebody will get subtly wrong. One route, one
-- place to read, one place to be wrong.
--
-- See `app/api/artmarket/route.ts`. If you ever add a policy here, the room
-- gains a second way in and this comment stops being true.
alter table public.art_artists enable row level security;
alter table public.art_works enable row level security;
alter table public.art_requests enable row level security;
alter table public.art_offers enable row level security;

-- ── The credit that travels with the song ───────────────────────────────
--
-- Carli: *"Binne live moet die liedjie naam, artist naam, style en dan die
-- kunstenaar se naam en art naam appear."*
--
-- Written onto the post rather than looked up. A live post is read by
-- strangers who cannot see the buyer's library, and a join to find out who
-- painted a cover is a join that returns nothing the day the artist leaves.
-- The credit is part of what was posted, like the genre beside it.
alter table public.live_posts
  add column if not exists art_title text not null default '';
alter table public.live_posts
  add column if not exists art_by text not null default '';

-- ── And the same credit on the song itself ──────────────────────────────
--
-- The live post carries a copy so strangers can read it, but the copy has
-- to be made from somewhere. This is the somewhere: when a buyer puts a
-- bought piece on one of their songs, the piece's title and the artist's
-- name are written here, and every room that shows the song — the channel,
-- the full-screen player, the post sheet — reads them from the one row.
--
-- Empty on every generated cover, which is most of them. Both or neither:
-- `creditLine` in `app/lib/artcredit.ts` prints nothing unless both halves
-- are filled, so a half-written credit says nothing rather than half a name.
alter table public.tracks
  add column if not exists art_title text not null default '';
alter table public.tracks
  add column if not exists art_by text not null default '';

-- Which work it was, so a piece cannot quietly end up on two songs and so
-- the buyer's collection can be listed back to them. Null for a generated
-- cover.
alter table public.tracks
  add column if not exists art_work uuid references public.art_works (id) on delete set null;

-- ── The bucket the pictures live in ─────────────────────────────────────
--
-- Private, and it has to be. A piece for sale is shown to everybody through
-- a short-lived signed address handed out by `/api/artmarket`; a commissioned
-- piece is shown to exactly one buyer and to nobody else. Her words:
-- *"'n upload button kry wat net aan daardie persoon geupload kan word."*
-- A public bucket makes both of those a guessable URL.
--
-- No storage policies at all, for the same reason the tables have none: the
-- route holds the service key and decides who may see which file. There is
-- no browser path to this bucket, so there is nothing for a policy to allow.
insert into storage.buckets (id, name, public)
values ('art', 'art', false)
on conflict (id) do update set public = false;

-- ── Wat aan elke kunstenaar uitbetaal moet word ─────────────────────────
--
-- Carli, 20 September 2026: *"Ek dink nie paystack doen sulke ekstra
-- uitbetalings nie. Dit sal in my rekening uitbetaal word en ek betaal dit
-- uit aan die kunstenaar."*
--
-- Sy is reg, en dit verander wat die app moet doen. As die geld in haar
-- rekening land en sy dit met die hand aanstuur, dan is die een ding wat sy
-- nodig het 'n staat: per kunstenaar, wat verkoop is, wat hulle kry, en wat
-- reeds betaal is. Sonder dit beteken "ek betaal dit self uit" dat sy dit
-- elke maand uit Paystack-uitvoere moet uitwerk.
--
-- Hierdie kolom is die hele meganisme. Null = nog nie betaal nie. 'n Datum
-- = betaal, en die aansig hieronder laat dit uit.
alter table public.art_works
  add column if not exists paid_out timestamptz;

-- Waarmee dit betaal is — 'n EFT-verwysing, 'n datum, wat ook al sy in haar
-- bankstaat sien. Vrye teks, want dit is haar eie nota aan haarself.
alter table public.art_works
  add column if not exists paid_note text not null default '';

-- ── Die staat ───────────────────────────────────────────────────────────
--
-- Een ry per kunstenaar met iets uitstaande. Die rand-bedrae word NIE hier
-- bereken nie: `split()` in `app/data/artmarket.ts` is die enigste plek waar
-- die 70/30 en die kaartfooi woon, en 'n tweede kopie daarvan in SQL is hoe
-- twee antwoorde vir een som ontstaan. Hierdie aansig gee die pryse; die
-- roete doen die som.
create or replace view public.art_owing as
  select a.id                                as artist,
         a.name                              as artist_name,
         count(w.id)                         as pieces,
         array_agg(w.rand order by w.sold_at) as rands,
         min(w.sold_at)                      as oldest_sale
    from public.art_works w
    join public.art_artists a on a.id = w.artist
   where w.sold_to is not null
     and w.paid_out is null
   group by a.id, a.name
   order by min(w.sold_at);

-- ── 'n Kunstenaar wat nog nie 'n rekening het nie ───────────────────────
--
-- Carli, 20 September 2026: *"Ek het nou reeds 'n kunstenaar wat ek wil in
-- sit."*
--
-- Daardie persoon is 'n regte skilder, nie 'n app-lid nie. Die tabel het
-- `owner` as not-null gehad, wat beteken 'n kunstenaar moes eers self
-- aanmeld, self aansoek doen en self oplaai voordat een kunswerk kon hang.
-- Vir die eerste kunstenaars — en vir enigeen wat nie 'n app wil gebruik om
-- 'n skildery te verkoop nie — is dit 'n deur wat niemand deurgaan nie.
--
-- So `owner` mag nou null wees. 'n Ry met null is 'n **huiskunstenaar**: die
-- eienaar laai hulle werk namens hulle op en betaal hulle met die hand,
-- presies soos sy in elk geval doen. As daardie persoon later 'n rekening
-- maak, word `owner` op hulle gestel en die profiel is reeds daar, met hulle
-- werk en hulle woorde in.
--
-- Die `unique (owner)` bly staan en doen steeds sy werk: Postgres tel nulls
-- nie as duplikate nie, so baie huiskunstenaars is reg en twee rye vir een
-- rekening bly onmoontlik.
alter table public.art_artists alter column owner drop not null;

-- ── Die voorskou, en waarom die skoon lêer apart lê ─────────────────────
--
-- Carli, 20 September 2026: *"Screenshots gaan die kunswerke skade doen."*
--
-- Sy is reg, en die eerlike posisie is dat nóg 'n screenshot nóg 'n foon se
-- kamera wat na die skerm wys, gekeer kan word deur enigiets wat 'n
-- webblad kan doen. Wat wél gedoen kan word, is om die kopie waardeloos te
-- maak: wys vir almal 'n gemerkte, klein voorskou, en gee die skoon lêer
-- net vir die een wat daarvoor betaal het.
--
-- `path` bly die skoon 3000px meester. `preview` is die gemerkte 1000px een
-- wat op die muur hang. Die roete gee `preview` vir almal en `path` vir
-- niemand behalwe die koper nie.
--
-- Leeg op elke werk wat opgelaai is voordat hierdie kolom bestaan het. Die
-- roete val dan terug op die meester, want 'n kamer wat niks wys nie is
-- erger as een wat te veel wys — en dit is 'n handjievol werke wat met die
-- hand vervang kan word.
alter table public.art_works
  add column if not exists preview text not null default '';

-- ── Dit is 'n veiling, nie 'n prys nie ─────────────────────────────────
--
-- Carli, 20 September 2026: *"Die R200 is die begin vir 'n bee rate, mense
-- moet op die bee, en die hoogste bee wen die art binne 36 hours."*
--
-- Dit verander die hele model. R200 is nie meer wat 'n werk kos nie — dit
-- is waar die bod oopmaak. `art_works.rand` bly staan en beteken nou die
-- **openingsbod**; wat betaal word, is die hoogste bod wanneer die klok
-- opraak.
--
-- ── Wanneer die klok begin en waarom dit hier lê ───────────────────────
--
-- 36 uur vanaf die oomblik wat die werk opgehang word. Op die ry en nie
-- bereken uit `created_at` nie, want 'n veiling se einde is 'n feit oor
-- daardie veiling: as 'n reël ooit verander, mag dit nie die werke wat
-- reeds loop terugdateer nie.
alter table public.art_works
  add column if not exists ends_at timestamptz;

-- Wie gewen het toe die klok opgeraak het, en wanneer. Dit is NIE verkoop
-- nie: `sold_to` word eers geskryf wanneer daar betaal is. Die twee apart
-- te hou is wat 'n wenner wat nie betaal nie, van 'n verkoop skei.
alter table public.art_works
  add column if not exists won_by uuid references auth.users (id) on delete set null;
alter table public.art_works
  add column if not exists won_at timestamptz;

-- ── Die bodde ───────────────────────────────────────────────────────────
--
-- Een ry per bod, en niks word ooit oorgeskryf nie. 'n Veiling waarvan die
-- geskiedenis weggegooi word, is 'n veiling wat niemand kan nagaan as daar
-- 'n argument is nie — en met regte geld en regte kunstenaars kom daardie
-- argument.
create table if not exists public.art_bids (
  id          bigint generated always as identity primary key,
  work        uuid not null references public.art_works (id) on delete cascade,
  bidder      uuid not null references auth.users (id) on delete cascade,
  -- Rand. Die roete dwing die minimum af; die databasis dwing af dat dit
  -- ten minste die vloer is, want 'n bod onder R200 is nooit geldig nie.
  rand        integer not null check (rand >= 200),
  at          timestamptz not null default now()
);

create index if not exists art_bids_work_idx on public.art_bids (work, rand desc);

alter table public.art_bids enable row level security;
-- Geen policy nie: alles gaan deur /api/artmarket, soos die res van hierdie
-- kamer. 'n Blaaier wat self 'n bod kan skryf, is 'n veiling sonder reëls.
drop policy if exists "bids are server only" on public.art_bids;

-- ── Die huidige stand van elke veiling ─────────────────────────────────
--
-- Die hoogste bod en hoeveel daar was. As 'n aansig eerder as in die roete
-- bereken, sodat "wie lei" een antwoord het en nie een per skerm nie.
create or replace view public.art_top_bids as
  select work,
         max(rand)   as top,
         count(*)    as bids
    from public.art_bids
   group by work;

-- ── Die klok begin by die eerste bod ───────────────────────────────────
--
-- Carli, 20 September 2026: *"Die beeing begin wanneer iemand begin bee."*
--
-- Dit was 36 uur vandat die werk opgehang is, wat beteken 'n werk wat op 'n
-- Dinsdagoggend opgaan en wat niemand Woensdag sien nie, se veiling is
-- verby voordat dit begin het. Nou bly `ends_at` **null** totdat die eerste
-- bod inkom, en word dan op 36 uur van daardie oomblik af gestel. 'n Werk
-- sonder bodde wag, vir so lank as wat dit moet.
--
-- Niks om te verander nie — die kolom was reeds nullable. Die reël woon in
-- die roete, en hierdie nota is hier sodat iemand wat na die tabel kyk nie
-- dink 'n null is 'n ontbrekende waarde nie. Dit is 'n veiling wat nog nie
-- begin het nie.

-- ── Wie mag bie ────────────────────────────────────────────────────────
--
-- *"Elke persoon sal 'n R50 by in moet hê om te mag bee, want anders kan
-- enige random mens die prys opstoot."*
--
-- Sy is reg en dit is die ouderdomsoue rede waarom 'n vendusie registrasie
-- vra: 'n bod is 'n belofte om te betaal, en 'n belofte wat niks kos nie,
-- is niks werd nie. Een keer R50, en daarna mag jy bie — op enige werk, vir
-- altyd. Nie per werk nie: 'n fooi per stuk maak van elke veiling 'n
-- tolhek, en dit is nie wat sy gevra het nie.
--
-- Een ry per persoon. `reference` is Paystack se eie verwysing, sodat 'n
-- betaling wat twee keer deurkom nie twee rye maak nie.
create table if not exists public.art_bidders (
  owner       uuid primary key references auth.users (id) on delete cascade,
  reference   text not null default '',
  paid_at     timestamptz not null default now()
);

alter table public.art_bidders enable row level security;
-- Geen policy nie: die roete sê wie mag bie, nie die blaaier nie.
drop policy if exists "bidders are server only" on public.art_bidders;

-- ── Wat werklik betaal is ───────────────────────────────────────────────
--
-- `rand` is die **openingsbod**. Sedert die kamer 'n veiling geword het, is
-- dit nie meer wat iemand betaal het nie — en die uitbetalingstaat het dit
-- steeds as die prys gelees. 'n Werk wat op R900 gesluit het, sou die
-- kunstenaar op R200 betaal het: R133,70 in plaas van R606,55.
--
-- Dieselfde fout in die ander rigting vir 'n bestelling: die ry wat by
-- lewering geskep word het `rand` op die vloer van R200 gehad, terwyl die
-- kunstenaar 'n prys van R500 genoem het.
--
-- So: een kolom wat sê wat werklik oorbetaal is. Die webhook skryf dit uit
-- die bedrag wat die betaaldiens gehef het — nie uit 'n bod wat intussen
-- kon verander nie — en `deliver` skryf die bestelling se eie prys.
--
-- Null op elke ry wat voor hierdie kolom verkoop is; die staat val dan
-- terug op `rand`, wat vir daardie rye korrek was.
alter table public.art_works
  add column if not exists paid_rand integer check (paid_rand is null or paid_rand >= 0);

-- Die staat lees nou daardie kolom. Dit word hier oorgeskryf en nie boontoe
-- by die eerste `create view` verander nie: op 'n skoon databasis bestaan
-- `paid_rand` eers 'n paar reëls hierbo, en 'n aansig kan nie na 'n kolom
-- verwys wat nog nie daar is nie.
--
-- Carli, 20 September 2026: *"Die kunstenaar kry nie geld vir die by in nie,
-- net vir die wen prys."* Die R50 inkoop staan in `art_bidders` en daardie
-- tabel word hier nêrens gejoin nie — dit is wat daardie reël in die
-- databasis waar hou. Die staat tel net verkoopte werke.
create or replace view public.art_owing as
  select a.id                                as artist,
         a.name                              as artist_name,
         count(w.id)                         as pieces,
         array_agg(coalesce(w.paid_rand, w.rand) order by w.sold_at) as rands,
         min(w.sold_at)                      as oldest_sale
    from public.art_works w
    join public.art_artists a on a.id = w.artist
   where w.sold_to is not null
     and w.paid_out is null
   group by a.id, a.name
   order by min(w.sold_at);

-- ── Die buy-in is PER WERK ──────────────────────────────────────────────
--
-- Carli, 20 September 2026: *"Jy het dit ook verkeerd R50 buy in is per
-- piece. Dit is nie vir elke bidding nie."*
--
-- Ek het dit as een keer vir altyd gebou. Dit is 'n ander ding: 'n eenmalige
-- R50 laat iemand vir die res van hulle lewe op elke werk bie, en die reël
-- waarvoor sy die fooi gevra het — *"anders kan enige random mens die prys
-- opstoot"* — geld dan net vir die eerste werk. Per werk is dit wat sy
-- bedoel het: op elke stuk sit jy jou eie R50 in voordat jy op DAARDIE stuk
-- mag bie.
--
-- Die sleutel word dus die persoon én die werk. `art_bidders` het `owner`
-- as die primêre sleutel gehad, so daardie beperking moet val en 'n
-- saamgestelde een kom in die plek.
alter table public.art_bidders
  add column if not exists work uuid references public.art_works (id) on delete cascade;

-- Rye wat voor hierdie verandering betaal is, is vir geen werk nie. Hulle
-- kan nie 'n saamgestelde sleutel deel nie en hulle is nie meer geldig nie:
-- daardie mense het vir 'n reël betaal wat nie meer bestaan nie. Daar is
-- nog niemand nie — die kamer het nog nooit 'n bod gehad nie — so dit is
-- veilig. As daar ooit wel was, sou dit 'n terugbetaling wees en nie 'n
-- delete nie.
delete from public.art_bidders where work is null;

alter table public.art_bidders
  alter column work set not null;

-- Die ou sleutel af, die nuwe een op. Per naam gedroplaat sodat dit twee
-- keer kan loop.
alter table public.art_bidders
  drop constraint if exists art_bidders_pkey;
alter table public.art_bidders
  add constraint art_bidders_pkey primary key (owner, work);


-- ═══════════════════════════════════════════════════════════════════════════
-- supabase/aikoste.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- FutureBox — wat die model werklik gekos het, en wat die kas werklik gespaar het.
--
-- Loop dit ná schema.sql, in dieselfde projek. Veilig om weer te loop.
--
-- ── Waarom dit bestaan ────────────────────────────────────────────────────
--
-- Prompt caching is op 19 September 2026 aangeskakel, en `docs/MAANDELIKSE-
-- KOSTE.md` het met opset GEEN besparing aangeteken nie:
--
--   "'n Kas wat nooit tref nie lyk presies soos een wat altyd tref, behalwe
--    op die rekening."
--
-- Daardie sin is die hele rede vir hierdie tabel. 'n Kas wat misluk gee geen
-- fout nie: die merker word aanvaar en doen eenvoudig niks. En die tarief is
-- 'n kwart *duurder* vir 'n druk wat alleen staan. So die besparing mag nie
-- bereken word uit 'n aanname oor hoe dikwels dit tref nie — dit moet gelees
-- word uit oproepe wat werklik gebeur het.
--
-- Die app het dit tot nou toe net na die log geskryf, waar dit verouder en
-- niemand dit optel nie. Dieselfde fout as `eleven_costs` voor dit bestaan
-- het, en dieselfde oplossing.
--
-- Een ry per oproep. Geen prompt, geen antwoord, geen naam — net watter
-- roete, hoeveel tokens in elke van die vier emmers, en watter model.

create table if not exists public.ai_costs (
  id            bigint generated always as identity primary key,
  -- 'help', 'copilot', 'songfrom', … — die roete se eie naam vir homself.
  -- Vrye teks eerder as 'n check, sodat 'n nuwe roete nie 'n migrasie nodig
  -- het nie; 'n naam wat verkeerd gespel is wys in die aansig as sy eie ry.
  what          text not null,
  model         text not null default '',
  -- Die vier emmers, presies soos die model dit self gerapporteer het.
  -- Nie-negatief, want 'n negatiewe telling is 'n leesfout en nie 'n oproep.
  input_tokens  integer not null default 0 check (input_tokens >= 0),
  output_tokens integer not null default 0 check (output_tokens >= 0),
  cache_read    integer not null default 0 check (cache_read >= 0),
  cache_write   integer not null default 0 check (cache_write >= 0),
  at            timestamptz not null default now()
);

create index if not exists ai_costs_at_idx on public.ai_costs (at desc);
create index if not exists ai_costs_what_idx on public.ai_costs (what, at desc);

alter table public.ai_costs enable row level security;

-- Niemand lees dit uit die blaaier nie. Die bediener skryf met die
-- diens-sleutel; `/api/aikoste` is die enigste pad wat 'n getal teruggee, en
-- dit weier sonder POST_SECRET. Presies soos `eleven_costs`.
drop policy if exists "ai costs are server only" on public.ai_costs;

-- ── Wat die kas gedoen het ────────────────────────────────────────────────
--
-- Per roete, oor die laaste 30 dae. Die kolomme wat saak maak:
--
--   hits      hoeveel oproepe werklik uit die kas gelees het
--   nothings  hoeveel niks gekas het nie — nie gelees én nie geskryf nie.
--             Dít is die stil mislukking. As hierdie kolom hoog bly terwyl
--             die merker aan is, is die prompt onder die 512-token vloer of
--             sy voorvoegsel verander tussen oproepe.
--
-- Die rand-bedrae word NIE hier bereken nie. Die tariewe en die wisselkoers
-- woon in `app/data/aiprices.ts`, en 'n tweede kopie daarvan in SQL is hoe
-- twee pryse vir een ding ontstaan. Hierdie aansig gee die tokens; die roete
-- doen die som.

create or replace view public.ai_cache_check as
  select what,
         count(*)                                             as calls,
         count(*) filter (where cache_read > 0)               as hits,
         count(*) filter (where cache_read = 0
                            and cache_write = 0)              as nothings,
         sum(input_tokens)                                    as input_tokens,
         sum(output_tokens)                                   as output_tokens,
         sum(cache_read)                                      as cache_read,
         sum(cache_write)                                     as cache_write,
         min(at)                                              as first_at,
         max(at)                                              as last_at
    from public.ai_costs
   where at > now() - interval '30 days'
   group by what
   order by sum(cache_read) + sum(input_tokens) desc;


-- ═══════════════════════════════════════════════════════════════════════════
-- supabase/avatars.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────── a face on a channel ──
--
-- A picture for a creator, and the bucket it lives in.
--
-- ── Why a column and not a convention ────────────────────────────────────
--
-- The path could have been derived — "avatars/<owner>/photo.webp" — and then
-- nothing would need storing. That falls down twice. A derived path cannot be
-- cache-busted, so replacing a photo leaves the old one on screen until the
-- browser feels like asking again; and there is no way to tell "no photo yet"
-- from "photo that failed to load", which is the difference between showing
-- initials and showing a broken image.
--
-- So the row holds the path, the path carries a stamp, and an empty column
-- means exactly one thing.
--
-- ── Public, and what that costs ──────────────────────────────────────────
--
-- The bucket is public, like `episodes` and unlike `tracks`. A profile picture
-- is shown to whoever is looking at the channel, including people not signed
-- in, and a signed URL that expires would mean every avatar in a list needing
-- a round trip and then breaking an hour later.
--
-- What that means honestly: anybody who knows the path can fetch the file, and
-- deleting the row does not delete the object. So replacing a photo overwrites
-- the same name rather than accumulating, and removing one deletes the object
-- as well as clearing the column — see `app/lib/avatar.ts`, which does both.

-- ─────────────────────────────────────────────────────────── what comes first ──
--
-- This adds a column to a table another file makes. Run out of order, Postgres
-- says `relation "public.creators" does not exist`, which is accurate and
-- tells you nothing about which file to run. So it is said in words instead.
--
-- Order: schema.sql → radar.sql → this one.
do $$
begin
  if to_regclass('public.creators') is null then
    raise exception
      'public.creators does not exist. Run supabase/radar.sql first (and supabase/schema.sql before that, if you have not).';
  end if;
end
$$;

alter table public.creators
  add column if not exists avatar_path text;

-- ────────────────────────────────────────────────────────────────── bucket ──

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = true;

-- Anyone may look; only the owner may put, replace or remove. The first path
-- segment is the owner's id, which is what ties a file to a person — the same
-- shape the episodes bucket uses.
--
-- Wrapped, because on some projects the SQL editor does not own
-- `storage.objects` and every one of these comes back as `42501: must be owner
-- of table objects`. That is a real thing to hit and it is not a mistake in
-- this file, so it says what to do instead of failing the whole script and
-- leaving the column half-added.
do $$
begin
  execute 'drop policy if exists "read avatars" on storage.objects';
  execute $p$create policy "read avatars" on storage.objects
    for select using (bucket_id = 'avatars')$p$;

  execute 'drop policy if exists "write own avatar" on storage.objects';
  execute $p$create policy "write own avatar" on storage.objects
    for insert with check (
      bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]
    )$p$;

  execute 'drop policy if exists "replace own avatar" on storage.objects';
  execute $p$create policy "replace own avatar" on storage.objects
    for update using (
      bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]
    )$p$;

  execute 'drop policy if exists "delete own avatar" on storage.objects';
  execute $p$create policy "delete own avatar" on storage.objects
    for delete using (
      bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]
    )$p$;
exception
  when insufficient_privilege then
    raise warning 'The avatars bucket was made, but its policies were refused: %. Add them by hand under Storage → avatars → Policies: read for everyone; insert, update and delete where (storage.foldername(name))[1] = auth.uid()::text.', sqlerrm;
end
$$;


-- ═══════════════════════════════════════════════════════════════════════════
-- supabase/cast.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- ──────────────────────────────────────────────────────────────── the cast ──
--
-- The people, places and products a set of clips is supposed to be about.
--
-- ── What this fixes ──────────────────────────────────────────────────────
--
-- A start frame is the only way to get the same face into two clips that are
-- meant to cut together — two prompts, however carefully written, give two
-- strangers. That already worked. What did not is that the picture lived in
-- one browser: `app/lib/assets.ts` keeps a shelf of twenty in IndexedDB, on
-- the device that uploaded them. Open the studio on a phone and the presenter
-- your last three adverts were built around is not there.
--
-- So a cast member is a row and a file on the account. Named, because "the
-- picture I used last Tuesday" is not how anybody thinks about a presenter,
-- and because a name is what makes it choosable in one press in any room.
--
-- ── Private, unlike avatars ──────────────────────────────────────────────
--
-- The avatars bucket is public: a profile picture is shown to people who are
-- not signed in, so it has to be. This one is the opposite. A cast member is
-- an *input* — somebody's face, an unreleased product, a location — and
-- nothing here ever publishes it. It is read by its owner, sent to the engine
-- with a generation, and that is the whole of its life.
--
-- That means the browser downloads it with the owner's own session rather than
-- building a URL, and the policies below are what make that safe.
--
-- ── Order ────────────────────────────────────────────────────────────────
--
-- Needs schema.sql only, for auth.users. Safe to run again.

do $$
begin
  if to_regclass('auth.users') is null then
    raise exception 'auth.users does not exist — this is not a Supabase project, or schema.sql has not been run.';
  end if;
end
$$;

create table if not exists public.cast_members (
  id          uuid primary key default gen_random_uuid(),
  owner       uuid not null references auth.users (id) on delete cascade,
  -- What they are called on the desk: "Sarel, the presenter", "the blue tin".
  name        text not null default '',
  -- Anything the picture cannot say: "always shot from his left", "the label
  -- must face camera". Written into the prompt by whoever is making the clip,
  -- not automatically — a note that silently edits a prompt is a note nobody
  -- can debug.
  note        text not null default '',
  -- Where the picture sits in the private `cast` bucket: <owner>/<stamp>.webp.
  -- Stamped rather than fixed, for the same reason as an avatar: a replaced
  -- picture behind a cached URL is the "I changed it and nothing happened"
  -- bug, and here it would be worse — the wrong face in a paid-for clip.
  path        text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists cast_members_owner_idx
  on public.cast_members (owner, created_at desc);

alter table public.cast_members enable row level security;

-- Yours alone, in every direction. Nothing about a cast member is public, and
-- there is no shared or discoverable case to carve out — unlike `creators`,
-- which exists to be found.
drop policy if exists "read own cast" on public.cast_members;
create policy "read own cast" on public.cast_members
  for select using (auth.uid() = owner);

drop policy if exists "write own cast" on public.cast_members;
create policy "write own cast" on public.cast_members
  for insert with check (auth.uid() = owner);

drop policy if exists "change own cast" on public.cast_members;
create policy "change own cast" on public.cast_members
  for update using (auth.uid() = owner) with check (auth.uid() = owner);

drop policy if exists "remove own cast" on public.cast_members;
create policy "remove own cast" on public.cast_members
  for delete using (auth.uid() = owner);

-- ────────────────────────────────────────────────────────────────── bucket ──

-- Private. `public => false` is the difference between a reference picture and
-- a published one, and it is the whole reason this is a separate bucket rather
-- than a folder in `avatars`.
insert into storage.buckets (id, name, public)
values ('cast', 'cast', false)
on conflict (id) do update set public = false;

-- Wrapped, because on some projects the SQL editor does not own
-- `storage.objects` and every one of these comes back as `42501: must be owner
-- of table objects`. Failing the whole script there would leave the table made
-- and the bucket unusable with no explanation.
do $$
begin
  execute 'drop policy if exists "read own cast picture" on storage.objects';
  execute $p$create policy "read own cast picture" on storage.objects
    for select using (
      bucket_id = 'cast' and auth.uid()::text = (storage.foldername(name))[1]
    )$p$;

  execute 'drop policy if exists "write own cast picture" on storage.objects';
  execute $p$create policy "write own cast picture" on storage.objects
    for insert with check (
      bucket_id = 'cast' and auth.uid()::text = (storage.foldername(name))[1]
    )$p$;

  execute 'drop policy if exists "replace own cast picture" on storage.objects';
  execute $p$create policy "replace own cast picture" on storage.objects
    for update using (
      bucket_id = 'cast' and auth.uid()::text = (storage.foldername(name))[1]
    )$p$;

  execute 'drop policy if exists "delete own cast picture" on storage.objects';
  execute $p$create policy "delete own cast picture" on storage.objects
    for delete using (
      bucket_id = 'cast' and auth.uid()::text = (storage.foldername(name))[1]
    )$p$;
exception
  when insufficient_privilege then
    raise warning 'The cast bucket was made, but its policies were refused: %. Add them by hand under Storage → cast → Policies: select, insert, update and delete, each where (storage.foldername(name))[1] = auth.uid()::text. Do NOT add a public read policy — this bucket is deliberately private.', sqlerrm;
end
$$;


-- ═══════════════════════════════════════════════════════════════════════════
-- supabase/mail.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────── mail log ────
--
-- What was sent, and — more to the point — what must not be sent twice.
--
-- Paystack retries a webhook on any non-2xx answer, and the webhook is where
-- receipts come from. Without a claim, a provider hiccup that made us answer
-- 500 would send a second receipt for the same payment on the retry. The
-- purchase itself is already guarded by its reference; this guards the letter.
--
-- The claim is a unique constraint rather than a check-then-insert, because
-- check-then-insert is a race between two webhook deliveries arriving at two
-- instances at once, and that is exactly the case it needs to survive.
--
-- It doubles as a record: which letters went, which failed, and why. When
-- somebody says they never got a receipt, this is the answer.

create table if not exists public.mail_log (
  id          uuid primary key default gen_random_uuid(),
  -- The claim. `receipt:<paystack reference>`, `welcome:<owner>`, and so on.
  dedupe_key  text not null unique,
  kind        text not null,
  to_email    text not null,
  -- Null until the send has been attempted. A row with `ok` still null is one
  -- that was claimed and never finished — a crash mid-flight, and worth
  -- looking at if somebody is missing a letter.
  ok          boolean,
  detail      text,
  claimed_at  timestamptz not null default now(),
  sent_at     timestamptz
);

create index if not exists mail_log_kind_idx on public.mail_log (kind, claimed_at desc);

-- ────────────────────────────────────────────────────── who may see what ────
--
-- On, with no policy: every read and write goes through the server. This table
-- holds the email address of every paying member, which is the last thing that
-- should be reachable with the anon key.

alter table public.mail_log enable row level security;

grant select, insert, update on public.mail_log to service_role;

-- ───────────────────────────────────────────────────────── housekeeping ────
--
-- The claim only has to outlive the retries — Paystack gives up long before a
-- day. A year is kept anyway, because "did my receipt go out in March" is a
-- question somebody asks, and the rows are three short strings.

create or replace function public.mail_log_sweep()
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.mail_log where claimed_at < now() - interval '1 year';
$$;


-- ═══════════════════════════════════════════════════════════════════════════
-- supabase/taste.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- ──────────────────────────────────────────────────────────── what you like ──
--
-- What somebody keeps coming back to, on the account rather than on a device.
--
-- ── What this fixes ──────────────────────────────────────────────────────
--
-- The welcome screen asks "another dubstep song today?" and it was reading
-- that out of `localStorage` — the songs in this browser and the things made
-- in this browser. On the phone, or on a second laptop, or after clearing
-- site data, the app knew nothing about the person in front of it and fell
-- back to "another song today?", which is a greeting addressed to nobody.
--
-- The copilot had it worse: it never read any of it. Thirteen rooms of
-- suggestions, none of them shaped by what this person actually does.
--
-- ── A rollup, deliberately not a log ─────────────────────────────────────
--
-- The obvious shape is one row per event — every song, every room opened,
-- timestamped. That would answer more questions and it is the wrong thing to
-- keep. A minute-by-minute record of when somebody works is a behavioural
-- profile; what the app actually needs is "dubstep, eleven times, last on
-- Tuesday", which is one row that gets updated.
--
-- So: a count and a last-seen per label. The app cannot reconstruct a
-- timeline from it because the timeline was never written down, and the
-- privacy notice can say that plainly rather than hedging.
--
-- ── Written by the server only ───────────────────────────────────────────
--
-- Same rule as `generations`: read your own, never write from the browser.
-- A count the browser can set is a count that means nothing, and this one
-- feeds what the app tells somebody about themselves.

create table if not exists public.taste (
  owner       uuid not null references auth.users (id) on delete cascade,
  -- 'genre' is what they make; 'room' is where they make it. Two kinds rather
  -- than two tables, because every question asked of one is asked of the other
  -- and a third kind should not need a migration.
  kind        text not null check (kind in ('genre', 'room')),
  -- Lower-cased on the way in so "Dubstep" and "dubstep" are one thing. The
  -- spelling shown back to somebody comes from their own library, not here.
  label       text not null check (label <> '' and length(label) <= 60),
  times       integer not null default 0 check (times >= 0),
  last_at     timestamptz not null default now(),
  primary key (owner, kind, label)
);

-- The only query this table is asked: everything for one person, commonest
-- first. Small enough that the primary key would do, and named so it is
-- obvious which query it is for.
create index if not exists taste_owner_times_idx
  on public.taste (owner, kind, times desc);

alter table public.taste enable row level security;

-- Read your own. There is no policy for insert, update or delete on purpose:
-- the server writes with the service role, which bypasses RLS by design, and
-- the browser gets no way in at all.
drop policy if exists "read own taste" on public.taste;
create policy "read own taste" on public.taste
  for select using (auth.uid() = owner);

-- ─────────────────────────────────────────────────────────────── the write ──
--
-- One statement, so a count can never be read, incremented and written back
-- with somebody else's write in between. `on conflict` is what makes this a
-- rollup rather than a log.

create or replace function public.note_taste(
  p_owner uuid,
  p_kind text,
  p_label text
)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.taste (owner, kind, label, times, last_at)
  values (p_owner, p_kind, lower(trim(p_label)), 1, now())
  on conflict (owner, kind, label)
  do update set times = public.taste.times + 1, last_at = now();
$$;

-- ────────────────────────────────────────────────────────────── forgetting ──
--
-- Somebody has to be able to make the app stop knowing this, and the account
-- screen offers it. Deleting the account already takes it — the foreign key
-- cascades — but wanting the suggestions to stop is not the same as wanting
-- the account gone, and only offering the second is not offering a choice.

create or replace function public.forget_taste(p_owner uuid)
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.taste where owner = p_owner;
$$;

revoke all on function public.note_taste(uuid, text, text) from public, anon, authenticated;
revoke all on function public.forget_taste(uuid) from public, anon, authenticated;


-- ═══════════════════════════════════════════════════════════════════════════
-- supabase/kitsmine.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Wat één lid hierdie maand van Kits gebruik het ──────────────────────────
--
-- Carli, 9 September 2026: "Ek dink ons gaan baie streng cap op elke user moet
-- sit vir kits se stemkloning. Dus iets soos 5min per persoon. Dan stop ons die
-- funksie wanneer dit opgebruik word deur 'n maand."
--
-- `kits_seconds_this_month()` in kits.sql tel die hele werkskerm. Dit is die
-- dak wat Kits self stel, en dit keer dat die rekening opraak — maar dit sê
-- niks oor wié dit opgebruik het nie. Een lid wat vyftig minute omskakel, laat
-- die ander nege-en-sewentig met niks, en die eerste wat hulle daarvan weet is
-- 'n weiering.
--
-- Hierdie een tel dieselfde ding vir één eienaar. Dieselfde kalendermaand in
-- UTC, dieselfde tabel, dieselfde rede — dit is die per-lid helfte van 'n
-- antwoord waarvan die werkskerm-helfte reeds bestaan.
--
-- Let op: die per-lid dop voeg geen kapasiteit by nie. 400 minute gedeel deur
-- 5 is 80 lede, en dit bly 80. Wat dit verander is wié die 400 kry: eerlik
-- verdeel eerder as eerste-kom.

create or replace function public.kits_seconds_this_month_for(p_owner uuid)
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(seconds), 0)::bigint
  from public.kits_minutes
  where owner = p_owner
    and at >= date_trunc('month', now() at time zone 'utc');
$$;

revoke all on function public.kits_seconds_this_month_for(uuid) from public, anon, authenticated;
grant execute on function public.kits_seconds_this_month_for(uuid) to service_role;

-- Een indeks vir albei funksies. Sonder die eienaar in die sleutel doen die
-- per-lid vraag 'n volledige skandering van 'n tabel wat by elke omskakeling
-- groei.
create index if not exists kits_minutes_owner_month_idx
  on public.kits_minutes (owner, at desc);


-- ═══════════════════════════════════════════════════════════════════════════
-- supabase/afrikaans.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- ──────────────────────────────────────── woorde wat verkeerd uitgekom het ──
--
-- Loop dit in Supabase → SQL Editor. Veilig om weer te loop.
--
-- ── Wat dit is, en hoekom dit bestaan ────────────────────────────────────
--
-- `app/lib/server/sayit.ts` sê dit self: 'n uitspraakwoordeboek is maklik om
-- te bou en onmoontlik om góéd te bou, want wat daarin hoort, moet uit
-- LUISTER kom. 'n Lys wat by 'n lessenaar uitgedink is, is 'n lys van woorde
-- wat die model waarskynlik reg sê.
--
-- Een mens se oor het `-tjie` gevind. Elke lid se oor vind die res.
--
-- Carli, 11 September 2026: "Kan ons dalk vir Afrikaanse generators vra om
-- vir ons terugvoer te gee as afrikaanse woorde nie reg uit kom nie?"
--
-- ── 'n Verslag is 'n KANDIDAAT, nooit 'n reël nie ────────────────────────
--
-- Niks hier raak ooit vanself aan wat mense hoor nie. Die reëls woon in
-- `sayit.ts`, as bronkode, en kom daar in deur 'n commit wat iemand gelees
-- het. Dit is die hele punt: skare-invoer wat regstreeks in 'n
-- uitspraakwoordeboek beland, is hoe iemand se grap in almal se Afrikaans
-- kom. Hierdie tabel is 'n lys om te lees, nie 'n bediener wat luister nie.
--
-- ── Waarom die skerm nie vra watter soort fout dit is nie ────────────────
--
-- 'n Lid wat hoor dat iets verkeerd klink, weet nie — en hoef nie te weet —
-- of die skrywer die woord verkeerd geskryf het of die stem dit verkeerd
-- gelees het. Dit is twee verskillende lêers en een oor. Die skerm vra dus
-- die woord en hoe dit moet klink; die `surface` en `spoken` kolomme word
-- deur die kode ingevul, en wie ook al die lys lees, besluit watter van die
-- twee dit is.

create table if not exists public.afrikaans_reports (
  id          uuid primary key default gen_random_uuid(),
  -- Wie dit aangemeld het. Kaskadeer: 'n verslag is iemand wat praat, en
  -- iemand wat weggegaan het, moet ophou praat — dieselfde reël as harte.
  owner       uuid not null references auth.users (id) on delete cascade,
  -- Die woord soos dit was. Kort gehou: dit is 'n woord, nie 'n paragraaf.
  word        text not null check (length(btrim(word)) between 1 and 80),
  -- Hoe dit behoort te klink, in gewone letters. Mag leeg wees — "dit klink
  -- verkeerd" is op sigself bruikbaar en veel beter as stilte.
  should      text not null default '' check (length(should) <= 120),
  -- Watter kamer, sodat 'n patroon sigbaar is.
  surface     text not null default '' check (length(surface) <= 40),
  -- Was dit gepraat of geskryf? Deur die kode ingevul, nie deur die lid nie.
  spoken      boolean not null default true,
  -- Waarnatoe gekyk is, as daar iets was — die teks wat gelees is, afgekap.
  said        text not null default '' check (length(said) <= 400),
  created_at  timestamptz not null default now()
);

-- Om die lys te lees soos dit inkom.
create index if not exists afrikaans_reports_at_idx
  on public.afrikaans_reports (created_at desc);

-- Om te sien watter woord die meeste mense pla, wat die een is om eerste
-- reg te maak.
create index if not exists afrikaans_reports_word_idx
  on public.afrikaans_reports (lower(btrim(word)));

alter table public.afrikaans_reports enable row level security;

-- Skryf jou eie, lees jou eie.
--
-- Nie "lees almal s'n" nie: 'n lid wat ander se verslae kan lees, kan sien
-- watter woorde ander mense laat maak het, wat niks met hulle te doen het
-- nie. Die volle lys word met die diens-sleutel gelees — sien
-- `/api/afrikaans` se GET, wat POST_SECRET vra.
drop policy if exists "add your own report" on public.afrikaans_reports;
create policy "add your own report" on public.afrikaans_reports
  for insert with check (auth.uid() = owner);

drop policy if exists "read your own reports" on public.afrikaans_reports;
create policy "read your own reports" on public.afrikaans_reports
  for select using (auth.uid() = owner);

-- ── 'n Rem, in die tabel eerder as in 'n roete ──────────────────────────
--
-- Dieselfde gedagte as `live_hearts` se saamgestelde sleutel: 'n reël wat in
-- die tabel staan, kan nie deur 'n roete gemis word nie. Een verslag per
-- mens per woord per dag. Iemand wat dieselfde woord tien keer aanmeld, is
-- nie tien stemme nie, en 'n lys waarin een woord tien keer staan, laat 'n
-- egte patroon soos ruis lyk.
--
-- ── Waarom die tydsone hier uitgeskryf staan ────────────────────────────
--
-- Dit was `(created_at::date)`, en Postgres weier dit botweg:
--
--   ERROR: functions in index expression must be marked IMMUTABLE
--
-- 'n `timestamptz` na 'n `date` hang af van die sessie se TimeZone, so die
-- uitdrukking kan môre 'n ander antwoord gee as vandag — en 'n indeks moet
-- vandag en môre dieselfde antwoord kry. Met die sone uitgeskryf, is dit
-- immutable en word dit aanvaar.
--
-- Dit is nie 'n truuk om die fout stil te maak nie; dit maak die reël ook
-- reg. "Een per dag" moet die lid se dag beteken, en ons lede is hier.
-- Suid-Afrika het geen somertyd nie, so die dag begin om middernag en bly
-- daar.
create unique index if not exists afrikaans_reports_one_a_day
  on public.afrikaans_reports (
    owner,
    lower(btrim(word)),
    ((created_at at time zone 'Africa/Johannesburg')::date)
  );

-- ─────────────────────────────────────── wat dit werklik geklink het ────
--
-- Carli, 14 September 2026: "Daar moet ook 'n pop out wees wat verduidelik
-- waarvoor hierdie feedback bar is en vra: hoe klink dit? Hoe moet dit
-- foneties klink?"
--
-- Twee vrae, en die eerste een het ontbreek. Die vorm het die WOORD gevra en
-- hoe dit MOET klink — en die stuk tussenin, wat die enjin werklik gesê het,
-- is die nuttigste van die drie. "voëltjie" plus "voëlkie" sê vir jou wat die
-- regte antwoord is; "voëltjie", "foeltsjie", "voëlkie" sê vir jou ook wat
-- verkeerd loop, en dít is wat 'n uitspraakreël moet vang.
--
-- Mag leeg wees, soos `should`. Iemand wat hoor dis verkeerd maar dit nie kan
-- oorskryf nie, is steeds die nuttigste ding wat ons kon gehoor het.
alter table public.afrikaans_reports
  add column if not exists heard text not null default '' check (length(heard) <= 120);
