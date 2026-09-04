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
