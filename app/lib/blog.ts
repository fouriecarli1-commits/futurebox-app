/**
 * The articles: how each thing in this app actually works.
 *
 * ── What she asked ───────────────────────────────────────────────────────
 *
 * Carli, 10 October 2026: *"Ek besef ook in spotlight gaan ons 'n Blog ook
 * moet hê, daarin sal ek artikels moet deel oor hoe die verskillende funksies
 * in die app werk."*
 *
 * So these are not news and not a feed. They are evergreen pieces about how a
 * room works, written to be found by somebody who has not signed up yet and
 * read again by somebody who has.
 *
 * ── Why they live in the repository and not in a database ────────────────
 *
 * Three reasons, and the third is the one that decides it.
 *
 * They are about the code. An article explaining the Pro Booth is a document
 * that goes wrong when the Pro Booth changes, and the only way to notice that
 * is to hold the two against each other — which `check:blog` does, by refusing
 * an article that points at a room or a control the app does not have. Nothing
 * in a database can be checked by a build.
 *
 * They are in two languages, like every other word in this app. A database of
 * articles is a second translation system beside `i18n.tsx`, with its own gaps
 * and its own silence about them.
 *
 * And **she is the only author.** A content store earns its keep when several
 * people write at different times; one person who already works by asking for
 * a change and getting a commit is served better by the article being a
 * commit. If that stops being true, this file is the thing to replace, and
 * nothing else has to move.
 *
 * ── The one rule for writing one ─────────────────────────────────────────
 *
 * Every article names the room it is about, and that name has to be a real
 * surface. An article about a feature that does not exist is the single worst
 * thing this file could hold: it is the landing page promising something, and
 * the person finds out on the second click. `check:blog` is what stops it.
 */

import type { SurfaceId } from './surfaces';

/** One paragraph, in both languages, as `t` takes them. */
export type Said = readonly [key: string, en: string, af: string];

export interface Piece {
  /** The url: `/blog/<id>`. Lower case, dashes, never changed once published. */
  readonly id: string;
  readonly title: Said;
  /** One sentence under the title, on the index and in the search result. */
  readonly blurb: Said;
  /**
   * The room this is about.
   *
   * Held against `SURFACE_IDS` by the check, so an article cannot describe a
   * room that is not there. `null` for a piece about the whole app.
   */
  readonly about: SurfaceId | null;
  /** When it was written. Newest first on the index. */
  readonly on: string;
  /**
   * The controls this article tells somebody to press, as i18n keys.
   *
   * ── This is the whole reason the articles are in the repository ────────
   *
   * An article that says "press Add one under Blur a patch" is a document
   * that goes wrong the day that button is renamed, and the way it goes wrong
   * is the worst kind: the article still reads perfectly, and the person
   * following it cannot find the button. Nobody reports that — they assume
   * they are looking in the wrong place.
   *
   * So every control an article names is listed here, and `check:blog`
   * refuses a key the dictionary does not have. Rename a button and the
   * article fails the build; remove a feature and the article fails the
   * build. It is the same trick `check:findable` and `check:handover` use,
   * applied to prose written for members instead of for an attorney.
   */
  readonly needs: readonly string[];
  /** The body. A heading is a paragraph that starts with `## `. */
  readonly body: readonly Said[];
}

export const PIECES: readonly Piece[] = [
  {
    id: 'hide-a-face-in-a-video',
    about: 'videoedit',
    on: '2026-10-10',
    needs: [
      'blur.title', 'blur.add', 'blur.how.soft', 'blur.how.misty', 'blur.how.gone',
      'blur.round', 'blur.square', 'adj.sharp', 'edit.look',
    ],
    title: [
      'blog.blur.title',
      'How to hide a face in a video',
      'Hoe om ’n gesig in ’n video weg te steek',
    ],
    blurb: [
      'blog.blur.blurb',
      'Somebody walked through your shot, or a number plate is readable. One patch, dragged onto it.',
      'Iemand het deur jou skoot geloop, of ’n nommerplaat is leesbaar. Een kol, gesleep op die ding.',
    ],
    body: [
      [
        'blog.blur.one',
        'There are two blurs in the video editor and they do different jobs. The dial under Look softens the whole frame, which is a mood — a dream, a wash behind a title. It cannot hide anything, because everything behind it is softened equally and your eye fills in the rest.',
        'Daar is twee vervagings in die video-redigeerder en hulle doen verskillende werk. Die knop onder Voorkoms versag die hele raam, wat ’n gevoel is — ’n droom, ’n newel agter ’n titel. Dit kan niks wegsteek nie, want alles daaragter word gelykop versag en jou oog vul die res in.',
      ],
      [
        'blog.blur.two',
        '## The patch',
        '## Die kol',
      ],
      [
        'blog.blur.three',
        'Open the Look bench on the shot you want to fix and press Add one under Blur a patch. A round patch appears in the middle of the picture. Drag it onto the face and pull its corner until it covers the whole head — a patch that covers most of a face is a face.',
        'Maak die Voorkoms-bank op die skoot oop wat jy wil regmaak en druk Voeg een by onder Vervaag ’n kol. ’n Ronde kol verskyn in die middel van die prent. Sleep dit op die gesig en trek sy hoek totdat dit die hele kop dek — ’n kol wat die meeste van ’n gesig dek, is ’n gesig.',
      ],
      [
        'blog.blur.four',
        'Soft, Misty and Gone are how hard it blurs. Misty is the one to use: it is past recognisable at any size of film. Soft is for something you want hinted at rather than hidden, and Gone is a smear.',
        'Sag, Newelig en Weg is hoe hard dit vervaag. Newelig is die een om te gebruik: dit is verby herkenbaar op enige grootte fliek. Sag is vir iets wat jy eerder wil aandui as wegsteek, en Weg is ’n smeer.',
      ],
      [
        'blog.blur.five',
        'Round or Square is the button beside them. A face is round; a number plate, a screen or a name on a parcel is square.',
        'Rond of Vierkant is die knoppie langs hulle. ’n Gesig is rond; ’n nommerplaat, ’n skerm of ’n naam op ’n pakkie is vierkantig.',
      ],
      [
        'blog.blur.six',
        '## What to watch for',
        '## Waarop om te let',
      ],
      [
        'blog.blur.seven',
        'A patch does not follow anything. It sits where you put it for as long as that shot is on screen, so a person who walks across the frame needs the shot cut into two or three pieces with a patch on each. That is a real limitation and it is better to know it now than to find it in the finished film.',
        '’n Kol volg niks nie. Dit sit waar jy dit sit solank daardie skoot op die skerm is, so ’n mens wat oor die raam stap het die skoot in twee of drie stukke nodig met ’n kol op elkeen. Dit is ’n werklike beperking en dit is beter om dit nou te weet as om dit in die klaar fliek te kry.',
      ],
      [
        'blog.blur.eight',
        'What you see on the glass is what lands in the file. The blur is measured as a share of the frame rather than in pixels, so a patch placed on a phone preview is the same patch in a 1080 export — which is not automatic, and was worth getting right.',
        'Wat jy op die glas sien, is wat in die lêer land. Die vervaging word as ’n deel van die raam gemeet eerder as in pixels, so ’n kol wat op ’n foonvoorskou geplaas word, is dieselfde kol in ’n 1080-uitvoer — wat nie outomaties is nie, en werd was om reg te kry.',
      ],
    ],
  },
  {
    id: 'what-the-pro-booth-is-for',
    about: 'booth',
    on: '2026-10-09',
    needs: [
      'pro.laneName', 'pro.laneNameHint', 'pro.marks', 'pro.save', 'pro.saveWav',
      'pro.saveMidi', 'pro.midiHeard', 'pro.midiExact', 'pro.mute', 'pro.solo',
    ],
    title: [
      'blog.booth.title',
      'What the Pro Booth is for',
      'Waarvoor die Pro-hokkie is',
    ],
    blurb: [
      'blog.booth.blurb',
      'Lanes, a level and a place in time for each one, and a mix that is yours rather than the app’s.',
      'Bane, ’n vlak en ’n plek in tyd vir elkeen, en ’n mengsel wat joune is eerder as die toep se een.',
    ],
    body: [
      [
        'blog.booth.one',
        'The ordinary booth is built around one voice over one song, which is the right shape for singing along to something you have just made. It is the wrong shape for a musician, who wants a lead, a double, a harmony, a guitar recorded on a phone and a part they generated — each with its own level, its own place in time, its own mute and solo.',
        'Die gewone hokkie is om een stem oor een liedjie gebou, wat die regte vorm is om saam te sing met iets wat jy pas gemaak het. Dit is die verkeerde vorm vir ’n musikant, wat ’n hoofstem, ’n dubbel, ’n harmonie, ’n kitaar op ’n foon opgeneem en ’n deel wat hulle gegenereer het wil hê — elkeen met sy eie vlak, sy eie plek in tyd, sy eie demp en solo.',
      ],
      [
        'blog.booth.two',
        'What it deliberately is not is a digital audio workstation. There is no automation and no bus routing, and drawing knobs that do nothing would be worse than leaving them out. Everything on the screen is real: every fader, every mute and every offset is in the file that comes out the other end.',
        'Wat dit doelbewus nie is nie, is ’n digitale klankwerkstasie. Daar is geen outomatisering en geen bus-roetering nie, en om knoppe te teken wat niks doen nie sou erger wees as om hulle uit te laat. Alles op die skerm is eg: elke skuifbalk, elke demp en elke verskuiwing is in die lêer wat aan die ander kant uitkom.',
      ],
      [
        'blog.booth.three',
        '## Naming your tracks',
        '## Om jou bane te benoem',
      ],
      [
        'blog.booth.four',
        'Every lane has a name field with the instrument names in it as a hint. Use it. Eleven lanes called Take 1 to Take 11 is a session you cannot work in, and the name goes into the file when you download a lane as MIDI as well.',
        'Elke baan het ’n naamveld met die instrumentname as ’n wenk daarin. Gebruik dit. Elf bane wat Opname 1 tot Opname 11 heet, is ’n sessie waarin jy nie kan werk nie, en die naam gaan ook in die lêer wanneer jy ’n baan as MIDI aflaai.',
      ],
      [
        'blog.booth.five',
        '## Where a lane changes',
        '## Waar ’n baan verander',
      ],
      [
        'blog.booth.six',
        'The blue triangle in a lane’s gutter listens to that lane and marks where the music turns over — a section, a key, a new instrument coming in. The marks appear along the foot of its block with a line down to the exact moment. It costs nothing and nothing is sent anywhere: the measuring happens on your own device.',
        'Die blou driehoekie in ’n baan se kantstrook luister na daardie baan en merk waar die musiek omdraai — ’n gedeelte, ’n toonaard, ’n nuwe instrument wat inkom. Die merke verskyn langs die onderkant van sy blok met ’n lyn af na die presiese oomblik. Dit kos niks en niks word enige plek gestuur nie: die meting gebeur op jou eie toestel.',
      ],
      [
        'blog.booth.seven',
        '## Taking a sound to another project',
        '## Om ’n klank na ’n ander projek te neem',
      ],
      [
        'blog.booth.eight',
        'Each lane has a Take this lane away menu with a WAV and a MIDI in it. The WAV is the sound as you cut it, through its amp — the level and the pan belong to this song’s balance and do not travel with it. The MIDI is the notes, and the menu tells you which of two kinds you are getting: a lane the booth built from a hum carries the notes it was built from, so its MIDI is exact. Anything else has to be listened to, one line at a time, so a chord comes out as a single note. Use it for a bass, a melody or a hummed beat, and not for a full mix.',
        'Elke baan het ’n Vat hierdie baan weg-kieslys met ’n WAV en ’n MIDI daarin. Die WAV is die klank soos jy dit gesny het, deur sy versterker — die vlak en die kant behoort aan hierdie liedjie se balans en gaan nie saam nie. Die MIDI is die note, en die kieslys sê vir jou watter van twee soorte jy kry: ’n baan wat die hokkie uit ’n geneurie gebou het, dra die note waaruit dit gebou is, so sy MIDI is presies. Enigiets anders moet beluister word, een lyn op ’n keer, so ’n akkoord kom as een noot uit. Gebruik dit vir ’n bas, ’n melodie of ’n geneurie maat, en nie vir ’n vol mengsel nie.',
      ],
    ],
  },
  {
    id: 'simple-or-everything',
    about: 'make',
    on: '2026-10-10',
    needs: [
      'make.modeSimple', 'make.modeAll', 'make.inForce', 'make.simpleSay',
      'canvas.modeSimple', 'canvas.modeAll', 'canvas.inForce', 'canvas.unquoted',
    ],
    title: [
      'blog.simple.title',
      'Simple or Everything',
      'Eenvoudig of Alles',
    ],
    blurb: [
      'blog.simple.blurb',
      'Two ways into the same room. Neither of them switches anything off.',
      'Twee maniere in dieselfde kamer in. Nie een van hulle skakel enigiets af nie.',
    ],
    body: [
      [
        'blog.simple.one',
        'Make a song and the video desk each open with one choice at the top: Simple or Everything. It is worth knowing exactly what the difference is, because it is not what most apps mean by a simple mode.',
        'Maak ’n liedjie en die videowerkblad maak elkeen met een keuse boaan oop: Eenvoudig of Alles. Dit is werd om te weet wat die verskil presies is, want dit is nie wat die meeste toeps met ’n eenvoudige modus bedoel nie.',
      ],
      [
        'blog.simple.two',
        'Simple is the copilot and one button. You tell it what you want — "a happy song about my dog", in any language — and it writes the words, the style, the voice and the length. Then you press the button. What it has written is shown above the button, read-only, so you can see what you are about to pay for.',
        'Eenvoudig is die medevlieênier en een knoppie. Jy sê vir hom wat jy wil hê — "’n gelukkige liedjie oor my hond", in enige taal — en hy skryf die woorde, die styl, die stem en die lengte. Dan druk jy die knoppie. Wat hy geskryf het, word bo die knoppie gewys, net om te lees, sodat jy kan sien waarvoor jy gaan betaal.',
      ],
      [
        'blog.simple.three',
        'Everything opens the whole desk: every field, every choice, the storyboard, the lot.',
        'Alles maak die hele werkblad oop: elke veld, elke keuse, die draaiboek, alles.',
      ],
      [
        'blog.simple.four',
        '## Simple does not take anything away',
        '## Eenvoudig neem niks weg nie',
      ],
      [
        'blog.simple.five',
        'This is the part worth reading twice. Simple HIDES the controls; it does not reset them. A length, a key, a trained sound or a quality grade you set in Everything still goes to the engine when you press the button in Simple — so the room prints a line under the switch saying what is still set. A setting that applies while its control is out of sight is worse than a crowded screen.',
        'Dit is die deel wat dit werd is om twee keer te lees. Eenvoudig STEEK die kontroles weg; dit stel hulle nie terug nie. ’n Lengte, ’n toonaard, ’n afgerigte klank of ’n gehaltegraad wat jy in Alles gestel het, gaan steeds na die enjin wanneer jy die knoppie in Eenvoudig druk — so die kamer druk ’n reël onder die skakelaar wat sê wat steeds gestel is. ’n Instelling wat geld terwyl sy kontrole uit die oog is, is erger as ’n vol skerm.',
      ],
      [
        'blog.simple.six',
        'On the video desk there is one more thing Simple keeps: the quotation-mark rule. Anything you write in quotation marks is spoken aloud by the engine. Write a line without them and it comes back drawn at rather than said — the clip looks finished and the thing you made it for is missing. That warning follows you into Simple, because it is the one fault on that desk that is completely silent.',
        'Op die videowerkblad is daar nog een ding wat Eenvoudig hou: die aanhalingstekenreël. Enigiets wat jy tussen aanhalingstekens skryf, word deur die enjin hardop gesê. Skryf ’n sin daarsonder en dit kom terug geteken eerder as gesê — die greep lyk klaar en die ding waarvoor jy dit gemaak het, is weg. Daardie waarskuwing volg jou in Eenvoudig in, want dit is die een fout op daardie werkblad wat heeltemal stil is.',
      ],
      [
        'blog.simple.seven',
        'Whichever you pick is remembered, so somebody who has gone looking for the controls once does not have to go looking again.',
        'Watter een jy ook al kies, word onthou, sodat iemand wat een keer na die kontroles gaan soek het, nie weer hoef te gaan soek nie.',
      ],
    ],
  },
];

/** One piece by its url, or nothing. */
export const pieceById = (id: string): Piece | undefined =>
  PIECES.find((one) => one.id === id);

/** Newest first, which is the order the index reads in. */
export const inOrder = (): readonly Piece[] =>
  [...PIECES].sort((a, b) => b.on.localeCompare(a.on));

/**
 * One paragraph in the language being read.
 *
 * ── Why this and not `t()` ───────────────────────────────────────────────
 *
 * Because the Afrikaans is right here. Handing these to `t(key, english)`
 * would mean every title, blurb and paragraph also living in `i18n.tsx` — the
 * same sentence in two files, which is two places to change it and one place
 * to forget. And the failure is silent: a key the dictionary has never heard
 * of falls back to the English, so an Afrikaans reader gets an English
 * article and nothing anywhere says so.
 *
 * `check:blog` holds both halves of every tuple instead, which is the thing
 * `check:afrikaans` does for the dictionary and cannot do for these — the key
 * is an array index here, so its scan cannot see them.
 */
export function saidIn(said: Said, lang: string): string {
  return lang === 'af' && said[2].trim() ? said[2] : said[1];
}

/** Whether a paragraph is a heading rather than prose. */
export const isHeading = (said: Said): boolean => said[1].startsWith('## ');

/** A heading without its marks, in the language being read. */
export const headingOf = (said: Said, lang: string): string =>
  saidIn(said, lang).replace(/^##\s*/, '');
