/**
 * Curated typography combinations and text presets for FutureBox Studio.
 *
 * ── What she asked for ───────────────────────────────────────────────────
 *
 * Carli, 11 October 2026: *"Ons het defnitief meer teks voorstelle en
 * amazing teks templates nodig... font combinations soos BOLD moves, ROCK,
 * static, BOO!, CUSTOM PAINT, SPOOKY, SCARY story, TALK TO US... en apps
 * soos TypeExtrude, TypeCutOut, TypeLettering, TypeGradient, Signature."*
 *
 * ── Design Principles ────────────────────────────────────────────────────
 *
 *   1. Real, expressive sentences tailored for social media & film covers.
 *   2. Tested typography hierarchy (Display headline + supporting subhead).
 *   3. Harmonious color palettes (vibrant neons, warm vintage, editorial mono).
 *   4. Zero layout shifts — fits within safe canvas bounds.
 *   5. Bilingual i18n support in Afrikaans and English with curly apostrophes.
 */

import type { FaceId } from './postfaces';
import type { Backdrop, SpotId } from './posttext';

export type ComboCategory = 'all' | 'bold_rock' | 'creative' | 'minimal' | 'retro';

export interface ComboWordDef {
  readonly textKey: string;
  readonly defaultEn: string;
  readonly defaultAf: string;
  readonly face: FaceId;
  readonly spot: SpotId;
  readonly ink: string;
  readonly lineGap?: number;
  readonly letterGap?: number;
  readonly behind?: Backdrop;
  readonly stroke?: { readonly width: number; readonly color: string };
  readonly extrude?: { readonly depth: number; readonly color: string };
  readonly gradient?: { readonly from: string; readonly to: string };
}

export interface FontComboPreset {
  readonly id: string;
  readonly nameKey: string;
  readonly nameEn: string;
  readonly nameAf: string;
  readonly category: ComboCategory;
  readonly descriptionEn: string;
  readonly descriptionAf: string;
  readonly previewColor: string;
  readonly badge: string;
  readonly words: readonly ComboWordDef[];
}

export const FONT_COMBINATIONS: readonly FontComboPreset[] = [
  {
    id: 'bold_moves',
    nameKey: 'combo.boldMoves',
    nameEn: 'Bold Moves',
    nameAf: 'Kragtige Skuif',
    category: 'bold_rock',
    descriptionEn: 'High-energy athletic dual-tone display pairing.',
    descriptionAf: 'Hoë-energie atletiese tweekleurige vertoonstyl.',
    previewColor: '#f97316',
    badge: 'Trending',
    words: [
      {
        textKey: 'combo.boldMovesHead',
        defaultEn: 'BOLD MOVES',
        defaultAf: 'KRAGTIGE SKUWE',
        face: 'poster',
        spot: 'middle',
        ink: '#f97316',
        letterGap: 0.05,
        extrude: { depth: 4, color: '#0369a1' },
      },
      {
        textKey: 'combo.boldMovesSub',
        defaultEn: 'Make your mark today',
        defaultAf: 'Maak vandag jou stempel',
        face: 'plain',
        spot: 'lower',
        ink: '#38bdf8',
        letterGap: 0.12,
      },
    ],
  },
  {
    id: 'rock_electric',
    nameKey: 'combo.rock',
    nameEn: 'Electric Rock',
    nameAf: 'Elektriese Klank',
    category: 'bold_rock',
    descriptionEn: 'Electric jagged heavy rock headline with neon cyan glow.',
    descriptionAf: 'Skerp swaargewig rock-opskrif met neon-siaangloed.',
    previewColor: '#06b6d4',
    badge: 'Rock',
    words: [
      {
        textKey: 'combo.rockHead',
        defaultEn: 'LOUD & RAW',
        defaultAf: 'HARD EN EG',
        face: 'poster',
        spot: 'middle',
        ink: '#22d3ee',
        letterGap: 0.08,
        stroke: { width: 3, color: '#083344' },
        behind: 'bar',
      },
      {
        textKey: 'combo.rockSub',
        defaultEn: 'LIVE THIS WEEKEND',
        defaultAf: 'LEWENDIG HIERDIE NAWEEK',
        face: 'plain',
        spot: 'lower',
        ink: '#ffffff',
        letterGap: 0.2,
      },
    ],
  },
  {
    id: 'cyber_static',
    nameKey: 'combo.static',
    nameEn: 'Cyber Static',
    nameAf: 'Kuber Glits',
    category: 'creative',
    descriptionEn: 'High-contrast cyberpunk monospace on deep black badge.',
    descriptionAf: 'Hoëkontras kuberruimte-lettertipe op donker balk.',
    previewColor: '#a3e635',
    badge: 'Cyber',
    words: [
      {
        textKey: 'combo.staticHead',
        defaultEn: 'SYSTEM.ONLINE',
        defaultAf: 'STELSEL.AANLYN',
        face: 'type',
        spot: 'middle',
        ink: '#bef264',
        letterGap: 0.15,
        behind: 'bar',
      },
      {
        textKey: 'combo.staticSub',
        defaultEn: 'Frequency // 108.4 MHz',
        defaultAf: 'Frekwensie // 108.4 MHz',
        face: 'type',
        spot: 'lower',
        ink: '#a1a1aa',
        letterGap: 0.05,
      },
    ],
  },
  {
    id: 'boo_bubble',
    nameKey: 'combo.boo',
    nameEn: 'Puffy Bubble',
    nameAf: 'Pof Blaas',
    category: 'creative',
    descriptionEn: 'Playful cartoon 3D puffy lettering with golden shadow.',
    descriptionAf: 'Speelse tekenprent 3D-pofletters met goue skaduwee.',
    previewColor: '#f59e0b',
    badge: 'Playful',
    words: [
      {
        textKey: 'combo.booHead',
        defaultEn: 'BOO!',
        defaultAf: 'KIEKOE!',
        face: 'round',
        spot: 'middle',
        ink: '#fbbf24',
        letterGap: 0.06,
        extrude: { depth: 5, color: '#b45309' },
      },
      {
        textKey: 'combo.booSub',
        defaultEn: 'Something fun is brewing',
        defaultAf: 'Iets lekker broei hier',
        face: 'round',
        spot: 'lower',
        ink: '#fde68a',
        letterGap: 0.04,
      },
    ],
  },
  {
    id: 'custom_paint',
    nameKey: 'combo.paint',
    nameEn: 'Custom Paint',
    nameAf: 'Kunsverf',
    category: 'creative',
    descriptionEn: 'Textured street paint lettering with fiery vermilion punch.',
    descriptionAf: 'Tekstuur straatverf-letters met vurige oranje trefkrag.',
    previewColor: '#ea580c',
    badge: 'Street Art',
    words: [
      {
        textKey: 'combo.paintHead',
        defaultEn: 'FRESH ARTWORK',
        defaultAf: 'VARS KUNSWERK',
        face: 'poster',
        spot: 'middle',
        ink: '#f97316',
        letterGap: 0.04,
        gradient: { from: '#f97316', to: '#fbbf24' },
      },
      {
        textKey: 'combo.paintSub',
        defaultEn: 'Handcrafted in the studio',
        defaultAf: 'Met die hand in die ateljee gemaak',
        face: 'hand',
        spot: 'lower',
        ink: '#e2e8f0',
        letterGap: 0.08,
      },
    ],
  },
  {
    id: 'spooky_slime',
    nameKey: 'combo.spooky',
    nameEn: 'Toxic Glow',
    nameAf: 'Giftige Gloed',
    category: 'creative',
    descriptionEn: 'Vivid neon lime monster headline with deep midnight outline.',
    descriptionAf: 'Helder neon-groen opskrif met middernag-omlyning.',
    previewColor: '#84cc16',
    badge: 'Vivid',
    words: [
      {
        textKey: 'combo.spookyHead',
        defaultEn: 'MIDNIGHT DROP',
        defaultAf: 'MIDDERNAG VRYSTELLING',
        face: 'poster',
        spot: 'middle',
        ink: '#a3e635',
        letterGap: 0.06,
        stroke: { width: 3, color: '#14532d' },
      },
      {
        textKey: 'combo.spookySub',
        defaultEn: 'Listen before sunrise',
        defaultAf: 'Luister voor sonopkoms',
        face: 'plain',
        spot: 'lower',
        ink: '#d9f99d',
        letterGap: 0.1,
      },
    ],
  },
  {
    id: 'scary_story',
    nameKey: 'combo.scary',
    nameEn: 'Dark Cinema',
    nameAf: 'Donker Kinema',
    category: 'bold_rock',
    descriptionEn: 'Weathered cinematic mystery display paired with crimson script.',
    descriptionAf: 'Verweerde geheimsinnige opskrif met skarlakenrooi skrif.',
    previewColor: '#ef4444',
    badge: 'Cinema',
    words: [
      {
        textKey: 'combo.scaryHead',
        defaultEn: 'THE UNSEEN',
        defaultAf: 'DIE ONSIGBARE',
        face: 'book',
        spot: 'middle',
        ink: '#e2e8f0',
        letterGap: 0.15,
        extrude: { depth: 3, color: '#450a0a' },
      },
      {
        textKey: 'combo.scarySub',
        defaultEn: 'Chapter one begins tonight',
        defaultAf: 'Hoofstuk een begin vanaand',
        face: 'hand',
        spot: 'lower',
        ink: '#ef4444',
        letterGap: 0.05,
      },
    ],
  },
  {
    id: 'talk_to_us',
    nameKey: 'combo.talk',
    nameEn: 'Editorial Clean',
    nameAf: 'Redaksioneel Skoon',
    category: 'minimal',
    descriptionEn: 'Refined corporate modern minimalist lockup with contact details.',
    descriptionAf: 'Verfynde moderne korporatiewe belyning met kontakbesonderhede.',
    previewColor: '#e4e4e7',
    badge: 'Business',
    words: [
      {
        textKey: 'combo.talkHead',
        defaultEn: 'GET IN TOUCH',
        defaultAf: 'KONTAK ONS',
        face: 'plain',
        spot: 'middle',
        ink: '#ffffff',
        letterGap: 0.25,
      },
      {
        textKey: 'combo.talkSub',
        defaultEn: 'studio@example.com // Cape Town',
        defaultAf: 'ateljee@voorbeeld.co.za // Kaapstad',
        face: 'plain',
        spot: 'lower',
        ink: '#a1a1aa',
        letterGap: 0.08,
      },
    ],
  },
  {
    id: 'acoustic_lounge',
    nameKey: 'combo.acoustic',
    nameEn: 'Acoustic Lounge',
    nameAf: 'Akoestiese Kuier',
    category: 'retro',
    descriptionEn: 'Intimate serif title paired with an authentic artist signature.',
    descriptionAf: 'Intieme serif-titel met ’n outentieke kunstenaar-handtekening.',
    previewColor: '#fef08a',
    badge: 'Acoustic',
    words: [
      {
        textKey: 'combo.acousticHead',
        defaultEn: 'UNPLUGGED SESSIONS',
        defaultAf: 'AKOESTIESE SESSIES',
        face: 'book',
        spot: 'top',
        ink: '#fde047',
        letterGap: 0.12,
      },
      {
        textKey: 'combo.acousticSub',
        defaultEn: 'Recorded live on the floor',
        defaultAf: 'Lewendig op die vloer opgeneem',
        face: 'hand',
        spot: 'middle',
        ink: '#ffffff',
        letterGap: 0.04,
      },
    ],
  },
  {
    id: 'y2k_gradient',
    nameKey: 'combo.y2k',
    nameEn: 'Y2K Cyber Chrome',
    nameAf: 'Y2K Kuber Chroom',
    category: 'retro',
    descriptionEn: 'Millennium glossy liquid gradient lettering from pink to orange.',
    descriptionAf: 'Millennium glansryke vloeibare kleurverloop van pienk na oranje.',
    previewColor: '#ec4899',
    badge: 'Y2K',
    words: [
      {
        textKey: 'combo.y2kHead',
        defaultEn: 'MILLENNIUM 2000',
        defaultAf: 'MILLENNIUM TREFFER',
        face: 'poster',
        spot: 'middle',
        ink: '#ec4899',
        letterGap: 0.08,
        gradient: { from: '#ec4899', to: '#f97316' },
        stroke: { width: 2, color: '#500724' },
      },
      {
        textKey: 'combo.y2kSub',
        defaultEn: 'Digital sound · Pure energy',
        defaultAf: 'Digitale klank · Suiwer energie',
        face: 'plain',
        spot: 'lower',
        ink: '#fbcfe8',
        letterGap: 0.14,
      },
    ],
  },
  {
    id: 'afro_groove',
    nameKey: 'combo.afro',
    nameEn: 'Afrobeats Gold',
    nameAf: 'Afrobeats Goud',
    category: 'bold_rock',
    descriptionEn: 'Radiant African gold headline with rhythm-filled pulse.',
    descriptionAf: 'Stralende goue opskrif met warm Afrika-ritme.',
    previewColor: '#eab308',
    badge: 'Afrobeats',
    words: [
      {
        textKey: 'combo.afroHead',
        defaultEn: 'AFRO GROOVE',
        defaultAf: 'AFRO RITME',
        face: 'poster',
        spot: 'middle',
        ink: '#fbbf24',
        letterGap: 0.1,
        extrude: { depth: 4, color: '#78350f' },
      },
      {
        textKey: 'combo.afroSub',
        defaultEn: 'Rhythm of the continent',
        defaultAf: 'Ritme van die vasteland',
        face: 'book',
        spot: 'lower',
        ink: '#fef3c7',
        letterGap: 0.08,
      },
    ],
  },
  {
    id: 'artist_signature',
    nameKey: 'combo.signature',
    nameEn: 'Creator Signature',
    nameAf: 'Skepper-Handtekening',
    category: 'minimal',
    descriptionEn: 'Official creator signature stamp and authenticated label.',
    descriptionAf: 'Amptelike kunstenaar-handtekening en sertifikaat-stempel.',
    previewColor: '#a78bfa',
    badge: 'Signature',
    words: [
      {
        textKey: 'combo.signatureHead',
        defaultEn: 'FutureBox Signature',
        defaultAf: 'FutureBox Handtekening',
        face: 'hand',
        spot: 'middle',
        ink: '#c4b5fd',
        letterGap: 0.05,
      },
      {
        textKey: 'combo.signatureSub',
        defaultEn: 'Official FutureBox Release',
        defaultAf: 'Amptelike FutureBox-Vrystelling',
        face: 'plain',
        spot: 'lower',
        ink: '#a78bfa',
        letterGap: 0.18,
      },
    ],
  },
] as const;

export const comboOf = (id: string): FontComboPreset | null =>
  FONT_COMBINATIONS.find((one) => one.id === id) ?? null;
