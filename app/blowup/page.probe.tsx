'use client';
/**
 * A page that throws while drawing, for audit/whitescreen.mjs.
 *
 * PROBE=1 only.
 *
 * Two throws, chosen by the query string: an ordinary one, and one shaped like
 * a piece of the app that is no longer on the server — which is the case her
 * white screen almost certainly was, and the case that gets a different
 * sentence because a reload is the cure rather than a retry.
 */
import React from 'react';
import { useSearchParams } from 'next/navigation';

function Boom(): React.ReactElement {
  const which = useSearchParams().get('as');
  if (which === 'stale') {
    const error = new Error('Loading chunk 4821 failed.');
    error.name = 'ChunkLoadError';
    throw error;
  }
  throw new Error('the probe asked this page to fall over');
}

export default function BlowUp() {
  return (
    <React.Suspense fallback={<p>…</p>}>
      <Boom />
    </React.Suspense>
  );
}
