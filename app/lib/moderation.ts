/**
 * What this app will not make.
 *
 * Every generator here turns a sentence somebody typed into audio, a voice or
 * a video, and three of those are things that can be used against a real
 * person. So each prompt passes this before it reaches an engine, and the
 * refusal happens on the server, where the browser cannot skip it.
 *
 * ── Two layers, and why there are two ────────────────────────────────────
 *
 * This file is the first: a fixed set of rules with no network call and no
 * judgement. It is deliberately narrow. What it catches, it catches every
 * time, at no cost, and cannot be talked out of by a cleverer sentence —
 * which is the property that matters for the categories nobody argues about.
 *
 * The second layer is a classifier (`app/lib/server/safety.ts`), which reads
 * the whole sentence and can weigh it. That is where slurs, nuance and the
 * long tail of real names are handled, and it is the reason there is no slur
 * list in this file: a list of them is a maintenance job, is always out of
 * date, is trivially defeated by a space, and would sit in the repository
 * forever. A model reads what was meant. This layer reads what was typed.
 *
 * ── On names ─────────────────────────────────────────────────────────────
 *
 * Asking for a named person's voice is the single largest legal exposure this
 * product has, in every country it can be used from, and it is also against
 * the terms of the engine underneath. So the name rules below are the strict
 * ones, and they are split in two:
 *
 *   * A **voice** cue — "in the voice of", "sung by", "impersonate", and the
 *     Afrikaans equivalents — refuses any name-shaped phrase after it. There
 *     is no innocent reading of asking for a particular person's voice.
 *
 *   * A **style** cue — "in the style of", "sounds like" — refuses only a
 *     name this file knows, or a name followed by a singing word. Otherwise
 *     "sounds like Cape Town in summer" would be refused, and a gate that
 *     refuses ordinary description is a gate that gets switched off.
 *
 * The known-name list is short and will always be incomplete. That is fine:
 * it is the fast path, not the whole answer. The classifier reads the rest.
 *
 * None of this is legal advice and none of it makes the platform immune. It
 * makes the refusals real, consistent and logged, which is the part that is
 * actually in this repository's power.
 */

export type Surface =
  /** A music prompt: style, lyrics, a whole song. */
  | 'song'
  /** A video prompt going to a hosted video model. */
  | 'video'
  /** Text that will be spoken aloud in some voice. */
  | 'speech'
  /** What somebody called a cloned voice or a trained sound. */
  | 'name'
  /** The songs handed to a finetune, and what it is called. */
  | 'finetune';

export type Rule =
  | 'minors'
  | 'likeness'
  | 'fabricated-news'
  | 'explicit'
  | 'violence'
  | 'extremism'
  | 'weapons'
  | 'drugs'
  | 'fraud'
  | 'self-harm';

export interface Refusal {
  readonly rule: Rule;
  /** Shown to whoever typed it. Says what was refused, not merely "no". */
  readonly message: string;
  /**
   * Whether this refusal counts against the account.
   *
   * A style prompt that strays near a famous name is a mistake somebody makes
   * once and corrects; counting it would punish ordinary use. The categories
   * below that are never a mistake do count, and enough of them suspend the
   * account.
   */
  readonly counts: boolean;
}

/* ── Word families ─────────────────────────────────────────────────────── */

const MINOR = /\b(child|children|kid|kids|toddler|infant|baby|babies|minor|minors|underage|under-?age|preteen|pre-?teen|teen|teens|teenage|teenager|schoolgirl|schoolboy|kind|kinders|kleuter|baba|tiener|tieners|minderjarig\w*|skoolmeisie|skoolseun)\b/i;

const SEXUAL = /\b(sex|sexual|sexually|sexy|nude|nudes|naked|nudity|erotic|erotica|eroties\w*|porn|porno|pornographic|explicit|topless|undress|undressing|stripping|strip\s*tease|fondl\w*|molest\w*|aroused|orgasm|genital\w*|breasts|nipples|lingerie|seks|seksueel|naak|nakend|kaal|pornografie|uittrek)\b/i;

const VIOLENT = /\b(kill|killing|murder|murdering|behead\w*|decapitat\w*|torture|torturing|massacre|slaughter|execute|execution|lynch\w*|gore|dismember\w*|mutilat\w*|rape|raping|maim|stab|stabbing|shoot\s+(?:up|dead)|vermoor|moord|marteling|verkrag\w*|slag)\b/i;

const GROUP = /\b(jews?|jewish|muslims?|christians?|hindus?|blacks?|whites?|coloureds?|indians?|africans?|afrikaners?|boers?|arabs?|asians?|immigrants?|migrants?|refugees?|foreigners?|gays?|lesbians?|queers?|trans(?:gender)?\s*(?:people|folk)?|disabled\s+people|women|men|zulus?|xhosas?|swartes?|wittes?|buitelanders?|vlugtelinge?)\b/i;

const DEHUMANISE = /\b(subhuman|sub-?human|vermin|cockroach\w*|parasites?|filth|scum|animals?|plague|infest\w*|exterminat\w*|cleanse|wipe\s+out|gas\s+the|ongedierte|uitroei)\b/i;

const EXTREMISM = /\b(isis|isil|daesh|al[-\s]?qaeda|al[-\s]?shabaab|boko\s*haram|taliban|hamas|hezbollah|neo[-\s]?nazi|white\s+(?:power|supremac\w*)|jihad(?:i|ist)?|martyrdom\s+operation|lone\s+wolf\s+attack|terror\s*(?:cell|attack)\s+plan)\b/i;

const RECRUIT = /\b(recruit\w*|join\s+(?:us|the)|pledge|glorif\w*|praise|celebrat\w*|manifesto|propaganda|anthem|hymn|call\s+to\s+arms|werf|verheerlik\w*)\b/i;

const WEAPONS = /\b(pipe\s*bomb|ied|improvised\s+explosive|c-?4|semtex|tatp|napalm|thermite|nerve\s+agent|sarin|vx\s+gas|mustard\s+gas|ricin|anthrax|dirty\s+bomb|nuclear\s+device|silencer|suppressor|ghost\s+gun|auto\s*sear|3d[-\s]?print(?:ed|ing)?\s+(?:a\s+)?(?:gun|firearm|pistol|rifle)|untraceable\s+(?:gun|firearm)|plofstof|bomtoestel)\b/i;

const SYNTHESIS = /\b(synthesi[sz]e|synthesis|cook|manufactur\w*|make|making|build|building|assembl\w*|produce|producing|recipe|instructions?|step[-\s]by[-\s]step|how\s+to|maak|vervaardig|resep)\b/i;

const DRUGS = /\b(meth|methamphetamine|crystal\s*meth|fentanyl|carfentanil|heroin|cocaine|crack\s+cocaine|mdma|ecstasy|lsd|ghb|rohypnol|roofies|date[-\s]rape\s+drug|nyaope|tik|krokodil|captagon)\b/i;

const FRAUD = /\b(phish\w*|scam|scamming|scammer|defraud\w*|fraudulent|social\s+engineer\w*|otp|one[-\s]time\s+pin|pin\s+code|cvv|card\s+number|account\s+number|verify\s+your\s+account|suspicious\s+activity\s+on\s+your|your\s+account\s+(?:has\s+been\s+)?(?:suspended|locked|frozen)|sars|sim\s*swap|vishing|smishing|bedrog|swendel|kul)\b/i;

const IMPERSONATE_ORG = /\b(bank|banking|fnb|absa|capitec|nedbank|standard\s+bank|paypal|paystack|revenue\s+service|police|saps|hawks|court|sheriff|debt\s+collector|microsoft\s+support|tech\s+support|your\s+bank)\b/i;

const SELF_HARM = /\b(suicide|kill\s+(?:myself|yourself|himself|herself|themselves)|end\s+(?:my|your)\s+life|hang\s+(?:myself|yourself)|overdose\s+on|self[-\s]harm|cutting\s+myself|starve\s+(?:myself|yourself)|pro[-\s]?ana|thinspo|selfmoord|selfdood)\b/i;

const ENCOURAGE = /\b(how\s+to|best\s+way|instructions?|method|guide|encourag\w*|convince|persuade|tell\s+(?:me|them)\s+to|hoe\s+om|beste\s+manier)\b/i;

/* ── Names ─────────────────────────────────────────────────────────────── */

/**
 * A cue that asks for a particular person's *voice*. No innocent reading.
 */
const VOICE_CUE = /\b(in\s+the\s+voice\s+of|with\s+the\s+voice\s+of|voice\s+of|sung\s+by|rapped\s+by|performed\s+by|narrated\s+by|read\s+by|as\s+if\s+it\s+were|impersonat\w*|imitate|imitating|mimic\w*|deep\s*fake\w*|voice\s*clone\s+of|clone\s+of|sound[-\s]?alike\s+of|soundalike\s+of|duet\s+with|featuring|feat\.?|ft\.?|in\s+die\s+stem\s+van|met\s+die\s+stem\s+van|gesing\s+deur|voorgelees\s+deur|naboots\w*|nagemaak\w*)\s+/i;

/**
 * A cue that asks for a *sound*. Usually innocent, sometimes not.
 */
const STYLE_CUE = /\b(in\s+the\s+style\s+of|styled\s+after|sounds?\s+like|sounding\s+like|a\s+bit\s+like|just\s+like|reminiscent\s+of|inspired\s+by|copy\s+of|tribute\s+to|cover\s+of|in\s+die\s+styl\s+van|klink\s+soos|net\s+soos|geïnspireer\s+deur)\s+/i;

/** Words that turn a name after a style cue into a request for a performer. */
const PERFORMER = /^(?:singing|sings|rapping|raps|performing|performs|vocals?|voice|singer|rapper|artist|sanger|sangeres|rapper|stem)\b/i;

/**
 * A name-shaped phrase: one to three capitalised words, allowing the small
 * words that sit inside Afrikaans and Dutch surnames.
 */
// Written out rather than as \p{Lu}, because the unicode flag needs a newer
// compile target than this project sets and the accented letters that actually
// turn up in these two languages fit in two ranges.
const UPPER = 'A-ZÀ-ÖØ-Þ';
const LETTER = "A-Za-zÀ-ÖØ-öø-ÿ0-9'’-";
const JOINER = '(?:\\s+(?:van\\s+der|van|de|du|le|la|di|del|dos|da|von)\\b)?';

const NAME_SHAPE = new RegExp(
  `^((?:[${UPPER}][${LETTER}]+)${JOINER}(?:\\s+[${UPPER}][${LETTER}]+){0,2})`,
);

/** The same shape, found anywhere in the sentence rather than at its start. */
const NAME_ANYWHERE = new RegExp(
  `(?:^|[\\s(“"'])([${UPPER}][${LETTER}]+(?:\\s+[${UPPER}][${LETTER}]+){1,2})`,
);

/**
 * Capitalised words that are a sound, a place or a scene rather than a person.
 * Without this, "sounds like Amapiano" and "in the style of Cape Town jazz"
 * are refused, and those are exactly the prompts this app exists for.
 */
const NOT_A_PERSON = new Set(
  [
    'amapiano', 'afrobeats', 'afro', 'gqom', 'kwaito', 'bacardi', 'sokkie', 'boeremusiek',
    'maskandi', 'mbaqanga', 'marabi', 'kaapse', 'goema', 'jazz', 'motown', 'nashville',
    'britpop', 'bollywood', 'k-pop', 'kpop', 'j-pop', 'lo-fi', 'lofi', 'trap', 'drill',
    'house', 'deep', 'tech', 'techno', 'trance', 'garage', 'grime', 'dubstep', 'reggae',
    'dancehall', 'soca', 'samba', 'bossa', 'nova', 'tango', 'flamenco', 'blues', 'soul',
    'funk', 'disco', 'gospel', 'country', 'folk', 'punk', 'metal', 'rock', 'indie', 'pop',
    'classical', 'baroque', 'opera', 'ambient', 'hip', 'hop', 'r&b', 'rnb', 'synthwave',
    'city', 'town', 'cape', 'johannesburg', 'joburg', 'jozi', 'durban', 'pretoria',
    'soweto', 'africa', 'african', 'south', 'north', 'east', 'west', 'karoo', 'highveld',
    'sunday', 'monday', 'friday', 'saturday', 'summer', 'winter', 'autumn', 'spring',
    'christmas', 'god', 'jesus', 'sunday morning', 'the', 'a', 'an', 'my', 'your', 'our',
    'sondag', 'somer', 'winter', 'kersfees', 'suid', 'afrika', 'kaap', 'karoo',
  ].map((word) => word.toLowerCase()),
);

/**
 * Names this file knows on sight.
 *
 * Short by design, weighted towards the two audiences this app has: whoever is
 * globally famous enough that a request naming them is a request for a
 * likeness, and South African artists, because that is where the users are and
 * a list of only American names would be useless here.
 *
 * A name missing from this list is not permitted — it is merely not caught
 * *here*. The classifier reads the sentence afterwards.
 */
const KNOWN = new Set(
  [
    // Globally recognisable performers.
    'beyonce', 'beyoncé', 'rihanna', 'adele', 'drake', 'eminem', 'taylor swift', 'ariana grande',
    'justin bieber', 'billie eilish', 'ed sheeran', 'bruno mars', 'kanye west', 'kendrick lamar',
    'travis scott', 'the weeknd', 'dua lipa', 'sza', 'doja cat', 'post malone', 'harry styles',
    'lady gaga', 'katy perry', 'madonna', 'michael jackson', 'whitney houston', 'elvis presley',
    'freddie mercury', 'john lennon', 'paul mccartney', 'bob dylan', 'bob marley', 'tupac',
    '2pac', 'notorious big', 'biggie', 'snoop dogg', 'jay-z', 'nicki minaj', 'cardi b',
    'frank sinatra', 'amy winehouse', 'prince', 'david bowie', 'johnny cash', 'dolly parton',
    'shakira', 'celine dion', 'mariah carey', 'sam smith', 'lana del rey', 'lorde', 'sia',
    'coldplay', 'nirvana', 'metallica', 'queen', 'the beatles', 'abba', 'daft punk', 'bts',
    'blackpink', 'linkin park', 'radiohead', 'pink floyd', 'led zeppelin', 'rolling stones',
    // South African and continental.
    'brenda fassie', 'miriam makeba', 'hugh masekela', 'johnny clegg', 'lucky dube',
    'ladysmith black mambazo', 'freshlyground', 'cassper nyovest', 'nasty c', 'aka',
    'black coffee', 'dj maphorisa', 'kabza de small', 'focalistic', 'sjava', 'zahara',
    'master kg', 'nomcebo', 'tyla', 'sho madjozi', 'zola', 'hhp', 'die antwoord',
    'jack parow', 'karen zoid', 'steve hofmeyr', 'kurt darren', 'bok van blerk',
    'juanita du plessis', 'laurika rauch', 'koos du plessis', 'anton goosen', 'fokofpolisiekar',
    'burna boy', 'wizkid', 'davido', 'tems', 'rema', 'angelique kidjo', 'fela kuti',
    // Voices that are not singers but are asked for anyway.
    'nelson mandela', 'morgan freeman', 'david attenborough', 'barack obama', 'donald trump',
    'cyril ramaphosa', 'julius malema', 'jacob zuma', 'elon musk', 'oprah', 'oprah winfrey',
  ].map((name) => name.toLowerCase()),
);

/** Cues that ask for something to be passed off as real reporting. */
const NEWS = /\b(breaking\s+news|news\s+report|news\s+bulletin|news\s+anchor|newsreader|press\s+conference|real\s+footage|actual\s+footage|leaked\s+(?:footage|audio|recording|video)|caught\s+on\s+camera|cctv\s+of|confession|admits\s+to|announces\s+(?:his|her|their)\s+resignation|nuusberig|nuuslesing|amptelike\s+verklaring)\b/i;

/** Titles that make a name a public office rather than a stage name. */
const OFFICE = /\b(president|prime\s+minister|chancellor|senator|congressman|governor|mayor|minister\s+of|king|queen|prince|princess|pope|archbishop|chief\s+justice|commissioner|ceo\s+of|president\s+van|premier|burgemeester)\b/i;

/* ── The screen ────────────────────────────────────────────────────────── */

function refuse(rule: Rule, message: string, counts = true): Refusal {
  return { rule, message, counts };
}

/**
 * The name asked for after a cue, or null.
 *
 * Returns the matched text so a refusal can say which name it saw, which is
 * the difference between a message somebody can act on and a wall.
 */
function nameAfter(text: string, cue: RegExp, knownOnly: boolean): string | null {
  const match = cue.exec(text);
  if (!match) return null;

  const rest = text.slice(match.index + match[0].length);
  const shape = NAME_SHAPE.exec(rest.trimStart());
  if (!shape) return null;

  const name = shape[1].trim();
  const lower = name.toLowerCase();

  // A capitalised genre or place is not a person, whichever cue found it.
  if (name.split(/\s+/).every((word) => NOT_A_PERSON.has(word.toLowerCase()))) return null;

  if (!knownOnly) return name;
  if (KNOWN.has(lower)) return name;

  // Not a name this file knows — but "sounds like Themba singing" is asking
  // for a performer whatever the list says.
  const after = rest.trimStart().slice(shape[1].length).trimStart();
  return PERFORMER.test(after) ? name : null;
}

/**
 * Everything this file refuses, checked in order of how badly it matters.
 *
 * Returns the first refusal or null. First rather than all, because a person
 * fixes one thing at a time and a list of ten objections reads as a wall.
 */
export function screen(text: string, surface: Surface): Refusal | null {
  const value = (text ?? '').trim();
  if (!value) return null;

  // Spacing tricks: a rule that "k i l l" walks through is not a rule. Runs of
  // single letters are collapsed before matching, and the original is matched
  // too, because collapsing can also join words that were never one.
  const collapsed = value.replace(/\b(?:[a-zA-Z][\s.\-_*]){2,}[a-zA-Z]\b/g, (run) =>
    run.replace(/[\s.\-_*]/g, ''),
  );
  const hit = (pattern: RegExp): boolean => pattern.test(value) || pattern.test(collapsed);

  // 1. Nothing about a child and sex, in any surface, in any framing, ever.
  if (hit(MINOR) && hit(SEXUAL)) {
    return refuse(
      'minors',
      'This asks for sexual content involving a child. It is refused, it is recorded, and repeating it will close the account.',
    );
  }

  // 2. A named person's voice, face or performance.
  const voiceName = nameAfter(value, VOICE_CUE, false);
  if (voiceName) {
    return refuse(
      'likeness',
      `Asking for ${voiceName}'s voice or performance is not something this app will make. A voice identifies a person, and using one without them is impersonation whatever it was meant for. Describe the sound instead — the range, the grain, the delivery — and you will get further than a name would have taken you.`,
      false,
    );
  }

  const styleName = nameAfter(value, STYLE_CUE, true);
  if (styleName) {
    return refuse(
      'likeness',
      `Prompts that name ${styleName} are refused, because a request in a named artist's style is a request for that artist. Say what you actually want — the tempo, the instruments, the era, the mood — and the result will be yours to release.`,
      false,
    );
  }

  if ((surface === 'video' || surface === 'speech') && hit(OFFICE) && NAME_ANYWHERE.test(value)) {
    return refuse(
      'likeness',
      'This names a person in public office. Putting words in the mouth of a real official is the one use of this technology that reliably ends in court, so it is refused.',
    );
  }

  // 3. Something made to be mistaken for a record of an event.
  if ((surface === 'video' || surface === 'speech') && hit(NEWS)) {
    return refuse(
      'fabricated-news',
      'This asks for something that would be taken as real footage or a real report. Anything made here can be fiction, comedy or drama, but not a fake record of something that happened.',
    );
  }

  // 4. Sexual content. This is a music, podcast and video app, and there is no
  //    version of it where making explicit material is worth the moderation
  //    burden that comes with it.
  if (hit(SEXUAL) && (surface === 'video' || surface === 'name')) {
    return refuse(
      'explicit',
      'Sexually explicit material is outside what this app makes.',
      false,
    );
  }

  // 5. Violence against a real, identified person, and the incitement of it.
  if (hit(VIOLENT) && hit(GROUP)) {
    return refuse(
      'violence',
      'This asks for violence against a group of people. Songs can be angry, and this is not that.',
    );
  }
  if (hit(DEHUMANISE) && hit(GROUP)) {
    return refuse(
      'extremism',
      'This describes a group of people as less than people. That is where the refusal is, not on the subject.',
    );
  }
  if (hit(EXTREMISM) && hit(RECRUIT)) {
    return refuse(
      'extremism',
      'This asks for material that promotes or recruits for a violent organisation.',
    );
  }

  // 6. Instructions. The subject is not the problem; the recipe is.
  if (hit(WEAPONS) && hit(SYNTHESIS)) {
    return refuse('weapons', 'This asks how to make a weapon. A song about one is fine; a recipe for one is not.');
  }
  if (hit(DRUGS) && hit(SYNTHESIS)) {
    return refuse('drugs', 'This asks how to manufacture a controlled drug. Write about it, do not ask for the method.');
  }
  if (hit(SELF_HARM) && hit(ENCOURAGE)) {
    return refuse(
      'self-harm',
      'This asks for encouragement or a method for self-harm. If any of this is close to you, the South African Depression and Anxiety Group answers on 0800 567 567, any hour.',
    );
  }

  // 7. The scam. A cloned voice and a bank script is the fraud this technology
  //    is actually used for, so the voice surfaces are the strict ones.
  if (hit(FRAUD) && hit(IMPERSONATE_ORG)) {
    return refuse(
      'fraud',
      'This reads as a script for defrauding somebody in the name of a bank or an authority. It is refused and it is recorded.',
    );
  }
  if (surface === 'speech' && hit(IMPERSONATE_ORG) && /\b(otp|pin|cvv|password|card\s+number|account\s+number)\b/i.test(value)) {
    return refuse(
      'fraud',
      'A recording that asks somebody for a PIN, an OTP or a card number in the name of a bank is a fraud tool. It will not be made here.',
    );
  }

  return null;
}

/**
 * A quick yes/no for the browser, so the studio can warn before spending a
 * request. Never the only check: the real one runs on the server, because
 * anything the browser decides can be skipped by not using the browser.
 */
export function looksRefusable(text: string, surface: Surface): boolean {
  return screen(text, surface) !== null;
}
