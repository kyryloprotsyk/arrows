/* DefeatScene.ts — Game Over screen offering Ad Continuation or Restart */
import Phaser from 'phaser';
import { GameData } from '../utils/GameData';
import { hslToInt, getBlockPalette, TILE_W, TILE_H, BLOCK_H, drawHat, createCartoonButton } from '../utils/IsoHelper';
import { audio } from '../audio';
import { AdManager } from '../utils/AdManager';

export class DefeatScene extends Phaser.Scene {
  constructor() { super({ key: 'Defeat' }); }

  create(data: { world: number; level: number; isDaily?: boolean }) {
    const { world, level, isDaily } = data;
    const W = this.scale.width, H = this.scale.height;

    this.cameras.main.setBackgroundColor('#1a000a'); // Dark red background
    this.cameras.main.fadeIn(400, 10, 0, 26);

    // Background glow burst (red/dark)
    const bg = this.add.graphics();
    this.drawDefeatBg(bg, W, H);

    // Animated isometric sad block
    this.createSadBlock(W / 2, H * 0.28, world);

    // DEFEAT heading
    const clearTxt = this.add.text(W / 2, H * 0.42, 'OUT OF MOVES!', {
      fontFamily: 'Orbitron',
      fontSize: Math.min(W * 0.1, 52) + 'px',
      color: '#ff4d4d',
      stroke: '#4a0000', strokeThickness: 6,
      shadow: { offsetX: 0, offsetY: 6, color: '#000000', blur: 12, fill: true }
    }).setOrigin(0.5).setAlpha(0).setScale(0.3);

    this.tweens.add({
      targets: clearTxt, alpha: 1, scaleX: 1, scaleY: 1,
      duration: 600, ease: 'Back.Out', delay: 200
    });

    // Buttons
    this.createButtons(W / 2, H * 0.65, world, level, isDaily);
  }

  private drawDefeatBg(g: Phaser.GameObjects.Graphics, W: number, H: number) {
    const steps = 12;
    for (let i = steps; i >= 0; i--) {
      const t = i / steps;
      // Dark red to black gradient
      const col = hslToInt(0, 80, 5 + t * 15);
      const size = (1 - t) * Math.max(W, H) * 1.5;
      g.fillStyle(col, 0.1 + t * 0.1);
      g.fillCircle(W / 2, H / 2, size);
    }
  }

  private createSadBlock(cx: number, cy: number, world: number) {
    const g = this.add.graphics();
    const pal = getBlockPalette(world, 0); // using first block color

    // Wiggle tween
    const bObj = { y: cy - 200, scalePara: 1, scalePerp: 1 };

    this.tweens.add({
      targets: bObj, y: cy,
      duration: 800, ease: 'Bounce.easeOut',
      onUpdate: () => {
        g.clear();
        this.drawSadIsoCube(g, cx, bObj.y, pal, bObj.scalePara, bObj.scalePerp);
      }
    });

    this.time.delayedCall(800, () => {
      this.tweens.add({
        targets: bObj,
        scalePara: 1.05, scalePerp: 0.95,
        duration: 2000, yoyo: true, repeat: -1, ease: 'Sine.InOut',
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

    // Dim colors for sadness
    const dim = (c: number) => {
      const r = ((c >> 16) & 0xff) * 0.6;
      const gr = ((c >> 8) & 0xff) * 0.6;
      const b = (c & 0xff) * 0.6;
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

    // Sad face (X eyes or drooping eyes)
    g.fillStyle(0x111111, 1);
    const ex = cx; const ey = cy - th * 0.1;
    // Left eye
    const le = tPt(ex - 22, ey);
    g.fillEllipse(le.x, le.y, 10, 4);
    // Right eye
    const re = tPt(ex + 22, ey);
    g.fillEllipse(re.x, re.y, 10, 4);

    // Drooping mouth
    g.lineStyle(4, 0x111111, 1);
    g.beginPath();
    const mx = ex, my = ey + 25;
    g.moveTo(tPt(mx - 10, my + 8).x, tPt(mx - 10, my + 8).y);
    g.lineTo(tPt(mx, my).x, tPt(mx, my).y);
    g.lineTo(tPt(mx + 10, my + 8).x, tPt(mx + 10, my + 8).y);
    g.strokePath();
    
    // Skin hat
    const activeSkin = GameData.activeSkin.get();
    drawHat(g, cx, cy, tw, th, activeSkin, this.time.now, tPt);
  }

  private createButtons(cx: number, cy: number, world: number, level: number, isDaily?: boolean) {
    // 1. WATCH AD FOR +5 MOVES (Primary Action)
    const adBtnW = 280, adBtnH = 65;
    const adFontSize = Math.min(Math.round(adBtnH * 0.38), Math.round(adBtnW / Math.max('🎬 Watch Ad for +5 Moves'.length * 0.5, 1)), 20);
    const adBtn = createCartoonButton(this, cx, cy, adBtnW, adBtnH, '🎬 Watch Ad for +5 Moves', async () => {
      audio.playTap();
      const success = await AdManager.showRewardedAd('extra_moves' as any);
      if (success) {
        this.cameras.main.fadeOut(300, 10, 0, 26);
        this.time.delayedCall(320, () => {
          this.scene.resume('Game', { bonusMoves: 5 });
          this.scene.stop();
        });
      }
    }, { bgColor: 0xffaa00, textColor: '#000000', fontSize: adFontSize });
    adBtn.setAlpha(0).setScale(0.8);

    // 2. RESTART (Secondary Action)
    const restartBtnW = 200, restartBtnH = 55;
    const restartFontSize = Math.min(Math.round(restartBtnH * 0.38), Math.round(restartBtnW / Math.max('🔄 Restart Level'.length * 0.5, 1)), 20);
    const restartBtn = createCartoonButton(this, cx, cy + 90, restartBtnW, restartBtnH, '🔄 Restart Level', () => {
      audio.playTap();
      this.cameras.main.fadeOut(300, 10, 0, 26);
      this.time.delayedCall(320, () => {
        this.scene.stop();
        this.scene.start('Game', { world, level, isDaily });
      });
    }, { bgColor: 0x50fa7b, fontSize: restartFontSize });
    restartBtn.setAlpha(0).setScale(0.8);

    // 3. QUIT (Tertiary)
    const quitBtnW = 180, quitBtnH = 48;
    const quitBtn = createCartoonButton(this, cx, cy + 165, quitBtnW, quitBtnH, '🏠 Main Menu', () => {
      audio.playTap();
      this.cameras.main.fadeOut(300, 10, 0, 26);
      this.time.delayedCall(320, () => {
        this.scene.start('Menu');
      });
    }, { bgColor: 0xff5555, fontSize: 16 });
    quitBtn.setAlpha(0).setScale(0.8);

    // Animate all in
    this.tweens.add({
      targets: [adBtn, restartBtn, quitBtn],
      alpha: 1, scale: 1,
      duration: 500, delay: 600, stagger: 150, ease: 'Back.Out'
    });
  }
}
