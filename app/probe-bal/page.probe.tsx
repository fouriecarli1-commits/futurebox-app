'use client';
/** The balance chip on its own, for `.probe/balance.mjs`. Never in a build. */
import React from 'react';
import Balance from '../components/Balance';
export default function P(): React.ReactElement {
  return <div className="p-6"><Balance reloadKey={0} onTopUp={() => {}} /></div>;
}
