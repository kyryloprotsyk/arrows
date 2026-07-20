/* audio.ts — Howler.js BGM (pre-rendered PCM loops) + Web Audio SFX synthesis
 *
 * BGM architecture:
 *   Each world has 3 looping Howl layers: bass, melody, arp.
 *   Loops are rendered offline at startup into WAV data URLs using
 *   OfflineAudioContext (no audio files required). Howler manages
 *   loop, fade, volume, and iOS AudioContext unlock automatically.
 *
 * SFX stay as pure Web Audio API synthesis — zero latency, per-world timbre.
 */

import { Howler, Howl } from 'howler';

// ── World theme definitions ──────────────────────────────────────────────────

interface WorldTheme {
  bpm:        number;
  bassNotes:   number[];
  melodyNotes: number[];
  arpNotes:    number[];
  bassWave:    OscillatorType;
  melodyWave:  OscillatorType;
  arpWave:     OscillatorType;
  bassGain:    number;
  melodyGain:  number;
  arpGain:     number;
  reverb:      number;
}

const WORLD_THEMES: WorldTheme[] = [
  // 0: Menu — C pentatonic, 116 BPM, memorable cozy theme
  { bpm: 116, bassNotes: [130.81, 98.00, 110.00, 87.31], melodyNotes: [523.25, 587.33, 659.25, 783.99, 880.00, 783.99, 659.25, 587.33, 659.25, 783.99, 880.00, 1046.50, 880.00, 783.99, 659.25, 523.25], arpNotes: [783.99, 880.00, 1046.50, 1318.51, 1046.50, 880.00, 783.99, 659.25, 880.00, 1046.50, 1318.51, 1567.98, 1318.51, 1046.50, 880.00, 783.99], bassWave:'sine', melodyWave:'triangle', arpWave:'sine', bassGain:0.32, melodyGain:0.20, arpGain:0.12, reverb:0.25 },
  // 1: Jelly Hills — C major, 135 BPM, bouncy & cute
  { bpm: 135, bassNotes: [130.81, 164.81, 174.61, 196.00, 130.81, 164.81, 174.61, 196.00], melodyNotes: [523.25, 659.25, 783.99, 659.25, 880.00, 783.99, 1046.50, 783.99], arpNotes: [1046.50, 1318.51, 1567.98, 1318.51, 1046.50, 1318.51, 1567.98, 2093.00], bassWave:'sine', melodyWave:'sine', arpWave:'sine', bassGain:0.35, melodyGain:0.24, arpGain:0.14, reverb:0.15 },
  // 2: Dino Valley — G minor, 108 BPM, tropical wooden logs
  { bpm: 108, bassNotes: [98.00, 116.54, 130.81, 146.83, 98.00, 116.54, 130.81, 146.83], melodyNotes: [392.00, 466.16, 523.25, 587.33, 466.16, 392.00, 349.23, 392.00], arpNotes: [783.99, 932.33, 1046.50, 1174.66, 932.33, 783.99, 698.46, 783.99], bassWave:'triangle', melodyWave:'triangle', arpWave:'triangle', bassGain:0.32, melodyGain:0.22, arpGain:0.13, reverb:0.30 },
  // 3: Cosmo Station — D minor, 130 BPM, heavy neon synthwave
  { bpm: 130, bassNotes: [146.83, 116.54, 130.81, 110.00, 146.83, 116.54, 130.81, 110.00], melodyNotes: [587.33, 698.46, 783.99, 880.00, 783.99, 698.46, 587.33, 523.25], arpNotes: [1174.66, 1396.91, 1567.98, 1760.00, 1567.98, 1396.91, 1174.66, 1046.50], bassWave:'sawtooth', melodyWave:'sawtooth', arpWave:'square', bassGain:0.24, melodyGain:0.18, arpGain:0.10, reverb:0.10 },
  // 4: Coral Reef — F major, 98 BPM, liquid bubble drops
  { bpm: 98, bassNotes: [174.61, 130.81, 146.83, 116.54, 174.61, 130.81, 146.83, 116.54], melodyNotes: [698.46, 783.99, 880.00, 1046.50, 880.00, 783.99, 698.46, 659.25], arpNotes: [1396.91, 1567.98, 1760.00, 2093.00, 1760.00, 1567.98, 1396.91, 1318.51], bassWave:'sine', melodyWave:'sine', arpWave:'sine', bassGain:0.30, melodyGain:0.22, arpGain:0.14, reverb:0.45 },
  // 5: Ice Castle — A minor, 90 BPM, sparkling bell spires
  { bpm: 90, bassNotes: [110.00, 87.31, 130.81, 98.00, 110.00, 87.31, 130.81, 98.00], melodyNotes: [880.00, 1046.50, 1174.66, 1318.51, 1174.66, 1046.50, 880.00, 783.99], arpNotes: [1760.00, 2093.00, 2349.32, 2637.02, 2349.32, 2093.00, 1760.00, 1567.98], bassWave:'sine', melodyWave:'sine', arpWave:'sine', bassGain:0.25, melodyGain:0.18, arpGain:0.12, reverb:0.55 },
  // 6: Magma — E minor, 155 BPM, epic volcanic metal
  { bpm: 155, bassNotes: [82.41, 65.41, 73.42, 123.47, 82.41, 65.41, 73.42, 123.47], melodyNotes: [329.63, 349.23, 392.00, 329.63, 293.66, 349.23, 329.63, 261.63], arpNotes: [659.25, 698.46, 784.00, 659.25, 587.33, 698.46, 659.25, 523.25], bassWave:'sawtooth', melodyWave:'sawtooth', arpWave:'sawtooth', bassGain:0.35, melodyGain:0.24, arpGain:0.16, reverb:0.05 },
];

type LayerKind = 'bass' | 'melody' | 'arp';

// ── PCM rendering ────────────────────────────────────────────────────────────

async function renderLoop(theme: WorldTheme, layer: LayerKind): Promise<string> {
  const noteStep = 60 / theme.bpm;
  const stepsPerBar = 8;
  const bars = 2;
  const duration = noteStep * stepsPerBar * bars;
  const sampleRate = 22050;

  const offCtx = new OfflineAudioContext(1, Math.ceil(sampleRate * duration), sampleRate);

  const notes   = layer === 'bass' ? theme.bassNotes   : layer === 'melody' ? theme.melodyNotes   : theme.arpNotes;
  const wave    = layer === 'bass' ? theme.bassWave    : layer === 'melody' ? theme.melodyWave    : theme.arpWave;
  const gainAmt = layer === 'bass' ? theme.bassGain    : layer === 'melody' ? theme.melodyGain    : theme.arpGain;
  const noteDur = layer === 'arp'  ? noteStep * 0.48   : noteStep * 0.88;

  const masterGain = offCtx.createGain();
  masterGain.gain.value = gainAmt;

  const delay = offCtx.createDelay(0.6);
  const delayGain = offCtx.createGain();
  delay.delayTime.value = 0.22;
  delayGain.gain.value = theme.reverb * 0.35;
  masterGain.connect(delay);
  delay.connect(delayGain);
  delayGain.connect(delay);
  delayGain.connect(offCtx.destination);
  masterGain.connect(offCtx.destination);

  const shaper = offCtx.createWaveShaper();
  const shaperCurve = new Float32Array(256);
  for (let si = 0; si < 256; si++) {
    const x = (2 * si / 256) - 1;
    shaperCurve[si] = (Math.PI + 300) * x / (Math.PI + 300 * Math.abs(x));
  }
  shaper.curve = shaperCurve;
  shaper.oversample = '2x';

  const noteCount = stepsPerBar * bars;
  for (let i = 0; i < noteCount; i++) {
    const freq = notes[i % notes.length];
    if (!freq) continue;

    const startTime = i * noteStep;
    
    // DETUNING & DUAL OSCILLATORS:
    // Create two oscillators to give a fat analog synth sound!
    const osc1 = offCtx.createOscillator();
    const osc2 = offCtx.createOscillator();
    const oscMix = offCtx.createGain();
    const env = offCtx.createGain();
    const filter = offCtx.createBiquadFilter();

    osc1.type = wave;
    osc1.frequency.value = freq;
    
    osc2.type = wave;
    osc2.frequency.value = freq * 1.0046; // Detune second oscillator by 8 cents for chorus thickness

    // Animate vibrato pitch modulation on melody & arpeggios
    if (layer === 'melody' || layer === 'arp') {
      osc1.frequency.setValueAtTime(freq * 0.996, startTime);
      osc1.frequency.linearRampToValueAtTime(freq * 1.004, startTime + noteDur * 0.45);
      osc1.frequency.linearRampToValueAtTime(freq * 0.996, startTime + noteDur);
      
      osc2.frequency.setValueAtTime(freq * 1.0006, startTime);
      osc2.frequency.linearRampToValueAtTime(freq * 1.0086, startTime + noteDur * 0.45);
      osc2.frequency.linearRampToValueAtTime(freq * 1.0006, startTime + noteDur);
    }

    // Set filter configuration for juicy resonant lowpass sweeps
    filter.type = 'lowpass';
    filter.Q.value = layer === 'bass' ? 5.5 : 3.0; // high resonance
    filter.frequency.setValueAtTime(freq * 4.2, startTime);
    filter.frequency.exponentialRampToValueAtTime(freq * (layer === 'bass' ? 1.4 : 1.8), startTime + noteDur * 0.7);

    const attack  = layer === 'bass' ? 0.010 : layer === 'melody' ? 0.016 : 0.005;
    const release = layer === 'bass' ? 0.16  : layer === 'melody' ? 0.20  : 0.07;

    env.gain.setValueAtTime(0.0001, startTime);
    env.gain.linearRampToValueAtTime(0.5, startTime + attack);
    env.gain.setValueAtTime(0.5, startTime + noteDur - release);
    env.gain.exponentialRampToValueAtTime(0.0001, startTime + noteDur);

    // Connections: Osc1/Osc2 -> Mix -> Filter -> Env -> Shaper -> Master
    osc1.connect(oscMix);
    osc2.connect(oscMix);
    oscMix.connect(filter);
    filter.connect(env);
    env.connect(shaper);
    shaper.connect(masterGain);

    osc1.start(startTime);
    osc1.stop(startTime + noteDur + 0.01);
    osc2.start(startTime);
    osc2.stop(startTime + noteDur + 0.01);
  }

  const rendered = await offCtx.startRendering();
  return audioBufToWavDataURL(rendered);
}

function audioBufToWavDataURL(buf: AudioBuffer): string {
  const sampleRate = buf.sampleRate;
  const pcm        = buf.getChannelData(0);
  const numSamples = pcm.length;
  const byteCount  = numSamples * 2;

  const header = new ArrayBuffer(44);
  const hv = new DataView(header);
  const ws = (off: number, s: string) => { for (let i = 0; i < s.length; i++) hv.setUint8(off + i, s.charCodeAt(i)); };
  ws(0, 'RIFF'); hv.setUint32(4, 36 + byteCount, true);
  ws(8, 'WAVE'); ws(12, 'fmt '); hv.setUint32(16, 16, true);
  hv.setUint16(20, 1, true); hv.setUint16(22, 1, true);
  hv.setUint32(24, sampleRate, true); hv.setUint32(28, sampleRate * 2, true);
  hv.setUint16(32, 2, true); hv.setUint16(34, 16, true);
  ws(36, 'data'); hv.setUint32(40, byteCount, true);

  const samples = new Int16Array(numSamples);
  for (let i = 0; i < numSamples; i++) {
    samples[i] = Math.max(-32768, Math.min(32767, Math.round(pcm[i] * 32767)));
  }

  const combined = new Uint8Array(44 + byteCount);
  combined.set(new Uint8Array(header));
  combined.set(new Uint8Array(samples.buffer), 44);

  let binary = '';
  for (let i = 0; i < combined.length; i++) binary += String.fromCharCode(combined[i]);
  return 'data:audio/wav;base64,' + btoa(binary);
}

// ── AudioManager ─────────────────────────────────────────────────────────────

interface BGMLayer { howl: Howl; id: number | null; targetVol: number; }

class AudioManager {
  private ctx: AudioContext | null = null;
  private currentWorld = -1;
  private intensity: 0 | 1 | 2 = 1;
  private layers: { bass?: BGMLayer; melody?: BGMLayer; arp?: BGMLayer } = {};
  private renderedCache: Map<string, string> = new Map();
  private renderReady = false;

  constructor() {
    new Howl({
      src: ['data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA='],
      volume: 0,
      preload: true,
      html5: false
    });
    this.preRenderAllThemes().catch(() => { /* ignore if OfflineAudioContext unavailable */ });
  }

  private async preRenderAllThemes() {
    // 1. Render Menu Theme (World 0) immediately so the main menu boots instantly!
    try {
      const theme = WORLD_THEMES[0];
      for (const layer of ['bass', 'melody', 'arp'] as LayerKind[]) {
        const url = await renderLoop(theme, layer);
        this.renderedCache.set(`0-${layer}`, url);
      }
      this.renderReady = true;
      if (this.currentWorld === 0 || this.currentWorld === -1) {
        this.startHowlLayers(0);
      }
    } catch (e) {
      console.warn('Failed to render menu theme:', e);
    }

    // 2. Stagger-render remaining themes in background to eliminate startup freezing
    for (let w = 1; w < WORLD_THEMES.length; w++) {
      const theme = WORLD_THEMES[w];
      setTimeout(async () => {
        for (const layer of ['bass', 'melody', 'arp'] as LayerKind[]) {
          try {
            const url = await renderLoop(theme, layer);
            this.renderedCache.set(`${w}-${layer}`, url);
          } catch { /* ignore */ }
        }
        // Start layers if user is already playing this world
        if (this.currentWorld === w && !this.layers.bass) {
          this.startHowlLayers(w);
        }
      }, w * 300);
    }
  }

  private getCtx(): AudioContext {
    if ((Howler as any).ctx) this.ctx = (Howler as any).ctx as AudioContext;
    if (!this.ctx) this.ctx = new AudioContext();
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  private play(fn: (ctx: AudioContext) => void) {
    try { fn(this.getCtx()); } catch { /* ignore */ }
  }

  // ── BGM ──────────────────────────────────────────────────────────────────

  playBGM(worldIndex = 0) {
    if (GameData_muted()) return;
    const wi = Math.max(0, Math.min(worldIndex, WORLD_THEMES.length - 1));
    if (wi === this.currentWorld) return;
    this.currentWorld = wi;
    this.fadeOutAll(400, () => {
      if (this.renderReady) this.startHowlLayers(wi);
    });
  }

  private startHowlLayers(wi: number) {
    this.layers = {};
    for (const layer of ['bass', 'melody', 'arp'] as LayerKind[]) {
      const url = this.renderedCache.get(`${wi}-${layer}`);
      if (!url) continue;
      const targetVol = this.layerVolume(layer, this.intensity);
      const howl = new Howl({ src: [url], loop: true, volume: 0, html5: false, preload: true });
      const id = howl.play();
      howl.fade(0, targetVol, 600, id ?? undefined);
      this.layers[layer] = { howl, id: id ?? null, targetVol };
    }
  }

  private layerVolume(layer: LayerKind, intensity: 0 | 1 | 2): number {
    if (intensity === 0) return layer === 'bass' ? 0.85 : 0;
    if (intensity === 1) return layer === 'arp'  ? 0    : (layer === 'bass' ? 0.85 : 0.75);
    return layer === 'bass' ? 0.85 : layer === 'melody' ? 0.75 : 0.65;
  }

  setBGMIntensity(level: 0 | 1 | 2) {
    if (this.intensity === level) return;
    this.intensity = level;
    for (const ln of ['bass', 'melody', 'arp'] as LayerKind[]) {
      const layer = this.layers[ln];
      if (!layer || layer.id === null) continue;
      const vol = this.layerVolume(ln, level);
      layer.howl.fade(layer.howl.volume(layer.id) as number, vol, 500, layer.id);
      layer.targetVol = vol;
    }
  }

  stopBGM() {
    this.fadeOutAll(400, () => { this.currentWorld = -1; });
  }

  private fadeOutAll(ms: number, onComplete?: () => void) {
    const active = Object.values(this.layers).filter((l): l is BGMLayer => !!l);
    if (active.length === 0) { onComplete?.(); return; }
    let done = 0;
    for (const layer of active) {
      if (layer.id !== null) {
        const cur = layer.howl.volume(layer.id) as number;
        layer.howl.fade(cur, 0, ms, layer.id);
        layer.howl.once('fade', () => {
          layer.howl.stop(layer.id ?? undefined);
          done++;
          if (done === active.length) onComplete?.();
        }, layer.id);
      } else { done++; if (done === active.length) onComplete?.(); }
    }
    this.layers = {};
  }

  // ── SFX ──────────────────────────────────────────────────────────────────

  playTap() {
    this.play(ctx => {
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.type = 'sine'; o.frequency.setValueAtTime(620, ctx.currentTime);
      o.frequency.exponentialRampToValueAtTime(950, ctx.currentTime + 0.07);
      g.gain.setValueAtTime(0.18, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.10);
      o.start(); o.stop(ctx.currentTime + 0.10);
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
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.20);
      o.start(); o.stop(ctx.currentTime + 0.20);
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
      src.start(); src.stop(ctx.currentTime + 0.40);

      const o = ctx.createOscillator(); const g2 = ctx.createGain();
      o.connect(g2); g2.connect(ctx.destination);
      o.type = 'sine'; o.frequency.setValueAtTime(80, ctx.currentTime);
      o.frequency.exponentialRampToValueAtTime(25, ctx.currentTime + 0.25);
      g2.gain.setValueAtTime(0.40, ctx.currentTime);
      g2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.30);
      o.start(); o.stop(ctx.currentTime + 0.30);
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
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.type = 'sine'; o.frequency.setValueAtTime(200, ctx.currentTime);
      o.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.08);
      g.gain.setValueAtTime(0.25, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.10);
      o.start(); o.stop(ctx.currentTime + 0.10);

      [1047, 1319, 1568, 2093].forEach((freq, i) => {
        const o2 = ctx.createOscillator(); const g2 = ctx.createGain();
        o2.connect(g2); g2.connect(ctx.destination);
        o2.type = 'sine'; o2.frequency.value = freq;
        g2.gain.setValueAtTime(0, ctx.currentTime + 0.08 + i * 0.06);
        g2.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.10 + i * 0.06);
        g2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.20 + i * 0.06);
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
        const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1500;
        o.connect(f); f.connect(g); g.connect(ctx.destination);
        o.type = 'sawtooth';
        const start = ctx.currentTime + i * 0.05;
        o.frequency.setValueAtTime(250 * mult, start);
        o.frequency.exponentialRampToValueAtTime(800 * mult, start + 0.18);
        g.gain.setValueAtTime(0.10, start);
        g.gain.exponentialRampToValueAtTime(0.001, start + 0.20);
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
        o.stop(ctx.currentTime + i * 0.11 + 0.30);
      });
      [523, 659, 784].forEach(freq => {
        const o = ctx.createOscillator(); const g = ctx.createGain();
        o.connect(g); g.connect(ctx.destination);
        o.type = 'sine'; o.frequency.value = freq;
        g.gain.setValueAtTime(0, ctx.currentTime + 0.75);
        g.gain.linearRampToValueAtTime(0.14, ctx.currentTime + 0.80);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.60);
        o.start(ctx.currentTime + 0.75); o.stop(ctx.currentTime + 1.65);
      });
    });
  }

  // ── NEW SFX ──────────────────────────────────────────────────────────────

  /** Escalating chord sweep for combo x2, x3, x4, x5+ */
  playComboFanfare(comboCount: number) {
    this.play(ctx => {
      const now = ctx.currentTime;
      const chordSets = [
        [659, 784, 1047],
        [698, 880, 1175],
        [784, 1047, 1319],
        [880, 1175, 1480, 1760],
      ];
      const tier = Math.min(comboCount - 2, chordSets.length - 1);
      const chord = chordSets[Math.max(0, tier)];
      const boost = 1 + (comboCount - 2) * 0.08;

      chord.forEach((freq, i) => {
        const o = ctx.createOscillator(); const g = ctx.createGain();
        o.connect(g); g.connect(ctx.destination);
        o.type = 'triangle';
        o.frequency.setValueAtTime(freq * boost, now + i * 0.035);
        o.frequency.exponentialRampToValueAtTime(freq * boost * 1.015, now + i * 0.035 + 0.18);
        g.gain.setValueAtTime(0.001, now + i * 0.035);
        g.gain.linearRampToValueAtTime(0.16, now + i * 0.035 + 0.03);
        g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.035 + 0.28);
        o.start(now + i * 0.035);
        o.stop(now + i * 0.035 + 0.30);
      });

      const sweep = ctx.createOscillator(); const swG = ctx.createGain();
      sweep.connect(swG); swG.connect(ctx.destination);
      sweep.type = 'sine';
      sweep.frequency.setValueAtTime(300 * boost, now);
      sweep.frequency.exponentialRampToValueAtTime(1800 * boost, now + 0.18);
      swG.gain.setValueAtTime(0.12, now);
      swG.gain.exponentialRampToValueAtTime(0.001, now + 0.20);
      sweep.start(now); sweep.stop(now + 0.22);
    });
  }

  /** Short ascending arp when a level starts */
  playLevelStart() {
    this.play(ctx => {
      [392, 494, 587, 784].forEach((freq, i) => {
        const o = ctx.createOscillator(); const g = ctx.createGain();
        o.connect(g); g.connect(ctx.destination);
        o.type = 'sine'; o.frequency.value = freq;
        const t = ctx.currentTime + i * 0.09;
        g.gain.setValueAtTime(0.001, t);
        g.gain.linearRampToValueAtTime(0.16, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
        o.start(t); o.stop(t + 0.18);
      });
    });
  }

  /** Descending minor chord for defeat / out of moves */
  playDefeat() {
    this.play(ctx => {
      const now = ctx.currentTime;
      [440, 523, 659].forEach((freq, i) => {
        const o = ctx.createOscillator(); const g = ctx.createGain();
        o.connect(g); g.connect(ctx.destination);
        o.type = 'triangle';
        const t = now + i * 0.12;
        o.frequency.setValueAtTime(freq, t);
        o.frequency.exponentialRampToValueAtTime(freq * 0.85, t + 0.50);
        g.gain.setValueAtTime(0.14, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.60);
        o.start(t); o.stop(t + 0.65);
      });
      const thud = ctx.createOscillator(); const tG = ctx.createGain();
      thud.connect(tG); tG.connect(ctx.destination);
      thud.type = 'sine';
      thud.frequency.setValueAtTime(100, now + 0.42);
      thud.frequency.exponentialRampToValueAtTime(35, now + 0.80);
      tG.gain.setValueAtTime(0.30, now + 0.42);
      tG.gain.exponentialRampToValueAtTime(0.001, now + 0.85);
      thud.start(now + 0.42); thud.stop(now + 0.90);
    });
  }

  /** 1/2/3-star jingle variants */
  playStarEarn(stars: 1 | 2 | 3) {
    this.play(ctx => {
      const now = ctx.currentTime;
      const notesets: number[][] = [
        [523, 659],
        [523, 659, 784, 1047],
        [523, 659, 784, 1047, 1319, 1568],
      ];
      const notes = notesets[Math.min(stars - 1, 2)];
      notes.forEach((freq, i) => {
        const o = ctx.createOscillator(); const g = ctx.createGain();
        o.connect(g); g.connect(ctx.destination);
        o.type = stars === 3 ? 'triangle' : 'sine';
        o.frequency.value = freq;
        const t = now + i * (stars === 3 ? 0.09 : 0.08);
        g.gain.setValueAtTime(0.001, t);
        g.gain.linearRampToValueAtTime(0.18, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.001, t + (stars === 3 ? 0.22 : 0.16));
        o.start(t); o.stop(t + 0.25);
      });
      if (stars === 3) {
        [1047, 1319, 1568].forEach((freq, i) => {
          const o = ctx.createOscillator(); const g = ctx.createGain();
          o.connect(g); g.connect(ctx.destination);
          o.type = 'sine'; o.frequency.value = freq;
          const t = now + 0.55 + i * 0.06;
          g.gain.setValueAtTime(0.001, t);
          g.gain.linearRampToValueAtTime(0.14, t + 0.02);
          g.gain.exponentialRampToValueAtTime(0.001, t + 0.30);
          o.start(t); o.stop(t + 0.34);
        });
      }
    });
  }

  // ── World material SFX ────────────────────────────────────────────────────

  playMaterialLaunch(worldIndex: number) {
    this.play(ctx => {
      const now = ctx.currentTime;
      switch (worldIndex) {
        case 1: {
          const o = ctx.createOscillator(); const g = ctx.createGain();
          o.connect(g); g.connect(ctx.destination);
          o.type = 'sine';
          o.frequency.setValueAtTime(320, now);
          o.frequency.exponentialRampToValueAtTime(750, now + 0.14);
          g.gain.setValueAtTime(0.20, now);
          g.gain.exponentialRampToValueAtTime(0.001, now + 0.20);
          o.start(); o.stop(now + 0.20);
          break;
        }
        case 2: {
          const o = ctx.createOscillator(); const g = ctx.createGain();
          o.connect(g); g.connect(ctx.destination);
          o.type = 'triangle';
          o.frequency.setValueAtTime(200, now);
          o.frequency.exponentialRampToValueAtTime(80, now + 0.08);
          g.gain.setValueAtTime(0.25, now);
          g.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
          o.start(); o.stop(now + 0.10);
          break;
        }
        case 3: {
          [650, 950, 1400].forEach((freq, idx) => {
            const o = ctx.createOscillator(); const g = ctx.createGain();
            o.connect(g); g.connect(ctx.destination);
            o.type = idx === 0 ? 'triangle' : 'sine';
            o.frequency.setValueAtTime(freq, now);
            o.frequency.linearRampToValueAtTime(freq * 0.95, now + 0.25);
            g.gain.setValueAtTime(0.12, now);
            g.gain.exponentialRampToValueAtTime(0.001, now + 0.26);
            o.start(); o.stop(now + 0.26);
          });
          break;
        }
        case 4: {
          const o = ctx.createOscillator(); const g = ctx.createGain();
          o.connect(g); g.connect(ctx.destination);
          o.type = 'sine';
          o.frequency.setValueAtTime(500, now);
          o.frequency.exponentialRampToValueAtTime(1300, now + 0.16);
          g.gain.setValueAtTime(0.18, now);
          g.gain.exponentialRampToValueAtTime(0.001, now + 0.17);
          o.start(); o.stop(now + 0.17);
          break;
        }
        case 5: {
          [1200, 1600].forEach(freq => {
            const o = ctx.createOscillator(); const g = ctx.createGain();
            o.connect(g); g.connect(ctx.destination);
            o.type = 'sine';
            o.frequency.setValueAtTime(freq, now);
            o.frequency.exponentialRampToValueAtTime(freq + 400, now + 0.05);
            o.frequency.exponentialRampToValueAtTime(freq * 0.5, now + 0.20);
            g.gain.setValueAtTime(0.10, now);
            g.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
            o.start(); o.stop(now + 0.22);
          });
          const sz = ctx.sampleRate * 0.06;
          const buf = ctx.createBuffer(1, sz, ctx.sampleRate);
          const dat = buf.getChannelData(0);
          for (let i = 0; i < sz; i++) dat[i] = Math.random() * 2 - 1;
          const src = ctx.createBufferSource(); src.buffer = buf;
          const flt = ctx.createBiquadFilter(); flt.type = 'highpass'; flt.frequency.value = 3000;
          const g2 = ctx.createGain();
          src.connect(flt); flt.connect(g2); g2.connect(ctx.destination);
          g2.gain.setValueAtTime(0.15, now);
          g2.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
          src.start(); src.stop(now + 0.06);
          break;
        }
        case 6: {
          const o = ctx.createOscillator(); const g = ctx.createGain();
          o.connect(g); g.connect(ctx.destination);
          o.type = 'sawtooth';
          o.frequency.setValueAtTime(120, now);
          o.frequency.exponentialRampToValueAtTime(30, now + 0.22);
          g.gain.setValueAtTime(0.28, now);
          g.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
          o.start(); o.stop(now + 0.25);

          const sz2 = ctx.sampleRate * 0.25;
          const buf2 = ctx.createBuffer(1, sz2, ctx.sampleRate);
          const dat2 = buf2.getChannelData(0);
          for (let i = 0; i < sz2; i++) dat2[i] = Math.random() * 2 - 1;
          const src2 = ctx.createBufferSource(); src2.buffer = buf2;
          const flt2 = ctx.createBiquadFilter(); flt2.type = 'lowpass'; flt2.frequency.value = 450;
          const g3 = ctx.createGain();
          src2.connect(flt2); flt2.connect(g3); g3.connect(ctx.destination);
          g3.gain.setValueAtTime(0.35, now);
          g3.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
          src2.start(); src2.stop(now + 0.25);
          break;
        }
        default: this.playLaunch();
      }
    });
  }

  playMaterialBump(worldIndex: number) {
    this.play(ctx => {
      const now = ctx.currentTime;
      switch (worldIndex) {
        case 1: {
          const o = ctx.createOscillator(); const g = ctx.createGain();
          o.connect(g); g.connect(ctx.destination);
          o.type = 'sine';
          o.frequency.setValueAtTime(150, now);
          o.frequency.exponentialRampToValueAtTime(220, now + 0.08);
          o.frequency.exponentialRampToValueAtTime(100, now + 0.16);
          g.gain.setValueAtTime(0.18, now);
          g.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
          o.start(); o.stop(now + 0.16);
          break;
        }
        case 2: {
          const o = ctx.createOscillator(); const g = ctx.createGain();
          o.connect(g); g.connect(ctx.destination);
          o.type = 'triangle';
          o.frequency.setValueAtTime(140, now);
          o.frequency.setValueAtTime(90, now + 0.03);
          g.gain.setValueAtTime(0.20, now);
          g.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
          o.start(); o.stop(now + 0.06);
          break;
        }
        case 3: {
          const o = ctx.createOscillator(); const g = ctx.createGain();
          o.connect(g); g.connect(ctx.destination);
          o.type = 'triangle';
          o.frequency.setValueAtTime(600, now);
          o.frequency.setValueAtTime(450, now + 0.03);
          o.frequency.setValueAtTime(800, now + 0.06);
          g.gain.setValueAtTime(0.12, now);
          g.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
          o.start(); o.stop(now + 0.08);
          break;
        }
        case 4: {
          const o = ctx.createOscillator(); const g = ctx.createGain();
          o.connect(g); g.connect(ctx.destination);
          o.type = 'sine';
          o.frequency.setValueAtTime(400, now);
          o.frequency.exponentialRampToValueAtTime(250, now + 0.10);
          g.gain.setValueAtTime(0.14, now);
          g.gain.exponentialRampToValueAtTime(0.001, now + 0.10);
          o.start(); o.stop(now + 0.10);
          break;
        }
        case 5: {
          const o = ctx.createOscillator(); const g = ctx.createGain();
          o.connect(g); g.connect(ctx.destination);
          o.type = 'sine';
          o.frequency.setValueAtTime(2000, now);
          g.gain.setValueAtTime(0.08, now);
          g.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
          o.start(); o.stop(now + 0.04);
          break;
        }
        case 6: {
          const o = ctx.createOscillator(); const g = ctx.createGain();
          o.connect(g); g.connect(ctx.destination);
          o.type = 'triangle';
          o.frequency.setValueAtTime(90, now);
          o.frequency.exponentialRampToValueAtTime(40, now + 0.15);
          g.gain.setValueAtTime(0.24, now);
          g.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
          o.start(); o.stop(now + 0.15);
          break;
        }
        default: this.playBump();
      }
    });
  }
}

function GameData_muted(): boolean {
  try { return localStorage.getItem('arrow_buddies_muted') === 'true'; } catch { return false; }
}

export const audio = new AudioManager();
