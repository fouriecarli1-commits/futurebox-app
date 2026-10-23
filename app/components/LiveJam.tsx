'use client';

/**
 * The live jam room — Google's second mode on the Live page, 13 October 2026.
 *
 * *"Kyk na die ekstra funksie, 'n live jam room."*
 *
 * What is real here:
 *   the stage     everybody in the jam room, each as the animated character
 *                 they picked (`JamStage`, `JamCharacter`) — never a face
 *   the mic       your microphone, after one press (a browser will not open
 *                 it without one); never the camera
 *   the waveform  your microphone, drawn live through an AnalyserNode
 *   the pads      four sounds made by this browser's own oscillators —
 *                 kick, snare, hi-hat, riser — on press, with no file fetched
 *   the clock     how long you have been on stage
 *
 * ── Behind a character, not a camera ─────────────────────────────────────
 *
 * The owner, 22 October 2026: *"Daar moet templates wees van animated
 * characters dat iemand heeltemal agter templates skuil."* The stage used to
 * open the camera and show it on your own tile. It does not any more: going
 * on stage opens the microphone alone, and the tile is your character, moving
 * to the room's bus — the pads and the looper, which play through it — and to
 * your microphone. The choice of character is kept on this device and sent
 * to the room as two words; nothing that could show a person is asked for,
 * drawn or sent.
 *
 * What the page drew that is not here, said on the screen rather than
 * faked: 4 213 viewers, 24-bit 96 kHz low-latency anything, SuperChat and a
 * tip jar in dollars with no payment behind them, and a chat — the Live
 * room's box is deliberately not a chat, by her own rule.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { useLang } from '../lib/i18n';
import { hit, type Pad } from '../lib/jampads';
import { DEFAULT_LOOK, readLook, rmsOf, saveLook, toLevel, type Look } from '../lib/jamcharacters';
import { DEFAULT_BPM } from '../lib/looper';
import JamLooper from './JamLooper';
import JamStage from './JamStage';


const PADS: ReadonlyArray<{ id: Pad; word: string; fallback: string; look: string }> = [
  { id: 'kick', word: 'live.padKick', fallback: 'KICK', look: 'bg-rose-500/20 border-rose-500/40 text-rose-300 hover:bg-rose-500/30' },
  { id: 'snare', word: 'live.padSnare', fallback: 'SNARE', look: 'bg-amber-500/20 border-amber-500/40 text-amber-300 hover:bg-amber-500/30' },
  { id: 'hihat', word: 'live.padHihat', fallback: 'HI-HAT', look: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30' },
  { id: 'riser', word: 'live.padRiser', fallback: 'RISER', look: 'bg-violet-500/20 border-violet-500/40 text-violet-300 hover:bg-violet-500/30' },
];

function clock(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function LiveJam({ here, name, onToBooth }: {
  readonly here: number;
  readonly name: string;
  /** Opens the Booth, for the looper's "Send to ProBooth". */
  readonly onToBooth?: () => void;
}): React.ReactElement {
  const { t } = useLang();
  const [onStage, setOnStage] = useState(false);
  const [refused, setRefused] = useState('');
  const [since, setSince] = useState<number | null>(null);
  const [tick, setTick] = useState(0);
  const wave = useRef<HTMLCanvasElement | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const audio = useRef<AudioContext | null>(null);
  const analyser = useRef<AnalyserNode | null>(null);
  /* The microphone, as state, for the looper's voice layers. */
  const [mic, setMic] = useState<MediaStream | null>(null);
  /* Set by the looper: a pad pressed while it is recording is kept. */
  const padTap = useRef<((pad: Pad) => void) | null>(null);

  /* Your character: the default on the server's render, this device's own
     choice as soon as the page is in the browser. */
  const [look, setLook] = useState<Look>(DEFAULT_LOOK);
  useEffect(() => { setLook(readLook()); }, []);
  const pickLook = useCallback((next: Look) => { setLook(next); saveLook(next); }, []);

  /* What the looper is doing, for the stage: its beat, and a drop each time
     it gains a layer. */
  const [loop, setLoop] = useState({ playing: false, bpm: DEFAULT_BPM, layers: 0 });
  const [drops, setDrops] = useState(0);
  const layersWere = useRef(0);
  const onLoopState = useCallback((next: { playing: boolean; bpm: number; layers: number }) => {
    if (next.layers > layersWere.current) setDrops((n) => n + 1);
    layersWere.current = next.layers;
    setLoop(next);
  }, []);

  const ctx = useCallback((): AudioContext => {
    if (!audio.current) audio.current = new AudioContext();
    if (audio.current.state === 'suspended') void audio.current.resume();
    return audio.current;
  }, []);

  /* ── The room's bus ───────────────────────────────────────────────────
     The pads and the looper play through one gain on their way to the
     speakers, and an analyser listens to it: that is what your character
     moves to. Made with the AudioContext, on the first press. */
  const bus = useRef<GainNode | null>(null);
  const busEar = useRef<AnalyserNode | null>(null);
  const out = useCallback((): AudioNode => {
    const context = ctx();
    if (!bus.current) {
      bus.current = context.createGain();
      bus.current.connect(context.destination);
      busEar.current = context.createAnalyser();
      busEar.current.fftSize = 512;
      bus.current.connect(busEar.current);
    }
    return bus.current;
  }, [ctx]);

  /* How loud what you are making is, now: the louder of the bus and the
     microphone. Read by the stage every frame; costs two small copies. */
  const busBytes = useRef(new Uint8Array(512));
  const micBytes = useRef(new Uint8Array(1024));
  const heard = useCallback((): number => {
    let level = 0;
    if (busEar.current) {
      busEar.current.getByteTimeDomainData(busBytes.current);
      level = toLevel(rmsOf(busBytes.current));
    }
    if (analyser.current) {
      analyser.current.getByteTimeDomainData(micBytes.current);
      level = Math.max(level, toLevel(rmsOf(micBytes.current)));
    }
    return level;
  }, []);

  const leave = useCallback(() => {
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
    analyser.current = null;
    setMic(null);
    setOnStage(false);
    setSince(null);
  }, []);

  /* Going on stage opens the microphone and nothing else. The camera is
     never asked for: the room sees your character, not you. */
  const enter = useCallback(async () => {
    setRefused('');
    try {
      const got = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
      stream.current = got;
      setMic(got);
      const context = ctx();
      const source = context.createMediaStreamSource(got);
      const node = context.createAnalyser();
      node.fftSize = 1024;
      source.connect(node);
      analyser.current = node;
      setOnStage(true);
      setSince(Date.now());
    } catch {
      setRefused(t('live.micRefused', 'The microphone could not be opened. Allow it in the browser and press again.'));
    }
  }, [ctx, t]);

  /* The clock. */
  useEffect(() => {
    if (since === null) return undefined;
    const timer = window.setInterval(() => setTick((n) => n + 1), 1000);
    return () => window.clearInterval(timer);
  }, [since]);

  /* The waveform: your own microphone, or a flat line when you are off stage. */
  useEffect(() => {
    const art = wave.current;
    const painter = art?.getContext('2d');
    if (!art || !painter) return undefined;
    let frame = 0;
    const data = new Uint8Array(1024);
    const draw = (): void => {
      const w = (art.width = art.clientWidth);
      const h = (art.height = art.clientHeight);
      painter.clearRect(0, 0, w, h);
      painter.strokeStyle = onStage ? '#34d399' : 'rgba(255,255,255,0.15)';
      painter.lineWidth = 2;
      painter.beginPath();
      if (analyser.current) {
        analyser.current.getByteTimeDomainData(data);
        for (let i = 0; i < data.length; i += 1) {
          const x = (i / data.length) * w;
          const y = (data[i] / 255) * h;
          if (i === 0) painter.moveTo(x, y); else painter.lineTo(x, y);
        }
      } else {
        painter.moveTo(0, h / 2); painter.lineTo(w, h / 2);
      }
      painter.stroke();
      frame = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(frame);
  }, [onStage]);

  useEffect(() => () => {
    stream.current?.getTracks().forEach((track) => track.stop());
    void audio.current?.close().catch(() => undefined);
  }, []);

  const seconds = since === null ? 0 : Math.floor((Date.now() - since) / 1000) + (tick - tick);
  const PANEL = 'rounded-2xl border border-white/10 bg-zinc-900/80 p-4 backdrop-blur-md';

  return (
    <div className="space-y-4" data-livejam>
      {/* ── The stage ─────────────────────────────────────────────── */}
      <div className={PANEL}>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3 mb-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase ${onStage ? 'bg-rose-500 text-white animate-pulse' : 'bg-zinc-800 text-zinc-400'}`}>
              {onStage ? t('live.onStage', '● On stage') : t('live.offStage', 'Off stage')}
            </span>
            <span className="text-xs font-mono text-zinc-300">
              {here === 1 ? t('live.hereOne', 'You are the only one in the room right now.') : `${here} ${t('live.hereMany', 'people in the room right now.')}`}
            </span>
          </div>
          <span className="text-xs font-mono text-emerald-300" data-livejamclock>{clock(seconds)}</span>
        </div>

        <JamStage
          look={look}
          onLook={pickLook}
          name={name}
          heard={heard}
          drops={drops}
          looping={loop.playing && loop.layers > 0}
          bpm={loop.bpm}
        />

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
          <button
            type="button"
            data-livestagebtn
            onClick={() => (onStage ? leave() : void enter())}
            className={`min-h-[44px] shrink-0 rounded-xl px-4 text-sm font-extrabold flex items-center justify-center gap-2 ${onStage ? 'bg-zinc-800 text-zinc-200 border border-white/10' : 'bg-emerald-500 text-onAccent'}`}
          >
            {onStage ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            {onStage ? t('live.leaveStage', 'Leave the stage') : t('live.goOnStage', 'Go on stage')}
          </button>
          <span className="text-[11px] leading-snug text-zinc-500" data-livenocamera>
            {t('live.stageMicOnly', 'Going on stage opens your microphone only — never your camera. The room sees your character, moving to your sound.')}
          </span>
        </div>
        {refused && <p className="pt-2 text-sm text-amber-300">{refused}</p>}
      </div>

      {/* ── The soundboard ────────────────────────────────────────── */}
      <div className={PANEL}>
        <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
          <p className="text-xs font-bold uppercase tracking-wider text-white">{t('live.padsTitle', 'Live soundboard')}</p>
          <span className="rounded bg-emerald-500/20 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-300">
            {onStage ? t('live.onAir', 'MIC OPEN') : t('live.micShut', 'MIC SHUT')}
          </span>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-12 md:items-center">
          <div className="md:col-span-5 rounded-xl border border-white/10 bg-black p-3">
            <p className="mb-1 flex items-center gap-1 font-mono text-[10px] text-zinc-400">
              <Mic className="w-3 h-3" />
              {t('live.waveTitle', 'Your microphone, live')}
            </p>
            <canvas ref={wave} className="h-16 w-full rounded border border-white/5 bg-black/60" data-livewave />
          </div>
          <div className="md:col-span-7 grid grid-cols-4 gap-2">
            {PADS.map((pad) => (
              <button
                key={pad.id}
                type="button"
                data-livepad={pad.id}
                onClick={() => { hit(ctx(), pad.id, undefined, out()); padTap.current?.(pad.id); }}
                className={`min-h-[52px] rounded-xl border p-3 text-xs font-extrabold transition active:scale-95 ${pad.look}`}
              >
                {t(pad.word, pad.fallback)}
              </button>
            ))}
          </div>
        </div>
        <p className="pt-3 text-[11px] text-zinc-500">
          {t('live.jamHonest', 'The four sounds are made by this browser as you press them. There is no audience count, no tips and no chat in here: the room’s own box takes live addresses, by your rule, and nothing here is counted that was not.')}
        </p>
      </div>

      {/* ── The looper ──────────────────────────────────────────────── */}
      <JamLooper ctx={ctx} stream={mic} padTap={padTap} onToBooth={onToBooth} out={out} onState={onLoopState} />
    </div>
  );
}
