/* PhaserMock.ts — Mock Phaser APIs to facilitate GameScene transition to Babylon.js */
import { TweenManager } from './TweenManager';
import { CameraEffects } from './CameraEffects';
import { SceneManager } from './SceneManager';
import { BabylonEngine } from './BabylonEngine';
import { ArcRotateCamera } from '@babylonjs/core';

export class PhaserMock {
  add = {
    graphics: (...args: any[]) => ({
      setDepth: (...args: any[]) => this.add.graphics(),
      clear: (...args: any[]) => this.add.graphics(),
      fillStyle: (...args: any[]) => this.add.graphics(),
      fillRect: (...args: any[]) => this.add.graphics(),
      lineStyle: (...args: any[]) => this.add.graphics(),
      lineBetween: (...args: any[]) => this.add.graphics(),
      beginPath: (...args: any[]) => this.add.graphics(),
      moveTo: (...args: any[]) => this.add.graphics(),
      lineTo: (...args: any[]) => this.add.graphics(),
      closePath: (...args: any[]) => this.add.graphics(),
      fillPath: (...args: any[]) => this.add.graphics(),
      strokePath: (...args: any[]) => this.add.graphics(),
      fillGradientStyle: (...args: any[]) => this.add.graphics(),
      fillEllipse: (...args: any[]) => this.add.graphics(),
      strokeEllipse: (...args: any[]) => this.add.graphics(),
      fillCircle: (...args: any[]) => this.add.graphics()
    }) as any,
    text: (...args: any[]) => ({
      setText: (...args: any[]) => this.add.text(),
      setOrigin: (...args: any[]) => this.add.text(),
      setDepth: (...args: any[]) => this.add.text(),
      setAlpha: (...args: any[]) => this.add.text(),
      setScale: (...args: any[]) => this.add.text(),
      setColor: (...args: any[]) => this.add.text()
    }) as any,
    particles: (...args: any[]) => ({
      createEmitter: (...args: any[]) => ({
        setParticleTint: (...args: any[]) => {},
        explode: (...args: any[]) => {}
      })
    }) as any
  };
  
  tweens = {
    add: (cfg: any) => TweenManager.add(cfg),
    killTweensOf: (target: any) => TweenManager.killTweensOf(target)
  };
  
  cameras = {
    main: {
      shake: (duration: number, intensity: number) => {
        const cam = BabylonEngine.getInstance().getScene()?.activeCamera as ArcRotateCamera;
        if (cam) CameraEffects.shake(cam, duration, intensity);
      },
      flash: (duration: number) => {
        const scene = BabylonEngine.getInstance().getScene();
        if (scene) CameraEffects.flash(scene, duration);
      },
      fadeOut: (duration: number) => {
        const scene = BabylonEngine.getInstance().getScene();
        if (scene) CameraEffects.fadeOut(scene, duration);
      },
      zoomTo: (zoom: number, duration: number) => {},
      centerX: window.innerWidth / 2,
      centerY: window.innerHeight / 2
    } as any
  };

  time = {
    now: performance.now(),
    delayedCall: (delay: number, callback: () => void) => TweenManager.delayedCall(delay, callback)
  };

  input = {
    on: (...args: any[]) => {},
    keyboard: { 
      createCursorKeys: () => ({ 
        left: { isDown: false }, right: { isDown: false }, 
        up: { isDown: false }, down: { isDown: false } 
      }),
      on: (...args: any[]) => {}
    },
    pointer1: { isDown: false, x: 0, y: 0 },
    pointer2: { isDown: false, x: 0, y: 0 },
    activePointer: { isDown: false, x: 0, y: 0 }
  };

  scene = {
    start: (key: string, data?: any) => SceneManager.start(key, data),
    restart: (data?: any) => SceneManager.start('Game', data),
    launch: (key: string, data?: any) => SceneManager.start(key, data),
    pause: () => SceneManager.pause()
  };

  scale = {
    width: window.innerWidth,
    height: window.innerHeight
  };
  
  events = {
    on: (...args: any[]) => {}
  }
}

export const PhaserMath = {
  Clamp: (val: number, min: number, max: number) => Math.max(min, Math.min(max, val)),
  Linear: (p0: number, p1: number, t: number) => p0 + (p1 - p0) * t,
  Distance: {
    Between: (x1: number, y1: number, x2: number, y2: number) => Math.hypot(x2 - x1, y2 - y1)
  }
};
