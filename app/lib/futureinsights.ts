/**
 * Future Insights & Knowledge Hub — Curated High-Quality, Ad-Free Articles & Podcasts.
 *
 * ── What Carli asked for ─────────────────────────────────────────────────
 *
 * Carli, 12 October 2026: *"Kyk ook na elke kamer, na spotlight, hoe artikels
 * uitgelig word, ek is ook opsoek na kwaliteit toekomsgerigte artikels, oor AI,
 * besigheid, vibecoding, gaming, en technologies oor alle velde wat vooruitgaan.
 * Die artikels word gerate volgens kwaliteit van bronne, en die artikels moet ad
 * free wees. Dieselfde met toekomsgerigte podcasts (soos dairy of a CEO, en
 * ander)... Ek wil mense se aandag trek. Hou asb by die futurebox groen...
 * want ons word die voorlopers vir die toekoms, kom ons dink anders en doen anders."*
 *
 * ── What is and is not claimed ───────────────────────────────────────────
 *
 * The pieces are written by FutureBox and say so on the screen. An earlier
 * draft gave each one a "source credibility" percentage and the name of a real
 * publication or podcast it was supposedly drawn from — MIT Technology Review,
 * Nature, named podcast hosts, with quotes. None of those had been read: the
 * percentage was a number nobody measured and the name was borrowed authority.
 * Both went on 12 October 2026. The rating she asked for comes back the day a
 * piece links to a source somebody has actually read; until then the honest
 * label is the one here.
 *
 * The podcast entries are EPISODE OUTLINES for the podcast studio, not
 * recordings. There is no audio behind them, so nothing on this page plays —
 * the door on each one opens the room where it can be recorded.
 */

export type InsightCategory =
  | 'all'
  | 'ai'
  | 'business'
  | 'vibecoding'
  | 'gaming'
  | 'frontier'
  | 'podcast';

export interface InsightCategoryMeta {
  readonly id: InsightCategory;
  readonly key: string;
  readonly en: string;
  readonly af: string;
  readonly iconName: string;
}

export const INSIGHT_CATEGORIES: readonly InsightCategoryMeta[] = [
  { id: 'all', key: 'insight.cat.all', en: 'All Insights', af: 'Alle Insigte', iconName: 'sparkles' },
  { id: 'ai', key: 'insight.cat.ai', en: 'Artificial Intelligence', af: 'Kunsmatige Intelligensie', iconName: 'cpu' },
  { id: 'business', key: 'insight.cat.biz', en: 'Future Business & Scale', af: 'Toekoms-besigheid & Groei', iconName: 'trendingUp' },
  { id: 'vibecoding', key: 'insight.cat.vibe', en: 'Vibecoding & AI Dev', af: 'Vibecoding & KI-kodering', iconName: 'code2' },
  { id: 'gaming', key: 'insight.cat.gaming', en: 'Gaming & Virtual Worlds', af: 'Speletjies & Virtuele Wêrelde', iconName: 'gamepad' },
  { id: 'frontier', key: 'insight.cat.frontier', en: 'Frontier Tech & Science', af: 'Grens-tegnologie & Wetenskap', iconName: 'rocket' },
  { id: 'podcast', key: 'insight.cat.pod', en: 'Visionary Podcasts', af: 'Visioenêre Podsendings', iconName: 'headphones' },
];

export interface InsightArticle {
  readonly id: string;
  readonly category: InsightCategory;
  readonly titleEn: string;
  readonly titleAf: string;
  readonly blurbEn: string;
  readonly blurbAf: string;
  readonly readTimeEn: string;
  readonly readTimeAf: string;
  readonly publishedDate: string;
  /** Set on an episode outline: what the recording would be about. */
  readonly episode?: {
    readonly topicEn: string;
    readonly topicAf: string;
  };
  readonly takeawaysEn: readonly string[];
  readonly takeawaysAf: readonly string[];
  readonly bodyEn: readonly string[];
  readonly bodyAf: readonly string[];
}

export const FUTURE_INSIGHTS: readonly InsightArticle[] = [
  // ── 1. Vibecoding: The New Era of Creation ──────────────────────────────
  {
    id: 'vibecoding-autonomous-creators',
    category: 'vibecoding',
    titleEn: 'Vibecoding: How Creators Build Software at the Speed of Thought',
    titleAf: 'Vibecoding: Hoe Skeppers Sagteware Bou Teen die Spoed van Denke',
    blurbEn: 'Writing syntax line-by-line is giving way to high-level vision direction. Autonomous AI agents now translate intent into functional production code.',
    blurbAf: 'Sintaks reël-vir-reël skryf maak plek vir hoëvlak-visie. Outonome KI-agente vertaal nou bedoeling en kreatiwiteit direk in werkende produksiekode.',
    readTimeEn: '4 min read',
    readTimeAf: '4 min leestyd',
    publishedDate: '12 October 2026',
    takeawaysEn: [
      'Vibecoding shifts the creator’s role from code typist to architectural creative director.',
      'Natural language paired with strict deterministic verification harnesses AI speed without sacrificing stability.',
      'Solo founders can now build full-stack studio ecosystems previously requiring twenty engineers.',
    ],
    takeawaysAf: [
      'Vibecoding verskuif die skepper se rol van kode-tikker na argitektoniese kreatiewe direkteur.',
      'Natuurlike taal gekoppel aan streng deterministiese verifikasie benut KI-spoed sonder om stabiliteit in te boet.',
      'Individuele stigters kan nou volwaardige ateljee-stelsels bou wat voorheen twintig ingenieurs vereis het.',
    ],
    bodyEn: [
      'The traditional divide between thinking of a software feature and shipping it has collapsed. In 2026, the concept of "vibecoding" coined by leading AI researchers describes a fundamental paradigm shift: creators articulate architectural intent, stylistic boundaries, and business rules, while autonomous coding agents handle implementation, regression testing, and interface compilation.',
      'Rather than debugging syntax, the creator evaluates outputs, guides aesthetic nuances, and verifies user experience. The key to sustainable vibecoding is robust automated auditing: every generation is continuously tested against type safety, accessibility standards, and runtime performance.',
      'For platforms like Futurebox, vibecoding empowers independent artists, musicians, and entrepreneurs to design bespoke creative workflows without technical friction.',
    ],
    bodyAf: [
      'Die tradisionele gaping tussen die uitdink van ’n sagteware-kenmerk en die lewering daarvan het ineengestort. In 2026 beskryf die konsep van „vibecoding”, geformuleer deur vooraanstaande KI-navorsers, ’n fundamentele verskuiwing: skeppers verwoord hul argitektoniese visie, stylreëls en besigheidslogika, terwyl outonome agente die implementering, regressietoetse en koppelvlakke hanteer.',
      'In plaas daarvan om sintaksfoute uit te pluis, evalueer die skepper die uitkoms, verfyn die estetika en toets die gebruikerservaring. Die geheim van volhoubare vibecoding is deurlopende outomatiese ouditering: elke verandering word getoets teen tipe-veiligheid, toeganklikheid en werkverrigting.',
      'Vir platforms soos Futurebox stel vibecoding onafhanklike kunstenaars, musikante en entrepreneurs in staat om pasgemaakte kreatiewe werkvloeie te bou sonder tegniese hindernisse.',
    ],
  },

  // ── 2. AI: Generative Models in Creative Arts (Lyria & Veo) ─────────────
  {
    id: 'google-lyria-veo-multimodal-studio',
    category: 'ai',
    titleEn: 'Next-Generation Generative Media: Lyria, Veo, and the Creative Frontier',
    titleAf: 'Volgende Generasie Generatiewe Media: Lyria, Veo en die Kreatiewe Grens',
    blurbEn: 'Exploring how neural audio synthesis and high-definition video diffusion turn personal devices into Hollywood-grade creative studios.',
    blurbAf: 'Verken hoe neurale klanksintese en hoë-definisie videodiffusie persoonlike toestelle omskep in ateljees van Hollywood-gehalte.',
    readTimeEn: '5 min read',
    readTimeAf: '5 min leestyd',
    publishedDate: '11 October 2026',
    takeawaysEn: [
      'Google Lyria enables nuanced harmonic and vocal synthesis that respects musical theory and timbre.',
      'Google Veo delivers coherent camera movement and physical continuity without video artifacts.',
      'Multimodal models allow one creative prompt to coordinate music, visuals, and typography seamlessly.',
    ],
    takeawaysAf: [
      'Google Lyria maak genuanseerde harmoniese en vokale sintese moontlik wat musiekteorie en klankkleur respekteer.',
      'Google Veo lewer aaneenlopende kamerabewegings en fisiese kontinuïteit sonder videovervorming.',
      'Multimodale modelle stel een kreatiewe idee in staat om musiek, beeldmateriaal en tipografie gelyktydig te koördineer.',
    ],
    bodyEn: [
      'The convergence of audio and video diffusion represents a watershed moment for modern media production. Google DeepMind’s Lyria architecture moves beyond flat loop generation to true compositional intelligence — understanding chord progression, instrument separation, vocal phrasing, and emotional pacing.',
      'Concurrently, Google Veo solves the temporal inconsistency that plagued earlier video models. By tracking 3D camera coordinates, volumetric lighting, and material reflectivity, Veo produces footage that cuts cleanly into cinematic timelines.',
      'When integrated within an ethical, credit-metered ecosystem like Futurebox, creators retain complete copyright ownership over their synthetic masters while paying predictable computing rates.',
    ],
    bodyAf: [
      'Die sameloop van klank- en videodiffusie verteenwoordig ’n waterskeiding vir moderne mediaproduksie. Google DeepMind se Lyria-argitektuur beweeg verby plat herhalende klanke na werklike komposisionele intelligensie — dit verstaan akkoordprogressies, instrument-isolasie, vokale frasering en emosionele tempo.',
      'Terselfdertyd los Google Veo die tydelike onbestendigheid op wat vroeëre videomodelle gekniehalter het. Deur 3D-kamerakoördinate, ruimtelike beligting en materiaalweerkaatsing te volg, lewer Veo beeldmateriaal wat foutloos in kinematiese tydlyne inpas.',
      'Wanneer dit geïntegreer word binne ’n etiese, krediet-bestuurde stelsel soos Futurebox, behou skeppers volle kopiereg-eienaarskap oor hul meester-opnames teen voorspelbare rekenaarkoste.',
    ],
  },

  // ── 3. Business: Independent Creator Economics & Direct Monetization ───
  {
    id: 'future-creator-business-monetization',
    category: 'business',
    titleEn: 'The Sovereign Creator: Building Global Enterprises Without Intermediaries',
    titleAf: 'Die Soewereine Skepper: Bou Wêreldwye Ondernemings Sonder Middelmanne',
    blurbEn: 'Why traditional streaming platforms are failing artists, and how direct subscriber ownership, micro-credits, and localized branding create resilient wealth.',
    blurbAf: 'Waarom tradisionele stroomdienste kunstenaars faal, en hoe direkte intekenaar-eienaarskap, mikrokrediete en plaaslike handelsmerke blywende welvaart skep.',
    readTimeEn: '6 min read',
    readTimeAf: '6 min leestyd',
    publishedDate: '10 October 2026',
    takeawaysEn: [
      'A base of 500 direct recurring supporters generates substantially more net income than 500,000 passive streams.',
      'Transparent credit economies allow creators to charge accurately for production value rather than relying on predatory ad networks.',
      'True business resilience requires complete ownership of your subscriber relationships and digital assets.',
    ],
    takeawaysAf: [
      '’n Kern van 500 direkte ondersteuners genereer aansienlik meer netto inkomste as 500,000 passiewe strome.',
      'Deursigtige krediet-ekonomieë stel skeppers in staat om billik te hef vir produksiewaarde sonder roofugtige advertensienetwerke.',
      'Ware besigheidsveerkragtigheid vereis volle eienaarskap van jou intekenaar-verhoudings en digitale bates.',
    ],
    bodyEn: [
      'The modern creator economy is entering its sovereignty era. For over a decade, artists exchanged their audiences for algorithmic discovery on centralized platforms, earning fractions of a cent per stream while enduring invasive advertisements.',
      'Leading independent entrepreneurs are rejecting that compromise. By utilizing self-contained studios that bundle content creation, member channels, and direct payment infrastructure, creators retain 90%+ of their gross revenue.',
      'Futurebox embodies this philosophy: there are zero third-party ads, all tools run under private subscriber allowances, and creators publish straight to their own audience channels.',
    ],
    bodyAf: [
      'Die moderne skepper-ekonomie betree sy soewereiniteitsera. Vir meer as ’n dekade het kunstenaars hul gehore verruil vir algoritmiese blootstelling op gesentraliseerde platforms, waar hulle breukdele van ’n sent per stroom verdien het tussen indringende advertensies deur.',
      'Toonaangewende onafhanklike entrepreneurs verwerp daardie kompromie. Deur selfstandige ateljees te benut wat inhoudskepping, ledekanale en direkte betaalstelsels saambind, behou skeppers meer as 90% van hul bruto inkomste.',
      'Futurebox beliggaam hierdie filosofie: daar is geen derdeparty-advertensies nie, alle gereedskap werk onder privaat intekenaartoelae, en skeppers publiseer direk na hul eie gehoorkanale.',
    ],
  },

  // ── 4. Gaming: Generative World Models & Procedural Audio ───────────────
  {
    id: 'gaming-generative-audio-world-models',
    category: 'gaming',
    titleEn: 'Procedural Worlds: How AI is Rewriting Interactive Gaming & Soundtracks',
    titleAf: 'Prosedurele Wêrelde: Hoe KI Interaktiewe Speletjies & Klankbane Hervorm',
    blurbEn: 'Game engines are transitioning from static pre-rendered assets to living neural environments that compose responsive orchestral scores in real time.',
    blurbAf: 'Speletjie-enjins beweeg vanaf statiese bates na lewende neurale omgewings wat intyds dinamiese orkes-klankbane komponeer.',
    readTimeEn: '4 min read',
    readTimeAf: '4 min leestyd',
    publishedDate: '9 October 2026',
    takeawaysEn: [
      'Adaptive procedural audio reacts dynamically to player emotional states and in-game tension.',
      'Indie game studios can now craft expansive cinematic cutscenes using desktop generative video pipelines.',
      'Micro-budget developers achieve AAA-level sonic fidelity with neural vocal and instrumental synthesizers.',
    ],
    takeawaysAf: [
      'Aanpasbare prosedurele klank reageer intyds op die speler se emosionele spanning en spelgebeure.',
      'Onafhanklike speletjie-ateljees kan nou grootse kinematiese tonele skep met plaaslike generatiewe videopyplyne.',
      'Kleiner ontwikkelaars behaal AAA-gehalte klank met neurale sang- en instrument-sintetiseerders.',
    ],
    bodyEn: [
      'Interactive entertainment is undergoing its biggest technical leap since real-time ray tracing. Next-generation game production integrates generative audio engines directly into the gameplay loop: when a player enters an uncharted cavern, the score is not triggered from a static WAV file, but dynamically generated to match their heart rate and actions.',
      'By decoupling asset production from studio headcount, independent game creators can build immersive universes once reserved for multi-million dollar productions.',
      'Futurebox’s multitrack recording and generative music tools give game composers and sound designers immediate access to experimental soundscapes, cloned character dialogue, and adaptive theme songs.',
    ],
    bodyAf: [
      'Interaktiewe vermaak beleef sy grootste tegniese spronge sedert intydse ligstraling (ray tracing). Volgende-generasie speletjies integreer generatiewe klankenjins direk in die spelverloop: wanneer ’n speler ’n onbekende grot binnedring, word die musiek nie vanaf ’n statiese klanklêer gespeel nie, maar dinamies gekomponeer volgens die spanning en aksie.',
      'Deur produksiekoste te ontkoppel van reuse spanne, kan onafhanklike speletjie-ontwikkelaars meesleurende wêrelde bou wat voorheen miljoene rande gekos het.',
      'Futurebox se multitrack-opname en generatiewe musiekgereedskap bied speletjie-komponiste en klankontwerpers direkte toegang tot eksperimentele klanke, gekloonde dialoog en aanpasbare temasang.',
    ],
  },

  // ── 5. Frontier Tech: Quantum Audio, Neural Codecs & Privacy ────────────
  {
    id: 'frontier-neural-audio-codecs-privacy',
    category: 'frontier',
    titleEn: 'Neural Codecs and Edge Privacy: High-Fidelity Creation Without Cloud Leaks',
    titleAf: 'Neurale Kodeks en Toestel-privaatheid: Hoë Gehalte Sonder Wolk-lekkasies',
    blurbEn: 'Why on-device machine learning models represent the gold standard for artist confidentiality, low latency, and zero bandwidth waste.',
    blurbAf: 'Waarom masjienleer op die eie toestel die goue standaard is vir kunstenaar-vertroulikheid, blitsvinnige reaksie en nul datavermorsing.',
    readTimeEn: '5 min read',
    readTimeAf: '5 min leestyd',
    publishedDate: '8 October 2026',
    takeawaysEn: [
      'Neural audio codecs compress raw audio by 90% while preserving perceptual acoustics and phase fidelity.',
      'Client-side inference prevents proprietary studio stems and unreleased vocals from being trained on without consent.',
      'Hybrid cloud-edge pipelines provide instantaneous responsiveness for live monitoring.',
    ],
    takeawaysAf: [
      'Neurale klank-kodeks kompakteer rou klank met 90% terwyl akoestiese getrouheid en fase volkome behou word.',
      'Ingebedde verwerking op die toestel keer dat ateljee-spore en onuitgereikte stemme sonder toestemming vir model-opleiding gebruik word.',
      'Hibriede toestel-wolk argitektuur verseker onmiddellike reaksie vir regstreekse monitering.',
    ],
    bodyEn: [
      'As creative software becomes increasingly AI-driven, professional creators demand absolute certainty regarding data sovereignty. Unreleased album demos, private voiceprints, and proprietary scripts must never leak into public foundation model training sets.',
      'The breakthrough lies in edge neural processing: cutting-edge models perform background removal, vocal separation, and pitch tracking directly within the browser’s WebAssembly and WebGPU runtimes. The cloud is invoked solely for massive foundational generative tasks like full-spectrum video synthesis.',
      'Futurebox’s architectural commitment to "on this device first" guarantees that your creative works remain strictly confidential until you explicitly choose to publish them.',
    ],
    bodyAf: [
      'Namate kreatiewe sagteware meer KI-gedrewe word, eis professionele skeppers absolute sekerheid oor data-soewereiniteit. Onuitgereikte album-opnames, privaat stemafdrukke en konsep-tekste mag nooit in openbare opleidingsdata beland nie.',
      'Die deurbraak lê in randverwerking (edge processing): moderne modelle verwyder agtergronde, skei stemme af en volg stemhoogte direk binne die webblaaier se eie geheue. Die wolk word slegs ingespan vir reuse generatiewe take soos volle video-sintese.',
      'Futurebox se argitektoniese belofte van „eers op hierdie toestel” waarborg dat jou skeppende werk streng vertroulik bly totdat jy self kies om dit te publiseer.',
    ],
  },

  // ── 6. Episode outlines for the podcast studio ─────────────────────────
  {
    id: 'episode-creative-longevity',
    category: 'podcast',
    titleEn: 'Mindset and momentum: an episode on creative longevity',
    titleAf: 'Ingesteldheid en momentum: ’n episode oor skeppende uithouvermoë',
    blurbEn: 'An outline on creative burnout, steady execution and building something unconventional, ready to record in the podcast studio.',
    blurbAf: '’n Uiteensetting oor kreatiewe uitbranding, bestendige uitvoering en die bou van iets onkonvensioneels, gereed om in die potgooi-ateljee op te neem.',
    readTimeEn: '5 min read',
    readTimeAf: '5 min leestyd',
    publishedDate: '7 October 2026',
    episode: {
      topicEn: 'Focus, asymmetric bets and an unshakable vision',
      topicAf: 'Fokus, asimmetriese kanse en ’n onwrikbare visie',
    },
    takeawaysEn: [
      'Build in order: know the craft, practise it, find your people, and let the reputation follow.',
      'Consistency compounds: the gap between amateur and professional is what happens on the bad days.',
      'Thinking from first principles instead of copying is the only way to make something that defines its own category.',
    ],
    takeawaysAf: [
      'Bou in volgorde: ken die ambag, oefen dit, vind jou mense, en laat die reputasie volg.',
      'Konsekwentheid vermenigvuldig: die gaping tussen amateur en professioneel is wat op die slegte dae gebeur.',
      'Om uit eerste beginsels te dink in plaas van na te boots, is die enigste manier om iets te maak wat sy eie kategorie bepaal.',
    ],
    bodyEn: [
      'An episode on what separates the creators who last from the ones who trend: the nerve to think differently and to build against the consensus.',
      'Too many creators spend their first years asking permission or copying a formula that already works for somebody else. The rare outcome only arrives when you are contrarian and right at the same time. In software, music and media, the work that lasts has an unmistakable soul rather than a sanitised sameness.',
      'That is the ethos behind FutureBox: refusing to look like a template, taking pride in two languages, and building a studio that treats creators as founders.',
    ],
    bodyAf: [
      '’n Episode oor wat die skeppers wat hou, onderskei van dié wat net ’n gier is: die durf om anders te dink en teen die konsensus in te bou.',
      'Te veel skeppers spandeer hul eerste jare om toestemming te vra of ’n formule na te boots wat reeds vir iemand anders werk. Die seldsame uitkoms kom eers wanneer jy tegelyk teen die stroom én reg is. In sagteware, musiek en media het die werk wat hou ’n onmiskenbare siel eerder as ’n gesaniteerde eendersheid.',
      'Dit is die gees agter FutureBox: om te weier om soos ’n sjabloon te lyk, trots te wees op twee tale, en ’n ateljee te bou wat skeppers as stigters behandel.',
    ],
  },

  {
    id: 'episode-ai-and-musical-creativity',
    category: 'podcast',
    titleEn: 'Neural creativity: an episode on AI, music and the human spark',
    titleAf: 'Neurale skeppendheid: ’n episode oor KI, musiek en die menslike vonk',
    blurbEn: 'How generative models open musical structures nobody has tried, without replacing the emotional spark that makes a song matter.',
    blurbAf: 'Hoe generatiewe modelle musikale strukture oopmaak wat niemand nog probeer het nie, sonder om die emosionele vonk te vervang wat ’n liedjie laat saak maak.',
    readTimeEn: '6 min read',
    readTimeAf: '6 min leestyd',
    publishedDate: '6 October 2026',
    episode: {
      topicEn: 'Algorithmic harmony and human meaning',
      topicAf: 'Algoritmiese harmonie en menslike betekenis',
    },
    takeawaysEn: [
      'Generative music models do not replace composers; they widen what can be explored.',
      'The most useful setting is the model as an amplifier for a particular human taste.',
      'Owning the work means mastering both the craft of taste and the new tools.',
    ],
    takeawaysAf: [
      'Generatiewe musiekmodelle vervang nie komponiste nie; hulle verbreed wat verken kan word.',
      'Die nuttigste opstelling is die model as ’n versterker vir ’n bepaalde menslike smaak.',
      'Om die werk te besit, beteken om beide die ambag van smaak en die nuwe gereedskap te bemeester.',
    ],
    bodyEn: [
      'An episode that looks at synthetic creativity from both sides, the scientific and the philosophical.',
      'Music is, at one level, a mathematical language soaked in emotion. A model trained to understand cadence, tension and release can propose harmonic pairings a composer might never stumble on by intuition.',
      'The deciding factor is still curation and taste. FutureBox is built around exactly that: the technology provides an endless palette, and the artist directs every emotion, every stroke and the final master.',
    ],
    bodyAf: [
      '’n Episode wat sintetiese kreatiwiteit van albei kante bekyk, die wetenskaplike en die filosofiese.',
      'Musiek is, op een vlak, ’n wiskundige taal deurdrenk van emosie. ’n Model wat opgelei is om kadens, spanning en ontlading te verstaan, kan harmoniese pare voorstel waarop ’n komponis dalk nooit intuïtief sou afkom nie.',
      'Die deurslaggewende faktor bly kurering en smaak. FutureBox is rondom presies dít gebou: die tegnologie verskaf ’n eindelose palet, en die kunstenaar rig elke emosie, elke haal en die finale meesteropname.',
    ],
  },

  {
    id: 'episode-independent-studio-economics',
    category: 'podcast',
    titleEn: 'The end of ad networks: an episode on independent studio economics',
    titleAf: 'Die einde van advertensienetwerke: ’n episode oor onafhanklike ateljee-ekonomie',
    blurbEn: 'How direct subscriptions and small credit purchases free artists from advertising that pays them pennies.',
    blurbAf: 'Hoe direkte intekeninge en klein krediet-aankope kunstenaars bevry van advertensies wat hulle sent-bedrae betaal.',
    readTimeEn: '5 min read',
    readTimeAf: '5 min leestyd',
    publishedDate: '5 October 2026',
    episode: {
      topicEn: 'Direct subscriber relationships and studio margins',
      topicAf: 'Direkte intekenaar-verhoudings en ateljee-winsgrense',
    },
    takeawaysEn: [
      'Ad-driven algorithms reward sensation, clickbait and creative exhaustion.',
      'A direct exchange of value between creator and fan is the resilient one.',
      'Modern creators run as small studios: music, video and a member channel under one roof.',
    ],
    takeawaysAf: [
      'Advertensie-gedrewe algoritmes beloon sensasie, lokaas en kreatiewe uitputting.',
      '’n Direkte waarde-uitruil tussen skepper en aanhanger is die veerkragtige een.',
      'Moderne skeppers werk as klein ateljees: musiek, video en ’n ledekanaal onder een dak.',
    ],
    bodyEn: [
      'An episode on the breakdown of the old media money: reliance on algorithmic advertising diluted the work while returning pennies to the people who made it.',
      'The argument: the future belongs to creators running their own subscription studios. A platform that combines the tools, the publishing rails and a transparent credit economy removes friction and shields artists from platform risk.',
      'FutureBox is built on that model: no advert interruptions, the cost of a generation shown before you spend, and what you make is yours to publish.',
    ],
    bodyAf: [
      '’n Episode oor die ineenstorting van die ou mediageld: afhanklikheid van algoritmiese advertensies het die werk verwater terwyl dit sent-bedrae teruggegee het aan die mense wat dit gemaak het.',
      'Die argument: die toekoms behoort aan skeppers wat hul eie intekenaar-ateljees bedryf. ’n Platform wat die gereedskap, die publikasiepaaie en ’n deursigtige kredietekonomie kombineer, verwyder wrywing en beskerm kunstenaars teen platformrisiko.',
      'FutureBox is op daardie model gebou: geen advertensie-onderbrekings nie, die koste van ’n generering gewys voordat jy spandeer, en wat jy maak is joune om te publiseer.',
    ],
  },

  {
    id: 'episode-afrikaans-creators-worldwide',
    category: 'podcast',
    titleEn: 'Frontier breakers: Afrikaans creators on the world stage',
    titleAf: 'Grensverskuiwers: Afrikaanse skeppers op die wêreldverhoog',
    blurbEn: 'How independent Afrikaans musicians and podcasters use bilingual AI audio workflows to reach international audiences on their own terms.',
    blurbAf: 'Hoe onafhanklike Afrikaanse musikante en potgooi-makers tweetalige KI-klankwerkvloeie gebruik om wêreldgehore op hul eie terme te bereik.',
    readTimeEn: '4 min read',
    readTimeAf: '4 min leestyd',
    publishedDate: '4 October 2026',
    episode: {
      topicEn: 'Cultural heritage, AI synthesis and an independent studio',
      topicAf: 'Kulturele erfenis, KI-sintese en ’n onafhanklike ateljee',
    },
    takeawaysEn: [
      'Afrikaans culture and language carry further when the newest tools speak them.',
      'Bilingual models make native Afrikaans vocals, dubbing and lyrics possible, with a pronunciation booth to catch what still sounds foreign.',
      'Independent creators keep their intellectual property and control where their work goes.',
    ],
    takeawaysAf: [
      'Afrikaanse kultuur en taal dra verder wanneer die nuutste gereedskap dit praat.',
      'Tweetalige modelle maak egte Afrikaanse sang, oorklanking en lirieke moontlik, met ’n uitspraakhokkie wat vang wat nog vreemd klink.',
      'Onafhanklike skeppers behou hul intellektuele eiendom en beheer waarheen hul werk gaan.',
    ],
    bodyEn: [
      'An episode outline on how a regional language community can lead a technology wave rather than wait for a translation of somebody else’s.',
      'By putting native Afrikaans phonetics, poetic structures and idiom directly into voice cloning and lyric writing, FutureBox aims to put Afrikaans creators shoulder to shoulder with any international studio.',
      'Independent artists are showing that cultural authenticity paired with these tools yields work that is unmistakably theirs.',
    ],
    bodyAf: [
      '’n Episode-uiteensetting oor hoe ’n streektaalgemeenskap ’n tegnologiegolf kan lei eerder as om te wag vir ’n vertaling van iemand anders s’n.',
      'Deur egte Afrikaanse fonetiek, digterlike strukture en idioom direk in stemkloning en liriekskryf te sit, mik FutureBox daarna om Afrikaanse skeppers skouer aan skouer met enige internasionale ateljee te plaas.',
      'Onafhanklike kunstenaars wys dat kulturele egtheid gekoppel aan hierdie gereedskap werk oplewer wat onmiskenbaar hulle s’n is.',
    ],
  },
];

export function getInsightsByCategory(cat: InsightCategory): readonly InsightArticle[] {
  if (cat === 'all') return FUTURE_INSIGHTS;
  return FUTURE_INSIGHTS.filter((item) => item.category === cat);
}
