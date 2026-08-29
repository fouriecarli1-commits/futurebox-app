-- FutureBox — making the free tier cost what it is supposed to cost.
--
-- Run this after usage.sql, in the same project. Safe to run again.
--
-- The problem, stated plainly: the free tier gives two previews a day per
-- account, and an account is an email address. Somebody with a hundred
-- addresses has two hundred previews a day, and every one of them spends real
-- credits on the owner's ElevenLabs account. A limit that is trivially
-- multiplied is not a limit.
--
-- Three columns close the three easy ways to multiply it, and all three are
-- counted on the *free* tier only. Somebody paying has already been through a
-- card and is not the problem this solves.
--
--   * `email_key` — the address with the tricks taken out. Gmail ignores dots
--     and everything after a plus, so a.n.r.e+one@gmail.com and anre@gmail.com
--     are one inbox and are now one allowance.
--   * `ip_hash` — a salted hash of the address the request came from, so a
--     hundred fresh accounts from one machine share one ceiling. Hashed rather
--     than stored: equality is all this needs, and an IP is personal data.
--   * The disposable-domain check lives in the app, not here, because the list
--     changes and a migration is a bad place to keep a list that changes.
--
-- What this deliberately does not do: block anybody from signing up, or from
-- paying. It caps what can be spent for free.

alter table public.generations
  add column if not exists email_key text,
  add column if not exists ip_hash text;

create index if not exists generations_email_key_day_idx
  on public.generations (email_key, created_at desc);

create index if not exists generations_ip_day_idx
  on public.generations (ip_hash, created_at desc);

-- Today's free use, counted three ways at once.
--
-- One round trip rather than three, because this runs before every generation
-- and a gate that costs three queries is a gate that gets removed. Nulls are
-- treated as "not known", which counts nothing rather than counting everything.
create or replace function public.free_usage_today(
  p_owner uuid,
  p_email_key text,
  p_ip_hash text
)
returns table (by_owner bigint, by_email bigint, by_ip bigint)
language sql
stable
as $$
  select
    count(*) filter (where g.owner = p_owner),
    count(*) filter (where p_email_key is not null and g.email_key = p_email_key),
    count(*) filter (where p_ip_hash is not null and g.ip_hash = p_ip_hash)
  from public.generations g
  where g.kind = 'preview'
    and g.created_at >= date_trunc('day', now());
$$;
