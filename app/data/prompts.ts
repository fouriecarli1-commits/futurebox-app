/**
 * The cards that remove the blank page.
 *
 * ── Where these come from and why they matter ────────────────────────────
 *
 * `docs/PACKAGING.md` §4, read off the screenshots Carli sent: a row of cards
 * above the feed, each one a sentence and an icon, and the app does the rest.
 * It is called the single best idea in those screenshots and it is, for a
 * reason that is not about design.
 *
 * Her complaint about the songs — "dit kom baie baie sleg uit" — was not only
 * about what this app sends the engine. It is also about what a person can
 * think of to type into an empty box under pressure. A generator is only as
 * good as the sentence it is given, and "write me a song" is the sentence
 * almost everybody gives it. A card that says *your plate, as a song* gets a
 * better song out of the same engine, because it got a better sentence in.
 *
 * ── What a card actually is ──────────────────────────────────────────────
 *
 * A label somebody presses, and an `idea` — one line of instruction sent to
 * `/api/photosong` alongside the picture. The route has taken an `idea` and
 * screened it since it was written, and nothing has ever sent one.
 *
 * The `idea` is written in English on purpose, for every card, including the
 * Afrikaans ones. It is an instruction to a model, not something a person
 * reads: the label is what they read and that is translated. Where the song
 * should be *in* Afrikaans, the idea says so in as many words rather than
 * relying on the label's language, because the label never reaches the model.
 *
 * ── Why half of them are South African ───────────────────────────────────
 *
 * "dit is waar ons nie met Suno kompeteer nie." Anybody can build a card that
 * says "turn a photo into a song". Nobody else is going to build one that
 * says *Ouma se kombuis*, and the person who presses it is not comparing this
 * app with Suno at that moment — they are thinking about their grandmother's
 * kitchen.
 */

export type PromptKind = 'photo' | 'talk';

export interface PromptCard {
  readonly id: string;
  readonly kind: PromptKind;
  /** What the person reads, in both languages. */
  readonly en: string;
  readonly af: string;
  /**
   * What the model is told, always in English.
   *
   * Never shown to anybody. It is allowed to be blunt about form — how long,
   * whose voice, what to avoid — in a way a label on a card cannot be.
   */
  readonly idea: string;
  /** South African cards are shown first to an Afrikaans reader. */
  readonly local?: boolean;
}

export const PROMPTS: readonly PromptCard[] = [
  /* ── Universal, from a photo ──────────────────────────────────────── */
  {
    id: 'any-photo',
    kind: 'photo',
    en: 'Turn any photo into a song',
    af: 'Maak enige foto ’n liedjie',
    idea: 'Write about whatever is actually in this picture. Do not reach for a metaphor before you have described the thing.',
  },
  {
    id: 'old-photo',
    kind: 'photo',
    en: 'Turn an old photo into a song',
    af: 'Maak ’n ou foto ’n liedjie',
    idea: 'This photograph is old. Write about the distance between then and now — what is still true and what is not. Do not say the word "memories".',
  },
  {
    id: 'vibe-colour',
    kind: 'photo',
    en: 'What colour is your vibe?',
    af: 'Watter kleur is jou gevoel?',
    idea: 'A selfie. Read the colour, the light and the expression, and write a song that sounds like that mood. Never describe the person’s body or face.',
  },
  {
    id: 'this-room',
    kind: 'photo',
    en: 'This room, as a mood',
    af: 'Hierdie kamer, as ’n gevoel',
    idea: 'A room. Write what it is like to be in it — the objects, the light, what somebody does in here. Not a description of furniture.',
  },
  {
    id: 'view-here',
    kind: 'photo',
    en: 'The view from right here',
    af: 'Die uitsig van hier af',
    idea: 'Whatever is in front of them right now. Write it as a song somebody sings standing still.',
  },
  {
    id: 'your-plate',
    kind: 'photo',
    en: 'Your plate, as a song',
    af: 'Jou bord, as ’n liedjie',
    idea: 'Food. Write about who made it, who it is for, or what it is standing in for. Not a recipe.',
  },
  {
    id: 'pet-theme',
    kind: 'photo',
    en: 'Your pet’s theme tune',
    af: 'Jou troeteldier se wysie',
    idea: 'An animal. Write its theme tune — its actual character, not a greeting card. It is allowed to be funny.',
  },
  {
    id: 'outfit-genre',
    kind: 'photo',
    en: 'This outfit, as a genre',
    af: 'Hierdie uitrusting, as ’n genre',
    idea: 'Clothes. Pick the genre the outfit belongs to and write the song that would play while somebody walked in wearing it.',
  },
  {
    id: 'receipt',
    kind: 'photo',
    en: 'The receipt song — what today cost you',
    af: 'Die strokie-liedjie — wat vandag jou gekos het',
    idea: 'A receipt or a bill. Write about what the day cost, in money and otherwise. Wry rather than bitter.',
  },
  {
    id: 'bookshelf',
    kind: 'photo',
    en: 'Your bookshelf, as an album',
    af: 'Jou boekrak, as ’n album',
    idea: 'Books or objects on a shelf. Write a song about the person these belong to, from what they kept. Never describe how anybody looks.',
  },
  {
    id: 'handwriting',
    kind: 'photo',
    en: 'Your handwriting, as a chorus',
    af: 'Jou handskrif, as ’n refrein',
    idea: 'A handwritten note. Use the words that are written there as the seed of the chorus. Keep their voice, not yours.',
  },
  {
    id: 'screenshot',
    kind: 'photo',
    en: 'Turn a screenshot of your chat into a song',
    af: 'Maak ’n skermskoot van jou geselsie ’n liedjie',
    idea: 'A conversation on a screen. Write the song of what was going on between these two people. Do not use anybody’s real name.',
  },

  /* ── South African, from a photo ──────────────────────────────────── */
  {
    id: 'braai',
    kind: 'photo',
    local: true,
    en: 'Braai song — show me the fire',
    af: 'Braai-liedjie — wys my die vuur',
    idea: 'A braai. Write it in Afrikaans. The fire, the waiting, who is standing around it. South African, not American barbecue.',
  },
  {
    id: 'pad-huis-toe',
    kind: 'photo',
    local: true,
    en: 'The road home, out of the car window',
    af: 'Die pad huis toe, uit die kar se venster',
    idea: 'A road, from inside a car. Write it in Afrikaans, as a driving song — the distance, the light, who is waiting at the end of it.',
  },
  {
    id: 'hoofstraat',
    kind: 'photo',
    local: true,
    en: 'Your town’s main street, as a song',
    af: 'Jou dorp se hoofstraat, as ’n liedjie',
    idea: 'A small-town street. Write it in Afrikaans. The shops, the people, what it is like to have grown up here.',
  },
  {
    id: 'ouma-kombuis',
    kind: 'photo',
    local: true,
    en: 'Ouma’s kitchen',
    af: 'Ouma se kombuis',
    idea: 'A kitchen. Write it in Afrikaans, warm and specific — the smells, the crockery, the person who stood here. Never describe how anybody looks, and never sentimental for its own sake.',
  },
  {
    id: 'boerekos',
    kind: 'photo',
    local: true,
    en: 'Boerekos, as a genre',
    af: 'Boerekos as ’n genre',
    idea: 'South African home cooking. Write it in Afrikaans. Decide what genre this food would be and write that song.',
  },
  {
    id: 'bakkie',
    kind: 'photo',
    local: true,
    en: 'Bakkie song',
    af: 'Bakkie-liedjie',
    idea: 'A bakkie. Write it in Afrikaans — what it carries, where it has been, who drives it.',
  },
  {
    id: 'span-kleure',
    kind: 'photo',
    local: true,
    en: 'Your team’s colours',
    af: 'Jou span se kleure',
    idea: 'Sport colours or a jersey. Write it in Afrikaans as a supporters’ song. Never name a real club or player.',
  },
  {
    id: 'die-see',
    kind: 'photo',
    local: true,
    en: 'The sea at your nearest beach',
    af: 'Die see by jou naaste strand',
    idea: 'The sea. Write it in Afrikaans. This particular coast, this particular day, not the idea of the ocean.',
  },
  {
    id: 'eerste-reen',
    kind: 'photo',
    local: true,
    en: 'The first rain',
    af: 'Die eerste reën',
    idea: 'Rain, or the ground after it. Write it in Afrikaans — the smell, the relief, what had been waiting for it.',
  },
  {
    id: 'jou-tuin',
    kind: 'photo',
    local: true,
    en: 'Your garden, this week',
    af: 'Jou tuin, hierdie week',
    idea: 'A garden. Write it in Afrikaans, about this week rather than the seasons in general.',
  },
  {
    id: 'matriekafskeid',
    kind: 'photo',
    local: true,
    en: 'Matric farewell — one photo, one song',
    af: 'Matriekafskeid — een foto, een liedjie',
    idea: 'A matric farewell. Write it in Afrikaans — the end of something, said by somebody who does not yet know what comes next.',
  },
  {
    id: 'eerste-skooldag',
    kind: 'photo',
    local: true,
    en: 'Your child’s first day of school',
    af: 'Jou kind se eerste skooldag',
    idea: 'A first day of school. Write it in Afrikaans, from the parent’s side. Never describe the child’s appearance.',
  },
  {
    id: 'kerk-sondag',
    kind: 'photo',
    local: true,
    en: 'Your church’s song for Sunday',
    af: 'Jou kerk se liedjie vir Sondag',
    idea: 'A church or a congregation. Write it in Afrikaans as a song a congregation could actually sing together. Plain, singable, no theology nobody agreed to.',
  },
  {
    id: 'ouma-resep',
    kind: 'photo',
    local: true,
    en: 'Ouma’s recipe, sung',
    af: 'Ouma se resep, gesing',
    idea: 'A handwritten recipe. Write it in Afrikaans, using the real steps as the verses. The chorus is who she made it for.',
  },

  /* ── By talking ───────────────────────────────────────────────────────
 
     The other half of §4. A different shape from the camera cards and worth
     saying why: a photograph is on the phone already, and a sentence has to
     be said out loud into a microphone, transcribed by a paid service, and
     only then turned into a song. It costs two credits and the card says so
     before it is pressed.
 
     Nobody has to type anything, which on a phone is the whole point. */
  {
    id: 'talk-my-day',
    kind: 'talk',
    local: true,
    en: 'Tell me about your day — I’ll sing it',
    af: 'Vertel my van jou dag — ek sing dit',
    idea: 'They are describing their own day. Keep the actual things that happened — the times, the places, the people. Write it in the language they spoke.',
  },
  {
    id: 'talk-traffic',
    kind: 'talk',
    local: true,
    en: 'Tell me about this morning’s traffic',
    af: 'Vertel my van vanoggend se verkeer',
    idea: 'They are complaining about traffic. Write it in the language they spoke, wry rather than bitter, and keep the specific road or the specific hold-up.',
  },
  {
    id: 'talk-mom',
    kind: 'talk',
    en: 'One thing your mother does',
    af: 'Een ding wat jou ma doen',
    idea: 'One habit of their mother’s, which they have just described. Build the whole song out of that one thing rather than around the idea of a mother. Never describe how anybody looks.',
  },
  {
    id: 'talk-miss',
    kind: 'talk',
    en: 'Describe the person you miss',
    af: 'Beskryf die mens vir wie jy verlang',
    idea: 'Somebody they miss. Use what they actually said about them. Never describe how anybody looks, and never invent a reason they are gone.',
  },
  {
    id: 'talk-blessing',
    kind: 'talk',
    local: true,
    en: 'Name the thing you need today',
    af: 'Noem die ding wat jy vandag nodig het',
    idea: 'Something they are asking for or hoping for. Write it in the language they spoke, plainly, without turning it into a sermon.',
  },
  {
    id: 'talk-bestie',
    kind: 'talk',
    en: 'Celebrate your best friend at full volume',
    af: 'Vier jou beste vriend op volle sterkte',
    idea: 'A friend. Loud, funny, specific to the things they said about this person. Never describe how anybody looks.',
  },
  {
    id: 'talk-love',
    kind: 'talk',
    en: 'A song for the person you love',
    af: '’n Liedjie vir die mens vir wie jy lief is',
    idea: 'Their partner. Use the ordinary specific thing they mentioned rather than the grand statement. Never describe anybody’s body or appearance.',
  },
];

/**
 * The cards, with the local ones first for an Afrikaans reader.
 *
 * Not filtered — an Afrikaans reader may well want "your plate, as a song",
 * and an English reader in Bellville may well want the braai one. Ordered,
 * because what is at the front of a row is what gets pressed.
 */
export function promptsFor(lang: 'en' | 'af', kind: PromptKind = 'photo'): PromptCard[] {
  const mine = PROMPTS.filter((one) => one.kind === kind);
  if (lang !== 'af') return mine;
  return [...mine.filter((one) => one.local), ...mine.filter((one) => !one.local)];
}
