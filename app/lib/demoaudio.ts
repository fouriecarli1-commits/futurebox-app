/**
 * Web Audio Engine for FutureBox Studio Demo Previews and Tactile UI Audio.
 *
 * Provides real, audible, synthesized audio without requiring external mp3 assets:
 *   - `playStudioDemoTrack()`: Multi-track melodic synth chords, bassline, and groove.
 *   - `stopStudioDemoTrack()`: Smooth fade-out.
 *   - `isStudioDemoPlaying()`: Active playing status.
 *   - `playAudioEffect()`: Sonar pings, bells, sparkles, and tactile feedback.
 */

class StudioAudioEngine {
  private ctx: AudioContext | null = null;
  private isPlaying = false;
  private activeNodes: { stop?: () => void; disconnect?: () => void }[] = [];
  private masterGain: GainNode | null = null;
  private loopTimer: number | null = null;
  private listeners: Set<(playing: boolean) => void> = new Set();

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  public subscribe(cb: (playing: boolean) => void): () => void {
    this.listeners.add(cb);
    cb(this.isPlaying);
    return () => {
      this.listeners.delete(cb);
    };
  }

  private setPlaying(playing: boolean): void {
    this.isPlaying = playing;
    this.listeners.forEach((cb) => cb(playing));
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  /**
   * Play a lush futuristic synth groove.
   */
  public playStudioDemoTrack(genre = 'synthwave'): void {
    const ctx = this.getContext();
    if (!ctx) return;

    // If already playing, stop first
    this.stopStudioDemoTrack();

    this.setPlaying(true);

    const master = ctx.createGain();
    master.gain.setValueAtTime(0.01, ctx.currentTime);
    master.gain.exponentialRampToValueAtTime(0.4, ctx.currentTime + 0.15);
    master.connect(ctx.destination);
    this.masterGain = master;

    const chords = [
      // F Minor / Ab Major vibe: F3, Ab3, C4, Eb4
      [174.61, 207.65, 261.63, 311.13],
      // Db Major: Db3, F3, Ab3, C4
      [138.59, 174.61, 207.65, 261.63],
      // Eb Major: Eb3, G3, Bb3, Eb4
      [155.56, 196.00, 233.08, 311.13],
      // C Minor: C3, Eb3, G3, Bb3
      [130.81, 155.56, 196.00, 233.08],
    ];

    const chordDuration = 2.0; // 2 seconds per chord
    const totalLoop = chords.length * chordDuration; // 8 seconds loop

    const scheduleLoop = (startTime: number) => {
      if (!this.isPlaying) return;

      chords.forEach((chord, chordIdx) => {
        const chordStart = startTime + chordIdx * chordDuration;

        // 1. Lush Chord Pad
        chord.forEach((freq, noteIdx) => {
          const osc = ctx.createOscillator();
          const filter = ctx.createBiquadFilter();
          const noteGain = ctx.createGain();

          osc.type = noteIdx % 2 === 0 ? 'sawtooth' : 'triangle';
          osc.frequency.setValueAtTime(freq, chordStart);
          osc.detune.setValueAtTime((noteIdx - 1.5) * 6, chordStart);

          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(750, chordStart);
          filter.frequency.exponentialRampToValueAtTime(1200, chordStart + 0.8);
          filter.frequency.exponentialRampToValueAtTime(650, chordStart + chordDuration);

          noteGain.gain.setValueAtTime(0.001, chordStart);
          noteGain.gain.exponentialRampToValueAtTime(0.08, chordStart + 0.2);
          noteGain.gain.setValueAtTime(0.07, chordStart + chordDuration - 0.1);
          noteGain.gain.exponentialRampToValueAtTime(0.001, chordStart + chordDuration);

          osc.connect(filter);
          filter.connect(noteGain);
          noteGain.connect(master);

          osc.start(chordStart);
          osc.stop(chordStart + chordDuration);
          this.activeNodes.push(osc);
        });

        // 2. Bassline
        const bassFreq = chord[0] / 2; // Octave down
        const bassOsc = ctx.createOscillator();
        const bassGain = ctx.createGain();
        bassOsc.type = 'triangle';
        bassOsc.frequency.setValueAtTime(bassFreq, chordStart);

        bassGain.gain.setValueAtTime(0.18, chordStart);
        bassGain.gain.exponentialRampToValueAtTime(0.12, chordStart + 0.5);
        bassGain.gain.setValueAtTime(0.12, chordStart + chordDuration - 0.05);
        bassGain.gain.exponentialRampToValueAtTime(0.001, chordStart + chordDuration);

        bassOsc.connect(bassGain);
        bassGain.connect(master);
        bassOsc.start(chordStart);
        bassOsc.stop(chordStart + chordDuration);
        this.activeNodes.push(bassOsc);

        // 3. Rhythmic 16th Arpeggio notes
        const arpNotes = [...chord, chord[1] * 2, chord[2] * 2];
        const stepTime = chordDuration / 8; // 8 notes per chord
        for (let s = 0; s < 8; s++) {
          const arpStart = chordStart + s * stepTime;
          const aFreq = arpNotes[s % arpNotes.length];
          const arpOsc = ctx.createOscillator();
          const arpGain = ctx.createGain();

          arpOsc.type = 'sine';
          arpOsc.frequency.setValueAtTime(aFreq, arpStart);

          arpGain.gain.setValueAtTime(0.09, arpStart);
          arpGain.gain.exponentialRampToValueAtTime(0.001, arpStart + stepTime * 0.85);

          arpOsc.connect(arpGain);
          arpGain.connect(master);
          arpOsc.start(arpStart);
          arpOsc.stop(arpStart + stepTime);
          this.activeNodes.push(arpOsc);
        }

        // 4. Subtle Ambient Beat Pulse
        for (let b = 0; b < 2; b++) {
          const beatStart = chordStart + b * 1.0;
          const kickOsc = ctx.createOscillator();
          const kickGain = ctx.createGain();

          kickOsc.type = 'sine';
          kickOsc.frequency.setValueAtTime(130, beatStart);
          kickOsc.frequency.exponentialRampToValueAtTime(45, beatStart + 0.12);

          kickGain.gain.setValueAtTime(0.25, beatStart);
          kickGain.gain.exponentialRampToValueAtTime(0.001, beatStart + 0.16);

          kickOsc.connect(kickGain);
          kickGain.connect(master);
          kickOsc.start(beatStart);
          kickOsc.stop(beatStart + 0.2);
          this.activeNodes.push(kickOsc);
        }
      });

      // Schedule next iteration
      this.loopTimer = window.setTimeout(() => {
        if (this.isPlaying) {
          scheduleLoop(ctx.currentTime + 0.05);
        }
      }, (totalLoop - 0.2) * 1000);
    };

    scheduleLoop(ctx.currentTime + 0.05);
  }

  /**
   * Stop demo track playback.
   */
  public stopStudioDemoTrack(): void {
    if (this.loopTimer) {
      clearTimeout(this.loopTimer);
      this.loopTimer = null;
    }
    if (this.masterGain && this.ctx) {
      try {
        const now = this.ctx.currentTime;
        this.masterGain.gain.cancelScheduledValues(now);
        this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
        this.masterGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);
      } catch {
        // Safe fallback
      }
    }
    setTimeout(() => {
      this.activeNodes.forEach((node) => {
        try {
          node.stop?.();
          node.disconnect?.();
        } catch {
          // Cleaned
        }
      });
      this.activeNodes = [];
      this.setPlaying(false);
    }, 180);
  }

  /**
   * Play an immediate tactile acoustic/synth sound effect.
   */
  public playAudioEffect(type: 'radar' | 'chime' | 'success' | 'tap' | 'magic' | 'sparkle' = 'chime'): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const gain = ctx.createGain();
    gain.connect(ctx.destination);

    if (type === 'radar') {
      // Classic high-tech sonar ping with gentle reverberation decay
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1174.66, now); // D6
      osc.frequency.exponentialRampToValueAtTime(1170, now + 0.4);

      gain.gain.setValueAtTime(0.28, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

      osc.connect(gain);
      osc.start(now);
      osc.stop(now + 0.6);
    } else if (type === 'success') {
      // Two tone ascending chime (C5 -> G5)
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const g1 = ctx.createGain();
      const g2 = ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(523.25, now);
      g1.gain.setValueAtTime(0.2, now);
      g1.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
      osc1.connect(g1);
      g1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.25);

      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(783.99, now + 0.12);
      g2.gain.setValueAtTime(0.22, now + 0.12);
      g2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      osc2.connect(g2);
      g2.connect(ctx.destination);
      osc2.start(now + 0.12);
      osc2.stop(now + 0.45);
    } else if (type === 'sparkle' || type === 'magic') {
      // Shimmering triple arpeggio
      [880, 1108.73, 1318.51].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        const tStart = now + idx * 0.07;
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, tStart);
        g.gain.setValueAtTime(0.18, tStart);
        g.gain.exponentialRampToValueAtTime(0.001, tStart + 0.35);
        osc.connect(g);
        g.connect(ctx.destination);
        osc.start(tStart);
        osc.stop(tStart + 0.35);
      });
    } else if (type === 'tap') {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(220, now + 0.05);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      osc.connect(gain);
      osc.start(now);
      osc.stop(now + 0.06);
    } else {
      // Default chime
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(659.25, now); // E5
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.connect(gain);
      osc.start(now);
      osc.stop(now + 0.35);
    }
  }
}

export const studioAudio = new StudioAudioEngine();
