-- ─────────────────────────────────────────────── give an account an add-on ──
--
-- Run this in the Supabase SQL editor to put the marketing desk (R199) on one
-- account, so it can be used and looked at without a payment going through.
--
-- ── Why this and not a switch in the code ────────────────────────────────
--
-- "Open it for me so I can test it" can be answered two ways. One is a flag
-- in the app that lets somebody past the lock. The other is a row in the same
-- table a real purchase writes.
--
-- The flag is the wrong answer, and not by a little. It is a second way into
-- a paid room, which means a second thing to get right, a second thing to
-- test, and a second thing that can be left switched on at launch. Every
-- version of it starts as "just for testing" and none of them announce
-- themselves the morning they stop being that. The lock is on the server for
-- a reason and it should have exactly one key.
--
-- This writes the row that a Paystack webhook would have written. The app
-- cannot tell the difference, which is the point: what is being tested is the
-- real thing on the real path, not a lookalike behind a flag. Take it away
-- again with the last statement in this file and the account is back to where
-- everybody else stands.
--
-- ── Before you run it ────────────────────────────────────────────────────
--
--   1. supabase/addons.sql must already have been run. If `grant_addon` does
--      not exist, run that first.
--   2. Put the account's email address in the line marked below. It has to be
--      an account that has already signed in at least once — the address is
--      looked up in auth.users, and nothing is created here.
--
-- Running it twice adds another month rather than doing nothing, because the
-- reference changes each time. That is harmless and it is not free of
-- consequence: it is a month of a paid room given away, so run it once.

begin;

do $$
declare
  -- ── Put the email address here ─────────────────────────────────────────
  the_email text := 'PUT-THE-EMAIL-ADDRESS-HERE';
  -- ── The add-on and how long for ────────────────────────────────────────
  the_addon text := 'marketing';   -- must match MARKETING in app/lib/addons.ts
  the_days  integer := 31;
  who   uuid;
  until timestamptz;
begin
  -- ── The guard, by shape rather than by the placeholder's spelling ──────
  --
  -- This used to be `if the_email = 'PUT-THE-EMAIL-ADDRESS-HERE'`, and that
  -- is a trap: the obvious way to fill this in is to find-and-replace the
  -- placeholder, which replaces it HERE too — so the test becomes "is the
  -- address the address", it raises, and the message says nobody has been
  -- named at the exact moment somebody has. Found by `check:sqlruns`, which
  -- filled the file in the way a person would.
  --
  -- An address has an @ in it and a placeholder does not, so the shape is
  -- the honest test. It catches a typo that is not an address at all, too.
  if position('@' in the_email) = 0 then
    raise exception
      'Nobody has been named. Put the account''s email address in the_email first.';
  end if;

  select id into who from auth.users where lower(email) = lower(the_email);

  if who is null then
    raise exception
      'No account here has the address %. It has to have signed in at least once.', the_email;
  end if;

  -- The same function the payment webhook calls, with a reference that says
  -- where the month came from. A row in `addon_grants` that reads "test-…"
  -- is one that never had money behind it, which is worth being able to see
  -- when the takings are counted.
  select public.grant_addon(
    who,
    the_addon,
    the_days,
    'test-' || the_addon || '-' || to_char(now(), 'YYYYMMDDHH24MISS')
  ) into until;

  raise notice '% now has "%" until %.', the_email, the_addon, until;
end $$;

commit;

-- ── Taking it away again ────────────────────────────────────────────────
--
-- Uncomment and run this to end it now rather than waiting for the month.
-- The row stays, with a date in the past, which is what a lapsed month looks
-- like — so the app shows the sales page again and nothing is lost.
--
-- update public.addons
--    set until = now() - interval '1 minute', updated_at = now()
--  where addon = 'marketing'
--    and owner = (select id from auth.users where lower(email) = lower('PUT-THE-EMAIL-ADDRESS-HERE'));

-- ── What is open, and to whom ───────────────────────────────────────────
--
-- Worth running before a launch: anything here with a "test-" reference was
-- given away rather than bought.
--
-- select u.email, a.addon, a.until, a.reference
--   from public.addons a
--   join auth.users u on u.id = a.owner
--  where a.until > now()
--  order by a.until;
