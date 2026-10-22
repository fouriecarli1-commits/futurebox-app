/**
 * Playing a hum back as an instrument.
 *
 * ── What she asked ───────────────────────────────────────────────────────
 *
 * The owner, 9 October 2026: *"Wat oulik is is dat mens die ritme van 'n liedjie
 * met jou stem kan sing en in sit, en dan kies jy net die instrument
 * tipe."* `lib/humnotes.ts` is the first half — the hum, as notes. This is
 * the second: those notes, played.
 *
 * ── Why this is arithmetic and not Web Audio ─────────────────────────────
 *
 * `renderSketch` in `lib/audio.ts` already writes samples into a
 * `Float32Array` by hand and hands them to `encodeWav`, and this follows it
 * for the reason that pattern exists: a function that fills an array is a
 * function a check can call. An `OfflineAudioContext` is only in a browser,
 * so a synth built on one can be looked at and never driven — and the way a
 * synth goes wrong is not an exception, it is a note in the wrong place or a
 * click where an envelope should be.
 *
 * It is also the only version that works on the phone this runs on. Nothing
 * here is sent anywhere, nothing is charged, and a hum turns into a bass
 * line with the device in aeroplane mode.
 *
 * ── It said "why four and not twenty", and she asked for twenty ──────────
 *
 * The paragraph that used to be here argued that four was enough: a low end,
 * a sustained one, a short percussive one, and a kit. The owner, 9 October 2026:
 * *"Ek dink ook daar moet heelwat 'n verskeidenheid van teks opsies wees,
 * daar moet van alles wat opsies is, 'n verskeidenheid wees."*
 *
 * So the argument was mine and it was wrong in a particular way: it defended
 * a short list on the grounds that each entry must be worth choosing, which
 * is true, and then used it to excuse not writing the other ones. A person
 * humming a bass line and a person humming a music-box melody are reaching
 * for different things, and offering them both the same three timbres is the
 * room deciding for them.
 *
 * ── What made it a short list, which was the real reason ─────────────────
 *
 * `play` below was a chain of `if (voice.id === 'bass') … else if (keys) …`,
 * so every new instrument was a new branch in the middle of a loop that runs
 * forty-four thousand times a second. That is a thing nobody adds a
 * fourteenth entry to.
 *
 * The timbre is DATA now — harmonics, decay, attack, detune, breath — and
 * `play` reads it. An instrument is a row, `check:neurie` drives every row
 * the same way, and the three that existed before are written as the exact
 * numbers they were so nothing she has already heard changes.
 *
 * ── Why they are grouped ─────────────────────────────────────────────────
 *
 * A column of two dozen nouns is the list nobody reads past the third, which
 * was the honest half of the old paragraph. They are ordered as a person
 * looks for them: the low end, then the held instruments, then the struck
 * and plucked ones, then the kit. `GROUPS` carries the headings.
 *
 * ── And a section is not a soloist ───────────────────────────────────────
 *
 * The owner, 10 October 2026: *"Die hoeveelheid stems wat ons het bepaal ook die
 * sukses van die produk. Ek dink aan instrumente wat ek nie sien nie soos,
 * tjello, kontra-bas."*
 *
 * She is right, and the fault was a particular one: `strings` and `brass`
 * were ENSEMBLES standing in for every instrument in them. A cello and a
 * double bass are no more "strings" than a singer is a choir. Both are here
 * now, and so are the violin, the trumpet, the trombone, the clarinet, the
 * saxophone, the banjo, the harp — and the concertina, which this app's own
 * video placeholder has said since September (*"A konsertina on a stoep at
 * sunset"*) while the room that makes the music could not play one.
 *
 * The sections stay. A string section and one cello are different sounds and
 * both are worth having; what was wrong was having only the first.
 */

/** The one this app writes samples at, as `lib/audio.ts` does. */
export const RATE = 44100;

export type VoiceId =
  | 'subbass' | 'bass' | 'kontrabas'
  | 'keys' | 'organ' | 'strings' | 'cello' | 'violin' | 'brass' | 'trumpet'
  | 'trombone' | 'flute' | 'clarinet' | 'sax' | 'konsertina' | 'choir' | 'lead'
  | 'pluck' | 'guitar' | 'banjo' | 'harp' | 'marimba' | 'bell'
  | 'drums';

/** Which heading an instrument sits under, so thirteen read as four. */
export type GroupId = 'low' | 'held' | 'struck' | 'kit';

export const GROUPS: readonly { id: GroupId; says: readonly [string, string] }[] = [
  { id: 'low', says: ['hum.groupLow', 'The low end'] },
  { id: 'held', says: ['hum.groupHeld', 'Held and sustained'] },
  { id: 'struck', says: ['hum.groupStruck', 'Struck and plucked'] },
  { id: 'kit', says: ['hum.groupKit', 'Rhythm only'] },
];

export interface Voice {
  readonly id: VoiceId;
  /** The i18n key and the English. */
  readonly says: readonly [string, string];
  /** One line on what it is for, so the choice is not four nouns. */
  readonly what: readonly [string, string];
  /** Shifted by this many semitones before it is played. */
  readonly shift: number;
  /** Does it care what pitch was hummed? */
  readonly pitched: boolean;
  /** Which heading it sits under. */
  readonly group: GroupId;
  /**
   * The harmonics, from the first upward, as amplitudes.
   *
   * `[1]` is a bare sine. `[1, 0.35, 0.12]` is a fundamental with some second
   * and a little third, which is what a soft keyboard is. A zero is a
   * harmonic deliberately absent — odd-only partials are what make a
   * clarinet, a marimba and an organ pipe sound hollow rather than thin.
   */
  readonly partials: readonly number[];
  /**
   * Seconds for the note to fall to about a third of its loudness.
   *
   * Zero means it does not fall on its own — it is held for as long as it
   * was hummed, and `decayFloor` is the shortest that fall may be taken as.
   * A fixed number is a note that dies whatever happens: a pluck, a bell.
   */
  readonly decay: number;
  /** When `decay` is zero, the shortest the held fall may be. */
  readonly decayFloor?: number;
  /** Seconds to come in. Long is a bow or a pad; short is a hammer. */
  readonly attack: number;
  /** Seconds to go out, so nothing ends on a click. */
  readonly release: number;
  /** Longest one note may last, however long it was hummed. */
  readonly most?: number;
  /**
   * A second copy a little out of tune, which is what makes a sound WIDE.
   *
   * Two strings on a twelve-string, two oscillators on a synth, sixteen
   * violins that are not quite together. Without it a sustained tone is a
   * test signal.
   */
  readonly detune?: { readonly ratio: number; readonly level: number };
  /** Breath, bow or hammer noise mixed in, as an amplitude. */
  readonly breath?: number;
  /** How much of the note's start the breath covers. 1 is all of it. */
  readonly breathFor?: number;
  /**
   * The slow wobble in pitch a player adds to a held note.
   *
   * The owner, 21 October 2026, having hummed a line and picked the violin:
   * *"Dit klink nie soos 'n violin."* A bowed string with no vibrato is the
   * sound of a test tone with harmonics on it; the wobble — five or six times
   * a second, a fifth of a semitone, starting a moment after the note does —
   * is most of what the ear takes for "a person playing a violin".
   * `depth` is in semitones and `after` is how long the note is held before
   * the wobble has fully come in.
   */
  readonly vibrato?: { readonly rate: number; readonly depth: number; readonly after: number };
  /**
   * The instrument's body: the frequencies its wood or brass rings at.
   *
   * Each harmonic is made louder by how close it sits to one of these. A
   * violin's body rings near 280Hz and again around 3kHz, and that is why
   * the same note on a violin and on a synth string are told apart in a
   * second. `width` is in Hz; `gain` is how much louder at the peak.
   */
  readonly body?: readonly { readonly hz: number; readonly width: number; readonly gain: number }[];
}

/**
 * How she has set the sound after hearing it.
 *
 * The owner, 21 October 2026: *"die instrument kies, en dan daai klank kan
 * verstel totdat dit klink soos dit moet."* Every one of these is a dial on
 * the hum desk; `PLAIN` is every dial at the middle, and at the middle the
 * part is exactly what the instrument's own row makes — so a part made
 * before the dials existed sounds the same today.
 */
export interface Tweak {
  /** Octaves up or down, on top of the instrument's own shift. */
  readonly octave: number;
  /** −1 is darker, +1 is brighter. Tilts the harmonics. */
  readonly bright: number;
  /** How much wobble, as a share of the instrument's own. 0 is none. */
  readonly vibrato: number;
  /** The attack, multiplied: 0.25 is a sharp start, 4 a slow bow. */
  readonly attack: number;
  /** How long notes ring and fall, multiplied. */
  readonly length: number;
  /** How much room is around it, 0 to 1. */
  readonly room: number;
}

export const PLAIN: Tweak = { octave: 0, bright: 0, vibrato: 1, attack: 1, length: 1, room: 0 };

export const VOICES: readonly Voice[] = [
  /* ── The low end ──────────────────────────────────────────────────────

     Both shifted down, because a voice hums a bass part an octave above
     where a bass plays it — everybody does, and transposing it back is the
     difference between a bass line and a sung one. */
  {
    id: 'subbass',
    says: ['hum.subbass', 'Sub bass'],
    what: ['hum.subbassWhat', 'Two octaves down, almost pure. For the floor under everything.'],
    shift: -24,
    pitched: true,
    group: 'low',
    /* Nearly a sine, with a whisper of the octave so it is not inaudible on
       a phone speaker — which has nothing at all below about 200Hz, so two
       octaves down is felt on a desk and guessed at on a handset. */
    partials: [1, 0.12],
    decay: 0,
    decayFloor: 0.3,
    attack: 0.008,
    release: 0.04,
  },
  {
    id: 'bass',
    says: ['hum.bass', 'Bass'],
    what: ['hum.bassWhat', 'An octave down from what you hummed, round and short.'],
    shift: -12,
    pitched: true,
    group: 'low',
    /* A sine with a little of the octave above it. A pure sine disappears on
       a phone speaker; the harmonic is what makes the line audible there at
       all. These are the numbers this voice has always had. */
    partials: [1, 0.25],
    decay: 0,
    decayFloor: 0.2,
    attack: 0.004,
    release: 0.03,
  },
  {
    id: 'kontrabas',
    says: ['hum.kontrabas', 'Double bass'],
    what: ['hum.kontrabasWhat', 'Bowed, with the wood in it. Holds under a whole band.'],
    shift: -24,
    pitched: true,
    group: 'low',
    /* Hers, 10 October 2026: *"Ek dink aan instrumente wat ek nie sien nie
       soos, tjello, kontra-bas."* Both were missing and both should have
       been here: `strings` is a SECTION, and a section is not a solo
       instrument any more than a choir is a singer.
 
       Bowed and not plucked, which is the whole difference from `bass`
       above: a bow keeps the note alive for as long as the arm moves, so
       this holds where the electric one decays. Rich odd harmonics and a
       slow attack, with bow noise through all of it. */
    partials: [1, 0.3, 0.45, 0.2, 0.18, 0.1],
    decay: 0,
    decayFloor: 14,
    attack: 0.09,
    release: 0.1,
    detune: { ratio: 1.0025, level: 0.3 },
    breath: 0.05,
    breathFor: 1,

    vibrato: { rate: 4.8, depth: 0.12, after: 0.3 },
  },

  /* ── Held and sustained ───────────────────────────────────────────────

     The ones that stay up for as long as the note was hummed. `decay: 0`
     with a floor, rather than a fixed fall. */
  {
    id: 'keys',
    says: ['hum.keys', 'Electric piano'],
    what: ['hum.keysWhat', 'Soft and sustained, at the pitch you hummed.'],
    shift: 0,
    pitched: true,
    group: 'held',
    partials: [1, 0.35, 0.12],
    decay: 0,
    decayFloor: 0.6,
    attack: 0.012,
    release: 0.06,
  },
  {
    id: 'organ',
    says: ['hum.organ', 'Organ'],
    what: ['hum.organWhat', 'Does not fade at all. Holds flat for as long as you held the note.'],
    shift: 0,
    pitched: true,
    group: 'held',
    /* Drawbars: the fundamental, the octave, the twelfth and the double
       octave, which is the registration everybody recognises as an organ.
       The gaps are deliberate — a full harmonic series here sounds like a
       saw, not a pipe. */
    partials: [1, 0.6, 0, 0.35, 0, 0.2],
    decay: 0,
    /* High, so the fall is effectively flat for any note somebody hums. An
       organ is the one instrument with no decay at all, and that is the
       whole reason to offer it. */
    decayFloor: 30,
    attack: 0.02,
    release: 0.03,
  },
  {
    id: 'strings',
    says: ['hum.strings', 'Strings'],
    what: ['hum.stringsWhat', 'Comes in slowly and swells. For a line underneath a chorus.'],
    shift: 0,
    pitched: true,
    group: 'held',
    partials: [1, 0.5, 0.3, 0.18, 0.1, 0.06],
    decay: 0,
    decayFloor: 20,
    /* The slow bow. This is the whole character: a string section that comes
       in in four milliseconds is a synth patch. */
    attack: 0.18,
    release: 0.14,
    /* Sixteen violins are never quite together, and that is what makes a
       string section sound like more than one instrument. */
    detune: { ratio: 1.006, level: 0.7 },
    breath: 0.03,
    breathFor: 1,

    vibrato: { rate: 5, depth: 0.08, after: 0.3 },
  },
  {
    id: 'cello',
    says: ['hum.cello', 'Cello'],
    what: ['hum.celloWhat', 'One cello, not a section. Warm and close, the voice of the strings.'],
    shift: -12,
    pitched: true,
    group: 'held',
    /* Named by her. Down an octave because a hummed line sits where a voice
       sits and a cello sings an octave below it — the same reasoning the
       bass has, for the same reason.
 
       Against `strings`: no detune and almost none of the slow swell. A
       section is many instruments not quite together, and that not-quite is
       what makes it a section. One cello is ONE instrument, so taking the
       detune off is most of what makes this read as a soloist. */
    partials: [1, 0.55, 0.4, 0.22, 0.16, 0.08, 0.05],
    decay: 0,
    decayFloor: 16,
    attack: 0.08,
    release: 0.12,
    breath: 0.04,
    breathFor: 1,

    vibrato: { rate: 5.2, depth: 0.2, after: 0.25 },
    body: [{ hz: 210, width: 90, gain: 0.8 }, { hz: 2200, width: 900, gain: 0.45 }],
  },
  {
    id: 'violin',
    says: ['hum.violin', 'Violin'],
    what: ['hum.violinWhat', 'One violin, high and singing. For a line over the top.'],
    shift: 12,
    pitched: true,
    group: 'held',
    /* Up an octave, where a violin lives. Brighter than the cello — more
       weight in the upper harmonics — and a faster bow, because a violin
       speaks sooner than a cello does. */
    /* 21 October 2026: she hummed a line, picked this, and it did not sound
       like a violin. It was seven harmonics and a hiss. A bowed string is
       nearly a sawtooth — many harmonics, falling slowly — sung through a
       body that rings near 280Hz and 3kHz, with a vibrato that arrives just
       after the bow does. All three are here now. */
    partials: [1, 0.7, 0.55, 0.45, 0.36, 0.28, 0.22, 0.17, 0.13, 0.1, 0.07, 0.05],
    decay: 0,
    decayFloor: 16,
    attack: 0.07,
    release: 0.12,
    breath: 0.03,
    breathFor: 1,
    vibrato: { rate: 5.6, depth: 0.22, after: 0.22 },
    body: [{ hz: 290, width: 110, gain: 0.9 }, { hz: 3000, width: 1100, gain: 0.7 }],
  },
  {
    id: 'brass',
    says: ['hum.brass', 'Brass'],
    what: ['hum.brassWhat', 'Bright and firm, with a bit of a push at the start. For a hook.'],
    shift: 0,
    pitched: true,
    group: 'held',
    partials: [1, 0.7, 0.55, 0.4, 0.28, 0.18, 0.1],
    decay: 0,
    decayFloor: 8,
    attack: 0.05,
    release: 0.07,
    detune: { ratio: 1.002, level: 0.3 },
  },
  {
    id: 'trumpet',
    says: ['hum.trumpet', 'Trumpet'],
    what: ['hum.trumpetWhat', 'One trumpet, bright and forward. Cuts over everything.'],
    shift: 0,
    pitched: true,
    group: 'held',
    /* A narrow, hard tone: the harmonics stay strong a long way up, which is
       what makes brass carry across a room. No detune — one player. */
    partials: [1, 0.8, 0.65, 0.5, 0.42, 0.3, 0.2, 0.12],
    decay: 0,
    decayFloor: 8,
    attack: 0.035,
    release: 0.06,

    vibrato: { rate: 5.5, depth: 0.08, after: 0.3 },
  },
  {
    id: 'trombone',
    says: ['hum.trombone', 'Trombone'],
    what: ['hum.tromboneWhat', 'Broad and low, and it slides. Under a chorus.'],
    shift: -12,
    pitched: true,
    group: 'held',
    /* Down an octave from the trumpet and rounder: the even harmonics lead,
       which is the difference between a trombone and a trumpet playing the
       same note. A slower attack, because the slide takes time. */
    partials: [1, 0.75, 0.4, 0.45, 0.2, 0.15, 0.08],
    decay: 0,
    decayFloor: 8,
    attack: 0.06,
    release: 0.08,
  },
  {
    id: 'flute',
    says: ['hum.flute', 'Flute'],
    what: ['hum.fluteWhat', 'Almost a pure tone, with the breath left in. Sits above everything.'],
    shift: 12,
    pitched: true,
    group: 'held',
    /* Nearly a sine with a touch of the third, and shifted UP an octave,
       because a flute lives above where anybody hums. */
    partials: [1, 0.04, 0.12],
    decay: 0,
    decayFloor: 10,
    attack: 0.06,
    release: 0.08,
    /* The breath is the instrument. Without it this is a test tone. */
    breath: 0.1,
    breathFor: 1,

    vibrato: { rate: 5, depth: 0.08, after: 0.25 },
  },
  {
    id: 'clarinet',
    says: ['hum.clarinet', 'Clarinet'],
    what: ['hum.clarinetWhat', 'Woody and hollow. Nothing else in this list sounds like it.'],
    shift: 0,
    pitched: true,
    group: 'held',
    /* ODD harmonics only, which is not a stylistic choice: a clarinet is a
       tube closed at one end and the physics of that suppress the even ones.
       It is the reason a clarinet is instantly recognisable, and it is why
       this is worth a row of its own beside the flute — two wind
       instruments that sound nothing alike. */
    partials: [1, 0, 0.5, 0, 0.3, 0, 0.15],
    decay: 0,
    decayFloor: 10,
    attack: 0.04,
    release: 0.07,
    breath: 0.06,
    breathFor: 1,
  },
  {
    id: 'sax',
    says: ['hum.sax', 'Saxophone'],
    what: ['hum.saxWhat', 'Reedy and throaty, with the air in it. For a solo.'],
    shift: 0,
    pitched: true,
    group: 'held',
    /* Between the clarinet and the brass: a reed, but a cone rather than a
       tube, so the even harmonics come back. More breath than anything else
       in this list except the flute, because a saxophone is audibly a person
       blowing. */
    partials: [1, 0.55, 0.6, 0.35, 0.3, 0.2, 0.12],
    decay: 0,
    decayFloor: 9,
    attack: 0.045,
    release: 0.08,
    breath: 0.08,
    breathFor: 1,

    vibrato: { rate: 5.4, depth: 0.12, after: 0.25 },
  },
  {
    id: 'konsertina',
    says: ['hum.konsertina', 'Concertina'],
    what: ['hum.konsertinaWhat', 'Reeds and bellows. Boeremusiek, a stoep, a Saturday.'],
    shift: 0,
    pitched: true,
    group: 'held',
    /* This app's own placeholder for a video prompt is *"A konsertina on a
       stoep at sunset"*, and the instrument was not in the room that makes
       the music. It is the sound of the music a great many of her users
       actually make.
 
       Free reeds: a bright, slightly buzzy series that does not fall away
       the way a bowed string's does, and two reeds per note a few cents
       apart — which is the wobble everybody recognises as an accordion and
       is not an accident of tuning, it is how they are built. */
    partials: [1, 0.65, 0.5, 0.4, 0.3, 0.25, 0.18, 0.12],
    decay: 0,
    decayFloor: 12,
    attack: 0.03,
    release: 0.05,
    detune: { ratio: 1.007, level: 0.75 },
  },
  {
    id: 'choir',
    says: ['hum.choir', 'Voices'],
    what: ['hum.choirWhat', 'A soft pad of hummed voices. For a bed under the whole thing.'],
    shift: 0,
    pitched: true,
    group: 'held',
    /* A strong second and fourth against a weak third is roughly where the
       vowel in "ooh" sits — not a formant filter, but near enough that a
       chord of these reads as voices rather than as a keyboard. */
    partials: [1, 0.45, 0.1, 0.3, 0.08, 0.12],
    decay: 0,
    decayFloor: 20,
    attack: 0.14,
    release: 0.2,
    detune: { ratio: 1.004, level: 0.8 },
    breath: 0.05,
    breathFor: 1,

    vibrato: { rate: 5.2, depth: 0.12, after: 0.2 },
  },
  {
    id: 'lead',
    says: ['hum.lead', 'Synth lead'],
    what: ['hum.leadWhat', 'Thick and buzzy, two oscillators apart. Cuts through a busy mix.'],
    shift: 0,
    pitched: true,
    group: 'held',
    /* A falling series is a sawtooth, which is what every lead sound in
       popular music is built on. */
    partials: [1, 0.5, 0.33, 0.25, 0.2, 0.17, 0.14, 0.12],
    decay: 0,
    decayFloor: 12,
    attack: 0.006,
    release: 0.04,
    detune: { ratio: 1.01, level: 0.85 },
  },

  /* ── Struck and plucked ───────────────────────────────────────────────

     A fixed fall: the note dies on its own however long it was held, which
     is what being struck means. */
  {
    id: 'pluck',
    says: ['hum.pluck', 'Plucked string'],
    what: ['hum.pluckWhat', 'Short and bright, good for a riff.'],
    shift: 0,
    pitched: true,
    group: 'struck',
    /* The numbers this voice has always had: fundamental, no second, some
       third, and a detuned twin a few cents off so it is not a dead tone. */
    partials: [1, 0, 0.3],
    decay: 0.22,
    attack: 0.004,
    release: 0.03,
    most: 0.5,
    detune: { ratio: 1.003, level: 0.5 },
  },
  {
    id: 'guitar',
    says: ['hum.guitar', 'Guitar'],
    what: ['hum.guitarWhat', 'Warmer than the pluck and it rings for longer.'],
    shift: 0,
    pitched: true,
    group: 'struck',
    partials: [1, 0.45, 0.3, 0.14, 0.09, 0.05],
    decay: 0.8,
    attack: 0.003,
    release: 0.05,
    most: 2.2,
    detune: { ratio: 1.0015, level: 0.45 },
    /* The plectrum. A tenth of a note's start, which is the difference
       between a string being struck and a tone appearing. */
    breath: 0.22,
    breathFor: 0.06,
  },
  {
    id: 'banjo',
    says: ['hum.banjo', 'Banjo'],
    what: ['hum.banjoWhat', 'Bright, hard and short. A fast line sounds faster on it.'],
    shift: 0,
    pitched: true,
    group: 'struck',
    /* A skin head over a drum, so the attack is percussive and the upper
       harmonics are loud before anything else arrives. Shorter than the
       guitar and much brighter — which, with a plectrum sound at the front,
       is the whole of what makes a banjo a banjo. */
    partials: [1, 0.5, 0.55, 0.4, 0.3, 0.2],
    decay: 0.45,
    attack: 0.002,
    release: 0.04,
    most: 1.1,
    detune: { ratio: 1.002, level: 0.4 },
    breath: 0.3,
    breathFor: 0.05,
  },
  {
    id: 'harp',
    says: ['hum.harp', 'Harp'],
    what: ['hum.harpWhat', 'Soft and clean, and it rings a long time. For a run.'],
    shift: 0,
    pitched: true,
    group: 'struck',
    /* Plucked flesh on gut: almost no attack noise at all, which is what
       separates it from every other plucked thing here. Few harmonics and a
       very long fall. */
    partials: [1, 0.3, 0.18, 0.08, 0.04],
    decay: 2.2,
    attack: 0.004,
    release: 0.15,
    most: 4,
  },
  {
    id: 'marimba',
    says: ['hum.marimba', 'Marimba'],
    what: ['hum.marimbaWhat', 'Wooden and hollow, gone almost at once. Good for a fast line.'],
    shift: 0,
    pitched: true,
    group: 'struck',
    /* Odd harmonics only, which is what makes a tube or a bar sound hollow
       rather than merely quiet. */
    partials: [1, 0, 0.4, 0, 0.12],
    decay: 0.28,
    attack: 0.002,
    release: 0.04,
    most: 0.9,
    breath: 0.12,
    breathFor: 0.04,
  },
  {
    id: 'bell',
    says: ['hum.bell', 'Music box'],
    what: ['hum.bellWhat', 'High and glassy, and it rings on. For a lullaby or an ending.'],
    shift: 12,
    pitched: true,
    group: 'struck',
    /* Up an octave and weighted high, with gaps: a struck metal bar's
       partials are not a neat series, and the spread above the fundamental
       is what makes it read as glass rather than as a thin piano. */
    partials: [1, 0.2, 0.35, 0.15, 0.3, 0.1, 0.18],
    decay: 1.6,
    attack: 0.002,
    release: 0.12,
    most: 3.5,
  },

  /* ── Rhythm only ──────────────────────────────────────────────────────

     The one voice that ignores pitch entirely. Kept last because it is the
     one somebody reaches for on purpose rather than by browsing. */
  {
    id: 'drums',
    says: ['hum.drums', 'Drum kit'],
    what: ['hum.drumsWhat', 'Ignores the notes and keeps the rhythm. Hum low for a kick, high for a snare.'],
    shift: 0,
    pitched: false,
    group: 'kit',
    /* Unused: the kit is drawn by `play` rather than from harmonics. Present
       because the shape requires it, and a check holds that every pitched
       voice has real ones. */
    partials: [1],
    decay: 0.05,
    attack: 0,
    release: 0,
  },
];

export const voiceById = (id: string): Voice | undefined =>
  VOICES.find((one) => one.id === id);

const hzOf = (midi: number): number => 440 * 2 ** ((midi - 69) / 12);

/**
 * A cheap deterministic noise, for the kit.
 *
 * `Math.random` would make this unrepeatable, and a synth that gives a
 * different answer each time is a synth no check can hold. A counter through
 * a hash gives the same hiss every run.
 */
function noiseAt(i: number): number {
  const x = Math.sin(i * 12.9898) * 43758.5453;
  return (x - Math.floor(x)) * 2 - 1;
}

/** Linear fade in and out, so no note begins or ends with a click. */
function shaped(at: number, length: number, attack: number, release: number): number {
  const up = attack > 0 ? Math.min(1, at / attack) : 1;
  const down = release > 0 ? Math.min(1, (length - at) / release) : 1;
  return Math.max(0, Math.min(up, down));
}

export interface Played {
  readonly midi: number | null;
  readonly from: number;
  readonly to: number;
  readonly loud: number;
}

/**
 * One note, mixed into `out` at `from`.
 *
 * Added rather than written, so two notes that overlap — a held one under a
 * short one — sum instead of the second erasing the first.
 */
function play(
  out: Float32Array,
  voice: Voice,
  note: Played,
  rate: number,
  tweak: Tweak = PLAIN,
): void {
  const start = Math.max(0, Math.round(note.from * rate));
  const held = Math.max(0.05, note.to - note.from);
  const loud = Math.max(0.08, Math.min(1, note.loud));

  if (!voice.pitched) {
    /* The kit. Pitch chooses the drum rather than the note: a hum below
       about middle C is a kick, above it a snare, and an unpitched tap is a
       hat. That is the mapping her own description implies — "hum low for a
       kick" — and it means one take can be a whole beat. */
    const kind = note.midi === null ? 'hat' : note.midi < 60 ? 'kick' : 'snare';
    const length = kind === 'kick' ? 0.18 : kind === 'snare' ? 0.16 : 0.05;
    const n = Math.min(out.length - start, Math.round(length * rate));
    for (let i = 0; i < n; i += 1) {
      const t = i / rate;
      const fall = Math.exp(-t / (kind === 'kick' ? 0.055 : 0.03));
      let value: number;
      if (kind === 'kick') {
        /* A pitch that drops, which is what a kick is. */
        const hz = 110 * Math.exp(-t / 0.03) + 42;
        value = Math.sin(2 * Math.PI * hz * t);
      } else if (kind === 'snare') {
        value = 0.7 * noiseAt(start + i) + 0.3 * Math.sin(2 * Math.PI * 190 * t);
      } else {
        value = noiseAt(start + i) * 0.5;
      }
      out[start + i] += value * fall * loud * 0.8;
    }
    return;
  }

  const midi = (note.midi ?? 60) + voice.shift + 12 * Math.round(tweak.octave);
  const hz = hzOf(midi);
  /* How long the note sounds. A struck instrument has a ceiling of its own
     — `most` — because a hum held for four seconds does not make a marimba
     ring for four seconds. A held one lasts as long as it was hummed. */
  const length = voice.most ? Math.min(held, voice.most * tweak.length) : held;
  const attack = voice.attack * tweak.attack;
  const release = voice.release * tweak.length;
  const n = Math.min(out.length - start, Math.round(length * rate));

  /* The fall. A fixed `decay` is a note that dies on its own; zero means it
     is held, and then the fall is taken over the note's own length with a
     floor under it — which is how the three voices that existed before this
     was data were written, and these are their numbers unchanged. */
  const fall = voice.decay > 0
    ? voice.decay * tweak.length
    : Math.max((voice.decayFloor ?? 0.2) * tweak.length, length);

  /* Each harmonic's amount, after the two things that shape it: the body it
     sings through, and the brightness dial. Worked out once per note rather
     than per sample. At the middle of the dial and with no body these are
     the row's own numbers. */
  const amounts = voice.partials.map((amount, k) => {
    if (amount === 0) return 0;
    const at = hz * (k + 1);
    const ring = (voice.body ?? []).reduce(
      (more, peak) => more + peak.gain * Math.exp(-(((at - peak.hz) / peak.width) ** 2)),
      0,
    );
    return amount * (1 + ring) * (tweak.bright ? (k + 1) ** (tweak.bright * 0.8) : 1);
  });
  /* The wobble: the instrument's own, scaled by the dial — and a little of
     one for an instrument that has none, when the dial is turned past 1. */
  const wobble = voice.vibrato
    ? { ...voice.vibrato, depth: voice.vibrato.depth * tweak.vibrato }
    : tweak.vibrato > 1
      ? { rate: 5.4, depth: 0.12 * (tweak.vibrato - 1), after: 0.25 }
      : null;

  /* Normalised, so an instrument with eight harmonics is not eight times as
     loud as one with two. Without this, adding a richer voice to the list
     would quietly make it the loudest thing in the room — and a part that
     clips is a part somebody blames the recording for. */
  const weight = amounts.reduce((all, one) => all + Math.abs(one), 0)
    * (1 + (voice.detune?.level ?? 0));
  const level = weight > 0 ? 1 / weight : 1;

  /* The phase, carried sample to sample when the pitch wobbles: a pitch
     that moves cannot be written as sin(2πft), because f is not one number. */
  let phase = 0;
  for (let i = 0; i < n; i += 1) {
    const t = i / rate;
    const env = shaped(t, length, attack, release);

    /* The harmonics, summed. Index zero is the fundamental, so harmonic
       `k + 1` is at `(k + 1) × hz`. */
    let value = 0;
    if (wobble && wobble.depth > 0) {
      const into = Math.min(1, t / Math.max(0.01, wobble.after));
      const bend = 2 ** ((wobble.depth * into * Math.sin(2 * Math.PI * wobble.rate * t)) / 12);
      phase += (2 * Math.PI * hz * bend) / rate;
      for (let k = 0; k < amounts.length; k += 1) {
        if (amounts[k] === 0) continue;
        value += amounts[k] * Math.sin(phase * (k + 1));
      }
    } else {
      for (let k = 0; k < amounts.length; k += 1) {
        const amount = amounts[k];
        if (amount === 0) continue;
        value += amount * Math.sin(2 * Math.PI * hz * (k + 1) * t);
      }
    }

    /* The twin a little out of tune. One copy of the fundamental is enough
       for the width — detuning every harmonic as well is a chorus pedal and
       costs eight more sines a sample. */
    if (voice.detune) {
      value += voice.detune.level * Math.sin(2 * Math.PI * hz * voice.detune.ratio * t);
    }

    /* Breath, bow or plectrum. Over the whole note for a wind instrument,
       over the first few milliseconds for something struck. */
    if (voice.breath) {
      const over = voice.breathFor ?? 1;
      const within = over >= 1 ? 1 : Math.max(0, 1 - t / (over * Math.max(0.001, length)));
      if (within > 0) value += voice.breath * noiseAt(start + i) * within;
    }

    out[start + i] += value * level * env * Math.exp(-t / Math.max(0.02, fall))
      * loud * 0.9;
  }
}

/**
 * A room around the part: four echoes that feed back, smeared by two
 * all-passes — the plainest reverb there is, and enough to put a dry
 * instrument somewhere. Done in place; `amount` 0 to 1 is how much.
 */
function roomAround(out: Float32Array, rate: number, amount: number): void {
  const combs = [0.0297, 0.0371, 0.0411, 0.0437].map((s) => ({
    line: new Float32Array(Math.max(1, Math.round(s * rate))), at: 0,
  }));
  const passes = [0.005, 0.0017].map((s) => ({ line: new Float32Array(Math.max(1, Math.round(s * rate))), at: 0 }));
  const feed = 0.72 + amount * 0.12;
  const wet = amount * 0.38;
  for (let i = 0; i < out.length; i += 1) {
    const dry = out[i];
    let sum = 0;
    for (const comb of combs) {
      const back = comb.line[comb.at];
      comb.line[comb.at] = dry + back * feed;
      comb.at = (comb.at + 1) % comb.line.length;
      sum += back;
    }
    let smear = sum / combs.length;
    for (const pass of passes) {
      const back = pass.line[pass.at];
      const into = smear + back * 0.5;
      pass.line[pass.at] = into;
      pass.at = (pass.at + 1) % pass.line.length;
      smear = back - into * 0.5;
    }
    out[i] = dry * (1 - wet * 0.5) + smear * wet;
  }
}

/**
 * The whole part, as samples.
 *
 * `seconds` is how long the result should be — normally the length of the
 * take it came from, so the part lines up with everything else recorded
 * against the same click. A tail is added for the last note's decay, because
 * a part that ends exactly on its last note ends with a click.
 */
export function renderHum(
  notes: readonly Played[],
  voice: Voice,
  seconds?: number,
  /* The session's rate, when there is one. A part rendered at 44,100 and
     dropped into a desk running at 48,000 plays a semitone and a bit flat,
     which is the kind of wrong that sounds like the pitch detection failing
     rather than like a resampling bug. */
  rate: number = RATE,
  /* How she has set it after hearing it. Left out, it is the instrument's
     own row, exactly as before the dials. */
  tweak: Tweak = PLAIN,
): Float32Array {
  const last = notes.reduce((most, one) => Math.max(most, one.to), 0);
  const total = Math.max(seconds ?? 0, last) + 0.4 + tweak.room * 1.2;
  const out = new Float32Array(Math.max(1, Math.round(total * rate)));
  /* In a take that is mostly SUNG, a note with no pitch is a breath, a
     consonant or a lip smack — and a pitched instrument used to play every
     one of them as a middle C. In a take that is mostly tapped, the taps
     are the rhythm she meant, and they are played as before. */
  const sung = notes.filter((one) => one.midi !== null).length;
  const skipUnpitched = voice.pitched && sung > 0 && sung * 2 >= notes.length;
  for (const note of notes) {
    if (skipUnpitched && note.midi === null) continue;
    play(out, voice, note, rate, tweak);
  }
  if (tweak.room > 0) roomAround(out, rate, tweak.room);

  /* Soft clipping rather than hard, the same as `renderSketch` does: notes
     that overlap sum past 1, and a hard clip on a sine is a buzz. */
  for (let i = 0; i < out.length; i += 1) out[i] = Math.tanh(out[i] * 1.1) * 0.85;
  return out;
}
