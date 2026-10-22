-- ═══════════════════════════════════════════════════════════════════════════
-- FutureBox — wat kort in hierdie projek?
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Supabase → SQL Editor → plak alles → Run.
--
-- **Dit verander niks.** Een `select`. Geen create, geen insert, geen alter.
-- Veilig om enige tyd te loop, ook met mense op die app.
--
-- Dit kyk na 65 tabelle, 40 kolomme wat later
-- bygekom het, 9 stoor-emmers en 61 beleide, en gee 'n ry
-- terug vir elke een wat kort — met die lêer wat dit maak.
--
-- En of die bediener elke tabel mag bereik ("toegang"). Vanaf 30 Oktober 2026
-- maak Supabase 'n nuwe tabel nie meer vanself vir die API oop nie; een wat
-- sonder sy GRANT gemaak is, bestaan en antwoord tog "permission denied".
--
-- Die beleide is nuut, en dit is hoekom: 'n tabel wat bestaan en waaraan
-- niemand mag raak nie, lyk presies soos 'n tabel wat werk. 'n Gefilmde video
-- kom deur 'n storage-beleid by Live uit, en hierdie navraag het niks daarvan
-- geweet nie — dit het leeg teruggekom terwyl elke oplaai geweier is.
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
    ('addons.sql', 'beleid', 'public.addons: read own addons'),
    ('afrikaans.sql', 'beleid', 'public.afrikaans_reports: add your own report'),
    ('afrikaans.sql', 'beleid', 'public.afrikaans_reports: read your own reports'),
    ('reports.sql', 'beleid', 'public.blocks: read own blocks'),
    ('cast.sql', 'beleid', 'public.cast_members: change own cast'),
    ('cast.sql', 'beleid', 'public.cast_members: read own cast'),
    ('cast.sql', 'beleid', 'public.cast_members: remove own cast'),
    ('cast.sql', 'beleid', 'public.cast_members: write own cast'),
    ('invites.sql', 'beleid', 'public.collab_invites: read own invites'),
    ('collab.sql', 'beleid', 'public.collab_messages: read collab messages'),
    ('collab.sql', 'beleid', 'public.collabs: read own collabs'),
    ('arena.sql', 'beleid', 'public.competitions: read competitions'),
    ('radar.sql', 'beleid', 'public.creators: read creators'),
    ('credits.sql', 'beleid', 'public.credit_entries: read own credits'),
    ('arena.sql', 'beleid', 'public.entries: read own entries'),
    ('podcast.sql', 'beleid', 'public.episodes: read episodes'),
    ('finetunes.sql', 'beleid', 'public.finetunes: read own finetunes'),
    ('usage.sql', 'beleid', 'public.generations: read own generations'),
    ('kinderplank.sql', 'beleid', 'public.kid_shelf: clear own shelf'),
    ('kinderplank.sql', 'beleid', 'public.kid_shelf: read own shelf'),
    ('kinderplank.sql', 'beleid', 'public.kid_shelf: write own shelf'),
    ('usage.sql', 'beleid', 'public.memberships: read own membership'),
    ('usage.sql', 'beleid', 'public.purchases: read own purchases'),
    ('posting.sql', 'beleid', 'public.scheduled_posts: read own scheduled posts'),
    ('podcast.sql', 'beleid', 'public.shows: read shows'),
    ('podcast.sql', 'beleid', 'public.speech_runs: read own speech'),
    ('subscriptions.sql', 'beleid', 'public.subscriptions: read own subscription'),
    ('taste.sql', 'beleid', 'public.taste: read own taste'),
    ('schema.sql', 'beleid', 'public.tracks: delete own tracks'),
    ('schema.sql', 'beleid', 'public.tracks: insert own tracks'),
    ('schema.sql', 'beleid', 'public.tracks: read own tracks'),
    ('radar.sql', 'beleid', 'public.tracks: read shared tracks'),
    ('schema.sql', 'beleid', 'public.tracks: update own tracks'),
    ('video.sql', 'beleid', 'public.videos: read own videos'),
    ('podcast.sql', 'beleid', 'public.voices: read own voices'),
    ('arena.sql', 'beleid', 'public.winners: read winners'),
    ('schema.sql', 'beleid', 'storage.objects: delete own audio'),
    ('avatars.sql', 'beleid', 'storage.objects: delete own avatar'),
    ('cast.sql', 'beleid', 'storage.objects: delete own cast picture'),
    ('podcast.sql', 'beleid', 'storage.objects: delete own episodes audio'),
    ('kinderplank.sql', 'beleid', 'storage.objects: delete own kidshelf'),
    ('video.sql', 'beleid', 'storage.objects: delete own videos file'),
    ('livevideo.sql', 'beleid', 'storage.objects: put own filmed video'),
    ('avatars.sql', 'beleid', 'storage.objects: read avatars'),
    ('designs.sql', 'beleid', 'storage.objects: read designs'),
    ('podcast.sql', 'beleid', 'storage.objects: read episodes audio'),
    ('schema.sql', 'beleid', 'storage.objects: read own audio'),
    ('cast.sql', 'beleid', 'storage.objects: read own cast picture'),
    ('kinderplank.sql', 'beleid', 'storage.objects: read own kidshelf'),
    ('video.sql', 'beleid', 'storage.objects: read own videos file'),
    ('schema.sql', 'beleid', 'storage.objects: replace own audio'),
    ('avatars.sql', 'beleid', 'storage.objects: replace own avatar'),
    ('cast.sql', 'beleid', 'storage.objects: replace own cast picture'),
    ('podcast.sql', 'beleid', 'storage.objects: replace own episodes audio'),
    ('kinderplank.sql', 'beleid', 'storage.objects: replace own kidshelf'),
    ('berging.sql', 'beleid', 'storage.objects: space left'),
    ('schema.sql', 'beleid', 'storage.objects: write own audio'),
    ('avatars.sql', 'beleid', 'storage.objects: write own avatar'),
    ('cast.sql', 'beleid', 'storage.objects: write own cast picture'),
    ('podcast.sql', 'beleid', 'storage.objects: write own episodes audio'),
    ('kinderplank.sql', 'beleid', 'storage.objects: write own kidshelf'),
    ('albumart.sql', 'emmer', 'art'),
    ('avatars.sql', 'emmer', 'avatars'),
    ('cast.sql', 'emmer', 'cast'),
    ('cubedhosts.sql', 'emmer', 'cubed'),
    ('designs.sql', 'emmer', 'designs'),
    ('podcast.sql', 'emmer', 'episodes'),
    ('kinderplank.sql', 'emmer', 'kidshelf'),
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
    ('skermtyd.sql', 'kolom', 'public.kids_mode.minutes'),
    ('skermtyd.sql', 'kolom', 'public.kids_mode.sitting_from'),
    ('albumart.sql', 'kolom', 'public.live_posts.art_by'),
    ('albumart.sql', 'kolom', 'public.live_posts.art_title'),
    ('buildon.sql', 'kolom', 'public.live_posts.build_on'),
    ('live.sql', 'kolom', 'public.live_posts.genre'),
    ('live.sql', 'kolom', 'public.live_posts.pair'),
    ('buildon.sql', 'kolom', 'public.live_posts.style'),
    ('live.sql', 'kolom', 'public.live_posts.words'),
    ('pairs.sql', 'kolom', 'public.pairs.draft'),
    ('pairs.sql', 'kolom', 'public.pairs.draft_at'),
    ('pairs.sql', 'kolom', 'public.pairs.ok_a'),
    ('pairs.sql', 'kolom', 'public.pairs.ok_b'),
    ('pairs.sql', 'kolom', 'public.pairs.pays'),
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
    ('amps.sql', 'tabel', 'public.amp_catalogue'),
    ('albumart.sql', 'tabel', 'public.art_artists'),
    ('albumart.sql', 'tabel', 'public.art_bidders'),
    ('albumart.sql', 'tabel', 'public.art_bids'),
    ('albumart.sql', 'tabel', 'public.art_offers'),
    ('albumart.sql', 'tabel', 'public.art_requests'),
    ('albumart.sql', 'tabel', 'public.art_works'),
    ('reports.sql', 'tabel', 'public.blocks'),
    ('cast.sql', 'tabel', 'public.cast_members'),
    ('invites.sql', 'tabel', 'public.collab_invites'),
    ('collab.sql', 'tabel', 'public.collab_messages'),
    ('collab.sql', 'tabel', 'public.collabs'),
    ('arena.sql', 'tabel', 'public.competitions'),
    ('coverkeep.sql', 'tabel', 'public.cover_jobs'),
    ('radar.sql', 'tabel', 'public.creators'),
    ('credits.sql', 'tabel', 'public.credit_entries'),
    ('cubedhosts.sql', 'tabel', 'public.cubed_hosts'),
    ('dubs.sql', 'tabel', 'public.dubs'),
    ('eleven.sql', 'tabel', 'public.eleven_costs'),
    ('arena.sql', 'tabel', 'public.entries'),
    ('podcast.sql', 'tabel', 'public.episodes'),
    ('events.sql', 'tabel', 'public.events'),
    ('finetunes.sql', 'tabel', 'public.finetunes'),
    ('usage.sql', 'tabel', 'public.generations'),
    ('googlespend.sql', 'tabel', 'public.google_spend'),
    ('kinderplank.sql', 'tabel', 'public.kid_shelf'),
    ('kinders.sql', 'tabel', 'public.kids_mode'),
    ('kinderkrediete.sql', 'tabel', 'public.kids_wallet'),
    ('kinderkrediete.sql', 'tabel', 'public.kids_wallet_entries'),
    ('kits.sql', 'tabel', 'public.kits_minutes'),
    ('liveflags.sql', 'tabel', 'public.live_flags'),
    ('hearts.sql', 'tabel', 'public.live_hearts'),
    ('live.sql', 'tabel', 'public.live_here'),
    ('liveloops.sql', 'tabel', 'public.live_loops'),
    ('live.sql', 'tabel', 'public.live_posts'),
    ('live.sql', 'tabel', 'public.live_says'),
    ('mail.sql', 'tabel', 'public.mail_log'),
    ('usage.sql', 'tabel', 'public.memberships'),
    ('moderation.sql', 'tabel', 'public.moderation_events'),
    ('pairs.sql', 'tabel', 'public.pair_links'),
    ('pairs.sql', 'tabel', 'public.pairs'),
    ('playbilling.sql', 'tabel', 'public.play_purchases'),
    ('designs.sql', 'tabel', 'public.post_designs'),
    ('presence.sql', 'tabel', 'public.presence'),
    ('usage.sql', 'tabel', 'public.purchases'),
    ('reports.sql', 'tabel', 'public.reports'),
    ('uitspraak.sql', 'tabel', 'public.said_dictionary'),
    ('uitspraak.sql', 'tabel', 'public.said_words'),
    ('posting.sql', 'tabel', 'public.scheduled_posts'),
    ('podcast.sql', 'tabel', 'public.shows'),
    ('podcast.sql', 'tabel', 'public.speech_runs'),
    ('subscriptions.sql', 'tabel', 'public.subscriptions'),
    ('taste.sql', 'tabel', 'public.taste'),
    ('tone3000.sql', 'tabel', 'public.tone3000_pending'),
    ('tone3000.sql', 'tabel', 'public.tone3000_tokens'),
    ('schema.sql', 'tabel', 'public.tracks'),
    ('video.sql', 'tabel', 'public.videos'),
    ('kitsvoices.sql', 'tabel', 'public.voice_owners'),
    ('podcast.sql', 'tabel', 'public.voices'),
    ('arena.sql', 'tabel', 'public.winners'),
    ('addons.sql', 'toegang', 'public.addon_customers'),
    ('addons.sql', 'toegang', 'public.addon_grants'),
    ('addons.sql', 'toegang', 'public.addons'),
    ('afrikaans.sql', 'toegang', 'public.afrikaans_reports'),
    ('aikoste.sql', 'toegang', 'public.ai_costs'),
    ('amps.sql', 'toegang', 'public.amp_catalogue'),
    ('albumart.sql', 'toegang', 'public.art_artists'),
    ('albumart.sql', 'toegang', 'public.art_bidders'),
    ('albumart.sql', 'toegang', 'public.art_bids'),
    ('albumart.sql', 'toegang', 'public.art_offers'),
    ('albumart.sql', 'toegang', 'public.art_requests'),
    ('albumart.sql', 'toegang', 'public.art_works'),
    ('reports.sql', 'toegang', 'public.blocks'),
    ('cast.sql', 'toegang', 'public.cast_members'),
    ('invites.sql', 'toegang', 'public.collab_invites'),
    ('collab.sql', 'toegang', 'public.collab_messages'),
    ('collab.sql', 'toegang', 'public.collabs'),
    ('arena.sql', 'toegang', 'public.competitions'),
    ('coverkeep.sql', 'toegang', 'public.cover_jobs'),
    ('radar.sql', 'toegang', 'public.creators'),
    ('credits.sql', 'toegang', 'public.credit_entries'),
    ('cubedhosts.sql', 'toegang', 'public.cubed_hosts'),
    ('dubs.sql', 'toegang', 'public.dubs'),
    ('eleven.sql', 'toegang', 'public.eleven_costs'),
    ('arena.sql', 'toegang', 'public.entries'),
    ('podcast.sql', 'toegang', 'public.episodes'),
    ('events.sql', 'toegang', 'public.events'),
    ('finetunes.sql', 'toegang', 'public.finetunes'),
    ('usage.sql', 'toegang', 'public.generations'),
    ('googlespend.sql', 'toegang', 'public.google_spend'),
    ('kinders.sql', 'toegang', 'public.kids_mode'),
    ('kinderkrediete.sql', 'toegang', 'public.kids_wallet'),
    ('kinderkrediete.sql', 'toegang', 'public.kids_wallet_entries'),
    ('kits.sql', 'toegang', 'public.kits_minutes'),
    ('liveflags.sql', 'toegang', 'public.live_flags'),
    ('hearts.sql', 'toegang', 'public.live_hearts'),
    ('live.sql', 'toegang', 'public.live_here'),
    ('liveloops.sql', 'toegang', 'public.live_loops'),
    ('live.sql', 'toegang', 'public.live_posts'),
    ('live.sql', 'toegang', 'public.live_says'),
    ('mail.sql', 'toegang', 'public.mail_log'),
    ('usage.sql', 'toegang', 'public.memberships'),
    ('moderation.sql', 'toegang', 'public.moderation_events'),
    ('pairs.sql', 'toegang', 'public.pair_links'),
    ('pairs.sql', 'toegang', 'public.pairs'),
    ('playbilling.sql', 'toegang', 'public.play_purchases'),
    ('designs.sql', 'toegang', 'public.post_designs'),
    ('presence.sql', 'toegang', 'public.presence'),
    ('usage.sql', 'toegang', 'public.purchases'),
    ('reports.sql', 'toegang', 'public.reports'),
    ('uitspraak.sql', 'toegang', 'public.said_dictionary'),
    ('uitspraak.sql', 'toegang', 'public.said_words'),
    ('posting.sql', 'toegang', 'public.scheduled_posts'),
    ('podcast.sql', 'toegang', 'public.shows'),
    ('podcast.sql', 'toegang', 'public.speech_runs'),
    ('subscriptions.sql', 'toegang', 'public.subscriptions'),
    ('taste.sql', 'toegang', 'public.taste'),
    ('tone3000.sql', 'toegang', 'public.tone3000_pending'),
    ('tone3000.sql', 'toegang', 'public.tone3000_tokens'),
    ('schema.sql', 'toegang', 'public.tracks'),
    ('video.sql', 'toegang', 'public.videos'),
    ('kitsvoices.sql', 'toegang', 'public.voice_owners'),
    ('podcast.sql', 'toegang', 'public.voices'),
    ('arena.sql', 'toegang', 'public.winners')
)
select
  l_eer as "loop hierdie lêer",
  soort,
  naam   as "wat kort"
from verwag
where (soort = 'tabel' and to_regclass(naam) is null)
   or (soort = 'beleid' and not exists (
        select 1 from pg_policies
        where schemaname || '.' || tablename = split_part(naam, ': ', 1)
          and policyname = split_part(naam, ': ', 2)
      ))
   or (soort = 'kolom' and not exists (
         select 1 from information_schema.columns
         where table_schema = split_part(naam, '.', 1)
           and table_name   = split_part(naam, '.', 2)
           and column_name  = split_part(naam, '.', 3)))
   or (soort = 'emmer' and not exists (
         select 1 from storage.buckets where id = naam))
   or (soort = 'toegang' and to_regclass(naam) is not null
         and not has_table_privilege('service_role', naam, 'select'))
order by 1, 2, 3;
