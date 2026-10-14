/**
 * Title styles: a title and a line under it, in one press.
 *
 * Carli, 14 October 2026: *"ons kort goeie text templates, vat dieselfde in
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
];
