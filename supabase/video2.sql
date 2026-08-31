-- FutureBox — more than one video engine, and the measurement that decides.
--
-- Run this after video.sql, in the same project. Safe to run again.
--
-- ── Why these columns exist ──────────────────────────────────────────────
--
-- Every price in this project that came off a vendor's pricing page has been
-- wrong. A figure that was per *year* read as a total. An image row read as
-- video. An "up to 650 videos" marketing maximum read as a rate. The one
-- number that survived was the one observed on a real account after a real
-- generation.
--
-- So the app stops believing pricing pages. It records, per generation, which
-- engine served it and what that engine's own units say it cost, and after a
-- few hundred rows the true cost per engine per length is a query rather than
-- an argument. Until then the estimates in the code keep the ceiling roughly
-- honest, and they are labelled as estimates where they live.
--
-- `grade` is what the member paid for — standard, better, premium — kept apart
-- from `provider`, which is what actually served it. They differ whenever an
-- engine inside a grade was full or refused, and being able to see how often
-- that happens is the point of storing both.

alter table public.videos
  add column if not exists provider text,
  add column if not exists provider_units integer,
  add column if not exists grade text,
  -- Whether the member downloaded it. The only honest signal of whether an
  -- engine was any good, and it costs one column to keep.
  add column if not exists kept boolean not null default false;

-- The old single-engine rows were all Kling, and saying so is truer than
-- leaving them null: null would read as "unknown engine" when it is known.
update public.videos
   set provider = 'kling',
       provider_units = kling_credits,
       grade = 'premium'
 where provider is null;

create index if not exists videos_provider_month_idx
  on public.videos (provider, created_at desc)
  where status <> 'failed';

-- What each engine has spent this calendar month, in its own units.
--
-- Per provider rather than one total, because each has its own package and one
-- running out says nothing about the others. Failed rows are excluded: none of
-- these engines charge for what they did not make.
create or replace function public.video_spend_this_month(p_provider text)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(coalesce(provider_units, kling_credits)), 0)::integer
  from public.videos
  where status <> 'failed'
    and provider is not distinct from p_provider
    and created_at >= date_trunc('month', now());
$$;

revoke all on function public.video_spend_this_month(text) from public, anon, authenticated;
grant execute on function public.video_spend_this_month(text) to service_role;

-- What a video actually costs, per engine, per length. The whole reason the
-- columns above exist. Empty until real generations have run — which is the
-- correct state for it to be in, and better than a number nobody measured.
--
-- Ninety days, not all of history. These vendors change their rates, and a
-- rate from last year is not evidence about this month's bill — it is an
-- average with a lie in it. Ninety days is long enough to gather a few hundred
-- rows and short enough that a price change works its way out within a
-- quarter. `since` says how far back the window actually reached, so a thin
-- answer can be recognised as thin rather than trusted as an average.
create or replace view public.video_costs as
  select provider,
         seconds,
         count(*) as made,
         round(avg(provider_units)) as avg_units,
         min(provider_units) as min_units,
         max(provider_units) as max_units,
         count(*) filter (where kept) as kept,
         min(created_at) as since
    from public.videos
   where status = 'done'
     and provider is not null
     and provider_units is not null
     and created_at >= now() - interval '90 days'
   group by provider, seconds;

revoke all on public.video_costs from public, anon, authenticated;
grant select on public.video_costs to service_role;
