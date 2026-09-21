-- ═══════════════════════════════════════════════════════════════════════════
-- FutureBox — wat kort in hierdie projek?
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Supabase → SQL Editor → plak alles → Run.
--
-- **Dit verander niks.** Een `select`. Geen create, geen insert, geen alter.
-- Veilig om enige tyd te loop, ook met mense op die app.
--
-- Dit kyk na 44 tabelle, 32 kolomme wat later
-- bygekom het, en 6 stoor-emmers, en gee 'n ry terug vir elke
-- een wat kort — met die lêer wat dit maak.
--
--   Niks terug nie  →  alles is daar.
--   Rye terug       →  loop daardie lêers. supabase/ALMAL.sql dra die meeste
--                      van hulle; vir een wat nie daarin is nie, maak die
--                      lêer self oop.
--
-- ── Hoekom hierdie lêer bestaan ───────────────────────────────────────────
--
-- Die cast strip was twee weke stukkend en geen kode was verkeerd nie —
-- `cast.sql` het net nooit geloop nie. Die enigste manier om daardie soort
-- fout te sien sonder om weke te verloor, is om die projek self te vra
-- eerder as om te aanvaar.
--
-- ── Moenie hierdie lêer regmaak nie ───────────────────────────────────────
--
-- Dit word geskryf deur `npm run sql:missing` uit die .sql lêers self.
-- `npm run check:sqlmissing` keer dat dit stilweg verouder — 'n verouderde
-- lys kom leeg terug en dan glo jy dit.

with verwag (l_eer, soort, naam) as (
  values
    ('albumart.sql', 'emmer', 'art'),
    ('avatars.sql', 'emmer', 'avatars'),
    ('cast.sql', 'emmer', 'cast'),
    ('podcast.sql', 'emmer', 'episodes'),
    ('schema.sql', 'emmer', 'tracks'),
    ('video.sql', 'emmer', 'videos'),
    ('afrikaans.sql', 'kolom', 'public.afrikaans_reports.heard'),
    ('albumart.sql', 'kolom', 'public.art_bidders.work'),
    ('albumart.sql', 'kolom', 'public.art_works.ends_at'),
    ('albumart.sql', 'kolom', 'public.art_works.paid_note'),
    ('albumart.sql', 'kolom', 'public.art_works.paid_out'),
    ('albumart.sql', 'kolom', 'public.art_works.paid_rand'),
    ('albumart.sql', 'kolom', 'public.art_works.preview'),
    ('albumart.sql', 'kolom', 'public.art_works.won_at'),
    ('albumart.sql', 'kolom', 'public.art_works.won_by'),
    ('avatars.sql', 'kolom', 'public.creators.avatar_path'),
    ('listens.sql', 'kolom', 'public.events.times'),
    ('abuse.sql', 'kolom', 'public.generations.email_key'),
    ('abuse.sql', 'kolom', 'public.generations.ip_hash'),
    ('albumart.sql', 'kolom', 'public.live_posts.art_by'),
    ('albumart.sql', 'kolom', 'public.live_posts.art_title'),
    ('buildon.sql', 'kolom', 'public.live_posts.build_on'),
    ('live.sql', 'kolom', 'public.live_posts.genre'),
    ('buildon.sql', 'kolom', 'public.live_posts.style'),
    ('live.sql', 'kolom', 'public.live_posts.words'),
    ('albumart.sql', 'kolom', 'public.tracks.art_by'),
    ('albumart.sql', 'kolom', 'public.tracks.art_title'),
    ('albumart.sql', 'kolom', 'public.tracks.art_work'),
    ('radar.sql', 'kolom', 'public.tracks.shared'),
    ('video2.sql', 'kolom', 'public.videos.grade'),
    ('video2.sql', 'kolom', 'public.videos.kept'),
    ('video2.sql', 'kolom', 'public.videos.provider'),
    ('video2.sql', 'kolom', 'public.videos.provider_units'),
    ('livevideo.sql', 'kolom', 'public.videos.seconds_real'),
    ('livevideo.sql', 'kolom', 'public.videos.source'),
    ('livevideo.sql', 'kolom', 'public.videos.title'),
    ('podcast.sql', 'kolom', 'public.voices.consent_ip_hash'),
    ('podcast.sql', 'kolom', 'public.voices.consent_text'),
    ('addons.sql', 'tabel', 'public.addon_customers'),
    ('addons.sql', 'tabel', 'public.addon_grants'),
    ('addons.sql', 'tabel', 'public.addons'),
    ('afrikaans.sql', 'tabel', 'public.afrikaans_reports'),
    ('aikoste.sql', 'tabel', 'public.ai_costs'),
    ('albumart.sql', 'tabel', 'public.art_artists'),
    ('albumart.sql', 'tabel', 'public.art_bidders'),
    ('albumart.sql', 'tabel', 'public.art_bids'),
    ('albumart.sql', 'tabel', 'public.art_offers'),
    ('albumart.sql', 'tabel', 'public.art_requests'),
    ('albumart.sql', 'tabel', 'public.art_works'),
    ('cast.sql', 'tabel', 'public.cast_members'),
    ('invites.sql', 'tabel', 'public.collab_invites'),
    ('collab.sql', 'tabel', 'public.collab_messages'),
    ('collab.sql', 'tabel', 'public.collabs'),
    ('arena.sql', 'tabel', 'public.competitions'),
    ('radar.sql', 'tabel', 'public.creators'),
    ('credits.sql', 'tabel', 'public.credit_entries'),
    ('dubs.sql', 'tabel', 'public.dubs'),
    ('eleven.sql', 'tabel', 'public.eleven_costs'),
    ('arena.sql', 'tabel', 'public.entries'),
    ('podcast.sql', 'tabel', 'public.episodes'),
    ('events.sql', 'tabel', 'public.events'),
    ('finetunes.sql', 'tabel', 'public.finetunes'),
    ('usage.sql', 'tabel', 'public.generations'),
    ('kits.sql', 'tabel', 'public.kits_minutes'),
    ('hearts.sql', 'tabel', 'public.live_hearts'),
    ('live.sql', 'tabel', 'public.live_here'),
    ('live.sql', 'tabel', 'public.live_posts'),
    ('live.sql', 'tabel', 'public.live_says'),
    ('mail.sql', 'tabel', 'public.mail_log'),
    ('usage.sql', 'tabel', 'public.memberships'),
    ('moderation.sql', 'tabel', 'public.moderation_events'),
    ('presence.sql', 'tabel', 'public.presence'),
    ('usage.sql', 'tabel', 'public.purchases'),
    ('posting.sql', 'tabel', 'public.scheduled_posts'),
    ('podcast.sql', 'tabel', 'public.shows'),
    ('podcast.sql', 'tabel', 'public.speech_runs'),
    ('subscriptions.sql', 'tabel', 'public.subscriptions'),
    ('taste.sql', 'tabel', 'public.taste'),
    ('schema.sql', 'tabel', 'public.tracks'),
    ('video.sql', 'tabel', 'public.videos'),
    ('podcast.sql', 'tabel', 'public.voices'),
    ('arena.sql', 'tabel', 'public.winners')
)
select
  l_eer as "loop hierdie lêer",
  soort,
  naam   as "wat kort"
from verwag
where (soort = 'tabel' and to_regclass(naam) is null)
   or (soort = 'kolom' and not exists (
         select 1 from information_schema.columns
         where table_schema = split_part(naam, '.', 1)
           and table_name   = split_part(naam, '.', 2)
           and column_name  = split_part(naam, '.', 3)))
   or (soort = 'emmer' and not exists (
         select 1 from storage.buckets where id = naam))
order by 1, 2, 3;
