/* LevelSelectScene.ts — 3D Level selector roadmap with soft-body wiggling nodes */
import Phaser from 'phaser';
import { GameData } from '../utils/GameData';
import { audio } from '../audio';
import {
  TILE_W, TILE_H, BLOCK_H,
  drawIsoCube, drawHat, hslToInt,
  createCartoonButton
} from '../utils/IsoHelper';
import { gsap } from 'gsap';

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
  numTxt?: Phaser.GameObjects.Text;
  starTxts?: Phaser.GameObjects.Text[];
  lockTxt?: Phaser.GameObjects.Text;
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

    // Bright cartoon style peach background
    this.bgGfx = this.add.graphics();
    const bgBgGlow2 = this.add.graphics();
    
    this.cameras.main.setBackgroundColor('#fff5ea');
    this.cameras.main.fadeIn(400, 255, 245, 234);

    this.bgGfx.fillStyle(0xfff5ea, 1);
    this.bgGfx.fillRect(0, 0, W, H);

    // Warm radial spots in bg
    const worldHues: Record<number, number> = { 1: 330, 2: 175, 3: 270, 4: 195, 5: 210, 6: 15 };
    const wHue = worldHues[this.worldIndex] ?? 280;
    const accentCol = hslToInt(wHue, 90, 85);

    bgBgGlow2.fillStyle(accentCol, 0.6);
    bgBgGlow2.fillCircle(W / 2, H * 0.35, Math.min(W, H) * 0.65);

    // Subtle cartoon bubble floats
    for (let i = 0; i < 12; i++) {
      this.bgGfx.fillStyle(0xffffff, 0.45);
      this.bgGfx.fillCircle(Math.random() * W, Math.random() * H, Math.random() * 25 + 10);
    }

    // Graphics layers
    this.pathGfx = this.add.graphics();
    this.blockGfx = this.add.graphics();

    // Title (Fredoka, drop shadow, kid cartoon style)
    const titleTxt = this.add.text(W / 2, H * 0.08, `World ${this.worldIndex} Levels`, {
      fontFamily: 'Fredoka, sans-serif', fontSize: Math.min(W * 0.07, 34) + 'px', color: '#ff9f1c',
      fontStyle: 'bold',
      stroke: '#ffffff', strokeThickness: 5,
      shadow: { offsetX: 0, offsetY: 4, color: '#5c3d2e', blur: 0, fill: true }
    }).setOrigin(0.5).setAlpha(0);

    gsap.to(titleTxt, {
      alpha: 1,
      y: H * 0.08,
      duration: 0.5,
      ease: 'back.out(1.5)',
      delay: 0.1
    });

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

      const node: LevelNode = {
        levelIdx,
        x: pt.x, y: pt.y, cy: pt.y,
        unlocked, stars,
        state: 'idle', animT: 0,
        scalePara: 1, scalePerp: 1, angle: 0, bumpDy: 0
      };

      if (unlocked) {
        // Level number badge (Fredoka font)
        node.numTxt = this.add.text(pt.x, pt.y, `${levelIdx}`, {
          fontFamily: 'Fredoka, sans-serif',
          fontSize: '18px',
          fontStyle: 'bold',
          color: '#ffffff',
          stroke: '#000000',
          strokeThickness: 2
        }).setOrigin(0.5).setDepth(22).setAlpha(0);

        // Star row
        node.starTxts = [];
        for (let st = 0; st < 3; st++) {
          const starChar = stars > st ? '⭐' : '○';
          const starCol  = stars > st ? '#f39c12' : '#bdc3c7';
          const stTxt = this.add.text(pt.x + (st - 1) * 22, pt.y, starChar, {
            fontFamily: 'Fredoka, sans-serif', fontSize: '13px', color: starCol, fontStyle: 'bold'
          }).setOrigin(0.5).setDepth(21).setAlpha(0);
          node.starTxts.push(stTxt);
        }
      } else {
        // Lock icon
        node.lockTxt = this.add.text(pt.x, pt.y, '🔒', {
          fontFamily: 'Fredoka, sans-serif', fontSize: '16px'
        }).setOrigin(0.5).setDepth(22).setAlpha(0);
      }

      // GSAP entrance cascade for overlays
      this.time.delayedCall(200 + i * 80, () => {
        if (node.numTxt) gsap.to(node.numTxt, { alpha: 1, duration: 0.3 });
        if (node.lockTxt) gsap.to(node.lockTxt, { alpha: 1, duration: 0.3 });
        node.starTxts?.forEach(stTxt => gsap.to(stTxt, { alpha: 1, duration: 0.3 }));
      });

      return node;
    });

    // Create interactive click zones
    this.nodes.forEach(node => {
      if (!node.unlocked) return;
      const zone = this.add.zone(node.x, node.y, 90, 90).setInteractive({ useHandCursor: true });
      zone.on('pointerdown', () => {
        this.triggerNodeClick(node);
      });
    });

    // Back Button (Pink Bubbly Cartoon style)
    createCartoonButton(this, 75, 42, 120, 42, '◀ Worlds', () => {
      audio.playTap();
      this.cameras.main.fadeOut(300, 255, 245, 234);
      this.time.delayedCall(320, () => this.scene.start('WorldSelect'));
    }, { bgColor: 0xe91e63, fontSize: 16 });
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
      this.cameras.main.fadeOut(350, 255, 245, 234);
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

      // Vertical hover oscillation
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

        // Pointer react
        const pointer = this.input.activePointer;
        const dist = Math.hypot(pointer.x - node.x, pointer.y - node.cy);
        if (node.unlocked && dist < 55) {
          const squeeze = 1.0 - (1.0 - dist / 55) * 0.12;
          node.scalePara = squeeze;
          node.scalePerp = 2.0 - squeeze;
          node.angle = Math.PI / 2;
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
          node.scalePara = 0.62;
          node.scalePerp = 1.38;
          node.cy = node.y + 14;
          node.angle = Math.PI / 2;
        } else {
          const flyT = node.animT - 0.15;
          node.scalePara = 1.48;
          node.scalePerp = 0.65;
          node.cy = node.y + 14 - flyT * flyT * 1900 - flyT * 400;
          node.angle = Math.PI / 2;
        }
      }

      // Draw the node
      const cx = node.x, cy = node.cy;
      const s = 1.15;
      const tw = TILE_W * s, th = TILE_H * s, bh = BLOCK_H * s;

      const topCol   = node.unlocked ? hslToInt(wHue, 92, 70) : 0xd5c7b3;
      const leftCol  = node.unlocked ? hslToInt(wHue, 82, 50) : 0xbdc3c7;
      const rightCol = node.unlocked ? hslToInt(wHue, 85, 33) : 0x95a5a6;
      const glowCol  = node.unlocked ? hslToInt(wHue, 100, 80) : 0xe0e0e0;

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
      drawIsoCube(g, cx, cy, topCol, leftCol, rightCol, glowCol, node.unlocked ? 0.65 : 0.25, transformer, this.worldIndex, this.time.now);

      // Overlays
      if (node.unlocked) {
        const topCenter = tPt(cx, cy - th * 0.55);
        const isFlyHide = node.state === 'launch' && node.animT > 0.15;
        const overlayAlpha = isFlyHide ? 0 : 1;

        if (!isFlyHide) {
          const badgeR = 14 * Math.min(scalePara, scalePerp);
          const badgeCol = hslToInt(wHue, 100, 48);
          g.fillStyle(badgeCol, 0.95);
          g.fillCircle(topCenter.x, topCenter.y, badgeR);
          g.lineStyle(2, 0xffffff, 0.85);
          g.strokeCircle(topCenter.x, topCenter.y, badgeR);
        }

        if (node.numTxt) {
          node.numTxt.setPosition(topCenter.x, topCenter.y).setAlpha(overlayAlpha);
        }

        const starY = cy + bh + 20;
        node.starTxts?.forEach((stTxt, st) => {
          stTxt.setPosition(cx + (st - 1) * 24, starY).setAlpha(overlayAlpha);
        });
      } else {
        const topCenter = tPt(cx, cy - th * 0.55);
        if (node.lockTxt) {
          node.lockTxt.setPosition(topCenter.x, topCenter.y);
        }
      }

      // Draw hat if unlocked
      if (node.unlocked && node.state !== 'launch') {
        drawHat(g, cx, cy, tw, th, this.activeSkin, this.time.now, transformer);
      }
    });
  }

  private drawPath() {
    const g = this.pathGfx;
    g.clear();

    const worldColors: Record<number, number> = { 1: 0xff85c1, 2: 0x6bcb77, 3: 0x74c0fc };
    const col = worldColors[this.worldIndex] ?? 0xff9f1c;

    // Glow passes
    for (let pass = 0; pass < 3; pass++) {
      g.lineStyle([7, 4.5, 2][pass], col, [0.15, 0.35, 0.8][pass]);
      g.beginPath();
      g.moveTo(this.nodes[0].x, this.nodes[0].cy + BLOCK_H * 0.5);
      for (let i = 1; i < this.nodes.length; i++) {
        g.lineTo(this.nodes[i].x, this.nodes[i].cy + BLOCK_H * 0.5);
      }
      g.strokePath();
    }

    // Inner line
    g.lineStyle(2, 0xffffff, 0.9);
    g.beginPath();
    g.moveTo(this.nodes[0].x, this.nodes[0].cy + BLOCK_H * 0.5);
    for (let i = 1; i < this.nodes.length; i++) {
      g.lineTo(this.nodes[i].x, this.nodes[i].cy + BLOCK_H * 0.5);
    }
    g.strokePath();
  }
}
