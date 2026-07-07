/* LevelSelectScene.ts — 3D Level selector roadmap with soft-body wiggling nodes */
import Phaser from 'phaser';
import { GameData } from '../utils/GameData';
import { audio } from '../audio';
import {
  TILE_W, TILE_H, BLOCK_H,
  drawIsoCube, drawHat, hslToInt
} from '../utils/IsoHelper';

interface LevelNode {
  levelIdx: number;
  x: number;
  y: number;
  cy: number;
  unlocked: boolean;
  stars: number;
  state: 'idle' | 'wiggle' | 'launch';
  animT: number;
  scalePara: number;
  scalePerp: number;
  angle: number;
  bumpDy: number;
}

export class LevelSelectScene extends Phaser.Scene {
  private worldIndex = 1;
  private nodes: LevelNode[] = [];
  private blockGfx!: Phaser.GameObjects.Graphics;
  private pathGfx!: Phaser.GameObjects.Graphics;
  private bgGfx!: Phaser.GameObjects.Graphics;
  private activeSkin = 'none';

  constructor() { super({ key: 'LevelSelect' }); }

  init(data: { world?: number }) {
    this.worldIndex = data.world ?? GameData.world.get();
    this.activeSkin = GameData.activeSkin.get();
  }

  create() {
    const W = this.scale.width, H = this.scale.height;

    // Background
    this.bgGfx = this.add.graphics();
    this.drawBg(W, H);
    this.addStarfield(W, H);

    // Graphics layers
    this.pathGfx = this.add.graphics();
    this.blockGfx = this.add.graphics();

    // Title
    this.add.text(W / 2, H * 0.08, `World ${this.worldIndex} Levels`, {
      fontFamily: 'Fredoka', fontSize: Math.min(W * 0.07, 36) + 'px', color: '#ffffff',
      shadow: { offsetX: 0, offsetY: 4, color: '#6600ff', blur: 16, fill: true }
    }).setOrigin(0.5);

    // Retrieve progress
    const savedLevel = parseInt(localStorage.getItem(`arrow_buddies_w${this.worldIndex}_level`) ?? '1');

    // Define 5 level positions on a winding S-shaped road
    const pts = [
      { x: W * 0.22, y: H * 0.74 },
      { x: W * 0.46, y: H * 0.62 },
      { x: W * 0.74, y: H * 0.49 },
      { x: W * 0.40, y: H * 0.36 },
      { x: W * 0.68, y: H * 0.22 }
    ];

    // Build level nodes
    this.nodes = pts.map((pt, i) => {
      const levelIdx = i + 1;
      const unlocked = levelIdx <= savedLevel;
      const stars = GameData.starsFor(this.worldIndex, levelIdx);
      return {
        levelIdx,
        x: pt.x, y: pt.y, cy: pt.y,
        unlocked, stars,
        state: 'idle', animT: 0,
        scalePara: 1, scalePerp: 1, angle: 0, bumpDy: 0
      } as LevelNode;
    });

    // Create interactive click zones for level nodes
    this.nodes.forEach(node => {
      if (!node.unlocked) return;
      // Zone around cube center
      const zone = this.add.zone(node.x, node.y, 90, 90).setInteractive({ useHandCursor: true });
      zone.on('pointerdown', () => {
        this.triggerNodeClick(node);
      });
    });

    // Back Button
    const backBtn = this.add.text(40, 35, '← Worlds', {
      fontFamily: 'Fredoka', fontSize: '20px', color: '#9b72ff'
    }).setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => {
      audio.playTap();
      this.cameras.main.fadeOut(300, 10, 0, 26);
      this.time.delayedCall(320, () => this.scene.start('WorldSelect'));
    });
    backBtn.on('pointerover', () => backBtn.setColor('#ff85c1'));
    backBtn.on('pointerout', () => backBtn.setColor('#9b72ff'));

    // Fade in
    this.cameras.main.fadeIn(400, 10, 0, 26);
  }

  private triggerNodeClick(node: LevelNode) {
    if (node.state !== 'idle') return;
    audio.playTap();
    node.state = 'launch';
    node.animT = 0;

    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try { navigator.vibrate([40, 50]); } catch {}
    }

    this.time.delayedCall(160, () => {
      audio.playLaunch();
    });

    this.time.delayedCall(220, () => {
      this.cameras.main.fadeOut(350, 10, 0, 26);
    });

    this.time.delayedCall(580, () => {
      GameData.level.set(node.levelIdx);
      this.scene.start('Game', { world: this.worldIndex, level: node.levelIdx });
    });
  }

  update(_time: number, delta: number) {
    const dt = Math.min(delta / 1000, 0.1);

    // 1. Draw Winding Path
    this.drawPath();

    // 2. Clear graphics layer
    const g = this.blockGfx;
    g.clear();

    const worldColors: Record<number, number> = { 1: 330, 2: 140, 3: 225 };
    const wHue = worldColors[this.worldIndex] ?? 330;

    // 3. Render level nodes
    this.nodes.forEach((node, i) => {
      node.animT += dt;

      // Vertical hover oscillation for unlocked levels
      let hover = 0;
      if (node.unlocked && node.state !== 'launch') {
        hover = Math.sin(this.time.now * 0.0025 + i * 1.6) * 5.5;
      }
      node.cy = node.y + hover;

      // Update state animations
      if (node.state === 'idle') {
        node.scalePara = 1;
        node.scalePerp = 1;
        node.angle = 0;

        // Mouse hover scaling react
        const pointer = this.input.activePointer;
        const dist = Math.hypot(pointer.x - node.x, pointer.y - node.cy);
        if (node.unlocked && dist < 55) {
          const squeeze = 1.0 - (1.0 - dist / 55) * 0.12;
          node.scalePara = squeeze;
          node.scalePerp = 2.0 - squeeze;
          node.angle = Math.PI / 2; // vertical hover squash
        }
      } else if (node.state === 'wiggle') {
        const dur = 0.60;
        const scaleAmp = Math.sin(node.animT * Math.PI * 6) * Math.exp(-node.animT * 4.5);
        node.scalePara = 1.0 - 0.40 * scaleAmp;
        node.scalePerp = 1.0 + 0.30 * scaleAmp;
        node.cy = node.y + node.bumpDy * scaleAmp;
        if (node.animT >= dur) {
          node.state = 'idle';
          node.animT = 0;
        }
      } else if (node.state === 'launch') {
        if (node.animT < 0.15) {
          // Wind-up squeeze
          node.scalePara = 0.62;
          node.scalePerp = 1.38;
          node.cy = node.y + 14;
          node.angle = Math.PI / 2;
        } else {
          // Stretch and shoot up!
          const flyT = node.animT - 0.15;
          node.scalePara = 1.48;
          node.scalePerp = 0.65;
          node.cy = node.y + 14 - flyT * flyT * 1900 - flyT * 400;
          node.angle = Math.PI / 2;
        }
      }

      // Draw the node
      const cx = node.x, cy = node.cy;
      const s = 1.15; // standard level selector cube scale
      const tw = TILE_W * s, th = TILE_H * s, bh = BLOCK_H * s;

      const topCol   = node.unlocked ? hslToInt(wHue, 92, 70) : 0x2e243a;
      const leftCol  = node.unlocked ? hslToInt(wHue, 82, 50) : 0x221a2c;
      const rightCol = node.unlocked ? hslToInt(wHue, 85, 33) : 0x16101e;
      const glowCol  = node.unlocked ? hslToInt(wHue, 100, 80) : 0x3d304e;

      const scalePara = node.scalePara;
      const scalePerp = node.scalePerp;
      const angle = node.angle;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);

      const transformer = (px: number, py: number) => {
        const dx = px - cx;
        const dy = py - (cy + bh / 2);
        const rx = dx * cos + dy * sin;
        const ry = -dx * sin + dy * cos;
        const rxScaled = rx * scalePara;
        const ryScaled = ry * scalePerp;
        const dxPrime = rxScaled * cos - ryScaled * sin;
        const dyPrime = rxScaled * sin + ryScaled * cos;
        return { x: cx + dxPrime, y: (cy + bh / 2) + dyPrime };
      };

      const tPt = (px: number, py: number) => transformer(px, py);

      // Render block
      drawIsoCube(g, cx, cy, topCol, leftCol, rightCol, glowCol, node.unlocked ? 0.65 : 0.25, transformer);

      // Draw overlays (Level number, Lock symbol, Stars)
      if (node.unlocked) {
        // Draw Number on top face
        const topCenter = tPt(cx, cy - th * 0.45);
        this.addTextOverlay(`${node.levelIdx}`, topCenter.x, topCenter.y, '#ffffff');

        // Draw Stars below block
        const starY = cy + bh + 16;
        for (let st = 0; st < 3; st++) {
          const sx = cx + (st - 1) * 22;
          const starChar = node.stars > st ? '⭐' : '○';
          const starCol = node.stars > st ? '#ffe45e' : '#665588';
          const starTxt = this.addTextOverlay(starChar, sx, starY, starCol, '14px');
          // Clean up text object after single frames to avoid leak
          this.time.delayedCall(16, () => starTxt.destroy());
        }
      } else {
        // Draw Lock symbol on top face
        const topCenter = tPt(cx, cy - th * 0.45);
        const lockTxt = this.addTextOverlay('🔒', topCenter.x, topCenter.y, '#ffffff', '16px');
        this.time.delayedCall(16, () => lockTxt.destroy());
      }

      // Draw active skin hat if unlocked
      if (node.unlocked && node.state !== 'launch') {
        drawHat(g, cx, cy, tw, th, this.activeSkin, this.time.now, transformer);
      }
    });
  }

  private addTextOverlay(txt: string, x: number, y: number, color: string, size = '20px') {
    return this.add.text(x, y, txt, {
      fontFamily: 'Fredoka', fontSize: size, color, align: 'center',
      shadow: { offsetX: 0, offsetY: 2, color: '#000000', blur: 6, fill: true }
    }).setOrigin(0.5).setDepth(20);
  }

  private drawPath() {
    const g = this.pathGfx;
    g.clear();

    const worldColors: Record<number, number> = { 1: 0xff6eb4, 2: 0x6bcb77, 3: 0x74c0fc };
    const col = worldColors[this.worldIndex] ?? 0x9b72ff;

    // Glow passes
    for (let pass = 0; pass < 3; pass++) {
      g.lineStyle([6, 3.5, 1.5][pass], col, [0.15, 0.35, 0.75][pass]);
      g.beginPath();
      g.moveTo(this.nodes[0].x, this.nodes[0].cy + BLOCK_H * 0.5);
      for (let i = 1; i < this.nodes.length; i++) {
        g.lineTo(this.nodes[i].x, this.nodes[i].cy + BLOCK_H * 0.5);
      }
      g.strokePath();
    }

    // Inner bright neon line
    g.lineStyle(1.5, 0xffffff, 0.85);
    g.beginPath();
    g.moveTo(this.nodes[0].x, this.nodes[0].cy + BLOCK_H * 0.5);
    for (let i = 1; i < this.nodes.length; i++) {
      g.lineTo(this.nodes[i].x, this.nodes[i].cy + BLOCK_H * 0.5);
    }
    g.strokePath();
  }

  private drawBg(W: number, H: number) {
    const g = this.bgGfx;
    g.clear();
    const steps = 12;
    for (let i = steps; i >= 0; i--) {
      const t = i / steps;
      const r = Math.round(10 + t * 24);
      const green = 0;
      const b = Math.round(26 + t * 50);
      const col = (r << 16) | (green << 8) | b;
      const size = (1 - t) * Math.max(W, H) * 1.5;
      g.fillStyle(col, 0.08 + t * 0.08);
      g.fillCircle(W / 2, H / 2, size);
    }
  }

  private addStarfield(W: number, H: number) {
    const gfx = this.add.graphics();
    gfx.fillStyle(0xffffff, 0.4);
    for (let i = 0; i < 70; i++) {
      gfx.fillCircle(Math.random() * W, Math.random() * H, Math.random() * 1.2 + 0.3);
    }
  }
}
