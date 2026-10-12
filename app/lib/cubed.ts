/**
 * Cubed classes: three to a masterclass, and sixty per cent to the guest.
 *
 * ── What she asked, and why the name is the feature ──────────────────────
 *
 * Carli, 10 October 2026: *"Die masterclass section wil ek rename na Cubed
 * classes… Die rede vir cubed gaan oor die mag 3. Ek wil elke masterclass 3
 * klasse lank maak. Ons moet dit ook so uit stipuleer vir ons gaste. Ons gaan
 * 'n 60/40 winsverdeling doen. Dus 60% vir die gas."*
 *
 * So the name is not a coat of paint. **Cubed is the format.** Three to the
 * power of nothing in particular — three classes, every time, from everybody.
 * A name that means a rule is a name that keeps the rule, which is why the
 * number lives in this file and every screen that mentions it reads it from
 * here.
 *
 * ── Why three and not "about three" ──────────────────────────────────────
 *
 * Because a guest has to be told before they agree, and "three classes" is a
 * thing somebody can plan a weekend around. One long talk is a lecture and
 * gets watched once; three is a shape with an arc — what it is, how it is
 * done, what is next — and somebody who finishes the first comes back for
 * the second.
 *
 * `check:cubed` refuses a series that is not three, and refuses it in the
 * data rather than on a screen. A series published with two classes is a
 * promise broken to the person who sat down for the third.
 *
 * ── The split, and why it is written down here ───────────────────────────
 *
 * Sixty to the guest, forty to FutureBox. Her number, and the direction of it
 * matters: the guest is the one with the audience and the reputation at stake,
 * and a platform taking the larger half of somebody else's name is a platform
 * that cannot book the next one.
 *
 * It is in code for the written agreement a guest signs, not for the page.
 * Carli, 12 October 2026: *"Die Cubed classes kan nie die winsverdeling wys
 * tussen my en die persoon wat die klas aanbied nie."* The public room says
 * the series is shared and that the terms are written down before anybody
 * says yes; the number itself stays between her and the guest. One file
 * still, so it cannot be sixty in the agreement and fifty-five in a
 * conversation — and `check:cubed` now refuses the room if it quotes it.
 */

/**
 * How many classes make one masterclass.
 *
 * Three. Named rather than written as a literal in four screens, because the
 * one thing certain about a rule in four places is that it will be three in
 * three of them.
 */
export const CLASSES_IN_A_SERIES = 3;

/**
 * What a Cubed class costs, in rand.
 *
 * Carli, 11 October 2026: *"Ek beplan om R949 vir 'n cubed class te vra."*
 *
 * Here rather than typed into the page, for the reason everything else in
 * this file is here: the guest reads a split, the page shows a price, and
 * the agreement quotes both. A number that lives in one screen is a number
 * that disagrees with the other two by the end of the month.
 *
 * It is the price of a CLASS. A series is three of them —
 * `CLASSES_IN_A_SERIES` — and `seriesRand()` does that multiplication once
 * so nobody does it again differently.
 */
export const CLASS_RAND = 949;

/** What a whole series costs, which is the thing a guest is paid a share of. */
export const seriesRand = (): number => CLASS_RAND * CLASSES_IN_A_SERIES;

/**
 * A price as this country writes it: `R949`, `R2 847`.
 *
 * Grouped by hand rather than with `toLocaleString('en-ZA')`, which was the
 * first version and is a trap: the separator it chooses comes from the
 * runtime's ICU data, which is not the same on the server as on a phone and
 * not the same on two phones. It handed back a NON-BREAKING space here and
 * would hand back a comma on a build without full ICU — so the price on the
 * page and the price in the agreement could differ by a character that
 * nobody can see and nobody can search for.
 *
 * Found by a check asserting the obvious spelling and getting a string that
 * looked identical and was not.
 */
export const randSaid = (amount: number): string =>
  `R${Math.round(amount).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}`;

/** What the guest keeps from one full series, at the split below. */
export const guestRand = (): number => Math.round(seriesRand() * GUEST_SHARE);

/** The guest's share of what a series earns, as a fraction. */
export const GUEST_SHARE = 0.6;

/** FutureBox's share. Derived, so the two cannot stop adding up to one. */
export const HOUSE_SHARE = 1 - GUEST_SHARE;

/** The split as a person says it: `60/40`. */
export const splitAsSaid = (): string =>
  `${Math.round(GUEST_SHARE * 100)}/${Math.round(HOUSE_SHARE * 100)}`;

/** One class inside a series. */
export interface Part {
  /** 1, 2 or 3. */
  readonly part: number;
  readonly title: readonly [en: string, af: string];
  /** What somebody can do after this one that they could not before. */
  readonly outcome: readonly [en: string, af: string];
  readonly minutes: number;
}

export interface Series {
  /** The url: `/cubed#<id>`. Lower case, dashes. */
  readonly id: string;
  readonly title: readonly [en: string, af: string];
  /** Who is teaching it, as they would be introduced. */
  readonly guest: string;
  /** What they are, in a line. Not a biography. */
  readonly guestIs: readonly [en: string, af: string];
  /**
   * Where it stands.
   *
   * `planned` is a series she is arranging, `recording` is one with a date,
   * `open` is one somebody can watch. Said on the card, because a room full
   * of classes nobody can press is a room that reads as broken rather than
   * as a calendar.
   */
  readonly stage: 'planned' | 'recording' | 'open';
  readonly parts: readonly Part[];
}

/**
 * The series.
 *
 * Deliberately short and deliberately honest about stage. Carli: *"Ek gaan
 * baie spesiale en high profile masterclasses reël."* They are not arranged
 * yet, and a room that listed six imaginary guests would be the landing page
 * promising something — the thing this app has a check about. What is here is
 * the format, said in the one series that exists to describe the format, and
 * the room says plainly that the rest is being arranged.
 */
export const SERIES: readonly Series[] = [
  {
    id: 'the-cubed-format',
    guest: 'FutureBox',
    guestIs: [
      'The studio itself, on how a Cubed class is built',
      'Die ateljee self, oor hoe ’n Cubed-klas gebou word',
    ],
    stage: 'open',
    title: ['How a Cubed class works', 'Hoe ’n Cubed-klas werk'],
    parts: [
      {
        part: 1,
        title: ['What it is', 'Wat dit is'],
        outcome: [
          'You know what the three classes are for and which one you are in.',
          'Jy weet waarvoor die drie klasse is en in watter een jy is.',
        ],
        minutes: 12,
      },
      {
        part: 2,
        title: ['How it is done', 'Hoe dit gedoen word'],
        outcome: [
          'You can do the thing yourself, start to finish, once.',
          'Jy kan die ding self doen, van begin tot end, een keer.',
        ],
        minutes: 24,
      },
      {
        part: 3,
        title: ['What is next', 'Wat volgende kom'],
        outcome: [
          'You know where this is going and what to build next, starting tomorrow.',
          'Jy weet waarheen dit gaan en wat jy volgende moet bou, van môre af.',
        ],
        minutes: 18,
      },
    ],
  },
];

/** A series by its id, or nothing. */
export const seriesById = (id: string): Series | undefined =>
  SERIES.find((one) => one.id === id);

/** How long a whole series runs, in minutes. */
export const minutesOf = (series: Series): number =>
  series.parts.reduce((sum, one) => sum + one.minutes, 0);

/**
 * What a guest is told, before they agree.
 *
 * On a public page rather than in an email, and that is the point: a guest who
 * reads the terms before the conversation arrives at the conversation already
 * knowing the shape, and nobody has to remember what was said. Every number in
 * it comes from the constants above, so the page and the agreement cannot
 * drift apart.
 *
 * The third one is the one worth putting in writing. A guest's name on three
 * classes is a bigger thing than their name on one, and a platform that
 * wanted that without saying what it keeps is a platform nobody good says
 * yes to twice.
 */
export const GUEST_TERMS: readonly (readonly [en: string, af: string])[] = [
  [
    `Three classes, not one. A Cubed class is ${CLASSES_IN_A_SERIES} sessions: what it is, how it is done, and what is next. You are asked for three because one talk gets watched once and three gets finished.`,
    `Drie klasse, nie een nie. ’n Cubed-klas is ${CLASSES_IN_A_SERIES} sessies: wat dit is, hoe dit gedoen word, en wat volgende kom. Jy word vir drie gevra omdat een gesprek een keer gekyk word en drie klaargemaak word.`,
  ],
  [
    'What the series earns is shared with you. The share is written into your agreement before you say yes, and FutureBox carries the filming, the editing, the hosting and the audience.',
    'Wat die reeks verdien word met jou gedeel. Die deel word in jou ooreenkoms geskryf voor jy ja sê, en FutureBox dra die verfilming, die redigering, die bediening en die gehoor.',
  ],
  [
    'Your name is on it and it stays yours. Nothing is re-narrated, nothing is generated in your voice, and nothing is published without you seeing the cut.',
    'Jou naam is daarop en dit bly joune. Niks word oorvertel nie, niks word in jou stem gegenereer nie, en niks word gepubliseer sonder dat jy die snit gesien het nie.',
  ],
  [
    'A class that explains a method is welcome. A class that asserts a finding needs somebody who read the paper, and that somebody is you rather than a model.',
    '’n Klas wat ’n metode verduidelik is welkom. ’n Klas wat ’n bevinding beweer het iemand nodig wat die artikel gelees het, en daardie iemand is jy eerder as ’n model.',
  ],
];
