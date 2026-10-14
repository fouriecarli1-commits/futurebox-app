-- Purchases made through Google Play, inside the Play Store app.
--
-- Carli, 14 October 2026: "Wanneer ek die app op die playstore gaan sit gaan
-- ek paystack afhaal en werk met die playstore se paying system." The website
-- keeps Paystack; inside the Android app, Play bills. See `app/lib/playproducts.ts`
-- and `app/api/play/route.ts`.
--
-- One row per Play purchase token. The token is what the phone hands us and
-- what Google is asked about; this row is what says WHOSE it is. The first
-- account to present a token claims it, and a second account presenting the
-- same token is refused — without this, one paid token sent from two accounts
-- would be two grants for one payment.
--
-- A subscription keeps its token across renewals, so a renewal that Google
-- announces months later (with nobody signed in) finds its owner here. An
-- upgrade or a re-subscribe issues a new token that names the old one as
-- `linked_token`, and the owner carries over through that.
--
-- Safe to run twice.

create table if not exists public.play_purchases (
  purchase_token  text primary key check (length(purchase_token) between 1 and 4096),
  owner           uuid not null references auth.users (id) on delete cascade,
  sku             text not null check (length(sku) between 1 and 100),
  kind            text not null check (kind in ('subscription', 'consumable')),
  -- The token this one replaced, when Play says so (an upgrade, a re-subscribe).
  linked_token    text,
  -- Google's own word for where it stands: 'SUBSCRIPTION_STATE_ACTIVE',
  -- 'PURCHASED', 'CONSUMED' and so on. Kept for the account screen and for
  -- anybody reading this table, not for deciding anything — every decision
  -- asks Google again.
  state           text not null default '',
  -- When a subscription's paid period ends. Null for a consumable.
  expires_at      timestamptz,
  -- The last order this token was granted for, so a renewal is granted once.
  last_order      text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists play_purchases_owner on public.play_purchases (owner);
create index if not exists play_purchases_linked on public.play_purchases (linked_token);

-- No policy at all: only the service key reads or writes this. The account
-- screen asks `/api/subscription`, which reads it on the member's behalf.
alter table public.play_purchases enable row level security;
