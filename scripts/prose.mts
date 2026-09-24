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

export const code = (raw: string): string =>
  raw
    .replace(/\/\*[\s\S]*?\*\//g, blank)
    .replace(/(^|[^:])\/\/[^\n]*/g, (had, first: string) => first + ' '.repeat(had.length - first.length))
    .replace(/'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"/g, (had) => had[0] + blank(had.slice(1, -1)) + had[0]);
