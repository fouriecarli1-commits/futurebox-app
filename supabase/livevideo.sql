-- FutureBox — a filmed take is kept, and a video can go in the live room.
--
-- Run this after video.sql and live.sql, in the same project. Safe to run again.
--
-- ── What this is for ─────────────────────────────────────────────────────
--
-- Carli: *"Music videos en music shorts moet ook na live toe kan post. Ek sien
-- huidiglik dat my videos nie 'n opsie het om na live toe te kan post nie."*
--
-- She was right and the reason was in the schema rather than in the screen:
-- `live_posts.kind` is checked against three values and none of them is a
-- video, so there was no button to add. A room that cannot hold the thing is
-- not a room missing a button.
--
-- And *"die video nie in die channel save nie, sodat dit later in die live
-- channel gedeel kan word nie."* A take filmed in the words screen was
-- downloaded and forgotten. It has to be kept before it can be posted, which
-- is why both halves are in one file: neither is any use without the other.

-- ─────────────────────────────────────────────── a video in the room ────

-- The constraint is dropped and rebuilt rather than altered, because a check
-- constraint has no ALTER. Named explicitly: Postgres names an inline check
-- `<table>_<column>_check`, and a rebuild that guessed wrong would silently
-- leave the old three-value one in place beside a new one.
alter table public.live_posts drop constraint if exists live_posts_kind_check;
alter table public.live_posts
  add constraint live_posts_kind_check
  check (kind in ('track', 'episode', 'elsewhere', 'video'));

-- ──────────────────────────────────────────── a video worth posting ────
--
-- `videos` was written for Kling: a prompt, an aspect, a grade and what the
-- engine charged. A take somebody filmed on their own phone has none of
-- those and needs two things the table never held — a name a person chose,
-- and whether it was generated or filmed.
--
-- `source` is not decoration. It is what separates a row that cost credits
-- from one that cost nothing, which is the whole of the argument for letting
-- a browser cause a row to exist at all (see the policy below).
alter table public.videos
  add column if not exists title text not null default '',
  add column if not exists source text not null default 'engine',
  -- How long it runs, in seconds. `seconds` already exists and is what was
  -- *asked* for; a filmed take's length is what was actually recorded, and
  -- for a generated one the two are the same.
  add column if not exists seconds_real integer not null default 0;

-- Older rows are all generated, and saying so is truer than leaving them
-- empty: empty would read as "unknown" when it is known.
update public.videos set source = 'engine' where source = '' or source is null;

create index if not exists videos_owner_source_idx
  on public.videos (owner, source, created_at desc);

-- ───────────────────────────────────────────────────── the bucket ────
--
-- `video.sql` says "Nothing writes here from a browser. The file arrives from
-- Kling, through the server, which is the only party that has ever seen it."
-- That was true and it is no longer the whole story: a take filmed in this
-- app never touches a server until it is kept, and posting it through a
-- route would put a video file through the platform's four-and-a-half
-- megabyte body wall — which a minute of 1080p is over several times.
--
-- So the browser writes the FILE and the server still writes the ROW. The
-- rule that note was protecting is the row: "a browser that could insert its
-- own row could grant itself a video". That rule is untouched.
--
-- And the write is pinned to a `filmed/` folder inside the member's own
-- folder. Without that second clause this policy would also let a browser
-- overwrite `<owner>/<video id>.mp4` — a paid Kling render, replaced by
-- whatever it liked, in the account that paid for it. One clause, and the
-- two kinds of file cannot reach each other.
drop policy if exists "put own filmed video" on storage.objects;
create policy "put own filmed video" on storage.objects
  for insert with check (
    bucket_id = 'videos'
    and auth.uid()::text = (storage.foldername(name))[1]
    and (storage.foldername(name))[2] = 'filmed'
  );

-- Updating is NOT granted. An insert that lands on an existing key fails,
-- which is what we want: every take gets a name of its own, and a policy that
-- allowed replacement would be the overwrite the folder split just closed.
