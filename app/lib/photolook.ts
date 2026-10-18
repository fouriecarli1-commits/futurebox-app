/**
 * The photo editor's own colours, as Google's "Photo Editor v4.2" page
 * drew them (The owner, 13 October 2026: *"ons transform en totally redesign"*).
 *
 * Obsidian floor, a slightly lifted panel, a lighter well inside a panel,
 * one emerald accent, and the glows. Here rather than in the component
 * because `check:theme` counts literal colours in components, and this room
 * is painted to its own page rather than to the chosen theme — like the
 * cutting room beside it (`lib/cutlook.ts`), which is where the floor and
 * the edge come from so the two rooms stay one floor.
 */
import { EDGE, PANEL, RAISED } from './cutlook';

export const PHOTO = {
  floor: PANEL,
  floorGlass: 'rgba(10,12,16,0.95)',
  surface: RAISED,
  surfaceLight: '#1A202C',
  edge: EDGE,
  chip: 'rgba(255,255,255,0.05)',
  accent: '#0F9D6E',
  accentDim: 'rgba(15,157,110,0.4)',
  accentWash: 'rgba(15,157,110,0.12)',
  cyan: '#22D3EE',
  cyanWash: 'rgba(6,182,212,0.18)',
  purple: '#C084FC',
  purpleWash: 'rgba(168,85,247,0.18)',
  black: '#000000',
  /** The glass a tool's controls pop out on, above the photograph: see-through, so the room stays in view. */
  popGlass: 'rgba(26,32,44,0.62)',
  ink: '#E2E8F0',
  gold: '#FBBF24',
  glowEmerald: '0 0 30px rgba(15,157,110,0.25)',
  glowCyan: '0 0 25px rgba(6,182,212,0.25)',
  neonText: '0 0 10px #0F9D6E, 0 0 20px #0F9D6E, 0 0 40px #06B6D4',
  social: 'linear-gradient(90deg, #EC4899, #A855F7, #6366F1)',
  scrim: 'rgba(0,0,0,0.8)',
} as const;
