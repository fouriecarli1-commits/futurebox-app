/**
 * What each part of a song is FOR, written down.
 *
 * ── Where this came from ─────────────────────────────────────────────────
 *
 * Carli, 19 September 2026, passing on a friend's idea and adding her own:
 *
 *   "Die AI prompt moet mens deur 'n liedjie se skryf begelei en word dan ook
 *    'n prompter wat iemand leer hoe musiek werk. Om te verduidelik waarvoor
 *    is 'n bridge, dit help ons om oor te skakel na die chorus toe."
 *
 * And: *"dan leer dit ook mense sommer van liedjie skryf en van musiek."*
 * That is the part of the idea worth the most. An app that writes a song for
 * somebody leaves them where it found them. An app that says why a chorus
 * repeats and a bridge does not leaves them able to write the next one
 * without it.
 *
 * ── Why this is data and not something the model says ────────────────────
 *
 * The same argument as `data/songstarts.ts`, and it is the whole reason this
 * file exists rather than a paragraph in a prompt.
 *
 * A model asked what a bridge is for will answer well nine times and, the
 * tenth, fluently say something that is not true — and the person has no way
 * to tell which one they got. This is teaching. Teaching that is right most
 * of the time is a different product from teaching that is right.
 *
 * So the craft is written here, the same every time, costing nothing, and
 * the copilot is handed it as knowledge to talk FROM. It may choose which
 * part of it to say and how to say it to this person about this song. It may
 * not invent a new one.
 *
 * ── Why the examples name structure and never words ──────────────────────
 *
 * "Hierdie is die wending" about a famous song is an observation about how it
 * is built. Its lyrics are somebody's copyright, and this app does not print
 * other people's words — the same line `docs` §138 draws around an uploaded
 * song. Every `example` below says what HAPPENS at that point in the song and
 * quotes nothing.
 *
 * ── The gap that is deliberately left open ───────────────────────────────
 *
 * These examples are from the songs most people have heard, which means they
 * are American and British. For an app whose members are writing in Afrikaans
 * about the Karoo, a local example would teach better than a famous one. That
 * needs somebody who knows the catalogue well enough to be right about it —
 * so the field is here and empty rather than filled in by a guess, and
 * `check:songcraft` requires that whatever goes in it stays structural.
 */

/** The parts, in the order they are usually met. */
export type Part = 'intro' | 'verse' | 'prechorus' | 'chorus' | 'bridge' | 'outro';

export interface Craft {
  readonly id: Part;
  /** What the section is called, on screen. */
  readonly name: { readonly en: string; readonly af: string };
  /** What it is for, in one line. The answer to "waarvoor is dit?" */
  readonly what: { readonly en: string; readonly af: string };
  /** What it does to whoever is listening. The reason it works. */
  readonly does: { readonly en: string; readonly af: string };
  /** How to write one. Practical, not theory. */
  readonly how: { readonly en: string; readonly af: string };
  /** The mistake people make, said plainly so it can be avoided. */
  readonly wrong: { readonly en: string; readonly af: string };
  /**
   * A structural observation about a song most people have heard.
   *
   * What happens at that point in it. Never a line of it. See the note above.
   */
  readonly example: { readonly en: string; readonly af: string };
}

export const CRAFT: readonly Craft[] = [
  {
    id: 'intro',
    name: { en: 'The intro', af: 'Die intro' },
    what: {
      en: 'It sets the sound and buys you ten seconds of patience.',
      af: 'Dit stel die klank en koop vir jou tien sekondes se geduld.',
    },
    does: {
      en: 'Before a word is sung, somebody has already decided what kind of song this is. The intro is that decision being made for them.',
      af: 'Voor een woord gesing is, het iemand klaar besluit watter soort liedjie dit is. Die intro is daardie besluit wat vir hulle gemaak word.',
    },
    how: {
      en: 'Short, and made of something the song keeps coming back to — the guitar figure, the drum pattern, the one chord that says which key we are in.',
      af: 'Kort, en gemaak van iets waarna die liedjie bly terugkom — die kitaarfiguur, die drumpatroon, die een akkoord wat sê in watter toonaard ons is.',
    },
    wrong: {
      en: 'Making it long because it sounds good. Nobody stayed for the intro. They stayed because the first line arrived before they got bored.',
      af: 'Om dit lank te maak omdat dit lekker klink. Niemand het vir die intro gebly nie. Hulle het gebly omdat die eerste reël gekom het voor hulle verveeld geraak het.',
    },
    example: {
      en: 'Billie Jean spends nearly half a minute on the bassline and the drums before anybody sings. By the time the voice arrives you already know exactly what you are listening to.',
      af: 'Billie Jean gee byna ’n halwe minuut aan die baslyn en die dromme voor enigiemand sing. Teen die tyd dat die stem kom, weet jy presies waarna jy luister.',
    },
  },
  {
    id: 'verse',
    name: { en: 'The verse', af: 'Die vers' },
    what: {
      en: 'It is where the facts live. What happened, where, and to whom.',
      af: 'Dit is waar die feite bly. Wat gebeur het, waar, en met wie.',
    },
    does: {
      en: 'The chorus says how it feels. Nobody believes a feeling they were not shown, and the verse is where they are shown it.',
      af: 'Die koor sê hoe dit voel. Niemand glo ’n gevoel wat hulle nie gewys is nie, en die vers is waar hulle dit gewys word.',
    },
    how: {
      en: 'One small true thing beats three big ones. The kitchen light left on says more about missing somebody than the word lonely does.',
      af: 'Een klein ware ding klop drie groot goed. Die kombuislig wat aangelos is sê meer oor iemand mis as wat die woord eensaam doen.',
    },
    wrong: {
      en: 'Writing the chorus twice. If the verse is already saying how you feel, the chorus has nothing left to arrive with.',
      af: 'Om die koor twee keer te skryf. As die vers klaar sê hoe jy voel, het die koor niks oor om mee aan te kom nie.',
    },
    example: {
      en: 'Hotel California is nearly all verse. The story is told in detail, room by room, and the song barely needs a chorus because the telling is the thing.',
      af: 'Hotel California is byna net verse. Die storie word in besonderhede vertel, kamer vir kamer, en die liedjie het skaars ’n koor nodig omdat die vertelling self die ding is.',
    },
  },
  {
    id: 'prechorus',
    name: { en: 'The lift', af: 'Die oploop' },
    what: {
      en: 'The few lines that raise the pressure so the chorus pays it off.',
      af: 'Die paar reëls wat die druk opbou sodat die koor dit afbetaal.',
    },
    does: {
      en: 'It makes the chorus feel earned. The same chorus, with a lift in front of it, lands harder than one that simply follows a verse.',
      af: 'Dit laat die koor verdien voel. Dieselfde koor, met ’n oploop voor, land harder as een wat sommer op ’n vers volg.',
    },
    how: {
      en: 'Climb. Shorter lines, higher notes, fewer words, more space. The listener should be leaning forward by the last one.',
      af: 'Klim. Korter reëls, hoër note, minder woorde, meer ruimte. Die luisteraar moet teen die laaste een vorentoe leun.',
    },
    wrong: {
      en: 'Treating it as more verse. A lift that sits flat is two lines the song did not need.',
      af: 'Om dit as nog vers te behandel. ’n Oploop wat plat lê is twee reëls wat die liedjie nie nodig gehad het nie.',
    },
    example: {
      en: 'Plenty of songs have none at all, and that is a real choice rather than an omission. A verse that already climbs does not need one in front of it.',
      af: 'Baie liedjies het glad nie een nie, en dit is ’n regte keuse eerder as ’n weglating. ’n Vers wat klaar klim, het nie een voor hom nodig nie.',
    },
  },
  {
    id: 'chorus',
    name: { en: 'The chorus', af: 'Die koor' },
    what: {
      en: 'The whole song in one sentence, and the part they sing in the car.',
      af: 'Die hele liedjie in een sin, en die deel wat hulle in die kar sing.',
    },
    does: {
      en: 'It is the lift — the moment the song opens up. Everything before it exists to make it arrive, and everything after it is measured against it.',
      af: 'Dit is die oplewing — die oomblik waar die liedjie oopgaan. Alles voor dit bestaan om dit te laat aankom, en alles daarna word daarteen gemeet.',
    },
    how: {
      en: 'Say the same thing every time. A chorus that changes its words each time is not a chorus, it is three more verses. Repetition is not laziness here; it is the job.',
      af: 'Sê elke keer dieselfde ding. ’n Koor wat elke keer sy woorde verander, is nie ’n koor nie — dit is nog drie verse. Herhaling is nie luiheid hier nie; dit is die werk.',
    },
    wrong: {
      en: 'Being clever. The chorus is the one place to be plain. Whatever you would say if somebody asked what the song is about — that is the chorus.',
      af: 'Om slim te wees. Die koor is die een plek om eenvoudig te wees. Wat jy ook al sou sê as iemand vra waaroor die liedjie gaan — dít is die koor.',
    },
    example: {
      en: 'A chorus usually arrives inside the first minute, and in most songs on the radio inside the first forty seconds. If yours has not arrived by then, the song is asking for patience it has not bought.',
      af: '’n Koor kom gewoonlik binne die eerste minuut, en in die meeste liedjies op die radio binne die eerste veertig sekondes. As joune teen dan nog nie gekom het nie, vra die liedjie vir geduld wat dit nie gekoop het nie.',
    },
  },
  {
    id: 'bridge',
    name: { en: 'The bridge', af: 'Die brug' },
    what: {
      en: 'The turn. The one place the song says something it has not said yet.',
      af: 'Die wending. Die een plek waar die liedjie iets sê wat dit nog nie gesê het nie.',
    },
    does: {
      en: 'By the third chorus the listener knows what is coming, and knowing what is coming is how a song stops working. The bridge breaks the pattern so the last chorus lands as though it were new.',
      af: 'Teen die derde koor weet die luisteraar wat kom, en om te weet wat kom is hoe ’n liedjie ophou werk. Die brug breek die patroon sodat die laaste koor land asof dit nuut is.',
    },
    how: {
      en: 'Change something: the angle, the person being spoken to, the time it is happening in. Often it is where you finally say the thing the verses were walking around.',
      af: 'Verander iets: die hoek, die persoon met wie gepraat word, die tyd waarin dit gebeur. Dikwels is dit waar jy uiteindelik die ding sê waarom die verse gedraai het.',
    },
    wrong: {
      en: 'Putting one in because songs have them. A bridge with nothing new to say is a delay before a chorus everybody already wanted.',
      af: 'Om een in te sit omdat liedjies hulle het. ’n Brug met niks nuuts om te sê nie, is ’n vertraging voor ’n koor wat almal klaar wou hê.',
    },
    example: {
      en: 'Bridge Over Troubled Water turns at the last section: the arrangement, which has been one voice and a piano, opens into the full orchestra, and the song stops offering comfort and starts promising it. The turn is in the arrangement as much as in the words.',
      af: 'Bridge Over Troubled Water draai by die laaste gedeelte: die verwerking, wat tot dan een stem en ’n klavier was, gaan oop na die vol orkes, en die liedjie hou op om troos aan te bied en begin dit belowe. Die wending lê net soveel in die verwerking as in die woorde.',
    },
  },
  {
    id: 'outro',
    name: { en: 'The ending', af: 'Die einde' },
    what: {
      en: 'How the song lets go.',
      af: 'Hoe die liedjie loslaat.',
    },
    does: {
      en: 'It decides what somebody is left holding. A song that stops dead and a song that fades leave two different feelings behind, from the same words.',
      af: 'Dit besluit wat iemand oorhou. ’n Liedjie wat dood stop en een wat wegsterf laat twee verskillende gevoelens agter, uit dieselfde woorde.',
    },
    how: {
      en: 'Three choices, and they are all fine: stop on the last chorus, fade out on it, or come back to the quietest thing in the song. Pick on purpose.',
      af: 'Drie keuses, en almal is reg: stop op die laaste koor, sterf daarop weg, of kom terug na die stilste ding in die liedjie. Kies doelbewus.',
    },
    wrong: {
      en: 'Repeating the chorus until something runs out. An ending that is four more choruses is a song that did not know it was finished.',
      af: 'Om die koor te herhaal tot iets opraak. ’n Einde wat nog vier kore is, is ’n liedjie wat nie geweet het dit is klaar nie.',
    },
    example: {
      en: 'A fade was once how a radio edit ended; on a phone it mostly reads as the song running out. A written ending is worth more now than it was.',
      af: '’n Wegsterwing was eens hoe ’n radio-snit geëindig het; op ’n foon lees dit meestal soos ’n liedjie wat opraak. ’n Geskrewe einde is nou meer werd as wat dit was.',
    },
  },
];

/* ════════════════════════════════════════════════════════════════════════
   What the feeling is ABOUT
   ════════════════════════════════════════════════════════════════════════

   Carli's step 4: *"Dan se hy ok jy het sad gekoes by voorbeeld Dan se hy ok
   ... waaroor is jy sad? Boyfriend daagliksr di ge depressed etc."*

   This is the question that decides whether the song is hers or generic. "A
   sad song" gives a model nothing; "the day the dog died" gives it
   everything. And a blank box after "what is it about?" is the same blank
   box this room already knows is the hardest part — so the question comes
   with places to land, and a box for anybody whose answer is not one of
   them.

   They are written down, in both languages, for the same reason the fifty
   starting points are: they must be the same every time and cost nothing.
   The mood ids are `data/songstarts.ts`'s, so the two rows agree and picking
   a feeling can narrow the starting points to match. */

import type { Mood } from './songstarts';

export interface About {
  readonly id: string;
  readonly mood: Mood;
  readonly en: string;
  readonly af: string;
}

export const ABOUT: readonly About[] = [
  { id: 'love-new', mood: 'love', en: 'Somebody new', af: 'Iemand nuut' },
  { id: 'love-long', mood: 'love', en: 'Years with the same person', af: 'Jare met dieselfde mens' },
  { id: 'love-unsaid', mood: 'love', en: 'Something I have not said yet', af: 'Iets wat ek nog nie gesê het nie' },
  { id: 'love-far', mood: 'love', en: 'Far apart', af: 'Ver uitmekaar' },

  { id: 'loss-death', mood: 'loss', en: 'Somebody died', af: 'Iemand is dood' },
  { id: 'loss-left', mood: 'loss', en: 'They left', af: 'Hulle het gegaan' },
  { id: 'loss-low', mood: 'loss', en: 'I have been flat for a while', af: 'Ek is al ’n ruk lank plat' },
  { id: 'loss-fail', mood: 'loss', en: 'I tried and it did not work', af: 'Ek het probeer en dit het nie gewerk nie' },

  { id: 'party-win', mood: 'party', en: 'We won', af: 'Ons het gewen' },
  { id: 'party-friends', mood: 'party', en: 'My people', af: 'My mense' },
  { id: 'party-dance', mood: 'party', en: 'I just want to dance', af: 'Ek wil net dans' },
  { id: 'party-payday', mood: 'party', en: 'It is Friday', af: 'Dis Vrydag' },

  { id: 'home-place', mood: 'home', en: 'The place I am from', af: 'Die plek waar ek vandaan kom' },
  { id: 'home-family', mood: 'home', en: 'My family', af: 'My familie' },
  { id: 'home-back', mood: 'home', en: 'Going back', af: 'Om terug te gaan' },
  { id: 'home-gone', mood: 'home', en: 'It is not there any more', af: 'Dit is nie meer daar nie' },

  { id: 'road-leaving', mood: 'road', en: 'Leaving', af: 'Om weg te gaan' },
  { id: 'road-work', mood: 'road', en: 'Working far from home', af: 'Ver van die huis af werk' },
  { id: 'road-start', mood: 'road', en: 'Starting again somewhere else', af: 'Om êrens anders weer te begin' },

  { id: 'faith-thanks', mood: 'faith', en: 'Giving thanks', af: 'Om dankie te sê' },
  { id: 'faith-hard', mood: 'faith', en: 'Holding on through something hard', af: 'Om vas te hou deur iets swaars' },
  { id: 'faith-doubt', mood: 'faith', en: 'Asking questions', af: 'Om vrae te vra' },

  { id: 'work-money', mood: 'work', en: 'The money does not stretch', af: 'Die geld rek nie' },
  { id: 'work-pride', mood: 'work', en: 'Proud of what I do', af: 'Trots op wat ek doen' },
  { id: 'work-tired', mood: 'work', en: 'I am tired', af: 'Ek is moeg' },

  { id: 'young-free', mood: 'young', en: 'Nothing to lose yet', af: 'Nog niks om te verloor nie' },
  { id: 'young-lost', mood: 'young', en: 'I do not know what I am doing', af: 'Ek weet nie wat ek doen nie' },
  { id: 'young-first', mood: 'young', en: 'The first time', af: 'Die eerste keer' },
];

/** The places to land for one feeling. */
export function aboutFor(mood: Mood): readonly About[] {
  return ABOUT.filter((one) => one.mood === mood);
}

/**
 * The craft, as the copilot is handed it.
 *
 * Flat lines rather than an object, because it goes into a prompt and a
 * prompt is read by something that reads prose. English only: this is what
 * the model is told, not what anybody is shown — the reply comes back in the
 * language they wrote in, which is a separate rule in the route.
 */
export function craftBrief(): string[] {
  const out: string[] = [
    'What each part of a song is for. This is the studio’s own teaching, and it is',
    'the same every time. Use it to explain, in your own words, to this person about',
    'this song. Do not invent a part that is not here, and never quote the words of a',
    'song somebody else wrote — say what happens in it, not what it says.',
    '',
  ];
  for (const one of CRAFT) {
    out.push(
      `${one.name.en}: ${one.what.en} ${one.does.en}`,
      `  How: ${one.how.en}`,
      `  Commonest mistake: ${one.wrong.en}`,
      `  Worth knowing: ${one.example.en}`,
    );
  }
  return out;
}
