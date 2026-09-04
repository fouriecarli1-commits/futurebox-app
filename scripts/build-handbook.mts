/**
 * The terms and the privacy policy, as plain text the help assistant can read.
 *
 * ── Why this is generated and not written ────────────────────────────────
 *
 * The assistant in the help panel answers questions about the policy. It can
 * only do that honestly if what it reads is the policy — the same words on
 * /terms and /privacy, not a summary somebody wrote alongside them once.
 *
 * A hand-kept copy drifts. Not immediately, and not visibly: the terms get a
 * paragraph about refunds, the copy does not, and six months later the
 * assistant is confidently telling somebody the old rule. That is worse than
 * having no assistant, because a wrong answer about money or ownership is one
 * you can be held to.
 *
 * So the pages stay the single source and this reads them. `npm run handbook`
 * regenerates; `npm run check:handbook` regenerates into memory and fails if
 * the committed file differs, which turns drift into a red build rather than
 * a wrong answer nobody sees.
 *
 * ── Why a build step and not reading the files at request time ───────────
 *
 * On Vercel a route only ships the files the tracer can prove it needs, and
 * `readFileSync` on a path built at runtime is not provable. It would work
 * locally and return nothing in production, which is the worst way for a
 * thing to break.
 *
 * ── What it does to the markup ───────────────────────────────────────────
 *
 * The pages are deliberately plain: `<Section title="…">` around `<p>` and
 * `<li>`, with `<strong>` for emphasis. Tags are dropped, entities decoded,
 * list items prefixed so the shape survives, and `{CONTACT}` left as a
 * `{{contact}}` token because the real address depends on the environment.
 * Anything richer than that would need a real parser, and the check below
 * fails loudly if a page ever grows something this cannot read.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const PAGES = [
  { name: 'TERMS', title: 'Terms', path: 'app/terms/page.tsx' },
  { name: 'PRIVACY', title: 'Privacy policy', path: 'app/privacy/page.tsx' },
] as const;

const OUT = 'app/lib/server/handbook.generated.ts';

const ENTITIES: Record<string, string> = {
  '&apos;': "'",
  '&rsquo;': '’',
  '&lsquo;': '‘',
  '&ldquo;': '“',
  '&rdquo;': '”',
  '&mdash;': '—',
  '&ndash;': '–',
  '&hellip;': '…',
  '&nbsp;': ' ',
  '&quot;': '"',
  '&amp;': '&',
};

/** Tags out, entities in, whitespace collapsed. */
function plain(html: string): string {
  let text = html.replace(/<[^>]*>/g, '');
  for (const [entity, char] of Object.entries(ENTITIES)) text = text.split(entity).join(char);
  // A dropped <Link> leaves the space that sat before its closing tag, so
  // "the privacy policy ," is what comes out. Punctuation pulled back on.
  return text
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .trim();
}

/**
 * JSX expressions, resolved or refused.
 *
 * `{' '}` is a space the author wrote to survive formatting. `{CONTACT}` and
 * `{UPDATED}` are the two constants these pages interpolate. Anything else is
 * a value this cannot see, and guessing at it would put a made-up sentence in
 * front of the assistant — so it throws instead.
 */
function expressions(source: string, updated: string): string {
  return source.replace(/\{([^{}]*)\}/g, (whole, inner: string) => {
    const code = inner.trim();
    if (/^['"`]\s*['"`]$/.test(code)) return ' ';
    if (code === 'CONTACT' || code === 'CONTACT_EMAIL') return '{{contact}}';
    if (code === 'UPDATED') return updated;
    if (code === 'children' || code === 'title') return whole;
    throw new Error(
      `handbook: cannot read the expression {${code}} — add it to expressions() in scripts/build-handbook.mts`,
    );
  });
}

function readPage(path: string): { updated: string; sections: { title: string; lines: string[] }[] } {
  const raw = readFileSync(path, 'utf8');
  const updated = /const UPDATED = '([^']+)'/.exec(raw)?.[1] ?? '';
  if (!updated) throw new Error(`handbook: no UPDATED date in ${path}`);

  // The component only. Everything above `export default` is imports and the
  // file's own comment about itself, which is not policy.
  const body = raw.slice(raw.indexOf('export default'));
  const resolved = expressions(body, updated);

  const sections: { title: string; lines: string[] }[] = [];
  const opens = [...resolved.matchAll(/<Section title="([^"]+)">/g)];
  for (const open of opens) {
    const from = (open.index ?? 0) + open[0].length;
    const to = resolved.indexOf('</Section>', from);
    if (to < 0) throw new Error(`handbook: unclosed <Section> in ${path}`);
    const inside = resolved.slice(from, to);

    const lines: string[] = [];
    for (const block of inside.matchAll(/<(p|li)\b[^>]*>([\s\S]*?)<\/\1>/g)) {
      const text = plain(block[2]);
      if (text) lines.push(block[1] === 'li' ? `- ${text}` : text);
    }
    if (!lines.length) throw new Error(`handbook: section "${open[1]}" in ${path} read as empty`);
    sections.push({ title: open[1], lines });
  }
  if (sections.length < 3) throw new Error(`handbook: only ${sections.length} sections found in ${path}`);
  return { updated, sections };
}

export function handbook(): string {
  const parts: string[] = [];
  for (const page of PAGES) {
    const { updated, sections } = readPage(page.path);
    parts.push(`# ${page.title} (last updated ${updated})`);
    for (const section of sections) {
      parts.push(`## ${section.title}\n${section.lines.join('\n')}`);
    }
  }
  return parts.join('\n\n');
}

export function fileFor(text: string): string {
  return `/* GENERATED by scripts/build-handbook.mts — do not edit.

   The words on /terms and /privacy, as plain text, so the help assistant
   answers policy questions out of the policy itself. Change the pages and run
   \`npm run handbook\`; \`npm run check:handbook\` fails the build if this is
   older than they are. */

export const HANDBOOK = ${JSON.stringify(text)};
`;
}

// Written only when run directly. `check-handbook.mts` imports the two
// functions above and compares rather than writing.
if (process.argv[1] && process.argv[1].endsWith('build-handbook.mts')) {
  const text = handbook();
  writeFileSync(OUT, fileFor(text));
  console.log(`handbook — ${text.split('\n').length} lines from ${PAGES.length} pages, written to ${OUT}`);
}
