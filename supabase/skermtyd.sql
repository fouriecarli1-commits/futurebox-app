-- ─────────────────────────────────────────────────────────────────────────
-- Screen time, on the same row as the allowance
--
-- Carli, 10 October 2026: *"Dan moet die ouers die budget en screen time kan
-- stel. Wanneer screen time op is moet dit die kind uitskop."*
--
-- ── Why it is a sitting and not a daily total ───────────────────────────
--
-- Because of the word she used. "Uitskop" is what happens at the end of a
-- sitting: a grown-up hands the phone over, says twenty minutes, and when
-- the twenty minutes are gone the child is out and a grown-up has to let
-- them back in. A daily total is a different product — it needs a timezone,
-- a definition of midnight, and a decision about what happens to the twelve
-- minutes left at bedtime. Neither of those is what she described.
--
-- So `sitting_from` is when this sitting began, written by the GROWN-UP's
-- press and by nothing else. The child's room reads how much is left; it
-- cannot set it. That is the whole security model of the clock and it is
-- the reason the number is here rather than in the browser: a sitting kept
-- in `localStorage` is a sitting a reload restarts, and the one person
-- certain to try reloading is the child whose time just ran out.
--
-- ── Why it is nullable ──────────────────────────────────────────────────
--
-- `minutes` null means no clock at all, which is every room opened before
-- today and is a perfectly reasonable thing for a parent to want: a budget
-- with no timer. A zero would have had to mean either "no limit" or "no
-- time", and a column that cannot say which is a column somebody will read
-- the wrong way.
-- ─────────────────────────────────────────────────────────────────────────

alter table public.kids_mode
  -- How long one sitting may last. Null is no clock.
  add column if not exists minutes      integer,
  -- When this sitting began. Null is "not sitting", which is what a room
  -- with no clock looks like and also what a room looks like once the
  -- grown-up has ended the sitting by hand.
  add column if not exists sitting_from timestamptz;

alter table public.kids_mode
  drop constraint if exists kids_mode_minutes_sane;
alter table public.kids_mode
  -- Five minutes is the shortest worth handing over and four hours is the
  -- longest anybody means by "screen time". A check rather than a comment,
  -- because the number arrives from a browser.
  add constraint kids_mode_minutes_sane
  check (minutes is null or (minutes >= 5 and minutes <= 240));

-- ─────────────────────────────────────────────────────────────────────────
-- How many seconds of this sitting are left
--
-- Null means there is no clock on this room, which is NOT the same as zero
-- and the callers are written to tell them apart: null lets everything
-- through, zero shuts the room.
--
-- Negative never comes back. A sitting that ended forty minutes ago and a
-- sitting that ended one second ago are the same fact — the child is out —
-- and a caller that had to handle "minus 2400" would be handling a number
-- it has no use for.
-- ─────────────────────────────────────────────────────────────────────────

create or replace function public.kids_time_left(p_owner uuid)
returns integer
language plpgsql
stable
as $$
declare
  room public.kids_mode;
begin
  select * into room from public.kids_mode where owner = p_owner;
  if not found then
    return null;
  end if;
  if room.minutes is null or room.sitting_from is null then
    return null;
  end if;
  return greatest(
    0,
    room.minutes * 60 - floor(extract(epoch from (now() - room.sitting_from)))::integer
  );
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- Start a sitting, or start another one
--
-- The grown-up's press. It is the only thing that moves the clock, and that
-- is deliberate: the child's room may read the time left and may not set it.
--
-- It does NOT touch `spent`. "Another twenty minutes" is about the clock;
-- the allowance is the parent's other decision and topping one up is not
-- topping up the other.
-- ─────────────────────────────────────────────────────────────────────────

create or replace function public.kids_sit(p_owner uuid)
returns integer
language plpgsql
as $$
begin
  perform pg_advisory_xact_lock(hashtext(p_owner::text));

  update public.kids_mode
     set sitting_from = now()
   where owner = p_owner
     and minutes is not null;

  return public.kids_time_left(p_owner);
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- End this sitting now
--
-- The grown-up taking the phone back before the clock runs out. Clearing
-- `sitting_from` rather than winding it back: "not sitting" is a state this
-- shape already has, and inventing an expired timestamp to mean the same
-- thing would be a second way to say one fact.
-- ─────────────────────────────────────────────────────────────────────────

create or replace function public.kids_stand(p_owner uuid)
returns void
language plpgsql
as $$
begin
  update public.kids_mode set sitting_from = null where owner = p_owner;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- And the charge itself refuses once the time is up
--
-- This is the half that makes "kick the child out" mean anything. The room
-- closing itself is the polite half: it is a screen, and a screen can be
-- reloaded, reopened in a second tab, or simply left open while the clock
-- runs out. If the only thing stopping a press were the page, then a child
-- who pressed Make a song at nineteen minutes and fifty-nine seconds and
-- again at twenty-one minutes would be charged for both.
--
-- Replaced rather than added beside: two functions deciding whether a
-- child's press may go ahead is two answers the day they disagree, and the
-- one that disagrees quietly is the one that spends the money.
-- ─────────────────────────────────────────────────────────────────────────

create or replace function public.kids_spend(p_owner uuid, p_amount integer)
returns boolean
language plpgsql
as $$
declare
  room public.kids_mode;
  left_s integer;
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

  -- The clock, before the money. A sitting that is over is over whatever is
  -- left of the allowance, and telling a child "you have eight credits" when
  -- the answer is "your time is up" sends them to press the button again.
  left_s := public.kids_time_left(p_owner);
  if left_s is not null and left_s <= 0 then
    return false;
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

revoke all on function public.kids_time_left(uuid) from public, anon, authenticated;
revoke all on function public.kids_sit(uuid) from public, anon, authenticated;
revoke all on function public.kids_stand(uuid) from public, anon, authenticated;
grant execute on function public.kids_time_left(uuid) to service_role;
grant execute on function public.kids_sit(uuid) to service_role;
grant execute on function public.kids_stand(uuid) to service_role;
