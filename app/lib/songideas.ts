/**
 * Offline songwriting prompts.
 *
 * The fallback for when no API key is configured. These are deliberately
 * *prompts to the writer* rather than lines pretending to be lyrics — a
 * template dressed up as a suggestion is worse than no suggestion, because you
 * only find out it was hollow after you have used it. A question you have to
 * answer yourself is honest about what it is.
 *
 * The UI labels these as not-AI wherever they appear.
 */

export interface Idea {
  readonly label: string;
  readonly text: string;
  readonly why: string;
}

const NEXT_LINE: Idea[] = [
  { label: 'Name the place', text: 'Put an actual place in the next line — a road, a room, a town. Not "here" or "this place".', why: 'A named place gives the listener somewhere to stand.' },
  { label: 'Change who is speaking', text: 'Write the next section from the other person\'s side.', why: 'Two points of view make a song feel like it moves.' },
  { label: 'One object, three times', text: 'Pick one object already in the song and bring it back twice more, changed each time.', why: 'Repetition with a difference is the cheapest structure there is, and it works.' },
  { label: 'Say the hard thing plainly', text: 'Write the line you have been talking around. No metaphor.', why: 'The plain line is usually the one people remember.' },
  { label: 'Start in the middle', text: 'Open the next section mid-sentence, as if the thought was already running.', why: 'Skips the throat-clearing a first draft always has.' },
  { label: 'End on a question', text: 'Finish the section with something unanswered.', why: 'Gives the chorus something to land against.' },
  { label: 'Take a step back in time', text: 'Write four lines about the same thing, a year earlier.', why: 'A bridge needs somewhere new, and the past is always available.' },
  { label: 'Cut every adjective', text: 'Rewrite the last section using no adjectives at all.', why: 'Forces the nouns and verbs to carry it, which is where the weight belongs.' },
];

const STYLE_MOVES: Idea[] = [
  { label: 'Strip the arrangement', text: 'Name half as many instruments and add "sparse, lots of space".', why: 'Generators overfill by default. Asking for less is asking for clarity.' },
  { label: 'Fix the tempo feel', text: 'Add a feel word next to the BPM — "laid back behind the beat" or "pushing ahead".', why: 'A number sets speed; a feel word sets the groove.' },
  { label: 'Name the room', text: 'Add a space — "close-miked, dry" or "big hall reverb" or "recorded in a kitchen".', why: 'The room is half of what makes a recording sound like anything.' },
  { label: 'One signature sound', text: 'Pick a single instrument to be the thing people recognise, and say so.', why: 'A song with one memorable sound beats one with eight competing ones.' },
  { label: 'Say what to leave out', text: 'Add an explicit exclusion — "no cymbals", "no synth pads", "no backing vocals".', why: 'Telling a generator what not to do is often more effective than what to do.' },
  { label: 'Change the vocal distance', text: 'Try "whispered, right up close" or "shouted from across the room".', why: 'Distance changes the emotion more than the notes do.' },
];

const POLISH_MOVES: Idea[] = [
  { label: 'Check the chorus repeats', text: 'Read the chorus out loud twice. If it changes, make it identical — or make the change deliberate.', why: 'A chorus that drifts stops being a chorus.' },
  { label: 'Find the weak line', text: 'Pick the line you would skip if the song had to be shorter. Cut it or fix it.', why: 'You already know which one it is.' },
  { label: 'Count the syllables', text: 'Compare verse 1 and verse 2 line by line. Match the counts.', why: 'Mismatched verses fight the melody a generator picks.' },
  { label: 'Test the title', text: 'Say the title out loud. Is it in the song? Is it the best line in it?', why: 'The title should be the line worth naming the thing after.' },
  { label: 'Read it without the tags', text: 'Strip the [Verse] and [Chorus] markers and read it straight through.', why: 'Shows you whether it holds together as writing, not just as structure.' },
];

const POOLS: Record<'continue' | 'style' | 'polish', Idea[]> = {
  continue: NEXT_LINE,
  style: STYLE_MOVES,
  polish: POLISH_MOVES,
};

/** Four at a time, rotating on each roll so pressing again gives new ones. */
export function offlineIdeas(mode: 'continue' | 'style' | 'polish', roll: number): Idea[] {
  const pool = POOLS[mode];
  const start = (roll * 4) % pool.length;
  return Array.from({ length: 4 }, (_, i) => pool[(start + i) % pool.length]);
}
