/**
 * One music question every time you come back.
 *
 * ── What Carli asked for, 10 September 2026 ──────────────────────────────
 *
 * "add to the bottom of the creative page everytime someone logs in a quiz
 *  about music knowledge with a tick box of answers. and then reveal the
 *  answer at the end. to teach people music knowledge"
 *
 * ── Why the explanation is the whole thing ───────────────────────────────
 *
 * A quiz that says right or wrong teaches nobody anything. Somebody who
 * guesses correctly learns as little as somebody who guesses wrong, and both
 * of them close the card. So every question carries a `why` — one or two
 * sentences saying what the answer means and, wherever it is possible, what
 * to DO with it in this app. That sentence is the feature. The tick boxes are
 * how somebody is made to commit to an answer before reading it, which is the
 * only reason a quiz beats a list of facts.
 *
 * ── Written for somebody making a song, not for a music exam ─────────────
 *
 * Every question here is one that changes a decision on a screen in this app:
 * what to type into "How should it sound?", what the speed slider means, why
 * a chorus is written the way it is. Nothing is here because it is a fact
 * about music. "Who wrote the Brandenburg Concertos" is a fact about music
 * and it would tell somebody nothing about their own song.
 *
 * ── Afrikaans is written, not translated ─────────────────────────────────
 *
 * These are hand-written in both languages rather than run through a model,
 * which is why `afrikaansrule.ts` does not apply: there is no prompt here to
 * warn off Dutch. Where a term is genuinely English in Afrikaans studio talk
 * — "hook", "stems" — it stays English, because inventing an Afrikaans word
 * nobody uses would make the answer wrong in a different way.
 */

export interface QuizQuestion {
  /** Stable. It is written into the browser so a question is not repeated. */
  readonly id: string;
  readonly ask: { readonly en: string; readonly af: string };
  readonly options: readonly { readonly en: string; readonly af: string }[];
  /** Which option is right, counting from nought. */
  readonly answer: number;
  /** What it means, and what to do with it. The reason this exists. */
  readonly why: { readonly en: string; readonly af: string };
}

export const QUIZ: readonly QuizQuestion[] = [
  {
    id: 'bars-44',
    ask: { en: 'How many beats are in one bar of 4/4?', af: 'Hoeveel maatslae is daar in een maat van 4/4?' },
    options: [
      { en: 'Four', af: 'Vier' },
      { en: 'Three', af: 'Drie' },
      { en: 'Eight', af: 'Agt' },
      { en: 'It depends on the tempo', af: 'Dit hang van die tempo af' },
    ],
    answer: 0,
    why: {
      en: 'Four, and the tempo has nothing to do with it — tempo says how fast the four go by. Nearly all pop, hip-hop, house and gospel is in 4/4, which is why a section that feels "one beat short" usually is.',
      af: 'Vier, en die tempo het niks daarmee te doen nie — tempo sê net hoe vinnig die vier verbygaan. Byna alle pop, hip-hop, house en gospel is in 4/4, en dit is hoekom ’n deel wat voel of dit “een slag kort” is, gewoonlik wél is.',
    },
  },
  {
    id: 'waltz',
    ask: { en: 'A waltz is in which time signature?', af: 'In watter maatsoort is ’n wals?' },
    options: [
      { en: '4/4', af: '4/4' },
      { en: '3/4', af: '3/4' },
      { en: '6/8', af: '6/8' },
      { en: '2/4', af: '2/4' },
    ],
    answer: 1,
    why: {
      en: 'Three beats to a bar — ONE two three, ONE two three. Ask for "a waltz" or "3/4" in the sound box and you get that lilt; a boeremusiek wals lives here.',
      af: 'Drie slae per maat — EEN twee drie, EEN twee drie. Vra vir “wals” of “3/4” in die klankblokkie en jy kry daardie swaai; ’n boeremusiek-wals leef hier.',
    },
  },
  {
    id: 'bpm',
    ask: { en: 'The speed slider says 112 BPM. What is it counting?', af: 'Die spoedskuiwer sê 112 BPM. Wat tel dit?' },
    options: [
      { en: 'Bars per minute', af: 'Mate per minuut' },
      { en: 'Notes per minute', af: 'Note per minuut' },
      { en: 'Beats per minute', af: 'Maatslae per minuut' },
      { en: 'Seconds in the song', af: 'Sekondes in die liedjie' },
    ],
    answer: 2,
    why: {
      en: 'Beats per minute. At 112 there are 112 beats in a minute, so 28 bars of 4/4. A ballad sits near 70, house near 124, amapiano near 112.',
      af: 'Maatslae per minuut. By 112 is daar 112 slae in ’n minuut, dus 28 mate van 4/4. ’n Ballade sit naby 70, house naby 124, amapiano naby 112.',
    },
  },
  {
    id: 'relative-minor',
    ask: { en: 'What is the relative minor of C major?', af: 'Wat is die relatiewe mineur van C-majeur?' },
    options: [
      { en: 'E minor', af: 'E-mineur' },
      { en: 'C minor', af: 'C-mineur' },
      { en: 'G minor', af: 'G-mineur' },
      { en: 'A minor', af: 'A-mineur' },
    ],
    answer: 3,
    why: {
      en: 'A minor — the same notes, started three semitones lower. It is why a song can turn sad without changing a single chord shape: three down from any major gives you its minor.',
      af: 'A-mineur — dieselfde note, net drie halftone laer begin. Dit is hoekom ’n liedjie hartseer kan raak sonder dat een akkoordvorm verander: drie af van enige majeur gee jou sy mineur.',
    },
  },
  {
    id: 'four-chords',
    ask: { en: 'I–V–vi–IV is the most used chord run in pop. In C, what is it?', af: 'I–V–vi–IV is die mees gebruikte akkoordloop in pop. In C, wat is dit?' },
    options: [
      { en: 'C – G – Am – F', af: 'C – G – Am – F' },
      { en: 'C – F – G – Am', af: 'C – F – G – Am' },
      { en: 'C – Dm – Em – F', af: 'C – Dm – Em – F' },
      { en: 'C – Am – F – G', af: 'C – Am – F – G' },
    ],
    answer: 0,
    why: {
      en: 'C, G, A minor, F. Hundreds of hits run on it. Typing "I–V–vi–IV" into the sound box is a faster way to say "make it feel familiar" than any adjective.',
      af: 'C, G, A-mineur, F. Honderde treffers loop daarop. Om “I–V–vi–IV” in die klankblokkie te tik, sê vinniger “laat dit bekend voel” as enige byvoeglike naamwoord.',
    },
  },
  {
    id: 'hook',
    ask: { en: 'What is a hook?', af: 'Wat is ’n hook?' },
    options: [
      { en: 'The first line of the song', af: 'Die eerste sin van die liedjie' },
      { en: 'The bit somebody sings back at you afterwards', af: 'Die stukkie wat iemand agterna vir jou terugsing' },
      { en: 'The loudest part', af: 'Die hardste deel' },
      { en: 'The guitar solo', af: 'Die kitaarsolo' },
    ],
    answer: 1,
    why: {
      en: 'The bit that sticks. It is usually short, usually repeated, and often carries the title. If nothing in your song survives one listen, it has no hook yet — and that is a writing problem, not a mixing one.',
      af: 'Die stukkie wat vassteek. Dit is gewoonlik kort, gewoonlik herhaal, en dra dikwels die titel. As niks in jou liedjie een luister oorleef nie, het dit nog nie ’n hook nie — en dít is ’n skryfprobleem, nie ’n mengprobleem nie.',
    },
  },
  {
    id: 'prechorus',
    ask: { en: 'What is a pre-chorus for?', af: 'Waarvoor is ’n voor-koor (pre-chorus)?' },
    options: [
      { en: 'To repeat the verse', af: 'Om die vers te herhaal' },
      { en: 'To give the singer a rest', af: 'Om die sanger ’n blaaskans te gee' },
      { en: 'To lift into the chorus so it lands harder', af: 'Om op te bou na die koor sodat dit harder land' },
      { en: 'To end the song', af: 'Om die liedjie te eindig' },
    ],
    answer: 2,
    why: {
      en: 'It builds. Two or four rising lines that make the chorus feel earned instead of merely next. Leave it out and a chorus often feels like it arrived too early.',
      af: 'Dit bou op. Twee of vier stygende reëls wat die koor laat voel of dit verdien is eerder as bloot volgende. Los dit uit en ’n koor voel dikwels of dit te vroeg gekom het.',
    },
  },
  {
    id: 'bridge',
    ask: { en: 'What does a bridge do in a song?', af: 'Wat doen ’n brug in ’n liedjie?' },
    options: [
      { en: 'Repeats the chorus louder', af: 'Herhaal die koor harder' },
      { en: 'Is the same as an outro', af: 'Is dieselfde as ’n uittro' },
      { en: 'Introduces the song', af: 'Stel die liedjie bekend' },
      { en: 'Goes somewhere new before the last chorus', af: 'Gaan iewers nuuts heen voor die laaste koor' },
    ],
    answer: 3,
    why: {
      en: 'It changes something — the chords, the point of view, the energy — so the final chorus feels like a return rather than a fourth repeat. Songs that get boring at two minutes are usually missing one.',
      af: 'Dit verander iets — die akkoorde, die standpunt, die energie — sodat die laaste koor soos ’n terugkeer voel eerder as ’n vierde herhaling. Liedjies wat by twee minute vervelig raak, kort gewoonlik een.',
    },
  },
  {
    id: 'compression',
    ask: { en: 'What does a compressor do?', af: 'Wat doen ’n kompressor?' },
    options: [
      { en: 'Narrows the gap between the loudest and softest parts', af: 'Maak die gaping tussen die hardste en sagste dele kleiner' },
      { en: 'Makes the file smaller', af: 'Maak die lêer kleiner' },
      { en: 'Removes background noise', af: 'Haal agtergrondgeraas weg' },
      { en: 'Adds echo', af: 'Voeg eggo by' },
    ],
    answer: 0,
    why: {
      en: 'It evens out the loud and soft. That is why a compressed vocal sits steadily on top of a track instead of disappearing on the quiet words. It is not the same thing as an MP3, which is a smaller FILE — the words look alike and mean nothing like each other.',
      af: 'Dit maak hard en sag gelyker. Dit is hoekom ’n gekomprimeerde sangstem stewig bo-op ’n snit sit in plaas van om op die sagte woorde te verdwyn. Dit is nie dieselfde as ’n MP3 nie, wat ’n kleiner lêer is — die woorde lyk eenders en beteken niks eenders nie.',
    },
  },
  {
    id: 'reverb-delay',
    ask: { en: 'What is the difference between reverb and delay?', af: 'Wat is die verskil tussen reverb en delay?' },
    options: [
      { en: 'They are two words for the same thing', af: 'Dit is twee woorde vir dieselfde ding' },
      { en: 'Reverb is a room, delay is repeats you can count', af: 'Reverb is ’n vertrek, delay is herhalings wat jy kan tel' },
      { en: 'Reverb is louder', af: 'Reverb is harder' },
      { en: 'Delay only works on drums', af: 'Delay werk net op tromme' },
    ],
    answer: 1,
    why: {
      en: 'Reverb is the sound of a space — a hall, a church, a tiled bathroom. Delay is distinct repeats, spaced in time. Ask for "big reverb" and you get a room; ask for "slapback delay" and you get rockabilly.',
      af: 'Reverb is die klank van ’n ruimte — ’n saal, ’n kerk, ’n badkamer met teëls. Delay is aparte herhalings, in tyd gespasieer. Vra vir “groot reverb” en jy kry ’n vertrek; vra vir “slapback delay” en jy kry rockabilly.',
    },
  },
  {
    id: 'stems',
    ask: { en: 'What are stems?', af: 'Wat is stems (stamme)?' },
    options: [
      { en: 'A shorter version for radio', af: '’n Korter weergawe vir radio' },
      { en: 'The lyrics without music', af: 'Die woorde sonder musiek' },
      { en: 'The song split into separate parts — vocal, drums, bass', af: 'Die liedjie in aparte dele gesplits — sang, tromme, bas' },
      { en: 'The chords written down', af: 'Die akkoorde neergeskryf' },
    ],
    answer: 2,
    why: {
      en: 'The parts, separated. This app can split a finished song into them, which is how you lift a vocal off a track to sing over it, or turn the drums down without touching anything else.',
      af: 'Die dele, geskei. Hierdie app kan ’n klaar liedjie daarin split, en dit is hoe jy ’n sangstem van ’n snit aflig om oor te sing, of die tromme afdraai sonder om aan iets anders te raak.',
    },
  },
  {
    id: 'clipping',
    ask: { en: 'Your recording sounds crackly and harsh on the loud words. What most likely happened?', af: 'Jou opname klink kraakerig en skerp op die harde woorde. Wat het waarskynlik gebeur?' },
    options: [
      { en: 'The microphone is broken', af: 'Die mikrofoon is stukkend' },
      { en: 'The file is too small', af: 'Die lêer is te klein' },
      { en: 'The room is too quiet', af: 'Die vertrek is te stil' },
      { en: 'It clipped — the signal went past the ceiling', af: 'Dit het geklip — die sein het bo die plafon gegaan' },
    ],
    answer: 3,
    why: {
      en: 'Clipping. Digital audio has a hard ceiling and anything past it is simply chopped off, which is what the crackle is. It cannot be fixed afterwards — record it again, quieter. Leaving space below the ceiling is called headroom.',
      af: 'Klipping. Digitale klank het ’n harde plafon en enigiets daarbo word eenvoudig afgekap — dít is die gekraak. Dit kan nie agterna reggemaak word nie; neem dit sagter weer op. Die spasie wat jy onder die plafon los, heet headroom.',
    },
  },
  {
    id: 'amapiano',
    ask: { en: 'Which sound is amapiano built around?', af: 'Om watter klank is amapiano gebou?' },
    options: [
      { en: 'The log drum', af: 'Die log drum' },
      { en: 'The banjo', af: 'Die banjo' },
      { en: 'The trumpet', af: 'Die trompet' },
      { en: 'The accordion', af: 'Die trekklavier' },
    ],
    answer: 0,
    why: {
      en: 'The log drum — that deep, bending bass hit that answers the kick. It is the one word that gets you an amapiano track instead of generic house, and it belongs near the front of your style line.',
      af: 'Die log drum — daardie diep, buigende basslag wat die kick antwoord. Dit is die een woord wat jou ’n amapiano-snit gee eerder as gewone house, en dit hoort naby die voorkant van jou stylreël.',
    },
  },
  {
    id: 'boeremusiek',
    ask: { en: 'Which instrument leads traditional boeremusiek?', af: 'Watter instrument lei tradisionele boeremusiek?' },
    options: [
      { en: 'The saxophone', af: 'Die saksofoon' },
      { en: 'The concertina', af: 'Die konsertina' },
      { en: 'The electric guitar', af: 'Die elektriese kitaar' },
      { en: 'The piano', af: 'Die klavier' },
    ],
    answer: 1,
    why: {
      en: 'The concertina, usually with a guitar and a bass behind it. Naming the instrument gets you closer than naming the genre, because a model knows what a concertina sounds like more reliably than it knows what boeremusiek is.',
      af: 'Die konsertina, gewoonlik met ’n kitaar en ’n bas daaragter. Om die instrument te noem, bring jou nader as om die genre te noem — ’n model weet betroubaarder hoe ’n konsertina klink as wat dit weet wat boeremusiek is.',
    },
  },
  {
    id: 'syncopation',
    ask: { en: 'What is syncopation?', af: 'Wat is sinkopasie?' },
    options: [
      { en: 'Playing faster than the tempo', af: 'Om vinniger as die tempo te speel' },
      { en: 'Playing two keys at once', af: 'Om twee toonsoorte gelyk te speel' },
      { en: 'Accenting the off-beats instead of the main beats', af: 'Om die tussenslae te beklemtoon in plaas van die hoofslae' },
      { en: 'Singing without music', af: 'Om sonder musiek te sing' },
    ],
    answer: 2,
    why: {
      en: 'Landing where the beat is not. It is most of what makes music feel like it grooves rather than marches — kwaito, funk and amapiano are built on it.',
      af: 'Om te land waar die slag nié is nie. Dit is die meeste van wat musiek laat groove eerder as marsjeer — kwaito, funk en amapiano is daarop gebou.',
    },
  },
  {
    id: 'octave',
    ask: { en: 'Two notes an octave apart are…', af: 'Twee note ’n oktaaf uitmekaar is…' },
    options: [
      { en: 'Completely unrelated', af: 'Heeltemal onverwant' },
      { en: 'A semitone apart', af: '’n Halftoon uitmekaar' },
      { en: 'Always dissonant', af: 'Altyd dissonant' },
      { en: 'The same note, one twice as high as the other', af: 'Dieselfde noot, een twee keer so hoog as die ander' },
    ],
    answer: 3,
    why: {
      en: 'The same note, double the frequency. That is why a man and a woman singing "the same" line often are an octave apart and it still sounds like unison — and why a melody too high to sing usually just needs dropping an octave.',
      af: 'Dieselfde noot, dubbel die frekwensie. Dít is hoekom ’n man en ’n vrou wat “dieselfde” reël sing dikwels ’n oktaaf uitmekaar is en dit steeds soos eenstemmigheid klink — en hoekom ’n melodie wat te hoog is om te sing, gewoonlik net ’n oktaaf laer moet.',
    },
  },
  {
    id: 'transpose',
    ask: { en: 'A song is too high for you to sing. What do you ask for?', af: '’n Liedjie is te hoog vir jou om te sing. Wat vra jy?' },
    options: [
      { en: 'Transpose it down — move the whole song to a lower key', af: 'Transponeer dit af — skuif die hele liedjie na ’n laer toonsoort' },
      { en: 'A slower tempo', af: '’n Stadiger tempo' },
      { en: 'More compression', af: 'Meer kompressie' },
      { en: 'A shorter chorus', af: '’n Korter koor' },
    ],
    answer: 0,
    why: {
      en: 'Transposing moves every note by the same amount, so the song is unchanged except that it now fits your voice. Tempo is speed and has nothing to do with pitch — they are the two things beginners most often swap.',
      af: 'Transponering skuif elke noot met dieselfde hoeveelheid, so die liedjie bly dieselfde behalwe dat dit nou jou stem pas. Tempo is spoed en het niks met toonhoogte te doen nie — dit is die twee dinge wat beginners die meeste verwar.',
    },
  },
  {
    id: 'eq',
    ask: { en: 'What does an EQ do?', af: 'Wat doen ’n EQ?' },
    options: [
      { en: 'Changes the key', af: 'Verander die toonsoort' },
      { en: 'Turns whole frequency ranges up or down', af: 'Draai hele frekwensiebereike op of af' },
      { en: 'Adds instruments', af: 'Voeg instrumente by' },
      { en: 'Makes everything louder', af: 'Maak alles harder' },
    ],
    answer: 1,
    why: {
      en: 'It is a volume control per frequency range. A muddy mix usually means too much low-middle from several parts at once, and the fix is taking it out of the ones that do not need it rather than adding treble to everything.',
      af: 'Dit is ’n volumeknop per frekwensiebereik. ’n Modderige mengsel beteken gewoonlik te veel laer-middel van verskeie dele gelyk, en die oplossing is om dit uit dié te haal wat dit nie nodig het nie — nie om oral meer hoë kant by te sit nie.',
    },
  },
  {
    id: 'mastering',
    ask: { en: 'What is mastering?', af: 'Wat is mastering?' },
    options: [
      { en: 'Recording the best take', af: 'Om die beste opname te neem' },
      { en: 'Writing the lyrics', af: 'Om die woorde te skryf' },
      { en: 'The final pass over the finished mix, for loudness and consistency', af: 'Die laaste deurloop oor die klaar mengsel, vir hardheid en konsekwentheid' },
      { en: 'Separating the parts', af: 'Om die dele te skei' },
    ],
    answer: 2,
    why: {
      en: 'The last step, over the whole song rather than any one part: it sets the loudness so your track sits level with everything else on a playlist, and evens out the differences across an album.',
      af: 'Die laaste stap, oor die hele liedjie eerder as enige een deel: dit stel die hardheid sodat jou snit gelyk sit met alles anders op ’n snitlys, en stryk die verskille oor ’n album uit.',
    },
  },
  {
    id: 'first-fifteen',
    ask: { en: 'On streaming, why do the first fifteen seconds matter so much?', af: 'Op stroming, hoekom maak die eerste vyftien sekondes so saak?' },
    options: [
      { en: 'That is all that gets paid for', af: 'Dit is al wat betaal word' },
      { en: 'It is a rule of the platforms', af: 'Dit is ’n reël van die platforms' },
      { en: 'The file is better quality there', af: 'Die lêer is daar beter gehalte' },
      { en: 'That is where most people decide whether to skip', af: 'Dit is waar die meeste mense besluit om oor te slaan' },
    ],
    answer: 3,
    why: {
      en: 'Skipping. A long instrumental introduction was normal when somebody had already bought the record; now it is fifteen seconds to earn the rest. Ask for a short intro, or start on the hook.',
      af: 'Oorslaan. ’n Lang instrumentale inleiding was normaal toe iemand die plaat reeds gekoop het; nou is dit vyftien sekondes om die res te verdien. Vra vir ’n kort intro, of begin op die hook.',
    },
  },
  {
    id: 'daw',
    ask: { en: 'What is a DAW?', af: 'Wat is ’n DAW?' },
    options: [
      { en: 'The software you record, arrange and mix in', af: 'Die sagteware waarin jy opneem, rangskik en meng' },
      { en: 'A type of microphone', af: '’n Soort mikrofoon' },
      { en: 'A digital audio watermark', af: '’n Digitale klankwatermerk' },
      { en: 'A file format', af: '’n Lêerformaat' },
    ],
    answer: 0,
    why: {
      en: 'Digital Audio Workstation — the program the whole record is built in. The Pro Booth in this app is a small one: lanes, a transport, a grid and a mixdown.',
      af: 'Digital Audio Workstation — die program waarin die hele plaat gebou word. Die Pro Booth in hierdie app is ’n klein een: bane, ’n vervoerbalk, ’n rooster en ’n mengdown.',
    },
  },
  {
    id: 'eight-oh-eight',
    ask: { en: 'In hip-hop, what is an "808"?', af: 'In hip-hop, wat is ’n “808”?' },
    options: [
      { en: 'A tempo', af: '’n Tempo' },
      { en: 'A drum machine, and the deep bass sound that came off it', af: '’n Trommasjien, en die diep basklank wat daarvan gekom het' },
      { en: 'A microphone model', af: '’n Mikrofoonmodel' },
      { en: 'A studio in Atlanta', af: '’n Ateljee in Atlanta' },
    ],
    answer: 1,
    why: {
      en: 'The Roland TR-808, from 1980. Its kick drum sustained so long it worked as a bassline, and that sound became the floor of hip-hop, trap and drill. Asking for "808s" is asking for that bass, not for a machine.',
      af: 'Die Roland TR-808, van 1980. Sy kick het so lank aangehou dat dit as ’n baslyn gewerk het, en daardie klank het die vloer van hip-hop, trap en drill geword. Om vir “808s” te vra, is om vir daardie bas te vra, nie vir ’n masjien nie.',
    },
  },
  {
    id: 'doubling',
    ask: { en: 'A singer records the same line twice and both are kept. Why?', af: '’n Sanger neem dieselfde reël twee keer op en albei word gehou. Hoekom?' },
    options: [
      { en: 'In case one file is lost', af: 'Ingeval een lêer verlore raak' },
      { en: 'It is louder that way', af: 'Dit is so harder' },
      { en: 'The tiny differences make it sound thicker and wider', af: 'Die klein verskille laat dit dikker en wyer klink' },
      { en: 'To save credits', af: 'Om krediete te spaar' },
    ],
    answer: 2,
    why: {
      en: 'Doubling. Two takes are never identical, and the small differences in timing and pitch are exactly what makes it sound like more than one voice. It is why choruses so often feel bigger than verses.',
      af: 'Verdubbeling. Twee opnames is nooit identies nie, en juis daardie klein verskille in tydsberekening en toonhoogte laat dit klink na meer as een stem. Dít is hoekom kore so dikwels groter voel as verse.',
    },
  },
  {
    id: 'kwaito',
    ask: { en: 'How does kwaito differ from house?', af: 'Hoe verskil kwaito van house?' },
    options: [
      { en: 'It is faster', af: 'Dit is vinniger' },
      { en: 'It is always instrumental', af: 'Dit is altyd instrumentaal' },
      { en: 'It has no drums', af: 'Dit het geen tromme nie' },
      { en: 'It is slower, usually around 100 BPM', af: 'Dit is stadiger, gewoonlik om en by 100 BPM' },
    ],
    answer: 3,
    why: {
      en: 'Kwaito took house and slowed it down, which is where the swagger comes from. If a track feels like house at walking pace with the vocal out front, that is the neighbourhood.',
      af: 'Kwaito het house gevat en verstadig, en dít is waar die swier vandaan kom. As ’n snit voel soos house teen looppas met die sang vooraan, is dít die buurt.',
    },
  },
  {
    id: 'mono-stereo',
    ask: { en: 'Why check a mix in mono?', af: 'Hoekom kyk ’n mens na ’n mengsel in mono?' },
    options: [
      { en: 'Phones, shops and radios often play in one channel — and parts can vanish there', af: 'Fone, winkels en radio’s speel dikwels in een kanaal — en dele kan daar verdwyn' },
      { en: 'It is louder in mono', af: 'Dit is harder in mono' },
      { en: 'Mono files are smaller', af: 'Mono-lêers is kleiner' },
      { en: 'Streaming requires it', af: 'Stroming vereis dit' },
    ],
    answer: 0,
    why: {
      en: 'Because two parts spread wide in stereo can cancel each other out when they are summed to one channel — and a phone speaker is one channel. A mix that survives mono survives everywhere.',
      af: 'Omdat twee dele wat wyd in stereo gesprei is, mekaar kan uitkanselleer wanneer hulle na een kanaal saamgevoeg word — en ’n foon se luidspreker ís een kanaal. ’n Mengsel wat mono oorleef, oorleef oral.',
    },
  },
  {
    id: 'key-change',
    ask: { en: 'A song jumps up a key for the last chorus. What is that for?', af: '’n Liedjie spring ’n toonsoort op vir die laaste koor. Waarvoor is dit?' },
    options: [
      { en: 'To make it easier to sing', af: 'Om dit makliker te maak om te sing' },
      { en: 'A lift — it makes the ending feel bigger without new material', af: '’n Oplig — dit laat die einde groter voel sonder nuwe materiaal' },
      { en: 'To make it shorter', af: 'Om dit korter te maak' },
      { en: 'To fix a mistake', af: 'Om ’n fout reg te maak' },
    ],
    answer: 1,
    why: {
      en: 'A modulation, usually up a semitone or a tone. It is the cheapest lift there is, which is also why it can sound cheap — it works best when the song has earned it and has nowhere else to go.',
      af: '’n Modulasie, gewoonlik ’n halftoon of ’n heeltoon op. Dit is die goedkoopste oplig wat daar is, en dít is ook hoekom dit goedkoop kan klink — dit werk die beste wanneer die liedjie dit verdien het en nêrens anders heen kan nie.',
    },
  },
  {
    id: 'click',
    ask: { en: 'What is a click track?', af: 'Wat is ’n click track?' },
    options: [
      { en: 'A sound effect', af: '’n Klankeffek' },
      { en: 'The count-in at the start of a song', af: 'Die intel aan die begin van ’n liedjie' },
      { en: 'A metronome the performer hears but the listener does not', af: '’n Metronoom wat die kunstenaar hoor maar die luisteraar nie' },
      { en: 'A drum pattern', af: '’n Trompatroon' },
    ],
    answer: 2,
    why: {
      en: 'A metronome in the headphones. It is what lets a take you record today line up with a part you record tomorrow — without one, the two drift apart and nothing will make them fit.',
      af: '’n Metronoom in die oorfone. Dit is wat ’n opname wat jy vandag maak, laat inpas by ’n deel wat jy môre maak — daarsonder dryf die twee uitmekaar en niks sal hulle laat pas nie.',
    },
  },
  {
    id: 'gospel-clap',
    ask: { en: 'In gospel and much South African music, the hands usually clap on which beats of 4/4?', af: 'In gospel en baie Suid-Afrikaanse musiek klap die hande gewoonlik op watter slae van 4/4?' },
    options: [
      { en: '1 and 3', af: '1 en 3' },
      { en: 'Only on 1', af: 'Net op 1' },
      { en: 'Every beat', af: 'Elke slag' },
      { en: '2 and 4', af: '2 en 4' },
    ],
    answer: 3,
    why: {
      en: 'Two and four — the backbeat. Clapping on one and three is the thing that instantly marks somebody as not feeling the groove, and it is the single easiest rhythm idea to hear once you know it.',
      af: 'Twee en vier — die backbeat. Om op een en drie te klap is die ding wat iemand dadelik merk as buite die groove, en dit is die maklikste ritmiese idee om te hoor sodra jy dit ken.',
    },
  },
  {
    id: 'lyrics-specific',
    ask: { en: 'Which lyric line is more likely to work?', af: 'Watter liriekreël gaan waarskynlik beter werk?' },
    options: [
      { en: '"Your coffee is still on the table"', af: '“Jou koffie staan nog op die tafel”' },
      { en: '"I feel so much emotion inside of me"', af: '“Ek voel so baie emosie binne my”' },
      { en: 'Both the same', af: 'Albei dieselfde' },
      { en: 'The first, because it says how you feel', af: 'Die eerste, want dit sê hoe jy voel' },
    ],
    answer: 0,
    why: {
      en: 'The specific one. Naming the feeling tells somebody what to feel; showing one object lets them feel it themselves. Almost every lyric that moves people is concrete — a place, a time, a thing left behind.',
      af: 'Die spesifieke een. Om die gevoel te noem, sê vir iemand wat om te voel; om een voorwerp te wys, laat hulle dit self voel. Byna elke liriek wat mense roer, is konkreet — ’n plek, ’n tyd, ’n ding wat agtergebly het.',
    },
  },
  {
    id: 'sibilance',
    ask: { en: 'The "s" sounds on a vocal are painfully sharp. What is that called?', af: 'Die “s”-klanke op ’n sangstem is pynlik skerp. Hoe heet dit?' },
    options: [
      { en: 'Clipping', af: 'Klipping' },
      { en: 'Sibilance', af: 'Sibilansie' },
      { en: 'Feedback', af: 'Terugvoer' },
      { en: 'Phasing', af: 'Fasering' },
    ],
    answer: 1,
    why: {
      en: 'Sibilance. It gets worse the more you brighten a vocal or compress it, which is why it usually appears late in a mix rather than in the raw take. A de-esser turns down just that band, just when it happens.',
      af: 'Sibilansie. Dit word erger hoe meer jy ’n sangstem verhelder of komprimeer, en dít is hoekom dit gewoonlik laat in ’n mengsel opduik eerder as in die rou opname. ’n De-esser draai net daardie band af, net wanneer dit gebeur.',
    },
  },

  /* ── Thirty-two more, 11 September 2026 ──────────────────────────────
 
     Thirty was a month of daily visits and then a repeat. She asked for a
     new question every time somebody comes back, so the bank has to outlast
     the habit rather than exactly meet it.
 
     These lean further into two things the first thirty only touched: the
     BUSINESS of a song — who owns what, what a split sheet is, what
     "royalty-free" does not mean — and the CRAFT of writing one, which is
     where somebody using this app actually gets better. A member who learns
     that a recording and a composition are two separate copyrights has
     learnt something that changes what they sign. */

  {
    id: 'stems-limit',
    ask: { en: 'You split a finished song into stems. What can the split NOT do?', af: 'Jy split ’n klaar liedjie in stems. Wat kan die splitsing NIE doen nie?' },
    options: [
      { en: 'Remove the drums', af: 'Die tromme uithaal' },
      { en: 'Lower the vocal', af: 'Die sang sagter maak' },
      { en: 'Give you back the original separate recordings', af: 'Die oorspronklike aparte opnames vir jou teruggee' },
      { en: 'Work on a song you did not make', af: 'Werk op ’n liedjie wat jy nie gemaak het nie' },
    ],
    answer: 2,
    why: {
      en: 'Separation is an estimate, not a reversal. Once parts are mixed together they are one signal, and a model guesses what each was — good enough to lower a vocal, never the original take. That is why you keep your own stems when you make something.',
      af: 'Skeiding is ’n skatting, nie ’n omkering nie. Sodra dele saamgemeng is, is hulle een sein, en ’n model raai wat elkeen was — goed genoeg om ’n sang sagter te maak, nooit die oorspronklike opname nie. Dít is hoekom jy jou eie stems hou wanneer jy iets maak.',
    },
  },
  {
    id: 'publishing-master',
    ask: { en: 'A song has two separate copyrights. What are they?', af: '’n Liedjie het twee aparte kopieregte. Wat is hulle?' },
    options: [
      { en: 'The lyrics and the melody', af: 'Die woorde en die melodie' },
      { en: 'The demo and the master', af: 'Die demo en die meester' },
      { en: 'The title and the artwork', af: 'Die titel en die kunswerk' },
      { en: 'The composition and the recording', af: 'Die komposisie en die opname' },
    ],
    answer: 3,
    why: {
      en: 'The composition — the song as written — and the master, which is one particular recording of it. They can belong to different people, which is why a cover version pays the writer and not the original singer. Know which one you are selling.',
      af: 'Die komposisie — die liedjie soos geskryf — en die meester, wat een spesifieke opname daarvan is. Hulle kan aan verskillende mense behoort, en dít is hoekom ’n oorgesangweergawe die skrywer betaal en nie die oorspronklike sanger nie. Weet watter een jy verkoop.',
    },
  },
  {
    id: 'split-sheet',
    ask: { en: 'Two people write a song together. What should they do before it goes out?', af: 'Twee mense skryf saam ’n liedjie. Wat moet hulle doen voor dit uitgaan?' },
    options: [
      { en: 'Sign a split sheet saying who owns what percentage', af: '’n Verdelingsblad teken wat sê wie hoeveel persent besit' },
      { en: 'Nothing, it sorts itself out', af: 'Niks, dit sorteer homself uit' },
      { en: 'Register the title', af: 'Die titel registreer' },
      { en: 'Agree on a release date', af: 'Op ’n vrystellingsdatum ooreenkom' },
    ],
    answer: 0,
    why: {
      en: 'A split sheet: names, what each contributed, and the percentages, signed while everyone still agrees. Almost every ugly music dispute is two people remembering the same afternoon differently, two years later, once there is money.',
      af: '’n Verdelingsblad: name, wat elkeen bygedra het, en die persentasies, geteken terwyl almal nog saamstem. Byna elke lelike musiekgeskil is twee mense wat dieselfde middag anders onthou, twee jaar later, sodra daar geld is.',
    },
  },
  {
    id: 'royalty-free',
    ask: { en: 'A sound pack says "royalty-free". What does that mean?', af: '’n Klankpakket sê “royalty-free”. Wat beteken dit?' },
    options: [
      { en: 'It is free to download', af: 'Dit is gratis om af te laai' },
      { en: 'You pay once and owe no ongoing royalties', af: 'Jy betaal een keer en skuld geen deurlopende tantieme nie' },
      { en: 'You may use it any way at all', af: 'Jy mag dit op enige manier gebruik' },
      { en: 'Nobody owns it', af: 'Niemand besit dit nie' },
    ],
    answer: 1,
    why: {
      en: 'You pay once instead of a share of every sale. It is still licensed, the licence still has terms, and "free" is not one of them. Read what the licence allows before a track goes anywhere near a release.',
      af: 'Jy betaal een keer in plaas van ’n deel van elke verkoop. Dit is steeds gelisensieer, die lisensie het steeds voorwaardes, en “gratis” is nie een daarvan nie. Lees wat die lisensie toelaat voor ’n snit naby ’n vrystelling kom.',
    },
  },
  {
    id: 'pop-filter',
    ask: { en: 'Why is there a mesh screen in front of a studio microphone?', af: 'Hoekom is daar ’n gaasskerm voor ’n ateljeemikrofoon?' },
    options: [
      { en: 'To keep dust off it', af: 'Om stof daarvan af te hou' },
      { en: 'To make the voice warmer', af: 'Om die stem warmer te maak' },
      { en: 'To stop the puff of air on p and b sounds', af: 'Om die stoot lug op p- en b-klanke te keer' },
      { en: 'To hold the microphone still', af: 'Om die mikrofoon stil te hou' },
    ],
    answer: 2,
    why: {
      en: 'A pop filter. Saying "p" fires a small gust at the capsule and the recording thumps. You can hear it on any phone recording of somebody close to the mic, and no amount of mixing takes it out afterwards.',
      af: '’n Plofklankfilter. Om “p” te sê skiet ’n klein rukwind teen die kapsule en die opname bons. Jy hoor dit op enige foonopname van iemand naby die mikrofoon, en geen hoeveelheid menging haal dit agterna uit nie.',
    },
  },
  {
    id: 'loud-mixing',
    ask: { en: 'Why should you not mix a song at full volume?', af: 'Hoekom moet jy nie ’n liedjie op vol volume meng nie?' },
    options: [
      { en: 'It damages the speakers', af: 'Dit beskadig die luidsprekers' },
      { en: 'The file gets bigger', af: 'Die lêer word groter' },
      { en: 'It uses more power', af: 'Dit gebruik meer krag' },
      { en: 'Loud flatters everything, so the choices do not hold at normal volume', af: 'Hard vlei alles, so die keuses hou nie op normale volume nie' },
    ],
    answer: 3,
    why: {
      en: 'Our ears hear more bass and treble as things get louder, so a loud mix sounds full even when it is not. Decide at a conversational level and check loud — not the other way round. Your ears also tire, and a tired ear reaches for more of everything.',
      af: 'Ons ore hoor meer bas en meer hoë kant hoe harder dit word, so ’n harde mengsel klink vol al is dit nie. Besluit op gespreksvlak en kyk dan hard — nie andersom nie. Jou ore word ook moeg, en ’n moeë oor gryp na meer van alles.',
    },
  },
  {
    id: 'panning',
    ask: { en: 'What does panning do?', af: 'Wat doen panorering?' },
    options: [
      { en: 'Places a sound left or right between the speakers', af: 'Plaas ’n klank links of regs tussen die luidsprekers' },
      { en: 'Speeds it up', af: 'Maak dit vinniger' },
      { en: 'Changes the pitch', af: 'Verander die toonhoogte' },
      { en: 'Adds echo', af: 'Voeg eggo by' },
    ],
    answer: 0,
    why: {
      en: 'It puts each part somewhere across the width. Two guitars fighting in the middle stop fighting the moment one goes left and one goes right — it is the cheapest way to make a crowded mix breathe, and it costs nothing.',
      af: 'Dit sit elke deel êrens oor die breedte. Twee kitare wat in die middel baklei, hou op baklei sodra een links gaan en een regs — dit is die goedkoopste manier om ’n vol mengsel te laat asemhaal, en dit kos niks.',
    },
  },
  {
    id: 'dry-wet',
    ask: { en: 'An effect has a "dry/wet" control. What is it setting?', af: '’n Effek het ’n “dry/wet”-knop. Wat stel dit?' },
    options: [
      { en: 'The brightness', af: 'Die helderheid' },
      { en: 'How much of the sound goes through the effect', af: 'Hoeveel van die klank deur die effek gaan' },
      { en: 'The tempo', af: 'Die tempo' },
      { en: 'How loud it is', af: 'Hoe hard dit is' },
    ],
    answer: 1,
    why: {
      en: 'Dry is untouched, wet is fully processed, and the knob mixes the two. It is why "a bit of reverb" is a real instruction and "reverb on" is not — almost every good effect setting is somewhere well short of all the way.',
      af: 'Dry is onaangeraak, wet is heeltemal verwerk, en die knop meng die twee. Dít is hoekom “’n bietjie reverb” ’n regte aanwysing is en “reverb aan” nie — byna elke goeie effekinstelling is êrens ver voor die einde.',
    },
  },
  {
    id: 'top-line',
    ask: { en: 'Somebody writes a "top line". What have they written?', af: 'Iemand skryf ’n “top line”. Wat het hulle geskryf?' },
    options: [
      { en: 'The first verse', af: 'Die eerste vers' },
      { en: 'The drum pattern', af: 'Die trompatroon' },
      { en: 'The melody and words over an existing backing', af: 'Die melodie en woorde oor ’n bestaande begeleiding' },
      { en: 'The chords', af: 'Die akkoorde' },
    ],
    answer: 2,
    why: {
      en: 'The sung part written on top of a track somebody else made. Half the pop charts are made this way: one person builds the instrumental, another writes the melody and lyric over it. It is also exactly what you do when you sing on a track made here.',
      af: 'Die gesonge deel wat bo-op ’n snit geskryf word wat iemand anders gemaak het. Die helfte van die poptreffers word so gemaak: een persoon bou die instrumentale deel, ’n ander skryf die melodie en liriek daaroor. Dit is presies wat jy doen wanneer jy op ’n snit sing wat hier gemaak is.',
    },
  },
  {
    id: 'call-response',
    ask: { en: 'What is call and response?', af: 'Wat is roep en antwoord?' },
    options: [
      { en: 'Two songs on one track', af: 'Twee liedjies op een snit' },
      { en: 'A question in the lyrics', af: '’n Vraag in die woorde' },
      { en: 'Singing in a round', af: 'In ’n rondte sing' },
      { en: 'One phrase answered by another', af: 'Een frase wat deur ’n ander beantwoord word' },
    ],
    answer: 3,
    why: {
      en: 'A line, then an answer to it — often a lead voice answered by a group. It is the backbone of gospel and of most African music, and it is the easiest way to make one voice sound like a room full of people.',
      af: '’n Reël, dan ’n antwoord daarop — dikwels ’n voorsanger wat deur ’n groep beantwoord word. Dit is die ruggraat van gospel en van die meeste Afrika-musiek, en dit is die maklikste manier om een stem soos ’n vol vertrek te laat klink.',
    },
  },
  {
    id: 'vamp',
    ask: { en: 'In gospel, what is a vamp?', af: 'Wat is ’n vamp in gospel?' },
    options: [
      { en: 'A short section repeated and built on at the end', af: '’n Kort deel wat aan die einde herhaal en opgebou word' },
      { en: 'A wrong note', af: '’n Verkeerde noot' },
      { en: 'The opening', af: 'Die inleiding' },
      { en: 'The choir director', af: 'Die koorleier' },
    ],
    answer: 0,
    why: {
      en: 'A short phrase repeated over and over at the end, rising each time. It is where a gospel song does its real work, and it is why the last two minutes are often the whole point rather than an outro.',
      af: '’n Kort frase wat aan die einde oor en oor herhaal word en elke keer styg. Dit is waar ’n gospel-liedjie sy regte werk doen, en dít is hoekom die laaste twee minute dikwels die hele punt is eerder as ’n uittro.',
    },
  },
  {
    id: 'turnaround',
    ask: { en: 'What is a turnaround?', af: 'Wat is ’n turnaround?' },
    options: [
      { en: 'Changing the key', af: 'Om die toonsoort te verander' },
      { en: 'A short passage that leads back to the start of a section', af: '’n Kort deurgang wat terug lei na die begin van ’n deel' },
      { en: 'Restarting the recording', af: 'Om die opname te herbegin' },
      { en: 'Playing the song backwards', af: 'Om die liedjie agterstevoor te speel' },
    ],
    answer: 1,
    why: {
      en: 'The couple of bars at the end of a section that push you back into the next one. Without it a verse just stops and the next one starts; with it the song keeps moving. It is the difference between a loop and a song.',
      af: 'Die paar mate aan die einde van ’n deel wat jou terugstoot in die volgende een. Daarsonder hou ’n vers net op en die volgende begin; daarmee hou die liedjie aan beweeg. Dit is die verskil tussen ’n lus en ’n liedjie.',
    },
  },
  {
    id: 'prosody',
    ask: { en: 'A line sings badly even though it reads well. What is most likely wrong?', af: '’n Reël sing sleg al lees dit goed. Wat is waarskynlik verkeerd?' },
    options: [
      { en: 'Too many words', af: 'Te veel woorde' },
      { en: 'The wrong key', af: 'Die verkeerde toonsoort' },
      { en: 'The word stress does not match the musical stress', af: 'Die woordklem pas nie by die musikale klem nie' },
      { en: 'The tempo', af: 'Die tempo' },
    ],
    answer: 2,
    why: {
      en: 'Prosody. If the strong beat lands on the second half of a word, the singer has to mispronounce it to fit — and listeners hear it as wrong without knowing why. Say the line out loud against the beat before you keep it.',
      af: 'Prosodie. As die sterk slag op die tweede helfte van ’n woord land, moet die sanger dit verkeerd uitspreek om te pas — en luisteraars hoor dit as verkeerd sonder om te weet hoekom. Sê die reël hardop teen die slag voor jy dit hou.',
    },
  },
  {
    id: 'slant-rhyme',
    ask: { en: '"Home" and "alone" — what kind of rhyme is that?', af: '“Huis” en “buis” teenoor “huis” en “tuin” — watter soort rym is die tweede paar?' },
    options: [
      { en: 'Not a rhyme at all', af: 'Glad nie ’n rym nie' },
      { en: 'An internal rhyme', af: '’n Binnerym' },
      { en: 'A perfect rhyme', af: '’n Volmaakte rym' },
      { en: 'A slant rhyme — close, not exact', af: '’n Skuins rym — naby, nie presies nie' },
    ],
    answer: 3,
    why: {
      en: 'A slant rhyme. Songs use them constantly because a perfect rhyme forces the line to land somewhere you may not want, and a near-rhyme keeps the sound without taking the meaning hostage.',
      af: '’n Skuins rym. Liedjies gebruik hulle heeltyd, want ’n volmaakte rym dwing die reël om êrens te land waar jy dalk nie wil wees nie, en ’n byna-rym hou die klank sonder om die betekenis te gyselaar.',
    },
  },
  {
    id: 'title-chorus',
    ask: { en: 'Where does the title of a song usually go?', af: 'Waar sit die titel van ’n liedjie gewoonlik?' },
    options: [
      { en: 'In the chorus', af: 'In die koor' },
      { en: 'In the bridge', af: 'In die brug' },
      { en: 'In the first line of the verse', af: 'In die eerste reël van die vers' },
      { en: 'Nowhere in the lyrics', af: 'Nêrens in die woorde nie' },
    ],
    answer: 0,
    why: {
      en: 'In the chorus, usually on the strongest line. It is how somebody finds your song again after hearing it once — they search the words they remember, and the words they remember are the ones that repeated.',
      af: 'In die koor, gewoonlik op die sterkste reël. Dit is hoe iemand jou liedjie weer kry nadat hulle dit een keer gehoor het — hulle soek die woorde wat hulle onthou, en die woorde wat hulle onthou is dié wat herhaal het.',
    },
  },
  {
    id: 'vowels',
    ask: { en: 'Why do singers hold long notes on vowels rather than consonants?', af: 'Hoekom hou sangers lang note op vokale eerder as konsonante?' },
    options: [
      { en: 'Vowels are louder', af: 'Vokale is harder' },
      { en: 'A vowel is an open sound that can be sustained', af: '’n Vokaal is ’n oop klank wat volgehou kan word' },
      { en: 'It is a rule of music', af: 'Dit is ’n reël van musiek' },
      { en: 'Consonants are harder to spell', af: 'Konsonante is moeiliker om te spel' },
    ],
    answer: 1,
    why: {
      en: 'You can hold "aah" for eight beats; you cannot hold "t". Consonants are the edges of a word and vowels are the middle, so a lyric with the wrong vowel on the big note fights the singer. Try the line before you commit to it.',
      af: 'Jy kan “aah” agt slae hou; jy kan nie “t” hou nie. Konsonante is die rande van ’n woord en vokale die middel, so ’n liriek met die verkeerde vokaal op die groot noot baklei met die sanger. Probeer die reël voor jy daaraan vashou.',
    },
  },
  {
    id: 'sample-rate',
    ask: { en: 'Audio is usually recorded at 44.1 kHz. What does that number count?', af: 'Klank word gewoonlik teen 44,1 kHz opgeneem. Wat tel daardie getal?' },
    options: [
      { en: 'How loud it can go', af: 'Hoe hard dit kan gaan' },
      { en: 'The highest note it can hold', af: 'Die hoogste noot wat dit kan hou' },
      { en: 'Snapshots of the sound taken every second', af: 'Kiekies van die klank wat elke sekonde geneem word' },
      { en: 'The size of the file in kilobytes', af: 'Die grootte van die lêer in kilogrepe' },
    ],
    answer: 2,
    why: {
      en: 'Forty-four thousand one hundred measurements a second. It is set at roughly twice the highest pitch a person can hear, because that is the minimum needed to describe a wave rather than guess at it. Higher rates exist; they mostly help while editing, not on the way out.',
      af: 'Vier-en-veertig duisend een honderd metings ’n sekonde. Dit is op omtrent twee keer die hoogste toon gestel wat ’n mens kan hoor, want dít is die minimum om ’n golf te beskryf eerder as te raai. Hoër tempo’s bestaan; hulle help meestal tydens redigering, nie op pad uit nie.',
    },
  },
  {
    id: 'in-the-red',
    ask: { en: 'The meter on your recording goes into the red. What does that mean?', af: 'Die meter op jou opname gaan in die rooi in. Wat beteken dit?' },
    options: [
      { en: 'The take is good', af: 'Die opname is goed' },
      { en: 'The recording is loud enough', af: 'Die opname is hard genoeg' },
      { en: 'The microphone is on', af: 'Die mikrofoon is aan' },
      { en: 'The signal is past the ceiling and is being chopped off', af: 'Die sein is bo die plafon en word afgekap' },
    ],
    answer: 3,
    why: {
      en: 'Past the ceiling. Analogue tape went gently into distortion and people learnt to like it; digital does not — it simply cuts the top off the wave. Aim for the meter to sit well below the top and leave the loudness for mastering.',
      af: 'Bo die plafon. Analoog band het saggies in distorsie ingegaan en mense het daarvan leer hou; digitaal doen dit nie — dit kap net die bokant van die golf af. Mik dat die meter goed onder die bokant sit en los die hardheid vir mastering.',
    },
  },
  {
    id: 'riff',
    ask: { en: 'What is a riff?', af: 'Wat is ’n riff?' },
    options: [
      { en: 'A short figure that repeats', af: '’n Kort figuur wat herhaal' },
      { en: 'A mistake left in on purpose', af: '’n Fout wat doelbewus gelos is' },
      { en: 'The end of a song', af: 'Die einde van ’n liedjie' },
      { en: 'A type of microphone', af: '’n Soort mikrofoon' },
    ],
    answer: 0,
    why: {
      en: 'A short musical phrase, usually instrumental, that comes back. Plenty of songs are built entirely on one. If somebody can hum your song without singing a word, you have a riff and it is doing the work of a hook.',
      af: '’n Kort musikale frase, gewoonlik instrumentaal, wat terugkom. Baie liedjies is heeltemal op een gebou. As iemand jou liedjie kan neurie sonder om ’n woord te sing, het jy ’n riff en dit doen die werk van ’n hook.',
    },
  },
  {
    id: 'acapella',
    ask: { en: 'What is an a cappella?', af: 'Wat is ’n a cappella?' },
    options: [
      { en: 'A slow song', af: '’n Stadige liedjie' },
      { en: 'Voices with no instruments', af: 'Stemme sonder instrumente' },
      { en: 'A song with no words', af: '’n Liedjie sonder woorde' },
      { en: 'A live recording', af: '’n Lewendige opname' },
    ],
    answer: 1,
    why: {
      en: 'Voices alone. It is also what a remixer asks for — the isolated vocal, so they can build something new underneath it. Keeping one when you make a song is what lets it be remixed later.',
      af: 'Stemme alleen. Dit is ook wat ’n remixer vra — die geïsoleerde sang, sodat hulle iets nuuts daaronder kan bou. Om een te hou wanneer jy ’n liedjie maak, is wat dit later laat remix word.',
    },
  },
  {
    id: 'bar-vs-verse',
    ask: { en: 'What is the difference between a bar and a verse?', af: 'Wat is die verskil tussen ’n maat en ’n vers?' },
    options: [
      { en: 'They are the same thing', af: 'Hulle is dieselfde ding' },
      { en: 'A bar is a line of lyrics', af: '’n Maat is ’n reël woorde' },
      { en: 'A bar is a unit of time; a verse is a section made of many bars', af: '’n Maat is ’n tydseenheid; ’n vers is ’n deel wat uit baie mate bestaan' },
      { en: 'A verse is shorter', af: '’n Vers is korter' },
    ],
    answer: 2,
    why: {
      en: 'A bar is four beats in most music. A verse is usually sixteen of them. Rappers say "bars" meaning lines, which is a different use of the same word and is where the confusion comes from.',
      af: '’n Maat is vier slae in die meeste musiek. ’n Vers is gewoonlik sestien daarvan. Rappers sê “bars” en bedoel reëls, wat ’n ander gebruik van dieselfde woord is en waar die verwarring vandaan kom.',
    },
  },
  {
    id: 'drop',
    ask: { en: 'In dance music, what is the drop?', af: 'Wat is die drop in dansmusiek?' },
    options: [
      { en: 'The end of the song', af: 'Die einde van die liedjie' },
      { en: 'A quiet section', af: '’n Stil deel' },
      { en: 'A missing beat', af: '’n Ontbrekende slag' },
      { en: 'The moment the beat and bass come back after a build', af: 'Die oomblik wanneer die slag en bas terugkom ná ’n opbou' },
    ],
    answer: 3,
    why: {
      en: 'The payoff. Everything before it is a build, taking things away and raising tension, so that when the bottom returns it lands. A drop with no build in front of it is just a loud part.',
      af: 'Die uitbetaling. Alles voor dit is ’n opbou wat dinge wegvat en spanning verhoog, sodat wanneer die onderkant terugkom dit land. ’n Drop sonder ’n opbou voor dit is net ’n harde deel.',
    },
  },
  {
    id: 'fade-out',
    ask: { en: 'Why did so many older songs fade out at the end?', af: 'Hoekom het so baie ouer liedjies aan die einde uitgedoof?' },
    options: [
      { en: 'It was easier than composing an ending', af: 'Dit was makliker as om ’n einde te komponeer' },
      { en: 'The tape ran out', af: 'Die band het opgeraak' },
      { en: 'Radio required it', af: 'Radio het dit vereis' },
      { en: 'To save space', af: 'Om ruimte te spaar' },
    ],
    answer: 0,
    why: {
      en: 'A fade is an ending you do not have to write. It suited radio, where the next song came in over it. On streaming it reads as unfinished, and a written ending is worth the trouble.',
      af: '’n Uitdowing is ’n einde wat jy nie hoef te skryf nie. Dit het radio gepas, waar die volgende liedjie daaroor ingekom het. Op stroming lees dit as onvoltooid, en ’n geskrewe einde is die moeite werd.',
    },
  },
  {
    id: 'capo',
    ask: { en: 'A guitarist clamps a bar across the neck. What does it do?', af: '’n Kitaarspeler klem ’n balkie oor die nek. Wat doen dit?' },
    options: [
      { en: 'Makes the strings quieter', af: 'Maak die snare sagter' },
      { en: 'Raises the key while keeping the same chord shapes', af: 'Lig die toonsoort terwyl dieselfde akkoordvorms behou word' },
      { en: 'Tunes the guitar', af: 'Stem die kitaar' },
      { en: 'Holds the strings down for a solo', af: 'Hou die snare vas vir ’n solo' },
    ],
    answer: 1,
    why: {
      en: 'A capo. It moves the whole guitar up so the player keeps the shapes they know while the song sits where the singer needs it. Same idea as transposing, done with a clamp instead of arithmetic.',
      af: '’n Capo. Dit skuif die hele kitaar op sodat die speler die vorms hou wat hulle ken terwyl die liedjie sit waar die sanger dit nodig het. Dieselfde idee as transponering, met ’n klem in plaas van rekenkunde.',
    },
  },
  {
    id: 'voice-ranges',
    ask: { en: 'From highest to lowest, what order are these voices?', af: 'Van hoogste na laagste, in watter volgorde is hierdie stemme?' },
    options: [
      { en: 'Alto, soprano, bass, tenor', af: 'Alt, sopraan, bas, tenoor' },
      { en: 'Soprano, tenor, alto, bass', af: 'Sopraan, tenoor, alt, bas' },
      { en: 'Soprano, alto, tenor, bass', af: 'Sopraan, alt, tenoor, bas' },
      { en: 'Tenor, bass, soprano, alto', af: 'Tenoor, bas, sopraan, alt' },
    ],
    answer: 2,
    why: {
      en: 'Soprano, alto, tenor, bass — highest to lowest, and the four parts a choir is written in. Knowing where your own voice sits tells you which key a song should be in before you waste a take finding out.',
      af: 'Sopraan, alt, tenoor, bas — hoogste na laagste, en die vier partye waarin ’n koor geskryf word. Om te weet waar jou eie stem sit, sê vir jou in watter toonsoort ’n liedjie moet wees voor jy ’n opname mors om uit te vind.',
    },
  },
  {
    id: 'chorus-count',
    ask: { en: 'How many times does a chorus usually appear in a pop song?', af: 'Hoeveel keer verskyn ’n koor gewoonlik in ’n poplied?' },
    options: [
      { en: 'Once', af: 'Een keer' },
      { en: 'Twice', af: 'Twee keer' },
      { en: 'As many as it takes', af: 'So veel soos nodig' },
      { en: 'Three or four times', af: 'Drie of vier keer' },
    ],
    answer: 3,
    why: {
      en: 'Three or four. Repetition is not laziness — it is how a stranger learns your song inside one listen. Fewer than three and most people never get a second chance at the line you most wanted them to keep.',
      af: 'Drie of vier. Herhaling is nie luiheid nie — dit is hoe ’n vreemdeling jou liedjie binne een luister leer. Minder as drie en die meeste mense kry nooit ’n tweede kans op die reël wat jy die graagste wou hê hulle moet hou nie.',
    },
  },
  {
    id: 'ballad-tempo',
    ask: { en: 'Roughly how fast is a ballad?', af: 'Hoe vinnig is ’n ballade omtrent?' },
    options: [
      { en: 'Around 60 to 80 BPM', af: 'Om en by 60 tot 80 BPM' },
      { en: 'About 160 BPM', af: 'Omtrent 160 BPM' },
      { en: 'About 120 BPM', af: 'Omtrent 120 BPM' },
      { en: 'There is no usual speed', af: 'Daar is geen gewone spoed nie' },
    ],
    answer: 0,
    why: {
      en: 'Sixty to eighty — near a resting heartbeat, which is part of why it feels calm. Setting the speed slider there is a faster way to ask for a ballad than any adjective, because tempo is a number the engine cannot misread.',
      af: 'Sestig tot tagtig — naby ’n rustende hartklop, en dít is deels hoekom dit kalm voel. Om die spoedskuiwer dáár te stel, vra vinniger vir ’n ballade as enige byvoeglike naamwoord, want tempo is ’n getal wat die enjin nie verkeerd kan lees nie.',
    },
  },
  {
    id: 'metronome-feel',
    ask: { en: 'A click track feels stiff and wrong the first few times. Why keep using it?', af: '’n Click track voel die eerste paar keer styf en verkeerd. Hoekom dit bly gebruik?' },
    options: [
      { en: 'It makes the recording louder', af: 'Dit maak die opname harder' },
      { en: 'Without it, parts recorded on different days will not line up', af: 'Daarsonder sal dele wat op verskillende dae opgeneem is nie inpas nie' },
      { en: 'It hides mistakes', af: 'Dit steek foute weg' },
      { en: 'It is required by the software', af: 'Die sagteware vereis dit' },
    ],
    answer: 1,
    why: {
      en: 'It feels stiff because you are hearing your own drift for the first time. That drift is real, and it is what makes a second take impossible to lay against the first. Playing with a click is a skill, and a week of it changes your timing for good.',
      af: 'Dit voel styf omdat jy vir die eerste keer jou eie afdrywing hoor. Daardie afdrywing is regtig, en dit is wat ’n tweede opname onmoontlik maak om teen die eerste te lê. Om met ’n click te speel is ’n vaardigheid, en ’n week daarvan verander jou tydsberekening vir goed.',
    },
  },
  {
    id: 'sampling',
    ask: { en: 'You want to use four seconds of somebody else’s record. What do you need?', af: 'Jy wil vier sekondes van iemand anders se plaat gebruik. Wat het jy nodig?' },
    options: [
      { en: 'Nothing under ten seconds', af: 'Niks onder tien sekondes nie' },
      { en: 'Just credit them', af: 'Net erkenning gee' },
      { en: 'Permission for both the recording and the song', af: 'Toestemming vir sowel die opname as die liedjie' },
      { en: 'Only the record label’s permission', af: 'Net die platemaatskappy se toestemming' },
    ],
    answer: 2,
    why: {
      en: 'Two clearances, because there are two copyrights: the master and the composition. The "a few seconds is fine" rule does not exist anywhere in law — it is a thing people repeat. One bar has ended careers.',
      af: 'Twee klarings, want daar is twee kopieregte: die meester en die komposisie. Die “’n paar sekondes is reg”-reël bestaan nêrens in die wet nie — dit is iets wat mense herhaal. Een maat het al loopbane beëindig.',
    },
  },
  {
    id: 'demo',
    ask: { en: 'What is a demo for?', af: 'Waarvoor is ’n demo?' },
    options: [
      { en: 'To sell to the public', af: 'Om aan die publiek te verkoop' },
      { en: 'To practise singing', af: 'Om sang te oefen' },
      { en: 'To test the microphone', af: 'Om die mikrofoon te toets' },
      { en: 'To show somebody the song before it is properly made', af: 'Om iemand die liedjie te wys voor dit behoorlik gemaak is' },
    ],
    answer: 3,
    why: {
      en: 'It carries the song, not the production. A demo that sounds unfinished is doing its job; one polished for six weeks is a finished record with a modest name, and the six weeks went into something nobody asked for yet.',
      af: 'Dit dra die liedjie, nie die produksie nie. ’n Demo wat onvoltooid klink, doen sy werk; een wat ses weke lank opgepoets is, is ’n klaar plaat met ’n beskeie naam, en die ses weke het in iets gegaan wat niemand nog gevra het nie.',
    },
  },
  {
    id: 'mono-bass',
    ask: { en: 'Why is the bass usually kept in the centre rather than panned?', af: 'Hoekom word die bas gewoonlik in die middel gehou eerder as gepanoreer?' },
    options: [
      { en: 'Low frequencies carry the most energy and a club system sums them anyway', af: 'Lae frekwensies dra die meeste energie en ’n klubstelsel voeg hulle in elk geval saam' },
      { en: 'Tradition', af: 'Tradisie' },
      { en: 'Nothing else uses the middle', af: 'Niks anders gebruik die middel nie' },
      { en: 'It sounds louder there', af: 'Dit klink daar harder' },
    ],
    answer: 0,
    why: {
      en: 'Bass takes most of the power in a mix, so splitting it across the sides wastes headroom and can cancel when the two sides are summed — which is what a club rig, a phone and most radio do. Keep the bottom in the middle and spread the rest.',
      af: 'Bas vat die meeste van die krag in ’n mengsel, so om dit oor die kante te verdeel mors headroom en kan uitkanselleer wanneer die twee kante saamgevoeg word — wat ’n klubstelsel, ’n foon en die meeste radio doen. Hou die onderkant in die middel en sprei die res.',
    },
  },
  {
    id: 'hook-placement',
    ask: { en: 'Two songs are identical except one puts the hook at 0:08 and the other at 0:50. Which usually does better on streaming?', af: 'Twee liedjies is identies behalwe dat een die hook op 0:08 sit en die ander op 0:50. Watter een vaar gewoonlik beter op stroming?' },
    options: [
      { en: 'The one at 0:50', af: 'Dié een op 0:50' },
      { en: 'The one at 0:08', af: 'Dié een op 0:08' },
      { en: 'No difference', af: 'Geen verskil nie' },
      { en: 'It depends on the genre only', af: 'Dit hang net van die genre af' },
    ],
    answer: 1,
    why: {
      en: 'The early one. Most skips happen in the first half minute, and a platform counts a play only past a threshold — so a hook that arrives after the decision has been made arrives for nobody. Start near the best part.',
      af: 'Die vroeë een. Die meeste oorslaan gebeur in die eerste halfminuut, en ’n platform tel ’n speel eers verby ’n drempel — so ’n hook wat aankom nadat die besluit geneem is, kom vir niemand aan nie. Begin naby die beste deel.',
    },
  },
];
