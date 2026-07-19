/* TweenManager.ts — Simple property tween system for pure Babylon.js */

type EasingFunction = (t: number) => number;

export const Easing = {
  Linear: (t: number) => t,
  QuadIn: (t: number) => t * t,
  QuadOut: (t: number) => t * (2 - t),
  QuadInOut: (t: number) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
  SineInOut: (t: number) => -(Math.cos(Math.PI * t) - 1) / 2,
  BackOut: (t: number) => {
    const s = 1.70158;
    return --t * t * ((s + 1) * t + s) + 1;
  },
  ExpoOut: (t: number) => t === 1 ? 1 : 1 - Math.pow(2, -10 * t)
};

export interface TweenConfig {
  targets: any | any[];
  duration?: number; // milliseconds
  delay?: number;
  ease?: string | EasingFunction;
  yoyo?: boolean;
  repeat?: number; // -1 for infinite
  onUpdate?: () => void;
  onComplete?: () => void;
  [prop: string]: any; // Properties to animate
}

class Tween {
  private targets: any[];
  private duration: number;
  private delay: number;
  private ease: EasingFunction;
  private yoyo: boolean;
  private repeat: number;
  private onUpdate?: () => void;
  private onComplete?: () => void;
  
  private props: { [key: string]: number } = {};
  private startVals: Map<any, { [key: string]: number }> = new Map();
  private elapsed: number = 0;
  private loopCount: number = 0;
  private isYoyoBack: boolean = false;
  private state: 'delayed' | 'playing' | 'completed' = 'playing';

  constructor(config: TweenConfig) {
    this.targets = Array.isArray(config.targets) ? config.targets : [config.targets];
    this.duration = config.duration ?? 1000;
    this.delay = config.delay ?? 0;
    this.yoyo = config.yoyo ?? false;
    this.repeat = config.repeat ?? 0;
    this.onUpdate = config.onUpdate;
    this.onComplete = config.onComplete;

    if (this.delay > 0) this.state = 'delayed';

    if (typeof config.ease === 'string') {
      const easeName = config.ease.replace('.', ''); // e.g. 'Quad.easeOut' -> 'QuadeaseOut'
      if (easeName.toLowerCase().includes('backout')) this.ease = Easing.BackOut;
      else if (easeName.toLowerCase().includes('quadinout')) this.ease = Easing.QuadInOut;
      else if (easeName.toLowerCase().includes('quadout')) this.ease = Easing.QuadOut;
      else if (easeName.toLowerCase().includes('quadin')) this.ease = Easing.QuadIn;
      else if (easeName.toLowerCase().includes('sineinout')) this.ease = Easing.SineInOut;
      else if (easeName.toLowerCase().includes('expoout')) this.ease = Easing.ExpoOut;
      else this.ease = Easing.Linear;
    } else {
      this.ease = config.ease ?? Easing.Linear;
    }

    // Extract properties to animate
    for (const key in config) {
      if (['targets', 'duration', 'delay', 'ease', 'yoyo', 'repeat', 'onUpdate', 'onComplete'].includes(key)) continue;
      if (typeof config[key] === 'number') {
        this.props[key] = config[key];
      }
    }

    // Record start values
    for (const target of this.targets) {
      const initial: { [key: string]: number } = {};
      for (const key in this.props) {
        initial[key] = target[key] ?? 0;
      }
      this.startVals.set(target, initial);
    }
  }

  update(dt: number): boolean {
    if (this.state === 'completed') return true;

    if (this.state === 'delayed') {
      this.elapsed += dt * 1000;
      if (this.elapsed >= this.delay) {
        this.state = 'playing';
        this.elapsed -= this.delay;
      } else {
        return false;
      }
    }

    this.elapsed += dt * 1000;
    let t = Math.min(this.elapsed / this.duration, 1.0);
    
    let easedT = this.ease(this.isYoyoBack ? 1.0 - t : t);

    for (const target of this.targets) {
      const initial = this.startVals.get(target)!;
      for (const key in this.props) {
        const start = initial[key];
        const end = this.props[key];
        target[key] = start + (end - start) * easedT;
      }
    }

    if (this.onUpdate) this.onUpdate();

    if (t >= 1.0) {
      if (this.yoyo && !this.isYoyoBack) {
        this.isYoyoBack = true;
        this.elapsed = 0;
        return false;
      }

      if (this.repeat === -1 || this.loopCount < this.repeat) {
        this.loopCount++;
        this.elapsed = 0;
        this.isYoyoBack = false;
        return false;
      }

      this.state = 'completed';
      if (this.onComplete) this.onComplete();
      return true;
    }

    return false;
  }
}

export class TweenManager {
  private static tweens: Tween[] = [];
  private static delayedCalls: { timer: number, delay: number, callback: () => void }[] = [];

  static add(config: TweenConfig): Tween {
    const tween = new Tween(config);
    this.tweens.push(tween);
    return tween;
  }

  static killTweensOf(target: any) {
    this.tweens = this.tweens.filter(t => !(t as any).targets.includes(target));
  }

  static delayedCall(delayMs: number, callback: () => void) {
    this.delayedCalls.push({ timer: 0, delay: delayMs, callback });
  }

  static clearAll() {
    this.tweens = [];
    this.delayedCalls = [];
  }

  static update(dt: number) {
    // dt is in seconds
    for (let i = this.tweens.length - 1; i >= 0; i--) {
      if (this.tweens[i].update(dt)) {
        this.tweens.splice(i, 1);
      }
    }

    for (let i = this.delayedCalls.length - 1; i >= 0; i--) {
      const call = this.delayedCalls[i];
      call.timer += dt * 1000;
      if (call.timer >= call.delay) {
        call.callback();
        this.delayedCalls.splice(i, 1);
      }
    }
  }
}
