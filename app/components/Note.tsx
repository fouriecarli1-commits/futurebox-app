'use client';

/**
 * The sentence under a field — on a desk, and behind a mark on a phone.
 *
 * Every room here explains itself, and on a laptop that is right: a line of
 * grey under a control is read once and then stops being noticed. On a phone
 * the same line is three, sometimes five, and thirteen of them stacked is a
 * wall between somebody and the button they came for. Measured at 390 px, the
 * advert desk opened with 4,332 characters and the collab radar with 3,146.
 *
 * So the words do not go anywhere — they move. `Hint` puts them one tap away
 * at the point they are about it, and the phone gets the controls.
 *
 * A component rather than a rule everybody remembers, because there were 66 of
 * these paragraphs written six different ways, and the next one will be
 * written a seventh.
 */

import React from 'react';
import Hint from './Hint';

export default function Note({
  children,
  className = 'text-sm text-zinc-500 leading-snug',
}: {
  children: React.ReactNode;
  /** How it is drawn on a desk. The phone never sees it. */
  className?: string;
}): React.ReactElement {
  return (
    <>
      {/* One line and a mark, not a mark on its own.
 
          The first version drew only the mark on a phone. Where the sentence
          was the whole of its block — "Build a long one" on the video desk,
          and a dozen like it — that left a heading, an empty box, and a
          floating question mark that reads as a broken button. A section with
          nothing in it is worse than a section with too much.
 
          So the phone keeps the first line of it, clipped, with the mark beside
          it. One line instead of five, the mark always attached to something,
          and the whole sentence one tap away. */}
      <span className="sm:hidden flex items-center gap-1 min-w-0">
        <span className="text-xs text-zinc-600 leading-snug truncate min-w-0 flex-1">{children}</span>
        <Hint>{children}</Hint>
      </span>
      <p className={`hidden sm:block ${className}`}>{children}</p>
    </>
  );
}
