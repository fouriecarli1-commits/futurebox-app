'use client';

/**
 * The switches for the pop-ups, on the account screen.
 *
 * The owner, 20 October 2026: *"Dan ook moet daar 'n verstelling plek in die
 * app wees vir notifications. Notification vir collab, vir videos wat klaar
 * generate. Dan kan mens dit aan sit of afsit. Sit almal sin van die begin
 * af aan."* Every switch starts on (`NOTICE_DEFAULTS`). They are kept on this
 * device, like the theme.
 *
 * The phone's own notification bar needs the phone's yes as well as ours,
 * and a phone only asks after a press — so turning that one on is the press
 * that asks, and the line under it says plainly when the phone has said no.
 */

import React, { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { useLang } from '../lib/i18n';
import {
  askPhone, noticePrefs, NOTICE_DEFAULTS, onNoticePrefs, phoneAnswer, setNoticePrefs, type NoticePrefs,
} from '../lib/notify';

function Toggle({
  on,
  label,
  what,
  onFlip,
  name,
}: {
  readonly on: boolean;
  readonly label: string;
  readonly what: string;
  readonly onFlip: () => void;
  readonly name: string;
}): React.ReactElement {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      data-noticeswitch={name}
      onClick={onFlip}
      className="flex min-h-[52px] w-full items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-left"
    >
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold text-white">{label}</span>
        <span className="block text-xs leading-snug text-zinc-400">{what}</span>
      </span>
      <span
        aria-hidden
        className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors ${on ? 'bg-emerald-500' : 'bg-zinc-700'}`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full shadow transition-all ${on ? 'left-[22px]' : 'left-0.5'}`}
          /* White on every theme: a light theme repaints `bg-white`. */
          style={{ background: '#ffffff' }}
        />
      </span>
    </button>
  );
}

export default function NoticeSettings(): React.ReactElement {
  const { t } = useLang();
  const [prefs, setPrefs] = useState<NoticePrefs>(NOTICE_DEFAULTS);
  const [phone, setPhone] = useState<ReturnType<typeof phoneAnswer>>('default');

  useEffect(() => {
    setPrefs(noticePrefs());
    setPhone(phoneAnswer());
    return onNoticePrefs(setPrefs);
  }, []);

  const flip = (key: keyof NoticePrefs): void => {
    const next = { ...prefs, [key]: !prefs[key] };
    setNoticePrefs(next);
    setPrefs(next);
    if (key === 'phone' && next.phone && phoneAnswer() === 'default') {
      void askPhone().then(setPhone);
    }
  };

  return (
    <section className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5" data-noticesettings>
      <h2 className="flex items-center gap-2 text-base font-extrabold text-white">
        <Bell className="h-4 w-4 text-emerald-400" />
        {t('notice.settings', 'Notifications')}
      </h2>
      <Toggle
        name="collab"
        on={prefs.collab}
        onFlip={() => flip('collab')}
        label={t('notice.collabLabel', 'Collaboration')}
        what={t('notice.collabWhat', 'When somebody asks to work with you, so you can accept straight away, and when somebody says yes to you.')}
      />
      <Toggle
        name="video"
        on={prefs.video}
        onFlip={() => flip('video')}
        label={t('notice.videoLabel', 'Videos that are ready')}
        what={t('notice.videoWhat', 'When a video you asked for has finished being made, wherever you are in the app.')}
      />
      <Toggle
        name="phone"
        on={prefs.phone}
        onFlip={() => flip('phone')}
        label={t('notice.phoneLabel', 'Also on my phone’s notification bar')}
        what={t('notice.phoneWhat', 'While the app is open but out of sight. Your phone asks once whether FutureBox may do this.')}
      />
      {prefs.phone && phone === 'denied' ? (
        <p className="text-xs leading-snug text-amber-300">
          {t('notice.phoneDenied', 'Your phone has said no to notifications from FutureBox. You can change that in the phone’s settings for this app or browser.')}
        </p>
      ) : null}
      {prefs.phone && phone === 'default' ? (
        <button
          type="button"
          data-noticeallow
          onClick={() => void askPhone().then(setPhone)}
          className="min-h-[44px] w-full rounded-xl border border-emerald-500/50 bg-emerald-500/10 px-4 text-sm font-bold text-emerald-300"
        >
          {t('notice.phoneAllow', 'Allow on this phone')}
        </button>
      ) : null}
    </section>
  );
}
