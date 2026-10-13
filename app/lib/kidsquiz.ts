/**
 * The quizzes: questions somebody wrote, in both languages, with nothing
 * behind them but this file.
 *
 * Carli, 13 October 2026: *"And then also quizies fun child quizies, like
 * would you rather, and also music quizies that will teach music skills,
 * story telling, video editing, photo editing."*
 *
 * "Would you rather" has no right answer: both presses earn a star, and the
 * point is the giggle. The skill quizzes have one right answer each and say
 * why in a line, so a wrong press teaches something rather than scoring
 * nothing. Every question is a closed list — the room's rule — and the
 * sound questions play the browser's own oscillator (`kidsbeat.ts`), so an
 * ear can be trained on a phone with nothing in the house but the phone.
 */

export type Both = readonly [string, string];

/** The two cards' paint, from Google's page: neon green and neon cyan. */
export const RATHER_PAINT: readonly [string, string] = ['#39ff88', '#00ffcc'];

export interface Rather {
  readonly a: Both;
  readonly b: Both;
  /** The pictures on the two cards, from Google's page of 13 October. */
  readonly icons: readonly [string, string];
}

export const WOULD_YOU_RATHER: readonly Rather[] = [
  { a: ['Sing on a stage in front of a thousand people', 'Sing op ’n verhoog voor ’n duisend mense'], b: ['Play the drums on the moon', 'Dromme speel op die maan'], icons: ['🎤🌟', '🥁🌙'] },
  { a: ['Have a pet dinosaur that hums', 'Dit ’n troeteldier-dinosourus hê wat neurie'], b: ['Have a robot that dances', '’n Robot hê wat dans'], icons: ['🦖🎶', '🤖💃'] },
  { a: ['Make a song about pancakes', '’n Liedjie oor pannekoek maak'], b: ['Make a song about a sneeze', '’n Liedjie oor ’n nies maak'], icons: ['🥞🎵', '🤧🎶'] },
  { a: ['Be the hero in your own movie', 'Die held in jou eie fliek wees'], b: ['Be the one who films it', 'Die een wees wat dit afneem'], icons: ['🦸🎬', '🎥✨'] },
  { a: ['Draw with a crayon as big as you', 'Teken met ’n kryt so groot soos jy'], b: ['Draw with a crayon as small as an ant', 'Teken met ’n kryt so klein soos ’n mier'], icons: ['🖍️🏔️', '🖍️🐜'] },
  { a: ['Have a guitar that plays itself', '’n Kitaar hê wat homself speel'], b: ['Have a piano that tells jokes', '’n Klavier hê wat grappe vertel'], icons: ['🎸🪄', '🎹😂'] },
  { a: ['Live in a story about the sea', 'In ’n storie oor die see woon'], b: ['Live in a story about space', 'In ’n storie oor die ruimte woon'], icons: ['🌊📖', '🚀📖'] },
  { a: ['Sing like a whale', 'Soos ’n walvis sing'], b: ['Sing like a bird', 'Soos ’n voël sing'], icons: ['🐋🎶', '🐦🎶'] },
  { a: ['Have a video camera for an eye', '’n Videokamera as ’n oog hê'], b: ['Have a microphone for a nose', '’n Mikrofoon as ’n neus hê'], icons: ['📹👁️', '🎤👃'] },
  { a: ['Make a video of a dancing cat', '’n Video van ’n dansende kat maak'], b: ['Make a video of a singing dog', '’n Video van ’n singende hond maak'], icons: ['🐱💃', '🐶🎤'] },
  { a: ['Only ever hear loud music', 'Net nog ooit harde musiek hoor'], b: ['Only ever hear quiet music', 'Net nog ooit sagte musiek hoor'], icons: ['🔊🎧', '🔉🎧'] },
  { a: ['Paint a picture with your feet', '’n Prent met jou voete verf'], b: ['Paint a picture with your elbows', '’n Prent met jou elmboë verf'], icons: ['🦶🎨', '💪🎨'] },
  { a: ['Tell a story with no ending', '’n Storie sonder ’n einde vertel'], b: ['Tell a story with no beginning', '’n Storie sonder ’n begin vertel'], icons: ['📖∞', '📖❓'] },
  { a: ['Have a drum for a tummy', '’n Trom as ’n maag hê'], b: ['Have bells for fingers', 'Klokkies as vingers hê'], icons: ['🥁🫃', '🔔🖐️'] },
  { a: ['Make a music video in the rain', '’n Musiekvideo in die reën maak'], b: ['Make a music video in the snow', '’n Musiekvideo in die sneeu maak'], icons: ['🌧️🎬', '❄️🎬'] },
  { a: ['Be a famous singer for one day', 'Vir een dag ’n beroemde sanger wees'], b: ['Be a famous painter for one day', 'Vir een dag ’n beroemde skilder wees'], icons: ['🎤👑', '🎨👑'] },
];

export type Skill = 'music' | 'story' | 'video' | 'photo';

export interface Teach {
  readonly skill: Skill;
  readonly ask: Both;
  readonly choices: readonly Both[];
  /** A picture per choice, where the page had one. */
  readonly icons?: readonly string[];
  /** Which of the choices is right. */
  readonly right: number;
  readonly why: Both;
  /**
   * For the ear questions: two notes played before the choices, as
   * frequencies in hertz. Left out, the question is only words.
   */
  readonly notes?: readonly [number, number];
}

export const TEACH: readonly Teach[] = [
  /* ── Music, by ear ─────────────────────────────────────────────────── */
  { skill: 'music', ask: ['Which note was HIGHER?', 'Watter noot was HOËR?'],
    choices: [['The first one', 'Die eerste een'], ['The second one', 'Die tweede een']], right: 1,
    why: ['A higher note is a faster wobble. Birds sing high; bears sing low.', '’n Hoër noot is ’n vinniger bewing. Voëls sing hoog; bere sing laag.'],
    notes: [261.63, 392.0] },
  { skill: 'music', ask: ['Which note was LOWER?', 'Watter noot was LAER?'],
    choices: [['The first one', 'Die eerste een'], ['The second one', 'Die tweede een']], right: 0,
    why: ['The first one was low, like a big drum. Low notes are slow wobbles.', 'Die eerste een was laag, soos ’n groot trom. Lae note is stadige bewings.'],
    notes: [196.0, 329.63] },
  { skill: 'music', ask: ['Were those two notes the SAME?', 'Was daardie twee note DIESELFDE?'],
    choices: [['Yes, the same', 'Ja, dieselfde'], ['No, different', 'Nee, verskillend']], right: 0,
    why: ['They were the same note twice. Hearing that is called having a good ear.', 'Dit was dieselfde noot twee keer. Om dit te hoor word ’n goeie oor genoem.'],
    notes: [329.63, 329.63] },
  { skill: 'music', ask: ['What makes music go faster or slower?', 'Wat laat musiek vinniger of stadiger gaan?'],
    choices: [['The tempo', 'Die tempo'], ['The colour', 'Die kleur'], ['The title', 'Die titel']], right: 0,
    why: ['Tempo is the speed of the beat. The beat machine’s slider changes it.', 'Tempo is die spoed van die ritme. Die ritme-masjien se skuifbalk verander dit.'] },
  { skill: 'music', ask: ['What is a chorus?', 'Wat is ’n refrein?'],
    choices: [['The part that comes back again and again', 'Die deel wat oor en oor terugkom'], ['The very first word', 'Die heel eerste woord'], ['The drum', 'Die trom']], right: 0,
    why: ['The chorus is the bit everybody sings along to, because it comes back.', 'Die refrein is die deel waarmee almal saamsing, want dit kom terug.'] },
  { skill: 'music', ask: ['Which of these is a drum?', 'Watter een hiervan is ’n trom?'],
    choices: [['A snare', '’n Snaartrom'], ['A violin', '’n Viool'], ['A trumpet', '’n Trompet']], right: 0,
    why: ['A snare is the sharp drum that goes on two and four. The beat machine has one.', '’n Snaartrom is die skerp trom wat op twee en vier gaan. Die ritme-masjien het een.'] },
  { skill: 'music', ask: ['Which instrument gives a song its big, booming beat?', 'Watter instrument gee ’n liedjie sy groot, dreunende ritme?'],
    choices: [['Bass drum (kick)', 'Bastrom (kick)'], ['Flute', 'Fluit'], ['Triangle bell', 'Driehoekklokkie']], icons: ['🥁', '🪈', '🔔'], right: 0,
    why: ['The kick is the deep thump you feel in your tummy. The beat machine’s first row is one.', 'Die kick is die diep dreun wat jy in jou maag voel. Die ritme-masjien se eerste ry is een.'] },
  { skill: 'music', ask: ['What is the speed of music called in a studio?', 'Wat word die spoed van musiek in ’n ateljee genoem?'],
    choices: [['BPM (tempo)', 'BPM (tempo)'], ['Colour tone', 'Kleurtoon'], ['Volume whisper', 'Volumefluister']], icons: ['⚡⏱️', '🎨', '🤫'], right: 0,
    why: ['Beats per minute. 60 is a slow walk, 120 is a dance, 170 is a dino running.', 'Slae per minuut. 60 is ’n stadige stap, 120 is ’n dans, 170 is ’n dino wat hardloop.'] },
  /* ── Stories ───────────────────────────────────────────────────────── */
  { skill: 'story', ask: ['Every story needs a…', 'Elke storie het ’n …'],
    choices: [['Beginning, middle and end', 'Begin, middel en einde'], ['Very long title', 'Baie lang titel'], ['Dragon', 'Draak']], right: 0,
    why: ['A beginning says who, a middle says what went wrong, an end says how it was fixed.', '’n Begin sê wie, ’n middel sê wat verkeerd gegaan het, ’n einde sê hoe dit reggemaak is.'] },
  { skill: 'story', ask: ['Who is the hero?', 'Wie is die held?'],
    choices: [['The one the story is about', 'Die een oor wie die storie gaan'], ['The one who reads it', 'Die een wat dit lees'], ['The one with the biggest hat', 'Die een met die grootste hoed']], right: 0,
    why: ['The hero is the one who has the problem and does something about it.', 'Die held is die een wat die probleem het en iets daaraan doen.'] },
  { skill: 'story', ask: ['What makes a story exciting?', 'Wat maak ’n storie opwindend?'],
    choices: [['A problem to solve', '’n Probleem om op te los'], ['Lots of commas', 'Baie kommas'], ['A grey sky', '’n Grys lug']], right: 0,
    why: ['No problem, no story. “The cat sat” is not a story; “the cat was stuck” is.', 'Geen probleem, geen storie. “Die kat het gesit” is nie ’n storie nie; “die kat het vasgesit” is.'] },
  { skill: 'story', ask: ['What goes at the END?', 'Wat kom aan die EINDE?'],
    choices: [['How it all worked out', 'Hoe alles uitgewerk het'], ['The hero’s name', 'Die held se naam'], ['A new problem', '’n Nuwe probleem']], right: 0,
    why: ['The end is where the problem is sorted and everybody can breathe out.', 'Die einde is waar die probleem uitgesorteer is en almal kan asemhaal.'] },
  { skill: 'story', ask: ['What is a storyboard for?', 'Waarvoor is ’n storiebord?'],
    choices: [['Planning the pictures for every scene', 'Die prente vir elke toneel beplan'], ['Eating lunch', 'Middagete eet'], ['Cleaning the camera', 'Die kamera skoonmaak']], icons: ['📋🎨', '🥪', '🧼'], right: 0,
    why: ['Before a film is made, every scene is drawn small on a board. That is what Story Maker builds.', 'Voor ’n film gemaak word, word elke toneel klein op ’n bord geteken. Dis wat Storiemaker bou.'] },
  /* ── Video ─────────────────────────────────────────────────────────── */
  { skill: 'video', ask: ['What is a CUT?', 'Wat is ’n KNIP?'],
    choices: [['Jumping from one shot to the next', 'Spring van een skoot na die volgende'], ['A hole in the film', '’n Gat in die film'], ['Turning the sound off', 'Die klank afskakel']], right: 0,
    why: ['A cut is where one picture stops and the next one starts. Most films have hundreds.', '’n Knip is waar een prent ophou en die volgende een begin. Meeste flieks het honderde.'] },
  { skill: 'video', ask: ['What does a FADE do?', 'Wat doen ’n VERVAGING?'],
    choices: [['Slowly goes dark or slowly appears', 'Word stadig donker of verskyn stadig'], ['Makes it louder', 'Maak dit harder'], ['Makes it spin', 'Laat dit draai']], right: 0,
    why: ['A fade to black is the film saying “the end”, or “a bit later”.', '’n Vervaging na swart is die film wat sê “die einde”, of “’n bietjie later”.'] },
  { skill: 'video', ask: ['Music under a video is called the…', 'Musiek onder ’n video word die … genoem'],
    choices: [['Soundtrack', 'Klankbaan'], ['Caption', 'Byskrif'], ['Frame', 'Raam']], right: 0,
    why: ['The soundtrack is the music and sounds under the pictures. Your song can be one.', 'Die klankbaan is die musiek en klanke onder die prente. Jou liedjie kan een wees.'] },
  { skill: 'video', ask: ['Which is SHORTER?', 'Watter een is KORTER?'],
    choices: [['Ten seconds', 'Tien sekondes'], ['One minute', 'Een minuut']], right: 0,
    why: ['Ten seconds is a clip; a minute is six clips. Your videos here are ten seconds long.', 'Tien sekondes is ’n greep; ’n minuut is ses grepe. Jou video’s hier is tien sekondes lank.'] },
  /* ── Pictures ──────────────────────────────────────────────────────── */
  { skill: 'photo', ask: ['A picture that is too DARK needs more…', '’n Prent wat te DONKER is het meer … nodig'],
    choices: [['Light', 'Lig'], ['Corners', 'Hoeke'], ['Words', 'Woorde']], right: 0,
    why: ['Brightness is light. Turn it up and the dark picture wakes up.', 'Helderheid is lig. Draai dit op en die donker prent word wakker.'] },
  { skill: 'photo', ask: ['Red, yellow and blue are the…', 'Rooi, geel en blou is die …'],
    choices: [['Primary colours', 'Primêre kleure'], ['Shy colours', 'Skaam kleure'], ['Loud colours', 'Harde kleure']], right: 0,
    why: ['Mix them and you get every other colour. Red and yellow make orange.', 'Meng hulle en jy kry elke ander kleur. Rooi en geel maak oranje.'] },
  { skill: 'photo', ask: ['What does CROP mean?', 'Wat beteken SNY (crop)?'],
    choices: [['Cutting the edges off a picture', 'Die rande van ’n prent afsny'], ['Making it blurry', 'Dit wasig maak'], ['Adding a frame', '’n Raam byvoeg']], right: 0,
    why: ['Cropping cuts away the edges so the best bit is all you see.', 'Sny verwyder die rande sodat die beste deel al is wat jy sien.'] },
  { skill: 'photo', ask: ['Which shape is a square?', 'Watter vorm is ’n vierkant?'],
    choices: [['All four sides the same', 'Al vier kante dieselfde'], ['Two long sides, two short', 'Twee lang kante, twee kort'], ['Round', 'Rond']], right: 0,
    why: ['Your drawing board is a square: every side the same length.', 'Jou tekenbord is ’n vierkant: elke kant dieselfde lengte.'] },
];

export const SKILLS: readonly { readonly id: Skill; readonly icon: string; readonly says: Both }[] = [
  { id: 'music', icon: '🎵', says: ['Music', 'Musiek'] },
  { id: 'story', icon: '📖', says: ['Stories', 'Stories'] },
  { id: 'video', icon: '🎬', says: ['Video', 'Video'] },
  { id: 'photo', icon: '🖼️', says: ['Pictures', 'Prente'] },
];
