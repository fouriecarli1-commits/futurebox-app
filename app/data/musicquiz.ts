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
];
