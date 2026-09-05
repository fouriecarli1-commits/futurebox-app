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
      <span className="sm:hidden inline-flex align-middle">
        <Hint>{children}</Hint>
      </span>
      <p className={`hidden sm:block ${className}`}>{children}</p>
    </>
  );
}
