'use client';

/**
 * The grown-up's way back in, with no button a child would press.
 *
 * `GrownUpHold` wraps something already on the screen — the FUTUREBOX name,
 * the clock on the time-up page — and opens the code pad after it has been
 * held for three seconds. `CodePad` asks for the four numbers. `CodeChooser`
 * sits on the grown-up's page and is where the numbers are chosen. Why there
 * is no button is in `lib/kidslock.ts`.
 */
import React, { useEffect, useRef, useState } from 'react';
import { useLang } from '../lib/i18n';
import { useBackLayer } from '../lib/backstack';
import { CODE_LENGTH, HOLD_MS, codeIsValid, codeMatches, hasCode, setCode } from '../lib/kidslock';

export function GrownUpHold({
  onHeld,
  children,
  className = '',
}: {
  readonly onHeld: () => void;
  readonly children: React.ReactNode;
  readonly className?: string;
}): React.ReactElement {
  const timer = useRef<number | null>(null);
  const stop = (): void => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
  };
  useEffect(() => stop, []);
  return (
    <div
      data-kidsgrownup
      className={`select-none ${className}`}
      style={{ WebkitTouchCallout: 'none' }}
      onPointerDown={() => { stop(); timer.current = window.setTimeout(() => { timer.current = null; onHeld(); }, HOLD_MS); }}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      onContextMenu={(event) => event.preventDefault()}
    >
      {children}
    </div>
  );
}

export function CodePad({
  onPass,
  onClose,
}: {
  readonly onPass: () => void;
  readonly onClose: () => void;
}): React.ReactElement {
  const { t } = useLang();
  /* The phone's Back closes the pad, as it closes every layer over the app. */
  useBackLayer(true, onClose);
  const [typed, setTyped] = useState('');
  const [wrong, setWrong] = useState(false);

  const press = (digit: string): void => {
    if (typed.length >= CODE_LENGTH) return;
    const next = typed + digit;
    setTyped(next);
    setWrong(false);
    if (next.length === CODE_LENGTH) {
      void codeMatches(next).then((right) => {
        if (right) { onPass(); return; }
        setWrong(true);
        setTyped('');
      });
    }
  };

  return (
    <div
      data-kidscodepad
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-scrim/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xs space-y-4 rounded-3xl border-2 border-cyan-400/60 bg-surface-50 p-5 text-center"
        onClick={(event) => event.stopPropagation()}
      >
        <p className="text-base font-black text-surface-950">{t('kids.codeAsk', 'Grown-up code')}</p>
        <div className="flex justify-center gap-2" aria-live="polite">
          {Array.from({ length: CODE_LENGTH }, (_, at) => (
            <span
              key={at}
              className={`h-4 w-4 rounded-full border-2 ${at < typed.length ? 'border-cyan-300 bg-cyan-300' : 'border-surface-400'}`}
            />
          ))}
        </div>
        {wrong && <p data-kidscodewrong className="text-sm font-bold text-amber-300">{t('kids.codeWrong', 'Not that one.')}</p>}
        <div className="grid grid-cols-3 gap-2">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'].map((key, at) => (
            key === ''
              ? <span key={at} />
              : (
                <button
                  key={at}
                  type="button"
                  data-kidscodekey={key}
                  aria-label={key === '⌫' ? t('kids.codeBack', 'Delete') : key}
                  onClick={() => (key === '⌫' ? setTyped(typed.slice(0, -1)) : press(key))}
                  className="min-h-[52px] rounded-2xl border border-surface-300 bg-surface-100 text-xl font-black text-surface-950"
                >
                  {key}
                </button>
              )
          ))}
        </div>
        <p className="text-xs leading-relaxed text-surface-700">
          {t('kids.codeForgot', 'Forgot it? Sign out of FutureBox and sign in again from the kids room, and you can choose a new one.')}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="min-h-[44px] w-full rounded-2xl border border-surface-300 text-sm font-bold text-surface-800"
        >
          {t('kids.codeClose', 'Back to the music')}
        </button>
      </div>
    </div>
  );
}

/** On the grown-up's page: choose the four numbers, or change them. */
export function CodeChooser(): React.ReactElement {
  const { t } = useLang();
  const [have, setHave] = useState(false);
  const [open, setOpen] = useState(false);
  const [first, setFirst] = useState('');
  const [again, setAgain] = useState('');
  const [said, setSaid] = useState('');
  useEffect(() => { setHave(hasCode()); }, []);

  const keep = async (): Promise<void> => {
    if (!codeIsValid(first)) { setSaid(t('kids.codeFour', 'Four numbers, please.')); return; }
    if (first !== again) { setSaid(t('kids.codeSame', 'The two do not match.')); return; }
    if (await setCode(first)) {
      setHave(true);
      setOpen(false);
      setFirst('');
      setAgain('');
      setSaid(t('kids.codeKept', 'Kept. Only you can open this page now.'));
    }
  };

  const field = (value: string, set: (next: string) => void, label: string, id: string): React.ReactElement => (
    <label className="block text-sm font-bold text-surface-900" htmlFor={id}>
      {label}
      <input
        id={id}
        type="password"
        inputMode="numeric"
        autoComplete="off"
        maxLength={CODE_LENGTH}
        value={value}
        onChange={(event) => set(event.target.value.replace(/\D/g, '').slice(0, CODE_LENGTH))}
        className="mt-1 block min-h-[44px] w-full rounded-xl border border-surface-300 bg-surface-100 px-3 text-lg tracking-[0.5em] text-surface-950"
      />
    </label>
  );

  return (
    <section data-kidscodechooser className="mx-auto w-full max-w-3xl space-y-2 px-5">
      <div className="space-y-2 rounded-3xl border-2 border-amber-300/60 bg-surface-50/90 p-4">
        <p className="text-base font-black text-surface-950">
          🔒 {have ? t('kids.codeHave', 'Your grown-up code is set') : t('kids.codeChoose', 'Choose a grown-up code')}
        </p>
        <p className="text-sm leading-relaxed text-surface-700">
          {t('kids.codeHow', 'There is no grown-up button in the kids room, so a child cannot change any of this. To come back to this page, hold the FUTUREBOX name at the top of the kids room for three seconds and type your code.')}
        </p>
        {(!have || open) ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {field(first, setFirst, t('kids.codeNew', 'Four numbers'), 'kids-code-new')}
            {field(again, setAgain, t('kids.codeAgain', 'The same four again'), 'kids-code-again')}
            <button
              type="button"
              data-kidscodekeep
              onClick={() => { void keep(); }}
              className="min-h-[44px] rounded-2xl bg-amber-300 px-4 text-sm font-black text-onAccent sm:col-span-2"
            >
              {t('kids.codeKeep', 'Keep this code')}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="min-h-[44px] rounded-2xl border border-surface-300 px-4 text-sm font-bold text-surface-800"
          >
            {t('kids.codeChange', 'Change the code')}
          </button>
        )}
        {said && <p data-kidscodesaid className="text-sm font-bold text-surface-900">{said}</p>}
      </div>
    </section>
  );
}
