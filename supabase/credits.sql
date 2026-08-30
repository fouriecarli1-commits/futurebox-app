-- FutureBox — credits, and the ledger they live in.
--
-- Run this after schema.sql and usage.sql, in the same project. Safe to run
-- again.
--
-- One currency across songs, videos, readings and training, priced off what
-- each of those actually costs. The scale itself lives in app/lib/credits.ts;
-- this file only holds the balance and makes the arithmetic safe.
--
-- ── Why a ledger and not a balance column ────────────────────────────────
--
-- A single `balance` integer is one lost update away from free credits. Two
-- requests read 40, both spend 30, both write 10, and somebody generated sixty
-- credits of music for thirty. A ledger of grants and spends has no such
-- moment: every row is an insert, the balance is their sum, and the history is
-- there when somebody asks why they were charged.
--
-- ── Why the functions and not application code ───────────────────────────
--
-- Checking a balance and then spending it are one decision, and split across
-- two round trips they are two — with room in between for the same person's
-- second tab. `spend_credits` takes a lock on the owner for the length of the
-- transaction, so two simultaneous spends of the same last credit cannot both
-- succeed. It is the only correct place for that check to live.
--
-- Nothing here is writable from a browser. The policies allow reading your own
-- history and nothing else; every write goes through the server, which holds
-- the service key.

create table if not exists public.credit_entries (
  id          bigint generated always as identity primary key,
  owner       uuid not null references auth.users (id) on delete cascade,
  -- Positive for a grant, negative for a spend. Never zero: an entry that
  -- changes nothing is a row that explains nothing.
  amount      integer not null check (amount <> 0),
  -- What happened, in a word the support desk can read: 'song', 'video',
  -- 'monthly', 'weekly', 'topup', 'refund'.
  reason      text not null,
  -- The track it made, or the payment reference behind a top-up.
  ref         text,
  -- Set on grants that may only happen once in a window: 'maker-2026-08',
  -- 'free-2026-08', 'weekly-2026-W35'. The unique index below is what makes a
  -- repeated grant a no-op rather than a second month's credits.
  period      text,
  created_at  timestamptz not null default now()
);

create index if not exists credit_entries_owner_idx
  on public.credit_entries (owner, created_at desc);

-- One grant per owner per window. Spends carry no period, and several spends a
-- second are ordinary, so the constraint has to skip them.
create unique index if not exists credit_entries_period_idx
  on public.credit_entries (owner, period)
  where period is not null;

alter table public.credit_entries enable row level security;

drop policy if exists "read own credits" on public.credit_entries;
create policy "read own credits" on public.credit_entries
  for select using (auth.uid() = owner);

-- ──────────────────────────────────────────────────────────── balance ────

create or replace function public.credit_balance(p_owner uuid)
returns integer
language sql
stable
as $$
  select coalesce(sum(amount), 0)::integer
  from public.credit_entries
  where owner = p_owner;
$$;

-- ────────────────────────────────────────────────────────────── spend ────

-- Spend, or refuse. True means the credits are gone and the caller may
-- proceed; false means the balance was short and nothing was written.
--
-- The advisory lock is per owner and lasts the transaction. It is what stops
-- two tabs from spending the same last credit. It costs nothing when there is
-- no contention, which is almost always.
create or replace function public.spend_credits(
  p_owner  uuid,
  p_amount integer,
  p_reason text,
  p_ref    text default null
)
returns boolean
language plpgsql
as $$
declare
  balance integer;
begin
  if p_amount <= 0 then
    return false;
  end if;

  perform pg_advisory_xact_lock(hashtext(p_owner::text));

  select coalesce(sum(amount), 0) into balance
  from public.credit_entries
  where owner = p_owner;

  if balance < p_amount then
    return false;
  end if;

  insert into public.credit_entries (owner, amount, reason, ref)
  values (p_owner, -p_amount, p_reason, p_ref);

  return true;
end;
$$;

-- ────────────────────────────────────────────────────────────── grant ────

-- Give credits, up to a ceiling, once per window.
--
-- Returns how many were actually given, which is not always what was asked
-- for. Two things trim it:
--
--   * the period. Called twice for the same month it writes nothing the second
--     time, so a page that refreshes does not hand out a second month.
--   * the cap. Somebody sitting on nearly a full balance gets topped up to the
--     ceiling and no further. Credits that pile up unspent are a bill that
--     arrives all at once — and with a hard monthly ceiling on the video
--     engine, all at once is exactly what cannot be served.
create or replace function public.grant_credits(
  p_owner  uuid,
  p_amount integer,
  p_reason text,
  p_period text,
  p_cap    integer
)
returns integer
language plpgsql
as $$
declare
  balance integer;
  room    integer;
  give    integer;
begin
  if p_amount <= 0 then
    return 0;
  end if;

  perform pg_advisory_xact_lock(hashtext(p_owner::text));

  -- Already given for this window.
  if p_period is not null and exists (
    select 1 from public.credit_entries
    where owner = p_owner and period = p_period
  ) then
    return 0;
  end if;

  select coalesce(sum(amount), 0) into balance
  from public.credit_entries
  where owner = p_owner;

  room := greatest(0, p_cap - balance);
  give := least(p_amount, room);
  if give <= 0 then
    return 0;
  end if;

  insert into public.credit_entries (owner, amount, reason, ref, period)
  values (p_owner, give, p_reason, null, p_period);

  return give;
end;
$$;

-- ───────────────────────────────────────────────────────────── top-up ────

-- A purchase. No cap and no period: somebody who has paid gets what they paid
-- for, and the ceiling above is about what is given away, not what is bought.
-- Written only by the payment webhook, and only once per reference.
create or replace function public.add_credits(
  p_owner  uuid,
  p_amount integer,
  p_ref    text
)
returns integer
language plpgsql
as $$
begin
  if p_amount <= 0 or p_ref is null then
    return 0;
  end if;

  -- The same charge can arrive twice; Paystack retries. The reference is the
  -- one thing that is stable across those retries.
  if exists (
    select 1 from public.credit_entries
    where owner = p_owner and reason = 'topup' and ref = p_ref
  ) then
    return 0;
  end if;

  insert into public.credit_entries (owner, amount, reason, ref)
  values (p_owner, p_amount, 'topup', p_ref);

  return p_amount;
end;
$$;
