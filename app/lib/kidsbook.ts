'use client';

/**
 * Making a child's storybook: written by the story engine, every page drawn,
 * every page read in voices — and, whatever is missing, still a book.
 *
 * Three engines, three ways to fall short, and a child on the other side of
 * each one. So each falls back on its own and the book still arrives:
 *
 * - No story engine (no key, a fault): the Story Maker's own four pages.
 * - No picture for a page (no credits, a refusal): that page drawn by the
 *   browser, as the template's are. When the first page fails, the rest are
 *   not tried — the reason is the same and the child should not wait for it
 *   five more times.
 * - No voice for a page: the phone reads it (`phone: true`). Again, a first
 *   refusal for credits or a switched-off service stops the rest.
 *
 * Pictures and voices go a few at a time, together, so a six-page book is
 * about as long to make as its slowest two pictures.
 */

import { accessToken } from './cloud';
import { makeKidPicture } from './kidsalive';
import { imageFrom, packOne, REFERENCE_SIDE } from './packpicture';
import { BUDGET } from './picturelimit';
import {
  buildStoryboardStory, createSceneSvg, silentWav, STORY_SECTIONS, VISUAL_STYLES,
} from './kidsstoryboard';
import { pageArt, pageWords, spokenLines, type StoryLine, type WrittenStory } from './kidstory';
import type { KidVoiceId } from './kidsvoices';
import type { KeptPage, KeptStory } from './storykeep';

export interface BookChoices {
  readonly hero: string;
  readonly setting: string;
  readonly twist: string;
  readonly ending: string;
  readonly visual: string;
}

export type BookStep = 'write' | 'draw' | 'done';

export interface BookProgress {
  readonly step: BookStep;
  /** Each page's picture as it arrives, for the making screen to show. */
  readonly drawn: readonly (Blob | null)[];
  readonly voiced: number;
  readonly pages: number;
}

async function headers(): Promise<Record<string, string>> {
  const token = await accessToken();
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

/** `work` over `items`, at most `most` at once, in order of starting. */
export async function inTurn<T>(
  items: readonly T[],
  most: number,
  work: (item: T, at: number) => Promise<void>,
): Promise<void> {
  let next = 0;
  const lane = async (): Promise<void> => {
    while (next < items.length) {
      const at = next;
      next += 1;
      await work(items[at], at);
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, Math.min(most, items.length)) }, lane));
}

/** How long a WAV plays, from its header: what is after it, over its byte rate. */
export function wavSeconds(bytes: ArrayBuffer): number {
  if (bytes.byteLength < 44) return 0;
  const rate = new DataView(bytes).getUint32(28, true);
  return rate ? (bytes.byteLength - 44) / rate : 0;
}

/** Should the rest of the book stop asking, after this answer? */
const hopeless = (status: number): boolean => status === 401 || status === 402 || status === 403 || status === 503;

async function readPage(
  lines: readonly StoryLine[],
  lang: 'en' | 'af',
): Promise<{ audio: Blob; seconds: number } | { says: string; stop: boolean }> {
  try {
    const answer = await fetch('/api/kids/read', {
      method: 'POST',
      headers: await headers(),
      body: JSON.stringify({ lines, lang }),
    });
    if (!answer.ok) {
      const detail = (await answer.json().catch(() => ({}))) as { message?: string };
      return { says: detail.message ?? 'The story voices could not be reached.', stop: hopeless(answer.status) };
    }
    const bytes = await answer.arrayBuffer();
    return { audio: new Blob([bytes], { type: 'audio/wav' }), seconds: wavSeconds(bytes) };
  } catch {
    return { says: 'The story voices could not be reached.', stop: true };
  }
}

async function writeBook(
  choices: BookChoices,
  storyteller: KidVoiceId,
  lang: 'en' | 'af',
): Promise<{ story: WrittenStory; style: string } | { says: string }> {
  try {
    const answer = await fetch('/api/kids/story', {
      method: 'POST',
      headers: await headers(),
      body: JSON.stringify({ ...choices, storyteller, lang }),
    });
    const said = (await answer.json().catch(() => ({}))) as { story?: WrittenStory; style?: string; message?: string };
    if (!answer.ok || !said.story) return { says: said.message ?? 'The story engine could not be reached.' };
    return { story: said.story, style: said.style ?? '' };
  } catch {
    return { says: 'The story engine could not be reached.' };
  }
}

/** A picture as the picture engine takes one: shrunk, as a reference. */
async function asReference(picture: Blob): Promise<{ data: string; mime: string } | null> {
  const url = URL.createObjectURL(picture);
  try {
    const image = await imageFrom(url);
    return image ? packOne(image, REFERENCE_SIDE, Math.floor(BUDGET / 2)) : null;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function makeBook({
  choices,
  storyteller,
  lang,
  say,
  onProgress,
}: {
  readonly choices: BookChoices;
  readonly storyteller: KidVoiceId;
  readonly lang: 'en' | 'af';
  readonly say: (pair: readonly [string, string]) => string;
  readonly onProgress?: (now: BookProgress) => void;
}): Promise<{ story: KeptStory; engine: boolean; notes: string[] }> {
  const notes: string[] = [];
  const note = (words: string): void => { if (!notes.includes(words)) notes.push(words); };
  onProgress?.({ step: 'write', drawn: [], voiced: 0, pages: 0 });

  const written = await writeBook(choices, storyteller, lang);
  if ('says' in written) {
    note(written.says);
    const story = await buildStoryboardStory({
      heroId: choices.hero,
      settingId: choices.setting,
      twistId: choices.twist,
      endingId: choices.ending,
      visualStyleId: choices.visual,
      lang,
      say,
    });
    onProgress?.({ step: 'done', drawn: [], voiced: 0, pages: story.pages.length });
    return { story, engine: false, notes };
  }

  const { story: book } = written;
  const style = written.style || (VISUAL_STYLES.find((one) => one.id === choices.visual) ?? VISUAL_STYLES[0]).stylePrompt;
  const count = book.pages.length;
  const drawn: (Blob | null)[] = Array(count).fill(null);
  const voices: ({ audio: Blob; seconds: number } | null)[] = Array(count).fill(null);
  let voiced = 0;
  const report = (): void => onProgress?.({ step: 'draw', drawn: [...drawn], voiced, pages: count });
  report();

  /* The voices start at once, beside the pictures. */
  let voicesStop = false;
  const voicing = inTurn(book.pages, 3, async (page, at) => {
    if (voicesStop) return;
    const said = await readPage(spokenLines(page), lang);
    if ('audio' in said) {
      voices[at] = said;
      voiced += 1;
      report();
      return;
    }
    if (said.stop) voicesStop = true;
    note(said.says);
  });

  /* Page one first and alone: every other page is drawn to match it. */
  const first = await makeKidPicture(pageArt(book, book.pages[0], style, false), null, true);
  if ('picture' in first) {
    drawn[0] = first.picture;
    report();
    const reference = await asReference(first.picture);
    await inTurn(book.pages.slice(1), 3, async (page, at) => {
      const made = await makeKidPicture(pageArt(book, page, style, Boolean(reference)), reference, true);
      if ('picture' in made) drawn[at + 1] = made.picture;
      else note(made.says);
      report();
    });
  } else {
    note(first.says);
  }
  await voicing;

  /* Whatever did not come back is drawn and read here, so the book is whole. */
  const card = (section: number, id: string): string =>
    (STORY_SECTIONS[section].choices.find((one) => one.id === id) ?? STORY_SECTIONS[section].choices[0]).emoji;
  const pages: KeptPage[] = book.pages.map((page, i) => {
    const words = pageWords(page);
    const voice = voices[i];
    const picture = drawn[i] ?? new Blob(
      [createSceneSvg(card(0, choices.hero), card(1, choices.setting), card(2, choices.twist), choices.visual, i, `${book.title} · ${i + 1}/${count}`)],
      { type: 'image/svg+xml' },
    );
    return {
      text: words,
      picture,
      audio: voice?.audio ?? silentWav(),
      seconds: voice?.seconds ?? Math.ceil(words.length / 13),
      lines: page.lines,
      motion: page.motion,
      sparkle: page.sparkle,
      ...(page.wonder ? { wonder: page.wonder } : {}),
      ...(voice ? {} : { phone: true }),
    };
  });
  onProgress?.({ step: 'done', drawn: [...drawn], voiced, pages: count });
  return {
    story: { id: `kidbook-${Date.now()}`, title: book.title, made: Date.now(), pages },
    engine: true,
    notes,
  };
}
