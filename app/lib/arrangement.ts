/**
 * Arrangement maths and edit drafting for the Studio timeline.
 *
 * The timeline is honest about what it is: FutureBox does not host a model that
 * renders audio, so nothing here changes a waveform. What it does is let you
 * point at a bar and say what should be different there, and turn that into a
 * precise, timestamped instruction you can hand to the tool that *can* render
 * it. A vague "make the chorus bigger" wastes a generation; "bars 33–40, add a
 * third harmony a sixth above the lead, keep the drums as they are" does not.
 */
import type { TrackFlavour } from '../data/studio';

export type SectionKind = 'intro' | 'verse' | 'chorus' | 'bridge' | 'drop' | 'hook' | 'outro';

export interface Section {
  readonly id: string;
  readonly kind: SectionKind;
  readonly label: string;
  /** 1-indexed, inclusive. */
  readonly startBar: number;
  readonly lengthBars: number;
}

export const SECTION_COLOURS: Record<SectionKind, string> = {
  intro: 'bg-sky-500/25 border-sky-400/50 text-sky-100',
  verse: 'bg-emerald-500/25 border-emerald-400/50 text-emerald-100',
  chorus: 'bg-amber-500/25 border-amber-400/50 text-amber-100',
  bridge: 'bg-violet-500/25 border-violet-400/50 text-violet-100',
  drop: 'bg-rose-500/25 border-rose-400/50 text-rose-100',
  hook: 'bg-fuchsia-500/25 border-fuchsia-400/50 text-fuchsia-100',
  outro: 'bg-zinc-500/25 border-zinc-400/50 text-zinc-100',
};

/** Lanes are the parts a listener can name, not the stems a mixer would use. */
export interface Lane {
  readonly id: string;
  readonly name: string;
  readonly hint: string;
}

const DANCE_LANES: Lane[] = [
  { id: 'lead', name: 'Lead synth', hint: 'The line people hum' },
  { id: 'vocal', name: 'Vocal', hint: 'Lead and stacks' },
  { id: 'bass', name: 'Bass', hint: 'Sub and mid bass' },
  { id: 'drums', name: 'Drums', hint: 'Kick, snare, hats' },
];

const BAND_LANES: Lane[] = [
  { id: 'vocal', name: 'Vocal', hint: 'Lead and harmonies' },
  { id: 'guitars', name: 'Guitars', hint: 'Acoustic and electric' },
  { id: 'bass', name: 'Bass', hint: 'Upright or electric' },
  { id: 'drums', name: 'Drums', hint: 'Kit and percussion' },
];

export function lanesFor(track: TrackFlavour): Lane[] {
  const dance = ['dance', 'synth', 'techno', 'house', 'edm'];
  return track.tags.some((t) => dance.includes(t.toLowerCase())) ? DANCE_LANES : BAND_LANES;
}

const ARRANGEMENTS: Record<'dance' | 'song', Array<[SectionKind, string, number]>> = {
  dance: [
    ['intro', 'Intro', 8],
    ['hook', 'Hook', 8],
    ['verse', 'Verse', 8],
    ['drop', 'Drop', 8],
    ['bridge', 'Breakdown', 8],
    ['drop', 'Drop 2', 8],
    ['outro', 'Outro', 8],
  ],
  song: [
    ['intro', 'Intro', 4],
    ['verse', 'Verse 1', 8],
    ['chorus', 'Chorus 1', 8],
    ['verse', 'Verse 2', 8],
    ['chorus', 'Chorus 2', 8],
    ['bridge', 'Bridge', 8],
    ['chorus', 'Final chorus', 8],
    ['outro', 'Outro', 4],
  ],
};

export function arrangementFor(track: TrackFlavour): Section[] {
  const dance = ['dance', 'synth', 'techno', 'house', 'edm'];
  const shape = track.tags.some((t) => dance.includes(t.toLowerCase())) ? 'dance' : 'song';
  let bar = 1;
  return ARRANGEMENTS[shape].map(([kind, label, lengthBars], i) => {
    const section: Section = { id: `${kind}-${i}`, kind, label, startBar: bar, lengthBars };
    bar += lengthBars;
    return section;
  });
}

export const BEATS_PER_BAR = 4;

export function secondsPerBar(bpm: number): number {
  return (60 / bpm) * BEATS_PER_BAR;
}

export function totalBars(sections: readonly Section[]): number {
  const last = sections[sections.length - 1];
  return last ? last.startBar + last.lengthBars - 1 : 0;
}

export function barToSeconds(bar: number, bpm: number): number {
  return (bar - 1) * secondsPerBar(bpm);
}

export function secondsToBar(seconds: number, bpm: number): number {
  return seconds / secondsPerBar(bpm) + 1;
}

/** `00:12.480` — the shape Suno's transport uses, and the one an edit note needs. */
export function formatTimecode(seconds: number): string {
  const safe = Math.max(0, seconds);
  const m = Math.floor(safe / 60);
  const s = Math.floor(safe % 60);
  const ms = Math.floor((safe % 1) * 1000);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
}

/** `001.1.1` — bar, beat, sixteenth. */
export function formatBarPosition(bar: number): string {
  const whole = Math.max(1, Math.floor(bar));
  const fraction = Math.max(0, bar - whole);
  const beat = Math.floor(fraction * BEATS_PER_BAR) + 1;
  const sixteenth = Math.floor(((fraction * BEATS_PER_BAR) % 1) * 4) + 1;
  return `${String(whole).padStart(3, '0')}.${beat}.${sixteenth}`;
}

export function sectionAtBar(sections: readonly Section[], bar: number): Section | undefined {
  return sections.find((s) => bar >= s.startBar && bar < s.startBar + s.lengthBars);
}

// -----------------------------------------------------------------------------
// Edit requests
// -----------------------------------------------------------------------------

export interface EditRequest {
  readonly id: string;
  readonly laneId: string;
  readonly startBar: number;
  readonly lengthBars: number;
  readonly note: string;
  readonly status: 'draft' | 'queued';
}

/** Starting points, so an empty prompt box is never the first thing you face. */
export const EDIT_SUGGESTIONS: Record<string, string[]> = {
  vocal: [
    'Add a harmony a third above the lead, same phrasing',
    'Double the lead vocal an octave down for weight',
    'Strip back to one dry vocal, no reverb',
  ],
  guitars: [
    'Swap the strummed acoustic for fingerpicked',
    'Add a pedal steel swell under the last two bars',
    'Drop the electric out entirely here',
  ],
  lead: [
    'Take the lead line up an octave',
    'Replace the synth lead with a plucked arp',
    'Let the lead rest for four bars, then bring it back',
  ],
  bass: [
    'Make the bass follow the kick instead of walking',
    'Add a sub an octave below from here',
    'Cut the bass for the first two bars, then drop it in',
  ],
  drums: [
    'Half-time the drums here',
    'Cut everything but the kick for two bars',
    'Add hand percussion and claps under the chorus',
  ],
};

/**
 * Turns a pointed-at region into an instruction precise enough to be worth a
 * generation. Bars, seconds, section, key and tempo all go in — the things a
 * model cannot infer from "make it better".
 */
export function buildEditPrompt(
  track: TrackFlavour,
  sections: readonly Section[],
  edits: readonly EditRequest[],
  lanes: readonly Lane[],
): string {
  if (edits.length === 0) {
    return 'No changes queued yet. Pick a spot on the timeline and say what should be different there.';
  }
  const lines = [
    `EDIT REQUEST — "${track.title}"`,
    `${track.genre} · ${track.bpm} BPM · ${track.key} · ${BEATS_PER_BAR}/4`,
    `Built with: ${track.models.join(' + ')}`,
    '',
    'Keep everything not listed below exactly as it is.',
    '',
  ];
  edits.forEach((edit, i) => {
    const lane = lanes.find((l) => l.id === edit.laneId);
    const section = sectionAtBar(sections, edit.startBar);
    const from = barToSeconds(edit.startBar, track.bpm);
    const to = barToSeconds(edit.startBar + edit.lengthBars, track.bpm);
    lines.push(
      `${i + 1}. ${lane?.name ?? edit.laneId} — bars ${edit.startBar}–${edit.startBar + edit.lengthBars - 1}` +
        `${section ? ` (${section.label})` : ''}, ${formatTimecode(from)}–${formatTimecode(to)}`,
      `   ${edit.note}`,
    );
  });
  return lines.join('\n');
}
