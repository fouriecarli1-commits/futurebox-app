/**
 * Matching, pitching and post generation.
 *
 * Pure functions over the tables in `app/data/studio.ts`. Nothing here calls a
 * model or a network: every score is arithmetic the user can check, and every
 * match carries the reasons it scored what it did. That is deliberate — a
 * recommendation a creator cannot interrogate is one they cannot act on, and
 * "the AI said so" is not a reason to email a stranger.
 */
import {
  PODCAST_TARGETS,
  TRACK_FLAVOURS,
  COMPETITION_SEEDS,
  type CompetitionCategory,
  type PodcastTarget,
  type TrackFlavour,
} from '../data/studio';
import type { Platform } from '../data/social';

// -----------------------------------------------------------------------------
// Harmonic and tempo compatibility
// -----------------------------------------------------------------------------

/**
 * Camelot notation, the wheel DJs actually use. Two tracks mix cleanly when
 * they share a code, sit one step apart on the same letter, or share a number
 * across letters (the relative major/minor).
 */
const CAMELOT: Record<string, string> = {
  'A♭ Minor': '1A', 'G# Minor': '1A', 'B Major': '1B',
  'E♭ Minor': '2A', 'D# Minor': '2A', 'F# Major': '2B',
  'B♭ Minor': '3A', 'A# Minor': '3A', 'D♭ Major': '3B', 'C# Major': '3B',
  'F Minor': '4A', 'A♭ Major': '4B', 'G# Major': '4B',
  'C Minor': '5A', 'E♭ Major': '5B', 'D# Major': '5B',
  'G Minor': '6A', 'B♭ Major': '6B', 'A# Major': '6B',
  'D Minor': '7A', 'F Major': '7B',
  'A Minor': '8A', 'C Major': '8B',
  'E Minor': '9A', 'G Major': '9B',
  'B Minor': '10A', 'D Major': '10B',
  'F# Minor': '11A', 'G♭ Minor': '11A', 'A Major': '11B',
  'D♭ Minor': '12A', 'C# Minor': '12A', 'E Major': '12B',
};

export function toCamelot(key: string): string | null {
  return CAMELOT[key.trim()] ?? null;
}

/** 1 = same key, 0.85 = neighbour or relative, 0.35 = neither. */
export function keyScore(a: string, b: string): { score: number; reason: string } {
  const ca = toCamelot(a);
  const cb = toCamelot(b);
  if (!ca || !cb) return { score: 0.5, reason: 'Key unknown — check by ear' };
  if (ca === cb) return { score: 1, reason: `Same key (${a}) — they layer straight over each other` };

  const na = parseInt(ca, 10);
  const nb = parseInt(cb, 10);
  const la = ca.slice(-1);
  const lb = cb.slice(-1);
  if (na === nb) return { score: 0.85, reason: `Relative keys (${a} / ${b}) — same notes, different mood` };

  const step = Math.min(Math.abs(na - nb), 12 - Math.abs(na - nb));
  if (la === lb && step === 1) return { score: 0.85, reason: `One step apart on the wheel (${ca} → ${cb}) — a clean mix` };
  if (step === 2) return { score: 0.6, reason: `Two steps apart (${ca} → ${cb}) — workable with a pitch nudge` };
  return { score: 0.35, reason: `${a} against ${b} clashes — one of them has to move` };
}

/** Full marks inside 4 BPM, falling away to nothing by 30. */
export function bpmScore(a: number, b: number): { score: number; reason: string } {
  const gap = Math.abs(a - b);
  if (gap <= 4) return { score: 1, reason: `${a} vs ${b} BPM — effectively the same tempo` };
  if (gap <= 10) return { score: 0.75, reason: `${gap} BPM apart — a small stretch closes it` };
  if (gap <= 20) return { score: 0.45, reason: `${gap} BPM apart — needs a half-time or double-time trick` };
  return { score: 0.15, reason: `${gap} BPM apart — different rooms entirely` };
}

export function tagOverlap(a: readonly string[], b: readonly string[]): { score: number; shared: string[] } {
  const setB = new Set(b.map((t) => t.toLowerCase()));
  const shared = a.filter((t) => setB.has(t.toLowerCase()));
  const union = new Set([...a, ...b].map((t) => t.toLowerCase())).size;
  return { score: union === 0 ? 0 : shared.length / union, shared };
}

// -----------------------------------------------------------------------------
// Track-to-track flavour matching
// -----------------------------------------------------------------------------

export interface TrackMatch {
  readonly track: TrackFlavour;
  readonly score: number;
  readonly reasons: readonly string[];
  readonly collabFormat: string;
  readonly collabWhy: string;
}

/**
 * Picks the collaboration that suits the *distance* between two tracks. Close
 * neighbours want a duet or a mashup; distant ones only work if the gap itself
 * is the idea, which is what a remix or a flip is for.
 */
function suggestFormat(source: TrackFlavour, other: TrackFlavour, key: number, bpm: number): { format: string; why: string } {
  if (key >= 0.85 && bpm >= 0.75) {
    return {
      format: 'Duet / split-verse release',
      why: 'Same harmonic and tempo pocket — you can trade verses without either track bending.',
    };
  }
  if (bpm >= 0.75 && key < 0.6) {
    return {
      format: 'Mashup: their vocal over your instrumental',
      why: 'Tempos line up but the keys fight, so move the vocal and leave the beds alone.',
    };
  }
  if (key >= 0.85 && bpm < 0.6) {
    return {
      format: 'Half-time / slowed remix',
      why: 'Harmonically compatible but tempo-distant — the tempo gap becomes the remix concept.',
    };
  }
  if (source.genre === other.genre) {
    return {
      format: 'Back-to-back double single',
      why: 'Same genre, no forced blend: two tracks released together and cross-posted beats one bad merge.',
    };
  }
  return {
    format: 'Genre-flip: they cover your track in their style',
    why: 'Far apart on every axis, so the contrast is the hook rather than a problem to solve.',
  };
}

export function matchTracks(source: TrackFlavour, catalogue: readonly TrackFlavour[] = TRACK_FLAVOURS): TrackMatch[] {
  return catalogue
    .filter((t) => t.id !== source.id)
    .map((track) => {
      const key = keyScore(source.key, track.key);
      const bpm = bpmScore(source.bpm, track.bpm);
      const tags = tagOverlap(source.tags, track.tags);
      const score = key.score * 0.35 + bpm.score * 0.35 + tags.score * 0.3;
      const { format, why } = suggestFormat(source, track, key.score, bpm.score);
      const reasons = [key.reason, bpm.reason];
      if (tags.shared.length > 0) reasons.push(`Shared flavour: ${tags.shared.join(', ')}`);
      else reasons.push('No shared flavour tags — the contrast has to carry it');
      return { track, score, reasons, collabFormat: format, collabWhy: why };
    })
    .sort((a, b) => b.score - a.score);
}

// -----------------------------------------------------------------------------
// Podcast matching
// -----------------------------------------------------------------------------

export interface CreatorProfile {
  readonly name: string;
  readonly handle: string;
  readonly followers: number;
  readonly topics: readonly string[];
  readonly models: readonly string[];
  readonly genres: readonly string[];
}

/** Derives the profile from what the creator has actually released. */
export function profileFromTracks(
  name: string,
  handle: string,
  followers: number,
  tracks: readonly TrackFlavour[],
): CreatorProfile {
  const mine = tracks.filter((t) => t.handle === handle);
  const source = mine.length > 0 ? mine : tracks.filter((t) => t.onChannel);
  return {
    name,
    handle,
    followers,
    topics: ['ai music', 'ai', 'creators', 'vibe coding', 'building', ...source.flatMap((t) => t.tags)],
    models: Array.from(new Set(source.flatMap((t) => t.models))),
    genres: Array.from(new Set(source.map((t) => t.genre))),
  };
}

export interface PodcastMatch {
  readonly podcast: PodcastTarget;
  readonly score: number;
  readonly shared: readonly string[];
  readonly verdict: string;
}

const REACH_WEIGHT: Record<PodcastTarget['reach'], number> = {
  peer: 1,
  reachable: 0.85,
  aspirational: 0.4,
};

export function matchPodcasts(
  profile: CreatorProfile,
  targets: readonly PodcastTarget[] = PODCAST_TARGETS,
): PodcastMatch[] {
  return targets
    .map((podcast) => {
      const { score: topicScore, shared } = tagOverlap(profile.topics, podcast.topics);
      // Reach is a multiplier, not a bonus: a perfect topic fit on a show that
      // will never reply is still not a plan.
      const score = Math.min(1, topicScore * 2.2) * REACH_WEIGHT[podcast.reach];
      const verdict =
        podcast.reach === 'aspirational'
          ? `Strong topic fit, but ${profile.followers.toLocaleString()} followers is not yet the pitch. Bank a few releases first.`
          : shared.length >= 2
            ? `${shared.length} shared topics and a comparable audience — this is a real pitch, send it.`
            : 'Thin overlap. Only worth it if you can offer something specific they cannot get elsewhere.';
      return { podcast, score, shared, verdict };
    })
    .sort((a, b) => b.score - a.score);
}

// -----------------------------------------------------------------------------
// Outreach drafting
// -----------------------------------------------------------------------------

export interface Pitch {
  readonly subject: string;
  readonly body: string;
}

/**
 * Drafts only. Nothing here sends anything — the creator reads it, edits it and
 * sends it from their own account, which is both the polite way to approach a
 * show and the only way that survives a spam filter.
 */
export function buildPitch(profile: CreatorProfile, podcast: PodcastTarget, format: 'email' | 'dm'): Pitch {
  const stack = profile.models.slice(0, 3).join(', ') || 'a multi-model stack';
  const host = podcast.host.startsWith('Add the') ? 'there' : podcast.host.split(' ')[0];
  const subject = `Collab idea for ${podcast.name}: an AI-made episode, made on the episode`;

  if (format === 'dm') {
    return {
      subject,
      body: [
        `Hi ${host} — I run FutureBox (${profile.handle}), an AI-native music channel.`,
        '',
        `Idea: we record together and build a full track live during the episode — ${stack} on screen, prompt to master, nothing pre-baked.`,
        '',
        `Angle for your audience: ${podcast.angle}`,
        '',
        'Happy to do it on your feed, mine, or both. Would that work?',
      ].join('\n'),
    };
  }

  return {
    subject,
    body: [
      `Hi ${host},`,
      '',
      `I'm ${profile.name}, I run FutureBox (${profile.handle}) — a channel where every release is made with AI and the model stack is published alongside the track, so listeners can see exactly which system did which part.`,
      '',
      `Why I'm writing: I'd like to propose a joint episode. Rather than talk about AI music in the abstract, we build a finished track during the recording — ${stack}, screen shared, prompt through to master. It takes about 40 minutes and the audience watches the thing get made.`,
      '',
      `The angle I think fits ${podcast.name}: ${podcast.angle}`,
      '',
      `Format-wise I'd fit your existing shape (${podcast.format}) rather than ask you to change anything. I'm also happy to cut the session into vertical clips for both our channels, and to go live afterwards on TikTok as a follow-up room.`,
      '',
      "If the timing is wrong, no problem at all — I'd still be glad to send a track for you to use as bed music, no strings.",
      '',
      'Thanks for reading,',
      `${profile.name}`,
      `${profile.handle} · futurebox.app`,
    ].join('\n'),
  };
}

export function buildLiveBrief(profile: CreatorProfile, coHost: string, topic: string, slot: string): string {
  return [
    'FUTUREBOX × ' + (coHost || '[co-host]').toUpperCase() + ' — TIKTOK LIVE BRIEF',
    '',
    `Room: @futurebox (co-host: ${coHost || '[to confirm]'})`,
    `Slot: ${slot || '[to confirm]'}`,
    `Topic: ${topic || 'Build a track live, start to finish'}`,
    '',
    'Run of show (45 min)',
    '  0–3    Both hosts on, state plainly that everything made here is AI-made.',
    '  3–10   Take the prompt from the comments. Read it out as typed.',
    `  10–25  Generate and iterate on the track. Stack on screen: ${profile.models.join(', ') || 'your model stack'}.`,
    '  25–35  Co-host takes the visual pass. Same rule — stack visible.',
    '  35–42  Play the finished thing. Ask the room to name it.',
    '  42–45  Where to find both channels. One ask, not five.',
    '',
    'Rules for the room',
    '  · Every output is labelled AI-made, on screen, not just in the caption.',
    '  · No prompts naming a living artist to imitate their voice or likeness.',
    '  · Comments moderated by a third person, not by either host.',
    '',
    'After',
    '  · Cut 3 vertical clips (hook in the first 1.5s) and cross-post to both channels.',
    '  · Publish the finished track with the full stack listed.',
  ].join('\n');
}

// -----------------------------------------------------------------------------
// Viral post suggestions
// -----------------------------------------------------------------------------

export interface PostIdea {
  readonly hook: string;
  readonly caption: string;
  readonly hashtags: readonly string[];
  readonly shotNote: string;
}

const HOOK_SHAPES = [
  (t: TrackFlavour) => `I gave an AI four words. It gave me this ${t.genre.toLowerCase()} track.`,
  (t: TrackFlavour) => `${t.bpm} BPM, ${t.key}, and nobody in the room could play it. Here it is anyway.`,
  (t: TrackFlavour) => `Nobody played an instrument on "${t.title}". Listen to the ${t.tags[0] ?? 'sound'} anyway.`,
  (t: TrackFlavour) => `This took 11 minutes. Here is every prompt I used.`,
  (t: TrackFlavour) => `Stop scrolling — the drop on "${t.title}" is at 0:14.`,
];

export function buildPosts(track: TrackFlavour, platform: Platform): PostIdea[] {
  const base = ['aimusic', 'futurebox', 'aicreator', 'sunoai', 'madewithai'];
  const tags = [...base, ...track.tags.map((t) => t.replace(/[^a-z0-9]/gi, ''))]
    .filter(Boolean)
    .slice(0, platform.maxHashtags);

  return HOOK_SHAPES.map((shape, i) => ({
    hook: shape(track),
    caption: [
      shape(track),
      '',
      `"${track.title}" — ${track.genre}, ${track.bpm} BPM, ${track.key}.`,
      `Built with: ${track.models.join(' + ')}.`,
      i % 2 === 0 ? 'Full track and the exact prompt on futurebox.app.' : 'Prompt in the comments. Steal it.',
    ].join('\n'),
    hashtags: tags,
    shotNote: `${platform.bestFormat}. Land the hook inside ${platform.hookWindow} — on ${platform.name} nothing after that is watched by people who left.`,
  }));
}

// -----------------------------------------------------------------------------
// Competition generator
// -----------------------------------------------------------------------------

export interface GeneratedCompetition {
  readonly title: string;
  readonly category: CompetitionCategory;
  readonly brief: string;
  readonly constraint: string;
  readonly theme: string;
}

export function generateCompetition(category: CompetitionCategory, seed: number): GeneratedCompetition {
  const pool = COMPETITION_SEEDS[category];
  const constraint = pool.constraint[seed % pool.constraint.length];
  const theme = pool.theme[Math.floor(seed / pool.constraint.length) % pool.theme.length];
  const titles: Record<CompetitionCategory, string> = {
    music: `Track about ${theme}, ${constraint}`,
    video: `Video about ${theme}, ${constraint}`,
    app: `App for ${theme}, ${constraint}`,
    idea: `Idea for ${theme}, ${constraint}`,
  };
  return {
    title: titles[category],
    category,
    constraint,
    theme,
    brief: `Make it about ${theme}. One hard constraint: ${constraint}. The constraint is the point — entries that ignore it are disqualified before judging, however good they are.`,
  };
}
