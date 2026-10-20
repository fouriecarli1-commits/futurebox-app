'use client';

/**
 * Watches for collaboration news while somebody is signed in, anywhere in
 * the app, and turns it into a pop-up.
 *
 * Until 20 October 2026 a request was only ever seen by somebody who opened
 * Collab Radar after it was sent — the list was read once, when the room
 * opened, and never again. The owner and a friend invited each other with
 * the room open on both phones and neither saw a thing. Now the list is
 * asked for every half minute and whenever the app comes back into sight,
 * and two kinds of news become a notice:
 *
 * - somebody asked you: Accept or No thanks, right on the pop-up;
 * - somebody said yes to you: open the room you now share.
 *
 * What has been shown is written down on the device, so a request is
 * announced once, not every half minute. A yes that happened before this
 * device ever looked is written down quietly rather than announced late.
 */

import { useEffect, useRef } from 'react';
import { useLang } from '../lib/i18n';
import { answer, loadThreads } from '../lib/collab';
import { askPhone, noticePrefs, notify, phoneAnswer } from '../lib/notify';

const ASK_EVERY_MS = 30_000;
const SEEN = 'fb.collab.seen';

function seenOnThisDevice(): { asked: Set<string>; yes: Set<string>; first: boolean } {
  try {
    const kept = JSON.parse(window.localStorage.getItem(SEEN) ?? 'null') as { asked?: string[]; yes?: string[] } | null;
    return { asked: new Set(kept?.asked ?? []), yes: new Set(kept?.yes ?? []), first: kept === null };
  } catch {
    return { asked: new Set(), yes: new Set(), first: true };
  }
}

function keepSeen(asked: Set<string>, yes: Set<string>): void {
  try {
    window.localStorage.setItem(SEEN, JSON.stringify({ asked: [...asked].slice(-200), yes: [...yes].slice(-200) }));
  } catch {
    // Not kept: the worst is the same notice once more on the next visit.
  }
}

export default function CollabWatch({
  signedIn,
  onOpenRoom,
}: {
  readonly signedIn: boolean;
  /** Into Collab Radar, with its list read again. */
  readonly onOpenRoom: () => void;
}): null {
  const { t } = useLang();
  const open = useRef(onOpenRoom);
  open.current = onOpenRoom;
  /* Held, so a language change does not restart the watch. */
  const say = useRef(t);
  say.current = t;

  /* "Sit almal sin van die begin af aan": the phone's notification bar is on
     from the start too, but a phone only asks after a press. So the first
     press anywhere after signing in is the one that asks — once, ever, on
     this device; after that the switch on the account screen is the way. */
  useEffect(() => {
    if (!signedIn) return undefined;
    let done = false;
    try { done = window.localStorage.getItem('fb.notify.asked') === '1'; } catch { /* asked again next time */ }
    if (done || !noticePrefs().phone || phoneAnswer() !== 'default') return undefined;
    const first = (): void => {
      window.removeEventListener('pointerup', first, true);
      try { window.localStorage.setItem('fb.notify.asked', '1'); } catch { /* fine */ }
      void askPhone();
    };
    window.addEventListener('pointerup', first, true);
    return () => window.removeEventListener('pointerup', first, true);
  }, [signedIn]);

  useEffect(() => {
    if (!signedIn) return undefined;
    let live = true;
    const t = (key: string, fallback: string): string => say.current(key, fallback);
    const look = async (): Promise<void> => {
      const { threads, ready } = await loadThreads();
      if (!live || !ready) return;
      const seen = seenOnThisDevice();
      for (const one of threads) {
        const who = one.name || t('notice.someone', 'Somebody');
        if (!one.mine && one.state === 'asked' && !seen.asked.has(one.id)) {
          seen.asked.add(one.id);
          notify({
            id: `collab-ask-${one.id}`,
            kind: 'collab',
            stay: true,
            title: `${who} ${t('notice.collabAsked', 'wants to make something with you')}`,
            body: one.because || undefined,
            actions: [
              {
                label: t('collab.accept', 'Accept'),
                main: true,
                run: async () => {
                  await answer(one.id, true);
                  open.current();
                },
              },
              { label: t('collab.decline', 'No thanks'), run: () => answer(one.id, false) },
            ],
          });
        }
        if (one.mine && one.state === 'accepted' && !seen.yes.has(one.id)) {
          seen.yes.add(one.id);
          if (!seen.first) {
            notify({
              id: `collab-yes-${one.id}`,
              kind: 'collab',
              stay: true,
              title: `${who} ${t('notice.collabYes', 'said yes to working with you')}`,
              body: t('notice.collabYesBody', 'Your room together is open in Collab Radar.'),
              actions: [{ label: t('notice.openRoom', 'Open the room'), main: true, run: () => open.current() }],
            });
          }
        }
      }
      keepSeen(seen.asked, seen.yes);
    };
    void look();
    const timer = window.setInterval(() => void look(), ASK_EVERY_MS);
    const back = (): void => {
      if (document.visibilityState === 'visible') void look();
    };
    document.addEventListener('visibilitychange', back);
    return () => {
      live = false;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', back);
    };
  }, [signedIn]);

  return null;
}
