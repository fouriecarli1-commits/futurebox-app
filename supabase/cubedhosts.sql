-- ───────────────────────────────────────────── Cubed³-aanbieders ──
--
-- Die registrasie van die mense wat 'n Cubed³-klas aanbied.
--
-- ── Waarvandaan ──────────────────────────────────────────────────────────
--
-- the owner, 21 Oktober 2026: *"Ek wil 'n futurebox cubed class registrasie
-- bladsy hê vir die aanbieders. Menend ek gee vir jou hulle eposse, en dit
-- gee vir hulle via 'n link access tot hierdie registrasie, en die
-- registrasie moet weer aan my kant land."*
--
-- ── Een ry per uitnodiging ───────────────────────────────────────────────
--
-- Sy tik 'n e-posadres in; die bediener maak 'n ry en 'n lang, toevallige
-- sleutel. Die skakel dra die sleutel ná die '#' — dus kom dit nooit in 'n
-- bediener se logboek nie — en hierdie tabel hou net die sleutel se
-- SHA-256, nooit die sleutel self nie. 'n Lek van die tabel gee dus niemand
-- toegang tot 'n registrasie nie. 'n Nuwe skakel vervang die ou een.
--
-- Die aanbieder vul `details` in (dit word gestoor soos hulle tik), en
-- teken: `signed_at`, die terme se weergawe, die handtekening as 'n klein
-- PNG, en die blaaier en 'n gesoute hash van die adres waarvandaan
-- geteken is (nooit die adres self nie: dit is persoonlike inligting).
--
-- ── Service role alleen ──────────────────────────────────────────────────
--
-- RLS aan, geen beleid nie. Die aanbieder praat met `/api/cubed/host` met
-- die sleutel, die eienaar met `/api/cubed/hosts` agter die eienaarsdeur;
-- die blaaier praat nooit direk met die tabel nie. Daar is ID-nommers en
-- adresse in hierdie ry.

create table if not exists public.cubed_hosts (
  id            uuid primary key default gen_random_uuid(),
  email         text not null check (email <> '' and length(email) <= 200),
  key_hash      text not null unique,
  note          text not null default '' check (length(note) <= 200),
  created_by    uuid references auth.users (id) on delete set null,
  created_at    timestamptz not null default now(),
  opened_at     timestamptz,
  details       jsonb not null default '{}'::jsonb check (pg_column_size(details) <= 65536),
  saved_at      timestamptz,
  signed_at     timestamptz,
  terms_version text,
  signature     text check (signature is null or length(signature) <= 400000),
  signed_ip_hash text,
  signed_agent  text,
  links         jsonb not null default '{}'::jsonb check (pg_column_size(links) <= 16384),
  revoked_at    timestamptz
);

create index if not exists cubed_hosts_created_idx
  on public.cubed_hosts (created_at desc);

alter table public.cubed_hosts enable row level security;

-- ── Die video's en foto's ────────────────────────────────────────────────
--
-- Privaat. Niemand lees of skryf direk nie: die bediener gee die
-- aanbieder 'n getekende oplaai onder hulle eie gids
-- (`<ry se id>/<blok>/…`), en die eienaar 'n getekende aflaai. Net video's
-- en foto's word aanvaar.
--
-- Die grootte: Supabase se projek-wye oplaaigrens geld (50 MB op die gratis
-- plan). 'n Klasvideo is groter as dit — verhoog dit onder Storage →
-- Settings op 'n betaalde plan, of die aanbieder plak 'n skakel na die lêer
-- in die blok in plaas daarvan.

insert into storage.buckets (id, name, public, allowed_mime_types)
values ('cubed', 'cubed', false, array['video/*', 'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'])
on conflict (id) do update set public = false, allowed_mime_types = excluded.allowed_mime_types;

-- ── Who may reach this table through the API ─────────────────────────────
--
-- Written out rather than left to Supabase: from 30 October 2026 a table
-- created in "public" is no longer opened to the API roles by itself. Only
-- the server is named, because only the server reads or writes it.
grant select, insert, update, delete on public.cubed_hosts to service_role;
