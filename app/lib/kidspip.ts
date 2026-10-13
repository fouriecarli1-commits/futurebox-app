/**
 * Pip, the sprite in the corner of the kids room, and what Pip can say.
 *
 * ── What Google's page had, and what was not taken ───────────────────────
 *
 * The "Kids Dream Studio" page she brought on 13 October 2026 had an "Ask
 * Pip!" button that opened a chat: a text box, a microphone, and every word
 * a child typed sent straight from the browser to a language model with an
 * API key pasted into the page. Two of those cannot ship. A key in a page is
 * a key everybody has, and a child's room whose whole design is "every press
 * is one somebody chose on purpose" cannot have an open prompt in the corner
 * — see the top of `KidsRoom.tsx` for why there is no free text box into a
 * model in here.
 *
 * So Pip is kept, and Pip's answers are written down. Three things a child
 * can ask for — a joke, an idea, a cheer — and a shelf of answers for each,
 * read aloud by the browser's own voice if the child wants. It costs nothing,
 * it sends nothing, and every line was read by a grown-up first.
 */

export type PipAsk = 'joke' | 'idea' | 'cheer';

export interface PipLine {
  readonly en: string;
  readonly af: string;
}

export const PIP_ASKS: readonly { readonly id: PipAsk; readonly icon: string; readonly says: readonly [string, string] }[] = [
  { id: 'joke', icon: '🤪', says: ['kids.pipJoke', 'Tell me a joke!'] },
  { id: 'idea', icon: '💡', says: ['kids.pipIdea', 'Give me an idea!'] },
  { id: 'cheer', icon: '🎉', says: ['kids.pipCheer', 'Cheer me on!'] },
];

export const PIP_SAYS: Record<PipAsk, readonly PipLine[]> = {
  joke: [
    { en: 'Why did the drum go to bed? It was beat!', af: 'Hoekom het die trom gaan slaap? Hy was pootuit!' },
    { en: 'What do you call a dinosaur that sings? A tyranno-chorus!', af: 'Wat noem jy ’n dinosourus wat sing? ’n Tirannosing-rus!' },
    { en: 'Why did the banana go to the doctor? It was not peeling well.', af: 'Hoekom het die piesang dokter toe gegaan? Hy het nie lekker gevoel nie.' },
    { en: 'What is a cat’s favourite song? Three Blind Mice!', af: 'Wat is ’n kat se gunsteling liedjie? Muis, muis, muis!' },
    { en: 'How does the sea say hello? It waves!', af: 'Hoe groet die see? Hy swaai met sy golwe!' },
    { en: 'What do you call a sleeping dinosaur? A dino-snore!', af: 'Wat noem jy ’n dinosourus wat slaap? ’n Dino-snork!' },
  ],
  idea: [
    { en: 'Make a song about your dog, and make it sound Silly.', af: 'Maak ’n liedjie oor jou hond, en laat dit Snaaks klink.' },
    { en: 'Try the Dino Safari beat, then put a dragon on the stage!', af: 'Probeer die Dino Safari-beat, en sit dan ’n draak op die verhoog!' },
    { en: 'Press Spin and see what song you get. It is always a surprise.', af: 'Druk Draai en kyk watter liedjie jy kry. Dit is altyd ’n verrassing.' },
    { en: 'Make a story with a turtle hero, then read it to someone.', af: 'Maak ’n storie met ’n skilpad-held, en lees dit vir iemand.' },
    { en: 'A bedtime song that sounds like a music box. Sleepy!', af: '’n Slaaptydliedjie wat soos ’n musiekdosie klink. Slaperig!' },
    { en: 'Play Bubble Pop and try to beat your best score.', af: 'Speel Borrel-Pop en probeer jou beste telling klop.' },
  ],
  cheer: [
    { en: 'You are a superstar! Keep going!', af: 'Jy is ’n superster! Hou aan!' },
    { en: 'That was amazing. I knew you could do it!', af: 'Dit was ongelooflik. Ek het geweet jy kan!' },
    { en: 'Wow! Sparky is doing a happy dance for you!', af: 'Sjoe! Sparky doen ’n blydans vir jou!' },
    { en: 'You make the best beats in the whole kingdom.', af: 'Jy maak die beste beats in die hele koninkryk.' },
    { en: 'Three cheers for you! Hip hip hooray!', af: 'Drie hoera’s vir jou! Hiep hiep hoera!' },
    { en: 'Every song you make makes the stars shine brighter.', af: 'Elke liedjie wat jy maak laat die sterre helderder skyn.' },
  ],
};

/** The next line of a kind, in a language. `at` counts up so a child never hears the same one twice running. */
export const pipLine = (ask: PipAsk, at: number, lang: 'en' | 'af'): string => {
  const shelf = PIP_SAYS[ask];
  const line = shelf[((at % shelf.length) + shelf.length) % shelf.length];
  return lang === 'af' ? line.af : line.en;
};

/** Read a line aloud with the browser's own voice, where it has one. Nothing is sent anywhere. */
export function sayAloud(words: string, lang: 'en' | 'af'): boolean {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return false;
  try {
    window.speechSynthesis.cancel();
    const said = new SpeechSynthesisUtterance(words);
    said.lang = lang === 'af' ? 'af-ZA' : 'en-ZA';
    said.rate = 0.95;
    said.pitch = 1.2;
    window.speechSynthesis.speak(said);
    return true;
  } catch {
    return false;
  }
}
