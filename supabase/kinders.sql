-- ─────────────────────────────────────────────────────────────────────────
-- The child's allowance, enforced where the money is
--
-- Carli, 9 October 2026: *"Let the parent give an allowance on an opening
-- page."*
--
-- ── Why this is a table and not a number in the browser ─────────────────
--
-- Because an allowance kept in the browser is decoration. The child is on
-- the parent's phone, signed into the parent's account, pressing buttons
-- that charge the parent's credits — so a limit the page enforces is a limit
-- that a reload, or a second tab, or the room not having loaded yet, does
-- not. The only place a spending limit means anything is the place the
-- spending happens, and in this app that is `spend_credits`.
--
-- ── Why a row means "on" ────────────────────────────────────────────────
--
-- There is no `enabled` column. A row present IS kids mode; closing it is a
-- delete. The alternative — a boolean beside the allowance — allows a state
-- this app would then have to decide what to do about: switched on with no
-- allowance set, or switched off with an allowance half spent. A shape that
-- cannot hold a nonsense state does not need code that handles one.
--
-- ── What it does NOT try to be ──────────────────────────────────────────
--
-- A security boundary against the account holder. A parent who turns this
-- on can turn it off; so, in principle, can anybody holding the unlocked
-- phone it is turned on from. It is a budget, and the thing it is actually
-- protecting against is a six-year-old pressing a button forty times. For
-- that it is exact: while the row is there, every charge on the account is
-- counted and refused past the number the parent chose.
-- ─────────────────────────────────────────────────────────────────────────

create table if not exists public.kids_mode (
  owner       uuid primary key references auth.users (id) on delete cascade,
  -- What the parent handed over, in credits. `app/lib/kidsallowance.ts`
  -- derives the steps they are offered from the price of one song.
  allowance   integer not null check (allowance >= 0),
  -- What has gone, counted by `kids_spend` below rather than by the room.
  spent       integer not null default 0 check (spent >= 0),
  opened_at   timestamptz not null default now()
);

-- Read and written only by the route, which knows who is calling. Row level
-- security on with no policy is a closed door, and that is the intent
-- rather than an omission.
alter table public.kids_mode enable row level security;

revoke all on public.kids_mode from public, anon, authenticated;
grant select, insert, update, delete on public.kids_mode to service_role;

-- ─────────────────────────────────────────────────────────────────────────
-- Take it off the allowance, or refuse
--
-- `true` when the charge may go ahead: either this account is not in kids
-- mode at all, or there is enough allowance left and this took it. `false`
-- only when the allowance would be exceeded — which is the one case the
-- caller has to tell the child about.
--
-- The advisory lock is the same one `spend_credits` takes, on the same key,
-- so two presses landing together cannot both read the same remaining
-- allowance and both be allowed. Without it the limit is a suggestion under
-- exactly the conditions a child creates.
-- ─────────────────────────────────────────────────────────────────────────

create or replace function public.kids_spend(p_owner uuid, p_amount integer)
returns boolean
language plpgsql
as $$
declare
  room public.kids_mode;
begin
  if p_amount <= 0 then
    return true;
  end if;

  perform pg_advisory_xact_lock(hashtext(p_owner::text));

  select * into room from public.kids_mode where owner = p_owner;
  -- Not in kids mode: nothing here has an opinion about this charge.
  if not found then
    return true;
  end if;

  if room.spent + p_amount > room.allowance then
    return false;
  end if;

  update public.kids_mode
     set spent = spent + p_amount
   where owner = p_owner;

  return true;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- Give it back
--
-- Two callers, and both matter. A charge that is counted here and then
-- refused by `spend_credits` — the parent is out of credits entirely — must
-- not leave the child's allowance short for a song that was never made. And
-- a generation that is charged and then fails upstream is refunded to the
-- account, so it has to be refunded to the allowance as well, or a child
-- pays for the engine's bad afternoon.
--
-- `greatest(0, …)` because a release larger than what was spent is a bug
-- somewhere else, and the honest floor for "what this child has spent" is
-- nothing rather than a negative number that then reads as extra allowance.
-- ─────────────────────────────────────────────────────────────────────────

create or replace function public.kids_release(p_owner uuid, p_amount integer)
returns void
language plpgsql
as $$
begin
  if p_amount <= 0 then
    return;
  end if;

  perform pg_advisory_xact_lock(hashtext(p_owner::text));

  update public.kids_mode
     set spent = greatest(0, spent - p_amount)
   where owner = p_owner;
end;
$$;

revoke all on function public.kids_spend(uuid, integer) from public, anon, authenticated;
revoke all on function public.kids_release(uuid, integer) from public, anon, authenticated;
grant execute on function public.kids_spend(uuid, integer) to service_role;
grant execute on function public.kids_release(uuid, integer) to service_role;
