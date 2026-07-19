/* SceneManager.ts — Pure Babylon.js scene lifecycle manager */
import { Scene, FreeCamera, Vector3 } from '@babylonjs/core';

export interface IGameScene {
  key?: string;
  init?(data: any): void;
  create(scene: Scene, data?: any): void | Promise<void>;
  update?(dt: number, time: number): void;
  destroy?(): void;
}

type SceneConstructor = new () => IGameScene;

export class SceneManager {
  private static registry: Map<string, SceneConstructor> = new Map();
  private static current:  IGameScene | null = null;
  private static scene:    Scene | null = null;
  private static updateListeners: Set<(dt: number, t: number) => void> = new Set();

  static setScene(scene: Scene) { this.scene = scene; }

  static register(key: string, ctor: SceneConstructor) {
    this.registry.set(key, ctor);
  }

  static getCurrent(): IGameScene | null { return this.current; }

  static addUpdateListener(fn: (dt: number, t: number) => void) {
    this.updateListeners.add(fn);
  }

  static removeUpdateListener(fn: (dt: number, t: number) => void) {
    this.updateListeners.delete(fn);
  }

  static async start(key: string, data?: any) {
    if (!this.scene) throw new Error('SceneManager: no Babylon Scene set');

    // ── 1. Tear down current scene ─────────────────────────────────────────
    if (this.current?.destroy) this.current.destroy();
    this.current = null;
    this.updateListeners.clear();

    // ── 2. Dispose all Babylon objects from the previous scene ─────────────
    [...this.scene.meshes].forEach(m => m.dispose());
    [...this.scene.lights].forEach(l => l.dispose());
    [...this.scene.cameras].forEach(c => c.dispose());
    [...this.scene.particleSystems].forEach(p => p.dispose());
    [...this.scene.materials].forEach(m => m.dispose());
    [...this.scene.textures].forEach(t => {
      // Don't dispose AdvancedDynamicTexture here — BabylonGUI.clearAll() handles those
      if (!(t as any)._isFullscreenUI && !(t as any).getScene) {
        try { t.dispose(); } catch { /* ok */ }
      }
    });
    this.scene.activeCamera = null;

    // ── 3. Clear GUI layer (disposes EVERY tracked AdvancedDynamicTexture) ──
    const { BabylonGUI } = await import('./BabylonGUI');
    BabylonGUI.clearAll();

    // ── 4. Clear all active tweens ─────────────────────────────────────────
    const { TweenManager } = await import('./TweenManager');
    TweenManager.clearAll();

    // ── 5. Install a default orthographic GUI camera ────────────────────────
    //    This guarantees the render loop fires for GUI-only scenes.
    //    Scenes that need 3D (GameScene, MenuScene, etc.) will replace this
    //    camera when they call BabylonBackground.initScene().
    const guiCam = new FreeCamera('_gui_cam', new Vector3(0, 0, -10), this.scene);
    guiCam.setTarget(Vector3.Zero());
    this.scene.activeCamera = guiCam;

    // ── 6. Instantiate and run new scene ───────────────────────────────────
    const Ctor = this.registry.get(key);
    if (!Ctor) throw new Error(`SceneManager: no scene registered for key "${key}"`);
    const instance = new Ctor();

    if (instance.init) instance.init(data ?? {});
    this.current = instance;
    await instance.create(this.scene, data ?? {});
  }

  /** Called from the engine's render loop each frame */
  static tick(dt: number, time: number) {
    if (!this.paused) {
      this.current?.update?.(dt, time);
      this.updateListeners.forEach(fn => fn(dt, time));
    }
  }

  // ── Pause / resume ─────────────────────────────────────────────────────
  private static paused = false;
  private static pausedScene: IGameScene | null = null;

  static pause() {
    this.paused      = true;
    this.pausedScene = this.current;
  }

  static resume() {
    this.paused      = false;
    this.current     = this.pausedScene;
    this.pausedScene = null;
  }

  static isPaused() { return this.paused; }
}
