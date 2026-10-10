/**
 * The bench where Google draws the children's pictures. The operator's.
 *
 * Not linked from anywhere: every press spends her Google budget on
 * twenty-three pictures, and it is a tool for the days she is making the
 * room's artwork. The route behind it refuses anybody who is not her, so the
 * address being guessable costs nothing.
 */

import React from 'react';
import KidsArt from '../../components/KidsArt';

export const metadata = {
  title: 'Children’s pictures — FutureBox',
  robots: { index: false, follow: false },
};

export default function Page(): React.ReactElement {
  return <KidsArt />;
}
