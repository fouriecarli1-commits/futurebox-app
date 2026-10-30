/**
 * Ideas to start a prompt from, and a fresh handful on every press.
 *
 * The owner, 30 October 2026: *"Oor al waar daar geprompt kan word en daar
 * suggestions staan moet daar 'n klein sirkel button wees wat basies die
 * voorstelle refresh. Nie alle mense is kreatief nie en het verskeie idees
 * nodig. Dan reload hy nuwe voorstelle totdat hulle een sien waarvan hulle
 * hou."*
 *
 * So every prompt with suggestions draws from a pool much larger than it
 * shows, and the round button beside them (`IdeaChips`) deals the next
 * handful. The pool is gone through in a shuffled order that is the same for
 * everyone, so no idea comes back until every other one has been shown, and
 * then the round starts again. It is all on the device: no credits, nothing
 * sent.
 *
 * Each idea is written in both languages here, side by side, rather than as
 * hundreds of keys in `i18n.tsx`: an idea is one line translated as a whole,
 * never assembled from parts, so it always reads as a sentence.
 */

/** One idea: the English and the Afrikaans. */
export type PromptIdea = readonly [en: string, af: string];

/** A small, fixed shuffle, so the order is the same on every device and in every check. */
function shuffled<T>(items: readonly T[], seed: number): T[] {
  const out = [...items];
  let s = seed >>> 0 || 1;
  for (let i = out.length - 1; i > 0; i -= 1) {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    const j = s % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * The handful shown at press `round` (0 is the first sight): `count` ideas,
 * none repeated until the whole pool has been shown. The first handful is the
 * pool's own first ideas, so what was there before the button existed is
 * still the first thing seen.
 */
export function ideasAt(pool: readonly PromptIdea[], count: number, round: number): PromptIdea[] {
  if (pool.length <= count) return [...pool];
  if (round === 0) return pool.slice(0, count);
  const rest = shuffled(pool.slice(count), pool.length * 7919 + count);
  const order = [...rest, ...pool.slice(0, count)];
  const out: PromptIdea[] = [];
  const start = (round - 1) * count;
  for (let i = 0; i < count; i += 1) out.push(order[(start + i) % order.length]);
  return out;
}

/** The words of an idea in the language on screen. */
export const ideaSaid = (idea: PromptIdea, lang: string): string => (lang === 'af' ? idea[1] : idea[0]);

/* ── Make a picture (`MakeStudio`), one pool per thing being made ─────── */

export const MAKE_IDEAS = {
  cover: [
    ['A lone figure on a rooftop above a city at night', '’n Eensame figuur op ’n dak bo ’n stad in die nag'],
    ['A hand holding a glowing cassette tape', '’n Hand wat ’n gloeiende kasset vashou'],
    ['An old pickup truck on a Karoo road at sunset', '’n Ou bakkie op ’n Karoopad met sonsondergang'],
    ['A heart made of neon tubes, flickering in the rain', '’n Hart van neonbuise wat in die reën flikker'],
    ['An astronaut floating above a desert with a guitar', '’n Ruimtevaarder wat met ’n kitaar bo ’n woestyn sweef'],
    ['A cracked mirror showing a different sky in every piece', '’n Gebreekte spieël met ’n ander lug in elke stuk'],
    ['A girl on a swing over a sea of clouds', '’n Meisie op ’n swaai bo ’n see van wolke'],
    ['A burning piano in an empty field', '’n Brandende klavier in ’n leë veld'],
    ['Two silhouettes dancing inside a lightbulb', 'Twee silhoeëtte wat binne ’n gloeilamp dans'],
    ['A koi fish swimming through the night sky', '’n Koi-vis wat deur die naghemel swem'],
    ['A city skyline reflected in a raindrop', '’n Stad se skyline weerkaats in ’n reëndruppel'],
    ['A crown of wildflowers on a marble statue', '’n Kroon van veldblomme op ’n marmerbeeld'],
    ['A retro car speeding into a giant sun', '’n Retro-kar wat in ’n reuse son in jaag'],
    ['A lighthouse beaming music notes across the sea', '’n Vuurtoring wat musieknote oor die see skyn'],
    ['A wolf howling at a vinyl-record moon', '’n Wolf wat vir ’n plaatmaan huil'],
    ['A paper boat sailing down a neon street', '’n Papierbootjie wat in ’n neonstraat afvaar'],
  ],
  poster: [
    ['A crowd with their hands up at an open-air concert', '’n Skare met hul hande in die lug by ’n opelugkonsert'],
    ['A microphone on an empty stage under one spotlight', '’n Mikrofoon op ’n leë verhoog onder een kollig'],
    ['A festival tent glowing under the Milky Way', '’n Feestent wat onder die Melkweg gloei'],
    ['A drummer frozen mid-hit, sticks blurred with light', '’n Tromspeler gevries in die slag, stokke vol lig'],
    ['Speakers stacked like a skyscraper at dusk', 'Luidsprekers gestapel soos ’n wolkekrabber teen skemer'],
    ['A dance floor lit from below in electric blue', '’n Dansvloer van onder verlig in elektriese blou'],
    ['A guitar neck turning into a highway', '’n Kitaarnek wat in ’n snelweg verander'],
    ['Fireworks bursting in the shape of sound waves', 'Vuurwerke wat in die vorm van klankgolwe bars'],
    ['A choir in white robes on a red sand dune', '’n Koor in wit klere op ’n rooi sandduin'],
    ['A DJ booth on a rooftop with the city behind', '’n DJ-hokkie op ’n dak met die stad agter'],
    ['A saxophone player under a single streetlight', '’n Saksofoonspeler onder een straatlig'],
    ['Ticket stubs swirling in a golden storm', 'Kaartjiestrokies wat in ’n goue storm warrel'],
  ],
  post: [
    ['Headphones on a wooden table with morning coffee', 'Oorfone op ’n houttafel met oggendkoffie'],
    ['A vinyl record melting into a sunset', '’n Plaat wat in ’n sonsondergang smelt'],
    ['A studio desk at 3 a.m., one lamp on', '’n Ateljeelessenaar om 3 in die oggend, een lamp aan'],
    ['Sneakers mid-jump over a puddle of city lights', 'Tekkies in die lug bo ’n poel stadsligte'],
    ['A bowl of ramen steaming in neon light', '’n Bak ramen wat in neonlig stoom'],
    ['A notebook full of lyrics beside a candle', '’n Notaboek vol lirieke langs ’n kers'],
    ['A cat asleep on a keyboard synth', '’n Kat wat op ’n sintetiseerder slaap'],
    ['Polaroids pegged on a string of fairy lights', 'Polaroids met knypers aan ’n string liggies'],
    ['A skateboard rolling down a pink street', '’n Skaatsplank wat in ’n pienk straat afrol'],
    ['Ice cream dripping in the summer heat', 'Roomys wat in die somerhitte drup'],
    ['A bicycle leaning on a wall of ivy', '’n Fiets wat teen ’n muur vol klimop leun'],
    ['A rainy window with a city blurred behind it', '’n Reënvenster met ’n vaag stad daaragter'],
  ],
  story: [
    ['A guitarist silhouetted against a huge moon', '’n Kitaarspeler as silhoeët teen ’n reuse maan'],
    ['Confetti falling in slow motion', 'Konfetti wat stadig val'],
    ['Light trails from cars on a mountain pass', 'Ligstrepe van karre op ’n bergpas'],
    ['A hand reaching up through golden smoke', '’n Hand wat deur goue rook opreik'],
    ['A neon sign that says tonight', '’n Neonbord wat sê vanaand'],
    ['Waves crashing at night, lit pink and violet', 'Golwe wat in die nag breek, pienk en pers verlig'],
    ['A crowd of phone lights like a field of stars', '’n Skare fone-liggies soos ’n veld sterre'],
    ['A vintage microphone wrapped in roses', '’n Ou mikrofoon toegedraai in rose'],
    ['Rain on a car window at a red light', 'Reën op ’n karvenster by ’n rooi lig'],
    ['A dancer spinning in a cloud of glitter', '’n Danser wat in ’n wolk blinkers draai'],
    ['A desert road vanishing into a purple storm', '’n Woestynpad wat in ’n pers storm verdwyn'],
    ['A countdown clock made of light', '’n Aftelhorlosie gemaak van lig'],
  ],
  banner: [
    ['Sound waves rolling across a mountain range', 'Klankgolwe wat oor ’n bergreeks rol'],
    ['A long studio desk with glowing knobs', '’n Lang ateljeelessenaar met gloeiende knoppe'],
    ['A city skyline drawn in one neon line', '’n Stad se skyline in een neonlyn geteken'],
    ['An ocean horizon at golden hour', '’n Seehorison in die goue uur'],
    ['A row of guitars hanging on a brick wall', '’n Ry kitare teen ’n baksteenmuur'],
    ['Clouds parting over a wide open plain', 'Wolke wat oor ’n wye vlakte oopskeur'],
    ['A piano keyboard stretching to the horizon', '’n Klavierklawerbord wat tot by die horison strek'],
    ['A forest of glowing fibre-optic trees', '’n Woud van gloeiende veseloptiese bome'],
    ['A highway at night from high above', '’n Snelweg in die nag van hoog bo af'],
    ['Paint splashes in your brand colours', 'Verfspatsels in jou handelsmerk se kleure'],
  ],
  wallpaper: [
    ['Soft clouds over the ocean at dawn', 'Sagte wolke oor die see met dagbreek'],
    ['A field of sunflowers under stars', '’n Veld sonneblomme onder die sterre'],
    ['An aurora over a frozen lake', '’n Aurora oor ’n bevrore meer'],
    ['A tiny house on a floating island', '’n Klein huisie op ’n swewende eiland'],
    ['Jellyfish glowing in deep blue water', 'Jellievisse wat in diep blou water gloei'],
    ['A misty forest with a single beam of light', '’n Mistige woud met een ligstraal'],
    ['Cherry blossoms falling on a quiet street', 'Kersiebloeisels wat in ’n stil straat val'],
    ['A galaxy swirling inside a glass marble', '’n Sterrestelsel wat binne ’n glasalbaster draai'],
    ['Mountains layered in pastel colours', 'Berge in lae van pastelkleure'],
    ['A koi pond seen from above', '’n Koi-dam van bo af gesien'],
    ['Waves of liquid gold and black', 'Golwe van vloeibare goud en swart'],
    ['A lone tree on a hill at sunset', '’n Eensame boom op ’n heuwel met sonsondergang'],
  ],
} as const satisfies Readonly<Record<string, readonly PromptIdea[]>>;

/* ── Make a character (`CharacterBench`) ─────────────────────────────── */

export const CHARACTER_IDEAS: readonly PromptIdea[] = [
  ['a friendly robot DJ with glowing headphones', '’n vriendelike robot-DJ met gloeiende oorfone'],
  ['a young astronaut with a light-up helmet', '’n jong ruimtevaarder met ’n helm wat opgloei'],
  ['a meerkat in a tiny silver space suit', '’n meerkat in ’n klein silwer ruimtepak'],
  ['a street dancer from the year 2080', '’n straatdanser uit die jaar 2080'],
  ['a cyborg violinist with a chrome arm', '’n kuborg-violis met ’n chroom-arm'],
  ['a rhino rock star in a leather jacket', '’n renoster-rockster in ’n leerbaadjie'],
  ['a tiny dragon who plays the drums', '’n klein draakie wat tromme speel'],
  ['a holographic singer made of blue light', '’n hologram-sanger gemaak van blou lig'],
  ['a grandmother skateboarder with neon shoes', '’n ouma-skaatsplankryer met neonskoene'],
  ['a penguin barista on a space station', '’n pikkewyn-barista op ’n ruimtestasie'],
  ['a desert wanderer with a glowing guitar', '’n woestynswerwer met ’n gloeiende kitaar'],
  ['a cat detective in a rainy neon city', '’n kat-speurder in ’n reënerige neonstad'],
  ['a deep-sea diver with a lantern of stars', '’n diepsee-duiker met ’n lantern vol sterre'],
  ['a samurai made of paper and ink', '’n samoerai gemaak van papier en ink'],
  ['an owl professor with tiny round glasses', '’n uil-professor met klein ronde brilletjie'],
  ['a giraffe pilot in a vintage plane', '’n kameelperd-vlieënier in ’n ou vliegtuig'],
];

/* ── Ask about the mix (`BoothAsk`) ─────────────────────────────────── */

export const MIX_IDEAS: readonly PromptIdea[] = [
  ['Sit the lead vocal two dB over the band and glue it with a compressor', 'Sit die hoofstem twee dB bo die orkes en bind dit met ’n kompressor'],
  ['Make room for the kick: bass down a touch, compressed, and EQ on it', 'Maak plek vir die skopdrom: bas effens af, gekomprimeer, en EQ daarop'],
  ['Kick, bass and lead vocal in the centre; guitars and keys panned wide', 'Skopdrom, bas en hoofstem in die middel; kitare en klawers wyd gepan'],
  ['Push the backing vocals back with reverb and a short delay', 'Druk die agtergrondstemme terug met galm en ’n kort eggo'],
  ['Gentle saturation on the drums and the bass for analog glue', 'Sagte versadiging op die dromme en die bas vir analoog-gom'],
  ['A limiter on the loudest lanes so nothing clips before I export', '’n Beperker op die hardste bane sodat niks afsny voor ek uitvoer nie'],
  ['Clear the low-mid mud: EQ the pads and the guitars, pull them back', 'Maak die lae-middel modder skoon: EQ die pads en kitare, trek hulle terug'],
  ['Balance it for streaming: nothing louder than the vocal, peaks under control', 'Balanseer dit vir stroming: niks harder as die stem nie, pieke onder beheer'],
  ['Cut the harsh top end on the cymbals with EQ', 'Sny die skerp hoë punt op die simbale met EQ'],
  ['Pan the backing vocals left and right, a little under the lead', 'Pan die agtergrondstemme links en regs, effens onder die hoofstem'],
  ['Give the snare more snap and less ring', 'Gee die strikdrom meer klap en minder gelui'],
  ['Make the bass audible on phone speakers', 'Laat die bas hoorbaar wees op foonluidsprekers'],
  ['Put the vocal in a small warm room, not a cathedral', 'Sit die stem in ’n klein warm kamer, nie ’n katedraal nie'],
  ['Pull the hi-hats back so they stop poking out', 'Trek die hi-hats terug sodat hulle nie meer uitsteek nie'],
  ['Bring every lane down 3 dB to leave headroom', 'Bring elke baan 3 dB af om kopruimte te laat'],
  ['Add a short slap delay to the lead vocal', 'Sit ’n kort klap-eggo op die hoofstem'],
];

/* ── Two hosts, what it is about (`TwoHosts`) ───────────────────────── */

export const HOSTS_IDEAS: readonly PromptIdea[] = [
  ['The story behind a song', 'Die storie agter ’n liedjie'],
  ['Our local music scene this month', 'Ons plaaslike musiektoneel vandeesmaand'],
  ['How we made our first record', 'Hoe ons ons eerste plaat gemaak het'],
  ['Listener questions', 'Luisteraars se vrae'],
  ['Gear on a small budget', 'Toerusting op ’n klein begroting'],
  ['The worst gig we ever played', 'Die slegste optrede wat ons nog gespeel het'],
  ['Writing lyrics when nothing comes', 'Lirieke skryf wanneer niks kom nie'],
  ['Five albums that changed us', 'Vyf albums wat ons verander het'],
  ['Getting your music on playlists', 'Hoe jou musiek op snitlyste kom'],
  ['Life on the road, honestly', 'Die lewe op toer, eerlik'],
  ['Home studio mistakes we made', 'Tuisateljee-foute wat ons gemaak het'],
  ['A song we wish we had written', '’n Liedjie wat ons wens ons het geskryf'],
  ['How to plan a release week', 'Hoe om ’n vrystellingsweek te beplan'],
  ['Collaborating without falling out', 'Saamwerk sonder om uit te val'],
  ['Stage fright and how we beat it', 'Verhoogvrees en hoe ons dit oorwin het'],
];

/* ── The Video Editor's shot box: changing a frame, or a new shot ─────── */

export const SHOT_CHANGE_IDEAS: readonly PromptIdea[] = [
  ['make it night', 'maak dit nag'],
  ['add rain', 'voeg reën by'],
  ['change the sky to a sunset', 'verander die lug na ’n sonsondergang'],
  ['take the person out of the background', 'haal die persoon uit die agtergrond'],
  ['make it look like a painting', 'laat dit soos ’n skildery lyk'],
  ['change the colours to neon', 'verander die kleure na neon'],
  ['the camera moves slowly closer', 'die kamera beweeg stadig nader'],
  ['add falling snow', 'voeg vallende sneeu by'],
  ['make it look like an old film', 'laat dit soos ’n ou film lyk'],
  ['add soft fog on the ground', 'voeg sagte mis op die grond by'],
  ['turn the lights into glowing neon signs', 'verander die ligte in gloeiende neonborde'],
  ['make it look like a comic book', 'laat dit soos ’n strokiesprent lyk'],
  ['add sparks drifting through the air', 'voeg vonke by wat deur die lug dryf'],
  ['make it autumn, with orange leaves', 'maak dit herfs, met oranje blare'],
];

export const SHOT_START_IDEAS: readonly PromptIdea[] = [
  ['a wide shot of a city at night', '’n wye skoot van ’n stad in die nag'],
  ['a close-up of hands on a guitar', '’n nabyskoot van hande op ’n kitaar'],
  ['a drone shot over the sea', '’n hommeltuigskoot oor die see'],
  ['in slow motion', 'in stadige aksie'],
  ['golden-hour light', 'goue-uur lig'],
  ['the camera moves slowly closer', 'die kamera beweeg stadig nader'],
  ['a crowd jumping at a festival', '’n skare wat by ’n fees spring'],
  ['a car driving through neon streets in the rain', '’n kar wat deur neonstrate in die reën ry'],
  ['a time-lapse of clouds over mountains', '’n tydsverloop van wolke oor berge'],
  ['a singer lit by one red light', '’n sanger verlig deur een rooi lig'],
  ['waves crashing on rocks at sunset', 'golwe wat teen rotse breek met sonsondergang'],
  ['a dancer spinning in an empty warehouse', '’n danser wat in ’n leë pakhuis draai'],
  ['the camera circles slowly around', 'die kamera draai stadig in ’n sirkel'],
  ['a vinyl record spinning, very close', '’n plaat wat draai, baie naby'],
];

/** A shape for the Photo Editor's AI (`api/shape`): plain things with a clear outline. */
export const SHAPE_IDEAS: readonly PromptIdea[] = [
  ['an electric guitar', '’n elektriese kitaar'],
  ['a microphone', '’n mikrofoon'],
  ['a crown', '’n kroon'],
  ['a rocket', '’n vuurpyl'],
  ['a pair of headphones', '’n kopfoon'],
  ['a palm tree', '’n palmboom'],
  ['a cassette tape', '’n kassetband'],
  ['a protea flower', '’n protea'],
  ['a flame', '’n vlam'],
  ['a music note', '’n musieknoot'],
  ['a ticket stub', '’n kaartjie'],
  ['a sunglasses outline', '’n sonbril'],
  ['a cat sitting', '’n kat wat sit'],
  ['a soundwave badge', '’n klankgolf-kenteken'],
  ['an origami bird', '’n origami-voël'],
  ['a vinyl record', '’n plaat'],
];

/** A whole clip changed in words in the Video Editor (`fal-ai/wan-vace-14b`): a new look, the same movement. */
export const CLIP_CHANGE_IDEAS: readonly PromptIdea[] = [
  ['make it night with neon lights', 'maak dit nag met neonligte'],
  ['a synthwave world, pink and purple', '’n synthwave-wêreld, pienk en pers'],
  ['make it snow', 'laat dit sneeu'],
  ['turn it into a cartoon', 'maak dit ’n spotprent'],
  ['golden hour, warm and soft', 'goue uur, warm en sag'],
  ['a rainy city street at night', '’n reënerige stadstraat in die nag'],
  ['make it look like an old film', 'laat dit lyk soos ’n ou film'],
  ['a glowing hologram look', '’n gloeiende hologram-voorkoms'],
  ['underwater, with light rays', 'onder die water, met ligstrale'],
  ['a comic book drawing', '’n strokiesprent-tekening'],
  ['in the desert at sunset', 'in die woestyn met sonsondergang'],
  ['make it look like claymation', 'laat dit lyk soos kleianimasie'],
];
