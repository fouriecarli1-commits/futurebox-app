-- FutureBox — hosted video, and the ceiling that keeps it affordable.
--
-- Run this after schema.sql, in the same project. Safe to run again.
--
-- Kling answers a generation request with a task id and makes the video
-- afterwards, over minutes. So a video is a row before it is a file: started
-- here, collected later, and refunded if the engine gives up. Without the row
-- there is nothing to come back to when the browser has been closed, and a
-- member who closed a tab would have paid for a video nobody ever collects.
--
-- ── The ceiling, and why it is counted in Kling's credits ────────────────
--
-- The video plan is bought by the month and does not stretch. When it runs
-- out, every generation fails — and the failure a member would see is a
-- meaningless engine error at the end of a two-minute wait, after paying.
--
-- So the spend is counted here, before the request goes, in Kling's own
-- credits rather than in videos: a ten-second clip costs twice a five-second
-- one, and a ceiling counted in videos would be overspent by half without
-- anything looking wrong. Over the ceiling, the answer is immediate, honest,
-- and free: the allowance is used up, it comes back on the first.
--
-- Failed rows are not counted. Kling does not charge for what it did not make,
-- and neither does this.

create table if not exists public.videos (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references auth.users (id) on delete cascade,
  -- Kling's id for the job. Null only if the engine never accepted it.
  task_id text,
  prompt text not null,
  aspect text not null default '16:9',
  seconds integer not null default 5,
  -- What the member paid, in FutureBox credits, so a refund knows the amount.
  credits integer not null default 0,
  -- What it costs the platform, in Kling's credits. The ceiling counts these.
  kling_credits integer not null default 0,
  model text,
  status text not null default 'running' check (status in ('running', 'done', 'failed')),
  -- Set once the file has been fetched from Kling and put in our own bucket.
  -- Their URLs expire; a video a member cannot open next week is not a video.
  path text,
  error text,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);

create index if not exists videos_owner_idx on public.videos (owner, created_at desc);
create index if not exists videos_task_idx on public.videos (task_id);
create index if not exists videos_month_idx on public.videos (created_at desc) where status <> 'failed';

alter table public.videos enable row level security;

drop policy if exists "read own videos" on public.videos;
create policy "read own videos" on public.videos
  for select using (auth.uid() = owner);

-- No insert, update or delete policy on purpose. Every write happens on the
-- server after the token has been checked: a browser that could insert its own
-- row could grant itself a video, and one that could update a row could mark a
-- failure as done and keep the credits.

-- What the platform has spent with Kling this calendar month.
create or replace function public.kling_spend_this_month()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(kling_credits), 0)::integer
  from public.videos
  where status <> 'failed'
    and created_at >= date_trunc('month', now());
$$;

revoke all on function public.kling_spend_this_month() from public, anon, authenticated;
grant execute on function public.kling_spend_this_month() to service_role;

-- ─────────────────────────────────────────────────────────────── bucket ────
--
-- Private, unlike the podcast bucket. An episode is published; a video is the
-- member's until they decide otherwise, so it is read through a signed link
-- the server hands out rather than by anybody who guesses the path.

insert into storage.buckets (id, name, public)
values ('videos', 'videos', false)
on conflict (id) do update set public = false;

drop policy if exists "read own videos file" on storage.objects;
create policy "read own videos file" on storage.objects
  for select using (
    bucket_id = 'videos' and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "delete own videos file" on storage.objects;
create policy "delete own videos file" on storage.objects
  for delete using (
    bucket_id = 'videos' and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Nothing writes here from a browser. The file arrives from Kling, through the
-- server, which is the only party that has ever seen it.
