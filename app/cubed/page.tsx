/**
 * Cubed — the room.
 *
 * A server component around a client one, like `/help` and `/blog`: a guest
 * reading this is almost always arriving from a link, signed out, and the
 * page has to say what it is without running the studio.
 *
 * The body is a client component because the words are in two languages and
 * the language is the reader's own choice. See `components/BlogBody.tsx` for
 * the same decision and why.
 */

import React from 'react';
import CubedRoom from '../components/CubedRoom';

export const metadata = {
  title: 'Cubed — FutureBox',
  description:
    'Three classes to a masterclass: what it is, how it is done, and what goes wrong. '
    + 'Taught by people who have done it, with 60% of what a series earns going to the guest.',
};

export default function Cubed(): React.ReactElement {
  return <CubedRoom />;
}
