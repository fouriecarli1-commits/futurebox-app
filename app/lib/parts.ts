/**
 * A part, asked for the way you would ask a session player.
 *
 * ── What she asked for ───────────────────────────────────────────────────
 *
 *   "dit moet super maklik wees om gou liedjies te meng, 'n lys van ekstra
 *    instrumente in te voeg, ai klanke te generate en dan te mix en te
 *    generate. dit moet absoluut sin maak vir 'n professional."
 *
 * The Pro Booth could record a lane, bring a file in, split stems and mix. It
 * could not add anything that was not already recorded somewhere, so the one
 * thing a producer does twenty times a session — "this needs a pad under the
 * chorus" — meant leaving the room.
 *
 * ── Why this makes sense to a professional and a genre picker would not ──
 *
 * Because the room already knows the key, the tempo and the time signature:
 * they are set in the panel at the top, and the metronome and the bar grid
 * already run on them. So a part is asked for the way a player is asked for
 * one — *eight bars of Rhodes in A minor at 96, in four* — rather than by
 * picking a mood out of a list and hoping.
 *
 * That is also the whole of the silent teaching in this file. Nobody is told
 * what a bar is or why a key matters. The request is simply written in those
 * terms, every time, in front of somebody who is about to press a button.
 *
 * ── The limit that has to be said out loud ──────────────────────────────
 *
 * ElevenLabs' music call takes **text**. It cannot hear the session. So the
 * part comes back *described* as being in A minor at 96 — it is not locked to
 * the session's clock, and it will not be in time with a lane that drifts.
 * A professional needs to know that before the press, not after, which is why
 * `asked()` gives back the sentence the room shows and why the room says the
 * part may need nudging.
 */

/** What can be asked for. Grouped the way a mixer's channel list is grouped. */
export type Family = 'drums' | 'bass' | 'keys' | 'guitars' | 'winds' | 'texture';

export interface Instrument {
  readonly id: string;
  readonly family: Family;
  /** The i18n key for its name. Every one is in the dictionary in both. */
  readonly name: string;
  /** Its English, for `t(name, english)`. */
  readonly english: string;
  /**
   * The words the engine actually reads.
   *
   * English, and deliberately not translated: this is a prompt to a model
   * trained on English descriptions, not text for a person. The *name* above
   * is what a person reads.
   */
  readonly style: string;
}

export const INSTRUMENTS: readonly Instrument[] = [
  /* Drums and percussion. A kit is the most-asked-for part and the one most
     often wanted dry, so "close-miked, dry" is in the words rather than left
     to whatever reverb the model likes. */
  { id: 'kit', family: 'drums', name: 'part.kit', english: 'Drum kit', style: 'acoustic drum kit, close-miked, dry, steady groove' },
  { id: 'brushes', family: 'drums', name: 'part.brushes', english: 'Brushed kit', style: 'drum kit played with brushes, soft, jazz feel' },
  { id: 'eightoheight', family: 'drums', name: 'part.808', english: '808 kit', style: '808 drum machine, deep kick, crisp hats, trap feel' },
  { id: 'shaker', family: 'drums', name: 'part.shaker', english: 'Shaker and tambourine', style: 'shaker and tambourine, dry, steady sixteenths' },
  { id: 'congas', family: 'drums', name: 'part.congas', english: 'Congas', style: 'congas and bongos, warm, live percussion' },

  /* Bass. Named by the instrument rather than by the sound, because a bass
     player would say "upright" and not "warm low thing". */
  { id: 'bass', family: 'bass', name: 'part.bass', english: 'Electric bass', style: 'electric bass guitar, fingered, round tone' },
  { id: 'upright', family: 'bass', name: 'part.upright', english: 'Upright bass', style: 'upright double bass, acoustic, woody' },
  { id: 'subbass', family: 'bass', name: 'part.subbass', english: 'Sub bass', style: 'sub bass synth, deep sine, clean low end' },

  /* Keys. */
  { id: 'piano', family: 'keys', name: 'part.piano', english: 'Grand piano', style: 'grand piano, close, natural' },
  { id: 'rhodes', family: 'keys', name: 'part.rhodes', english: 'Electric piano', style: 'Rhodes electric piano, warm, light tremolo' },
  { id: 'organ', family: 'keys', name: 'part.organ', english: 'Organ', style: 'Hammond organ with rotary speaker' },
  { id: 'pad', family: 'keys', name: 'part.pad', english: 'Synth pad', style: 'warm analogue synth pad, slow attack, sustained' },
  { id: 'lead', family: 'keys', name: 'part.lead', english: 'Synth lead', style: 'monophonic synth lead, singing tone' },
  { id: 'strings', family: 'keys', name: 'part.strings', english: 'Strings', style: 'string section, legato, cinematic' },

  /* Guitars. */
  { id: 'acoustic', family: 'guitars', name: 'part.acoustic', english: 'Acoustic guitar', style: 'steel-string acoustic guitar, strummed, close-miked' },
  { id: 'clean', family: 'guitars', name: 'part.clean', english: 'Clean electric', style: 'clean electric guitar, light reverb, arpeggiated' },
  { id: 'muted', family: 'guitars', name: 'part.muted', english: 'Muted electric', style: 'palm-muted electric guitar, tight, rhythmic' },
  { id: 'nylon', family: 'guitars', name: 'part.nylon', english: 'Nylon guitar', style: 'nylon-string classical guitar, fingerpicked' },

  /* Wind and brass. */
  { id: 'sax', family: 'winds', name: 'part.sax', english: 'Saxophone', style: 'tenor saxophone, breathy, melodic' },
  { id: 'brass', family: 'winds', name: 'part.brass', english: 'Brass section', style: 'brass section, trumpets and trombones, tight stabs' },
  { id: 'flute', family: 'winds', name: 'part.flute', english: 'Flute', style: 'concert flute, airy, melodic' },

  /* Texture. Not instruments, and grouped apart for that reason: these are
     the things that go under a mix rather than in it. */
  { id: 'ambient', family: 'texture', name: 'part.ambient', english: 'Ambient bed', style: 'ambient texture, evolving, no rhythm' },
  { id: 'riser', family: 'texture', name: 'part.riser', english: 'Riser', style: 'rising noise sweep building to a peak, no drums' },
  { id: 'vinyl', family: 'texture', name: 'part.vinyl', english: 'Vinyl and room', style: 'vinyl crackle and quiet room tone, no music' },
];

/** How many bars may be asked for at once. */
export const BAR_CHOICES = [2, 4, 8, 16] as const;
export type Bars = (typeof BAR_CHOICES)[number];

/**
 * The engine's own floor and ceiling on a single generation.
 *
 * Sixteen bars of a slow song is over a minute, and two bars of a fast one is
 * under three seconds — shorter than the engine will make. Both ends are
 * clamped here rather than discovered as a refusal.
 */
export const SHORTEST = 8;
export const LONGEST = 120;

export function secondsFor(bars: number, bpm: number, beats: number): number {
  const tempo = Number.isFinite(bpm) && bpm > 0 ? bpm : 120;
  const perBar = Number.isFinite(beats) && beats > 0 ? beats : 4;
  const raw = (60 / tempo) * perBar * (Number.isFinite(bars) && bars > 0 ? bars : 4);
  return Math.min(LONGEST, Math.max(SHORTEST, Math.round(raw)));
}

export function instrumentBy(id: string): Instrument | null {
  return INSTRUMENTS.find((one) => one.id === id) ?? null;
}

export interface Asked {
  readonly bars: number;
  readonly beats: number;
  readonly bpm: number;
  readonly key: string;
  readonly instrument: Instrument;
}

/**
 * The words the engine gets.
 *
 * Key, tempo and time signature first, then the instrument, then the two
 * things a part like this must not come back as: a whole arrangement, or
 * somebody singing. A pad generated with a drum kit under it is not a pad —
 * it is a second song, and it cannot be mixed with the first.
 */
export function styleFor(asked: Asked): string {
  const meter = `${asked.beats}/4`;
  const key = asked.key.trim();
  return [
    asked.instrument.style,
    `${Math.round(asked.bpm)} BPM`,
    meter,
    key ? `in ${key}` : '',
    'solo instrument only, no other instruments, no vocals, no drums unless this is a drum part',
  ]
    .filter(Boolean)
    .join(', ');
}

/**
 * The whole request, as `/api/music` already takes it.
 *
 * ── Why there is no `/api/part` route ────────────────────────────────────
 *
 * A part is a short instrumental song. `/api/music` already makes those: it
 * charges by length through `songCost`, it puts the text through `guard`
 * before anything is spent, it handles the free allowance, it refunds when
 * the engine refuses, and it retries the output format a plan may not have.
 *
 * A second route would have to do all of that again. Every one of those is a
 * money path or a safety gate, and two copies of a money path is how one of
 * them quietly stops matching the other — which is the fault `session.ts` was
 * written to prevent for the mixer, in the same room.
 *
 * So this builds the body and the existing route does the rest. What is new
 * here is the *words*, which is the only part that is actually new.
 *
 * `sections` rather than `prompt`, and one section named after the instrument:
 * that is the path `buildRequest` takes for a structured request, and it is
 * the one that carries a length the engine is told to hit. The plain-prompt
 * path does not.
 */
export function bodyFor(one: Asked): {
  style: string;
  sections: { name: string; lines: string[]; seconds: number }[];
  instrumental: true;
  seconds: number;
} {
  const seconds = secondsFor(one.bars, one.bpm, one.beats);
  return {
    style: styleFor(one),
    sections: [{ name: one.instrument.english, lines: [], seconds }],
    /* Belt and braces with the negative styles in `styleFor`: this is the
       flag `buildRequest` reads to put "instrumental, no vocals" at the front
       of the list and "vocals, singing" in the negatives. A part with
       somebody singing on it cannot go under a song that already has a
       singer. */
    instrumental: true,
    seconds,
  };
}

/**
 * The same request as a sentence a person reads before pressing.
 *
 * The point of showing it is not confirmation, it is the teaching: somebody
 * who presses this forty times has read "eight bars of Rhodes in A minor at
 * 96, in four" forty times, and those are the four things a musician says when
 * they ask for a part.
 *
 * Returned as pieces rather than a sentence, because the two languages put
 * them in different orders and `t()` takes no arguments.
 */
export function asked(one: Asked): {
  bars: string;
  instrument: string;
  key: string;
  tempo: string;
  seconds: number;
} {
  return {
    bars: String(one.bars),
    instrument: one.instrument.name,
    key: one.key.trim(),
    tempo: `${Math.round(one.bpm)} BPM · ${one.beats}/4`,
    seconds: secondsFor(one.bars, one.bpm, one.beats),
  };
}
