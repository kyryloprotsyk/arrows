/* MenuScene.ts — Animated splash screen with floating isometric buddy blocks */
import Phaser from 'phaser';
import { TILE_W, TILE_H, BLOCK_H, getBlockPalette, drawHat } from '../utils/IsoHelper';
import { GameData } from '../utils/GameData';
import { audio } from '../audio';

export class MenuScene extends Phaser.Scene {
  private blockGfx!: Phaser.GameObjects.Graphics;
  private bgGfx!: Phaser.GameObjects.Graphics;
  private floatingBlocks: Array<{
    x: number; y: number; vy: number; phase: number; speed: number;
    worldIdx: number; posHash: number; scale: number; alpha: number;
    skin: string;
  }> = [];

  constructor() { super({ key: 'Menu' }); }

  create() {
    const W = this.scale.width, H = this.scale.height;

    // --- Background gradient via graphics ---
    this.bgGfx = this.add.graphics();
    this.drawBg(W, H);

    // --- Animated star field ---
    this.createStarField(W, H);

    // --- Floating isometric demo blocks ---
    this.blockGfx = this.add.graphics();
    this.spawnFloatingBlocks(W, H);

    // --- Game Logo Title ---
    const titleFontSize = Math.min(W * 0.1, 68);
    const title1 = this.add.text(W / 2, H * 0.18, '🏹 ARROW', {
      fontFamily: 'Fredoka', fontSize: `${titleFontSize}px`,
      color: '#ff85c1',
      stroke: '#ffffff', strokeThickness: 5,
      shadow: { offsetX: 0, offsetY: 6, color: '#ff0088', blur: 25, fill: true }
    }).setOrigin(0.5).setAlpha(0);

    const title2 = this.add.text(W / 2, H * 0.27, 'BUDDIES 3D', {
      fontFamily: 'Fredoka', fontSize: `${titleFontSize * 0.85}px`,
      color: '#ffe45e',
      stroke: '#ffffff', strokeThickness: 4,
      shadow: { offsetX: 0, offsetY: 6, color: '#ffa500', blur: 20, fill: true }
    }).setOrigin(0.5).setAlpha(0);

    const sub = this.add.text(W / 2, H * 0.34, 'Neon Escape Puzzle!', {
      fontFamily: 'Fredoka', fontSize: Math.min(W * 0.045, 22) + 'px',
      color: '#9b72ff'
    }).setOrigin(0.5).setAlpha(0);

    // --- Entrance Animations ---
    this.tweens.add({ targets: title1, alpha: 1, y: H * 0.175, duration: 700, ease: 'Back.Out', delay: 200 });
    this.tweens.add({ targets: title2, alpha: 1, y: H * 0.265, duration: 700, ease: 'Back.Out', delay: 400 });
    this.tweens.add({ targets: sub, alpha: 1, duration: 600, delay: 700 });

    // Pulsing glow on title
    this.tweens.add({ targets: title1, scaleX: 1.04, scaleY: 1.04, duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.InOut' });

    // --- Buttons (using stacked relative coordinates to prevent clipping) ---
    const btnPlayY = Math.max(H * 0.45, 200); // Base position with a minimum
    const btnShopY = btnPlayY + 75;
    const coinY = btnShopY + 70;
    
    const btnPlayBg = this.createNeonButton(W / 2, btnPlayY, 220, 58, 0xff6eb4, 0xff0088, 'PLAY  GAME', 0);
    const btnShopBg = this.createNeonButton(W / 2, btnShopY, 200, 52, 0x9b72ff, 0x6600ff, 'SKINS  SHOP', 200);

    // Coin display
    const coinText = this.add.text(W / 2, coinY, `🪙 ${GameData.coins.get()} Coins`, {
      fontFamily: 'Fredoka', fontSize: '22px', color: '#ffe45e'
    }).setOrigin(0.5).setAlpha(0);
    this.tweens.add({ targets: coinText, alpha: 1, delay: 900, duration: 400 });

    // Mute button
    this.createMuteButton(W, H);

    // Info
    this.add.text(W / 2, H * 0.88, '🔄 Drag to rotate  •  👆 Tap to escape  •  💣 Bomb magic!', {
      fontFamily: 'Fredoka', fontSize: Math.min(W * 0.032, 14) + 'px', color: '#665588'
    }).setOrigin(0.5);

    // Button actions
    btnPlayBg.on('pointerdown', () => {
      audio.playTap();
      this.cameras.main.fadeOut(300, 0, 0, 20);
      this.time.delayedCall(320, () => this.scene.start('WorldSelect'));
    });

    btnShopBg.on('pointerdown', () => {
      audio.playTap();
      this.cameras.main.fadeOut(300, 0, 0, 20);
      this.time.delayedCall(320, () => this.scene.start('Shop'));
    });

    // Fade in on start
    this.cameras.main.fadeIn(500, 10, 0, 26);

    // Start BGM
    if (!GameData.muted.get()) audio.playBGM();
  }

  private drawBg(W: number, H: number) {
    const g = this.bgGfx;
    g.clear();
    // Radial-style dark-to-purple gradient approximation via filled rects
    const steps = 12;
    for (let i = steps; i >= 0; i--) {
      const t = i / steps;
      const r = Math.round(10 + t * 30);
      const green = 0;
      const b = Math.round(26 + t * 60);
      const col = (r << 16) | (green << 8) | b;
      const size = (1 - t) * Math.max(W, H) * 1.5;
      g.fillStyle(col, 0.07 + t * 0.07);
      g.fillCircle(W / 2, H / 2, size);
    }
  }

  private createStarField(W: number, H: number) {
    const gfx = this.add.graphics();
    gfx.fillStyle(0xffffff, 0.6);
    for (let i = 0; i < 120; i++) {
      const x = Math.random() * W;
      const y = Math.random() * H;
      const r = Math.random() * 1.5 + 0.3;
      gfx.fillCircle(x, y, r);
    }

    // Twinkle effect: fade in/out random stars
    this.tweens.add({
      targets: gfx, alpha: { from: 0.6, to: 0.9 },
      duration: 2000, yoyo: true, repeat: -1, ease: 'Sine.InOut'
    });
  }

  private spawnFloatingBlocks(W: number, H: number) {
    const skins = ['none', 'none', 'wizard', 'crown', 'cat', 'tophat', 'chef', 'propeller', 'rainbow'];
    for (let i = 0; i < 10; i++) {
      this.floatingBlocks.push({
        x: Math.random() * W,
        y: Math.random() * H,
        vy: -(0.3 + Math.random() * 0.5),
        phase: Math.random() * Math.PI * 2,
        speed: 0.3 + Math.random() * 0.4,
        worldIdx: Math.floor(Math.random() * 3) + 1,
        posHash: Math.floor(Math.random() * 8),
        scale: 0.4 + Math.random() * 0.5,
        alpha: 0.15 + Math.random() * 0.35,
        skin: skins[Math.floor(Math.random() * skins.length)]
      });
    }
  }

  private createNeonButton(
    x: number, y: number, w: number, h: number,
    fillCol: number, glowCol: number,
    label: string, delay: number
  ): Phaser.GameObjects.Graphics {
    const g = this.add.graphics().setAlpha(0).setInteractive(
      new Phaser.Geom.Rectangle(x - w / 2, y - h / 2, w, h),
      Phaser.Geom.Rectangle.Contains
    );
    g.setDepth(10);

    const draw = (hover: boolean) => {
      g.clear();
      // Shadow
      g.fillStyle(glowCol, 0.25);
      g.fillRoundedRect(x - w / 2 + 2, y - h / 2 + 6, w, h, h / 2);
      // Button bg
      g.fillStyle(hover ? fillCol : Phaser.Display.Color.ValueToColor(fillCol).darken(15).color, 1);
      g.fillRoundedRect(x - w / 2, y - h / 2, w, h, h / 2);
      // Glow outline
      for (let pass = 0; pass < 3; pass++) {
        g.lineStyle([4, 2.5, 1.5][pass], glowCol, [0.15, 0.35, 0.7][pass]);
        g.strokeRoundedRect(x - w / 2, y - h / 2, w, h, h / 2);
      }
    };

    draw(false);

    g.on('pointerover', () => { draw(true); g.setScale(1.04); });
    g.on('pointerout', () => { draw(false); g.setScale(1); });

    const text = this.add.text(x, y, label, {
      fontFamily: 'Fredoka', fontSize: '22px', color: '#ffffff',
      stroke: '#000000', strokeThickness: 2
    }).setOrigin(0.5).setAlpha(0).setDepth(11);

    // Animate in
    this.tweens.add({ targets: [g, text], alpha: 1, duration: 500, delay: 800 + delay, ease: 'Back.Out' });
    // Bounce idle
    this.tweens.add({ targets: [g, text], y: y - 4, duration: 1400 + delay * 0.5, yoyo: true, repeat: -1, ease: 'Sine.InOut', delay: 1400 });

    return g;
  }

  private createMuteButton(W: number, H: number) {
    const btn = this.add.text(W - 45, H - 45, GameData.muted.get() ? '🔇' : '🔊', {
      fontSize: '26px'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    btn.on('pointerdown', () => {
      const muted = GameData.muted.toggle();
      btn.setText(muted ? '🔇' : '🔊');
      if (muted) audio.stopBGM(); else audio.playBGM();
    });
  }

  update(_time: number, delta: number) {
    // Animate floating blocks
    const W = this.scale.width, H = this.scale.height;
    const dt = delta / 1000;

    this.blockGfx.clear();

    for (const b of this.floatingBlocks) {
      b.y += b.vy * dt * 60;
      b.phase += dt * b.speed;
      const wobble = Math.sin(b.phase) * 8;

      if (b.y < -80) { b.y = H + 80; b.x = Math.random() * W; }

      const cx = b.x + wobble;
      const cy = b.y;
      const s = b.scale;
      const pal = getBlockPalette(b.worldIdx, b.posHash);

      // Draw scaled isometric cube
      this.blockGfx.setAlpha(b.alpha);

      // Save & scale via matrix (manual scale around cx, cy)
      const g = this.blockGfx;
      const tw = TILE_W * s, th = TILE_H * s, bh = BLOCK_H * s;

      const fillPoly = (g2: Phaser.GameObjects.Graphics, coords: number[]) => {
        g2.beginPath();
        g2.moveTo(coords[0], coords[1]);
        for (let i = 2; i < coords.length; i += 2) g2.lineTo(coords[i], coords[i + 1]);
        g2.closePath();
        g2.fillPath();
      };

      g.fillStyle(pal.right, 1); fillPoly(g, [cx+tw,cy, cx,cy+th, cx,cy+th+bh, cx+tw,cy+bh]);
      g.fillStyle(pal.left, 1);  fillPoly(g, [cx-tw,cy, cx,cy+th, cx,cy+th+bh, cx-tw,cy+bh]);
      g.fillStyle(pal.top, 1);   fillPoly(g, [cx,cy-th, cx+tw,cy, cx,cy+th, cx-tw,cy]);

      // Glossy shine
      g.fillStyle(0xffffff, 0.2);
      fillPoly(g, [cx, cy-th, cx+tw*0.5, cy-th*0.5, cx, cy+th*0.5, cx-tw, cy]);

      // Bevel lines
      g.lineStyle(1 * s, 0xffffff, 0.3);
      g.beginPath();
      g.moveTo(cx-tw, cy); g.lineTo(cx, cy+th); g.lineTo(cx+tw, cy);
      g.strokePath();

      g.lineStyle(1, pal.glow, 0.5);
      g.beginPath();
      g.moveTo(cx, cy-th); g.lineTo(cx+tw, cy); g.lineTo(cx, cy+th); g.lineTo(cx-tw, cy);
      g.closePath();
      g.strokePath();

      drawHat(g, cx, cy, tw, th, b.skin, this.time.now);
    }
    this.blockGfx.setAlpha(1);
  }
}
