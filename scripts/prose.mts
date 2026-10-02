/**
 * Code with the prose blanked out.
 *
 * ── Why this is its own file ─────────────────────────────────────────────
 *
 * Because a check that greps for a shape finds that shape in the paragraph
 * explaining the shape. `check:ordering` learned this the hard way — its
 * first version called `check:quiz` a fault over a rule that was correct —
 * and `check:whofirst` learned it again ten minutes after being written, by
 * reporting the very comment that documents the bug it was built to catch.
 *
 * Two checks solving the same problem two ways is two chances to solve it
 * wrong, so there is one blanker and both use it.
 *
 * ── What it blanks, and why strings count ────────────────────────────────
 *
 * Block comments, line comments, and the BODIES of string literals. The
 * string bodies matter as much as the comments: a bracket or a `??` inside a
 * quoted sentence is not a bracket or a `??`, and during the ordering hunt two
 * real faults hid behind exactly that — an unbalanced bracket inside a string
 * threw off everything a reader counted after it.
 *
 * Nothing here ever reads what a string SAYS, only the shape of the code
 * around it, so blanking the contents loses nothing.
 *
 * ── Spaces, not deletion ─────────────────────────────────────────────────
 *
 * Every character is replaced by a space and every newline is kept, so the
 * blanked text is the same length and the same shape as the real one. A line
 * number counted off it is the real line number, and an offset into it is a
 * real offset. A blanker that shortened the text would make every report it
 * enabled point at the wrong line.
 *
 * The `[^:]` in the line-comment rule is not decoration: without it the `//`
 * in `https://…` starts a comment and blanks the rest of the line.
 */

const blank = (had: string): string => had.replace(/[^\n]/g, ' ');

/**
 * ── Why this is a scan and not three regular expressions ─────────────────
 *
 * It used to be three: blank `/*…*‌/`, blank `//…`, blank string bodies, in
 * that order. A regular expression cannot know whether the `/` it found is
 * code or the inside of a quoted string, and on 4 October 2026 that cost a
 * hole hundreds of lines long in the most heavily checked file in the repo.
 *
 * The culprit was `accept="video/*"` — an ordinary JSX attribute on every
 * file picker in the app. The `/` and `*` inside those quotes opened a
 * comment, and it stayed open until the next genuine comment close far below.
 * Every marker in between was invisible to every check that read the file,
 * which does not show up as an error: it shows up as a green assertion about
 * code the check never saw.
 *
 * `check:blanker` holds this, and holds it on the real files too — it walks
 * every `data-…` marker in them and fails if blanking hides one.
 *
 * So the text is walked once, left to right, in the order a tokenizer would:
 * whichever of a quote and a comment opener comes FIRST wins, and the other
 * is then just characters inside it. That is the rule the compiler uses, and
 * it is the only rule that gets both cases right.
 */
const scan = (raw: string, keepStrings: boolean): string => {
  const out = raw.split('');
  const size = raw.length;
  /* Spaces, not deletion. Every character becomes a space and every newline
     stays, so the blanked copy is the same length and the same line shape as
     the real one — a line number counted off it is the real line number, and
     an offset into it is a real offset. */
  const wipe = (fromAt: number, toAt: number): void => {
    for (let at = fromAt; at < toAt; at += 1) if (out[at] !== '\n') out[at] = ' ';
  };

  let at = 0;
  while (at < size) {
    const here = raw[at];

    /* An escape pair is two characters and neither is a delimiter. Without
       this, the regex `/\//` reads as a slash, an escaped slash, and then two
       slashes side by side — a line comment that blanks the rest of the
       line. */
    if (here === '\\') {
      at += 2;
      continue;
    }

    if (here === '/' && raw[at + 1] === '*') {
      const closed = raw.indexOf('*/', at + 2);
      /* An unterminated block comment swallows the rest of the file for the
         compiler too, so agreeing with it is the honest reading. */
      const to = closed === -1 ? size : closed + 2;
      wipe(at, to);
      at = to;
      continue;
    }

    /* The `:` guard is not decoration: it keeps a bare `https://…` written in
       JSX text — not in quotes, where the string rule would cover it — from
       blanking the rest of its line. */
    if (here === '/' && raw[at + 1] === '/' && raw[at - 1] !== ':') {
      const line = raw.indexOf('\n', at);
      const to = line === -1 ? size : line;
      wipe(at, to);
      at = to;
      continue;
    }

    if (here === '\'' || here === '"' || here === '`') {
      let walk = at + 1;
      let closed = -1;
      while (walk < size) {
        const next = raw[walk];
        if (next === '\\') { walk += 2; continue; }
        if (next === here) { closed = walk; break; }
        /* A quote cannot run past the end of its line, but a backtick can.
           Stopping at the newline is what keeps an apostrophe in ordinary
           JSX text — "she can't" — from reading as the start of a string. */
        if (here !== '`' && next === '\n') break;
        walk += 1;
      }
      if (closed === -1) {
        /* Not a string after all: one stray quote mark, treated as the text
           it is. */
        at += 1;
        continue;
      }
      if (!keepStrings) wipe(at + 1, closed);
      at = closed + 1;
      continue;
    }

    at += 1;
  }
  return out.join('');
};

export const code = (raw: string): string => scan(raw, false);

/**
 * Comments blanked, strings left whole.
 *
 * `code` above blanks string BODIES too, which is right when a check is
 * reading the shape of the code — a bracket inside a sentence is not a
 * bracket. It is exactly wrong when the thing being looked for IS a string.
 *
 * `check:earsopen` found this the hard way: it searches components for the
 * route paths they call, every one of those is a quoted literal, and its
 * first run reported that `SayItWrong.tsx` does not post to `/api/afrikaans`
 * — while looking at a file whose one `fetch` does precisely that.
 *
 * So there are two blankers and picking between them is a real decision:
 * `code` for the shape of a statement, `withoutComments` for the content of
 * one. Both still leave the prose out, because a route named in a paragraph
 * explaining the route is not a call to it.
 */
export const withoutComments = (raw: string): string => scan(raw, true);
