'use client';

/**
 * Voice — the screen somebody opens when they want to hear themselves.
 *
 * It used to say "Neither is connected yet, so this is not switched on". That
 * was true when it was written and stopped being true twice over: you can
 * clone your voice and have it read a script, and you can sing over a backing
 * and have the two mixed. Both worked while this screen said they did not,
 * which is worse than the feature being missing — somebody looking for it was
 * told, by the app, that it does not exist.
 *
 * The cloning half lives here now, where it belongs. It was only ever inside
 * the podcast studio because that is where it was built, and a voice is not a
 * podcast feature.
 *
 * The singing half stays with the song, and this screen says so rather than
 * offering a button that cannot work: recording a vocal needs a backing track
 * to sing over, which means it needs a song in hand.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { ArrowUpRight, Mic, Music } from 'lucide-react';
import VoiceLab, { type VoiceState } from './VoiceLab';
import { accessToken } from '../lib/cloud';
import { downloadBlob } from '../lib/library';
import { useLang } from '../lib/i18n';

export default function VoiceScreen({
  onUpgrade,
  onGoToMake,
}: {
  onUpgrade: () => void;
  onGoToMake: () => void;
}): React.ReactElement {
  const { t } = useLang();
  const [state, setState] = useState<VoiceState>({ configured: false, mine: [], stock: [] });

  const load = useCallback(async () => {
    try {
      const token = await accessToken();
      const response = await fetch('/api/voice', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (response.ok) setState((await response.json()) as VoiceState);
    } catch {
      // Left as it was. The lab renders its own "needs a paid plan" and
      // "not switched on" states from what it has.
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-4">
      <div>
        <p className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
          <Mic className="w-6 h-6 text-emerald-400" />
          {t('voice.screen', 'Voice')}
        </p>
        <p className="text-base text-zinc-400 pt-1 max-w-2xl leading-relaxed">
          {t('voice.screenSub', 'Clone your own voice and have it read a script. To sing on a track, make the song first — the recording goes over the backing, so it needs one.')}
        </p>
      </div>

      <VoiceLab
        state={state}
        onChanged={load}
        // There is no episode to attach a reading to here, so the reading is
        // handed over as a file rather than nowhere.
        onAudio={(audio) => downloadBlob(audio, 'reading.mp3')}
        onUpgrade={onUpgrade}
      />

      {/* Where the other half is, said plainly instead of duplicated here. */}
      <button
        type="button"
        onClick={onGoToMake}
        className="w-full rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 text-left hover:border-emerald-500/50 transition-all flex items-start gap-3"
      >
        <Music className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
        <span className="min-w-0 flex-1">
          <span className="block text-base font-bold text-white">{t('voice.sing', 'Sing on a track yourself')}</span>
          <span className="block text-sm text-zinc-500 leading-snug">
            {t('voice.singNote', 'In Make a song: tick "I will sing it myself" for a backing with no vocal, then press "Sing over it" on the track. The take is mixed with the music and kept as its own song.')}
          </span>
        </span>
        <ArrowUpRight className="w-4 h-4 text-zinc-600 flex-shrink-0 mt-1" />
      </button>
    </div>
  );
}
