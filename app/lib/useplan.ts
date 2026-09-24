'use client';

/**
 * Which plan this browser is on, asked by whoever needs to know.
 *
 * ── Why a hook and not a prop ────────────────────────────────────────────
 *
 * `userPlan` lives in `page.tsx` and the rooms that need it are three levels
 * down and mounted from two different parents. The Pro Booth is the case
 * that forced this: its door is in `VocalBooth`, which is mounted by both
 * `Booth` and `MakeMusic`, neither of which has any other reason to know
 * what somebody pays.
 *
 * Threading a prop through four files so one button can ask one question is
 * how a prop ends up passed everywhere and read nowhere. `Presenter` already
 * asks the server about itself for the same reason.
 *
 * ── It is the same answer page.tsx gets ──────────────────────────────────
 *
 * Both call `loadOwned()`, so both inherit its rule: with no Supabase
 * configured it answers `label`, because with no accounts nothing in this app
 * is metered — the same rule `charge()` and `paidRoom()` follow on the
 * server. A second way of working out the tier would eventually disagree
 * with the first, and the disagreement would be about money.
 *
 * ── And it is not a lock ─────────────────────────────────────────────────
 *
 * Nothing here is security. A hidden button is not a closed door, and every
 * room this gates is one whose expensive half already asks the server for
 * itself. This decides which screen to draw, which is the honest job of a
 * thing that lives in a browser.
 */

import { useEffect, useState } from 'react';
import { loadOwned } from './purchases';
import type { Plan } from './entitlements';

/**
 * Free until the answer arrives.
 *
 * Deliberately the shut end rather than the open one: a room that flashes
 * open and then closes has shown somebody something and taken it away, which
 * is worse than a door that opens a moment late.
 */
export function usePlan(): Plan {
  const [plan, setPlan] = useState<Plan>('free');
  useEffect(() => {
    let live = true;
    void loadOwned().then((owned) => {
      if (live) setPlan(owned.tier);
    });
    return () => {
      live = false;
    };
  }, []);
  return plan;
}
