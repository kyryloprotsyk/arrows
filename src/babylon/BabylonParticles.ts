import { Scene, Vector3, ParticleSystem, Color4, DynamicTexture, Texture } from '@babylonjs/core';

export class BabylonParticles {
  private static dotTexture: Texture | null = null;

  private static getDotTexture(scene: Scene): Texture {
    if (!this.dotTexture || this.dotTexture.getScene() !== scene) {
      const size = 32;
      const tex = new DynamicTexture("dot_tex", size, scene, false);
      const ctx = tex.getContext();
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2 - 1, 0, Math.PI * 2);
      ctx.fill();
      tex.update();
      this.dotTexture = tex;
    }
    return this.dotTexture;
  }

  private static hexToColor4(hex: number, alpha = 1.0): Color4 {
    const r = ((hex >> 16) & 0xff) / 255;
    const g = ((hex >> 8) & 0xff) / 255;
    const b = (hex & 0xff) / 255;
    return new Color4(r, g, b, alpha);
  }

  static shatterBurst(scene: Scene, position: Vector3, colorHex: number) {
    const tex = this.getDotTexture(scene);
    const system = new ParticleSystem("shatter", 40, scene);
    system.particleTexture = tex;
    system.emitter = position.clone();
    
    const col = this.hexToColor4(colorHex);
    system.color1 = col;
    system.color2 = col;
    system.colorDead = new Color4(col.r, col.g, col.b, 0.0);

    system.minSize = 0.08;
    system.maxSize = 0.22;
    system.minLifeTime = 0.25;
    system.maxLifeTime = 0.55;
    
    system.minEmitPower = 3.0;
    system.maxEmitPower = 6.0;
    system.gravity = new Vector3(0, -9.8, 0);

    // Explode in a sphere
    system.createSphereEmitter(0.1);
    
    // Self dispose when finished
    system.targetStopDuration = 0.1;
    system.disposeOnStop = true;
    system.start();
  }

  static sparkTrail(scene: Scene, position: Vector3, colorHex: number) {
    const tex = this.getDotTexture(scene);
    const system = new ParticleSystem("spark", 15, scene);
    system.particleTexture = tex;
    system.emitter = position.clone();
    
    const col = this.hexToColor4(colorHex);
    system.color1 = col;
    system.color2 = new Color4(1.0, 1.0, 1.0, 1.0);
    system.colorDead = new Color4(col.r, col.g, col.b, 0.0);

    system.minSize = 0.05;
    system.maxSize = 0.12;
    system.minLifeTime = 0.15;
    system.maxLifeTime = 0.35;
    
    system.minEmitPower = 1.0;
    system.maxEmitPower = 3.0;

    system.createSphereEmitter(0.2);
    
    system.targetStopDuration = 0.15;
    system.disposeOnStop = true;
    system.start();
  }

  static boomExplosion(scene: Scene, position: Vector3) {
    const tex = this.getDotTexture(scene);
    const system = new ParticleSystem("boom", 60, scene);
    system.particleTexture = tex;
    system.emitter = position.clone();
    
    system.color1 = new Color4(1.0, 0.8, 0.2, 1.0);
    system.color2 = new Color4(1.0, 0.2, 0.0, 1.0);
    system.colorDead = new Color4(0.2, 0.2, 0.2, 0.0);

    system.minSize = 0.15;
    system.maxSize = 0.45;
    system.minLifeTime = 0.3;
    system.maxLifeTime = 0.7;
    
    system.minEmitPower = 4.0;
    system.maxEmitPower = 9.0;
    system.gravity = new Vector3(0, 1.5, 0);

    system.createSphereEmitter(0.35);
    
    system.targetStopDuration = 0.12;
    system.disposeOnStop = true;
    system.start();
  }

  static victoryFireworks(scene: Scene) {
    const targetCount = 6;
    for (let i = 0; i < targetCount; i++) {
      setTimeout(() => {
        if (scene.isDisposed) return;
        
        // Random position in standard screen region (e.g. x between -5 and 5, y between 0 and 4)
        const randX = (Math.random() - 0.5) * 8.0;
        const randY = 1.0 + Math.random() * 4.0;
        const pos = new Vector3(randX, randY, 0);
        
        const colors = [0xff6eb4, 0xffe45e, 0x6bcb77, 0x74c0fc, 0xff9f43, 0x9b72ff];
        const colorHex = colors[Math.floor(Math.random() * colors.length)];
        
        this.shatterBurst(scene, pos, colorHex);
        this.boomExplosion(scene, pos);
      }, i * 280);
    }
  }

  static createWeather(scene: Scene, worldIndex: number) {
    if (worldIndex !== 5 && worldIndex !== 6 && worldIndex !== 2) return null;
    
    const tex = this.getDotTexture(scene);
    const system = new ParticleSystem("weather", 200, scene);
    system.particleTexture = tex;
    system.emitter = new Vector3(0, 15, 0); // High up

    system.minEmitBox = new Vector3(-20, 0, -20);
    system.maxEmitBox = new Vector3(20, 0, 20);

    system.minSize = 0.05;
    system.maxSize = 0.15;
    system.minLifeTime = 5.0;
    system.maxLifeTime = 10.0;
    system.minEmitPower = 0.5;
    system.maxEmitPower = 1.0;
    system.updateSpeed = 0.01;

    if (worldIndex === 5) {
      // Snow
      system.color1 = new Color4(1.0, 1.0, 1.0, 0.8);
      system.color2 = new Color4(0.8, 0.9, 1.0, 0.5);
      system.colorDead = new Color4(1, 1, 1, 0);
      system.gravity = new Vector3(0, -1.0, 0);
      system.direction1 = new Vector3(-1, -1, -1);
      system.direction2 = new Vector3(1, -1, 1);
    } else if (worldIndex === 6) {
      // Magma embers
      system.color1 = new Color4(1.0, 0.4, 0.0, 0.9);
      system.color2 = new Color4(1.0, 0.1, 0.0, 0.6);
      system.colorDead = new Color4(0, 0, 0, 0);
      system.gravity = new Vector3(0, 0.5, 0); // Float up
      system.direction1 = new Vector3(-0.5, 1, -0.5);
      system.direction2 = new Vector3(0.5, 1, 0.5);
    } else if (worldIndex === 2) {
      // Leaves / spores
      system.color1 = new Color4(0.4, 0.8, 0.2, 0.7);
      system.color2 = new Color4(0.2, 0.6, 0.1, 0.5);
      system.colorDead = new Color4(0, 0, 0, 0);
      system.gravity = new Vector3(0, -0.5, 0);
      system.direction1 = new Vector3(-1, -0.5, -1);
      system.direction2 = new Vector3(1, -0.5, 1);
    }

    system.start();
    return system;
  }

  static clearCache() {
    if (this.dotTexture) {
      this.dotTexture.dispose();
      this.dotTexture = null;
    }
  }
}
