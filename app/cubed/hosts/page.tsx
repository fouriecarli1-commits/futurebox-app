/**
 * Cubed³ — the owner's presenter inbox.
 *
 * Invitations go out from here and registrations land here. Owner-only: the
 * route behind it answers 404 to anybody else, and the page is kept out of
 * search engines.
 */

import React from 'react';
import CubedHosts from '../../components/CubedHosts';

export const metadata = {
  title: 'Cubed³ presenters — FutureBox',
  robots: { index: false, follow: false },
};

export default function CubedHostsPage(): React.ReactElement {
  return <CubedHosts />;
}
