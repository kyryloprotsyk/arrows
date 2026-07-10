/* BootScene.ts — Load assets & textures, show progress bar */
import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() { super({ key: 'Boot' }); }

  preload() {
    const W = this.scale.width, H = this.scale.height;

    // Background
    this.cameras.main.setBackgroundColor('#0a001a');

    // Progress bar
    const barBg = this.add.graphics();
    barBg.fillStyle(0x1a0035, 1);
    barBg.fillRoundedRect(W * 0.15, H * 0.5 - 15, W * 0.7, 30, 15);

    const bar = this.add.graphics();
    this.add.text(W / 2, H * 0.42, 'ARROW BUDDIES 3D', {
      fontFamily: 'Orbitron',
      fontSize: Math.min(W * 0.08, 52) + 'px',
      color: '#ff85c1',
      stroke: '#ffffff',
      strokeThickness: 4,
      shadow: { offsetX: 0, offsetY: 4, color: '#ff00aa', blur: 20, fill: true }
    }).setOrigin(0.5);

    const sub = this.add.text(W / 2, H * 0.5 + 30, 'Loading...', {
      fontFamily: 'Orbitron',
      fontSize: '20px',
      color: '#9b72ff'
    }).setOrigin(0.5);

    this.load.on('progress', (v: number) => {
      bar.clear();
      bar.fillStyle(0xff6eb4, 1);
      bar.fillRoundedRect(W * 0.15, H * 0.5 - 15, W * 0.7 * v, 30, 15);
      sub.setText(`Loading... ${Math.round(v * 100)}%`);
    });

    // Generate programmatic textures
    this.load.on('complete', () => {
      this.createProgrammaticTextures();
    });
  }

  private createProgrammaticTextures() {
    // 4×4 white square for particles
    const g = this.add.graphics();
    g.fillStyle(0xffffff, 1);
    g.fillRect(0, 0, 4, 4);
    g.generateTexture('particle', 4, 4);

    // 8×8 circle for star particles
    g.clear();
    g.fillStyle(0xffffff, 1);
    g.fillCircle(4, 4, 4);
    g.generateTexture('star_particle', 8, 8);

    // 6×6 rounded square for block particles
    g.clear();
    g.fillStyle(0xffffff, 1);
    g.fillRoundedRect(0, 0, 6, 6, 2);
    g.generateTexture('block_particle', 6, 6);

    g.destroy();
  }

  create() {
    this.time.delayedCall(300, () => this.scene.start('Menu'));
  }
}
