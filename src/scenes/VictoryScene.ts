/* VictoryScene.ts — Cinematic level-clear screen with stars, confetti, rewards */
import Phaser from 'phaser';
import { GameData } from '../utils/GameData';
import { hslToInt, getBlockPalette, TILE_W, TILE_H, BLOCK_H, drawHat, blendColor } from '../utils/IsoHelper';
import { audio } from '../audio';
import { AdManager } from '../utils/AdManager';

export class VictoryScene extends Phaser.Scene {
  constructor() { super({ key: 'Victory' }); }

  create(data: {
    world: number; level: number; stars: number; reward: number; movesLeft: number;
    isDaily?: boolean; xpEarned?: number; oldLevel?: number; newLevel?: number;
    userRank?: number; par?: number; movesTotal?: number;
  }) {
    const { world, level, stars, reward, isDaily, xpEarned, oldLevel, newLevel, userRank, par, movesTotal } = data;
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
    this.createTrophyBlock(W / 2, H * 0.15, world);

    // LEVEL CLEAR / DAILY COMPLETE heading
    const clearTitle = isDaily ? '🔥 DAILY COMPLETE! (+150 🪙)' : '✨ LEVEL CLEAR! ✨';
    const clearTxt = this.add.text(W / 2, H * 0.26, clearTitle, {
      fontFamily: 'Orbitron',
      fontSize: Math.min(W * (isDaily ? 0.075 : 0.09), 48) + 'px',
      color: '#ffe45e',
      stroke: '#ffffff', strokeThickness: 4,
      shadow: { offsetX: 0, offsetY: 6, color: '#ffa500', blur: 24, fill: true }
    }).setOrigin(0.5).setAlpha(0).setScale(0.3);

    this.tweens.add({
      targets: clearTxt, alpha: 1, scaleX: 1, scaleY: 1,
      duration: 600, ease: 'Back.Out', delay: 200
    });

    // Star rating display
    this.createStarRow(W / 2, H * 0.36, stars);

    // Par score badge
    if (par !== undefined && movesTotal !== undefined) {
      const movesUsed = movesTotal - (data.movesLeft ?? 0);
      const parDiff = movesUsed - par;
      const parLabel = parDiff < 0 ? `🏆 Under Par (${parDiff})` :
                       parDiff === 0 ? '⚡ Par!' :
                       `+${parDiff} Over Par`;
      const parColor = parDiff < 0 ? '#00ffcc' : parDiff === 0 ? '#ffe45e' : '#ff6b6b';
      const parBg = this.add.graphics().setAlpha(0);
      const pw = Math.min(W * 0.5, 180), ph = 28;
      parBg.fillStyle(0x110022, 0.9);
      parBg.fillRoundedRect(W / 2 - pw / 2, H * 0.42 - ph / 2, pw, ph, 14);
      parBg.lineStyle(1.5, parDiff < 0 ? 0x00ffcc : parDiff === 0 ? 0xffe45e : 0xff6b6b, 0.8);
      parBg.strokeRoundedRect(W / 2 - pw / 2, H * 0.42 - ph / 2, pw, ph, 14);
      const parTxt = this.add.text(W / 2, H * 0.42, parLabel, {
        fontFamily: 'Orbitron', fontSize: '14px', color: parColor, fontStyle: 'bold'
      }).setOrigin(0.5).setAlpha(0);
      this.tweens.add({ targets: [parBg, parTxt], alpha: 1, duration: 400, delay: 700 });
    }

    // Stats card Y calculations to avoid overlap on small screens
    const statsCardHeight = 76;
    const statsCardY = H * 0.505;
    this.createStatsCard(W / 2, statsCardY, reward, xpEarned, userRank);

    let currentY = statsCardY + statsCardHeight / 2; // bottom of stats card

    // Level up check
    let lvlUpBannerText: Phaser.GameObjects.Text | null = null;
    if (newLevel && oldLevel && newLevel > oldLevel) {
      GameData.coins.add(100);
      currentY += 8; // gap
      const bannerHeight = 32;
      const bannerY = currentY + bannerHeight / 2;
      lvlUpBannerText = this.add.text(W / 2, bannerY, `🎉 LEVEL UP! Lvl ${oldLevel} → ${newLevel}! (+100 Bonus Coins) 🎉`, {
        fontFamily: 'Orbitron', fontSize: Math.min(W * 0.040, 15) + 'px',
        color: '#00ffcc', backgroundColor: '#002244ee', padding: { x: 12, y: 5 }
      }).setOrigin(0.5).setDepth(15).setAlpha(0);

      this.tweens.add({
        targets: lvlUpBannerText, alpha: 1, scale: 1.05,
        duration: 500, delay: 1000, ease: 'Back.Out'
      });
      currentY += bannerHeight;
    }

    // Proportional next level logic (clearing Level 5 automatically moves to next World's Level 1)
    let nextWorld = world;
    let nextLevel = level + 1;
    let hasNext = true;
    if (nextLevel > 5) {
      nextLevel = 1;
      nextWorld = world + 1;
      if (nextWorld > 6) {
        hasNext = false;
      }
    }

    // 3X Rewarded Ad Bonus Button
    currentY += 12; // gap
    const btnAdHeight = 48;
    const btnAdY = currentY + btnAdHeight / 2;
    const btnAd = this.createBtn(
      W / 2, btnAdY, 260, btnAdHeight, 0x00bb88, 0x00ffcc, `👑 Watch Ad for 3X Coins! (+${reward * 2}🪙)`, 0
    );
    currentY += btnAdHeight;

    // Next button
    currentY += 12; // gap
    const btnNextHeight = 50;
    const btnNextY = currentY + btnNextHeight / 2;
    const btnNextText = isDaily ? '📅 Daily Calendar →' : (hasNext ? (nextWorld !== world ? `Next World ${nextWorld} →` : `Next Level ${nextLevel} →`) : '🌍 World Select');
    const btnNext = this.createBtn(
      W / 2, btnNextY, 230, btnNextHeight, 0xff6eb4, 0xff0088,
      btnNextText,
      100
    );
    currentY += btnNextHeight;

    // Play Again/Retry button
    currentY += 12; // gap
    const btnRetryHeight = 42;
    const btnRetryY = currentY + btnRetryHeight / 2;
    const btnRetry = this.createBtn(W / 2, btnRetryY, 180, btnRetryHeight, 0x664466, 0x9b72ff, '🔄 Play Again', 200);

    btnAd.on('pointerdown', async () => {
      audio.playTap();
      const success = await AdManager.showRewardedAd('3x_coins');
      if (success) {
        const bonus = reward * 2;
        GameData.coins.add(bonus);
        audio.playVictory();
        btnAd.destroy();
        const burst = this.add.particles(0, 0, 'star_particle', {
          x: { min: W * 0.3, max: W * 0.7 },
          y: { min: H * 0.65, max: H * 0.75 },
          speed: { min: 80, max: 260 },
          scale: { start: 1.6, end: 0 },
          lifespan: 1600,
          tint: [0xffe45e, 0xff6eb4, 0x00ffcc]
        });
        this.time.delayedCall(1700, () => burst.destroy());
      }
    });

    btnNext.on('pointerdown', () => {
      audio.playTap();
      this.cameras.main.fadeOut(300, 10, 0, 26);
      this.time.delayedCall(320, () => {
        confetti.destroy();
        if (isDaily) {
          this.scene.start('DailyChallenge');
        } else if (hasNext) {
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
        fontFamily: 'Orbitron',
        fontSize: filled ? '48px' : '36px',
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

  private createStatsCard(cx: number, cy: number, reward: number, xpEarned?: number, userRank?: number) {
    const w = Math.min(this.scale.width * 0.85, 330), h = 76;
    const g = this.add.graphics().setAlpha(0);
    g.fillStyle(0x1a0040, 0.9);
    g.fillRoundedRect(cx - w / 2, cy - h / 2, w, h, 16);
    g.lineStyle(1.5, 0x00ffcc, 0.6);
    g.strokeRoundedRect(cx - w / 2, cy - h / 2, w, h, 16);

    const coins = this.add.text(cx - w * 0.28, cy - 14, `🪙 +${reward}`, {
      fontFamily: 'Orbitron', fontSize: '18px', color: '#ffe45e', fontStyle: 'bold'
    }).setOrigin(0.5).setAlpha(0);

    const xp = this.add.text(cx, cy - 14, `⚡ +${xpEarned || 85} XP`, {
      fontFamily: 'Orbitron', fontSize: '18px', color: '#00ffcc', fontStyle: 'bold'
    }).setOrigin(0.5).setAlpha(0);

    const moves = this.add.text(cx + w * 0.28, cy - 14, `🔥 ${GameData.winStreak.get()}x Streak`, {
      fontFamily: 'Orbitron', fontSize: '16px', color: '#ff6eb4', fontStyle: 'bold'
    }).setOrigin(0.5).setAlpha(0);

    const total = this.add.text(cx, cy + 16, `Total: ${GameData.coins.get()}🪙  •  Global Rank: #${userRank || 15} 🏆`, {
      fontFamily: 'Orbitron', fontSize: '14px', color: '#ccbbff'
    }).setOrigin(0.5).setAlpha(0);

    this.tweens.add({ targets: [g, coins, xp, moves, total], alpha: 1, duration: 500, delay: 900 });
  }

  private createBtn(
    x: number, y: number, w: number, h: number,
    fill: number, glow: number, label: string, delay: number
  ): Phaser.GameObjects.Container {
    void glow;
    const container = this.add.container(x, y).setAlpha(0).setDepth(10);
    container.setSize(w, h);
    container.setInteractive(new Phaser.Geom.Rectangle(-w / 2, -h / 2, w, h), Phaser.Geom.Rectangle.Contains);
    container.input!.cursor = 'pointer';

    const bg = this.add.graphics();
    container.add(bg);

    const labelLen = label.replace(/\p{Emoji}/gu, '  ').length;
    const fontSize = Math.min(Math.round(h * 0.42), Math.round(w / Math.max(labelLen * 0.52, 1)), 22);

    const txt = this.add.text(0, -2, label, {
      fontFamily: 'Orbitron',
      fontSize: `${fontSize}px`,
      color: '#ffffff',
      stroke: '#000000', strokeThickness: 2.2,
      align: 'center'
    }).setOrigin(0.5);
    container.add(txt);

    const faceCol = fill;
    const shadowCol = blendColor(faceCol, 0x000000, 0.4);
    const r = h / 2;

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

      // 1. Draw 3D shadow/thickness (Darker bottom layer)
      bg.fillStyle(shadowCol, 1);
      bg.fillRoundedRect(-w / 2, -h / 2 + shH, w, h, r);

      // 2. Draw Main top face
      bg.fillStyle(faceBright, 1);
      bg.fillRoundedRect(-w / 2, faceY, w, h, r);

      // 3. Highlight Bevel
      bg.lineStyle(1.8, 0xffffff, 0.4);
      bg.beginPath();
      bg.moveTo(-w / 2 + r, faceY + 1.2);
      bg.lineTo(w / 2 - r, faceY + 1.2);
      bg.strokePath();
    };

    draw('idle');

    container.on('pointerover', () => {
      draw('hover');
      this.tweens.add({
        targets: container,
        scaleX: 1.05,
        scaleY: 1.05,
        duration: 100,
        ease: 'Quad.Out',
        overwrite: true
      });
    });

    container.on('pointerout', () => {
      draw('idle');
      this.tweens.add({
        targets: container,
        scaleX: 1.0,
        scaleY: 1.0,
        duration: 100,
        ease: 'Quad.Out',
        overwrite: true
      });
    });

    container.on('pointerdown', () => {
      draw('pressed');
      this.tweens.add({
        targets: container,
        scaleX: 0.96,
        scaleY: 0.96,
        duration: 50,
        ease: 'Quad.Out',
        overwrite: true
      });
    });

    container.on('pointerup', () => {
      draw('hover');
      this.tweens.add({
        targets: container,
        scaleX: 1.05,
        scaleY: 1.05,
        duration: 80,
        ease: 'Quad.Out',
        overwrite: true
      });
    });

    this.tweens.add({ targets: container, alpha: 1, duration: 500, delay: 1200 + delay });
    return container;
  }
}
