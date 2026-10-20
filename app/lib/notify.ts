/**
 * Pop-up notices, and the switches that turn each kind off.
 *
 * The owner, 20 October 2026, after two people invited each other to
 * collaborate and neither saw a thing: *"Jy sal 'n pop-up notification moet
 * gooi sodat mense kan accept. Dan ook moet daar 'n verstelling plek in die
 * app wees vir notifications. Notification vir collab, vir videos wat klaar
 * generate. Dan kan mens dit aan sit of afsit. Sit almal sin van die begin
 * af aan."*
 *
 * So a notice is one call — `notify(...)` — from wherever the news is
 * learnt (the collab watch, the video waits), and `Notifier.tsx` draws it.
 * Each kind has a switch on the account screen, and every switch starts on.
 *
 * While the app is open but out of sight (another tab, the phone's home
 * screen with the app still running), the same notice also goes to the
 * phone's own notification bar — if the phone has said yes to that. A phone
 * only asks once and only after a press, which is why `askPhone` is called
 * from a press and never on its own.
 */

export type NoticeKind = 'collab' | 'video';

export interface NoticePrefs {
  /** Somebody asked to work with you, or said yes to you. */
  readonly collab: boolean;
  /** A video you asked for is made. */
  readonly video: boolean;
  /** Also on the phone's own notification bar while the app is out of sight. */
  readonly phone: boolean;
}

/** Every one on, from the start. */
export const NOTICE_DEFAULTS: NoticePrefs = { collab: true, video: true, phone: true };

export interface NoticeAction {
  readonly label: string;
  readonly run: () => unknown;
  /** The one that is filled in; the others are outlined. */
  readonly main?: boolean;
}

export interface Notice {
  /** The same id twice is one notice, not two. */
  readonly id: string;
  readonly kind: NoticeKind;
  readonly title: string;
  /** The dictionary key for the title, where the sender has no `t` of its own. */
  readonly titleKey?: string;
  readonly body?: string;
  readonly actions?: readonly NoticeAction[];
  /** The room this is about, so a notice about the room you are in is not shown over it. */
  readonly room?: string;
  /** Stays until it is answered or closed, rather than going by itself. */
  readonly stay?: boolean;
}

const KEY = 'fb.notify';
const SHOW = 'fb-notice';
const CHANGED = 'fb-noticeprefs';

export function noticePrefs(): NoticePrefs {
  try {
    const kept = JSON.parse(window.localStorage.getItem(KEY) ?? 'null') as Partial<NoticePrefs> | null;
    return { ...NOTICE_DEFAULTS, ...(kept ?? {}) };
  } catch {
    return NOTICE_DEFAULTS;
  }
}

export function setNoticePrefs(next: NoticePrefs): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // A private window keeps nothing; the switch still works for this visit.
  }
  window.dispatchEvent(new CustomEvent(CHANGED, { detail: next }));
}

export function onNoticePrefs(heard: (next: NoticePrefs) => void): () => void {
  const listen = (event: Event): void => heard((event as CustomEvent<NoticePrefs>).detail);
  window.addEventListener(CHANGED, listen);
  return () => window.removeEventListener(CHANGED, listen);
}

/** Show a notice, if its kind is switched on. */
export function notify(notice: Notice): void {
  if (typeof window === 'undefined') return;
  const prefs = noticePrefs();
  if (!prefs[notice.kind]) return;
  window.dispatchEvent(new CustomEvent(SHOW, { detail: notice }));
  if (prefs.phone && document.visibilityState === 'hidden') void toPhone(notice);
}

export function onNotice(heard: (notice: Notice) => void): () => void {
  const listen = (event: Event): void => heard((event as CustomEvent<Notice>).detail);
  window.addEventListener(SHOW, listen);
  return () => window.removeEventListener(SHOW, listen);
}

/** What the phone has said about its notification bar. */
export function phoneAnswer(): NotificationPermission | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

/** Ask the phone once. Call it from a press: phones ignore an ask nobody pressed for. */
export async function askPhone(): Promise<NotificationPermission | 'unsupported'> {
  if (phoneAnswer() === 'unsupported') return 'unsupported';
  try {
    return await Notification.requestPermission();
  } catch {
    return phoneAnswer();
  }
}

/**
 * Through a service worker where there is one to be had: Chrome on Android
 * refuses `new Notification(...)` outright and only shows one a worker
 * hands it. `notify-sw.js` does nothing but that and bring the app forward
 * when the notice is pressed — it does not touch a single request.
 */
async function toPhone(notice: Notice): Promise<void> {
  if (phoneAnswer() !== 'granted') return;
  const options = { body: notice.body, tag: notice.id, icon: '/icon.png' };
  try {
    if ('serviceWorker' in navigator) {
      const worker = await navigator.serviceWorker.register('/notify-sw.js', { scope: '/notify/' });
      await worker.showNotification(notice.title, options);
      return;
    }
  } catch {
    // Fall through to the plain kind, which a desktop browser shows.
  }
  try {
    new Notification(notice.title, options);
  } catch {
    // Nowhere to put it. The pop-up in the app is still waiting.
  }
}
