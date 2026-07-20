/* DefeatScene.ts — Game Over screen offering Ad Continuation or Restart */
import Phaser from 'phaser';
import { GameData } from '../utils/GameData';
import { getBlockPalette, TILE_W, TILE_H, BLOCK_H, drawHat, blendColor } from '../utils/IsoHelper';
import { audio } from '../audio';
import { AdManager } from '../utils/AdManager';
import { gsap } from 'gsap';

export class DefeatScene extends Phaser.Scene {
  constructor() { super({ key: 'Defeat' }); }

  create(data: { world: number; level: number; isDaily?: boolean }) {
    const { world, level, isDaily } = data;
    const W = this.scale.width, H = this.scale.height;

    // Warm peach background to stay within the bright cartoon visual rules
    this.cameras.main.setBackgroundColor('#fff5ea');
    this.cameras.main.fadeIn(400, 255, 245, 234);

    const bg = this.add.graphics();
    this.drawDefeatBg(bg, W, H);

    // Animated isometric sad block
    this.createSadBlock(W / 2, H * 0.26, world);

    // OUT OF MOVES heading (Fredoka, drop shadow, kid cartoon style)
    const clearTxt = this.add.text(W / 2, H * 0.40, 'OUT OF MOVES!', {
      fontFamily: 'Fredoka, sans-serif',
      fontSize: Math.min(W * 0.1, 40) + 'px',
      color: '#e74c3c',
      fontStyle: 'bold',
      stroke: '#ffffff', strokeThickness: 6,
      shadow: { offsetX: 0, offsetY: 4, color: '#5c3d2e', blur: 0, fill: true }
    }).setOrigin(0.5).setAlpha(0).setScale(0.3);

    gsap.to(clearTxt, {
      alpha: 1,
      scale: 1,
      duration: 0.6,
      ease: 'back.out(1.6)',
      delay: 0.2
    });

    // Buttons
    this.createButtons(W / 2, H * 0.60, world, level, isDaily);
  }

  private drawDefeatBg(g: Phaser.GameObjects.Graphics, W: number, H: number) {
    g.fillStyle(0xfff5ea, 1);
    g.fillRect(0, 0, W, H);

    // Soft dim spot behind sad character
    g.fillStyle(0xffe5e5, 0.6);
    g.fillCircle(W / 2, H * 0.3, Math.min(W, H) * 0.55);

    // Subtle cartoon bubble floats
    g.fillStyle(0xffffff, 0.5);
    for (let i = 0; i < 10; i++) {
      const rx = Math.random() * W;
      const ry = Math.random() * H;
      g.fillCircle(rx, ry, Math.random() * 25 + 8);
    }
  }

  private createSadBlock(cx: number, cy: number, world: number) {
    const g = this.add.graphics();
    const pal = getBlockPalette(world, 0);

    const bObj = { y: cy - 120, scalePara: 1, scalePerp: 1 };

    gsap.to(bObj, {
      y: cy,
      duration: 0.8,
      ease: 'bounce.out',
      onUpdate: () => {
        g.clear();
        this.drawSadIsoCube(g, cx, bObj.y, pal, bObj.scalePara, bObj.scalePerp);
      }
    });

    this.time.delayedCall(800, () => {
      gsap.to(bObj, {
        scalePara: 1.04,
        scalePerp: 0.96,
        duration: 1.5,
        yoyo: true,
        repeat: -1,
        ease: 'sine.inOut',
        onUpdate: () => {
          g.clear();
          this.drawSadIsoCube(g, cx, bObj.y, pal, bObj.scalePara, bObj.scalePerp);
        }
      });
    });
  }

  private drawSadIsoCube(
    g: Phaser.GameObjects.Graphics,
    cx: number, cy: number,
    pal: { top: number, left: number, right: number, glow: number },
    scalePara: number, scalePerp: number
  ) {
    const tw = TILE_W * 0.5 * 2.5;
    const th = TILE_H * 0.5 * 2.5;
    const bh = BLOCK_H * 2.5;

    const cos = 0.866, sin = 0.5;
    const tPt = (x: number, y: number) => {
      const dx = x - cx, dy = y - cy;
      const nx = dx * cos - dy * sin;
      const ny = dx * sin + dy * cos;
      return { x: cx + nx * scalePara, y: cy + ny * scalePerp };
    };

    const s = 1.0;
    const topX = cx, topY = cy - th * s;
    const rightX = cx + tw * s, rightY = cy;
    const botX = cx, botY = cy + th * s;
    const leftX = cx - tw * s, leftY = cy;
    const bbX = botX, bbY = botY + bh * s;
    const lbX = leftX, lbY = leftY + bh * s;
    const rbX = rightX, rbY = rightY + bh * s;

    // Soft dim palette for sad block
    const dim = (c: number) => {
      const r = ((c >> 16) & 0xff) * 0.7;
      const gr = ((c >> 8) & 0xff) * 0.7;
      const b = (c & 0xff) * 0.7;
      return (r << 16) | (gr << 8) | b;
    };

    g.fillStyle(dim(pal.right), 1);
    g.fillPath(); g.beginPath();
    g.moveTo(rightX, rightY); g.lineTo(botX, botY); g.lineTo(bbX, bbY); g.lineTo(rbX, rbY);
    g.fillPath();

    g.fillStyle(dim(pal.left), 1);
    g.fillPath(); g.beginPath();
    g.moveTo(leftX, leftY); g.lineTo(botX, botY); g.lineTo(bbX, bbY); g.lineTo(lbX, lbY);
    g.fillPath();

    g.fillStyle(dim(pal.top), 1);
    g.fillPath(); g.beginPath();
    g.moveTo(topX, topY); g.lineTo(rightX, rightY); g.lineTo(botX, botY); g.lineTo(leftX, leftY);
    g.fillPath();

    // Sad eyes
    g.fillStyle(0x333333, 1);
    const ex = cx; const ey = cy - th * 0.1;
    const le = tPt(ex - 22, ey);
    g.fillEllipse(le.x, le.y, 9, 3);
    const re = tPt(ex + 22, ey);
    g.fillEllipse(re.x, re.y, 9, 3);

    // Drooping mouth
    g.lineStyle(3.5, 0x333333, 1);
    g.beginPath();
    const mx = ex, my = ey + 22;
    g.moveTo(tPt(mx - 8, my + 6).x, tPt(mx - 8, my + 6).y);
    g.lineTo(tPt(mx, my).x, tPt(mx, my).y);
    g.lineTo(tPt(mx + 8, my + 6).x, tPt(mx + 8, my + 6).y);
    g.strokePath();
    
    const activeSkin = GameData.activeSkin.get();
    drawHat(g, cx, cy, tw, th, activeSkin, this.time.now, tPt);
  }

  private createButtons(cx: number, cy: number, world: number, level: number, isDaily?: boolean) {
    // 1. WATCH AD FOR +5 MOVES (Bubbly Yellow/Orange Button)
    const adBtnW = 280, adBtnH = 64;
    const adBtn = this.createBubblyBtn(cx, cy, adBtnW, adBtnH, 0xf1c40f, 0xf39c12, '🎬 Watch Ad for +5 Moves', 0);

    // 2. RESTART (Bubbly Green Button)
    const restartBtnW = 220, restartBtnH = 54;
    const restartBtn = this.createBubblyBtn(cx, cy + 86, restartBtnW, restartBtnH, 0x2ecc71, 0x27ae60, '🔄 Restart Level', 100);

    // 3. QUIT (Bubbly Pink Button)
    const quitBtnW = 180, quitBtnH = 46;
    const quitBtn = this.createBubblyBtn(cx, cy + 160, quitBtnW, quitBtnH, 0xe91e63, 0xc2185b, '🏠 Main Menu', 200);

    adBtn.on('pointerdown', async () => {
      audio.playTap();
      const success = await AdManager.showRewardedAd('extra_moves');
      if (success) {
        this.cameras.main.fadeOut(300, 255, 245, 234);
        this.time.delayedCall(320, () => {
          this.scene.resume('Game', { bonusMoves: 5 });
          this.scene.stop();
        });
      }
    });

    restartBtn.on('pointerdown', () => {
      audio.playTap();
      this.cameras.main.fadeOut(300, 255, 245, 234);
      this.time.delayedCall(320, () => {
        this.scene.stop();
        this.scene.start('Game', { world, level, isDaily });
      });
    });

    quitBtn.on('pointerdown', () => {
      audio.playTap();
      this.cameras.main.fadeOut(300, 255, 245, 234);
      this.time.delayedCall(320, () => {
        this.scene.start('Menu');
      });
    });
  }

  private createBubblyBtn(
    x: number, y: number, w: number, h: number,
    fill: number, borderCol: number, label: string, delay: number
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y).setAlpha(0).setDepth(10);
    container.setInteractive(new Phaser.Geom.Rectangle(-w / 2, -h / 2, w, h), Phaser.Geom.Rectangle.Contains);
    container.input!.cursor = 'pointer';

    const bg = this.add.graphics();
    container.add(bg);

    const txt = this.add.text(0, -2, label, {
      fontFamily: 'Fredoka, sans-serif',
      fontSize: '18px',
      fontStyle: 'bold',
      color: '#ffffff',
      stroke: '#000000', strokeThickness: 1.5,
      align: 'center'
    }).setOrigin(0.5);
    container.add(txt);

    const faceCol = fill;
    const shadowCol = borderCol;
    const r = 20;

    const draw = (state: 'idle' | 'hover' | 'pressed') => {
      bg.clear();
      
      let faceY = -h / 2;
      let shH = 6;
      
      if (state === 'pressed') {
        faceY = -h / 2 + 4;
        shH = 2;
        txt.setY(2);
      } else {
        txt.setY(-2);
      }

      const faceBright = state === 'hover' ? blendColor(faceCol, 0xffffff, 0.15) : faceCol;

      bg.fillStyle(shadowCol, 1);
      bg.fillRoundedRect(-w / 2, -h / 2 + shH, w, h, r);

      bg.fillStyle(faceBright, 1);
      bg.fillRoundedRect(-w / 2, faceY, w, h, r);

      bg.lineStyle(2.0, 0xffffff, 0.4);
      bg.beginPath();
      bg.moveTo(-w / 2 + r, faceY + 1.5);
      bg.lineTo(w / 2 - r, faceY + 1.5);
      bg.strokePath();
    };

    draw('idle');

    container.on('pointerover', () => {
      draw('hover');
      gsap.to(container, { scale: 1.05, duration: 0.1, overwrite: 'auto' });
    });

    container.on('pointerout', () => {
      draw('idle');
      gsap.to(container, { scale: 1.0, duration: 0.1, overwrite: 'auto' });
    });

    container.on('pointerdown', () => {
      draw('pressed');
      gsap.to(container, { scale: 0.96, duration: 0.05, overwrite: 'auto' });
    });

    container.on('pointerup', () => {
      draw('hover');
      gsap.to(container, { scale: 1.05, duration: 0.08, overwrite: 'auto' });
    });

    gsap.to(container, {
      alpha: 1,
      duration: 0.5,
      delay: 0.5 + delay / 1000
    });

    return container;
  }
}
