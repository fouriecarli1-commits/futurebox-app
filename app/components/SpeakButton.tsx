'use client';

/**
 * The microphone beside a box an AI reads: press, talk, the words go in.
 *
 * Carli, 14 October 2026: *"al ons ai's ook 'n listening tool"*. `lib/speak.ts`
 * carries why it is the browser's recogniser and why it costs nothing.
 *
 * It hands back what was said and the box decides where it goes, so the same
 * button serves a one-line prompt and a long story. Pressed again it stops;
 * it also stops by itself when the person stops talking. Where the browser
 * cannot listen it is not drawn at all — a microphone that does nothing is
 * worse than none.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { useLang } from '../lib/i18n';
import { earLang, earMaker, finalWords, type Ear } from '../lib/speak';

interface Props {
  /** Called with each finished stretch of speech. */
  readonly onHeard: (said: string) => void;
  /** Where it sits; the caller places it on or beside its box. */
  readonly className?: string;
  readonly disabled?: boolean;
}

export default function SpeakButton({ onHeard, className = '', disabled = false }: Props): React.ReactElement | null {
  const { t, lang } = useLang();
  const [can, setCan] = useState(false);
  const [on, setOn] = useState(false);
  const [missed, setMissed] = useState('');
  const ear = useRef<Ear | null>(null);
  const heard = useRef(onHeard);
  heard.current = onHeard;

  /* Asked after the page is on the screen, so the server's page and the
     phone's agree and the button simply appears where it can work. */
  useEffect(() => { setCan(Boolean(earMaker())); }, []);
  useEffect(() => () => { ear.current?.stop(); }, []);

  if (!can) return null;

  const press = (): void => {
    if (on) { ear.current?.stop(); return; }
    const Maker = earMaker();
    if (!Maker) return;
    const one = new Maker();
    one.lang = earLang(lang);
    one.continuous = true;
    one.interimResults = false;
    one.maxAlternatives = 1;
    one.onresult = (got) => {
      const said = finalWords(got);
      if (said) heard.current(said);
    };
    one.onerror = (why) => {
      /* The one refusal worth saying out loud: the microphone is blocked.
         Silence and a cancelled press need no message. */
      if (why?.error === 'not-allowed' || why?.error === 'service-not-allowed') {
        setMissed(t('speak.blocked', 'The microphone is blocked for this site. Allow it in the browser settings and press again.'));
      }
    };
    one.onend = () => { setOn(false); ear.current = null; };
    ear.current = one;
    setMissed('');
    try {
      one.start();
      setOn(true);
    } catch {
      setOn(false);
      ear.current = null;
    }
  };

  return (
    <button
      type="button"
      onClick={press}
      disabled={disabled}
      data-speak
      data-speakon={on ? 'yes' : 'no'}
      /* No aria-pressed: its label already says which press it is ("Say it
         instead of typing" / "Stop listening"), and the rooms' own choice
         buttons are the aria-pressed ones — the cast desk, the shapes, the
         formats — so a microphone among them read as one more choice. */
      aria-label={on ? t('speak.stop', 'Stop listening') : t('speak.start', 'Say it instead of typing')}
      title={missed || (on ? t('speak.stop', 'Stop listening') : t('speak.start', 'Say it instead of typing'))}
      className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition disabled:opacity-40 ${
        on
          ? 'animate-pulse border-rose-400 bg-rose-500/20 text-rose-300'
          : missed
            ? 'border-amber-500/60 bg-surface-100 text-surface-900'
            /* The accent disc with its own dark ink, which is bright in every
               theme and reads in every theme. It was the theme's surface pair,
               and on the green-black theme that is a dark disc with a dark
               microphone — Carli, 18 October 2026: *"Daai record button kan
               mens nie regtig sien nie."* */
            : 'border-emerald-300 bg-emerald-400 text-onAccent shadow-[0_0_10px_rgba(52,211,153,0.45)] hover:bg-emerald-300'
      } ${className}`}
    >
      {missed ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
    </button>
  );
}
