/**
 * The bench where Google draws the mark. The operator's, not a room.
 *
 * Not linked from anywhere: it spends her Google budget and it is a tool for
 * one person on the days she is choosing a logo. The route behind it refuses
 * anybody who is not her, so the address being guessable costs nothing.
 */

import React from 'react';
import MarkLab from '../../components/MarkLab';

export const metadata = {
  title: 'Cubed mark — FutureBox',
  robots: { index: false, follow: false },
};

export default function Page(): React.ReactElement {
  return <MarkLab />;
}
