/**
 * Every tool in the app, on one page, in groups — and how to open one.
 *
 * Carli, 16 October 2026, screenshots of another app's "All tools" page:
 * round buttons with a picture and a name, under Generative AI, Video
 * editing, Photo editing, Shoot and record and Quick actions. The rooms are
 * the app's big doors; this is the small door straight to one tool inside a
 * room — Filters, Templates, Transitions — without knowing which room it is
 * in or which button inside it.
 *
 * A tool is a room (`SurfaceId`) and, where it is one panel of that room, the
 * panel's id. Opening one goes to the room the usual way and leaves the
 * panel's name here (`askPanel`); the room picks it up when it draws
 * (`takePanel`) — or at once, when it is already open, by the event.
 */
import type { SurfaceId } from './surfaces';

export type ToolGroup = 'ai' | 'video' | 'photo' | 'music' | 'share';

export const TOOL_GROUPS: readonly { readonly id: ToolGroup; readonly en: string; readonly af: string }[] = [
  { id: 'ai', en: 'Make with AI', af: 'Maak met KI' },
  { id: 'video', en: 'Video editing', af: 'Videoredigering' },
  { id: 'photo', en: 'Photo editing', af: 'Fotoredigering' },
  { id: 'music', en: 'Music and sound', af: 'Musiek en klank' },
  { id: 'share', en: 'Shoot and share', af: 'Skiet en deel' },
];

/** The picture on a tool's round button — a lucide icon name, mapped in `AllTools.tsx`. */
export type ToolIcon =
  | 'song' | 'video' | 'image' | 'wand' | 'art' | 'ads' | 'voice' | 'scissors' | 'transitions'
  | 'titles' | 'effects' | 'generators' | 'enhance' | 'audiofx' | 'photo' | 'templates' | 'grid'
  | 'filters' | 'adjust' | 'cutout' | 'text' | 'grab' | 'layers' | 'shapes' | 'studio' | 'booth'
  | 'podcast' | 'sound' | 'hooks' | 'live' | 'channel' | 'collab';

export interface Tool {
  readonly id: string;
  readonly group: ToolGroup;
  readonly en: string;
  readonly af: string;
  readonly room: SurfaceId;
  /** The panel inside the room it opens, where it is one. */
  readonly panel?: string;
  readonly icon: ToolIcon;
  /** Costs credits to use — said on its button, so nothing is a surprise. */
  readonly paid?: boolean;
}

export const TOOLS: readonly Tool[] = [
  { id: 'song', group: 'ai', en: 'Make a song', af: 'Maak ’n liedjie', room: 'make', icon: 'song', paid: true },
  { id: 'aivideo', group: 'ai', en: 'AI video', af: 'KI-video', room: 'canvas', icon: 'video', paid: true },
  { id: 'aiimage', group: 'ai', en: 'AI image', af: 'KI-prent', room: 'photo', panel: 'pic', icon: 'image', paid: true },
  { id: 'magic', group: 'ai', en: 'Magic touch', af: 'Towerraak', room: 'photo', panel: 'magic', icon: 'wand', paid: true },
  { id: 'albumart', group: 'ai', en: 'Album art', af: 'Albumkuns', room: 'albumart', icon: 'art', paid: true },
  { id: 'ads', group: 'ai', en: 'Adverts', af: 'Advertensies', room: 'campaign', icon: 'ads', paid: true },
  { id: 'voice', group: 'ai', en: 'Your voice', af: 'Jou stem', room: 'voice_studio', icon: 'voice', paid: true },

  { id: 'videoeditor', group: 'video', en: 'Video editor', af: 'Video-redigeerder', room: 'videoedit', icon: 'scissors' },
  { id: 'transitions', group: 'video', en: 'Transitions', af: 'Oorgange', room: 'videoedit', panel: 'clip', icon: 'transitions' },
  { id: 'titles', group: 'video', en: 'Titles and subtitles', af: 'Titels en onderskrifte', room: 'videoedit', panel: 'words', icon: 'titles' },
  { id: 'effects', group: 'video', en: 'Effects and filters', af: 'Effekte en filters', room: 'videoedit', panel: 'looks', icon: 'effects' },
  { id: 'enhance', group: 'video', en: 'Auto enhance', af: 'Outo-verbeter', room: 'videoedit', panel: 'looks', icon: 'enhance' },
  { id: 'generators', group: 'video', en: 'Generators', af: 'Opwekkers', room: 'videoedit', panel: 'folder', icon: 'generators' },
  { id: 'audiofx', group: 'video', en: 'Sound effects', af: 'Klankeffekte', room: 'videoedit', panel: 'clip', icon: 'audiofx' },

  { id: 'photoeditor', group: 'photo', en: 'Photo editor', af: 'Foto-redigeerder', room: 'photo', icon: 'photo' },
  { id: 'templates', group: 'photo', en: 'Templates', af: 'Templates', room: 'photo', panel: 'starts', icon: 'templates' },
  { id: 'collage', group: 'photo', en: 'Collage', af: 'Collage', room: 'photo', panel: 'grid', icon: 'grid' },
  { id: 'filters', group: 'photo', en: 'Filters', af: 'Filters', room: 'photo', panel: 'filters', icon: 'filters' },
  { id: 'smartlight', group: 'photo', en: 'Smart light and adjust', af: 'Slim lig en stel', room: 'photo', panel: 'tone', icon: 'adjust' },
  { id: 'cutout', group: 'photo', en: 'Remove background', af: 'Agtergrond uit', room: 'photo', panel: 'pic', icon: 'cutout' },
  { id: 'text', group: 'photo', en: 'Text', af: 'Teks', room: 'photo', panel: 'text', icon: 'text' },
  { id: 'grab', group: 'photo', en: 'Grab text and things', af: 'Gryp teks en dinge', room: 'photo', panel: 'read', icon: 'grab' },
  { id: 'shapes', group: 'photo', en: 'Shapes', af: 'Vorms', room: 'photo', panel: 'shapes', icon: 'shapes' },
  { id: 'layers', group: 'photo', en: 'Layers', af: 'Lae', room: 'photo', panel: 'layers', icon: 'layers' },

  { id: 'studio', group: 'music', en: 'Studio', af: 'Studio', room: 'studio', icon: 'studio' },
  { id: 'booth', group: 'music', en: 'ProBooth', af: 'ProBooth', room: 'booth', icon: 'booth' },
  { id: 'podcast', group: 'music', en: 'Podcast', af: 'Potgooi', room: 'podcast', icon: 'podcast' },
  { id: 'sound', group: 'music', en: 'Sound trainer', af: 'Klankafrigter', room: 'sound', icon: 'sound' },

  { id: 'hooks', group: 'share', en: 'Hooks', af: 'Hooks', room: 'hooks_feed', icon: 'hooks' },
  { id: 'live', group: 'share', en: 'Live', af: 'Live', room: 'live', icon: 'live' },
  { id: 'channel', group: 'share', en: 'Your channel', af: 'Jou kanaal', room: 'channels', icon: 'channel' },
  { id: 'collab', group: 'share', en: 'Collab Radar', af: 'Collab Radar', room: 'collab', icon: 'collab' },
];

export const toolLabel = (one: { readonly en: string; readonly af: string }, lang: string): string =>
  (lang === 'af' ? one.af : one.en);

/* ── Opening a panel inside a room ─────────────────────────────────────── */

export const OPEN_PANEL_EVENT = 'fb-open-panel';
const KEY = 'fb-open-panel';

/** Leave word for a room to open one of its panels — now if it is open, or when it draws. */
export function askPanel(room: SurfaceId, panel: string): void {
  try { window.sessionStorage.setItem(KEY, JSON.stringify({ room, panel, at: Date.now() })); } catch { /* the room opens on its own panel */ }
  window.dispatchEvent(new Event(OPEN_PANEL_EVENT));
}

/** The panel asked for in this room in the last half minute, taken so it opens once. */
export function takePanel(room: SurfaceId): string | null {
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (!raw) return null;
    const asked = JSON.parse(raw) as { room?: string; panel?: string; at?: number };
    if (asked.room !== room || typeof asked.panel !== 'string') return null;
    window.sessionStorage.removeItem(KEY);
    return Date.now() - (asked.at ?? 0) < 30_000 ? asked.panel : null;
  } catch {
    return null;
  }
}
