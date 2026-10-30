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
