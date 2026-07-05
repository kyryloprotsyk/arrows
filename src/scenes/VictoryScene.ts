/* VictoryScene.ts — Cinematic level-clear screen with stars, confetti, rewards */
import Phaser from 'phaser';
import { GameData } from '../utils/GameData';
import { hslToInt, getBlockPalette, TILE_W, TILE_H, BLOCK_H, drawHat } from '../utils/IsoHelper';
import { audio } from '../audio';

export class VictoryScene extends Phaser.Scene {
  constructor() { super({ key: 'Victory' }); }

  create(data: { world: number; level: number; stars: number; reward: number; movesLeft: number }) {
    const { world, level, stars, reward } = data;
    const W = this.scale.width, H = this.scale.height;

    this.cameras.main.setBackgroundColor('#0a001a');
    this.cameras.main.fadeIn(400, 10, 0, 26);

    // Background glow burst
    const bg = this.add.graphics();
    this.drawGlowBg(bg, W, H, world);

    // Floating confetti particles
    const confetti = this.add.particles(0, 0, 'star_particle', {
      x: { min: 0, max: W },
      y: { min: -20, max: -5 },
      speedX: { min: -60, max: 60 },
      speedY: { min: 60, max: 200 },
      gravityY: 120,
      scale: { start: 1.2, end: 0 },
      lifespan: { min: 1200, max: 2500 },
      tint: [0xff6eb4, 0xffe45e, 0x6bcb77, 0x74c0fc, 0x9b72ff],
      frequency: 60
    }).setDepth(0);

    // Animated isometric trophy block
    this.createTrophyBlock(W / 2, H * 0.22, world);

    // LEVEL CLEAR heading
    const clearTxt = this.add.text(W / 2, H * 0.36, '✨ LEVEL CLEAR! ✨', {
      fontFamily: 'Fredoka',
      fontSize: Math.min(W * 0.09, 52) + 'px',
      color: '#ffe45e',
      stroke: '#ffffff', strokeThickness: 4,
      shadow: { offsetX: 0, offsetY: 6, color: '#ffa500', blur: 24, fill: true }
    }).setOrigin(0.5).setAlpha(0).setScale(0.3);

    this.tweens.add({
      targets: clearTxt, alpha: 1, scaleX: 1, scaleY: 1,
      duration: 600, ease: 'Back.Out', delay: 200
    });

    // Star rating display
    this.createStarRow(W / 2, H * 0.47, stars);

    // Stats card
    this.createStatsCard(W / 2, H * 0.62, reward, data.movesLeft);

    // Proportional next level logic (clearing Level 5 automatically moves to next World's Level 1)
    let nextWorld = world;
    let nextLevel = level + 1;
    let hasNext = true;
    if (nextLevel > 5) {
      nextLevel = 1;
      nextWorld = world + 1;
      if (nextWorld > 3) {
        hasNext = false;
      }
    }

    const btnNext = this.createBtn(
      W / 2, H * 0.79, 220, 52, 0xff6eb4, 0xff0088,
      hasNext ? (nextWorld !== world ? `Next World ${nextWorld} →` : `Next Level ${nextLevel} →`) : '🌍 World Select',
      0
    );

    const btnRetry = this.createBtn(W / 2, H * 0.87, 180, 44, 0x664466, 0x9b72ff, '🔄 Play Again', 100);

    btnNext.on('pointerdown', () => {
      audio.playTap();
      this.cameras.main.fadeOut(300, 10, 0, 26);
      this.time.delayedCall(320, () => {
        confetti.destroy();
        if (hasNext) {
          this.scene.start('Game', { world: nextWorld, level: nextLevel });
        } else {
          this.scene.start('WorldSelect');
        }
      });
    });

    btnRetry.on('pointerdown', () => {
      audio.playTap();
      this.cameras.main.fadeOut(300, 10, 0, 26);
      this.time.delayedCall(320, () => {
        confetti.destroy();
        this.scene.start('Game', { world, level });
      });
    });
  }

  private drawGlowBg(g: Phaser.GameObjects.Graphics, W: number, H: number, world: number) {
    const hues = [0, 330, 140, 225];
    const h = hues[world] ?? 330;
    g.fillStyle(0x0a001a, 1);
    g.fillRect(0, 0, W, H);

    // Radial glow
    for (let r = 6; r >= 0; r--) {
      const col = hslToInt(h, 60, 20 - r * 2);
      const radius = (1 - r / 6) * Math.min(W, H) * 0.7;
      g.fillStyle(col, 0.06 + r * 0.01);
      g.fillCircle(W / 2, H * 0.3, radius);
    }

    // Stars
    for (let i = 0; i < 80; i++) {
      g.fillStyle(0xffffff, 0.2 + Math.random() * 0.5);
      g.fillCircle(Math.random() * W, Math.random() * H, Math.random() * 1.4 + 0.3);
    }
  }

  private createTrophyBlock(cx: number, cy: number, world: number) {
    const g = this.add.graphics().setAlpha(0);
    const pal = getBlockPalette(world, 2);
    const tw = TILE_W * 0.8, th = TILE_H * 0.8, bh = BLOCK_H * 0.8;

    const drawIt = (scale: number) => {
      g.clear();
      const tw2 = tw * scale, th2 = th * scale, bh2 = bh * scale;
      const fillPoly = (coords: number[]) => {
        g.beginPath();
        g.moveTo(coords[0], coords[1]);
        for (let i = 2; i < coords.length; i += 2) g.lineTo(coords[i], coords[i + 1]);
        g.closePath();
        g.fillPath();
      };
      g.fillStyle(pal.right, 1); fillPoly([cx+tw2,cy, cx,cy+th2, cx,cy+th2+bh2, cx+tw2,cy+bh2]);
      g.fillStyle(pal.left, 1);  fillPoly([cx-tw2,cy, cx,cy+th2, cx,cy+th2+bh2, cx-tw2,cy+bh2]);
      g.fillStyle(pal.top, 1);   fillPoly([cx,cy-th2, cx+tw2,cy, cx,cy+th2, cx-tw2,cy]);
      g.lineStyle(2, pal.glow, 0.7);
      g.beginPath();
      g.moveTo(cx, cy - th2);
      g.lineTo(cx + tw2, cy);
      g.lineTo(cx, cy + th2);
      g.lineTo(cx - tw2, cy);
      g.closePath();
      g.strokePath();

      // Draw Active Skin Hat
      const activeSkin = GameData.activeSkin.get();
      if (activeSkin !== 'none') {
        drawHat(g, cx, cy, tw2, th2, activeSkin, this.time.now);
      } else {
        // Default trophy star
        g.fillStyle(0xffee55, 0.9);
        g.fillCircle(cx, cy - 4, 10 * scale);
        g.fillStyle(0xffffff, 0.5);
        g.fillCircle(cx - 3, cy - 7, 4 * scale);
      }
    };

    drawIt(1);
    this.tweens.add({ targets: g, alpha: 1, duration: 600, delay: 400 });

    // Gentle float + spin
    let t = 0;
    this.time.addEvent({
      delay: 16, repeat: -1,
      callback: () => {
        t += 0.016;
        const bounce = Math.sin(t * 1.5) * 5;
        g.setY(bounce);
        drawIt(1 + Math.sin(t * 0.8) * 0.04);
      }
    });
  }

  private createStarRow(cx: number, cy: number, stars: number) {
    const spacing = 70;
    for (let i = 0; i < 3; i++) {
      const filled = i < stars;
      const x = cx + (i - 1) * spacing;
      const star = this.add.text(x, cy, filled ? '⭐' : '☆', {
        fontFamily: 'Fredoka',
        fontSize: filled ? '52px' : '40px',
        color: filled ? '#ffe45e' : '#443344'
      }).setOrigin(0.5).setAlpha(0).setScale(0.3);

      this.tweens.add({
        targets: star, alpha: 1, scaleX: 1, scaleY: 1,
        duration: 500, ease: 'Back.Out', delay: 600 + i * 180
      });

      if (filled) {
        this.time.delayedCall(600 + i * 180 + 300, () => {
          this.tweens.add({
            targets: star, scaleX: 1.15, scaleY: 1.15,
            duration: 600, yoyo: true, repeat: -1, ease: 'Sine.InOut',
            delay: i * 150
          });
        });
      }
    }
  }

  private createStatsCard(cx: number, cy: number, reward: number, movesLeft: number) {
    const w = Math.min(this.scale.width * 0.7, 300), h = 70;
    const g = this.add.graphics().setAlpha(0);
    g.fillStyle(0x1a0040, 0.85);
    g.fillRoundedRect(cx - w / 2, cy - h / 2, w, h, 16);
    g.lineStyle(1.5, 0x9b72ff, 0.5);
    g.strokeRoundedRect(cx - w / 2, cy - h / 2, w, h, 16);

    const coins = this.add.text(cx - w / 4, cy - 10, `🪙 +${reward}`, {
      fontFamily: 'Fredoka', fontSize: '22px', color: '#ffe45e'
    }).setOrigin(0.5).setAlpha(0);

    const moves = this.add.text(cx + w / 4, cy - 10, `⚡ ${movesLeft} left`, {
      fontFamily: 'Fredoka', fontSize: '22px', color: '#74c0fc'
    }).setOrigin(0.5).setAlpha(0);

    const total = this.add.text(cx, cy + 20, `Total coins: ${GameData.coins.get()}`, {
      fontFamily: 'Fredoka', fontSize: '15px', color: '#9b72ff'
    }).setOrigin(0.5).setAlpha(0);

    this.tweens.add({ targets: [g, coins, moves, total], alpha: 1, duration: 500, delay: 900 });
  }

  private createBtn(
    x: number, y: number, w: number, h: number,
    fill: number, glow: number, label: string, delay: number
  ): Phaser.GameObjects.Graphics {
    const g = this.add.graphics().setAlpha(0).setDepth(10);
    g.setInteractive(new Phaser.Geom.Rectangle(x - w / 2, y - h / 2, w, h), Phaser.Geom.Rectangle.Contains);

    const draw = (hover: boolean) => {
      g.clear();
      g.fillStyle(glow, 0.2);
      g.fillRoundedRect(x - w / 2 + 2, y - h / 2 + 6, w, h, h / 2);
      g.fillStyle(hover ? fill : Phaser.Display.Color.ValueToColor(fill).darken(15).color, 1);
      g.fillRoundedRect(x - w / 2, y - h / 2, w, h, h / 2);
      for (let p = 0; p < 3; p++) {
        g.lineStyle([4, 2.5, 1.5][p], glow, [0.12, 0.3, 0.7][p]);
        g.strokeRoundedRect(x - w / 2, y - h / 2, w, h, h / 2);
      }
    };
    draw(false);

    const txt = this.add.text(x, y, label, {
      fontFamily: 'Fredoka', fontSize: '20px', color: '#ffffff'
    }).setOrigin(0.5).setAlpha(0).setDepth(11);

    g.on('pointerover', () => { draw(true); g.setScale(1.04); });
    g.on('pointerout',  () => { draw(false); g.setScale(1); });

    this.tweens.add({ targets: [g, txt], alpha: 1, duration: 500, delay: 1200 + delay });
    return g;
  }
}
