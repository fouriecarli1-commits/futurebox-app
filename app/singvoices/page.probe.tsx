'use client';
/**
 * The singing-voice picker, for audit/singvoices.mjs.
 *
 * PROBE=1 only. A mixture on purpose: one trained voice with no picture, two
 * catalogue voices with one, and one whose picture will not load. A picker
 * where every row is the same case cannot show the thing that goes wrong with
 * a list of pictures, which is that the rows stop being the same shape.
 */
import React, { useState } from 'react';
import SingVoices from '@/app/components/SingVoices';

/* The picture is not an address here either: the row asks
   `/api/kits/face?model=<id>`, which `audit/singvoices.mjs` answers — with a
   one-pixel PNG for two of them and a 404 for the fourth, which is how the
   fall-back to a letter gets exercised. */
const MINE = [{ id: 'm1', name: 'My own voice', demo: null, tags: ['Singing'], hasPicture: false }];

const STOCK = [
  { id: 's1', name: 'Male Pop', demo: null, tags: ['Singing', 'Chest Voice'], hasPicture: true },
  { id: 's2', name: 'Male Pop 2', demo: null, tags: ['Singing'], hasPicture: true },
  { id: 's3', name: 'Opera Tenor', demo: null, tags: ['Opera'], hasPicture: false },
  /* Says it has one, and the route will not give it. The row must fall back
     to the letter rather than showing a broken image. */
  { id: 's4', name: 'Broken Picture', demo: null, tags: [], hasPicture: true },
];

export default function SingVoicesProbe(): React.ReactElement {
  const [value, setValue] = useState('s1');
  return (
    <div className="min-h-screen bg-zinc-950 p-4">
      <div data-probe="picker">
        <SingVoices mine={MINE} stock={STOCK} value={value} onChange={setValue} idPrefix="probe" />
      </div>
    </div>
  );
}
