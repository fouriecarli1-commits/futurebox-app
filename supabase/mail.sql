-- ───────────────────────────────────────────────────────────── mail log ────
--
-- What was sent, and — more to the point — what must not be sent twice.
--
-- Paystack retries a webhook on any non-2xx answer, and the webhook is where
-- receipts come from. Without a claim, a provider hiccup that made us answer
-- 500 would send a second receipt for the same payment on the retry. The
-- purchase itself is already guarded by its reference; this guards the letter.
--
-- The claim is a unique constraint rather than a check-then-insert, because
-- check-then-insert is a race between two webhook deliveries arriving at two
-- instances at once, and that is exactly the case it needs to survive.
--
-- It doubles as a record: which letters went, which failed, and why. When
-- somebody says they never got a receipt, this is the answer.

create table if not exists public.mail_log (
  id          uuid primary key default gen_random_uuid(),
  -- The claim. `receipt:<paystack reference>`, `welcome:<owner>`, and so on.
  dedupe_key  text not null unique,
  kind        text not null,
  to_email    text not null,
  -- Null until the send has been attempted. A row with `ok` still null is one
  -- that was claimed and never finished — a crash mid-flight, and worth
  -- looking at if somebody is missing a letter.
  ok          boolean,
  detail      text,
  claimed_at  timestamptz not null default now(),
  sent_at     timestamptz
);

create index if not exists mail_log_kind_idx on public.mail_log (kind, claimed_at desc);

-- ────────────────────────────────────────────────────── who may see what ────
--
-- On, with no policy: every read and write goes through the server. This table
-- holds the email address of every paying member, which is the last thing that
-- should be reachable with the anon key.

alter table public.mail_log enable row level security;

grant select, insert, update on public.mail_log to service_role;

-- ───────────────────────────────────────────────────────── housekeeping ────
--
-- The claim only has to outlive the retries — Paystack gives up long before a
-- day. A year is kept anyway, because "did my receipt go out in March" is a
-- question somebody asks, and the rows are three short strings.

create or replace function public.mail_log_sweep()
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.mail_log where claimed_at < now() - interval '1 year';
$$;
