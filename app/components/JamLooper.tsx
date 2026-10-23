'use client';

/**
 * The looper in the live jam room, and the loops of everybody else in it.
 *
 * The owner, 18 October 2026: a looper, so a sound can be held and layered —
 * and when somebody in the room is looping, a small plus pulses on everybody
 * else's screen while the loop plays, goes away when it stops, comes back when
 * a new one starts, and pressing it puts that loop into your own.
 *
 * ── How it plays ─────────────────────────────────────────────────────────
 *
 * Two bars at the tempo chosen. A scheduler looks a little ahead on the
 * AudioContext's own clock and lays down the next pass — every pad hit at its
 * place, every recording from the start — before it is due, so the loop does
 * not drift with the page's timers. Each layer has its own volume node, so
 * muting is immediate rather than at the next pass.
 *
 * ── How a layer is made ──────────────────────────────────────────────────
 *
 * Pads: press "Record pads" and play — one pass is caught, snapped to the
 * nearest sixteenth, and becomes a layer. Voice: the microphone, one pass,
 * recorded from the start of the next pass with a click on each beat so there
 * is something to play against. Voice needs the stage open, because that is
 * where the microphone is.
 *
 * ── The room ─────────────────────────────────────────────────────────────
 *
 * While this plays and sharing is on, `/api/live/loops` is told every few
 * seconds; a loop that has changed is a new loop. Everybody else's loops are
 * read every few seconds too, and each one shows a plus that pulses on that
 * loop's own beat.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Circle, Mic, Play, Plus, Send, Square, Trash2, Volume2, VolumeX, Check } from 'lucide-react';
import { useLang } from '../lib/i18n';
import { accessToken } from '../lib/cloud';
import { hit } from '../lib/jampads';
import { sendToBooth } from '../lib/jamhandover';
import {
  BARS, BEATS_PER_BAR, DEFAULT_BPM, MOST_LAYERS, MOST_VOICE_CHARS, TEMPOS,
  addInto, beatSeconds, loopSeconds, placeIn, rateFor, snap,
  type Layer, type Pad, type PadHit,
} from '../lib/looper';

/** How far ahead the next pass is laid down, in seconds. */
const AHEAD = 0.2;
/** How often the room is told, and asked, in milliseconds. */
const EVERY = 4000;

interface RoomLoop {
  readonly who: string;
  readonly name: string;
  readonly bpm: number;
  readonly layers: number;
  readonly startedAt: string;
}

const toBase64 = async (blob: Blob): Promise<string> => {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let text = '';
  for (let i = 0; i < bytes.length; i += 0x8000) text += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(text);
};
const fromBase64 = (text: string): ArrayBuffer => {
  const raw = atob(text);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i);
  return bytes.buffer;
};

export default function JamLooper({ ctx, stream, padTap, onToBooth, out, onState }: {
  /** The room's AudioContext, made on the first press. */
  readonly ctx: () => AudioContext;
  /** The microphone, when the stage is open. */
  readonly stream: MediaStream | null;
  /** Set here, called by the room's pads: a press while recording is kept. */
  readonly padTap: React.MutableRefObject<((pad: Pad) => void) | null>;
  /** Opens the Booth, where the loop waits for ProBooth. Absent: no button. */
  readonly onToBooth?: () => void;
  /**
   * Where the loop plays into: the room's own bus, which the stage listens to
   * so your character moves to your loop. Absent: straight to the speakers.
   */
  readonly out?: () => AudioNode;
  /** Told whenever the loop starts, stops, changes tempo or gains a layer. */
  readonly onState?: (state: { playing: boolean; bpm: number; layers: number }) => void;
}): React.ReactElement {
  const { t } = useLang();
  const [bpm, setBpm] = useState<number>(DEFAULT_BPM);
  const [layers, setLayers] = useState<Layer[]>([]);
  const [muted, setMuted] = useState<ReadonlySet<string>>(new Set());
  const [playing, setPlaying] = useState(false);
  const [recording, setRecording] = useState<'pads' | 'voice' | null>(null);
  const [beat, setBeat] = useState(-1);
  const [said, setSaid] = useState('');
  const [share, setShare] = useState(true);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [room, setRoom] = useState<RoomLoop[]>([]);
  const [added, setAdded] = useState<Readonly<Record<string, string>>>({});
  const [adding, setAdding] = useState('');

  /* What the scheduler reads, kept off React so a pass is laid down from the
     current loop and not from the one the last render saw. */
  const live = useRef({ bpm, layers, muted, playing, startedAt: 0, nextPass: 0 });
  live.current.bpm = bpm;
  live.current.layers = layers;
  live.current.muted = muted;
  const buffers = useRef(new Map<string, AudioBuffer>());
  const gains = useRef(new Map<string, GainNode>());
  const caught = useRef<PadHit[] | null>(null);
  const sentAs = useRef('');
  const shared = useRef(false);

  const length = loopSeconds(bpm);

  /* ── A layer's own volume, made once ─────────────────────────────── */
  const gainFor = useCallback((id: string): GainNode => {
    const audio = ctx();
    let node = gains.current.get(id);
    if (!node) {
      node = audio.createGain();
      node.connect(out ? out() : audio.destination);
      gains.current.set(id, node);
    }
    node.gain.value = live.current.muted.has(id) ? 0 : 1;
    return node;
  }, [ctx, out]);

  /* The stage reads this: whether the loop plays, at what tempo, and how
     many layers — a layer more is a drop, and the character jumps. */
  useEffect(() => { onState?.({ playing, bpm, layers: layers.length }); }, [onState, playing, bpm, layers.length]);

  /* ── A recording, decoded once and kept ──────────────────────────── */
  const decode = useCallback(async (layer: Layer): Promise<void> => {
    if (layer.kind !== 'voice' || buffers.current.has(layer.id)) return;
    try {
      const buffer = await ctx().decodeAudioData(fromBase64(layer.audio));
      buffers.current.set(layer.id, buffer);
    } catch {
      setSaid(t('loop.unreadable', 'One recording in that loop could not be played on this device, so it is left out.'));
    }
  }, [ctx, t]);

  /* ── One pass, laid down ahead of time ───────────────────────────── */
  const layPass = useCallback((at: number): void => {
    const audio = ctx();
    const { bpm: tempo, layers: now } = live.current;
    const pass = loopSeconds(tempo);
    for (const layer of now) {
      const into = gainFor(layer.id);
      if (layer.kind === 'pads') {
        for (const one of layer.hits) hit(audio, one.pad, at + one.at * pass, into);
      } else {
        const buffer = buffers.current.get(layer.id);
        if (!buffer) continue;
        const source = audio.createBufferSource();
        source.buffer = buffer;
        source.playbackRate.value = rateFor(layer.bpm, tempo);
        source.connect(into);
        source.start(at, 0, Math.min(buffer.duration, pass * rateFor(layer.bpm, tempo)));
      }
    }
  }, [ctx, gainFor]);

  /* ── The scheduler ───────────────────────────────────────────────── */
  useEffect(() => {
    if (!playing) return undefined;
    const audio = ctx();
    const timer = window.setInterval(() => {
      const state = live.current;
      const pass = loopSeconds(state.bpm);
      while (state.nextPass < audio.currentTime + AHEAD) {
        layPass(state.nextPass);
        state.nextPass += pass;
      }
      const into = placeIn(audio.currentTime, state.startedAt, state.bpm);
      setBeat(Math.floor(into * BARS * BEATS_PER_BAR));
    }, 25);
    return () => window.clearInterval(timer);
  }, [playing, ctx, layPass]);

  const start = useCallback((): number => {
    const audio = ctx();
    if (live.current.playing) return audio.currentTime;
    const at = audio.currentTime + 0.05;
    live.current.startedAt = at;
    live.current.nextPass = at;
    live.current.playing = true;
    setPlaying(true);
    return at;
  }, [ctx]);

  const stop = useCallback((): void => {
    live.current.playing = false;
    setPlaying(false);
    setBeat(-1);
    for (const node of gains.current.values()) {
      /* Silence what is already scheduled, then give each layer a fresh
         volume for the next start. */
      node.gain.value = 0;
      node.disconnect();
    }
    gains.current.clear();
  }, []);

  /* ── Pads: one pass caught from the room's own pads ──────────────── */
  useEffect(() => {
    padTap.current = (pad: Pad) => {
      if (!caught.current) return;
      const audio = ctx();
      caught.current.push({ pad, at: snap(placeIn(audio.currentTime, live.current.startedAt, live.current.bpm)) });
    };
    return () => { padTap.current = null; };
  }, [padTap, ctx]);

  const recordPads = useCallback((): void => {
    if (recording || layers.length >= MOST_LAYERS) return;
    setSaid('');
    start();
    caught.current = [];
    setRecording('pads');
    window.setTimeout(() => {
      const hits = caught.current ?? [];
      caught.current = null;
      setRecording(null);
      if (!hits.length) {
        setSaid(t('loop.noHits', 'Nothing was played in that pass, so no layer was added. Press record and play the pads.'));
        return;
      }
      const unique = new Map(hits.map((one) => [`${one.pad}@${one.at}`, one]));
      setLayers((was) => [...was, { id: `pads-${Date.now()}`, kind: 'pads', hits: [...unique.values()] }]);
    }, loopSeconds(live.current.bpm) * 1000);
  }, [recording, layers.length, start, t]);

  /* ── Voice: one pass off the microphone, from the next downbeat ──── */
  const recordVoice = useCallback((): void => {
    if (recording || layers.length >= MOST_LAYERS) return;
    if (!stream || !stream.getAudioTracks().length) {
      setSaid(t('loop.needStage', 'A voice layer uses your microphone — go on stage first, and then record.'));
      return;
    }
    if (typeof MediaRecorder === 'undefined') {
      setSaid(t('loop.noRecorder', 'This browser cannot record a voice layer. The pads still loop.'));
      return;
    }
    setSaid('');
    const audio = ctx();
    const tempo = live.current.bpm;
    const pass = loopSeconds(tempo);
    const wasPlaying = live.current.playing;
    const began = start();
    /* The next downbeat, or now when the loop has only just started. */
    const into = placeIn(audio.currentTime, live.current.startedAt, tempo);
    const downbeat = wasPlaying ? audio.currentTime + (1 - into) * pass : began;
    /* A click on every beat of the pass being recorded. */
    for (let b = 0; b < BARS * BEATS_PER_BAR; b += 1) hit(audio, 'hihat', downbeat + b * beatSeconds(tempo));
    setRecording('voice');
    const recorder = new MediaRecorder(new MediaStream(stream.getAudioTracks()), { audioBitsPerSecond: 48_000 });
    const pieces: Blob[] = [];
    recorder.ondataavailable = (event) => { if (event.data.size) pieces.push(event.data); };
    recorder.onstop = async () => {
      setRecording(null);
      const blob = new Blob(pieces, { type: recorder.mimeType || 'audio/webm' });
      const audioText = await toBase64(blob);
      if (audioText.length > MOST_VOICE_CHARS) {
        setSaid(t('loop.tooLong', 'That recording came out too large to loop. Try again — a quieter room helps.'));
        return;
      }
      const layer: Layer = { id: `voice-${Date.now()}`, kind: 'voice', audio: audioText, type: (blob.type || 'audio/webm').replace(/\s+/g, ''), bpm: tempo };
      await decode(layer);
      if (buffers.current.has(layer.id)) setLayers((was) => [...was, layer]);
    };
    const wait = Math.max(0, (downbeat - audio.currentTime) * 1000);
    window.setTimeout(() => {
      recorder.start();
      window.setTimeout(() => { if (recorder.state === 'recording') recorder.stop(); }, pass * 1000);
    }, wait);
  }, [recording, layers.length, stream, start, ctx, decode, t]);

  const clear = useCallback((): void => {
    stop();
    setLayers([]);
    setMuted(new Set());
    buffers.current.clear();
    setSaid('');
  }, [stop]);

  const toggleMute = (id: string): void => {
    setMuted((was) => {
      const next = new Set(was);
      if (next.has(id)) next.delete(id); else next.add(id);
      const node = gains.current.get(id);
      if (node) node.gain.value = next.has(id) ? 0 : 1;
      return next;
    });
  };
  const remove = (id: string): void => {
    const next = layers.filter((one) => one.id !== id);
    if (!next.length) stop();
    setLayers(next);
    gains.current.get(id)?.disconnect();
    gains.current.delete(id);
    buffers.current.delete(id);
  };

  /* ── Telling the room ────────────────────────────────────────────────
     The server decides who is signed in: a 401 is "sign in to share", and
     the looper stops asking until the loop changes rather than asking every
     few seconds to be told the same thing. */
  const refusedAs = useRef('');
  const tell = useCallback(async (): Promise<void> => {
    const token = await accessToken();
    const auth: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
    const state = live.current;
    const sharing = share && state.playing && state.layers.length > 0;
    if (!sharing) {
      if (shared.current) {
        shared.current = false;
        sentAs.current = '';
        await fetch('/api/live/loops', { method: 'DELETE', headers: auth }).catch(() => undefined);
      }
      return;
    }
    const shape = `${state.bpm}|${state.layers.map((one) => one.id).join(',')}`;
    if (shape === refusedAs.current) return;
    const fresh = shape !== sentAs.current;
    const answer = await fetch('/api/live/loops', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token ?? ''}` },
      body: JSON.stringify({ loop: { bpm: state.bpm, layers: state.layers }, fresh }),
    }).catch(() => null);
    if (answer?.ok) {
      shared.current = true;
      sentAs.current = shape;
      refusedAs.current = '';
    } else if (answer?.status === 401) {
      refusedAs.current = shape;
      setSignedIn(false);
    }
  }, [share]);

  /* Told on every change, then every few seconds while it plays. */
  useEffect(() => { void tell(); }, [tell, playing, layers, bpm]);
  useEffect(() => {
    const timer = window.setInterval(() => { if (!document.hidden) void tell(); }, EVERY);
    return () => window.clearInterval(timer);
  }, [tell]);
  /* Leaving the room stops the loop for everybody else too. */
  useEffect(() => () => {
    if (!shared.current) return;
    void accessToken().then((token) => {
      void fetch('/api/live/loops', { method: 'DELETE', headers: token ? { Authorization: `Bearer ${token}` } : {}, keepalive: true });
    });
  }, []);

  /* ── Hearing the room ──────────────────────────────────────────────── */
  useEffect(() => {
    let gone = false;
    const ask = async (): Promise<void> => {
      const token = await accessToken();
      const answer = await fetch('/api/live/loops', { headers: token ? { Authorization: `Bearer ${token}` } : {} }).catch(() => null);
      if (gone || !answer) return;
      if (answer.status === 401) { setSignedIn(false); setRoom([]); return; }
      if (!answer.ok) return;
      setSignedIn(true);
      const body = (await answer.json().catch(() => ({}))) as { loops?: RoomLoop[] };
      setRoom(Array.isArray(body.loops) ? body.loops : []);
    };
    void ask();
    const timer = window.setInterval(() => { if (!document.hidden) void ask(); }, EVERY);
    return () => { gone = true; window.clearInterval(timer); };
  }, []);

  const take = async (one: RoomLoop): Promise<void> => {
    if (adding) return;
    setAdding(one.who);
    setSaid('');
    try {
      const token = await accessToken();
      const answer = await fetch(`/api/live/loops?who=${encodeURIComponent(one.who)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const body = (await answer.json().catch(() => ({}))) as { loop?: { bpm: number; layers: Layer[] }; name?: string; message?: string };
      if (!answer.ok || !body.loop) {
        setSaid(body.message ?? t('loop.stopped', 'That loop stopped before it could be added.'));
        return;
      }
      const theirs = body.loop;
      const by = body.name || one.name || t('loop.someone', 'somebody in the room');
      const next = addInto(live.current.layers, theirs, by, `${one.who.slice(0, 8)}-${Date.now()}`);
      for (const layer of next) await decode(layer);
      const empty = live.current.layers.length === 0;
      if (empty) setBpm(theirs.bpm);
      setLayers(next.filter((layer) => layer.kind === 'pads' || buffers.current.has(layer.id)));
      setAdded((was) => ({ ...was, [one.who]: one.startedAt }));
      if (empty) {
        live.current.bpm = theirs.bpm;
        start();
      } else if (theirs.bpm !== live.current.bpm && theirs.layers.some((layer) => layer.kind === 'voice')) {
        setSaid(t('loop.refit', 'Their recording is played faster or slower to fit your tempo, which moves its pitch.'));
      }
      if (next.length - live.current.layers.length < theirs.layers.length) {
        setSaid(t('loop.full', 'Your loop holds eight layers, so only part of theirs fitted.'));
      }
    } catch {
      setSaid(t('loop.offline', 'That could not be fetched. Check the connection and try again.'));
    } finally {
      setAdding('');
    }
  };

  /* ── To the booth ─────────────────────────────────────────────────────
     One pass, rendered as the room plays it (muted layers left out), kept on
     this device, and the Booth opened: the next ProBooth she opens there
     takes it as a lane. See `lib/jamhandover.ts`. */
  const [sending, setSending] = useState(false);
  const toBooth = async (): Promise<void> => {
    if (sending || !layers.length || !onToBooth) return;
    setSending(true);
    setSaid('');
    try {
      const kept = await sendToBooth(layers, bpm, muted);
      if (kept !== 'kept') {
        setSaid(t('loop.notKept', 'This device would not keep the loop for the booth. Make some space and try again.'));
        return;
      }
      stop();
      onToBooth();
    } catch {
      setSaid(t('loop.notRendered', 'The loop could not be made into a lane on this browser.'));
    } finally {
      setSending(false);
    }
  };

  const nameOf = (layer: Layer, at: number): string => {
    const what = layer.kind === 'pads' ? t('loop.padsLayer', 'Pads') : t('loop.voiceLayer', 'Voice');
    return `${what} ${at + 1}${layer.from ? ` · ${t('loop.from', 'from')} ${layer.from}` : ''}`;
  };

  const PANEL = 'rounded-2xl border border-white/10 bg-zinc-900/80 p-4 backdrop-blur-md';
  const BTN = 'min-h-[44px] rounded-xl border px-3 text-xs font-extrabold flex items-center gap-1.5 disabled:opacity-40';

  return (
    <div className={PANEL} data-jamlooper>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
        <p className="text-xs font-bold uppercase tracking-wider text-white">{t('loop.title', 'Looper')}</p>
        <label className="flex items-center gap-2 text-[11px] text-zinc-300">
          {t('loop.tempo', 'Tempo')}
          <select
            data-looptempo
            value={bpm}
            disabled={layers.length > 0}
            onChange={(e) => setBpm(Number(e.target.value))}
            className="min-h-[36px] rounded-lg border border-white/10 bg-zinc-950 px-2 text-xs text-white disabled:opacity-60"
          >
            {TEMPOS.map((one) => <option key={one} value={one}>{one} BPM</option>)}
          </select>
        </label>
      </div>

      {/* Eight beats, two bars: where the loop is now. */}
      <div className="mb-3 grid grid-cols-8 gap-1" data-loopbeats aria-hidden>
        {Array.from({ length: BARS * BEATS_PER_BAR }, (_, at) => (
          <span
            key={at}
            data-loopbeat={at === beat ? 'on' : undefined}
            className={`h-2 rounded-full ${at === beat ? (recording ? 'bg-rose-400' : 'bg-emerald-400') : at % BEATS_PER_BAR === 0 ? 'bg-zinc-600' : 'bg-zinc-800'}`}
          />
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" data-looprec="pads" onClick={recordPads} disabled={Boolean(recording) || layers.length >= MOST_LAYERS}
          className={`${BTN} ${recording === 'pads' ? 'border-rose-400 bg-rose-500/25 text-rose-100' : 'border-rose-500/40 bg-rose-500/10 text-rose-200'}`}>
          <Circle className="h-3.5 w-3.5 fill-current" />
          {recording === 'pads' ? t('loop.recordingPads', 'Play the pads…') : t('loop.recordPads', 'Record pads')}
        </button>
        <button type="button" data-looprec="voice" onClick={recordVoice} disabled={Boolean(recording) || layers.length >= MOST_LAYERS}
          className={`${BTN} ${recording === 'voice' ? 'border-rose-400 bg-rose-500/25 text-rose-100' : 'border-white/15 bg-zinc-950 text-zinc-200'}`}>
          <Mic className="h-3.5 w-3.5" />
          {recording === 'voice' ? t('loop.recordingVoice', 'Recording one pass…') : t('loop.recordVoice', 'Record voice')}
        </button>
        <button type="button" data-loopplay onClick={() => (playing ? stop() : start())} disabled={!layers.length || Boolean(recording)}
          className={`${BTN} border-emerald-500/40 bg-emerald-500/15 text-emerald-200`}>
          {playing ? <Square className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          {playing ? t('loop.stop', 'Stop') : t('loop.play', 'Play')}
        </button>
        <button type="button" data-loopclear onClick={clear} disabled={!layers.length || Boolean(recording)}
          className={`${BTN} border-white/10 bg-zinc-950 text-zinc-300`}>
          <Trash2 className="h-3.5 w-3.5" />
          {t('loop.clear', 'Clear')}
        </button>
        <span className="ml-auto font-mono text-[10px] text-zinc-400">{layers.length}/{MOST_LAYERS} · {length.toFixed(1)}s</span>
      </div>

      {layers.length > 0 && (
        <ul className="mt-3 divide-y divide-white/5 rounded-xl border border-white/10" data-looplayers>
          {layers.map((layer, at) => (
            <li key={layer.id} data-looplayer={layer.kind} className="flex items-center gap-2 px-3 py-2 text-xs text-zinc-200">
              <span className="min-w-0 flex-1 truncate">{nameOf(layer, at)}</span>
              <button type="button" data-loopmute aria-pressed={muted.has(layer.id)} aria-label={t('loop.mute', 'Mute this layer')}
                onClick={() => toggleMute(layer.id)} className="grid h-9 w-9 place-items-center rounded-lg border border-white/10">
                {muted.has(layer.id) ? <VolumeX className="h-4 w-4 text-zinc-500" /> : <Volume2 className="h-4 w-4" />}
              </button>
              <button type="button" data-loopdelete aria-label={t('loop.delete', 'Remove this layer')}
                onClick={() => remove(layer.id)} className="grid h-9 w-9 place-items-center rounded-lg border border-white/10">
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {onToBooth && layers.length > 0 && (
        <button
          type="button"
          data-loopsend
          onClick={() => void toBooth()}
          disabled={sending || Boolean(recording)}
          className="mt-3 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-sky-400/40 bg-sky-500/10 px-3 text-xs font-extrabold text-sky-100 disabled:opacity-50"
        >
          <Send className="h-3.5 w-3.5" />
          {sending ? t('loop.sending', 'Making it a lane…') : t('loop.toBooth', 'Send to ProBooth')}
        </button>
      )}
      {onToBooth && layers.length > 0 && (
        <p className="pt-1 text-[11px] text-zinc-500">{t('loop.toBoothWhat', 'It waits on this phone. Open a song in the Booth, then ProBooth, and it is there as a lane going round to the end of the song.')}</p>
      )}

      {said && <p className="pt-2 text-xs text-amber-300" data-loopsaid>{said}</p>}

      {/* ── The room's loops ─────────────────────────────────────────── */}
      <div className="mt-4 border-t border-white/10 pt-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-300">{t('loop.roomTitle', 'Looping in the room now')}</p>
          <label className="flex items-center gap-2 text-[11px] text-zinc-300">
            <input type="checkbox" data-loopshare checked={share} onChange={(e) => setShare(e.target.checked)} className="h-4 w-4 accent-emerald-500" />
            {t('loop.share', 'Let the room add my loop')}
          </label>
        </div>
        {signedIn === false ? (
          <p className="pt-2 text-[11px] text-zinc-400">{t('loop.signIn', 'Sign in to hear the room’s loops and share yours.')}</p>
        ) : room.length === 0 ? (
          <p className="pt-2 text-[11px] text-zinc-500" data-roomloopsnone>{t('loop.nobody', 'Nobody else is looping right now. When somebody is, a + shows here for as long as their loop plays.')}</p>
        ) : (
          <ul className="mt-2 flex flex-wrap gap-2" data-roomloops>
            {room.map((one) => {
              const done = added[one.who] === one.startedAt;
              return (
                <li key={one.who} data-roomloop={one.who} className="flex items-center gap-2 rounded-full border border-white/10 bg-zinc-950/70 py-1 pl-3 pr-1 text-xs text-zinc-200">
                  <span className="max-w-[10rem] truncate">{one.name || t('loop.someone', 'somebody in the room')}</span>
                  <span className="font-mono text-[10px] text-zinc-500">{one.bpm} · {one.layers}</span>
                  {done ? (
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-emerald-500/20 text-emerald-300" data-roomloopadded aria-label={t('loop.added', 'Added to your loop')}>
                      <Check className="h-4 w-4" />
                    </span>
                  ) : (
                    <button
                      type="button"
                      data-roomloopadd={one.who}
                      onClick={() => void take(one)}
                      disabled={Boolean(adding)}
                      aria-label={`${t('loop.addTheirs', 'Add their loop to yours')}: ${one.name}`}
                      className="fb-loop-pulse grid h-9 w-9 place-items-center rounded-full bg-emerald-400 text-onAccent disabled:opacity-60"
                      style={{ '--fb-beat': `${beatSeconds(one.bpm)}s` } as React.CSSProperties}
                    >
                      <Plus className="h-5 w-5" />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
