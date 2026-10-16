-- ─────────────────────────────────────────────────────── die templates ──
--
-- Ontwerpe met plek vir foto's, wat die eienaar stoor vir almal.
--
-- ── Waarvandaan ──────────────────────────────────────────────────────────
--
-- Carli, 16 Oktober 2026: *"Hoe hou ons sulke cool templates? Moet ons dit
-- generate en oor tyd op bou?"* — en toe: *"gaan aan met die
-- template-stelsel."*
--
-- Die app bring sestien saam (`app/lib/postdesigns.ts`). Hierdie tabel is
-- die deel wat groei: sy maak 'n plasing wat sy mooi vind en druk "Stoor as
-- template", en elke lid sien dit in die fotoredigeerder se Templates.
--
-- ── Geen foto's nie ──────────────────────────────────────────────────────
--
-- 'n Ontwerp is die plasing se dele as data — die vorm, die kleur, die
-- rame, die woorde, die vorms — en nooit haar foto's nie. Die rame word
-- leeg gestoor; elke lid sit sy eie foto's in. Die voorskou word geteken,
-- nie gestoor nie. Dus is 'n ry 'n paar kilogrepe, en `design` se grootte
-- word hieronder begrens.
--
-- ── Service role alleen ──────────────────────────────────────────────────
--
-- RLS aan, geen beleid — dieselfde as die versterkerkatalogus. Lees gaan
-- deur `/api/designs` vir 'n aangemelde lid, skryf deur dieselfde roete
-- agter die eienaarsdeur. Die blaaier praat nooit direk met die tabel nie.

create table if not exists public.post_designs (
  id          uuid primary key default gen_random_uuid(),
  name_en     text not null check (name_en <> '' and length(name_en) <= 60),
  name_af     text not null check (name_af <> '' and length(name_af) <= 60),
  category    text not null check (category in ('event', 'release', 'sale', 'collage', 'celebrate', 'quote', 'brand')),
  -- Die ontwerp self, soos `cleanDesign` dit teruggee.
  design      jsonb not null check (pg_column_size(design) <= 32768),
  added_by    uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now()
);

create index if not exists post_designs_created_idx
  on public.post_designs (created_at desc);

alter table public.post_designs enable row level security;

-- ───────────────────────────────────────── die prente van haar toestel af ──
--
-- Carli, 16 Oktober 2026: *"Ek wonder of ek templates ook van my device af
-- kan oplaai?"* — *"Ek bedoel templates wat gestoor moet word."*
--
-- 'n Ontwerp wat sy elders gemaak het, kom in as 'n prent en word die
-- template se agtergrond, met rame vir lede se foto's daarbo. Die prent lê
-- in hierdie emmer. Publiek om te lees, want elke lid se fotoredigeerder
-- teken dit; niemand skryf direk nie — die bediener gee net die eienaar 'n
-- getekende oplaai, onder 'n naam wat dit self kies (`/api/designs`).
-- Geen lid se foto's kom ooit hier nie.

insert into storage.buckets (id, name, public)
values ('designs', 'designs', true)
on conflict (id) do update set public = true;

do $$
begin
  execute 'drop policy if exists "read designs" on storage.objects';
  execute $p$create policy "read designs" on storage.objects
    for select using (bucket_id = 'designs')$p$;
exception
  when insufficient_privilege then
    raise warning 'The designs bucket was made, but its read policy was refused: %. Add it by hand under Storage → designs → Policies: read for everyone, nothing else.', sqlerrm;
end
$$;
