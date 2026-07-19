/* PhaserTypes.d.ts — Mocks Phaser types so we don't need the package installed */
declare namespace Phaser {
  export namespace GameObjects {
    export type Graphics = any;
    export type Text = any;
    export type Container = any;
    export type Zone = any;
    export type Image = any;
    export type Sprite = any;
    export namespace Particles {
      export type ParticleEmitterManager = any;
      export type ParticleEmitter = any;
    }
  }
  export namespace Input {
    export type Pointer = any;
  }
  export namespace Tweens {
    export type Tween = any;
  }
  export namespace Math {
    export namespace Distance {
      export function Between(x1: number, y1: number, x2: number, y2: number): number;
    }
  }
  export class Scene {
    constructor(config: any);
  }
  export namespace Structs {
    export type Size = any;
  }
  export namespace Scenes {
    export type SceneManager = any;
  }
}
