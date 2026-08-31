-- FutureBox — the record of what was refused.
--
-- Run this after schema.sql, in the same project. Safe to run again.
--
-- Two reasons this table exists, and neither is punishment.
--
-- The first is that a refusal nobody can see is a refusal nobody can check.
-- If this platform is ever asked — by a rights holder, by a regulator, by
-- somebody whose voice was misused — whether it enforces its own rules, the
-- only useful answer is a list of the times it did. A policy document is a
-- claim; this is evidence.
--
-- The second is repetition. One refused prompt is somebody finding out where
-- the line is. Twenty is somebody looking for a way around it, and the account
-- needs to stop before the twenty-first.
--
-- ── What is kept, and what is not ────────────────────────────────────────
--
-- The excerpt is the first 200 characters of what was typed, because a
-- moderation log that does not say what was moderated cannot be reviewed by a
-- person, and every one of these will eventually need to be. It is the refused
-- text only: nothing that passed is written here.
--
-- `owner` is set to null when the account is deleted rather than the row going
-- with it. Deleting an account has to be real — and it is, everywhere else —
-- but a platform that forgets its refusals the moment somebody signs up again
-- has no memory at all. What is left behind is the rule, the surface, the time
-- and a salted hash of the address. Not a name, not an email, not an account.
-- The privacy policy says this in those words.

create table if not exists public.moderation_events (
  id uuid primary key default gen_random_uuid(),
  owner uuid references auth.users (id) on delete set null,
  -- Where it was typed: song, video, speech, name, finetune.
  surface text not null,
  -- Which rule refused it.
  rule text not null,
  -- Whether this one counts towards a suspension. A style prompt that strays
  -- near a famous name is a mistake; the rest are not.
  counts boolean not null default true,
  -- 'rules' for the fixed list, 'classifier' for the model that reads the
  -- sentence. Worth keeping apart: if one of them is wrong, it matters which.
  decided_by text not null default 'rules',
  excerpt text,
  ip_hash text,
  created_at timestamptz not null default now()
);

create index if not exists moderation_events_owner_idx
  on public.moderation_events (owner, created_at desc);

create index if not exists moderation_events_ip_idx
  on public.moderation_events (ip_hash, created_at desc);

-- Nobody reads this from a browser. No policy is granted on purpose: with row
-- level security on and no policy, the anon and authenticated roles can do
-- nothing at all, and the service role — which is server-only — bypasses it.
-- Somebody must not be able to read back the list of what they were refused
-- for, because that list is a map of where the line is.
alter table public.moderation_events enable row level security;

-- How many refusals count against this account in the window.
--
-- Counted by account *and* by address, so a suspension is not undone by
-- signing up again from the same machine. Nulls count nothing rather than
-- everything, which is the safe direction when a signal is simply missing.
create or replace function public.moderation_strikes(
  p_owner uuid,
  p_ip_hash text default null,
  p_days integer default 30
)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(count(*), 0)::integer
  from public.moderation_events e
  where e.counts
    and e.created_at >= now() - make_interval(days => greatest(1, p_days))
    and (
      (p_owner is not null and e.owner = p_owner)
      or (p_ip_hash is not null and p_ip_hash <> '' and e.ip_hash = p_ip_hash)
    );
$$;

revoke all on function public.moderation_strikes(uuid, text, integer) from public, anon, authenticated;
grant execute on function public.moderation_strikes(uuid, text, integer) to service_role;

-- The consent record that goes with a cloned voice lives in podcast.sql,
-- beside the table it describes. It was here, and this file then failed on any
-- project where the podcast migration had not been run yet — a migration that
-- reaches into another one's table is a migration with an order nobody was
-- told about.
