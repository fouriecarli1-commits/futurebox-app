/**
 * The words that decide how a song comes out.
 *
 * ElevenLabs Music has no voice parameter, no genre dropdown and no mood
 * setting. There is one lever: `positive_styles`, a list of plain-English
 * directions. Everything a person picks on the Make screen ends up there.
 *
 * That makes the vocabulary the product. Twelve fixed buttons is a smaller
 * instrument than the model can play, which is why the style field is open
 * text and these are starters that add to it rather than replace it.
 *
 * Two things learned from the SDK's own notes, both reflected here:
 *   · six or seven styles work better than two, because the first chunk sets
 *     the whole song and a thin list leaves the model guessing.
 *   · generic production words ("great production quality") are good defaults
 *     to append — they steer quality without arguing with the genre.
 */

export interface Starter {
  readonly id: string;
  readonly name: string;
  /** What you will actually hear. Written to set an expectation, not to sell. */
  readonly sounds: string;
  /** The words added to the style field. This is what the model reads. */
  readonly words: string;
  readonly bpm: number;
}

export const STARTERS: readonly Starter[] = [
  {
    id: 'afro',
    name: 'Afro house',
    sounds: 'Log drum under a four-on-the-floor kick, shakers, a vocal that floats rather than shouts.',
    words: 'afro house, log drum bassline, shaker groove, warm pads, four-on-the-floor',
    bpm: 122,
  },
  {
    id: 'amapiano',
    name: 'Amapiano',
    sounds: 'Wide log drum, jazzy keys, lots of space between the hits. Unhurried.',
    words: 'amapiano, deep log drum, jazzy electric piano, airy percussion, spacious mix',
    bpm: 112,
  },
  {
    id: 'melodic-techno',
    name: 'Melodic techno',
    sounds: 'Rolling sub-bass, a synth line that keeps climbing, a drop that arrives late.',
    words: 'melodic techno, rolling sub bass, hypnotic arpeggio, dark atmosphere, long build',
    bpm: 124,
  },
  {
    id: 'gospel',
    name: 'Gospel',
    sounds: 'Organ, a choir behind the lead, a key change you feel coming.',
    words: 'gospel, hammond organ, layered choir, live drums, soulful lead vocal',
    bpm: 76,
  },
  {
    id: 'country-pop',
    name: 'Country pop',
    sounds: 'Acoustic guitar up front, brushed drums, a chorus built to be sung back.',
    words: 'modern country pop, acoustic guitar, pedal steel, brushed drums, anthemic chorus',
    bpm: 96,
  },
  {
    id: 'ballad',
    name: 'Piano ballad',
    sounds: 'Piano and voice, almost nothing else, strings arriving in the last third.',
    words: 'piano ballad, sparse arrangement, intimate vocal, strings entering late, slow build',
    bpm: 68,
  },
  {
    id: 'boom-bap',
    name: 'Boom bap',
    sounds: 'Dusty drums, a sampled loop, bass that sits behind the beat.',
    words: 'boom bap, dusty drum break, vinyl texture, warm upright bass, laid back groove',
    bpm: 90,
  },
  {
    id: 'drill',
    name: 'Drill',
    sounds: 'Sliding 808s, sparse hats, a lot of room and a lot of menace.',
    words: 'drill, sliding 808 bass, sparse hi-hats, dark piano melody, wide empty mix',
    bpm: 142,
  },
  {
    id: 'indie-rock',
    name: 'Indie rock',
    sounds: 'Jangly guitars, a real kit, a vocal that sounds like one take.',
    words: 'indie rock, jangly electric guitar, live drum kit, driving bassline, raw vocal take',
    bpm: 132,
  },
  {
    id: 'lofi',
    name: 'Lo-fi',
    sounds: 'Soft keys, tape hiss, drums that never get loud. Background music on purpose.',
    words: 'lo-fi, soft rhodes keys, tape saturation, brushed drums, mellow and unhurried',
    bpm: 84,
  },
  {
    id: 'synthwave',
    name: 'Synthwave',
    sounds: 'Analogue synths, gated snare, everything drenched in reverb.',
    words: 'synthwave, analogue synthesisers, gated reverb snare, arpeggiated bass, neon atmosphere',
    bpm: 118,
  },
  {
    id: 'cinematic',
    name: 'Cinematic',
    sounds: 'Strings and low percussion, no vocal, building to one big moment.',
    words: 'cinematic score, layered strings, low taiko percussion, slow crescendo, wide dynamics',
    bpm: 90,
  },
];

/**
 * Vocal directions.
 *
 * There is no voice picker in the Music API — a voice is described, not
 * selected. Which is why these read as descriptions rather than as names.
 *
 * The words lean hard on human detail — breath, room, a take rather than a
 * performance — because the common complaint about generated vocals is that
 * they sound too clean. Asking for the imperfection is the only control there
 * is over it, and it works better than asking for "realistic".
 */
export interface VoiceChoice {
  readonly id: string;
  readonly name: string;
  readonly sounds: string;
  readonly words: string;
}

/**
 * Named for who is singing, because that is what people come here to choose.
 *
 * These used to be called "Higher, warm" and "Lower, rough" — an attempt not
 * to put a man or a woman on a list, which had the effect of hiding the choice
 * from the person making it. The style words underneath always did say male
 * and female; only the labels were coy about it. Somebody who wants a woman's
 * voice on their song should be able to see that they can have one.
 */
export const VOICES: readonly VoiceChoice[] = [
  {
    id: 'none',
    name: 'No vocal',
    sounds: 'Instrumental. Your words are kept with the track but nothing is sung.',
    words: '',
  },
  {
    id: 'female-warm',
    name: 'Woman, warm',
    sounds: 'A woman singing close to the mic, breath audible, not belting.',
    words: 'warm female vocal, close-mic, breathy, natural vibrato, unprocessed, one honest take',
  },
  {
    id: 'female-power',
    name: 'Woman, powerful',
    sounds: 'Full chest voice, room around it, carries a big chorus.',
    words: 'powerful female vocal, full chest voice, live room ambience, soaring chorus, real dynamics',
  },
  {
    id: 'male-low',
    name: 'Man, low and rough',
    sounds: 'Gravel in it, pushed rather than smooth, sits under the music.',
    words: 'low male vocal, slight rasp, pushed delivery, warm chest tone, lived-in, minimal tuning',
  },
  {
    id: 'male-soft',
    name: 'Man, gentle',
    sounds: 'Almost spoken, very close, more confession than performance.',
    words: 'soft male vocal, near-whisper, very close mic, intimate, barely accompanied, human breath',
  },
  {
    id: 'choir',
    name: 'A group',
    sounds: 'Several voices together, harmony rather than a lead.',
    words: 'layered group vocal, natural harmony, choir stacking, slight timing spread, live feel',
  },
];

/**
 * Lengths, in seconds rather than in bars.
 *
 * Bars only mean something once you know the tempo, so "32 bars" answered a
 * question nobody asked. These are the durations people actually think in, and
 * each says what it is for — a fifteen-second clip and a full song are
 * different jobs, not different amounts of the same one.
 */
export interface LengthChoice {
  readonly seconds: number;
  readonly label: string;
  readonly note: string;
}

/**
 * How long a song may be.
 *
 * The music API takes up to ten minutes and this list stopped at three, so two
 * thirds of what the engine can do was not on the screen at all. Nobody was
 * told; it simply was not offered.
 *
 * Longer costs more, and visibly: `songCost` charges five credits a minute, so
 * the price beside each of these is a real number the route will really take.
 * That is what makes it safe to offer ten — it is not a way to spend somebody's
 * month by accident.
 */
export const LENGTH_CHOICES: readonly LengthChoice[] = [
  { seconds: 30, label: '30 seconds', note: 'A hook, for a reel' },
  { seconds: 60, label: '1 minute', note: 'Verse and chorus' },
  { seconds: 120, label: '2 minutes', note: 'A short song, right through' },
  { seconds: 180, label: '3 minutes', note: 'A full release' },
  { seconds: 240, label: '4 minutes', note: 'Room for a bridge and a last chorus' },
  { seconds: 300, label: '5 minutes', note: 'A long one — an outro that goes somewhere' },
  { seconds: 420, label: '7 minutes', note: 'Album length. Give it a plan or it wanders' },
  { seconds: 600, label: '10 minutes', note: 'The longest the engine makes in one go' },
];

/** Production words worth appending to almost anything. */
export const POLISH = [
  'great production quality',
  'balanced mix',
  'natural stereo width',
  'dynamic performance',
] as const;
