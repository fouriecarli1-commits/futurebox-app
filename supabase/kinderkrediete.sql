-- Kids credits: bought for the kids room, and spendable nowhere else.
--
-- the owner, 14 October 2026: "In die pricing page moet die kids room ook 'n
-- aparte prys hê. Die kids room met sy aparte credits moet net van die
-- welcoming page af geaccess kan word." And on the prices: "Prys voorstelle
-- is reg vir kids studio."
--
-- A separate balance rather than credits added to the account. A kids pack
-- is cheaper a credit than a top-up and needs no plan, so credits that
-- landed in the account would be the cheapest way into the grown-up studio.
-- Here they can only be taken by a charge made while the kids room is open
-- (`kids_mode` has a row), which is the room the parent paid for.
--
-- Run after supabase/kinders.sql and supabase/skermtyd.sql. Safe to run twice.

create table if not exists public.kids_wallet (
  owner          uuid primary key references auth.users (id) on delete cascade,
  credits        integer not null default 0 check (credits >= 0),
  -- The Paystack customer, so a monthly pack's renewal (which carries none
  -- of our metadata) can be credited to the right account.
  customer_code  text,
  updated_at     timestamptz not null default now()
);

create index if not exists kids_wallet_customer on public.kids_wallet (customer_code);

create table if not exists public.kids_wallet_entries (
  id      bigserial primary key,
  owner   uuid not null references auth.users (id) on delete cascade,
  -- Positive in, negative out. 'buy' and 'back' are in; 'spend' is out.
  amount  integer not null,
  reason  text not null check (reason in ('buy', 'spend', 'back')),
  ref     text,
  at      timestamptz not null default now()
);

-- A purchase is credited once, however many times Paystack retries it.
create unique index if not exists kids_wallet_bought_once
  on public.kids_wallet_entries (owner, ref) where reason = 'buy';

alter table public.kids_wallet enable row level security;
alter table public.kids_wallet_entries enable row level security;
revoke all on public.kids_wallet from public, anon, authenticated;
revoke all on public.kids_wallet_entries from public, anon, authenticated;
grant select, insert, update, delete on public.kids_wallet to service_role;
grant select, insert, update, delete on public.kids_wallet_entries to service_role;
grant usage, select on sequence public.kids_wallet_entries_id_seq to service_role;


-- A pack paid for. Returns what was added: 0 for a reference already seen.
create or replace function public.kids_wallet_add(
  p_owner uuid, p_amount integer, p_ref text, p_customer text default null
)
returns integer
language plpgsql
as $$
begin
  if p_amount <= 0 or p_ref is null then
    return 0;
  end if;

  perform pg_advisory_xact_lock(hashtext('kidswallet' || p_owner::text));

  if exists (
    select 1 from public.kids_wallet_entries
     where owner = p_owner and reason = 'buy' and ref = p_ref
  ) then
    return 0;
  end if;

  insert into public.kids_wallet_entries (owner, amount, reason, ref)
  values (p_owner, p_amount, 'buy', p_ref);

  insert into public.kids_wallet (owner, credits, customer_code)
  values (p_owner, p_amount, p_customer)
  on conflict (owner) do update
     set credits = public.kids_wallet.credits + excluded.credits,
         customer_code = coalesce(excluded.customer_code, public.kids_wallet.customer_code),
         updated_at = now();

  return p_amount;
end;
$$;


-- A charge made in the kids room. Takes as much of p_amount as the balance
-- holds and returns how much that was; the rest is the allowance's to cover.
-- Takes nothing when the kids room is not open: these credits are for it.
create or replace function public.kids_wallet_take(p_owner uuid, p_amount integer)
returns integer
language plpgsql
as $$
declare
  have integer;
  took integer;
begin
  if p_amount <= 0 then
    return 0;
  end if;
  if not exists (select 1 from public.kids_mode where owner = p_owner) then
    return 0;
  end if;
  -- The clock holds here too. A sitting that is over takes nothing, so the
  -- whole charge goes on to `kids_spend`, which refuses it for the same
  -- reason (supabase/skermtyd.sql). Null is a room with no clock.
  if coalesce(public.kids_time_left(p_owner), 1) <= 0 then
    return 0;
  end if;

  perform pg_advisory_xact_lock(hashtext('kidswallet' || p_owner::text));

  select credits into have from public.kids_wallet where owner = p_owner;
  if not found or have <= 0 then
    return 0;
  end if;

  took := least(have, p_amount);
  update public.kids_wallet
     set credits = credits - took, updated_at = now()
   where owner = p_owner;
  insert into public.kids_wallet_entries (owner, amount, reason)
  values (p_owner, -took, 'spend');
  return took;
end;
$$;


-- A failed generation, given back. Returns to the kids balance whatever of
-- p_amount the kids balance paid in the last two hours and has not had back,
-- and returns that number; the caller refunds the rest to the account.
--
-- Two hours because a refund does not always carry the charge's reference
-- (a video fails minutes after it was paid for), and the longest job in the
-- kids room is a ten-second video. Wrong in the safe direction: credits can
-- land in the kids balance, never leave it for the grown-up studio.
create or replace function public.kids_wallet_return(p_owner uuid, p_amount integer)
returns integer
language plpgsql
as $$
declare
  owed integer;
  back integer;
begin
  if p_amount <= 0 then
    return 0;
  end if;

  perform pg_advisory_xact_lock(hashtext('kidswallet' || p_owner::text));

  select coalesce(-sum(amount), 0) into owed
    from public.kids_wallet_entries
   where owner = p_owner
     and reason in ('spend', 'back')
     and at > now() - interval '2 hours';

  back := least(greatest(owed, 0), p_amount);
  if back <= 0 then
    return 0;
  end if;

  update public.kids_wallet
     set credits = credits + back, updated_at = now()
   where owner = p_owner;
  insert into public.kids_wallet_entries (owner, amount, reason)
  values (p_owner, back, 'back');
  return back;
end;
$$;

revoke all on function public.kids_wallet_add(uuid, integer, text, text) from public, anon, authenticated;
revoke all on function public.kids_wallet_take(uuid, integer) from public, anon, authenticated;
revoke all on function public.kids_wallet_return(uuid, integer) from public, anon, authenticated;
grant execute on function public.kids_wallet_add(uuid, integer, text, text) to service_role;
grant execute on function public.kids_wallet_take(uuid, integer) to service_role;
grant execute on function public.kids_wallet_return(uuid, integer) to service_role;
