/**
 * What each room in the studio is for.
 *
 * The copilot used to know one thing: the song canvas. It sat beside every
 * screen and could only ever see a title, a style and a lyric sheet — so
 * standing in the Booth with a take recorded, it still answered as though you
 * were writing a song. This file is what fixes that. It is the single place
 * that says what a room is, what can be changed in it, and what to suggest to
 * somebody who has just walked in.
 *
 * One registry, three consumers, so they cannot drift apart:
 *   - the copilot panel reads `seeds` for its starters
 *   - the copilot route reads `purpose` and `can` to build its context
 *   - the studio reads the ids to decide where the copilot may send somebody
 *
 * Adding a room means adding an entry here. If you add one and forget, the
 * copilot will say it does not know that screen rather than guessing — which is
 * the failure we want, because it is the one somebody notices.
 */

/**
 * The stages of the work. The rail used to be eleven equal-weight rows, which
 * is a menu rather than a path: nothing on it said that the Booth comes after a
 * song exists, or that a channel is for songs that are finished. Three stages
 * and one standing room say it without a word of instruction.
 */
export const STAGES = [
  { id: "make", en: "Make it", af: "Maak dit" },
  { id: "show", en: "Show it", af: "Wys dit" },
  { id: "release", en: "Put it out", af: "Sit dit uit" },
  { id: "sell", en: "Sell it", af: "Verkoop dit" },
] as const;

export type StageId = (typeof STAGES)[number]["id"];

/** The rooms, in rail order. */
export const SURFACE_IDS = [
  "make",
  "studio",
  "booth",
  "video",
  "canvas",
  "hooks_feed",
  "channels",
  "collab",
  "live",
  "voice_studio",
  "sound",
  "podcast",
  "campaign",
] as const;

export type SurfaceId = (typeof SURFACE_IDS)[number];

export interface Surface {
  readonly id: SurfaceId;
  /**
   * Which stage of the work this room belongs to, or null for a room that
   * stands on its own. Collab is the only one: it is not a step in making a
   * record, it is who you make it with, and filing it under a stage would be
   * saying something untrue about when you do it.
   */
  readonly stage: StageId | null;
  /**
   * Where the work naturally goes after here, and what to call the move. This
   * is what "each step flows into the next" is made of: the studio used to have
   * exactly one hand-off, hard-coded, offering a music video after a song
   * landed. Every room now says where it leads, and the ones that are an end in
   * themselves say so by leaving this out.
   */
  readonly next?: {
    readonly to: SurfaceId;
    readonly en: string;
    readonly af: string;
  };
  /** What a person is doing here, in one line. Written for the copilot to read. */
  readonly purpose: string;
  /**
   * What the copilot offers *here*, said to the person before they type.
   *
   * `purpose` and `can` above are written for the model and are English only,
   * because that is the language the prompt is in. This one is read by a human
   * in their own language, which is why it is separate and why it is short.
   *
   * It exists because the panel used to open with one sentence on all thirteen
   * rooms — "I will set it up on the canvas" — which is wrong in most of them
   * and actively confusing in the podcast room, where there is no canvas. The
   * seeds under it were already per-room; only the line above them was not.
   */
  readonly helps: { readonly en: string; readonly af: string };
  /** What the copilot can actually change here. Nothing aspirational — only what the studio applies. */
  readonly can: readonly string[];
  /**
   * The operations this room accepts, and what the value means for each. These
   * are descriptions only: whether an operation is actually offered on a given
   * turn depends on the room having registered a handler for it, which the
   * panel reports live. A name here with nothing wired to it is never offered,
   * so the copilot cannot promise a move the studio will not make.
   */
  readonly ops?: Readonly<Record<string, string>>;
  /**
   * Three starters, shown before anything has been typed. They are the answer
   * to a blank panel, so they are specific: "make the chorus hit harder" is
   * worth a tap, "help me with my song" is not.
   */
  readonly seeds: readonly { readonly en: string; readonly af: string }[];
}

export const SURFACES: Readonly<Record<SurfaceId, Surface>> = {
  make: {
    id: "make",
    stage: "make",
    next: { to: "booth", en: "Sing on it yourself", af: "Sing self daarop" },
    purpose:
      "Making a song from nothing: a title, a style, the words, then the track itself.",
    helps: {
      en: "I can name it, pick how it should sound, write the words, or just answer a question about any of it.",
      af: "Ek kan dit ’n naam gee, kies hoe dit moet klink, die woorde skryf, of net ’n vraag daaroor antwoord.",
    },
    can: [
      "set the title",
      "set the style",
      "write or rewrite the words",
      "make the track",
    ],
    seeds: [
      {
        en: "Write me a chorus about leaving home",
        af: "Skryf vir my ’n koor oor weggaan van die huis af",
      },
      {
        en: "What style suits these words?",
        af: "Watter styl pas by hierdie woorde?",
      },
      {
        en: "Give me three titles for this",
        af: "Gee my drie titels hiervoor",
      },
    ],
  },
  studio: {
    id: "studio",
    stage: "make",
    next: { to: "video", en: "Put a video to it", af: "Sit ’n video daarby" },
    purpose:
      "Editing a song that already exists: its sections, its arrangement, its timing.",
    helps: {
      en: "I can rewrite a section, move them around, or set the style before you make it again.",
      af: "Ek kan ’n gedeelte oorskryf, hulle rondskuif, of die styl stel voordat jy dit weer maak.",
    },
    can: [
      "rewrite a section",
      "reorder or retitle sections",
      "set the style for a regenerate",
    ],
    ops: {
      pick_song:
        "the value is the title of one of their own songs, as they said it, to put on the timeline. Only songs that already have sections can be opened here",
    },
    seeds: [
      {
        en: "This second verse is weak — fix it",
        af: "Hierdie tweede vers is swak — maak dit reg",
      },
      { en: "Where should the bridge go?", af: "Waar moet die brug wees?" },
      { en: "Make the chorus hit harder", af: "Laat die koor harder tref" },
    ],
  },
  booth: {
    id: "booth",
    stage: "make",
    next: {
      to: "studio",
      en: "Take it to the timeline",
      af: "Vat dit na die tydlyn",
    },
    purpose:
      "Singing on your own track: recording takes over the backing, and lifting a vocal back out.",
    helps: {
      en: "I can tell you which take to keep, what to fix in it, and what to do next with the one you like.",
      af: "Ek kan jou sê watter opname om te hou, wat daaraan te regmaak, en wat om volgende te doen met die een waarvan jy hou.",
    },
    can: [
      "say which take to keep",
      "clean up a take",
      "write words to sing to",
    ],
    ops: {
      pick_song:
        "the value is the title of one of their own songs, as they said it, to sing over. This loads the backing, which takes a moment",
    },
    seeds: [
      {
        en: "Which of my takes is the best one?",
        af: "Watter een van my opnames is die beste?",
      },
      {
        en: "My timing is off — what do I do?",
        af: "My tydsberekening is uit — wat doen ek?",
      },
      {
        en: "Clean up the take I just did",
        af: "Maak die opname skoon wat ek nou gedoen het",
      },
    ],
  },
  video: {
    id: "video",
    stage: "show",
    next: {
      to: "hooks_feed",
      en: "Cut a short clip from it",
      af: "Sny ’n kort knipsel daaruit",
    },
    purpose: "Turning one of your songs into a music video.",
    helps: {
      en: "I can describe the video, set how long it runs, and choose the look it goes for.",
      af: "Ek kan die video beskryf, stel hoe lank dit loop, en die voorkoms kies waarvoor dit gaan.",
    },
    can: ["describe the video", "pick the length", "set the look"],
    ops: {
      pick_song:
        "the value is the title of one of their own songs, as they said it, to make a video for. It opens the panel; making the video is still their button",
      set_look:
        "the value is one of: performance, story, road, room, abstract. It fills the shot, the shape and the length with that way of working",
      set_shot:
        "the value is the full description of what is on screen: subject, what it is doing, the shot, the light, the mood. Never put anything in quotation marks here - quoted text is spoken aloud, and a voice over a song is two things fighting",
      set_shape: "the value is 9:16 or 16:9, and nothing else",
    },
    seeds: [
      {
        en: "What should this video look like?",
        af: "Hoe moet hierdie video lyk?",
      },
      {
        en: "Describe a video for my last song",
        af: "Beskryf ’n video vir my laaste snit",
      },
      { en: "How long should it be?", af: "Hoe lank moet dit wees?" },
    ],
  },
  canvas: {
    id: "canvas",
    stage: "show",
    next: {
      to: "channels",
      en: "Put it on your channel",
      af: "Sit dit op jou kanaal",
    },
    purpose:
      "The video desk: marketing, podcast and social clips built scene by scene.",
    helps: {
      en: "I can write the scene, pick a starting point, and set the length and the shape.",
      af: "Ek kan die toneel skryf, ’n beginpunt kies, en die lengte en die vorm stel.",
    },
    can: ["write a scene", "pick a template", "set the length and shape"],
    ops: {
      set_prompt:
        "the value is the full description of the shot, as you would tell a camera operator",
      set_aspect: "the value is exactly one of 16:9, 9:16 or 1:1",
      set_seconds:
        "the value is a whole number of seconds, and one the desk offers",
    },
    seeds: [
      {
        en: "Make me a 30 second advert for this",
        af: "Maak vir my ’n 30 sekonde advertensie hiervoor",
      },
      { en: "Which shape for Instagram?", af: "Watter vorm vir Instagram?" },
      {
        en: "Write three scenes for a trailer",
        af: "Skryf drie tonele vir ’n lokprent",
      },
    ],
  },
  hooks_feed: {
    id: "hooks_feed",
    stage: "show",
    next: {
      to: "channels",
      en: "Put it on your channel",
      af: "Sit dit op jou kanaal",
    },
    purpose:
      "Short vertical clips — the fifteen seconds that make somebody stop scrolling.",
    helps: {
      en: "I can tell you where the good bit starts, write the caption, and set how long the clip runs.",
      af: "Ek kan jou sê waar die goeie deel begin, die onderskrif skryf, en stel hoe lank die snit loop.",
    },
    can: ["pick the moment to cut", "write the caption", "set the length"],
    ops: {
      pick_song:
        "the value is the title of one of their own songs, as they said it, to cut a clip from",
      set_seconds: "the value is 15 or 30, and nothing else",
    },
    seeds: [
      {
        en: "Which part of this song is the hook?",
        af: "Watter deel van hierdie snit is die hook?",
      },
      {
        en: "Write a caption for this clip",
        af: "Skryf ’n byskrif vir hierdie knipsel",
      },
      {
        en: "Cut me a fifteen second version",
        af: "Sny vir my ’n vyftien sekonde weergawe",
      },
    ],
  },
  channels: {
    id: "channels",
    stage: "release",
    next: { to: "live", en: "Play it live", af: "Speel dit live" },
    purpose:
      "Your channel: your released music, in the order you want people to hear it.",
    helps: {
      en: "I can set the running order, write the description, and name a playlist.",
      af: "Ek kan die speelorde stel, die beskrywing skryf, en ’n snitlys benoem.",
    },
    can: ["set the running order", "write the description", "name a playlist"],
    ops: {
      open_playlist: "the value is the name of one of their playlists",
    },
    seeds: [
      {
        en: "What order should these go in?",
        af: "In watter volgorde moet hierdie wees?",
      },
      {
        en: "Write the description for my channel",
        af: "Skryf die beskrywing vir my kanaal",
      },
      {
        en: "Which track should open it?",
        af: "Watter snit moet dit oopmaak?",
      },
    ],
  },
  collab: {
    id: "collab",
    stage: null,
    purpose:
      "Finding another maker and working with them — the radar, the ask, and the room you share.",
    helps: {
      en: "I can draft the message you send, and say who on the radar is actually worth asking.",
      af: "Ek kan die boodskap opstel wat jy stuur, en sê wie op die radar werklik die moeite werd is om te vra.",
    },
    can: [
      "draft the message you send",
      "summarise a thread",
      "suggest who to ask",
    ],
    ops: {
      set_message:
        "the value is the message to put in the box of the open thread. It is not sent — they send it",
    },
    seeds: [
      {
        en: "Write the message asking them to collab",
        af: "Skryf die boodskap wat hulle vra om saam te werk",
      },
      { en: "Who here fits what I make?", af: "Wie hier pas by wat ek maak?" },
      {
        en: "Sum up this conversation for me",
        af: "Som hierdie gesprek vir my op",
      },
    ],
  },
  live: {
    id: "live",
    stage: "release",
    purpose: "The live room: one channel, everybody in it at the same time.",
    helps: {
      en: "I can write what you announce, set what plays next, and help you open the room.",
      af: "Ek kan skryf wat jy aankondig, stel wat volgende speel, en jou help om die kamer oop te maak.",
    },
    can: [
      "write what you announce",
      "set the running order",
      "suggest what to play next",
    ],
    ops: {
      set_message:
        "the value is what to say in the room, put in the box. It is not sent — they send it",
    },
    seeds: [
      {
        en: "What should I say when I open?",
        af: "Wat moet ek sê as ek oopmaak?",
      },
      { en: "What should I play next?", af: "Wat moet ek volgende speel?" },
      {
        en: "Write the announcement for this",
        af: "Skryf die aankondiging hiervoor",
      },
    ],
  },
  voice_studio: {
    id: "voice_studio",
    stage: "make",
    next: {
      to: "podcast",
      en: "Read a show in it",
      af: "Lees ’n program daarin",
    },
    purpose: "Your voice: cloning it once, then reading anything in it.",
    helps: {
      en: "I can write the script to be read, choose the voice, and set how it is read.",
      af: "Ek kan die teks skryf wat gelees word, die stem kies, en stel hoe dit gelees word.",
    },
    can: ["write the script to read", "pick a voice", "set how it is read"],
    ops: {
      set_script:
        "the value is the words to be read out, in full, with nothing around them",
    },
    seeds: [
      {
        en: "Write me a thirty second read",
        af: "Skryf vir my ’n dertig sekonde lees",
      },
      {
        en: "Which voice suits this script?",
        af: "Watter stem pas by hierdie teks?",
      },
      {
        en: "Make this sound less formal",
        af: "Laat dit minder formeel klink",
      },
    ],
  },
  podcast: {
    id: "podcast",
    stage: "release",
    purpose:
      "A show with its own feed: episodes, hosts, and the dub into other languages.",
    helps: {
      en: "I can write or tighten the script, name the episode, and say which language to dub it into.",
      af: "Ek kan die teks skryf of stywer maak, die episode benoem, en sê in watter taal om dit te dub.",
    },
    can: [
      "write or tighten the script",
      "set the hosts",
      "pick the language to dub into",
    ],
    ops: {
      set_title: "the value is the episode's title",
      set_notes: "the value is the episode's notes, in full",
    },
    seeds: [
      {
        en: "Write the opening for this episode",
        af: "Skryf die opening vir hierdie episode",
      },
      {
        en: "Tighten this script by a minute",
        af: "Maak hierdie teks ’n minuut korter",
      },
      {
        en: "Which language should I dub into?",
        af: "In watter taal moet ek dit oorklank?",
      },
    ],
  },
  sound: {
    id: "sound",
    stage: "make",
    next: { to: "make", en: "Make a song with it", af: "Maak ’n snit daarmee" },
    purpose:
      "Training a sound of your own from songs you have already made, so the next ones come out sounding like them.",
    helps: {
      en: "I can say which of your songs belong together, and what to call the sound they make.",
      af: "Ek kan sê watter van jou liedjies bymekaar hoort, en wat om die klank te noem wat hulle maak.",
    },
    can: ["say which songs to train on", "name the sound"],
    seeds: [
      {
        en: "Which of my songs belong together?",
        af: "Watter van my snitte hoort bymekaar?",
      },
      {
        en: "What should I call this sound?",
        af: "Wat moet ek hierdie klank noem?",
      },
      {
        en: "How many songs do I need?",
        af: "Hoeveel snitte het ek nodig?",
      },
    ],
  },
  campaign: {
    id: "campaign",
    stage: "sell",
    purpose:
      "Adverts: a brief in, and a set of adverts out — the line, the words under it, the button, the line to say aloud, and the shot to film.",
    helps: {
      en: "I can fill in any part of the brief, and say which market to write it for.",
      af: "Ek kan enige deel van die opdrag invul, en sê vir watter mark om dit te skryf.",
    },
    can: ["fill any part of the brief", "say which market to write for"],
    ops: {
      set_what: "the value is what they are selling, in a sentence",
      set_who: "the value is who the advert is for",
      set_offer: "the value is the offer, if there is one. Never invent one",
      set_tone: "the value is how it should sound, in a few words",
      set_market:
        "the value is one of: English, Afrikaans, isiZulu, Sesotho, Portuguese, French, Spanish",
    },
    seeds: [
      {
        en: "Write an advert for my bakery",
        af: "Skryf ’n advertensie vir my bakkery",
      },
      {
        en: "Who should I be aiming this at?",
        af: "Op wie moet ek dit mik?",
      },
      {
        en: "Say this in Afrikaans instead",
        af: "Sê dit eerder in Afrikaans",
      },
    ],
  },
};

/** Narrowing helper: is this string one of the rooms? Used to vet what the model names. */
export function isSurfaceId(value: string): value is SurfaceId {
  return (SURFACE_IDS as readonly string[]).includes(value);
}

/**
 * The model is allowed to say `hooks`, because that is what a person calls it.
 * The studio's own id has always been `hooks_feed`. One place to translate, so
 * the alias cannot be half-applied.
 */
export function resolveSurfaceId(value: string): SurfaceId | null {
  const cleaned = value.trim().toLowerCase();
  const alias: Record<string, SurfaceId> = {
    hooks: "hooks_feed",
    voice: "voice_studio",
    write: "make",
    song: "make",
  };
  const resolved = alias[cleaned] ?? cleaned;
  return isSurfaceId(resolved) ? resolved : null;
}

/** The starters for a room, in the reader's language. */
export function seedsFor(id: SurfaceId, lang: "en" | "af"): string[] {
  return SURFACES[id].seeds.map((seed) => seed[lang]);
}

/** What the copilot offers in this room, in the reader's language. */
export function helpsWith(id: SurfaceId, lang: "en" | "af"): string {
  return SURFACES[id].helps[lang];
}

/** The room list as the copilot route describes it to the model. */
export function surfaceDirectory(): string {
  return SURFACE_IDS.map((id) => `- ${id}: ${SURFACES[id].purpose}`).join("\n");
}

/** The rooms in one stage, in rail order. */
export function surfacesInStage(stage: StageId): SurfaceId[] {
  return SURFACE_IDS.filter((id) => SURFACES[id].stage === stage);
}

/** The rooms that belong to no stage, in rail order. */
export function standaloneSurfaces(): SurfaceId[] {
  return SURFACE_IDS.filter((id) => SURFACES[id].stage === null);
}

/**
 * The operations a room will accept right now, described for the model.
 *
 * `available` is what the panel reports as actually registered. A name with no
 * description in the registry is dropped rather than guessed at: the model
 * cannot use an operation it has not been told the meaning of.
 */
export function describeOps(
  id: SurfaceId,
  available: readonly string[],
): string[] {
  const known = SURFACES[id].ops ?? {};
  return available.filter((op) => known[op]).map((op) => `${op}: ${known[op]}`);
}
