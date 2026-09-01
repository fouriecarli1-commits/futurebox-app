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
 *
 * There was an `audioUrl` here and it is gone. Seventeen genres pointed at
 * three mp3s on somebody else's CDN — so half the list was mislabelled even
 * when it worked, and when the host stopped answering every button went silent
 * at once with nothing on screen to say why. The sound is drawn from `bpm`,
 * `key` and `category` now (app/lib/preview.ts), which cannot be wrong about
 * which genre it is and cannot be taken away.
 */

export interface GenreSample {
  category: string;
  name: string;
  subgenre: string;
  bpm: string;
  key: string;
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
    promptSnippet: 'melodic techno, deep hypnotic rolling sub-bass, atmospheric ethereal synth leads, dark emotional drops, 124 bpm, D minor',
    description: 'Hypnotic rolling bass with stadium synth leads. Ideal for dark visuals, cyber cities, and emotional visual climaxes.'
  },
  {
    category: 'Electronic & EDM',
    name: 'Deep Tech House',
    subgenre: 'Stripped-back club, all groove',
    bpm: '126 BPM',
    key: 'G Minor',
    promptSnippet: 'deep tech house, punchy four-on-the-floor kick, bouncy sub-bassline, filtered vocal chops, crisp hi-hats, 126 bpm',
    description: 'Energetic club beat with bouncing basslines and infectious rhythm.'
  },
  {
    category: 'Electronic & EDM',
    name: 'Liquid Drum & Bass',
    subgenre: 'Atmospheric DnB',
    bpm: '174 BPM',
    key: 'F Major',
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
    promptSnippet: '80s synthpop, retro analog synthesizers, gated reverb snare, catchy anthemic vocal melody, driving bassline, 130 bpm',
    description: 'Nostalgic 1980s neon anthems with driving drums and sparkling analog synths.'
  },
  {
    category: 'Pop & Synthpop',
    name: 'Modern Hyperpop & Glitch',
    subgenre: 'Futuristic Cyber Pop',
    bpm: '145 BPM',
    key: 'A Major',
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
    promptSnippet: 'alternative rock, layered distorted electric guitars, driving live drums, soaring passionate male/female vocals, anthemic chorus, 120 bpm',
    description: 'Raw guitar riffs, heavy acoustic drums, and emotionally charged vocals.'
  },
  {
    category: 'Rock & Metal',
    name: 'Cinematic Nu-Metal & Djent',
    subgenre: 'Heavy riffs against clean electronics',
    bpm: '135 BPM',
    key: 'Drop D',
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
    promptSnippet: 'dark cinematic trap, sliding 808 bass, stuttering hi-hats, ominous piano melody, vocal chants, hard-hitting kick, 140 bpm',
    description: 'Sliding bass glides, crisp rapid-fire hats, and dramatic minor-key pianos.'
  },
  {
    category: 'Hip-Hop & Trap',
    name: '90s Golden Era Boom-Bap',
    subgenre: 'Vinyl Sampled East Coast',
    bpm: '90 BPM',
    key: 'E Minor',
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
    promptSnippet: 'modern country pop, acoustic guitar strums, pedal steel guitar swells, twangy electric lead guitar, punchy drums, raspy storytelling vocals, 104 bpm',
    description: 'Heartfelt storytelling, acoustic guitars, pedal steel swells, and anthemic choruses.'
  },
  {
    category: 'Country & Folk',
    name: 'Dark Indie Folk & Americana',
    subgenre: 'Close-mic folk, room and harmony',
    bpm: '78 BPM',
    key: 'D Major',
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
    promptSnippet: 'afrobeats fusion, log drum bassline, infectious shaker percussions, warm saxophone riffs, uplifting melodic vocal chants, 112 bpm',
    description: 'Vibrant African percussions with deep log-drums and uplifting melodies.'
  },
  {
    category: 'Amapiano & SA House',
    name: 'Amapiano',
    subgenre: 'Log drum, wide space, patient',
    bpm: '112 BPM',
    key: 'A Minor',
    promptSnippet: 'amapiano, deep log drum bassline, airy shakers, soft rhodes chords, spacious mix, 112 bpm, A minor',
    description: 'The log drum does the talking. Everything else leaves it room.',
  },
  {
    category: 'Amapiano & SA House',
    name: 'Private School Piano',
    subgenre: 'Jazzier, busier chords',
    bpm: '110 BPM',
    key: 'F Minor',
    promptSnippet: 'private school amapiano, jazzy rhodes chords, intricate percussion, melodic log drum, live feel, 110 bpm, F minor',
    description: 'Amapiano with a jazz harmony habit — more chords, more movement.',
  },
  {
    category: 'Amapiano & SA House',
    name: 'Afro Tech',
    subgenre: 'Harder, straighter, for late',
    bpm: '118 BPM',
    key: 'F Minor',
    promptSnippet: 'afro tech, driving four-on-the-floor, tribal percussion, hypnotic bassline, minimal vocal chops, 118 bpm, F minor',
    description: 'When the room has stopped talking and started moving.',
  },
  {
    category: 'Amapiano & SA House',
    name: 'Soulful House',
    subgenre: 'Warm chords and a real vocal',
    bpm: '120 BPM',
    key: 'C Minor',
    promptSnippet: 'soulful house, warm rhodes chords, gospel-tinged vocal, rolling bassline, live percussion, 120 bpm, C minor',
    description: 'House that would rather move you than move you around.',
  },
  {
    category: 'Gqom & Kwaito',
    name: 'Gqom',
    subgenre: 'Broken kick, dark, physical',
    bpm: '130 BPM',
    key: 'E Minor',
    promptSnippet: 'gqom, broken hard-hitting kick pattern, dark minimal synths, chanted vocal, heavy sub, 130 bpm, E minor',
    description: 'Durban. The kick refuses to land where you expect it.',
  },
  {
    category: 'Gqom & Kwaito',
    name: 'Kwaito',
    subgenre: 'Slow, heavy, unmistakably here',
    bpm: '100 BPM',
    key: 'A Minor',
    promptSnippet: 'kwaito, slow heavy groove, deep bassline, spoken-sung vocal, township house feel, 100 bpm, A minor',
    description: 'House slowed to a walk, and it walks like it owns the street.',
  },
  {
    category: 'Gqom & Kwaito',
    name: 'Bacardi House',
    subgenre: 'Fast, playful, Pretoria',
    bpm: '128 BPM',
    key: 'D Minor',
    promptSnippet: 'bacardi house, fast bouncy kick, playful synth stabs, call-and-response vocal, 128 bpm, D minor',
    description: 'Pretoria’s own — quick, cheeky and built to be danced badly to.',
  },
  {
    category: 'House & Garage',
    name: 'Deep House',
    subgenre: 'Soft, late, endless',
    bpm: '122 BPM',
    key: 'F Minor',
    promptSnippet: 'deep house, warm sub bass, muted chords, brushed hats, understated vocal, 122 bpm, F minor',
    description: 'The one that never quite arrives, on purpose.',
  },
  {
    category: 'House & Garage',
    name: 'UK Garage',
    subgenre: 'Shuffled and skipping',
    bpm: '134 BPM',
    key: 'G Minor',
    promptSnippet: 'uk garage, shuffled two-step drums, chopped vocal, warm sub bass, organ stabs, 134 bpm, G minor',
    description: 'The drums trip over themselves and it is the whole point.',
  },
  {
    category: 'House & Garage',
    name: 'Tech House',
    subgenre: 'Tight, dry, functional',
    bpm: '126 BPM',
    key: 'A Minor',
    promptSnippet: 'tech house, tight dry drums, rolling bassline, minimal vocal snippet, club-ready, 126 bpm, A minor',
    description: 'Built for a floor, not for headphones.',
  },
  {
    category: 'House & Garage',
    name: 'Disco House',
    subgenre: 'Filtered loops and joy',
    bpm: '120 BPM',
    key: 'C Major',
    promptSnippet: 'disco house, filtered string loop, four-on-the-floor kick, funk bass, hand claps, 120 bpm, C major',
    description: 'A disco record put through a filter and made to run laps.',
  },
  {
    category: 'Drum & Bass',
    name: 'Liquid Drum & Bass',
    subgenre: 'Fast drums, soft everything else',
    bpm: '174 BPM',
    key: 'D Minor',
    promptSnippet: 'liquid drum and bass, rolling breaks, warm sub bass, lush pads, soulful vocal, 174 bpm, D minor',
    description: 'The drums sprint; the music strolls.',
  },
  {
    category: 'Drum & Bass',
    name: 'Jungle',
    subgenre: 'Chopped breaks, heavy sub',
    bpm: '170 BPM',
    key: 'E Minor',
    promptSnippet: 'jungle, chopped breakbeats, deep reggae sub bass, ragga vocal sample, 170 bpm, E minor',
    description: 'Breakbeats cut to pieces and put back wrong on purpose.',
  },
  {
    category: 'Drum & Bass',
    name: 'Neurofunk',
    subgenre: 'Mechanical and mean',
    bpm: '174 BPM',
    key: 'F Minor',
    promptSnippet: 'neurofunk drum and bass, growling modulated bass, precise technical drums, dark atmosphere, 174 bpm, F minor',
    description: 'Bass that sounds like machinery arguing.',
  },
  {
    category: 'Reggae & Dub',
    name: 'Roots Reggae',
    subgenre: 'The off-beat, and space',
    bpm: '76 BPM',
    key: 'A Minor',
    promptSnippet: 'roots reggae, one-drop drums, off-beat guitar skank, deep melodic bassline, organ bubble, 76 bpm, A minor',
    description: 'Everything hangs off the beat that is not there.',
  },
  {
    category: 'Reggae & Dub',
    name: 'Dub',
    subgenre: 'Reverb as an instrument',
    bpm: '72 BPM',
    key: 'D Minor',
    promptSnippet: 'dub, heavy bassline, sparse drums drenched in reverb and delay, melodica, tape echo, 72 bpm, D minor',
    description: 'The mixing desk plays the solo.',
  },
  {
    category: 'Reggae & Dub',
    name: 'Dancehall',
    subgenre: 'Digital riddim, forward lean',
    bpm: '96 BPM',
    key: 'G Minor',
    promptSnippet: 'dancehall, digital riddim, syncopated kick and snare, sub bass, patois vocal, 96 bpm, G minor',
    description: 'Reggae’s faster, harder cousin.',
  },
  {
    category: 'Jazz & Blues',
    name: 'Jazz Trio',
    subgenre: 'Piano, bass, brushes',
    bpm: '120 BPM',
    key: 'F Major',
    promptSnippet: 'jazz trio, walking upright bass, brushed drums, piano comping, live room sound, 120 bpm, F major',
    description: 'Three people listening to each other.',
  },
  {
    category: 'Jazz & Blues',
    name: 'Cape Jazz',
    subgenre: 'Local, warm, singing',
    bpm: '108 BPM',
    key: 'C Major',
    promptSnippet: 'cape jazz, warm horn melody, marabi-influenced piano, gentle swing, upright bass, 108 bpm, C major',
    description: 'A South African jazz accent — goema underneath, a melody you can hum.',
  },
  {
    category: 'Jazz & Blues',
    name: 'Slow Blues',
    subgenre: 'Twelve bars, no hurry',
    bpm: '68 BPM',
    key: 'E Minor',
    promptSnippet: 'slow blues, twelve-bar form, bent guitar notes, brushed drums, hammond organ, 68 bpm, E minor',
    description: 'Three chords and the truth, taken slowly.',
  },
  {
    category: 'Jazz & Blues',
    name: 'Nu Jazz',
    subgenre: 'Jazz that met a sampler',
    bpm: '96 BPM',
    key: 'D Minor',
    promptSnippet: 'nu jazz, live drums with electronic textures, rhodes chords, upright bass, sampled horns, 96 bpm, D minor',
    description: 'A jazz band that grew up on hip-hop.',
  },
  {
    category: 'Gospel & Choral',
    name: 'Gospel Choir',
    subgenre: 'Voices, and a room to hold them',
    bpm: '78 BPM',
    key: 'C Major',
    promptSnippet: 'gospel choir, full four-part harmony, hammond organ, live drums, building arrangement, 78 bpm, C major',
    description: 'Written to be sung by more people than fit on a stage.',
  },
  {
    category: 'Gospel & Choral',
    name: 'Worship Ballad',
    subgenre: 'Slow, open, sincere',
    bpm: '72 BPM',
    key: 'G Major',
    promptSnippet: 'worship ballad, piano and pad foundation, soft build, lead vocal with harmonies, 72 bpm, G major',
    description: 'Room to breathe between the lines.',
  },
  {
    category: 'Gospel & Choral',
    name: 'Afro Gospel',
    subgenre: 'Gospel with a local pulse',
    bpm: '96 BPM',
    key: 'A Minor',
    promptSnippet: 'afro gospel, layered african harmonies, percussive groove, call and response, organ, 96 bpm, A minor',
    description: 'The choir and the drums arrive together.',
  },
  {
    category: 'Punk & Hardcore',
    name: 'Punk Rock',
    subgenre: 'Three chords, fast, done',
    bpm: '176 BPM',
    key: 'E Minor',
    promptSnippet: 'punk rock, driving downstroke guitars, fast snare, shouted vocal, no polish, 176 bpm, E minor',
    description: 'In and out before anybody gets comfortable.',
  },
  {
    category: 'Punk & Hardcore',
    name: 'Pop Punk',
    subgenre: 'Fast, but with a chorus',
    bpm: '168 BPM',
    key: 'D Major',
    promptSnippet: 'pop punk, bright distorted guitars, big melodic chorus, driving drums, 168 bpm, D major',
    description: 'The hook is the point; the speed is the delivery.',
  },
  {
    category: 'Punk & Hardcore',
    name: 'Hardcore',
    subgenre: 'Louder, angrier, shorter',
    bpm: '190 BPM',
    key: 'A Minor',
    promptSnippet: 'hardcore punk, relentless drums, aggressive shouted vocal, heavy downstrokes, 190 bpm, A minor',
    description: 'A minute and a half, and it means it.',
  },
  {
    category: 'Classical & Piano',
    name: 'Solo Piano',
    subgenre: 'One instrument, nothing hidden',
    bpm: '72 BPM',
    key: 'C Minor',
    promptSnippet: 'solo piano, expressive dynamics, sustain pedal, intimate close recording, 72 bpm, C minor',
    description: 'Nowhere for a mistake to hide.',
  },
  {
    category: 'Classical & Piano',
    name: 'String Quartet',
    subgenre: 'Four voices, formal',
    bpm: '96 BPM',
    key: 'D Minor',
    promptSnippet: 'string quartet, two violins viola and cello, counterpoint, chamber recording, 96 bpm, D minor',
    description: 'Four instruments behaving like one argument.',
  },
  {
    category: 'Classical & Piano',
    name: 'Neoclassical',
    subgenre: 'Old instruments, new patience',
    bpm: '68 BPM',
    key: 'A Minor',
    promptSnippet: 'neoclassical, piano with sustained strings, minimal repeating motif, felt and tape texture, 68 bpm, A minor',
    description: 'Classical instruments used the way an ambient record uses them.',
  },
  {
    category: 'Traditional & World',
    name: 'Maskandi',
    subgenre: 'Zulu guitar, and a story',
    bpm: '112 BPM',
    key: 'G Major',
    promptSnippet: 'maskandi, picked zulu guitar, concertina, spoken praise vocal, walking bass, 112 bpm, G major',
    description: 'A guitar style that talks. The words matter as much as the picking.',
  },
  {
    category: 'Traditional & World',
    name: 'Mbaqanga',
    subgenre: 'Township jive, bright and busy',
    bpm: '132 BPM',
    key: 'C Major',
    promptSnippet: 'mbaqanga, bright electric guitar lines, walking bass, groaning bass vocal, township jive drums, 132 bpm, C major',
    description: 'The sound of a Johannesburg dance hall that never stopped.',
  },
  {
    category: 'Traditional & World',
    name: 'Isicathamiya',
    subgenre: 'Voices only, and softly',
    bpm: '60 BPM',
    key: 'F Major',
    promptSnippet: 'isicathamiya, unaccompanied male choral harmony, soft dynamics, call and response, 60 bpm, F major',
    description: 'Sung quietly on purpose — it was music made not to wake anyone.',
  },
  {
    category: 'Traditional & World',
    name: 'Boeremusiek',
    subgenre: 'Concertina and a two-step',
    bpm: '132 BPM',
    key: 'G Major',
    promptSnippet: 'boeremusiek, concertina lead, guitar and bass accompaniment, steady two-step rhythm, 132 bpm, G major',
    description: 'Made to be danced to on a wooden floor.',
  },
  {
    category: 'Traditional & World',
    name: 'Afro Folk',
    subgenre: 'Acoustic, communal, warm',
    bpm: '92 BPM',
    key: 'D Major',
    promptSnippet: 'afro folk, acoustic guitar, layered group vocals, hand percussion, warm and communal, 92 bpm, D major',
    description: 'Songs that assume other people will join in.',
  },
  {
    category: 'Funk & Disco',
    name: 'Funk',
    subgenre: 'The one, and the space after it',
    bpm: '104 BPM',
    key: 'E Minor',
    promptSnippet: 'funk, tight syncopated bass, clipped rhythm guitar, horn stabs, drums on the one, 104 bpm, E minor',
    description: 'Everything lands on the one so it can leave the rest alone.',
  },
  {
    category: 'Funk & Disco',
    name: 'Disco',
    subgenre: 'Strings, four-on-the-floor, joy',
    bpm: '118 BPM',
    key: 'A Minor',
    promptSnippet: 'disco, four-on-the-floor kick, octave bassline, string section, open hi-hats, 118 bpm, A minor',
    description: 'Unapologetically for dancing.',
  },
  {
    category: 'Funk & Disco',
    name: 'Bubblegum',
    subgenre: 'Eighties SA pop-funk',
    bpm: '116 BPM',
    key: 'C Major',
    promptSnippet: 'bubblegum pop, bright synth stabs, slap bass, drum machine, cheerful vocal hook, 116 bpm, C major',
    description: 'South Africa in the eighties, on a synthesiser and delighted about it.',
  },
  {
    category: 'Children & Learning',
    name: 'Children’s Song',
    subgenre: 'Simple, singable, kind',
    bpm: '108 BPM',
    key: 'C Major',
    promptSnippet: 'children’s song, simple repeating melody, bright acoustic and light percussion, clear friendly vocal, 108 bpm, C major',
    description: 'Short lines, easy notes, and a tune a child can hold on to.',
  },
  {
    category: 'Children & Learning',
    name: 'Learning Rhyme',
    subgenre: 'A fact you can sing',
    bpm: '100 BPM',
    key: 'G Major',
    promptSnippet: 'educational rhyme, steady sing-along rhythm, call and response, clear diction, light instrumentation, 100 bpm, G major',
    description: 'Built so the words survive the tune.',
  },
  {
    category: 'Children & Learning',
    name: 'Lullaby',
    subgenre: 'Slow, soft, ending',
    bpm: '60 BPM',
    key: 'F Major',
    promptSnippet: 'lullaby, gentle music box and soft pad, slow rocking rhythm, quiet warm vocal, 60 bpm, F major',
    description: 'Written to finish, not to build.',
  },
  {
    category: 'Hip-Hop & Trap',
    name: 'Boom Bap',
    subgenre: 'Dusty drums, head-nod',
    bpm: '90 BPM',
    key: 'D Minor',
    promptSnippet: 'boom bap hip-hop, dusty sampled drums, upright bass, vinyl crackle, jazzy loop, 90 bpm, D minor',
    description: 'A sampler, a crate of records, and patience.',
  },
  {
    category: 'Hip-Hop & Trap',
    name: 'Drill',
    subgenre: 'Sliding bass, cold',
    bpm: '142 BPM',
    key: 'F Minor',
    promptSnippet: 'drill, sliding 808 bass, sparse dark melody, rapid hi-hat rolls, cold atmosphere, 142 bpm, F minor',
    description: 'Menace built out of very little.',
  },
  {
    category: 'R&B & Soul',
    name: 'Neo Soul',
    subgenre: 'Loose, warm, unhurried',
    bpm: '82 BPM',
    key: 'E Minor',
    promptSnippet: 'neo soul, rhodes chords, laid-back drums behind the beat, warm bass, layered vocal harmonies, 82 bpm, E minor',
    description: 'Plays slightly late on purpose, and it feels like a shrug.',
  },
  {
    category: 'Lo-Fi & Ambient',
    name: 'Lo-Fi Beats',
    subgenre: 'Warm, dusty, for working',
    bpm: '78 BPM',
    key: 'A Minor',
    promptSnippet: 'lo-fi hip-hop, dusty drum loop, warm rhodes, vinyl noise, tape wobble, 78 bpm, A minor',
    description: 'Made to sit behind something else you are doing.',
  },
  {
    category: 'Lo-Fi & Ambient',
    name: 'Ambient',
    subgenre: 'No beat, only air',
    bpm: '60 BPM',
    key: 'C Major',
    promptSnippet: 'ambient, slow evolving pads, no drums, distant textures, long reverb tails, 60 bpm, C major',
    description: 'Closer to weather than to a song.',
  },
  {
    category: 'Cinematic & Orchestral',
    name: 'Epic Trailer',
    subgenre: 'Big, and getting bigger',
    bpm: '90 BPM',
    key: 'D Minor',
    promptSnippet: 'epic trailer music, huge percussion hits, rising strings, brass swells, choir, 90 bpm, D minor',
    description: 'Written to make two minutes feel like a decision.',
  },
  {
    category: 'Rock & Metal',
    name: 'Indie Rock',
    subgenre: 'Guitars, and a room',
    bpm: '138 BPM',
    key: 'G Major',
    promptSnippet: 'indie rock, jangly electric guitars, live drums, melodic bass, honest vocal, 138 bpm, G major',
    description: 'Four people in a room who rehearsed enough.',
  }
];


/** The pills above the list, in the order they are shown. */
export const GENRE_CATEGORIES = [
  'All',
  // The local ones first. This app is made in South Africa and its shelf used
  // to open with melodic techno and not contain amapiano at all.
  'Amapiano & SA House', 'Gqom & Kwaito', 'Traditional & World',
  'Electronic & EDM', 'House & Garage', 'Drum & Bass', 'Pop & Synthpop',
  'Rock & Metal', 'Punk & Hardcore', 'Hip-Hop & Trap', 'R&B & Soul',
  'Funk & Disco', 'Reggae & Dub', 'Jazz & Blues', 'Gospel & Choral',
  'Country & Folk', 'Cyberpunk & Darksynth', 'Cinematic & Orchestral',
  'Classical & Piano', 'Lo-Fi & Ambient', 'Afrobeats & Latin',
  'Children & Learning',
] as const;
