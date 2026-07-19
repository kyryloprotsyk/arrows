/* BabylonEngine.ts — Performance-optimised, mobile-first Babylon.js engine */
import { Engine, Scene, Color4 } from '@babylonjs/core';
import { SceneManager } from './SceneManager';
import { TweenManager } from './TweenManager';
import { InputManager } from './InputManager';

/** True if running on a mobile / tablet device */
export function isMobileDevice(): boolean {
  return /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent)
    || (navigator.maxTouchPoints > 1 && window.innerWidth < 1024);
}

export class BabylonEngine {
  private static instance: BabylonEngine | null = null;
  private engine: Engine | null = null;
  private scene: Scene | null = null;
  private canvasElement: HTMLCanvasElement | null = null;

  private constructor() {}

  static getInstance(): BabylonEngine {
    if (!BabylonEngine.instance) {
      BabylonEngine.instance = new BabylonEngine();
    }
    return BabylonEngine.instance;
  }

  init(canvas: HTMLCanvasElement): Scene {
    if (this.engine) return this.scene!;

    this.canvasElement = canvas;

    const mobile = isMobileDevice();

    this.engine = new Engine(canvas, !mobile /* antialias off on mobile */, {
      preserveDrawingBuffer: false,
      stencil: false,
      antialias: !mobile,
      powerPreference: 'high-performance',
      // Limit texture size on mobile
      limitDeviceRatio: mobile ? 1.5 : window.devicePixelRatio
    });

    // Hardware scaling: render at 75 % on mobile for huge perf gains
    if (mobile) {
      this.engine.setHardwareScalingLevel(1 / 0.75);
    }

    this.scene = new Scene(this.engine);
    this.scene.clearColor = new Color4(0.04, 0, 0.1, 1);

    // Optimisations active for every scene
    this.scene.autoClear = true;
    this.scene.autoClearDepthAndStencil = true;
    this.scene.skipFrustumClipping = false;
    // Freeze materials that don't change each frame (BabylonBackground calls thaw when needed)
    this.scene.blockMaterialDirtyMechanism = false;

    SceneManager.setScene(this.scene);
    this.scene.attachControl();
    InputManager.init(canvas);

    // ── Render loop ───────────────────────────────────────────────────────
    let lastTime = performance.now();
    this.engine.runRenderLoop(() => {
      const now  = performance.now();
      const dt   = Math.min((now - lastTime) / 1000, 0.05); // cap at 50 ms
      lastTime   = now;

      TweenManager.update(dt);

      if (!SceneManager.isPaused()) {
        SceneManager.tick(dt, now);
      }

      // Only render if a camera is active to avoid transitions crashing the loop
      if (this.scene && this.scene.activeCamera) {
        this.scene.render();
      }
    });

    window.addEventListener('resize', this.handleResize);
    return this.scene;
  }

  private handleResize = () => {
    if (this.engine) this.engine.resize();
  };

  getScene(): Scene | null  { return this.scene; }
  getEngine(): Engine | null { return this.engine; }

  suspend() {
    if (this.engine) {
      this.engine.stopRenderLoop();
      if (this.canvasElement) this.canvasElement.style.display = 'none';
    }
  }

  resume() {
    if (this.engine) {
      if (this.canvasElement) this.canvasElement.style.display = 'block';
      this.engine.resize();
      this.engine.runRenderLoop(() => {
        if (this.scene && this.scene.activeCamera) this.scene.render();
      });
    }
  }

  dispose() {
    window.removeEventListener('resize', this.handleResize);
    InputManager.destroy();
    this.scene?.dispose();
    this.engine?.dispose();
    this.scene = null;
    this.engine = null;
    this.canvasElement = null;
    BabylonEngine.instance = null;
  }
}
