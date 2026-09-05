/**
 * Fifty songs to start from.
 *
 * ── Why these exist ──────────────────────────────────────────────────────
 *
 * The hardest part of this room is the blank box, and a bad start is what a
 * bad song is made of. Somebody who does not know what to write types four
 * words, gets a take that wanders, and concludes the engine is no good — which
 * is roughly what happened to Carli before the plan was fixed, and would still
 * happen to anybody arriving with nothing.
 *
 * So: fifty complete starting points. A title, a style the engine can actually
 * work with, a tempo, and two lines to write the rest against. Press one and
 * the room is filled in; change any of it.
 *
 * ── What is translated and what is not ───────────────────────────────────
 *
 * The title and the two lines are in both languages, because they are what a
 * person reads and then rewrites.
 *
 * The **style stays English in both**, and that is deliberate rather than
 * lazy. It is not read by the person — it is read by the model, which was
 * trained on English descriptions of music, and "log drum bassline" reaches it
 * where "logtrom-baslyn" does not. The language the song is *sung* in is a
 * separate direction and is handled separately, in `lib/lyriclang.ts`.
 *
 * ── What they are not ────────────────────────────────────────────────────
 *
 * They are not AI, they are not generated, and the room says so. They are
 * written down here, the same fifty every time, so pressing one twice gives
 * the same thing twice — which is what a starting point should do.
 *
 * Weighted towards what this app is actually for: a South African studio, in
 * two languages, where most of the music being made is pop, house, gospel and
 * country rather than whatever a model's default is.
 */

export type Mood = 'love' | 'loss' | 'party' | 'home' | 'road' | 'faith' | 'work' | 'young';

export interface SongStart {
  readonly id: string;
  readonly mood: Mood;
  readonly bpm: number;
  /** English, and sent to the engine rather than shown as a suggestion. */
  readonly style: string;
  readonly en: { readonly title: string; readonly first: string };
  readonly af: { readonly title: string; readonly first: string };
}

export const MOODS: readonly { id: Mood; en: string; af: string }[] = [
  { id: 'love', en: 'Love', af: 'Liefde' },
  { id: 'loss', en: 'Losing someone', af: 'Iemand verloor' },
  { id: 'party', en: 'A night out', af: 'n Aand uit' },
  { id: 'home', en: 'Home', af: 'Tuis' },
  { id: 'road', en: 'The road', af: 'Die pad' },
  { id: 'faith', en: 'Faith', af: 'Geloof' },
  { id: 'work', en: 'Work and money', af: 'Werk en geld' },
  { id: 'young', en: 'Being young', af: 'Jonk wees' },
];

export const SONG_STARTS: readonly SongStart[] = [
  // ── Love ───────────────────────────────────────────────────────────────
  {
    id: 'love-kitchen', mood: 'love', bpm: 92,
    style: 'warm acoustic pop, fingerpicked guitar, brushed drums, close vocal, sparse',
    en: { title: 'Kitchen Light', first: 'You left the kitchen light on again\nI could see it from the road' },
    af: { title: 'Kombuislig', first: 'Jy het weer die kombuislig aangelos\nEk kon dit van die pad af sien' },
  },
  {
    id: 'love-slow', mood: 'love', bpm: 76,
    style: 'slow soul ballad, electric piano, warm bass, gospel-tinged backing vocals',
    en: { title: 'Take Your Time', first: 'Nobody is counting the hours here\nTake your time, take your time' },
    af: { title: 'Vat Jou Tyd', first: 'Niemand tel hier die ure nie\nVat jou tyd, vat jou tyd' },
  },
  {
    id: 'love-amapiano', mood: 'love', bpm: 112,
    style: 'amapiano, deep log drum, jazzy electric piano, airy percussion, spacious mix',
    en: { title: 'Late Reply', first: 'You answered me at two in the morning\nAnd I was still awake' },
    af: { title: 'Laat Antwoord', first: 'Jy het my tweeuur die oggend geantwoord\nEn ek was nog wakker' },
  },
  {
    id: 'love-country', mood: 'love', bpm: 100,
    style: 'country pop, pedal steel, acoustic guitar, brushed snare, honest vocal',
    en: { title: 'Second Best Idea', first: 'Leaving was my second best idea\nStaying was the first' },
    af: { title: 'Tweede Beste Plan', first: 'Weggaan was my tweede beste plan\nBly was die eerste' },
  },
  {
    id: 'love-indie', mood: 'love', bpm: 118,
    style: 'indie pop, jangly guitars, driving bass, bright chorus, no synth pads',
    en: { title: 'Everybody Knows', first: 'Everybody knows before we do\nThey have been waiting for us to catch up' },
    af: { title: 'Almal Weet', first: 'Almal weet lank voor ons weet\nHulle wag net dat ons byhou' },
  },
  {
    id: 'love-rnb', mood: 'love', bpm: 88,
    style: 'modern R&B, sub bass, muted guitar, tight hi-hats, layered harmonies',
    en: { title: 'One More Song', first: 'One more song and then I will go\nI have been saying that for an hour' },
    af: { title: 'Nog Een Liedjie', first: 'Nog een liedjie en dan gaan ek\nEk sê dit nou al ’n uur lank' },
  },
  {
    id: 'love-boere', mood: 'love', bpm: 128,
    style: 'traditional South African sokkie, concertina, walking bass, snare shuffle, warm',
    en: { title: 'Saturday Floor', first: 'The floor is full and the night is young\nAsk me once and I will say yes' },
    af: { title: 'Saterdagvloer', first: 'Die vloer is vol en die aand is jonk\nVra my een keer en ek sê ja' },
  },

  // ── Losing someone ─────────────────────────────────────────────────────
  {
    id: 'loss-chair', mood: 'loss', bpm: 68,
    style: 'sparse piano ballad, single voice, room reverb, no drums, string pad late',
    en: { title: 'His Chair', first: 'Nobody sits in that chair\nAnd nobody says why' },
    af: { title: 'Sy Stoel', first: 'Niemand sit in daardie stoel nie\nEn niemand sê hoekom nie' },
  },
  {
    id: 'loss-phone', mood: 'loss', bpm: 84,
    style: 'melancholy folk, acoustic guitar, upright bass, brushed kit, honest vocal',
    en: { title: 'Still In My Phone', first: 'Your number is still in my phone\nI have not been able to press delete' },
    af: { title: 'Nog In My Foon', first: 'Jou nommer is nog in my foon\nEk kon nog nie delete druk nie' },
  },
  {
    id: 'loss-gospel', mood: 'loss', bpm: 72,
    style: 'gospel ballad, Hammond organ, choir stacking, slow build, big final chorus',
    en: { title: 'Carry Me Home', first: 'I have been walking since the morning\nCarry me the last mile home' },
    af: { title: 'Dra My Huis Toe', first: 'Ek loop al vandat dit lig geword het\nDra my die laaste myl huis toe' },
  },
  {
    id: 'loss-rain', mood: 'loss', bpm: 96,
    style: 'alt rock, clean verse, distorted chorus, live drums, no synths',
    en: { title: 'It Rained Anyway', first: 'They said the drought would hold all summer\nIt rained the day you left' },
    af: { title: 'Dit Het Nogtans Gereën', first: 'Hulle het gesê die droogte hou die somer uit\nDit het gereën die dag toe jy loop' },
  },
  {
    id: 'loss-slow-house', mood: 'loss', bpm: 118,
    style: 'deep house, filtered pads, soft kick, sparse vocal, long build',
    en: { title: 'Half a Room', first: 'Half a room is not a home\nAnd half a bed is not a night' },
    af: { title: 'Halwe Kamer', first: '’n Halwe kamer is nie ’n huis nie\nEn ’n halwe bed is nie ’n nag nie' },
  },

  // ── A night out ────────────────────────────────────────────────────────
  {
    id: 'party-afro', mood: 'party', bpm: 122,
    style: 'afro house, log drum bassline, shaker groove, warm pads, four-on-the-floor',
    en: { title: 'Nobody Is Tired', first: 'Nobody in this room is tired\nAnd nobody is going home' },
    af: { title: 'Niemand Is Moeg', first: 'Niemand in hierdie kamer is moeg nie\nEn niemand gaan huis toe nie' },
  },
  {
    id: 'party-gqom', mood: 'party', bpm: 128,
    style: 'gqom, heavy kick pattern, sparse percussion, dark space, chanted vocal',
    en: { title: 'Turn It Up', first: 'Turn it up until the windows go\nWe have been quiet all week' },
    af: { title: 'Draai Dit Op', first: 'Draai dit op tot die vensters bewe\nOns was heelweek stil' },
  },
  {
    id: 'party-disco', mood: 'party', bpm: 116,
    style: 'nu disco, slap bass, string stabs, hand claps, bright and glossy',
    en: { title: 'Friday Money', first: 'Friday money burns a hole\nAnd I am happy to let it' },
    af: { title: 'Vrydaggeld', first: 'Vrydaggeld brand ’n gat\nEn ek laat dit graag toe' },
  },
  {
    id: 'party-pop', mood: 'party', bpm: 124,
    style: 'dance pop, sidechained synths, big chorus, bright vocal, tight low end',
    en: { title: 'Say It Louder', first: 'If you mean it, say it louder\nThe music is not going to stop' },
    af: { title: 'Sê Dit Harder', first: 'As jy dit bedoel, sê dit harder\nDie musiek gaan nie stop nie' },
  },
  {
    id: 'party-kwaito', mood: 'party', bpm: 110,
    style: 'kwaito, slow heavy groove, deep bass, spoken-sung vocal, minimal',
    en: { title: 'Slow Down', first: 'Slow down, we have all night\nThe good part has not started yet' },
    af: { title: 'Stadiger', first: 'Stadiger, ons het die hele aand\nDie lekker deel het nog nie begin nie' },
  },
  {
    id: 'party-rock', mood: 'party', bpm: 140,
    style: 'garage rock, overdriven guitars, live drums, shouted gang vocal, no polish',
    en: { title: 'One More Round', first: 'One more round and then we swear\nWe are going straight home' },
    af: { title: 'Nog Een Rondte', first: 'Nog een rondte en dan sweer ons\nOns gaan reguit huis toe' },
  },

  // ── Home ───────────────────────────────────────────────────────────────
  {
    id: 'home-street', mood: 'home', bpm: 90,
    style: 'warm acoustic pop, layered guitars, soft kick, communal backing vocals',
    en: { title: 'Same Street', first: 'Same street, different windows lit\nEverybody grew up and stayed' },
    af: { title: 'Selfde Straat', first: 'Selfde straat, ander vensters aan\nAlmal het grootgeword en gebly' },
  },
  {
    id: 'home-karoo', mood: 'home', bpm: 84,
    style: 'wide folk, acoustic guitar, harmonica, brushed drums, lots of space',
    en: { title: 'Karoo Wind', first: 'The wind comes down off the flat land\nAnd it does not knock first' },
    af: { title: 'Karoowind', first: 'Die wind kom af oor die vlakte\nEn hy klop nie eers nie' },
  },
  {
    id: 'home-sunday', mood: 'home', bpm: 78,
    style: 'soul, warm organ, tight rhythm section, gospel harmonies, unhurried',
    en: { title: 'Sunday Food', first: 'The pot has been on since ten\nAnd nobody has asked what is in it' },
    af: { title: 'Sondagkos', first: 'Die pot is al vanaf tien aan\nEn niemand vra wat binne is nie' },
  },
  {
    id: 'home-flat', mood: 'home', bpm: 104,
    style: 'bedroom pop, lo-fi drums, soft synths, close vocal, tape warmth',
    en: { title: 'Third Floor', first: 'Third floor, no lift, no view\nAnd it is the first place that is mine' },
    af: { title: 'Derde Vloer', first: 'Derde vloer, geen hysbak, geen uitsig\nEn dis die eerste plek wat myne is' },
  },
  {
    id: 'home-ouma', mood: 'home', bpm: 70,
    style: 'sparse piano and voice, string pad, no drums, intimate',
    en: { title: 'Her Hands', first: 'She could tell the weather by her hands\nAnd she was never wrong' },
    af: { title: 'Haar Hande', first: 'Sy kon die weer aan haar hande voel\nEn sy was nooit verkeerd nie' },
  },

  // ── The road ───────────────────────────────────────────────────────────
  {
    id: 'road-n1', mood: 'road', bpm: 108,
    style: 'driving country rock, telecaster, steady kick, road-trip energy',
    en: { title: 'Three Hundred Kilometres', first: 'Three hundred kilometres of nothing\nAnd I have not turned the radio on' },
    af: { title: 'Driehonderd Kilometer', first: 'Driehonderd kilometer van niks\nEn ek het nog nie die radio aangesit nie' },
  },
  {
    id: 'road-taxi', mood: 'road', bpm: 100,
    style: 'afro soul, mid-tempo groove, guitar riff, hand percussion, warm bass',
    en: { title: 'First Taxi', first: 'The first taxi leaves at five\nAnd the city does not wait' },
    af: { title: 'Eerste Taxi', first: 'Die eerste taxi ry vyfuur\nEn die stad wag nie' },
  },
  {
    id: 'road-night', mood: 'road', bpm: 124,
    style: 'melodic techno, rolling sub bass, hypnotic arpeggio, dark atmosphere, long build',
    en: { title: 'Headlights', first: 'Two headlights and a white line\nThat is the whole world for an hour' },
    af: { title: 'Ligte', first: 'Twee ligte en ’n wit streep\nDis die hele wêreld vir ’n uur' },
  },
  {
    id: 'road-leaving', mood: 'road', bpm: 96,
    style: 'folk rock, acoustic and electric together, live drums, group chorus',
    en: { title: 'I Packed Light', first: 'I packed light so I could turn around\nI have not turned around yet' },
    af: { title: 'Ek Het Lig Gepak', first: 'Ek het lig gepak om te kan omdraai\nEk het nog nie omgedraai nie' },
  },
  {
    id: 'road-coast', mood: 'road', bpm: 112,
    style: 'sunny indie pop, reverb guitar, bright bass, tambourine, easy chorus',
    en: { title: 'Wrong Turn, Better View', first: 'We took the wrong turn twice\nAnd the second one was better' },
    af: { title: 'Verkeerde Draai, Beter Uitsig', first: 'Ons het twee keer verkeerd gedraai\nEn die tweede een was beter' },
  },

  // ── Faith ──────────────────────────────────────────────────────────────
  {
    id: 'faith-morning', mood: 'faith', bpm: 74,
    style: 'contemporary worship, piano led, swelling strings, choir on the last chorus',
    en: { title: 'Before The Light', first: 'I was asking before the light came\nAnd the light came anyway' },
    af: { title: 'Voor Die Lig', first: 'Ek het gevra voor die lig gekom het\nEn die lig het in elk geval gekom' },
  },
  {
    id: 'faith-gospel', mood: 'faith', bpm: 82,
    style: 'traditional gospel, Hammond organ, tambourine, full choir, call and response',
    en: { title: 'Hold The Door', first: 'Hold the door, there is one more coming\nThere is always one more coming' },
    af: { title: 'Hou Die Deur', first: 'Hou die deur, daar kom nog een\nDaar kom altyd nog een' },
  },
  {
    id: 'faith-quiet', mood: 'faith', bpm: 66,
    style: 'ambient worship, soft pads, fingerpicked guitar, whispered vocal, no drums',
    en: { title: 'Quiet Enough', first: 'It got quiet enough to hear it\nWhich took me thirty years' },
    af: { title: 'Stil Genoeg', first: 'Dit het stil genoeg geword om te hoor\nWat my dertig jaar gekos het' },
  },
  {
    id: 'faith-thanks', mood: 'faith', bpm: 100,
    style: 'afro gospel, upbeat, hand percussion, layered voices, joyful',
    en: { title: 'Count It Out', first: 'Count it out loud, the whole list\nWe will be here a while' },
    af: { title: 'Tel Dit Op', first: 'Tel dit hardop, die hele lys\nOns gaan ’n ruk hier wees' },
  },

  // ── Work and money ─────────────────────────────────────────────────────
  {
    id: 'work-shift', mood: 'work', bpm: 94,
    style: 'blue-collar rock, steady drums, gritty guitar, plain-spoken vocal',
    en: { title: 'Night Shift', first: 'I know the building better in the dark\nThan the people who own it do' },
    af: { title: 'Nagskof', first: 'Ek ken die gebou beter in die donker\nAs die mense wat dit besit' },
  },
  {
    id: 'work-month', mood: 'work', bpm: 106,
    style: 'afro pop, bright guitar, mid-tempo groove, hopeful chorus',
    en: { title: 'End Of The Month', first: 'The month is longer than the money\nBut it always ends' },
    af: { title: 'Einde Van Die Maand', first: 'Die maand is langer as die geld\nMaar hy loop altyd klaar' },
  },
  {
    id: 'work-boss', mood: 'work', bpm: 132,
    style: 'punk pop, fast drums, driving bass, shouted chorus, no polish',
    en: { title: 'Two Weeks', first: 'I wrote two weeks on a piece of paper\nAnd I have carried it for a year' },
    af: { title: 'Twee Weke', first: 'Ek het twee weke op ’n papier geskryf\nEn dit ’n jaar lank saamgedra' },
  },
  {
    id: 'work-own', mood: 'work', bpm: 118,
    style: 'confident hip-hop soul, boom-bap drums, warm bass, sung hook',
    en: { title: 'My Own Name', first: 'I put my own name on the door\nAnd then I had to earn it' },
    af: { title: 'My Eie Naam', first: 'Ek het my eie naam op die deur gesit\nEn toe moes ek dit verdien' },
  },
  {
    id: 'work-small', mood: 'work', bpm: 88,
    style: 'acoustic soul, brushed drums, upright bass, warm honest vocal',
    en: { title: 'Small Business', first: 'Everything I own fits in this room\nAnd it is all working' },
    af: { title: 'Klein Besigheid', first: 'Alles wat ek besit pas in hierdie kamer\nEn dit werk alles' },
  },

  // ── Being young ────────────────────────────────────────────────────────
  {
    id: 'young-last', mood: 'young', bpm: 120,
    style: 'anthemic indie rock, big guitars, live drums, gang vocal chorus',
    en: { title: 'Last Summer Here', first: 'This is the last summer we are all here\nNobody has said it out loud' },
    af: { title: 'Laaste Somer Hier', first: 'Dis die laaste somer dat ons almal hier is\nNiemand het dit hardop gesê nie' },
  },
  {
    id: 'young-first-car', mood: 'young', bpm: 128,
    style: 'upbeat pop rock, bright guitars, handclaps, big chorus',
    en: { title: 'It Barely Starts', first: 'It barely starts and it barely stops\nAnd it is the best thing I own' },
    af: { title: 'Dit Vat Skaars', first: 'Dit vat skaars en dit stop skaars\nEn dis die beste ding wat ek het' },
  },
  {
    id: 'young-exam', mood: 'young', bpm: 98,
    style: 'bedroom pop, soft synths, lo-fi drums, doubled vocal, tape warmth',
    en: { title: 'Nobody Asked Me', first: 'Nobody asked me what I wanted to be\nUntil the week they wanted an answer' },
    af: { title: 'Niemand Het Gevra', first: 'Niemand het gevra wat ek wil wees nie\nTot die week toe hulle ’n antwoord wou hê' },
  },
  {
    id: 'young-phone', mood: 'young', bpm: 116,
    style: 'hyperpop-lite, bright synths, tight drums, pitched vocal, playful',
    en: { title: 'Read At 11:04', first: 'Read at eleven oh four\nAnd nothing since' },
    af: { title: 'Gelees Om 11:04', first: 'Gelees om elf nul vier\nEn niks sedertdien nie' },
  },
  {
    id: 'young-team', mood: 'young', bpm: 104,
    style: 'stadium pop, big drums, wide synths, chanted hook, triumphant',
    en: { title: 'We Lost Well', first: 'We lost, and we lost well\nAnd we will be back in a year' },
    af: { title: 'Ons Het Goed Verloor', first: 'Ons het verloor, en ons het goed verloor\nEn ons kom oor ’n jaar terug' },
  },

  // ── A few more, spread across the moods ────────────────────────────────
  {
    id: 'love-old', mood: 'love', bpm: 80,
    style: 'jazz-tinged soul, brushed drums, upright bass, warm electric piano',
    en: { title: 'Forty Years', first: 'Forty years and she still checks\nThat I locked the back door' },
    af: { title: 'Veertig Jaar', first: 'Veertig jaar en sy kyk nog\nOf ek die agterdeur gesluit het' },
  },
  {
    id: 'loss-town', mood: 'loss', bpm: 92,
    style: 'americana, slide guitar, brushed kit, warm bass, weathered vocal',
    en: { title: 'The Shop Is Closed', first: 'The shop on the corner is closed\nAnd the town got smaller by one' },
    af: { title: 'Die Winkel Is Toe', first: 'Die winkel op die hoek is toe\nEn die dorp het met een kleiner geword' },
  },
  {
    id: 'home-braai', mood: 'home', bpm: 108,
    style: 'feel-good afro pop, bright guitar, hand percussion, group vocal',
    en: { title: 'Bring A Chair', first: 'Bring a chair, there is always food\nWe never plan it and it always works' },
    af: { title: 'Bring ’n Stoel', first: 'Bring ’n stoel, daar is altyd kos\nOns beplan dit nooit en dit werk altyd' },
  },
  {
    id: 'road-back', mood: 'road', bpm: 86,
    style: 'quiet folk, fingerpicked guitar, soft harmony, no drums until late',
    en: { title: 'Coming Back Slower', first: 'I left in a hurry\nI am coming back slower' },
    af: { title: 'Kom Stadiger Terug', first: 'Ek is haastig weg\nEk kom stadiger terug' },
  },
  {
    id: 'party-late', mood: 'party', bpm: 126,
    style: 'tech house, rolling bassline, crisp hats, filtered vocal, long groove',
    en: { title: 'Four In The Morning', first: 'Four in the morning is a decision\nAnd we made it hours ago' },
    af: { title: 'Vieruur Die Oggend', first: 'Vieruur die oggend is ’n besluit\nEn ons het dit ure gelede geneem' },
  },
  {
    id: 'faith-storm', mood: 'faith', bpm: 90,
    style: 'gospel rock, organ and guitar together, live drums, rising chorus',
    en: { title: 'Through It, Not Around', first: 'You never took the storm away\nYou walked me through the middle' },
    af: { title: 'Deur Dit, Nie Om Nie', first: 'Jy het nooit die storm weggevat nie\nJy het my deur die middel gevat' },
  },
  {
    id: 'work-hands', mood: 'work', bpm: 84,
    style: 'roots blues, slide guitar, stomp box, single voice, raw',
    en: { title: 'What My Hands Know', first: 'My hands know things my head forgot\nAnd they have never asked for credit' },
    af: { title: 'Wat My Hande Weet', first: 'My hande weet goed wat my kop vergeet het\nEn hulle het nooit dankie gevra nie' },
  },
  {
    id: 'young-move', mood: 'young', bpm: 122,
    style: 'bright synth pop, arpeggiated bass, big open chorus, optimistic',
    en: { title: 'One Bag', first: 'One bag, one bus, one address\nWritten on the back of my hand' },
    af: { title: 'Een Sak', first: 'Een sak, een bus, een adres\nAgterop my hand geskryf' },
  },
];
