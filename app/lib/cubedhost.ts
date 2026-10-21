/**
 * Cubed³ presenters: what they register, what they agree to, and what they
 * record — in one place, read by the presenter's page, the route that keeps
 * it, and the owner's inbox.
 *
 * ── What she asked for ───────────────────────────────────────────────────
 *
 * The owner, 21 October 2026: *"Ek wil 'n futurebox cubed class registrasie
 * bladsy hê vir die aanbieders. Menend ek gee vir jou hulle eposse, en dit
 * gee vir hulle via 'n link access tot hierdie registrasie, en die
 * registrasie moet weer aan my kant land."* The details for the legal
 * document, the terms in a box that scrolls with an agree tick, the process
 * laid out practically, a tick list for recording and editing, five steps
 * with upload blocks, and the expectations after them: three teasers in
 * English and Afrikaans, and permission for six photographs. Then: *"Die
 * legal dokument moet ook 'n sign pad hê."*
 *
 * ── Why one file ─────────────────────────────────────────────────────────
 *
 * The page shows the fields and the server checks them; the page shows the
 * terms and the owner's copy of the agreement prints them. Two copies of
 * either disagree by the end of the month, and a signed agreement whose
 * owner's copy says something the presenter never saw is worse than none.
 * So the terms carry a version, the version is stored with the signature,
 * and both screens read the words from here.
 *
 * ── What is NOT here ─────────────────────────────────────────────────────
 *
 * The share of the takings. `lib/cubed.ts` keeps the number for the written
 * offer; the owner, 12 October 2026: *"Die Cubed classes kan nie die
 * winsverdeling wys tussen my en die persoon wat die klas aanbied nie."*
 * The terms say the fee is in the written offer, and `check:cubedhost`
 * refuses this file if a percentage creeps in. Bank details are not taken
 * either: they are not needed to draw the agreement up, and a form reached
 * by a link is the wrong place to collect them.
 */

import { CLASSES_IN_A_SERIES } from './cubed';

/** The terms' version, stored with every signature. Change it when the words change. */
export const TERMS_VERSION = '2026-10-21';

/** The longest any one answer may be. */
const SHORT = 160;
const LONG = 1200;

export type Entity = 'person' | 'company';
export type Languages = 'both' | 'english';

/** Where the six photographs may be used. The first is the class itself and cannot be left out. */
export const PHOTO_USES = [
  { id: 'app', label: 'On FutureBox itself — the class page, the Cubed³ room and the app', required: true },
  { id: 'social', label: 'On FutureBox’s own social media accounts', required: false },
  { id: 'ads', label: 'In paid online adverts for the class', required: false },
  { id: 'print', label: 'In print and outdoor material (posters, flyers, banners)', required: false },
] as const;
export type PhotoUse = (typeof PHOTO_USES)[number]['id'];

export interface HostDetails {
  readonly legalName: string;
  readonly idNumber: string;
  readonly birthDate: string;
  readonly nationality: string;
  readonly entity: Entity;
  readonly companyName: string;
  readonly companyReg: string;
  readonly companyRole: string;
  readonly taxNumber: string;
  readonly vatNumber: string;
  readonly street: string;
  readonly suburb: string;
  readonly city: string;
  readonly province: string;
  readonly postalCode: string;
  readonly country: string;
  readonly phone: string;
  readonly altEmail: string;
  readonly stageName: string;
  readonly classTitle: string;
  readonly classAbout: string;
  readonly bio: string;
  readonly socials: string;
  readonly languages: Languages | '';
  readonly recordSelf: boolean | null;
  readonly editSelf: boolean | null;
  readonly photoUses: readonly PhotoUse[];
  readonly photoCredit: string;
  readonly signedName: string;
}

export const EMPTY_DETAILS: HostDetails = {
  legalName: '', idNumber: '', birthDate: '', nationality: 'South African', entity: 'person',
  companyName: '', companyReg: '', companyRole: '', taxNumber: '', vatNumber: '',
  street: '', suburb: '', city: '', province: '', postalCode: '', country: 'South Africa',
  phone: '', altEmail: '', stageName: '', classTitle: '', classAbout: '', bio: '', socials: '',
  languages: '', recordSelf: null, editSelf: null, photoUses: ['app'], photoCredit: '', signedName: '',
};

const text = (value: unknown, most = SHORT): string =>
  (typeof value === 'string' ? value : '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').slice(0, most);
const yesNo = (value: unknown): boolean | null => (value === true ? true : value === false ? false : null);

/** Whatever arrived, as details: known fields only, each cut to its length. Never throws. */
export function cleanDetails(raw: unknown): HostDetails {
  const given = (raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {}) as Record<string, unknown>;
  const uses = Array.isArray(given.photoUses) ? given.photoUses : [];
  return {
    legalName: text(given.legalName),
    idNumber: text(given.idNumber, 24).replace(/\s+/g, ''),
    birthDate: /^\d{4}-\d{2}-\d{2}$/.test(String(given.birthDate ?? '')) ? String(given.birthDate) : '',
    nationality: text(given.nationality, 60),
    entity: given.entity === 'company' ? 'company' : 'person',
    companyName: text(given.companyName),
    companyReg: text(given.companyReg, 40),
    companyRole: text(given.companyRole, 80),
    taxNumber: text(given.taxNumber, 20),
    vatNumber: text(given.vatNumber, 20),
    street: text(given.street),
    suburb: text(given.suburb, 80),
    city: text(given.city, 80),
    province: text(given.province, 60),
    postalCode: text(given.postalCode, 12),
    country: text(given.country, 60),
    phone: text(given.phone, 24),
    altEmail: text(given.altEmail, 120),
    stageName: text(given.stageName, 80),
    classTitle: text(given.classTitle, 120),
    classAbout: text(given.classAbout, LONG),
    bio: text(given.bio, LONG),
    socials: text(given.socials, 400),
    languages: given.languages === 'both' || given.languages === 'english' ? given.languages : '',
    recordSelf: yesNo(given.recordSelf),
    editSelf: yesNo(given.editSelf),
    photoUses: [...new Set(['app', ...uses.filter((one): one is PhotoUse => PHOTO_USES.some((use) => use.id === one))])] as PhotoUse[],
    photoCredit: text(given.photoCredit),
    signedName: text(given.signedName),
  };
}

/** A South African identity number: thirteen digits, a real date, and the Luhn check digit. */
export function saIdOk(id: string): boolean {
  if (!/^\d{13}$/.test(id)) return false;
  const mm = Number(id.slice(2, 4));
  const dd = Number(id.slice(4, 6));
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return false;
  let sum = 0;
  for (let i = 0; i < 13; i += 1) {
    let digit = Number(id[i]);
    if (i % 2 === 1) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  return sum % 10 === 0;
}

/** Whole years between a date of birth and today. */
export function ageOn(birthDate: string, today = new Date()): number {
  const born = new Date(`${birthDate}T00:00:00Z`);
  if (Number.isNaN(born.getTime())) return -1;
  let years = today.getUTCFullYear() - born.getUTCFullYear();
  const before = today.getUTCMonth() < born.getUTCMonth()
    || (today.getUTCMonth() === born.getUTCMonth() && today.getUTCDate() < born.getUTCDate());
  if (before) years -= 1;
  return years;
}

const SOUTH_AFRICAN = /^(south african|suid-afrikaans|sa|rsa|za)$/i;

/**
 * What is still missing or wrong before the details can be signed, as
 * field → sentence. Empty when they can be.
 */
export function problemsWith(d: HostDetails, today = new Date()): Record<string, string> {
  const out: Record<string, string> = {};
  const need = (key: keyof HostDetails, said: string): void => {
    if (!String(d[key] ?? '').trim()) out[key] = said;
  };
  need('legalName', 'Your full name, as it is on your ID or passport.');
  need('idNumber', 'Your ID number, or your passport number.');
  if (d.idNumber && SOUTH_AFRICAN.test(d.nationality.trim()) && !saIdOk(d.idNumber)) {
    out.idNumber = 'That is not a valid South African ID number. Check the thirteen digits, or give a passport number and change the nationality.';
  } else if (d.idNumber && !SOUTH_AFRICAN.test(d.nationality.trim()) && !/^[A-Za-z0-9]{6,20}$/.test(d.idNumber)) {
    out.idNumber = 'A passport number is six to twenty letters and digits.';
  }
  need('birthDate', 'Your date of birth.');
  if (d.birthDate && ageOn(d.birthDate, today) < 18) out.birthDate = 'Presenters have to be 18 or older.';
  need('nationality', 'Your nationality.');
  if (d.entity === 'company') {
    need('companyName', 'The company’s registered name.');
    need('companyReg', 'The company’s registration number.');
    need('companyRole', 'Your position in the company.');
  }
  need('street', 'Your street address.');
  need('city', 'Your town or city.');
  need('postalCode', 'Your postal code.');
  need('country', 'Your country.');
  need('phone', 'A mobile number we can reach you on.');
  if (d.phone && !/^\+?[0-9 ()-]{9,20}$/.test(d.phone)) out.phone = 'That does not look like a phone number.';
  if (d.altEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.altEmail)) out.altEmail = 'That does not look like an email address.';
  need('stageName', 'The name the public will see on your class.');
  need('classTitle', 'A working title for your class.');
  need('classAbout', 'A few lines about what your class teaches.');
  if (!d.languages) out.languages = 'Choose the languages you will record in.';
  if (d.recordSelf === null) out.recordSelf = 'Tell us whether you record yourself.';
  if (d.editSelf === null) out.editSelf = 'Tell us whether you edit yourself.';
  need('signedName', 'Type your full name under your signature.');
  if (d.signedName && d.legalName && d.signedName.trim().toLowerCase() !== d.legalName.trim().toLowerCase()) {
    out.signedName = 'Type your name exactly as you gave it at the top.';
  }
  return out;
}

/* ── The upload blocks ───────────────────────────────────────────────── */

export type SlotId =
  | 'welcome' | 'icebreaker' | 'session1' | 'session2' | 'session3' | 'feature' | 'closing' | 'teasers' | 'photos';

export interface Slot {
  readonly id: SlotId;
  readonly title: string;
  /** What may go in: moving pictures, or stills. */
  readonly kind: 'video' | 'photo';
  /** The most files the block keeps. */
  readonly most: number;
}

export const SLOTS: readonly Slot[] = [
  { id: 'welcome', title: 'Step 1 — Welcome and introduction', kind: 'video', most: 6 },
  { id: 'icebreaker', title: 'Step 2 — Ice breaker', kind: 'video', most: 12 },
  { id: 'session1', title: 'Session 1 — What is this course?', kind: 'video', most: 12 },
  { id: 'session2', title: 'Session 2 — How is it done?', kind: 'video', most: 12 },
  { id: 'session3', title: 'Session 3 — What is next?', kind: 'video', most: 12 },
  { id: 'feature', title: 'Step 4 — Your favourite FutureBox feature', kind: 'video', most: 6 },
  { id: 'closing', title: 'Step 5 — Closing words', kind: 'video', most: 6 },
  { id: 'teasers', title: 'Three teaser videos', kind: 'video', most: 12 },
  { id: 'photos', title: 'Six photographs', kind: 'photo', most: 6 },
];

export const slotOf = (id: unknown): Slot | null => SLOTS.find((one) => one.id === id) ?? null;

/** The file types a block takes, by its kind. */
export function fits(slot: Slot, type: string): boolean {
  return slot.kind === 'photo' ? /^image\/(jpeg|png|webp|heic|heif)$/.test(type) : /^video\//.test(type);
}

/** A file name made safe to keep: letters, digits, dots and dashes. */
export const safeName = (name: string): string =>
  (name.normalize('NFKD').replace(/[^\w.-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'file').slice(-80);

/** A link to a file kept somewhere else, for a video too big to upload. */
export const cleanLink = (raw: unknown): string => {
  const value = text(raw, 600).trim();
  if (!value) return '';
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.toString() : '';
  } catch {
    return '';
  }
};

/* ── How it works ────────────────────────────────────────────────────── */

export const PROCESS: readonly { readonly title: string; readonly body: string }[] = [
  { title: 'Register', body: 'Fill in your details below, read the terms, tick that you agree and sign. It takes about ten minutes, and you can stop and come back with the same link — what you type is kept as you go.' },
  { title: 'We confirm in writing', body: 'FutureBox sends you a written offer with your fee and the dates we agree on. Nothing is recorded before you have it.' },
  { title: 'Plan your recording', body: 'Choose below whether you record yourself and whether you edit yourself. If not, we arrange the recording and editing with you.' },
  { title: 'Record the five steps', body: 'Welcome, ice breaker, the three sessions, your favourite feature and your closing words — each laid out below with a script or the questions to answer.' },
  { title: 'Upload', body: 'Every step has its own upload block on this page. Upload as you go; nothing has to be done in one sitting.' },
  { title: 'Review', body: 'You see the finished class before it goes live, and you have five working days to ask for changes.' },
  { title: 'Teasers and photos', body: 'Three short teaser videos and six photographs, so the class can be announced before it opens.' },
  { title: 'Launch', body: `Your Cubed³ class opens on FutureBox: ${CLASSES_IN_A_SERIES} sessions, one masterclass.` },
];

/** Practical tips for anybody recording themselves. */
export const RECORDING_TIPS: readonly string[] = [
  'Film landscape (sideways), at 1080p or higher, at 25 or 30 frames a second.',
  'Light in front of you, not behind you — face a window, never sit with your back to one.',
  'A quiet room with soft things in it (a couch, curtains) sounds far better than a bare one. Switch off fans and air-conditioning.',
  'Use a clip-on microphone if you have one; otherwise keep the phone no more than an arm’s length away.',
  'Put the camera at eye level and look into the lens, not at the screen.',
  'Leave two seconds of silence before you start and after you finish, so the edit has room.',
  'No music under your voice, and no songs, logos or footage you do not own — we add music in the edit.',
  'Record each language as its own take. Name your files clearly, for example “session1-english.mp4”.',
];

/* ── The five steps ──────────────────────────────────────────────────── */

export interface Step {
  readonly n: number;
  readonly title: string;
  readonly length: string;
  readonly intro: string;
  /** Lines to read or adapt, where there is a script. */
  readonly script?: readonly string[];
  /** Questions to answer, where the step is questions. */
  readonly questions?: readonly string[];
  /** For the three sessions: each one's focus and what goes into it. */
  readonly sessions?: readonly { readonly slot: SlotId; readonly title: string; readonly focus: string; readonly points: readonly string[]; readonly opener: string }[];
  readonly slots: readonly SlotId[];
}

export const STEPS: readonly Step[] = [
  {
    n: 1,
    title: 'Welcome and the Cubed³ introduction',
    length: '1 to 2 minutes',
    intro: 'The first thing a student sees. Warm, short and personal: who you are, what Cubed³ is, and what the next three sessions will give them. Use the script as it is, or make it sound like you — the words in [brackets] are yours to fill in.',
    script: [
      'Hi, I’m [your name] — and welcome to my Cubed³ class on FutureBox.',
      '[One or two lines about you: what you do, and how long you have been doing it.]',
      'Cubed means three. This masterclass is three sessions, and each one builds on the one before.',
      'In the first session we look at what [your topic] really is — the ideas underneath it, and why it matters.',
      'In the second, I show you how it’s done, step by step, the way I actually do it.',
      'And in the third, we look at what’s next: how you take this further on your own, and where it can take you.',
      'So get comfortable, grab something to write with — and let’s dive into the future together.',
    ],
    slots: ['welcome'],
  },
  {
    n: 2,
    title: 'Ice breaker',
    length: 'Five questions, about one minute each',
    intro: 'Five quick questions, so students meet the person before the teacher. Answer each one in about a minute, naturally, as if a friend asked. Say the question before you answer it, so each answer stands on its own. One video with all five is fine, or one per question.',
    script: ['Before we start, let me tell you a little about myself — five quick questions, one minute each.'],
    questions: [
      'Where did you go to primary school and high school?',
      'Who was your favourite teacher — and why?',
      'Tell us a secret.',
      'What is your hidden talent?',
      'What was your greatest adventure?',
    ],
    slots: ['icebreaker'],
  },
  {
    n: 3,
    title: `The ${CLASSES_IN_A_SERIES} sessions`,
    length: 'About 15 to 30 minutes per session',
    intro: 'This is the class itself. Every session has the same shape: first a short introduction to the session — which session it is, what it covers and what the student will be able to do by the end — and then the content. The three sessions follow the Cubed³ arc: what it is, how it is done, and what is next.',
    sessions: [
      {
        slot: 'session1',
        title: 'Session 1 — What is this course?',
        focus: 'What it is',
        opener: 'Welcome to session one of [class title]. In this session we look at what [your topic] really is. By the end, you’ll understand [the one thing they will understand].',
        points: [
          'What the subject is, in plain words, and why it matters',
          'The ideas and words a student needs before anything else',
          'What the student will be able to do after all three sessions',
          'The tools, gear or software they will need (and what is optional)',
        ],
      },
      {
        slot: 'session2',
        title: 'Session 2 — How is it done?',
        focus: 'How it is done',
        opener: 'Welcome back — this is session two of [class title]. Today I show you how it’s done, step by step. By the end, you’ll have [what they will have made or done].',
        points: [
          'Your method, step by step, the way you really work',
          'A worked example from start to finish',
          'The mistakes beginners make, and how to avoid them',
          'An exercise the student can do straight after watching',
        ],
      },
      {
        slot: 'session3',
        title: 'Session 3 — What is next?',
        focus: 'What is next',
        opener: 'Welcome to session three, the last one of [class title]. Now we look at what’s next — how you take this further on your own.',
        points: [
          'How to keep practising and getting better',
          'Where this skill can take the student — work, projects, opportunities',
          'Resources you recommend',
          'A recap of the three sessions, and one challenge to leave them with',
        ],
      },
    ],
    slots: ['session1', 'session2', 'session3'],
  },
  {
    n: 4,
    title: 'Your favourite FutureBox feature',
    length: '1 to 2 minutes',
    intro: 'Pick the one feature of the FutureBox app you like most and show it: open it, use it for real, and say why it is your favourite and how it helps somebody doing what you do. A screen recording with your voice over it works well, or film yourself using it.',
    script: [
      'One of my favourite things on FutureBox is [the feature].',
      'Let me show you how it works. [Show it, step by step.]',
      'I love it because [why it helps you].',
      'Try it yourself — it’s right there in the app.',
    ],
    slots: ['feature'],
  },
  {
    n: 5,
    title: 'Closing — a quote, and a goodbye',
    length: 'About 1 minute',
    intro: 'End with something worth keeping: a quote or a piece of life wisdom that means something to you, why it matters to you, and a warm goodbye.',
    script: [
      'That brings us to the end of [class title].',
      'Before you go, here’s something I live by: “[your quote or words of wisdom]”.',
      '[One or two lines on why it matters to you.]',
      'Thank you for spending this time with me. Now go and make something — I can’t wait to see what you do with it.',
      'I’m [your name], and this was Cubed³ on FutureBox. Goodbye — and totsiens.',
    ],
    slots: ['closing'],
  },
];

/* ── What is expected after the five steps ───────────────────────────── */

export const TEASERS: readonly { readonly title: string; readonly body: string }[] = [
  { title: 'Teaser 1 — The hook', body: 'Fifteen to thirty seconds. One surprising line or result that makes somebody stop scrolling, then: “Learn how in my Cubed³ class on FutureBox.”' },
  { title: 'Teaser 2 — What you will learn', body: 'Thirty seconds. The three sessions in one sentence each — what it is, how it is done, what is next — and who the class is for.' },
  { title: 'Teaser 3 — Meet me', body: 'Fifteen to thirty seconds. Who you are, why you love this, and an invitation: “Join me on FutureBox.”' },
];

/* ── The terms ───────────────────────────────────────────────────────── */

export interface Clause {
  readonly title: string;
  readonly body: readonly string[];
}

export const COMPANY = 'FUTUREBOXSTUDIO (Pty) Ltd';

export const TERMS: readonly Clause[] = [
  {
    title: '1. Who this agreement is between',
    body: [
      `This agreement is between ${COMPANY} (“FutureBox”, “we”) and the presenter named in this registration (“you”). If you register on behalf of a company, the company is the presenter and you confirm that you may bind it.`,
      'This registration, these terms and the written offer FutureBox sends you together form the agreement. If the written offer and these terms differ, the written offer applies.',
    ],
  },
  {
    title: '2. What a Cubed³ class is',
    body: [
      `A Cubed³ class is one masterclass made of ${CLASSES_IN_A_SERIES} sessions: what it is, how it is done, and what is next. With it come the welcome and introduction, the ice breaker, your favourite FutureBox feature and your closing words, as described on this page (together, “the Recordings”).`,
    ],
  },
  {
    title: '3. Languages',
    body: [
      'Every Recording is made in English and in Afrikaans: each piece is recorded twice, once in each language, so that students can take the class in either.',
      'The only exception is a presenter who has told us in this registration that they speak English only. That presenter records in English only, and FutureBox may add Afrikaans subtitles to the English Recordings.',
    ],
  },
  {
    title: '4. Recording and editing',
    body: [
      'You tell us in this registration whether you record yourself and whether you edit yourself. Where you do not, FutureBox arranges the recording or editing with you at times agreed in writing.',
      'Recordings you make yourself follow the practical guidelines on this page as closely as you reasonably can. FutureBox may trim, edit, add titles, subtitles, music and FutureBox branding, and fix sound and picture, but will not change the meaning of what you say.',
      'You will see the finished class before it is published and may ask for changes within five working days. If we hear nothing in that time, the class may be published.',
    ],
  },
  {
    title: '5. Delivery',
    body: [
      'You deliver the Recordings, the three teaser videos and the six photographs by the dates in the written offer, by uploading them on this page or as otherwise agreed in writing.',
    ],
  },
  {
    title: '6. Ownership and licence',
    body: [
      'You keep the copyright in your own knowledge, methods and any material you made before this agreement.',
      'You grant FutureBox a worldwide licence to host, stream, sell access to, edit, subtitle, translate and promote the Recordings and teasers on FutureBox and in its marketing, for as long as the class is offered on FutureBox. For the first twelve months after the class is first published the licence is exclusive: you will not publish the same Recordings anywhere else in that time.',
      'Students who bought the class keep access to it even after it stops being offered.',
    ],
  },
  {
    title: '7. Payment',
    body: [
      'You are paid a share of what the class earns on FutureBox, as set out in the written offer FutureBox sends you before you start. The offer also says when and how payment is made.',
      'Payment details are collected separately when the offer is accepted, not on this page. You are responsible for your own tax, and for VAT if you are registered for it.',
    ],
  },
  {
    title: '8. Marketing, teasers and photographs',
    body: [
      'You record three short teaser videos for the class, in English and in Afrikaans (in English only if you speak English only), and provide six different photographs of yourself.',
      'You give FutureBox permission to use the six photographs, your name, your presenting name and the teasers to promote your Cubed³ class, only in the places you tick in this registration. The class page on FutureBox itself is always included.',
      'The permission lasts for as long as the class is offered on FutureBox, plus twelve months. You do not have to be asked again for each use inside that scope. FutureBox will ask you again, in writing, before any use outside it — another product, a different campaign, a place you did not tick, or after the period ends.',
      'FutureBox may crop, resize and colour-correct the photographs and place text or branding beside or over them, but will not alter your appearance or use them in a way that suggests you endorse anything other than FutureBox and your class.',
      'You may withdraw this permission at any time by writing to FutureBox. We then stop new uses within thirty days and remove the photographs from places we control where that is reasonably possible. Withdrawal does not affect what was lawfully published before it, or printed material already distributed.',
      'You confirm that you own the photographs or have the photographer’s permission to give FutureBox this use. Where you give a photographer’s name, FutureBox credits them where a credit can reasonably be shown.',
    ],
  },
  {
    title: '9. Your promises',
    body: [
      'You are 18 or older. What you present is your own work or you have the right to use it, and it contains no music, footage, logos or material belonging to others that you are not allowed to use.',
      'Nothing you present is defamatory, discriminatory, harmful or unlawful, and nothing you say is presented as professional advice for which you are not qualified.',
      'You will not share FutureBox’s unpublished features, plans or the terms of your offer with others.',
    ],
  },
  {
    title: '10. FutureBox’s promises',
    body: [
      'FutureBox presents your class with care, credits you as its presenter, and pays you as set out in the written offer.',
      'FutureBox may decline to publish, or remove, a Recording that breaks the law, these terms or FutureBox’s community rules, and will tell you why.',
    ],
  },
  {
    title: '11. Your personal information',
    body: [
      'FutureBox processes the personal information in this registration — and the Recordings and photographs, which show who you are — under the Protection of Personal Information Act 4 of 2013 (POPIA).',
      'We use it to draw up and carry out this agreement, to pay you, to credit you as the presenter and to promote your class as set out above. It is stored securely with our service providers, is seen only by the FutureBox people who need it, and is not sold.',
      'We keep it for as long as the agreement lasts and afterwards for as long as the law requires (for example, five years for tax records).',
      'You may ask to see, correct or delete your information, or object to its use, by writing to FutureBox. You may also complain to the Information Regulator of South Africa.',
    ],
  },
  {
    title: '12. Ending the agreement',
    body: [
      'Either of us may end this agreement with thirty days’ written notice. If either of us seriously breaks it and does not put it right within fourteen days of being asked to, the other may end it at once.',
      'After it ends, FutureBox stops selling the class, students who bought it keep their access, and section 8 governs the photographs and teasers.',
    ],
  },
  {
    title: '13. Signing and the law',
    body: [
      'Ticking that you agree, signing on the pad and pressing “Sign and send” is your electronic signature, under the Electronic Communications and Transactions Act 25 of 2002. FutureBox keeps the date and time you signed and the version of these terms you saw.',
      'This agreement is governed by the law of the Republic of South Africa.',
      `Terms version ${TERMS_VERSION}.`,
    ],
  },
];
