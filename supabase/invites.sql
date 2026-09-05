-- FutureBox — inviting somebody who is not here yet.
--
-- Run this after collab.sql, in the same project. Safe to run again.
--
-- ── What this is for ────────────────────────────────────────────────────────
--
-- The radar can draft an email to a podcast host or another maker, and that
-- email had nowhere to send them. The collab room only exists once two
-- FutureBox accounts have accepted each other, so a stranger reading the
-- email had to find the app, sign up, work out the handle, and ask — four
-- steps between "yes, interesting" and a conversation.
--
-- A link is one step. It lands on the app, survives signing up, and turns
-- into a request from the person who sent it.
--
-- ── What the token is, and what it is not ───────────────────────────────────
--
-- It is a bearer for exactly one thing: **being asked to collaborate by the
-- person who made it**. It cannot read anything, cannot write anything else,
-- and names nobody until it is redeemed. The worst somebody can do with a
-- stolen link is end up with a collaboration request they can decline.
--
-- It expires, and it has a use limit. Both because an invite pasted into an
-- email lives forever otherwise, and a link in an old email that still opens
-- a door is a door nobody is watching.
--
-- Redemption goes through the server with the service role, which is why
-- there is no select policy for anybody but the owner: the person redeeming
-- must not be able to read the table, only to hand a token to a route that
-- can.

create table if not exists public.collab_invites (
  -- Long, random, and generated in the route rather than here: a database
  -- default would be the same generator for every row and this is the only
  -- secret in the table.
  token       text primary key,
  owner       uuid not null references auth.users (id) on delete cascade,
  -- What the invite is about, carried into the request so it arrives with a
  -- reason on it rather than as a cold call.
  note        text not null default '',
  uses        integer not null default 0,
  -- Small on purpose. One email is one person; a handful covers somebody
  -- pasting the same link into a few, and stops a link becoming a public door.
  max_uses    integer not null default 5,
  expires_at  timestamptz not null,
  created_at  timestamptz not null default now(),
  constraint collab_invites_uses_check check (uses >= 0 and max_uses > 0)
);

create index if not exists collab_invites_owner_idx
  on public.collab_invites (owner, created_at desc);

alter table public.collab_invites enable row level security;

-- Only the person who made it can see their own. Nobody can see anybody
-- else's, and nobody can look a token up from the browser at all — redeeming
-- is a route, not a read.
drop policy if exists "read own invites" on public.collab_invites;
create policy "read own invites" on public.collab_invites
  for select using (auth.uid() = owner);

-- Writing is the server's, with the service role, after it has checked the
-- token — the same rule as every other table in this app.

-- ── Redeeming, as one statement ────────────────────────────────────────────
--
-- Two things have to happen together: the use is counted and the request is
-- made. Apart, a redemption that failed halfway either burns a use with no
-- request behind it, or makes a request that the count never knew about — and
-- two people redeeming the last use at the same moment would both get one.
--
-- `for update` takes the row's lock, so the second caller waits and then sees
-- the count the first one wrote.
create or replace function public.redeem_collab_invite(p_token text, p_who uuid)
returns table (collab uuid, owner uuid, note text, problem text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite public.collab_invites%rowtype;
  v_existing uuid;
  v_made uuid;
begin
  select * into v_invite
    from public.collab_invites
   where token = p_token
     for update;

  if not found then
    return query select null::uuid, null::uuid, null::text, 'unknown'::text;
    return;
  end if;
  if v_invite.expires_at < now() then
    return query select null::uuid, null::uuid, null::text, 'expired'::text;
    return;
  end if;
  if v_invite.uses >= v_invite.max_uses then
    return query select null::uuid, null::uuid, null::text, 'used_up'::text;
    return;
  end if;
  if v_invite.owner = p_who then
    -- Following your own link is not a collaboration. Said rather than
    -- silently ignored: somebody testing their own link should be told why
    -- nothing happened.
    return query select null::uuid, v_invite.owner, v_invite.note, 'yourself'::text;
    return;
  end if;

  -- Already a thread, either way round. Handing back the existing one is the
  -- useful answer, and it does not burn a use: the link did its job the first
  -- time.
  select id into v_existing
    from public.collabs
   where (asked_by = v_invite.owner and asked_of = p_who)
      or (asked_by = p_who and asked_of = v_invite.owner)
   limit 1;
  if v_existing is not null then
    return query select v_existing, v_invite.owner, v_invite.note, 'already'::text;
    return;
  end if;

  insert into public.collabs (asked_by, asked_of, because)
  values (v_invite.owner, p_who, v_invite.note)
  returning id into v_made;

  update public.collab_invites
     set uses = uses + 1
   where token = p_token;

  return query select v_made, v_invite.owner, v_invite.note, ''::text;
end;
$$;

revoke all on function public.redeem_collab_invite(text, uuid) from public;
