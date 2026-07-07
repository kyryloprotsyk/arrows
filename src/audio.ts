/* audio.ts — Web Audio API synthesizer (no external dependencies) */

class AudioManager {
  private ctx: AudioContext | null = null;
  private bgmOsc: OscillatorNode[] = [];
  private bgmGain: GainNode | null = null;

  private getCtx(): AudioContext {
    if (!this.ctx) this.ctx = new AudioContext();
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }

  private play(fn: (ctx: AudioContext) => void) {
    try { fn(this.getCtx()); } catch { /* ignore audio errors */ }
  }

  playTap() {
    this.play(ctx => {
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.type = 'sine'; o.frequency.setValueAtTime(600, ctx.currentTime);
      o.frequency.exponentialRampToValueAtTime(900, ctx.currentTime + 0.07);
      g.gain.setValueAtTime(0.18, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
      o.start(); o.stop(ctx.currentTime + 0.1);
    });
  }

  playLaunch() {
    this.play(ctx => {
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.type = 'triangle';
      o.frequency.setValueAtTime(400, ctx.currentTime);
      o.frequency.exponentialRampToValueAtTime(900, ctx.currentTime + 0.06);
      o.frequency.exponentialRampToValueAtTime(1600, ctx.currentTime + 0.15);
      g.gain.setValueAtTime(0.22, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      o.start(); o.stop(ctx.currentTime + 0.2);
    });
  }

  playBump() {
    this.play(ctx => {
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(200, ctx.currentTime);
      o.frequency.setValueAtTime(150, ctx.currentTime + 0.04);
      o.frequency.setValueAtTime(200, ctx.currentTime + 0.08);
      g.gain.setValueAtTime(0.15, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
      o.start(); o.stop(ctx.currentTime + 0.18);
    });
  }

  playExplosion() {
    this.play(ctx => {
      // Noise burst
      const size = ctx.sampleRate * 0.4;
      const buf  = ctx.createBuffer(1, size, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < size; i++) data[i] = Math.random() * 2 - 1;

      const src = ctx.createBufferSource(); src.buffer = buf;
      const flt = ctx.createBiquadFilter(); flt.type = 'lowpass'; flt.frequency.value = 300;
      const g   = ctx.createGain();
      src.connect(flt); flt.connect(g); g.connect(ctx.destination);
      g.gain.setValueAtTime(0.5, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      src.start(); src.stop(ctx.currentTime + 0.4);

      // Sub thump
      const o = ctx.createOscillator(); const g2 = ctx.createGain();
      o.connect(g2); g2.connect(ctx.destination);
      o.type = 'sine'; o.frequency.setValueAtTime(80, ctx.currentTime);
      o.frequency.exponentialRampToValueAtTime(25, ctx.currentTime + 0.25);
      g2.gain.setValueAtTime(0.4, ctx.currentTime);
      g2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      o.start(); o.stop(ctx.currentTime + 0.3);
    });
  }

  playCoinCollect() {
    this.play(ctx => {
      [523, 659].forEach((freq, i) => {
        const o = ctx.createOscillator(); const g = ctx.createGain();
        o.connect(g); g.connect(ctx.destination);
        o.type = 'sine'; o.frequency.value = freq;
        g.gain.setValueAtTime(0, ctx.currentTime + i * 0.06);
        g.gain.linearRampToValueAtTime(0.15, ctx.currentTime + i * 0.06 + 0.02);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.06 + 0.14);
        o.start(ctx.currentTime + i * 0.06);
        o.stop(ctx.currentTime + i * 0.06 + 0.15);
      });
    });
  }

  playCapsuleOpen() {
    this.play(ctx => {
      // Pop
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.type = 'sine'; o.frequency.setValueAtTime(200, ctx.currentTime);
      o.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.08);
      g.gain.setValueAtTime(0.25, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
      o.start(); o.stop(ctx.currentTime + 0.1);

      // Sparkle
      [1047, 1319, 1568, 2093].forEach((freq, i) => {
        const o2 = ctx.createOscillator(); const g2 = ctx.createGain();
        o2.connect(g2); g2.connect(ctx.destination);
        o2.type = 'sine'; o2.frequency.value = freq;
        g2.gain.setValueAtTime(0, ctx.currentTime + 0.08 + i * 0.06);
        g2.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.1 + i * 0.06);
        g2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2 + i * 0.06);
        o2.start(ctx.currentTime + 0.08 + i * 0.06);
        o2.stop(ctx.currentTime + 0.22 + i * 0.06);
      });
    });
  }

  playKeyCollect() {
    this.play(ctx => {
      [987, 1318, 1568].forEach((freq, i) => {
        const o = ctx.createOscillator(); const g = ctx.createGain();
        o.connect(g); g.connect(ctx.destination);
        o.type = 'sine'; o.frequency.value = freq;
        g.gain.setValueAtTime(0, ctx.currentTime + i * 0.05);
        g.gain.linearRampToValueAtTime(0.18, ctx.currentTime + i * 0.05 + 0.015);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.05 + 0.22);
        o.start(ctx.currentTime + i * 0.05);
        o.stop(ctx.currentTime + i * 0.05 + 0.23);
      });
    });
  }

  playCrownEquip() {
    this.play(ctx => {
      const scale = [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98];
      scale.forEach((freq, i) => {
        const o = ctx.createOscillator(); const g = ctx.createGain();
        o.connect(g); g.connect(ctx.destination);
        o.type = 'triangle'; o.frequency.value = freq;
        g.gain.setValueAtTime(0, ctx.currentTime + i * 0.045);
        g.gain.linearRampToValueAtTime(0.12, ctx.currentTime + i * 0.045 + 0.01);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.045 + 0.15);
        o.start(ctx.currentTime + i * 0.045);
        o.stop(ctx.currentTime + i * 0.045 + 0.16);
      });
    });
  }

  playRotator() {
    this.play(ctx => {
      [1, 1.5].forEach((mult, i) => {
        const o = ctx.createOscillator(); const g = ctx.createGain();
        o.connect(g); g.connect(ctx.destination);
        o.type = 'sawtooth';
        
        const start = ctx.currentTime + i * 0.05;
        o.frequency.setValueAtTime(250 * mult, start);
        o.frequency.exponentialRampToValueAtTime(800 * mult, start + 0.18);
        
        g.gain.setValueAtTime(0.1, start);
        g.gain.exponentialRampToValueAtTime(0.001, start + 0.2);
        
        const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1500;
        o.disconnect(g); o.connect(f); f.connect(g);
        
        o.start(start); o.stop(start + 0.21);
      });
    });
  }

  playVictory() {
    this.play(ctx => {
      const notes = [523, 659, 784, 1047, 1319, 1568];
      notes.forEach((freq, i) => {
        const o = ctx.createOscillator(); const g = ctx.createGain();
        o.connect(g); g.connect(ctx.destination);
        o.type = 'triangle'; o.frequency.value = freq;
        g.gain.setValueAtTime(0, ctx.currentTime + i * 0.11);
        g.gain.linearRampToValueAtTime(0.18, ctx.currentTime + i * 0.11 + 0.03);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.11 + 0.28);
        o.start(ctx.currentTime + i * 0.11);
        o.stop(ctx.currentTime + i * 0.11 + 0.3);
      });

      // Final chord
      [523, 659, 784].forEach(freq => {
        const o = ctx.createOscillator(); const g = ctx.createGain();
        o.connect(g); g.connect(ctx.destination);
        o.type = 'sine'; o.frequency.value = freq;
        g.gain.setValueAtTime(0, ctx.currentTime + 0.75);
        g.gain.linearRampToValueAtTime(0.14, ctx.currentTime + 0.8);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.6);
        o.start(ctx.currentTime + 0.75); o.stop(ctx.currentTime + 1.65);
      });
    });
  }

  playBGM() {
    if (this.bgmOsc.length > 0) return;
    try {
      const ctx = this.getCtx();
      this.bgmGain = ctx.createGain();
      this.bgmGain.gain.value = 0.07;
      this.bgmGain.connect(ctx.destination);

      const scale = [261.63, 293.66, 329.63, 392.00, 440.00];
      let beat = 0;

      const scheduleNote = () => {
        if (!this.bgmGain) return;
        const freq = scale[beat % scale.length] * (beat % 10 < 5 ? 1 : 2);
        const o = ctx.createOscillator(); const g = ctx.createGain();
        o.type = 'triangle'; o.frequency.value = freq;
        o.connect(g); g.connect(this.bgmGain);
        g.gain.setValueAtTime(0, ctx.currentTime);
        g.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.05);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
        o.start(); o.stop(ctx.currentTime + 0.5);
        this.bgmOsc.push(o);
        o.onended = () => { this.bgmOsc = this.bgmOsc.filter(x => x !== o); };
        beat++;
      };

      const interval = setInterval(() => {
        if (!this.bgmGain) { clearInterval(interval); return; }
        scheduleNote();
      }, 350);

      // Store interval ID for cleanup
      (this.bgmGain as any)._intervalId = interval;

    } catch { /* ignore */ }
  }

  stopBGM() {
    if (this.bgmGain) {
      try {
        const id = (this.bgmGain as any)._intervalId;
        if (id) clearInterval(id);
        this.bgmGain.gain.exponentialRampToValueAtTime(0.001, (this.ctx?.currentTime ?? 0) + 0.3);
      } catch { /* ignore */ }
      this.bgmGain = null;
    }
    this.bgmOsc.forEach(o => { try { o.stop(); } catch { } });
    this.bgmOsc = [];
  }
}

export const audio = new AudioManager();
