/* DefeatScene.ts — Game Over screen offering Ad Continuation or Restart */
import Phaser from 'phaser';
import { GameData } from '../utils/GameData';
import { hslToInt, getBlockPalette, TILE_W, TILE_H, BLOCK_H, drawHat } from '../utils/IsoHelper';
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
      fontFamily: 'Fredoka',
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
    const adBtn = this.add.container(cx, cy).setAlpha(0).setScale(0.8);
    const adGfx = this.add.graphics();
    const drawAdBtn = (hover: boolean) => {
      adGfx.clear();
      adGfx.fillStyle(hover ? 0xffcc00 : 0xffaa00, 1);
      adGfx.fillRoundedRect(-adBtnW / 2, -adBtnH / 2, adBtnW, adBtnH, 16);
      adGfx.lineStyle(4, 0xffffff, hover ? 1 : 0.8);
      adGfx.strokeRoundedRect(-adBtnW / 2, -adBtnH / 2, adBtnW, adBtnH, 16);
    };
    drawAdBtn(false);

    const adTxt = this.add.text(0, 0, '🎬 Watch Ad for +5 Moves', {
      fontFamily: 'Fredoka', fontSize: '22px', color: '#000', fontStyle: 'bold'
    }).setOrigin(0.5);

    adBtn.add([adGfx, adTxt]);
    adBtn.setSize(adBtnW, adBtnH).setInteractive({
      hitArea: new Phaser.Geom.Rectangle(-adBtnW / 2, -adBtnH / 2, adBtnW, adBtnH),
      hitAreaCallback: Phaser.Geom.Rectangle.Contains,
      useHandCursor: true
    });
    
    adBtn.on('pointerover', () => { drawAdBtn(true); this.tweens.add({ targets: adBtn, scale: 1.05, duration: 150 }); });
    adBtn.on('pointerout', () => { drawAdBtn(false); this.tweens.add({ targets: adBtn, scale: 1, duration: 150 }); });
    adBtn.on('pointerdown', async () => {
      audio.playTap();
      // Call AdManager to show reward video
      const success = await AdManager.showRewardedAd('extra_moves' as any); // cast to any if 'extra_moves' is not in AdType
      if (success) {
        // Success callback: return to game with +5 moves without losing progress
        this.cameras.main.fadeOut(300, 10, 0, 26);
        this.time.delayedCall(320, () => {
          this.scene.resume('Game', { bonusMoves: 5 });
          this.scene.stop();
        });
      }
    });

    // 2. RESTART (Secondary Action)
    const restartBtnW = 200, restartBtnH = 55;
    const restartBtn = this.add.container(cx, cy + 90).setAlpha(0).setScale(0.8);
    const restartGfx = this.add.graphics();
    const drawRestartBtn = (hover: boolean) => {
      restartGfx.clear();
      restartGfx.fillStyle(0x333344, hover ? 1 : 0.8);
      restartGfx.fillRoundedRect(-restartBtnW / 2, -restartBtnH / 2, restartBtnW, restartBtnH, 12);
    };
    drawRestartBtn(false);

    const restartTxt = this.add.text(0, 0, '🔄 Restart Level', {
      fontFamily: 'Fredoka', fontSize: '20px', color: '#ffffff', fontStyle: 'bold'
    }).setOrigin(0.5);

    restartBtn.add([restartGfx, restartTxt]);
    restartBtn.setSize(restartBtnW, restartBtnH).setInteractive({
      hitArea: new Phaser.Geom.Rectangle(-restartBtnW / 2, -restartBtnH / 2, restartBtnW, restartBtnH),
      hitAreaCallback: Phaser.Geom.Rectangle.Contains,
      useHandCursor: true
    });

    restartBtn.on('pointerover', () => { drawRestartBtn(true); this.tweens.add({ targets: restartBtn, scale: 1.05, duration: 150 }); });
    restartBtn.on('pointerout', () => { drawRestartBtn(false); this.tweens.add({ targets: restartBtn, scale: 1, duration: 150 }); });
    restartBtn.on('pointerdown', () => {
      audio.playTap();
      this.cameras.main.fadeOut(300, 10, 0, 26);
      this.time.delayedCall(320, () => {
        this.scene.stop();
        this.scene.start('Game', { world, level, isDaily });
      });
    });

    // 3. QUIT (Tertiary)
    const quitBtnW = 160, quitBtnH = 40;
    const quitBtn = this.add.container(cx, cy + 160).setAlpha(0);
    const quitTxt = this.add.text(0, 0, '🏠 Main Menu', {
      fontFamily: 'Fredoka', fontSize: '18px', color: '#aaaaaa'
    }).setOrigin(0.5);
    quitBtn.add(quitTxt);
    quitBtn.setSize(quitBtnW, quitBtnH).setInteractive({ useHandCursor: true });
    quitBtn.on('pointerdown', () => {
      audio.playTap();
      this.cameras.main.fadeOut(300, 10, 0, 26);
      this.time.delayedCall(320, () => {
        this.scene.start('Menu');
      });
    });

    // Animate all in
    this.tweens.add({
      targets: [adBtn, restartBtn, quitBtn],
      alpha: 1, scale: 1,
      duration: 500, delay: 600, stagger: 150, ease: 'Back.Out'
    });
  }
}
