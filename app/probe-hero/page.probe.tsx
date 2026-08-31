'use client';
/**
 * The landing hero on its own, for `.probe/hero.mjs`.
 *
 * PROBE=1 only. The check photographs it in both languages and on a phone, and
 * asserts the one thing a screenshot cannot: that nothing runs off the side.
 * Afrikaans is the case that catches it — the same sentence is reliably longer,
 * and a heading that fits in English can push a page sideways in Afrikaans.
 */
import React from 'react';
import Landing from '../components/Landing';

export default function P(): React.ReactElement {
  return <Landing onStart={() => {}} onGoogle={() => {}} />;
}
