/**
 * The guide — every room, what a press costs, and the words.
 *
 * A server component around a client one, for the same reason /help is:
 * somebody arriving from a search gets the page and the address without
 * running anything. The content is `components/Guide.tsx`, which reads the
 * rooms off `lib/surfaces.ts` and the prices off `lib/credits.ts`.
 */

import React from 'react';
import Guide from '../components/Guide';

export const metadata = {
  title: 'The guide — FutureBox',
  description:
    'Every room in FutureBox Studio, what comes out of it, what a press costs in credits, and the words the rooms use.',
};

export default function GuidePage(): React.ReactElement {
  return (
    <main className="min-h-screen bg-zinc-950">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <Guide />
      </div>
    </main>
  );
}
