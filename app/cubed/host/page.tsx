/**
 * Cubed³ — a presenter's registration, opened from their invitation.
 *
 * The key is after the `#` in the link, so this page is the same for every
 * presenter and the server never sees which one opened it until the page asks
 * with the key in a header. Kept out of search engines: it is a page for a
 * handful of invited people.
 */

import React from 'react';
import CubedHost from '../../components/CubedHost';

export const metadata = {
  title: 'Cubed³ presenter registration — FutureBox',
  description: 'Register as a Cubed³ presenter on FutureBox.',
  robots: { index: false, follow: false },
};

export default function CubedHostPage(): React.ReactElement {
  return <CubedHost />;
}
