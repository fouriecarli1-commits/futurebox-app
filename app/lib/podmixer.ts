/**
 * The podcast room's desk, made real.
 *
 * Found on 29 October 2026, walking the room as a member would: the two
 * microphone meters moved on random numbers, the gain sliders changed
 * nothing in the recording, there was a second microphone whether or not
 * anybody had one, and the soundboard played out of the speaker only, so an
 * applause pressed on air was never on the episode. The owner, the same
 * evening: *"Die already exist goed vind ek dikwels foute op ... ek wil die
 * heel beste produk lewer."*
 *
 * So the desk is now the signal path itself:
 *
 *   microphone ─ gain ─ meter ─┐
 *   second mic ─ gain ─ meter ─┼─ the recording
 *   a sound pad ─ gain ────────┘   (and the speaker, so the host hears it)
 *
 * The meter reads the sound after its gain, so the slider moves the meter
 * because it moves the sound. A microphone is never sent to the speaker,
 * which would howl.
 */

export interface MicChannel {
  readonly stream: MediaStream;
  readonly gain: GainNode;
  readonly meter: AnalyserNode;
}

/** How loud a meter reads, 0 to 1, from its last few milliseconds of sound. */
export function levelOf(meter: AnalyserNode, scratch: Float32Array<ArrayBuffer>): number {
  meter.getFloatTimeDomainData(scratch);
  let sum = 0;
  for (let i = 0; i < scratch.length; i += 1) sum += scratch[i] * scratch[i];
  const rms = Math.sqrt(sum / scratch.length);
  /* Speech sits around -30 to -12 dBFS. Shown on a -48..0 dB scale so a
     normal voice fills the green and a shout reaches the red. */
  const db = 20 * Math.log10(Math.max(rms, 1e-6));
  return Math.min(1, Math.max(0, (db + 48) / 48));
}

/** A gain slider's 0–100 as the gain applied: 75 is as recorded, 100 is a little over. */
export function gainOf(percent: number, muted: boolean): number {
  if (muted) return 0;
  return Math.max(0, Math.min(100, percent)) / 75;
}

export class PodMixer {
  readonly context: AudioContext;
  private readonly mix: MediaStreamAudioDestinationNode;
  private channels: MicChannel[] = [];
  private readonly pads: GainNode;
  private playing: AudioBufferSourceNode[] = [];

  constructor() {
    this.context = new AudioContext();
    this.mix = this.context.createMediaStreamDestination();
    this.pads = this.context.createGain();
    this.pads.connect(this.mix);
    this.pads.connect(this.context.destination);
  }

  /** What the recorder records: every microphone and every pad, mixed. */
  get stream(): MediaStream {
    return this.mix.stream;
  }

  /** Opens a microphone onto the desk. `device` is an input's id, or the default. */
  async addMic(device?: string): Promise<MicChannel> {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        ...(device ? { deviceId: { exact: device } } : {}),
      },
    });
    const source = this.context.createMediaStreamSource(stream);
    const gain = this.context.createGain();
    const meter = this.context.createAnalyser();
    meter.fftSize = 1024;
    source.connect(gain);
    gain.connect(meter);
    gain.connect(this.mix);
    const channel = { stream, gain, meter };
    this.channels.push(channel);
    return channel;
  }

  /** A pad, into the recording and out of the speaker. */
  play(buffer: AudioBuffer): void {
    void this.context.resume();
    const source = this.context.createBufferSource();
    source.buffer = buffer;
    source.connect(this.pads);
    source.onended = () => { this.playing = this.playing.filter((one) => one !== source); };
    this.playing.push(source);
    source.start();
  }

  /** Every pad still sounding, silenced. */
  stopPads(): void {
    this.playing.forEach((one) => { try { one.stop(); } catch { /* already ended */ } });
    this.playing = [];
  }

  /** The microphones off the desk, so the browser's recording light goes out. */
  dropMics(): void {
    this.channels.forEach((one) => {
      one.gain.disconnect();
      one.stream.getTracks().forEach((track) => track.stop());
    });
    this.channels = [];
  }

  async close(): Promise<void> {
    this.stopPads();
    this.dropMics();
    this.mix.stream.getTracks().forEach((track) => track.stop());
    await this.context.close().catch(() => undefined);
  }
}

/** The microphones this device has. Names appear only once one has been allowed. */
export async function microphones(): Promise<{ id: string; name: string }[]> {
  if (!navigator.mediaDevices?.enumerateDevices) return [];
  const all = await navigator.mediaDevices.enumerateDevices();
  return all
    .filter((one) => one.kind === 'audioinput' && one.deviceId && one.deviceId !== 'default' && one.deviceId !== 'communications')
    .map((one, index) => ({ id: one.deviceId, name: one.label || `Microphone ${index + 1}` }));
}
