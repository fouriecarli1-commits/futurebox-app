-- ─────────────────────────────────────────────────────────────────────────
-- The words she has heard said, and where the dictionary currently lives
--
-- Carli, 10 October 2026: *"Gaan aan met die keep button."*
--
-- ── What the keep button needed, and why a table ────────────────────────
--
-- The pronunciation rules live in `app/lib/server/sayit.ts` as SOURCE, which
-- is right and stays: a change to how Afrikaans is said is reviewable in a
-- diff like everything else, and a dictionary typed into a web console is a
-- second copy nobody can see.
--
-- But the booth at `/uitspraak` produces rules from a RECORDING — somebody
-- says an isiXhosa word, a listening model writes the IPA — and a web page
-- cannot edit a source file. Handing her the JSON to paste into the repo by
-- hand is what it already did, and "gaan aan met die keep button" is her
-- saying that is not good enough.
--
-- So heard rules go here, and `sayit.ts` sends the source rules AND these.
-- The split is not a compromise, it is the honest shape: the source rules
-- were written by a person reasoning about a language, and these were heard
-- from a speaker's mouth. `why` and `sure` keep that difference readable,
-- because a dictionary built by ear is only worth what its provenance is
-- worth — the same argument `sayit.ts` already makes about its own two
-- halves.
--
-- ── There is no person in this table, deliberately ──────────────────────
--
-- A word and how it is said is not anybody's personal information, and this
-- is the app's ONE dictionary rather than a dictionary per member — every
-- read in the app uses it. So there is no owner column and nothing to tie a
-- row to a human, which is also why it is not on the privacy page: there is
-- nothing in it to be processed.
--
-- The recording is NOT kept. It has served its purpose the moment the IPA is
-- read off it, and a voice is personal information in a way the word is not.
--
-- ── Why the second table exists, and what it closes ─────────────────────
--
-- A dictionary on ElevenLabs is addressed by an id AND a version, and adding
-- a rule mints a NEW version. Until today both lived in environment
-- variables, so every time the rules changed somebody had to paste a new
-- version id into Vercel — and a locator left on the old version reads the
-- old way with nothing at all to show for it. That is the quietest possible
-- failure: the button worked, the rule is on the account, and the app still
-- says it wrong.
--
-- `said_dictionary` holds one row with the current pair. The push route
-- writes it; `liveLocators()` reads it and falls back to the environment
-- variables, so nothing breaks before the first push and an old deployment
-- keeps working exactly as it did.
--
-- One row, enforced by a primary key with one allowed value. A table that
-- can hold two answers to "which dictionary is live" is a table that will.
-- ─────────────────────────────────────────────────────────────────────────

create table if not exists public.said_words (
  -- The word itself is the key: one pronunciation per word, and saying the
  -- same word again replaces it rather than stacking two rules that
  -- contradict each other.
  word      text primary key,
  language  text not null,
  -- Narrow IPA, from a recording of somebody saying it.
  ipa       text not null,
  -- A respelling beside it, where there is a real one. Never invented: see
  -- `rulesFor` in `lib/server/hearword.ts`. Empty where the sound has no
  -- respelling in another language's letters, which is every click.
  alias     text not null default '',
  -- How sure the listening model was, 0 to 1. Kept so a rule that later
  -- sounds wrong can be told apart from one that was always a guess.
  sure      real not null default 0,
  -- Whatever the model said was wrong with the recording, in words.
  trouble   text not null default '',
  made_at   timestamptz not null default now()
);

alter table public.said_words enable row level security;

-- No policy at all, which is the point: with RLS on and no policy, the anon
-- and authenticated keys can do nothing here. Only the service key — which
-- never leaves the server — reads or writes it. This is the app's own
-- dictionary, not a member's.

create table if not exists public.said_dictionary (
  -- One row. `solo` is a boolean that must be true and is the primary key,
  -- so a second row cannot be inserted — cheaper to enforce here than to
  -- reason about later.
  --
  -- Named `solo` and not `only`, which is what it said first: `only` is a
  -- reserved word in Postgres (`select … from only table`) and the file
  -- would not parse. `check:sqlruns` runs every schema file against a real
  -- Postgres for exactly this, and caught it before it ever reached her
  -- console — which is the whole reason that check exists rather than a
  -- reviewer reading SQL and nodding.
  solo      boolean primary key default true check (solo),
  dict_id   text not null,
  version   text not null,
  -- How many rules were in it when it was pushed. Not used for anything
  -- except telling somebody whether the thing on the account is the thing
  -- they think it is.
  rules     integer not null default 0,
  pushed_at timestamptz not null default now()
);

alter table public.said_dictionary enable row level security;

-- Same again: no policy, so only the service key touches it.
