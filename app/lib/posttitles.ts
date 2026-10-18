/**
 * Title styles: a title and a line under it, in one press.
 *
 * The owner, 14 October 2026: *"ons kort goeie text templates, vat dieselfde in
 * album art se ai art."* Album art's AI art offers six looks — cyberpunk,
 * acid graphics, minimalist Swiss, retro vinyl, hyper-realism and abstract
 * ink (`ArtMaker.tsx`). These are the same six as type on a photograph: a
 * face, an ink and a glow for the title, and a quieter line under it, so a
 * post and its cover can be made to match.
 *
 * Built only from faces and glows the room already draws and exports
 * (`postfaces.ts`, `postglow.ts`), so every one of them is what comes out of
 * the file, not just what is on the button.
 */
import type { FaceId } from './postfaces';
import type { GlowId } from './postglow';

export interface TitleLine {
  readonly says: readonly [string, string];
  readonly face: FaceId;
  readonly ink: string;
  readonly glow: GlowId;
  readonly letterGap: number;
}

export interface TitleStyle {
  readonly id: string;
  readonly name: readonly [string, string];
  readonly title: TitleLine;
  readonly under: TitleLine;
  /** The two colours the button is drawn in, as album art's palette has them. */
  readonly tile: readonly [string, string];
}

export const TITLE_STYLES: readonly TitleStyle[] = [
  {
    id: 'cyber', name: ['post.title.cyber', 'Cyberpunk'], tile: ['#00F0FF', '#A855F7'],
    title: { says: ['post.title.cyberTop', 'NEON CITY'], face: 'future', ink: '#67e8f9', glow: 'holo', letterGap: 0.22 },
    under: { says: ['post.title.cyberUnder', 'the new single'], face: 'type', ink: '#e9d5ff', glow: 'synth', letterGap: 0.3 },
  },
  {
    id: 'acid', name: ['post.title.acid', 'Acid graphics'], tile: ['#10B981', '#FFB800'],
    title: { says: ['post.title.acidTop', 'ACID'], face: 'poster', ink: '#bef264', glow: 'neon', letterGap: 0.04 },
    under: { says: ['post.title.acidUnder', 'out friday'], face: 'round', ink: '#fde047', glow: 'gold', letterGap: 0.12 },
  },
  {
    id: 'swiss', name: ['post.title.swiss', 'Minimalist Swiss'], tile: ['#E11D48', '#F5F5F4'],
    title: { says: ['post.title.swissTop', 'Helvetica Summer'], face: 'plain', ink: '#ffffff', glow: 'none', letterGap: -0.02 },
    under: { says: ['post.title.swissUnder', 'Volume one'], face: 'plain', ink: '#fb7185', glow: 'none', letterGap: 0.06 },
  },
  {
    id: 'vinyl', name: ['post.title.vinyl', 'Retro vinyl'], tile: ['#7C2D12', '#F59E0B'],
    title: { says: ['post.title.vinylTop', 'Sunday Soul'], face: 'hand', ink: '#fdba74', glow: 'fire', letterGap: 0.02 },
    under: { says: ['post.title.vinylUnder', 'side A'], face: 'book', ink: '#fef3c7', glow: 'gold', letterGap: 0.18 },
  },
  {
    id: 'real', name: ['post.title.real', 'Hyper-realism'], tile: ['#111827', '#9CA3AF'],
    title: { says: ['post.title.realTop', 'NO FILTER'], face: 'book', ink: '#f8fafc', glow: 'none', letterGap: 0.28 },
    under: { says: ['post.title.realUnder', 'live from the studio'], face: 'plain', ink: '#cbd5e1', glow: 'none', letterGap: 0.1 },
  },
  {
    id: 'ink', name: ['post.title.ink', 'Abstract ink'], tile: ['#F5F5F4', '#111111'],
    title: { says: ['post.title.inkTop', 'Silence'], face: 'hand', ink: '#f5f5f4', glow: 'ice', letterGap: 0.04 },
    under: { says: ['post.title.inkUnder', 'a quiet record'], face: 'book', ink: '#a8a29e', glow: 'none', letterGap: 0.2 },
  },
  /* ── Ten more, 15 October 2026 ───────────────────────────────────────
     The owner: *"meer text possibilities, meer templates."* The posts people in
     her studio actually make — a gospel night, a wedding, a street release,
     an amapiano party, a sale, a game night, a fashion drop, a gig, a podcast
     episode and a birthday — each in the new faces and glows. */
  {
    id: 'gospel', name: ['post.title.gospel', 'Gospel night'], tile: ['#78350F', '#FDE68A'],
    title: { says: ['post.title.gospelTop', 'AMAZING GRACE'], face: 'classic', ink: '#fef3c7', glow: 'gold', letterGap: 0.18 },
    under: { says: ['post.title.gospelUnder', 'live worship night'], face: 'book', ink: '#fde68a', glow: 'none', letterGap: 0.12 },
  },
  {
    id: 'wedding', name: ['post.title.wedding', 'Wedding'], tile: ['#FCE7F3', '#F5F5F4'],
    title: { says: ['post.title.weddingTop', 'Forever & Always'], face: 'script', ink: '#fff1f2', glow: 'pink', letterGap: 0.02 },
    under: { says: ['post.title.weddingUnder', 'save the date'], face: 'classic', ink: '#fbcfe8', glow: 'none', letterGap: 0.22 },
  },
  {
    id: 'street', name: ['post.title.street', 'Street'], tile: ['#111827', '#F97316'],
    title: { says: ['post.title.streetTop', 'STREET KINGS'], face: 'spray', ink: '#fef08a', glow: 'fire', letterGap: 0.06 },
    under: { says: ['post.title.streetUnder', 'mixtape out now'], face: 'type', ink: '#fdba74', glow: 'none', letterGap: 0.2 },
  },
  {
    id: 'piano', name: ['post.title.piano', 'Amapiano nights'], tile: ['#4C1D95', '#F43F5E'],
    title: { says: ['post.title.pianoTop', 'PIANO NIGHTS'], face: 'retro', ink: '#fdf4ff', glow: 'sunset', letterGap: 0.1 },
    under: { says: ['post.title.pianoUnder', 'saturday · 9pm'], face: 'round', ink: '#fbcfe8', glow: 'none', letterGap: 0.16 },
  },
  {
    id: 'sale', name: ['post.title.sale', 'Big sale'], tile: ['#DC2626', '#FDE047'],
    title: { says: ['post.title.saleTop', '50% OFF'], face: 'comic', ink: '#fefce8', glow: 'fire', letterGap: 0.06 },
    under: { says: ['post.title.saleUnder', 'this weekend only'], face: 'block', ink: '#fde047', glow: 'none', letterGap: 0.08 },
  },
  {
    id: 'game', name: ['post.title.game', 'Game night'], tile: ['#14532D', '#84CC16'],
    title: { says: ['post.title.gameTop', 'GAME ON'], face: 'pixel', ink: '#ecfccb', glow: 'toxic', letterGap: 0.08 },
    under: { says: ['post.title.gameUnder', 'level up this friday'], face: 'type', ink: '#bef264', glow: 'none', letterGap: 0.14 },
  },
  {
    id: 'fashion', name: ['post.title.fashion', 'Fashion edit'], tile: ['#0A0A0A', '#E5E5E5'],
    title: { says: ['post.title.fashionTop', 'The Edit'], face: 'fashion', ink: '#ffffff', glow: 'none', letterGap: 0.02 },
    under: { says: ['post.title.fashionUnder', 'autumn collection'], face: 'plain', ink: '#d4d4d4', glow: 'none', letterGap: 0.3 },
  },
  {
    id: 'gig', name: ['post.title.gig', 'Live tonight'], tile: ['#831843', '#EC4899'],
    title: { says: ['post.title.gigTop', 'LIVE TONIGHT'], face: 'block', ink: '#fdf2f8', glow: 'pink', letterGap: 0.04 },
    under: { says: ['post.title.gigUnder', 'doors open 8pm'], face: 'round', ink: '#fbcfe8', glow: 'none', letterGap: 0.14 },
  },
  {
    id: 'podcast', name: ['post.title.podcast', 'New episode'], tile: ['#0C4A6E', '#38BDF8'],
    title: { says: ['post.title.podcastTop', 'New Episode'], face: 'round', ink: '#e0f2fe', glow: 'ice', letterGap: 0.02 },
    under: { says: ['post.title.podcastUnder', 'out now on every app'], face: 'plain', ink: '#bae6fd', glow: 'none', letterGap: 0.12 },
  },
  {
    id: 'party', name: ['post.title.party', 'Party'], tile: ['#7C3AED', '#FDBA74'],
    title: { says: ['post.title.partyTop', 'Happy Birthday!'], face: 'comic', ink: '#fff7ed', glow: 'sunset', letterGap: 0.04 },
    under: { says: ['post.title.partyUnder', 'make a wish'], face: 'hand', ink: '#fde68a', glow: 'none', letterGap: 0.06 },
  },
];
