-- FutureBox — recurring memberships, as Paystack knows them.
--
-- Run this after schema.sql and usage.sql, in the same project. Safe to run
-- again.
--
-- `memberships` already says which tier somebody is on and when the current
-- period ends; that stays the one thing the app reads when it decides what
-- anybody may do. This table is the other half: the payment provider's own
-- handles for the same arrangement, so a renewal can be recognised and a
-- cancellation can actually be sent.
--
-- Why it is needed at all. A first charge carries our metadata, so it says who
-- it belongs to. A renewal, months later, does not — Paystack raises it from
-- the subscription, not from the checkout we started. Without somewhere to
-- have written down that this customer is this person, every renewal after the
-- first would arrive with nowhere to go and the membership would lapse while
-- the money kept coming. So the customer code is written down on the first
-- charge and every renewal is matched on it.
--
-- The email token is Paystack's, and it is what their disable endpoint asks
-- for alongside the subscription code. It is not a credential for anything
-- else and it is never sent to a browser.

create table if not exists public.subscriptions (
  owner             uuid primary key references auth.users (id) on delete cascade,
  -- Paystack's handle for the person paying, e.g. CUS_xxxx. The join key for
  -- every renewal after the first.
  customer_code     text not null,
  -- Paystack's handle for the arrangement itself, e.g. SUB_xxxx. Null until
  -- their side has actually created it.
  subscription_code text,
  -- Required, with the code, to cancel. Paystack's word, not ours.
  email_token       text,
  -- Which of our Paystack plans this is, e.g. PLN_xxxx.
  plan_code         text,
  tier              text not null check (tier in ('maker', 'studio', 'label')),
  -- Paystack's own word for it: active, non-renewing, attention, cancelled,
  -- completed. Stored as they say it rather than mapped, so a status we have
  -- not seen before is still readable in the row.
  status            text not null default 'active',
  next_payment_at   timestamptz,
  updated_at        timestamptz not null default now()
);

create index if not exists subscriptions_customer_idx
  on public.subscriptions (customer_code);

alter table public.subscriptions enable row level security;

-- Reading your own is all a browser needs, and it is how the account screen
-- shows what is being charged and when. Every write is the webhook's or the
-- cancel route's, both of which hold the service key.
drop policy if exists "read own subscription" on public.subscriptions;
create policy "read own subscription" on public.subscriptions
  for select using (auth.uid() = owner);
