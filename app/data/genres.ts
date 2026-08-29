/**
 * The soundboard: every genre, with something to listen to.
 *
 * This used to be its own screen behind its own button, which put the sound of
 * a genre in one place and the field where you name it in another. It is a
 * reference for writing a style line, so it belongs where style lines are
 * written — inside making a song — and that is where it is now.
 *
 * Each entry carries a `promptSnippet`, which is the actual text that goes into
 * the style field. That is the point of the whole list: hearing "melodic
 * techno" is only useful if the words that produce it come with it.
 */

export interface GenreSample {
  category: string;
  name: string;
  subgenre: string;
  bpm: string;
  key: string;
  /** An example of the genre, hosted elsewhere — not this app's own output. */
  audioUrl: string;
  /** The words this drops into the style field. The reason the list exists. */
  promptSnippet: string;
  description: string;
}

export const GENRE_SAMPLES: readonly GenreSample[] = [
  // 1. Electronic & EDM
  {
    category: 'Electronic & EDM',
    name: 'Melodic Techno & Afterlife Sound',
    subgenre: 'Dark, hypnotic, built for a big room',
    bpm: '124 BPM',
    key: 'D Minor',
    audioUrl: 'https://assets.mixkit.co/music/preview/mixkit-tech-house-vibes-130.mp3',
    promptSnippet: 'melodic techno, deep hypnotic rolling sub-bass, atmospheric ethereal synth leads, dark emotional drops, 124 bpm, D minor',
    description: 'Hypnotic rolling bass with stadium synth leads. Ideal for dark visuals, cyber cities, and emotional visual climaxes.'
  },
  {
    category: 'Electronic & EDM',
    name: 'Deep Tech House',
    subgenre: 'Stripped-back club, all groove',
    bpm: '126 BPM',
    key: 'G Minor',
    audioUrl: 'https://assets.mixkit.co/music/preview/mixkit-tech-house-vibes-130.mp3',
    promptSnippet: 'deep tech house, punchy four-on-the-floor kick, bouncy sub-bassline, filtered vocal chops, crisp hi-hats, 126 bpm',
    description: 'Energetic club beat with bouncing basslines and infectious rhythm.'
  },
  {
    category: 'Electronic & EDM',
    name: 'Liquid Drum & Bass',
    subgenre: 'Atmospheric DnB',
    bpm: '174 BPM',
    key: 'F Major',
    audioUrl: 'https://assets.mixkit.co/music/preview/mixkit-hip-hop-02-738.mp3',
    promptSnippet: 'liquid drum and bass, fast rolling breakbeats, lush Rhodes chords, warm 808 reese bass, emotive vocal textures, 174 bpm',
    description: 'High-speed rolling percussion with super smooth, soulful ambient pads.'
  },

  // 2. Pop & Synthpop
  {
    category: 'Pop & Synthpop',
    name: '80s Retro Synthwave Pop',
    subgenre: 'Neon 80s, gated snare, big chorus',
    bpm: '130 BPM',
    key: 'C Minor',
    audioUrl: 'https://assets.mixkit.co/music/preview/mixkit-tech-house-vibes-130.mp3',
    promptSnippet: '80s synthpop, retro analog synthesizers, gated reverb snare, catchy anthemic vocal melody, driving bassline, 130 bpm',
    description: 'Nostalgic 1980s neon anthems with driving drums and sparkling analog synths.'
  },
  {
    category: 'Pop & Synthpop',
    name: 'Modern Hyperpop & Glitch',
    subgenre: 'Futuristic Cyber Pop',
    bpm: '145 BPM',
    key: 'A Major',
    audioUrl: 'https://assets.mixkit.co/music/preview/mixkit-sleepy-cat-135.mp3',
    promptSnippet: 'hyperpop, pitched vocal hooks, distorted 808s, bright candy synths, glitch transitions, maximalist energy, 145 bpm',
    description: 'High-energy, glossy futuristic pop with playful glitch effects and pitched vocals.'
  },

  // 3. Rock & Metal
  {
    category: 'Rock & Metal',
    name: 'Modern Alternative Rock',
    subgenre: 'Post-Grunge / Stadium Rock',
    bpm: '120 BPM',
    key: 'E Minor',
    audioUrl: 'https://assets.mixkit.co/music/preview/mixkit-hip-hop-02-738.mp3',
    promptSnippet: 'alternative rock, layered distorted electric guitars, driving live drums, soaring passionate male/female vocals, anthemic chorus, 120 bpm',
    description: 'Raw guitar riffs, heavy acoustic drums, and emotionally charged vocals.'
  },
  {
    category: 'Rock & Metal',
    name: 'Cinematic Nu-Metal & Djent',
    subgenre: 'Heavy riffs against clean electronics',
    bpm: '135 BPM',
    key: 'Drop D',
    audioUrl: 'https://assets.mixkit.co/music/preview/mixkit-tech-house-vibes-130.mp3',
    promptSnippet: 'cinematic nu-metal, down-tuned 7-string heavy djent guitar riffs, aggressive synth pads, hybrid electronic rock drums, drop D, 135 bpm',
    description: 'Thunderous low-tuned heavy riffs fused with electronic synth textures.'
  },

  // 4. Hip-Hop & Trap
  {
    category: 'Hip-Hop & Trap',
    name: 'Dark Cinematic Drill & Trap',
    subgenre: 'Sliding 808s, sparse and menacing',
    bpm: '140 BPM',
    key: 'C# Minor',
    audioUrl: 'https://assets.mixkit.co/music/preview/mixkit-hip-hop-02-738.mp3',
    promptSnippet: 'dark cinematic trap, sliding 808 bass, stuttering hi-hats, ominous piano melody, vocal chants, hard-hitting kick, 140 bpm',
    description: 'Sliding bass glides, crisp rapid-fire hats, and dramatic minor-key pianos.'
  },
  {
    category: 'Hip-Hop & Trap',
    name: '90s Golden Era Boom-Bap',
    subgenre: 'Vinyl Sampled East Coast',
    bpm: '90 BPM',
    key: 'E Minor',
    audioUrl: 'https://assets.mixkit.co/music/preview/mixkit-hip-hop-02-738.mp3',
    promptSnippet: '90s boom-bap hip-hop, dusty vinyl jazz piano sample, punchy acoustic drum breaks, upright bassline, classic street vibe, 90 bpm',
    description: 'Authentic 90s vintage drum chops with soulful sampled jazz harmonies.'
  },

  // 5. R&B & Neo-Soul
  {
    category: 'R&B & Soul',
    name: 'Contemporary Midnight R&B',
    subgenre: 'Hazy, intimate, unhurried',
    bpm: '85 BPM',
    key: 'Bb Minor',
    audioUrl: 'https://assets.mixkit.co/music/preview/mixkit-sleepy-cat-135.mp3',
    promptSnippet: 'contemporary R&B, sultry smooth vocal harmonies, warm tape electric piano, laid-back trap drums, deep sub-bass, 85 bpm',
    description: 'Intimate, late-night acoustic soul with rich vocal harmonies and sub-bass.'
  },

  // 6. Country & Folk
  {
    category: 'Country & Folk',
    name: 'Modern Country Anthem & Pop',
    subgenre: 'Country with a modern low end',
    bpm: '104 BPM',
    key: 'G Major',
    audioUrl: 'https://assets.mixkit.co/music/preview/mixkit-sleepy-cat-135.mp3',
    promptSnippet: 'modern country pop, acoustic guitar strums, pedal steel guitar swells, twangy electric lead guitar, punchy drums, raspy storytelling vocals, 104 bpm',
    description: 'Heartfelt storytelling, acoustic guitars, pedal steel swells, and anthemic choruses.'
  },
  {
    category: 'Country & Folk',
    name: 'Dark Indie Folk & Americana',
    subgenre: 'Close-mic folk, room and harmony',
    bpm: '78 BPM',
    key: 'D Major',
    audioUrl: 'https://assets.mixkit.co/music/preview/mixkit-sleepy-cat-135.mp3',
    promptSnippet: 'indie folk, fingerpicked acoustic guitar, mournful cello, layered choral vocal harmonies, foot stomps, intimate warm mix, 78 bpm',
    description: 'Intimate acoustic fingerpicking, delicate strings, and rich choral harmonies.'
  },

  // 7. Cyberpunk & Darksynth
  {
    category: 'Cyberpunk & Darksynth',
    name: 'Industrial Cyberpunk 2077',
    subgenre: 'Midtempo / Aggressive Cyber Bass',
    bpm: '105 BPM',
    key: 'F Minor',
    audioUrl: 'https://assets.mixkit.co/music/preview/mixkit-tech-house-vibes-130.mp3',
    promptSnippet: 'industrial cyberpunk, distorted sawtooth bass, metallic percussion hits, dystopian sci-fi sirens, aggressive midtempo beat, 105 bpm',
    description: 'High-octane dystopian combat beats with raw distorted synth energy.'
  },

  // 8. Cinematic & Orchestral
  {
    category: 'Cinematic & Orchestral',
    name: 'Epic Hans Zimmer Hybrid Score',
    subgenre: 'Blockbuster Film Trailer',
    bpm: '90 BPM',
    key: 'D Minor',
    audioUrl: 'https://assets.mixkit.co/music/preview/mixkit-sleepy-cat-135.mp3',
    promptSnippet: 'epic cinematic hybrid, massive brass horns, staccato violins, thunderous taiko drums, sub-bass braam, emotional choir crescendo, 90 bpm',
    description: 'Colossal orchestral instruments with ground-shaking brass and percussion.'
  },

  // 9. Lo-Fi & Ambient
  {
    category: 'Lo-Fi & Ambient',
    name: 'Lo-Fi Chillhop Study Beats',
    subgenre: 'Relaxed Cafe Vibes',
    bpm: '78 BPM',
    key: 'C Major',
    audioUrl: 'https://assets.mixkit.co/music/preview/mixkit-hip-hop-02-738.mp3',
    promptSnippet: 'lo-fi chillhop, vinyl crackle, warm Rhodes piano, relaxed boom-bap drum loop, mellow acoustic guitar, cozy rainy day atmosphere, 78 bpm',
    description: 'Cozy tape-saturated beats designed for deep learning, focus, and coding.'
  },

  // 10. Afrobeats & Latin
  {
    category: 'Afrobeats & Latin',
    name: 'Afro-Fusion & Amapiano',
    subgenre: 'Afrobeats, log drum, sung hooks',
    bpm: '112 BPM',
    key: 'A Minor',
    audioUrl: 'https://assets.mixkit.co/music/preview/mixkit-tech-house-vibes-130.mp3',
    promptSnippet: 'afrobeats fusion, log drum bassline, infectious shaker percussions, warm saxophone riffs, uplifting melodic vocal chants, 112 bpm',
    description: 'Vibrant African percussions with deep log-drums and uplifting melodies.'
  }
];


/** The pills above the list, in the order they are shown. */
export const GENRE_CATEGORIES = [
  'All', 'Electronic & EDM', 'Pop & Synthpop', 'Rock & Metal', 'Hip-Hop & Trap',
  'R&B & Soul', 'Country & Folk', 'Cyberpunk & Darksynth', 'Cinematic & Orchestral',
  'Lo-Fi & Ambient', 'Afrobeats & Latin',
] as const;
