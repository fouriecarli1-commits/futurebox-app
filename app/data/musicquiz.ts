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


  /* ── The words on a page of music ─────────────────────────────────────

     Carli, 22 September 2026: *"Wat is 'n triool, tonika, 'n valsetto,
     deskant, verskillende stemme, oktaaf hoër, p, f, ff, musiektermes wat
     baie gebruik word, key change, wat is die verskil tussen mol en kruis,
     wat is 'n alt, viool en soprano."*

     Three of those were already here — `octave`, `key-change` and
     `voice-ranges` — so they are not asked twice. The rest are below.

     These break the file's own rule about only asking what changes a
     decision on a screen, and deliberately. Somebody who has never read
     music cannot say what they want from a song, because the words for it
     are the words on this page: you cannot ask for a descant if nobody has
     told you there is such a thing. */
  {
    id: 'triplet',
    ask: { en: 'What is a triplet?', af: 'Wat is ’n triool?' },
    options: [
      { en: 'Three bars that repeat', af: 'Drie mate wat herhaal' },
      { en: 'Three notes played in the time of two', af: 'Drie note wat in die tyd van twee gespeel word' },
      { en: 'A chord made of three notes', af: '’n Akkoord wat uit drie note bestaan' },
      { en: 'Three singers on one line', af: 'Drie sangers op een reël' },
    ],
    answer: 1,
    why: {
      en: 'Three notes squeezed into the space two would normally take, so the beat stays where it was and the notes roll. It is the “da-da-da, da-da-da” under a shuffle or a gospel ballad, and asking for a triplet feel is what stops a beat sounding stiff.',
      af: 'Drie note wat ingedruk word in die ruimte wat twee normaalweg sou vat, sodat die slag bly waar hy was en die note rol. Dit is die “da-da-da, da-da-da” onder ’n shuffle of ’n gospel-ballade, en om vir ’n trioolgevoel te vra is wat keer dat ’n beat styf klink.',
    },
  },
  {
    id: 'tonic',
    ask: { en: 'What is the tonic of a key?', af: 'Wat is die tonika van ’n toonsoort?' },
    options: [
      { en: 'The loudest note in the song', af: 'Die hardste noot in die liedjie' },
      { en: 'The note the song is built on and comes home to', af: 'Die noot waarop die liedjie gebou is en waarheen dit terugkom' },
      { en: 'The last note of the melody', af: 'Die laaste noot van die melodie' },
      { en: 'The lowest note the singer can reach', af: 'Die laagste noot wat die sanger kan haal' },
    ],
    answer: 1,
    why: {
      en: 'The home note — the “1” of the key. In C major it is C. Everything else is heard against it, which is why a song can end anywhere and only feel finished when it lands on the tonic.',
      af: 'Die tuisnoot — die “1” van die toonsoort. In C majeur is dit C. Alles anders word daarteen gehoor, en dít is hoekom ’n liedjie enige plek kan eindig en net klaar voel wanneer dit op die tonika land.',
    },
  },
  {
    id: 'dominant',
    ask: { en: 'The chord that most wants to fall back to the tonic is the…', af: 'Die akkoord wat die meeste terug wil val na die tonika is die…' },
    options: [
      { en: 'Dominant, the fifth', af: 'Dominant, die vyfde' },
      { en: 'The second', af: 'Die tweede' },
      { en: 'The relative minor', af: 'Die relatiewe mineur' },
      { en: 'Whichever one is loudest', af: 'Watter een ook al die hardste is' },
    ],
    answer: 0,
    why: {
      en: 'The fifth — G in the key of C. Dominant to tonic is the strongest pull in Western music and it is what makes an ending sound like an ending. A chorus that will not resolve is usually sitting on the dominant.',
      af: 'Die vyfde — G in die toonsoort C. Dominant na tonika is die sterkste trek in Westerse musiek en dit is wat ’n einde soos ’n einde laat klink. ’n Koor wat nie wil oplos nie, sit gewoonlik op die dominant.',
    },
  },
  {
    id: 'falsetto',
    ask: { en: 'What is falsetto?', af: 'Wat is valset?' },
    options: [
      { en: 'Singing out of tune on purpose', af: 'Om doelbewus vals te sing' },
      { en: 'A light register above your normal voice', af: '’n Ligte register bo jou gewone stem' },
      { en: 'Singing very softly', af: 'Om baie sag te sing' },
      { en: 'A voice that has been pitched up by a machine', af: '’n Stem wat deur ’n masjien hoër gestel is' },
    ],
    answer: 1,
    why: {
      en: 'A different way of using the cords that reaches above your chest voice, lighter and breathier — think the high bits of a Bee Gees or Prince line. The name looks like “vals”, but it has nothing to do with singing out of tune.',
      af: '’n Ander manier om die stembande te gebruik wat bo jou borsstem uitkom, ligter en meer asemrig — dink aan die hoë stukke van ’n Bee Gees- of Prince-reël. Die naam lyk na “vals”, maar dit het niks met onsuiwer sing te doen nie.',
    },
  },
  {
    id: 'descant',
    ask: { en: 'What is a descant?', af: 'Wat is ’n deskant?' },
    options: [
      { en: 'The lowest line in a choir', af: 'Die laagste lyn in ’n koor' },
      { en: 'A higher counter-melody floating above the tune', af: '’n Hoër teenmelodie wat bo die wysie sweef' },
      { en: 'The instrumental introduction', af: 'Die instrumentale inleiding' },
      { en: 'A verse sung by one person alone', af: '’n Vers wat een persoon alleen sing' },
    ],
    answer: 1,
    why: {
      en: 'A second, higher tune sung over the top of the one everybody knows, usually by a few sopranos on the last verse. It is the oldest trick there is for making a final chorus lift without changing anything else.',
      af: '’n Tweede, hoër wysie wat bo-oor die een gesing word wat almal ken, gewoonlik deur ’n paar soprane op die laaste vers. Dit is die oudste truuk wat daar is om ’n laaste koor te laat oplig sonder om iets anders te verander.',
    },
  },
  {
    id: 'sharp-flat',
    ask: { en: 'What is the difference between a flat (♭) and a sharp (♯)?', af: 'Wat is die verskil tussen ’n mol (♭) en ’n kruis (♯)?' },
    options: [
      { en: 'A flat lowers the note a semitone, a sharp raises it a semitone', af: '’n Mol verlaag die noot ’n halftoon, ’n kruis verhoog dit ’n halftoon' },
      { en: 'A flat is softer, a sharp is louder', af: '’n Mol is sagter, ’n kruis is harder' },
      { en: 'A flat is for the left hand, a sharp for the right', af: '’n Mol is vir die linkerhand, ’n kruis vir die regter' },
      { en: 'A flat is out of tune, a sharp is in tune', af: '’n Mol is onsuiwer, ’n kruis is suiwer' },
    ],
    answer: 0,
    why: {
      en: 'One semitone down, one semitone up — the very next key on a piano, black or white. It has nothing to do with loudness, and “singing flat” is a different use of the same word meaning slightly under the note.',
      af: 'Een halftoon af, een halftoon op — die heel volgende klawer op ’n klavier, swart of wit. Dit het niks met hardheid te doen nie, en “vals plat sing” is ’n ander gebruik van dieselfde woord wat beteken net-net onder die noot.',
    },
  },
  {
    id: 'enharmonic',
    ask: { en: 'F♯ and G♭ on a piano are…', af: 'F♯ en G♭ op ’n klavier is…' },
    options: [
      { en: 'Two keys next to each other', af: 'Twee klawers langs mekaar' },
      { en: 'An octave apart', af: '’n Oktaaf uitmekaar' },
      { en: 'The same key, written two ways', af: 'Dieselfde klawer, op twee maniere geskryf' },
      { en: 'Only found in minor keys', af: 'Net in mineur toonsoorte te vinde' },
    ],
    answer: 2,
    why: {
      en: 'The same black key, named after whichever white note it is leaning on. Which name is written depends on the key of the song, and that is why two people can describe the same note differently and both be right.',
      af: 'Dieselfde swart klawer, genoem na watter wit noot dit ook al teen leun. Watter naam geskryf word hang van die liedjie se toonsoort af, en dít is hoekom twee mense dieselfde noot verskillend kan beskryf en albei reg is.',
    },
  },
  {
    id: 'dynamics-pf',
    ask: { en: 'On a page of music, what do p and f mean?', af: 'Op ’n bladsy musiek, wat beteken p en f?' },
    options: [
      { en: 'Piano and forte — soft and loud', af: 'Piano en forte — sag en hard' },
      { en: 'Play and finish', af: 'Speel en finish' },
      { en: 'Pause and fast', af: 'Pouse en vinnig' },
      { en: 'Pitch and frequency', af: 'Toonhoogte en frekwensie' },
    ],
    answer: 0,
    why: {
      en: 'Italian, and they are about volume: p is piano, soft, and f is forte, loud. The instrument was christened the pianoforte — soft-loud — precisely because it could do both, which the harpsichord before it could not.',
      af: 'Italiaans, en dit gaan oor volume: p is piano, sag, en f is forte, hard. Die instrument is die pianoforte gedoop — sag-hard — juis omdat dit albei kon doen, wat die klavesimbel voor dit nie kon nie.',
    },
  },
  {
    id: 'dynamics-order',
    ask: { en: 'From softest to loudest, which order is right?', af: 'Van sagste na hardste, watter volgorde is reg?' },
    options: [
      { en: 'mf, mp, p, f', af: 'mf, mp, p, f' },
      { en: 'pp, p, mp, mf, f, ff', af: 'pp, p, mp, mf, f, ff' },
      { en: 'ff, f, p, pp', af: 'ff, f, p, pp' },
      { en: 'p, pp, f, ff', af: 'p, pp, f, ff' },
    ],
    answer: 1,
    why: {
      en: 'Doubling the letter goes further in the same direction: pp is very soft, ff is very loud. The m is mezzo, meaning half, so mp is half-soft and mf is half-loud. A song that sits at one level the whole way through is the commonest thing wrong with a first mix.',
      af: 'Om die letter te verdubbel gaan verder in dieselfde rigting: pp is baie sag, ff is baie hard. Die m is mezzo, wat half beteken, so mp is half-sag en mf is half-hard. ’n Liedjie wat heelpad op een vlak sit, is die algemeenste ding wat met ’n eerste mix verkeerd is.',
    },
  },
  {
    id: 'crescendo',
    ask: { en: 'A crescendo is…', af: '’n Crescendo is…' },
    options: [
      { en: 'Getting gradually louder', af: 'Om geleidelik harder te word' },
      { en: 'A sudden stop', af: '’n Skielike stilte' },
      { en: 'Getting gradually faster', af: 'Om geleidelik vinniger te word' },
      { en: 'The highest note of the song', af: 'Die hoogste noot van die liedjie' },
    ],
    answer: 0,
    why: {
      en: 'Louder, over time — its opposite is a diminuendo. It is about volume and not speed, which is the mistake everybody makes once. A bridge that grows into the last chorus is a crescendo whether anybody writes the word or not.',
      af: 'Harder, oor tyd — die teenoorgestelde is ’n diminuendo. Dit gaan oor volume en nie spoed nie, wat die fout is wat almal een keer maak. ’n Brug wat in die laaste koor ingroei is ’n crescendo, of iemand die woord neerskryf of nie.',
    },
  },
  {
    id: 'legato-staccato',
    ask: { en: 'Legato and staccato describe…', af: 'Legato en staccato beskryf…' },
    options: [
      { en: 'How loud the notes are', af: 'Hoe hard die note is' },
      { en: 'Whether the notes flow into each other or are short and separate', af: 'Of die note in mekaar vloei of kort en los is' },
      { en: 'Which hand plays them', af: 'Watter hand hulle speel' },
      { en: 'How high they are', af: 'Hoe hoog hulle is' },
    ],
    answer: 1,
    why: {
      en: 'Legato is joined up, one note leaning into the next; staccato is clipped, each note let go early. It is the difference between a smooth string pad and a plucked bass, and naming it is often the fastest way to fix a part that feels wrong.',
      af: 'Legato is aaneen, een noot wat in die volgende leun; staccato is afgeknip, elke noot vroeg losgelaat. Dit is die verskil tussen ’n gladde strykerpad en ’n getokkelde bas, en om dit te benoem is dikwels die vinnigste manier om ’n party reg te kry wat verkeerd voel.',
    },
  },
  {
    id: 'viola',
    ask: { en: 'How does a viola differ from a violin?', af: 'Hoe verskil ’n altviool van ’n viool?' },
    options: [
      { en: 'It has twice as many strings', af: 'Dit het twee keer soveel snare' },
      { en: 'It is bigger and sounds lower, sitting between violin and cello', af: 'Dit is groter en klink laer, en sit tussen viool en tjello' },
      { en: 'It is played standing up', af: 'Dit word staande gespeel' },
      { en: 'It is the same thing under another name', af: 'Dit is dieselfde ding onder ’n ander naam' },
    ],
    answer: 1,
    why: {
      en: 'A little bigger, tuned a fifth lower, and it plays the alto line — the harmony under the tune rather than the tune. Ask for violas rather than violins when you want warmth low down instead of brightness up top.',
      af: 'Effens groter, ’n vyfde laer gestem, en dit speel die altlyn — die harmonie onder die wysie eerder as die wysie self. Vra vir altviole eerder as viole wanneer jy warmte onder wil hê in plaas van helderheid bo.',
    },
  },
  {
    id: 'soprano-role',
    ask: { en: 'In a four-part choir, what does the soprano line usually do?', af: 'In ’n vierstemmige koor, wat doen die sopraanlyn gewoonlik?' },
    options: [
      { en: 'Keeps the beat', af: 'Hou die maat' },
      { en: 'Carries the tune, at the top', af: 'Dra die wysie, heel bo' },
      { en: 'Sings the lowest notes', af: 'Sing die laagste note' },
      { en: 'Only sings in the chorus', af: 'Sing net in die koor' },
    ],
    answer: 1,
    why: {
      en: 'The highest part, and almost always the melody — which is why the ear follows it and why a wrong note there is heard by everybody. The other three are built underneath it.',
      af: 'Die hoogste party, en byna altyd die melodie — en dít is hoekom die oor dit volg en hoekom ’n verkeerde noot daar deur almal gehoor word. Die ander drie word daaronder gebou.',
    },
  },
  {
    id: 'alto-role',
    ask: { en: 'What does the alto line do in a choir?', af: 'Wat doen die altlyn in ’n koor?' },
    options: [
      { en: 'The tune, an octave down', af: 'Die wysie, ’n oktaaf laer' },
      { en: 'The harmony just under the tune, often moving very little', af: 'Die harmonie net onder die wysie, wat dikwels baie min beweeg' },
      { en: 'The bass line', af: 'Die baslyn' },
      { en: 'Nothing until the last verse', af: 'Niks tot die laaste vers nie' },
    ],
    answer: 1,
    why: {
      en: 'The lower women’s part, filling in the harmony a step or two under the sopranos. It is the hardest line to learn precisely because it moves so little and so rarely sounds like a tune on its own — and it is what makes the chord a chord.',
      af: 'Die laer vrouestem, wat die harmonie ’n trap of twee onder die soprane invul. Dit is die moeilikste lyn om te leer juis omdat dit so min beweeg en so selde op sy eie soos ’n wysie klink — en dit is wat die akkoord ’n akkoord maak.',
    },
  },
  {
    id: 'semitone',
    ask: { en: 'What is a semitone?', af: 'Wat is ’n halftoon?' },
    options: [
      { en: 'Half the length of a note', af: 'Die helfte van ’n noot se lengte' },
      { en: 'The smallest step there is — one key to the very next, black or white', af: 'Die kleinste trap wat daar is — een klawer na die heel volgende, swart of wit' },
      { en: 'Half the volume', af: 'Die helfte van die volume' },
      { en: 'Two notes played together', af: 'Twee note wat saam gespeel word' },
    ],
    answer: 1,
    why: {
      en: 'The smallest step in Western music. Twelve of them make an octave. Everything else — a tone, a third, a fifth — is counted in semitones, so it is the ruler the rest of the language is measured with.',
      af: 'Die kleinste trap in Westerse musiek. Twaalf daarvan maak ’n oktaaf. Alles anders — ’n heeltoon, ’n derde, ’n vyfde — word in halftone getel, so dit is die liniaal waarmee die res van die taal gemeet word.',
    },
  },
  {
    id: 'six-eight',
    ask: { en: 'What does 6/8 feel like to count?', af: 'Hoe voel dit om 6/8 te tel?' },
    options: [
      { en: 'Six even stamps', af: 'Ses gelyke stampe' },
      { en: 'Two big beats, each split into three', af: 'Twee groot slae, elkeen in drie verdeel' },
      { en: 'The same as 4/4', af: 'Dieselfde as 4/4' },
      { en: 'Three beats, like a waltz', af: 'Drie slae, soos ’n wals' },
    ],
    answer: 1,
    why: {
      en: 'ONE-two-three TWO-two-three — a rolling, rocking feel rather than a march. Most sea shanties, a lot of Irish music and a good few gospel ballads live here, and it is the easiest way to make something feel like it is swaying.',
      af: 'EEN-twee-drie TWEE-twee-drie — ’n rollende, wiegende gevoel eerder as ’n opmars. Die meeste matroosliedjies, baie Ierse musiek en ’n hele klomp gospel-ballades leef hier, en dit is die maklikste manier om iets te laat voel of dit swaai.',
    },
  },
  {
    id: 'tempo-italian',
    ask: { en: 'Adagio, andante, allegro. What do they say?', af: 'Adagio, andante, allegro. Wat sê hulle?' },
    options: [
      { en: 'How loud to play', af: 'Hoe hard om te speel' },
      { en: 'How fast to play — slow, walking, quick', af: 'Hoe vinnig om te speel — stadig, stappend, vinnig' },
      { en: 'Which instrument plays', af: 'Watter instrument speel' },
      { en: 'How high to sing', af: 'Hoe hoog om te sing' },
    ],
    answer: 1,
    why: {
      en: 'Speed, roughly: adagio is slow, andante is a walking pace, allegro is brisk. They are feels rather than numbers, which is why a modern score gives a BPM as well — but the words still say something a number cannot.',
      af: 'Spoed, min of meer: adagio is stadig, andante is ’n stappas, allegro is vinnig. Dit is gevoelens eerder as getalle, en dít is hoekom ’n moderne partituur ook ’n BPM gee — maar die woorde sê steeds iets wat ’n getal nie kan nie.',
    },
  },
  {
    id: 'key-signature',
    ask: { en: 'The sharps or flats printed at the start of every line tell you…', af: 'Die kruise of molle wat aan die begin van elke lyn gedruk word sê vir jou…' },
    options: [
      { en: 'How loud to play', af: 'Hoe hard om te speel' },
      { en: 'Which key the piece is in, so those notes are altered all the way through', af: 'In watter toonsoort die stuk is, sodat daardie note deurgaans verander word' },
      { en: 'How many players are needed', af: 'Hoeveel spelers nodig is' },
      { en: 'Where to breathe', af: 'Waar om asem te haal' },
    ],
    answer: 1,
    why: {
      en: 'The key signature. One sharp is G major, two is D, and so on — they save writing the same accidental a hundred times. Knowing the key is what lets somebody else join in without being told a thing.',
      af: 'Die toonsoortteken. Een kruis is G majeur, twee is D, en so aan — dit spaar ’n mens om dieselfde teken honderd keer te skryf. Om die toonsoort te ken is wat iemand anders in staat stel om saam te speel sonder dat enigiets gesê word.',
    },
  },


  /* ── The Pro Booth, desk by desk ──────────────────────────────────────

     Carli: *"Bou die verskillende funksies uit wat binne ons probooth is
     en waarvoor dit is."*

     A room with six desks in it is only six desks if somebody knows what
     they are for, and the panel that explains each one is read once, on
     the way past, by somebody who came to record.

     Every answer below is held to the room by `check:quiz`: the desk ids
     and what each one does come from `BoothDock.tsx`, so a question here
     cannot go on describing a desk after the desk has changed. A quiz
     that teaches a feature the app does not have is worse than no quiz. */
  {
    id: 'booth-tracks-desk',
    ask: { en: 'In the Pro Booth, where do you change the tempo, the key and the time signature?', af: 'In die Pro Booth, waar verander jy die tempo, die toonsoort en die maatsoort?' },
    options: [
      { en: 'Track controls', af: 'Baanbeheer' },
      { en: 'Mix & master', af: 'Mix & master' },
      { en: 'Stems', af: 'Stems' },
      { en: 'Voice', af: 'Stem' },
    ],
    answer: 0,
    why: {
      en: 'Track controls holds everything about the song as a whole — tempo, key, time signature, the click and the grid — and, for whichever lane you have picked, its level, where it sits left to right, its mute and its solo.',
      af: 'Baanbeheer hou alles oor die liedjie as geheel — tempo, toonsoort, maatsoort, die klik en die rooster — en, vir watter baan jy ook al gekies het, sy vlak, waar dit links tot regs sit, sy demping en sy solo.',
    },
  },
  {
    id: 'booth-mix-desk',
    ask: { en: 'What does the Mix & master desk actually do?', af: 'Wat doen die Mix & master-tafel eintlik?' },
    options: [
      { en: 'Writes the lyrics', af: 'Skryf die lirieke' },
      { en: 'Measures the mix and matches its loudness to everything else', af: 'Meet die mix en pas sy hardheid aan by alles anders' },
      { en: 'Splits the song into parts', af: 'Verdeel die liedjie in dele' },
      { en: 'Records a new take', af: 'Neem ’n nuwe opname' },
    ],
    answer: 1,
    why: {
      en: 'It measures what you have and brings its loudness up to match what everybody else is releasing, so your song does not arrive quietly after the one before it. Measuring is the point — turning it up by ear is how a mix ends up squashed.',
      af: 'Dit meet wat jy het en bring sy hardheid op om te pas by wat almal anders uitreik, sodat jou liedjie nie sag aankom ná die een voor dit nie. Om te meet is die punt — om dit op die oor harder te draai is hoe ’n mix platgedruk word.',
    },
  },
  {
    id: 'booth-stems-split',
    ask: { en: 'The Stems desk can take one recording and…', af: 'Die Stems-tafel kan een opname vat en…' },
    options: [
      { en: 'Make it longer', af: 'Dit langer maak' },
      { en: 'Translate it', af: 'Dit vertaal' },
      { en: 'Split it into its parts — drums, bass, voice', af: 'Dit in sy dele verdeel — dromme, bas, stem' },
      { en: 'Change its key', af: 'Sy toonsoort verander' },
    ],
    answer: 2,
    why: {
      en: 'It pulls one mixed recording apart into separate lanes, so you can turn the drums down on something that was bounced as one file. It is the only way to get at the inside of a song you did not build lane by lane.',
      af: 'Dit trek een gemengde opname uitmekaar in aparte bane, sodat jy die dromme kan afdraai op iets wat as een lêer neergesit is. Dit is die enigste manier om by die binnekant te kom van ’n liedjie wat jy nie baan vir baan gebou het nie.',
    },
  },
  {
    id: 'booth-stems-play',
    ask: { en: 'The Stems desk can also have a new part played for you. How long, and in what key?', af: 'Die Stems-tafel kan ook ’n nuwe party vir jou laat speel. Hoe lank, en in watter toonsoort?' },
    options: [
      { en: 'A whole song, in C', af: '’n Hele liedjie, in C' },
      { en: 'Eight bars, in this song’s own key and tempo', af: 'Agt mate, in hierdie liedjie se eie toonsoort en tempo' },
      { en: 'One note, at any pitch', af: 'Een noot, op enige toonhoogte' },
      { en: 'Four minutes, always at 120 BPM', af: 'Vier minute, altyd op 120 BPM' },
    ],
    answer: 1,
    why: {
      en: 'Eight bars, in the key and tempo the session is already in, so what comes back fits instead of having to be nudged. Eight bars is a phrase — long enough to be a part, short enough to throw away and ask again.',
      af: 'Agt mate, in die toonsoort en tempo waarin die sessie reeds is, sodat wat terugkom pas in plaas daarvan dat dit reggestoot moet word. Agt mate is ’n frase — lank genoeg om ’n party te wees, kort genoeg om weg te gooi en weer te vra.',
    },
  },
  {
    id: 'booth-voice-desk',
    ask: { en: 'The Voice desk sings a lane again in somebody else’s voice. What does it keep?', af: 'Die Stem-tafel sing ’n baan weer in iemand anders se stem. Wat hou dit?' },
    options: [
      { en: 'Nothing — it starts over', af: 'Niks — dit begin oor' },
      { en: 'Your timing and your phrasing', af: 'Jou tydsberekening en jou frasering' },
      { en: 'Only the words', af: 'Net die woorde' },
      { en: 'The key, but not the rhythm', af: 'Die toonsoort, maar nie die ritme nie' },
    ],
    answer: 1,
    why: {
      en: 'Your performance stays — where you pushed a word early, where you held one — and only the voice changes. That is why it is worth singing the take properly even when you know you will be swapping the voice afterwards.',
      af: 'Jou vertolking bly — waar jy ’n woord vroeg gestoot het, waar jy een gehou het — en net die stem verander. Dít is hoekom dit die moeite werd is om die opname behoorlik te sing, selfs wanneer jy weet jy gaan die stem daarna omruil.',
    },
  },
  {
    id: 'booth-effects-desk',
    ask: { en: 'Which desk do you open to record a take and shape a lane’s tone?', af: 'Watter tafel maak jy oop om ’n opname te maak en ’n baan se toon te vorm?' },
    options: [
      { en: 'Copilot', af: 'Copilot' },
      { en: 'Track controls', af: 'Baanbeheer' },
      { en: 'Audio effects', af: 'Klankeffekte' },
      { en: 'Mix & master', af: 'Mix & master' },
    ],
    answer: 2,
    why: {
      en: 'Audio effects: record a take, shape the tone of a lane, run it through an amp, and mix everything down into one song. Taking the room off a recording lives in here too.',
      af: 'Klankeffekte: neem ’n opname, vorm die toon van ’n baan, stuur dit deur ’n versterker, en meng alles af in een liedjie. Om die vertrek van ’n opname af te haal leef ook hierin.',
    },
  },
  {
    id: 'booth-copilot-desk',
    ask: { en: 'What can the Pro Booth’s Copilot do that just answering a question cannot?', af: 'Wat kan die Pro Booth se Copilot doen wat net ’n vraag beantwoord nie kan nie?' },
    options: [
      { en: 'Make the change to the mix for you', af: 'Die verandering aan die mix vir jou maak' },
      { en: 'Sing the part', af: 'Die party sing' },
      { en: 'Buy you credits', af: 'Krediete vir jou koop' },
      { en: 'Post the song', af: 'Die liedjie plaas' },
    ],
    answer: 0,
    why: {
      en: 'You can ask what to change about the mix and have it changed — it moves the levels rather than telling you which ones to move. Ask it what is wrong first; a mix you cannot hear the problem in is one you cannot judge the fix on either.',
      af: 'Jy kan vra wat aan die mix verander moet word en dit laat verander — dit skuif die vlakke eerder as om jou te vertel watter om te skuif. Vra dit eers wat fout is; ’n mix waarin jy nie die probleem kan hoor nie is een waarvan jy ook nie die oplossing kan beoordeel nie.',
    },
  },
  {
    id: 'booth-solo-mute',
    ask: { en: 'In the Pro Booth, what is the difference between solo and mute on a lane?', af: 'In die Pro Booth, wat is die verskil tussen solo en demp op ’n baan?' },
    options: [
      { en: 'They are the same button', af: 'Hulle is dieselfde knoppie' },
      { en: 'Mute silences that lane; solo silences everything except it', af: 'Demp maak daardie baan stil; solo maak alles behalwe dit stil' },
      { en: 'Solo deletes the lane', af: 'Solo vee die baan uit' },
      { en: 'Mute lowers it by half', af: 'Demp verlaag dit met die helfte' },
    ],
    answer: 1,
    why: {
      en: 'Opposite ends of the same question. Solo to hear one thing on its own; mute to hear everything except it. Fixing a lane in solo is the classic trap — a part that sounds wonderful alone often disappears the moment the rest comes back.',
      af: 'Teenoorgestelde kante van dieselfde vraag. Solo om een ding op sy eie te hoor; demp om alles behalwe dit te hoor. Om ’n baan in solo reg te maak is die klassieke strik — ’n party wat alleen wonderlik klink verdwyn dikwels die oomblik as die res terugkom.',
    },
  },
  {
    id: 'booth-click',
    ask: { en: 'What is the click in the Pro Booth for?', af: 'Waarvoor is die klik in die Pro Booth?' },
    options: [
      { en: 'It marks where the song ends', af: 'Dit merk waar die liedjie eindig' },
      { en: 'It plays in your ears so your take lands on the beat', af: 'Dit speel in jou ore sodat jou opname op die maat land' },
      { en: 'It counts how many takes you have done', af: 'Dit tel hoeveel opnames jy gedoen het' },
      { en: 'It is a sound effect', af: 'Dit is ’n klankeffek' },
    ],
    answer: 1,
    why: {
      en: 'A metronome you record against, so every lane lines up with every other one. Without it two takes drift apart and no amount of dragging afterwards makes them sit together properly.',
      af: '’n Metronoom waarteen jy opneem, sodat elke baan met elke ander een in lyn is. Sonder dit dryf twee opnames uitmekaar en geen hoeveelheid sleep daarna laat hulle behoorlik saamsit nie.',
    },
  },
  {
    id: 'booth-snap',
    ask: { en: 'Snap in the Pro Booth timeline can be set to…', af: 'Klink vas in die Pro Booth se tydlyn kan gestel word op…' },
    options: [
      { en: 'Off, to the bar, or to the beat', af: 'Af, op die maat, of op die slag' },
      { en: 'On or off only', af: 'Net aan of af' },
      { en: 'Loud or soft', af: 'Hard of sag' },
      { en: 'One lane at a time', af: 'Een baan op ’n slag' },
    ],
    answer: 0,
    why: {
      en: 'Three settings. Snapping to the bar keeps whole sections lined up; to the beat is finer, for a clip that has to land on one hit; off is for anything that has to sit slightly early or late on purpose, which is most of what makes a groove feel human.',
      af: 'Drie instellings. Om op die maat vas te klink hou hele afdelings in lyn; op die slag is fyner, vir ’n knipsel wat op een hou moet land; af is vir enigiets wat doelbewus effens vroeg of laat moet sit, wat die meeste is van wat ’n groove menslik laat voel.',
    },
  },
  {
    id: 'booth-interlock',
    ask: { en: 'You lock one lane to another in the Pro Booth. What gets locked?', af: 'Jy maak een baan aan ’n ander vas in die Pro Booth. Wat word vasgemaak?' },
    options: [
      { en: 'Everything — level, mute, solo and all', af: 'Alles — vlak, demping, solo en al' },
      { en: 'Only time: drag either and both slide by the same amount', af: 'Net tyd: sleep enige een en albei skuif met dieselfde hoeveelheid' },
      { en: 'Their key', af: 'Hulle toonsoort' },
      { en: 'Nothing until you press play', af: 'Niks totdat jy speel druk nie' },
    ],
    answer: 1,
    why: {
      en: 'Time only. A part that sits under another part stays under it when either is dragged — but the level, the mute, the solo and where each is cut stay each lane’s own, because those are exactly what you locked two lanes together in order to be able to set differently.',
      af: 'Net tyd. ’n Deel wat onder ’n ander deel sit bly daar wanneer enige een gesleep word — maar die vlak, die demping, die solo en waar elkeen gesny is bly elke baan se eie, want dit is juis wat jy twee bane aan mekaar vasgemaak het om verskillend te kan stel.',
    },
  },
  {
    id: 'booth-paid-desks',
    ask: { en: 'Which of these Pro Booth desks spends credits?', af: 'Watter van hierdie Pro Booth-tafels spandeer krediete?' },
    options: [
      { en: 'Track controls', af: 'Baanbeheer' },
      { en: 'Mix & master', af: 'Mix & master' },
      { en: 'Stems, Voice and Audio effects', af: 'Stems, Stem en Klankeffekte' },
      { en: 'All six of them', af: 'Al ses van hulle' },
    ],
    answer: 2,
    why: {
      en: 'Three of the six. The ones that ask a machine to make something new for you — splitting a recording, singing a lane in another voice, taking the room off a take — cost credits; moving a fader, setting the tempo and asking the Copilot what to change do not.',
      af: 'Drie van die ses. Dié wat ’n masjien vra om iets nuuts vir jou te maak — ’n opname verdeel, ’n baan in ’n ander stem sing, die vertrek van ’n opname afhaal — kos krediete; om ’n skuifie te beweeg, die tempo te stel en die Copilot te vra wat om te verander, kos nie.',
    },
  },


  /* ── Two decades everybody half-remembers ─────────────────────────────

     Carli: *"goeie general 80's, 90's bekende musiek quiz."*

     The only questions in this file that are facts about music rather
     than about somebody's own song, and they earn it a different way:
     this is the shared ground a room full of strangers already stands on,
     and it is where most of what this app's members are reaching for was
     made. A fair share of them are South African on purpose — Graceland
     and Brenda Fassie are as much this history as Thriller is. */
  {
    id: 'eighties-thriller',
    ask: { en: 'Which 1982 album is the best-selling of all time?', af: 'Watter 1982-album is die topverkoper van alle tye?' },
    options: [
      { en: 'Born in the U.S.A.', af: 'Born in the U.S.A.' },
      { en: 'Thriller', af: 'Thriller' },
      { en: 'Purple Rain', af: 'Purple Rain' },
      { en: 'Brothers in Arms', af: 'Brothers in Arms' },
    ],
    answer: 1,
    why: {
      en: 'Michael Jackson’s Thriller, produced by Quincy Jones. Its fourteen-minute video is the reason a pop song was ever expected to come with a film at all — which is the ancestor of every music video this app makes.',
      af: 'Michael Jackson se Thriller, vervaardig deur Quincy Jones. Sy veertien minute lange video is die rede hoekom daar ooit van ’n popliedjie verwag is om met ’n film saam te kom — en dit is die voorvader van elke musiekvideo wat hierdie app maak.',
    },
  },
  {
    id: 'eighties-mtv',
    ask: { en: 'MTV launched in 1981. Which song did it play first?', af: 'MTV het in 1981 begin uitsaai. Watter liedjie het dit eerste gespeel?' },
    options: [
      { en: 'Video Killed the Radio Star', af: 'Video Killed the Radio Star' },
      { en: 'Billie Jean', af: 'Billie Jean' },
      { en: 'Take On Me', af: 'Take On Me' },
      { en: 'Sweet Dreams', af: 'Sweet Dreams' },
    ],
    answer: 0,
    why: {
      en: 'The Buggles, and the joke wrote itself. Within five years a song without a video was at a real disadvantage, which was the first time in history that how a song LOOKED decided how far it travelled.',
      af: 'The Buggles, en die grap het homself geskryf. Binne vyf jaar was ’n liedjie sonder ’n video werklik benadeel, en dit was die eerste keer in die geskiedenis dat hoe ’n liedjie GELYK het, besluit het hoe ver dit reis.',
    },
  },
  {
    id: 'eighties-liveaid',
    ask: { en: 'What was Live Aid, in 1985?', af: 'Wat was Live Aid, in 1985?' },
    options: [
      { en: 'A record label', af: '’n Platemaatskappy' },
      { en: 'A two-continent concert broadcast live to raise famine relief', af: '’n Konsert op twee vastelande wat regstreeks uitgesaai is om hongersnoodhulp in te samel' },
      { en: 'A talent competition', af: '’n Talentkompetisie' },
      { en: 'An early streaming service', af: '’n Vroeë stroomdiens' },
    ],
    answer: 1,
    why: {
      en: 'London and Philadelphia on the same day, carried live to something like 1.5 billion people. Queen’s twenty minutes is still studied as the best live set ever played, and the lesson in it is unglamorous: they rehearsed for the broadcast, not for the room.',
      af: 'Londen en Philadelphia op dieselfde dag, regstreeks na sowat 1,5 miljard mense gedra. Queen se twintig minute word steeds bestudeer as die beste regstreekse stel wat ooit gespeel is, en die les daarin is onglansryk: hulle het vir die uitsending geoefen, nie vir die saal nie.',
    },
  },
  {
    id: 'nineties-teenspirit',
    ask: { en: 'Which 1991 single is usually credited with breaking grunge worldwide?', af: 'Watter 1991-snit word gewoonlik gekrediteer daarmee dat dit grunge wêreldwyd oopgebreek het?' },
    options: [
      { en: 'Black Hole Sun', af: 'Black Hole Sun' },
      { en: 'Alive', af: 'Alive' },
      { en: 'Smells Like Teen Spirit', af: 'Smells Like Teen Spirit' },
      { en: 'Creep', af: 'Creep' },
    ],
    answer: 2,
    why: {
      en: 'Nirvana, from Nevermind. It is a plain loud-quiet-loud song — verse almost whispered, chorus with everything on — and that one structural trick is still the fastest way to make a chorus feel enormous without adding a thing.',
      af: 'Nirvana, van Nevermind. Dit is ’n eenvoudige hard-sag-hard liedjie — vers byna gefluister, koor met alles aan — en daardie een strukturele truuk is steeds die vinnigste manier om ’n koor enorm te laat voel sonder om iets by te voeg.',
    },
  },
  {
    id: 'eighties-graceland',
    ask: { en: 'Paul Simon’s Graceland (1986) was built with which South African group?', af: 'Paul Simon se Graceland (1986) is saam met watter Suid-Afrikaanse groep gebou?' },
    options: [
      { en: 'Ladysmith Black Mambazo', af: 'Ladysmith Black Mambazo' },
      { en: 'Mango Groove', af: 'Mango Groove' },
      { en: 'Juluka', af: 'Juluka' },
      { en: 'Stimela', af: 'Stimela' },
    ],
    answer: 0,
    why: {
      en: 'Joseph Shabalala’s Ladysmith Black Mambazo, singing isicathamiya — the soft-stepping close-harmony style from the Zulu migrant hostels. The album introduced it to the world and started an argument about credit and the cultural boycott that is still worth reading about.',
      af: 'Joseph Shabalala se Ladysmith Black Mambazo, wat isicathamiya sing — die sagvoetige noue-harmonie styl uit die Zoeloe-trekarbeidershostelle. Die album het dit aan die wêreld bekendgestel en ’n argument oor erkenning en die kulturele boikot begin wat steeds die moeite werd is om oor te lees.',
    },
  },
  {
    id: 'eighties-clegg',
    ask: { en: 'Johnny Clegg’s 1987 song Asimbonanga was about whom?', af: 'Johnny Clegg se 1987-liedjie Asimbonanga het oor wie gegaan?' },
    options: [
      { en: 'Steve Biko only', af: 'Net Steve Biko' },
      { en: 'Nelson Mandela, then still in prison', af: 'Nelson Mandela, toe nog in die tronk' },
      { en: 'His own father', af: 'Sy eie pa' },
      { en: 'Nobody in particular', af: 'Niemand in besonder nie' },
    ],
    answer: 1,
    why: {
      en: '“We have not seen him.” It named Mandela while it was illegal to, and it was banned here and played everywhere else. Clegg was called le Zoulou Blanc in France — proof that a song in a language most of its audience does not speak still travels.',
      af: '“Ons het hom nie gesien nie.” Dit het Mandela genoem terwyl dit onwettig was om dit te doen, en dit is hier verban en oral elders gespeel. Clegg is in Frankryk le Zoulou Blanc genoem — bewys dat ’n liedjie in ’n taal wat die meeste van sy gehoor nie praat nie, steeds reis.',
    },
  },
  {
    id: 'nineties-brenda',
    ask: { en: 'Who was called the Queen of African Pop, with hits from Weekend Special to Vulindlela?', af: 'Wie is die Queen of African Pop genoem, met treffers van Weekend Special tot Vulindlela?' },
    options: [
      { en: 'Yvonne Chaka Chaka', af: 'Yvonne Chaka Chaka' },
      { en: 'Miriam Makeba', af: 'Miriam Makeba' },
      { en: 'Brenda Fassie', af: 'Brenda Fassie' },
      { en: 'Letta Mbulu', af: 'Letta Mbulu' },
    ],
    answer: 2,
    why: {
      en: 'Brenda Fassie. Weekend Special in 1983 at sixteen, Vulindlela in 1997, and a career loud enough that Time called her the Madonna of the Townships. Vulindlela is a wedding song and it still fills a room faster than almost anything else recorded here.',
      af: 'Brenda Fassie. Weekend Special in 1983 op sestien, Vulindlela in 1997, en ’n loopbaan hard genoeg dat Time haar die Madonna of the Townships genoem het. Vulindlela is ’n troueliedjie en dit vul steeds ’n vertrek vinniger as byna enigiets anders wat hier opgeneem is.',
    },
  },
  {
    id: 'nineties-whitney',
    ask: { en: 'Whitney Houston’s I Will Always Love You (1992) was written by…', af: 'Whitney Houston se I Will Always Love You (1992) is geskryf deur…' },
    options: [
      { en: 'Dolly Parton', af: 'Dolly Parton' },
      { en: 'Whitney Houston herself', af: 'Whitney Houston self' },
      { en: 'Diane Warren', af: 'Diane Warren' },
      { en: 'Kevin Costner', af: 'Kevin Costner' },
    ],
    answer: 0,
    why: {
      en: 'Dolly Parton wrote and recorded it in 1973 as a quiet country goodbye. The same words and chords, sung another way, became the biggest single of the decade — which is the clearest lesson there is that the arrangement is half the song.',
      af: 'Dolly Parton het dit in 1973 geskryf en opgeneem as ’n stil country-afskeid. Dieselfde woorde en akkoorde, op ’n ander manier gesing, het die grootste snit van die dekade geword — en dit is die duidelikste les wat daar is dat die verwerking die helfte van die liedjie is.',
    },
  },
  {
    id: 'nineties-autotune',
    ask: { en: 'Which 1998 hit made Auto-Tune famous by leaving the effect obvious on purpose?', af: 'Watter 1998-treffer het Auto-Tune bekend gemaak deur die effek doelbewus voor die hand liggend te los?' },
    options: [
      { en: 'Believe', af: 'Believe' },
      { en: '…Baby One More Time', af: '…Baby One More Time' },
      { en: 'Torn', af: 'Torn' },
      { en: 'Truly Madly Deeply', af: 'Truly Madly Deeply' },
    ],
    answer: 0,
    why: {
      en: 'Cher’s Believe. Auto-Tune was written to correct pitch quietly; turned all the way up it snaps the voice between notes instead, and that accident became an instrument. Andy Hildebrand, who wrote it, had been using the same maths to find oil underground.',
      af: 'Cher se Believe. Auto-Tune is geskryf om toonhoogte stilweg reg te stel; heeltemal oopgedraai klik dit die stem eerder tussen note vas, en daardie ongeluk het ’n instrument geword. Andy Hildebrand, wat dit geskryf het, het dieselfde wiskunde gebruik om olie ondergronds te vind.',
    },
  },
  {
    id: 'eighties-walkman',
    ask: { en: 'What did the Sony Walkman change about listening?', af: 'Wat het die Sony Walkman aan luister verander?' },
    options: [
      { en: 'It made music louder', af: 'Dit het musiek harder gemaak' },
      { en: 'It made listening private and portable, one person at a time', af: 'Dit het luister privaat en draagbaar gemaak, een persoon op ’n slag' },
      { en: 'It was the first device to play records', af: 'Dit was die eerste toestel wat plate kon speel' },
      { en: 'It recorded live concerts', af: 'Dit het regstreekse konserte opgeneem' },
    ],
    answer: 1,
    why: {
      en: 'Before it, music happened in a room and everybody in the room got it. After it, a song could be a private thing you carried, which changed what songs were written for. Every mix you make today is mixed for headphones for the same reason.',
      af: 'Voor dit het musiek in ’n vertrek gebeur en almal in die vertrek het dit gekry. Daarna kon ’n liedjie ’n privaat ding wees wat jy saamdra, wat verander het waarvoor liedjies geskryf is. Elke mix wat jy vandag maak, word om dieselfde rede vir oorfone gemeng.',
    },
  },
  {
    id: 'nineties-spice',
    ask: { en: 'Wannabe (1996) was the debut single of…', af: 'Wannabe (1996) was die eerste snit van…' },
    options: [
      { en: 'All Saints', af: 'All Saints' },
      { en: 'TLC', af: 'TLC' },
      { en: 'The Spice Girls', af: 'The Spice Girls' },
      { en: 'En Vogue', af: 'En Vogue' },
    ],
    answer: 2,
    why: {
      en: 'The Spice Girls, and it went to number one in over thirty countries. Its opening line is the hook — no build, no introduction, the thing you remember is the first thing you hear. Worth copying when a song has fifteen seconds to hold somebody.',
      af: 'The Spice Girls, en dit het in meer as dertig lande nommer een gehaal. Sy openingsreël is die hook — geen opbou, geen inleiding nie, die ding wat jy onthou is die eerste ding wat jy hoor. Die moeite werd om na te doen wanneer ’n liedjie vyftien sekondes het om iemand te hou.',
    },
  },
  {
    id: 'nineties-kwaito-arthur',
    ask: { en: 'Kwaito grew up in nineties South Africa. What is its most recognisable trait?', af: 'Kwaito het in die negentigerjare se Suid-Afrika grootgeword. Wat is sy herkenbaarste eienskap?' },
    options: [
      { en: 'House at half speed, with words spoken over it in township slang', af: 'House op halfspoed, met woorde daaroor gepraat in township-sleng' },
      { en: 'Very fast drum and bass', af: 'Baie vinnige drum and bass' },
      { en: 'Acoustic guitar and close harmony', af: 'Akoestiese kitaar en noue harmonie' },
      { en: 'Big band brass', af: 'Groot orkes-koper' },
    ],
    answer: 0,
    why: {
      en: 'Imported house records slowed down to around 100 BPM, with chanted, half-spoken vocals over the top — Arthur Mafokate, Boom Shaka, TKZee. Slowing a groove down until it leans is a move you can ask for by name in the sound box.',
      af: 'Ingevoerde house-plate wat verstadig is tot omtrent 100 BPM, met gesing-gepraat bo-oor — Arthur Mafokate, Boom Shaka, TKZee. Om ’n groove te verstadig totdat dit leun is ’n set wat jy op sy naam in die klankblokkie kan vra.',
    },
  },


  /* ── The choir, and five jokes that are really questions ─────────────

     Carli: *"sommer 'n paar choir en music joke quiz."*

     The choir ones are here because choral singing is the biggest music
     tradition in this country by a distance, and almost nothing written
     about making music online assumes you came from one.

     The jokes are jokes, and every one of them turns on a real piece of
     theory — a flat, a key, a tempo, who has the tune. The explanation
     is where the teaching happens, which is the same bargain every other
     question in this file makes; these ones just get a laugh first. */
  {
    id: 'choir-solfa',
    ask: { en: 'In tonic sol-fa, what does doh move to when the key changes?', af: 'In tonic sol-fa, waarheen skuif doh wanneer die toonsoort verander?' },
    options: [
      { en: 'Nowhere — doh is always C', af: 'Nêrens — doh is altyd C' },
      { en: 'Doh moves to the new key’s home note', af: 'Doh skuif na die nuwe toonsoort se tuisnoot' },
      { en: 'Doh becomes soh', af: 'Doh word soh' },
      { en: 'It is only used for one key', af: 'Dit word net vir een toonsoort gebruik' },
    ],
    answer: 1,
    why: {
      en: 'Doh is wherever home is, so the same solfa reads the same in every key — which is exactly why it spread through South African choirs and why a choir can be taught a part with no printed music at all. Sol-fa teaches the shape; staff notation teaches the pitch.',
      af: 'Doh is waar die tuiste ook al is, so dieselfde solfa lees dieselfde in elke toonsoort — en dít is presies hoekom dit deur Suid-Afrikaanse kore versprei het en hoekom ’n koor ’n party geleer kan word met geen gedrukte musiek nie. Sol-fa leer die vorm; notebalk leer die toonhoogte.',
    },
  },
  {
    id: 'choir-staggered',
    ask: { en: 'What is staggered breathing in a choir?', af: 'Wat is verspreide asemhaling in ’n koor?' },
    options: [
      { en: 'Everybody breathes at the same marked place', af: 'Almal haal op dieselfde gemerkte plek asem' },
      { en: 'Nobody breathes for the whole phrase', af: 'Niemand haal die hele frase lank asem nie' },
      { en: 'Singers breathe at different moments so the line never stops', af: 'Sangers haal op verskillende oomblikke asem sodat die lyn nooit ophou nie' },
      { en: 'Only the sopranos breathe', af: 'Net die soprane haal asem' },
    ],
    answer: 2,
    why: {
      en: 'You drop out quietly, breathe, and slip back in while your neighbours hold — so a phrase longer than any one pair of lungs sounds unbroken. Come back in softly: a voice returning at full volume is heard, and the whole point is that nobody hears it.',
      af: 'Jy val stilweg uit, haal asem, en glip weer in terwyl jou bure hou — sodat ’n frase langer as enige paar longe ononderbroke klink. Kom sag terug in: ’n stem wat op vol volume terugkeer word gehoor, en die hele punt is dat niemand dit hoor nie.',
    },
  },
  {
    id: 'choir-blend',
    ask: { en: 'A choir is said to blend well when…', af: 'Daar word gesê ’n koor smelt goed saam wanneer…' },
    options: [
      { en: 'Every singer is as loud as possible', af: 'Elke sanger so hard as moontlik is' },
      { en: 'No single voice can be picked out of the section', af: 'Geen enkele stem uit die afdeling uitgeken kan word nie' },
      { en: 'Everybody sings the same part', af: 'Almal dieselfde party sing' },
      { en: 'The sopranos are twice as loud as the rest', af: 'Die soprane twee keer so hard soos die res is' },
    ],
    answer: 1,
    why: {
      en: 'Not volume — sameness of vowel, tone and timing. Most blend problems are vowels: eight people singing “aa” eight slightly different ways sounds like a crowd, and the same eight matching the vowel sound like one large voice.',
      af: 'Nie volume nie — eendersheid van vokaal, toon en tydsberekening. Die meeste saamsmelt-probleme is vokale: agt mense wat “aa” op agt effens verskillende maniere sing klink soos ’n skare, en dieselfde agt wat die vokaal laat pas klink soos een groot stem.',
    },
  },
  {
    id: 'choir-going-flat',
    ask: { en: 'An unaccompanied choir slowly drifts flat. The usual cause is…', af: '’n Onbegeleide koor sak stadig plat. Die gewone oorsaak is…' },
    options: [
      { en: 'The song is too short', af: 'Die liedjie is te kort' },
      { en: 'Tiredness and shallow breath, so the support under the note drops', af: 'Moegheid en vlak asem, sodat die ondersteuning onder die noot sak' },
      { en: 'Too many sopranos', af: 'Te veel soprane' },
      { en: 'Singing in the wrong language', af: 'Om in die verkeerde taal te sing' },
    ],
    answer: 1,
    why: {
      en: 'Pitch falls when the air behind it does. Long slow pieces at the end of a rehearsal are where it happens, and the fix is breath and energy rather than telling everybody to sing higher — which only makes them push and go sharp in places.',
      af: 'Toonhoogte val wanneer die lug daaragter val. Lang stadige stukke aan die einde van ’n oefening is waar dit gebeur, en die oplossing is asem en energie eerder as om almal te sê om hoër te sing — wat hulle net laat druk en op plekke skerp laat raak.',
    },
  },
  {
    id: 'choir-upbeat',
    ask: { en: 'Before a choir starts, the conductor gives a small beat upwards. What is it for?', af: 'Voor ’n koor begin, gee die dirigent ’n klein slag opwaarts. Waarvoor is dit?' },
    options: [
      { en: 'It shows how loud to sing', af: 'Dit wys hoe hard om te sing' },
      { en: 'It is the breath — it sets the speed and tells everybody when to take air', af: 'Dit is die asem — dit stel die spoed en sê vir almal wanneer om lug in te neem' },
      { en: 'It is a greeting', af: 'Dit is ’n groet' },
      { en: 'It marks the end of the piece', af: 'Dit merk die einde van die stuk' },
    ],
    answer: 1,
    why: {
      en: 'The upbeat carries the tempo and the breath in one gesture, which is why a choir that starts ragged usually was not given a clear one. Anybody counting a band in is doing the same job; the count-in on a click is the mechanical version of it.',
      af: 'Die opslag dra die tempo en die asem in een gebaar, en dít is hoekom ’n koor wat rafelrig begin gewoonlik nie ’n duidelike een gekry het nie. Enigiemand wat ’n orkes intel doen dieselfde werk; die intel op ’n klik is die meganiese weergawe daarvan.',
    },
  },
  {
    id: 'choir-isicathamiya',
    ask: { en: 'Isicathamiya is sung…', af: 'Isicathamiya word gesing…' },
    options: [
      { en: 'With a full drum kit', af: 'Met ’n volledige tromstel' },
      { en: 'Unaccompanied, in close harmony, deliberately soft-footed', af: 'Onbegeleid, in noue harmonie, doelbewus sagvoetig' },
      { en: 'At very high speed', af: 'Op baie hoë spoed' },
      { en: 'By one singer alone', af: 'Deur een sanger alleen' },
    ],
    answer: 1,
    why: {
      en: 'The name comes from stepping softly — it grew in migrant workers’ hostels where competitions ran through the night and the neighbours had to be able to sleep. Constraint made the style: no instruments, no stamping, so everything had to be in the voices.',
      af: 'Die naam kom van sag trap — dit het in trekarbeidershostelle gegroei waar kompetisies deur die nag geloop het en die bure moes kon slaap. Beperking het die styl gemaak: geen instrumente, geen stamp nie, so alles moes in die stemme wees.',
    },
  },
  {
    id: 'joke-flat-minor',
    ask: { en: 'What do you get if you drop a piano down a mine shaft?', af: 'Wat kry jy as jy ’n klavier in ’n mynskag laat val?' },
    options: [
      { en: 'A flat major', af: '’n A-mol majeur' },
      { en: 'A flat minor', af: '’n A-mol mineur' },
      { en: 'A sharp third', af: '’n Skerp derde' },
      { en: 'A rest', af: '’n Rus' },
    ],
    answer: 1,
    why: {
      en: 'A flat miner. The joke only works if you know both words: flat is the ♭ that lowers a note a semitone, and minor is the sadder of the two scales. Drop it on an army base and you get A flat major instead.',
      af: '’n Plat mynwerker. Die grap werk net as jy albei woorde ken: mol is die ♭ wat ’n noot ’n halftoon verlaag, en mineur is die hartseerder van die twee toonlere. Laat val dit op ’n weermagbasis en jy kry A-mol majeur.',
    },
  },
  {
    id: 'joke-soprano-bulb',
    ask: { en: 'How many sopranos does it take to change a light bulb?', af: 'Hoeveel soprane vat dit om ’n gloeilamp te vervang?' },
    options: [
      { en: 'Four, one for each part', af: 'Vier, een vir elke party' },
      { en: 'None, the altos do it', af: 'Geen, die alte doen dit' },
      { en: 'One — she holds it and the world revolves around her', af: 'Een — sy hou dit vas en die wêreld draai om haar' },
      { en: 'Two, and they argue about it', af: 'Twee, en hulle stry daaroor' },
    ],
    answer: 2,
    why: {
      en: 'Every choir tells this one, and it is about the melody rather than about sopranos: the top line is the one the ear follows, so it gets the tune, the solos and the blame. The altos, tenors and basses are doing the harmony nobody notices until it stops.',
      af: 'Elke koor vertel hierdie een, en dit gaan oor die melodie eerder as oor soprane: die boonste lyn is die een wat die oor volg, so dit kry die wysie, die solo’s en die skuld. Die alte, tenore en basse doen die harmonie wat niemand raaksien totdat dit ophou nie.',
    },
  },
  {
    id: 'joke-drum-machine',
    ask: { en: 'What is the difference between a drummer and a drum machine?', af: 'Wat is die verskil tussen ’n dromspeler en ’n dromsmasjien?' },
    options: [
      { en: 'The machine is louder', af: 'Die masjien is harder' },
      { en: 'You only have to punch the tempo into a drum machine once', af: 'Jy moet die tempo net een keer in ’n dromsmasjien inslaan' },
      { en: 'The machine needs no sticks', af: 'Die masjien het geen stokke nodig nie' },
      { en: 'There is none', af: 'Daar is geen' },
    ],
    answer: 1,
    why: {
      en: 'Mean, and it names a real thing: a machine holds one tempo for ever and a person breathes. That is not only a weakness — a drummer speeding up half a BPM into a chorus is part of why it lifts, which is why programmed drums often get a little humanising put back.',
      af: 'Gemeen, en dit benoem iets werkliks: ’n masjien hou vir ewig een tempo en ’n mens haal asem. Dit is nie net ’n swakheid nie — ’n dromspeler wat ’n halwe BPM vinniger raak die koor in, is deel van hoekom dit oplig, en dít is hoekom geprogrammeerde dromme dikwels ’n bietjie menslikheid teruggesit kry.',
    },
  },
  {
    id: 'joke-piano-keys',
    ask: { en: 'Why could the pianist not get into his house?', af: 'Hoekom kon die pianis nie by sy huis inkom nie?' },
    options: [
      { en: 'He forgot the address', af: 'Hy het die adres vergeet' },
      { en: 'He left his keys in the piano', af: 'Hy het sy sleutels in die klavier gelos' },
      { en: 'The door was flat', af: 'Die deur was plat' },
      { en: 'He was in the wrong octave', af: 'Hy was in die verkeerde oktaaf' },
    ],
    answer: 1,
    why: {
      en: 'Two meanings of one word. A piano’s keys are the things you press; a song’s key is the home note everything is built around. English borrowed the second from the first, and knowing that is half of reading a chord chart.',
      af: 'Twee betekenisse van een woord. ’n Klavier se klawers is die goed wat jy druk; ’n liedjie se toonsoort is die tuisnoot waarom alles gebou is. In Engels heet albei “key”, en om dit te weet is die helfte van hoe ’n mens ’n akkoordkaart lees.',
    },
  },
  {
    id: 'joke-viola',
    ask: { en: 'An old orchestra joke: what is the difference between a violin and a viola?', af: '’n Ou orkesgrap: wat is die verskil tussen ’n viool en ’n altviool?' },
    options: [
      { en: 'The viola burns longer', af: 'Die altviool brand langer' },
      { en: 'The viola has no strings', af: 'Die altviool het geen snare nie' },
      { en: 'The violin is played sitting down', af: 'Die viool word sittende gespeel' },
      { en: 'Nothing at all', af: 'Niks hoegenaamd nie' },
    ],
    answer: 0,
    why: {
      en: 'Because it is bigger — and the orchestra has picked on violas for two hundred years for playing the inner line nobody hums. That inner line is the harmony holding the chord together, which is why an arrangement with no violas sounds hollow and nobody can say why.',
      af: 'Omdat dit groter is — en die orkes pik al tweehonderd jaar op altviole omdat hulle die binnelyn speel wat niemand neurie nie. Daardie binnelyn is die harmonie wat die akkoord bymekaar hou, en dít is hoekom ’n verwerking sonder altviole hol klink en niemand kan sê hoekom nie.',
    },
  },


  /* ── Asking for a song, and what is happening when you do ────────────

     Carli: *"ook lekker goed wat help om te leer wat om in gedagte te hou
     om goeie musiek te prompt, dalk kan jy die computer science agter
     musiekmaak ook uitlig."*

     Two halves of one thing. The prompting half is the most useful
     writing in this file, because it is the difference between a
     generation that is worth keeping and two credits gone. The computer
     science half is why those rules are the rules: a model that predicts
     what comes next from an enormous amount of music will answer a vague
     ask with an average, and that is not a fault to be worked around —
     it is the machine doing exactly what it is. */
  {
    id: 'prompt-specific',
    ask: { en: 'Which of these will get you a better song?', af: 'Watter van hierdie sal jou ’n beter liedjie gee?' },
    options: [
      { en: '“A nice upbeat song”', af: '“’n Lekker opgewekte liedjie”' },
      { en: '“Afrikaans country ballad, 72 BPM, acoustic guitar and pedal steel, sad but warm”', af: '“Afrikaanse country-ballade, 72 BPM, akoestiese kitaar en pedal steel, hartseer maar warm”' },
      { en: '“Make it good”', af: '“Maak dit goed”' },
      { en: '“Something like the radio”', af: '“Iets soos die radio”' },
    ],
    answer: 1,
    why: {
      en: 'Genre, tempo, two or three instruments and a mood. A vague ask gets the average of everything the model has heard, and the average of all music is not a song anybody wants. Specific is not the same as long — four facts beat a paragraph.',
      af: 'Genre, tempo, twee of drie instrumente en ’n stemming. ’n Vae versoek kry die gemiddeld van alles wat die model gehoor het, en die gemiddeld van alle musiek is nie ’n liedjie wat iemand wil hê nie. Spesifiek is nie dieselfde as lank nie — vier feite klop ’n paragraaf.',
    },
  },
  {
    id: 'prompt-not-artist',
    ask: { en: 'Why is “make it sound like Beyoncé” a poor prompt?', af: 'Hoekom is “laat dit soos Beyoncé klink” ’n swak prompt?' },
    options: [
      { en: 'It is too short', af: 'Dit is te kort' },
      { en: 'It names a person instead of a sound, and copying an artist is somebody else’s right', af: 'Dit noem ’n persoon in plaas van ’n klank, en om ’n kunstenaar na te maak is iemand anders se reg' },
      { en: 'The model has never heard of her', af: 'Die model het nog nooit van haar gehoor nie' },
      { en: 'It only works for slow songs', af: 'Dit werk net vir stadige liedjies' },
    ],
    answer: 1,
    why: {
      en: 'Name the sound, not the singer: “breathy close-mic pop vocal, tight stacked harmonies, sparse trap drums” says what you actually want and is yours to release. An artist’s name is both legally somebody else’s and, oddly, less precise.',
      af: 'Noem die klank, nie die sanger nie: “asemrige na-aan-mikrofoon popstem, styf gestapelde harmonieë, yl trap-dromme” sê wat jy werklik wil hê en is joune om uit te reik. ’n Kunstenaar se naam is albei wettig iemand anders s’n en, vreemd genoeg, minder presies.',
    },
  },
  {
    id: 'prompt-few-instruments',
    ask: { en: 'You list twelve instruments in the sound box. What usually happens?', af: 'Jy lys twaalf instrumente in die klankblokkie. Wat gebeur gewoonlik?' },
    options: [
      { en: 'You get all twelve, clearly', af: 'Jy kry al twaalf, duidelik' },
      { en: 'A crowded mix where none of them is the sound of the song', af: '’n Vol mix waar nie een van hulle die klank van die liedjie is nie' },
      { en: 'The song gets longer', af: 'Die liedjie word langer' },
      { en: 'Nothing changes', af: 'Niks verander nie' },
    ],
    answer: 1,
    why: {
      en: 'Two or three named instruments give a song an identity; twelve give it a wash. Real arrangements are mostly thin — a verse with a guitar and a voice, and the rest saved for the chorus so that arriving means something.',
      af: 'Twee of drie genoemde instrumente gee ’n liedjie ’n identiteit; twaalf gee dit ’n wasgoed. Werklike verwerkings is meestal yl — ’n vers met ’n kitaar en ’n stem, en die res gespaar vir die koor sodat om daar aan te kom iets beteken.',
    },
  },
  {
    id: 'prompt-tempo-number',
    ask: { en: 'Instead of writing “fast”, what works better?', af: 'In plaas daarvan om “vinnig” te skryf, wat werk beter?' },
    options: [
      { en: '“Very fast”', af: '“Baie vinnig”' },
      { en: 'A BPM, or a feel everybody shares like “a walking pace”', af: '’n BPM, of ’n gevoel wat almal deel soos “’n stappas”' },
      { en: 'Nothing — tempo cannot be asked for', af: 'Niks — tempo kan nie gevra word nie' },
      { en: 'Typing it in capitals', af: 'Om dit in hoofletters te tik' },
    ],
    answer: 1,
    why: {
      en: '“Fast” is 120 to somebody and 175 to somebody else. A number removes the argument, and if you do not know the number, name a song shape instead — a march, a slow jam, a shuffle — which carries a tempo with it.',
      af: '“Vinnig” is 120 vir iemand en 175 vir iemand anders. ’n Getal haal die argument weg, en as jy nie die getal weet nie, noem eerder ’n liedjievorm — ’n opmars, ’n stadige jam, ’n shuffle — wat ’n tempo saamdra.',
    },
  },
  {
    id: 'prompt-structure',
    ask: { en: 'Why say the shape of the song in the prompt — verse, chorus, bridge?', af: 'Hoekom die vorm van die liedjie in die prompt sê — vers, koor, brug?' },
    options: [
      { en: 'It makes the song shorter', af: 'Dit maak die liedjie korter' },
      { en: 'Without it you often get one mood for three minutes with nothing to arrive at', af: 'Sonder dit kry jy dikwels een stemming vir drie minute met niks om by aan te kom nie' },
      { en: 'It changes the key', af: 'Dit verander die toonsoort' },
      { en: 'It is only needed for instrumentals', af: 'Dit is net vir instrumentale stukke nodig' },
    ],
    answer: 1,
    why: {
      en: 'Structure is what makes a chorus feel like a chorus — it is only big because the verse before it was not. Say where the lift is and what drops out under the bridge, and you get a song rather than a loop.',
      af: 'Struktuur is wat ’n koor soos ’n koor laat voel — dit is net groot omdat die vers voor dit nie was nie. Sê waar die oplig is en wat onder die brug wegval, en jy kry ’n liedjie eerder as ’n lus.',
    },
  },
  {
    id: 'prompt-language',
    ask: { en: 'You want the song sung in Afrikaans. What must you do?', af: 'Jy wil hê die liedjie moet in Afrikaans gesing word. Wat moet jy doen?' },
    options: [
      { en: 'Nothing, it works it out from the words', af: 'Niks, dit werk dit uit die woorde uit' },
      { en: 'Say the language, and say it in the sound box as well as writing Afrikaans lyrics', af: 'Sê die taal, en sê dit in die klankblokkie sowel as om Afrikaanse lirieke te skryf' },
      { en: 'Only write the lyrics in Afrikaans', af: 'Skryf net die lirieke in Afrikaans' },
      { en: 'Choose a slower tempo', af: 'Kies ’n stadiger tempo' },
    ],
    answer: 1,
    why: {
      en: 'Lyrics alone are not always enough — a model trained mostly on English will reach for an English accent, and Afrikaans is close enough to Dutch that it sometimes lands there instead. Saying the language out loud in the sound description is the cheapest fix there is.',
      af: 'Lirieke alleen is nie altyd genoeg nie — ’n model wat meestal op Engels geleer is, gryp na ’n Engelse aksent, en Afrikaans is naby genoeg aan Nederlands dat dit soms daar beland. Om die taal hardop in die klankbeskrywing te sê is die goedkoopste oplossing wat daar is.',
    },
  },
  {
    id: 'prompt-scene-words',
    ask: { en: 'Which mood description is more use to a model?', af: 'Watter stemmingsbeskrywing is meer werd vir ’n model?' },
    options: [
      { en: '“Emotional and powerful”', af: '“Emosioneel en kragtig”' },
      { en: '“Late night, empty road, headlights on wet tar”', af: '“Laataand, leë pad, hoofligte op nat teer”' },
      { en: '“Really good vibes”', af: '“Baie goeie vibes”' },
      { en: '“Professional quality”', af: '“Professionele gehalte”' },
    ],
    answer: 1,
    why: {
      en: 'A scene carries a tempo, a register and an instrument list without naming any of them. “Emotional”, “powerful” and “professional” are true of almost every song ever released, so they narrow nothing down.',
      af: '’n Toneel dra ’n tempo, ’n register en ’n instrumentlys sonder om enige van hulle te noem. “Emosioneel”, “kragtig” en “professioneel” is waar van byna elke liedjie wat ooit uitgereik is, so hulle vernou niks nie.',
    },
  },
  {
    id: 'prompt-one-change',
    ask: { en: 'Your song came out nearly right. What is the best next move?', af: 'Jou liedjie het byna reg uitgekom. Wat is die beste volgende skuif?' },
    options: [
      { en: 'Rewrite the whole prompt', af: 'Herskryf die hele prompt' },
      { en: 'Change one thing and generate again, so you learn what did it', af: 'Verander een ding en genereer weer, sodat jy leer wat dit gedoen het' },
      { en: 'Generate five at once', af: 'Genereer vyf op ’n slag' },
      { en: 'Start in a different room', af: 'Begin in ’n ander kamer' },
    ],
    answer: 1,
    why: {
      en: 'One variable at a time is how anybody learns a tool. Change six things and the next version is better or worse for reasons you will never find out, so the credits buy you a song but no knowledge — and the knowledge is what makes the tenth song cheap.',
      af: 'Een veranderlike op ’n slag is hoe enigiemand ’n gereedskapstuk leer. Verander ses dinge en die volgende weergawe is beter of slegter om redes wat jy nooit sal uitvind nie, so die krediete koop vir jou ’n liedjie maar geen kennis nie — en die kennis is wat die tiende liedjie goedkoop maak.',
    },
  },
  {
    id: 'cs-bit-depth',
    ask: { en: 'What does bit depth decide in a digital recording?', af: 'Wat bepaal bisdiepte in ’n digitale opname?' },
    options: [
      { en: 'How long the file can be', af: 'Hoe lank die lêer kan wees' },
      { en: 'How finely each sample’s loudness is measured, which sets the noise floor', af: 'Hoe fyn elke monster se hardheid gemeet word, wat die ruisvloer stel' },
      { en: 'How many instruments fit', af: 'Hoeveel instrumente inpas' },
      { en: 'The tempo', af: 'Die tempo' },
    ],
    answer: 1,
    why: {
      en: 'Sample rate is how often you measure; bit depth is how precisely. 16-bit gives about 96 dB between the quietest thing and clipping, 24-bit about 144 — which is why recording is done at 24 and only squeezed down at the end.',
      af: 'Monstertempo is hoe dikwels jy meet; bisdiepte is hoe presies. 16-bis gee omtrent 96 dB tussen die stilste ding en oorstuur, 24-bis omtrent 144 — en dít is hoekom daar op 24 opgeneem word en eers aan die einde afgedruk word.',
    },
  },
  {
    id: 'cs-fourier',
    ask: { en: 'An EQ and a spectrum display both rest on one idea. Which?', af: '’n EQ en ’n spektrumvertoning rus albei op een idee. Watter?' },
    options: [
      { en: 'Any sound can be broken into pure tones added together', af: 'Enige klank kan in suiwer tone opgebreek word wat bymekaar getel word' },
      { en: 'Sound travels at a fixed speed', af: 'Klank beweeg teen ’n vaste spoed' },
      { en: 'Loud sounds mask quiet ones', af: 'Harde klanke verberg stil klankies' },
      { en: 'Every note has a number', af: 'Elke noot het ’n getal' },
    ],
    answer: 0,
    why: {
      en: 'Fourier’s idea, and the Fast Fourier Transform is how a computer does it quickly. Once a sound is a list of how much of each frequency is present, an EQ is just turning some of those amounts up or down — and the picture you watch while mixing is that list drawn.',
      af: 'Fourier se idee, en die Fast Fourier Transform is hoe ’n rekenaar dit vinnig doen. Sodra ’n klank ’n lys is van hoeveel van elke frekwensie teenwoordig is, is ’n EQ net om van daardie hoeveelhede op of af te draai — en die prentjie wat jy dophou terwyl jy meng, is daardie lys geteken.',
    },
  },
  {
    id: 'cs-latency',
    ask: { en: 'Why is there a small delay when you hear yourself through the computer?', af: 'Hoekom is daar ’n klein vertraging wanneer jy jouself deur die rekenaar hoor?' },
    options: [
      { en: 'The microphone is slow', af: 'Die mikrofoon is stadig' },
      { en: 'Audio is processed in buffers — a block at a time, not sample by sample', af: 'Klank word in buffers verwerk — ’n blok op ’n slag, nie monster vir monster nie' },
      { en: 'The song is too long', af: 'Die liedjie is te lank' },
      { en: 'Headphones always add a delay', af: 'Oorfone voeg altyd ’n vertraging by' },
    ],
    answer: 1,
    why: {
      en: 'The machine collects a block of samples, works on it, and hands it on. A bigger buffer is safer and slower; a smaller one is quicker and more likely to stutter. Anything over about 20 ms and a singer starts fighting their own voice.',
      af: 'Die masjien versamel ’n blok monsters, werk daaraan, en gee dit aan. ’n Groter buffer is veiliger en stadiger; ’n kleiner een is vinniger en meer geneig om te hakkel. Enigiets bo omtrent 20 ms en ’n sanger begin teen sy eie stem baklei.',
    },
  },
  {
    id: 'cs-midi',
    ask: { en: 'A MIDI file contains…', af: '’n MIDI-lêer bevat…' },
    options: [
      { en: 'The recorded sound of the instruments', af: 'Die opgeneemde klank van die instrumente' },
      { en: 'Instructions — which note, how hard, how long — but no sound at all', af: 'Instruksies — watter noot, hoe hard, hoe lank — maar glad geen klank nie' },
      { en: 'A compressed mp3', af: '’n Saamgeperste mp3' },
      { en: 'The lyrics', af: 'Die lirieke' },
    ],
    answer: 1,
    why: {
      en: 'Sheet music a computer can read. That is why a MIDI file is tiny and why the same file sounds like a cheap keyboard on one machine and an orchestra on another — the sound is whatever instrument you point it at, and it is why the notes can be changed after the fact.',
      af: 'Bladmusiek wat ’n rekenaar kan lees. Dít is hoekom ’n MIDI-lêer piepklein is en hoekom dieselfde lêer op een masjien soos ’n goedkoop klawerbord en op ’n ander soos ’n orkes klink — die klank is watter instrument jy ook al daarop rig, en dit is hoekom die note agterna verander kan word.',
    },
  },
  {
    id: 'cs-lossy',
    ask: { en: 'What does an mp3 do that a wav does not?', af: 'Wat doen ’n mp3 wat ’n wav nie doen nie?' },
    options: [
      { en: 'It plays louder', af: 'Dit speel harder' },
      { en: 'It throws away detail you are unlikely to notice, to make the file small', af: 'Dit gooi detail weg wat jy waarskynlik nie sal raaksien nie, om die lêer klein te maak' },
      { en: 'It stores the lyrics', af: 'Dit stoor die lirieke' },
      { en: 'It keeps every sample exactly', af: 'Dit hou elke monster presies' },
    ],
    answer: 1,
    why: {
      en: 'Lossy compression, built on what a quiet sound next to a loud one does to your ears. The thrown-away part never comes back, so master and archive from a wav and let the mp3 be the copy you send — a copy of a copy is where the swirly, underwater sound comes from.',
      af: 'Verliesgewende kompressie, gebou op wat ’n stil klank langs ’n harde een aan jou ore doen. Die weggegooide deel kom nooit terug nie, so master en argiveer vanaf ’n wav en laat die mp3 die kopie wees wat jy stuur — ’n kopie van ’n kopie is waar daardie draaierige, onderwater-klank vandaan kom.',
    },
  },
  {
    id: 'cs-predicts',
    ask: { en: 'How does a music model decide what to make?', af: 'Hoe besluit ’n musiekmodel wat om te maak?' },
    options: [
      { en: 'It searches a library and plays the closest match', af: 'Dit soek ’n biblioteek deur en speel die naaste passing' },
      { en: 'It predicts what plausibly comes next, over and over, steered by your words', af: 'Dit voorspel wat waarskynlik volgende kom, oor en oor, gestuur deur jou woorde' },
      { en: 'A person records it', af: '’n Persoon neem dit op' },
      { en: 'It picks at random', af: 'Dit kies lukraak' },
    ],
    answer: 1,
    why: {
      en: 'Not a search and not a shuffle: a prediction made again and again, with your description weighting every step. That single fact explains most of the prompting advice in this quiz — vague words weight nothing, so what comes back is the most ordinary thing that fits.',
      af: 'Nie ’n soektog en nie ’n skommel nie: ’n voorspelling wat oor en oor gemaak word, met jou beskrywing wat elke stap weeg. Daardie enkele feit verklaar die meeste van die prompt-raad in hierdie quiz — vae woorde weeg niks, so wat terugkom is die gewoonste ding wat pas.',
    },
  },
  {
    id: 'cs-diffusion',
    ask: { en: 'Many audio and image models start from…', af: 'Baie klank- en beeldmodelle begin by…' },
    options: [
      { en: 'Silence', af: 'Stilte' },
      { en: 'A random seed note', af: '’n Lukrake saadnoot' },
      { en: 'Pure noise, which is then cleaned away step by step', af: 'Suiwer ruis, wat dan stap vir stap weggeskoonmaak word' },
      { en: 'An existing song', af: '’n Bestaande liedjie' },
    ],
    answer: 2,
    why: {
      en: 'Diffusion: start from static and remove a little of it at a time, each step guided by your description, until something that was never there is standing in the noise. It is why generating takes seconds rather than being instant, and why the same prompt twice gives two different songs.',
      af: 'Diffusie: begin by sneeu en verwyder ’n bietjie daarvan op ’n slag, elke stap gelei deur jou beskrywing, totdat iets wat nooit daar was nie in die ruis staan. Dit is hoekom genereer sekondes vat eerder as om oombliklik te wees, en hoekom dieselfde prompt twee keer twee verskillende liedjies gee.',
    },
  },
  {
    id: 'cs-seed',
    ask: { en: 'What is a seed, in a generator?', af: 'Wat is ’n saad, in ’n genereerder?' },
    options: [
      { en: 'The first note of the song', af: 'Die eerste noot van die liedjie' },
      { en: 'The starting number for the randomness, so the same seed repeats the same result', af: 'Die beginsyfer vir die lukraakheid, sodat dieselfde saad dieselfde uitkoms herhaal' },
      { en: 'How long the song will be', af: 'Hoe lank die liedjie sal wees' },
      { en: 'The name of the model', af: 'Die naam van die model' },
    ],
    answer: 1,
    why: {
      en: 'Computers do not do real randomness; they do a long predictable sequence started from a number. Keep the seed and change one word and you hear what that word did — which is the machine-side version of changing one thing at a time.',
      af: 'Rekenaars doen nie werklike lukraakheid nie; hulle doen ’n lang voorspelbare reeks wat by ’n getal begin. Hou die saad en verander een woord en jy hoor wat daardie woord gedoen het — wat die masjienkant se weergawe is van om een ding op ’n slag te verander.',
    },
  },
];
