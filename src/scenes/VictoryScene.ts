/* VictoryScene.ts — Cinematic level-clear screen with stars, confetti, rewards */
import Phaser from 'phaser';
import { GameData } from '../utils/GameData';
import { hslToInt, getBlockPalette, TILE_W, TILE_H, BLOCK_H, drawHat, blendColor } from '../utils/IsoHelper';
import { audio } from '../audio';
import { AdManager } from '../utils/AdManager';
import confetti from 'canvas-confetti';
import { gsap } from 'gsap';

export class VictoryScene extends Phaser.Scene {
  constructor() { super({ key: 'Victory' }); }

  create(data: {
    world: number; level: number; stars: number; reward: number; movesLeft: number;
    isDaily?: boolean; xpEarned?: number; oldLevel?: number; newLevel?: number;
    userRank?: number; par?: number; movesTotal?: number;
  }) {
    const { world, level, stars, reward, isDaily, xpEarned, oldLevel, newLevel, userRank, par, movesTotal } = data;
    const W = this.scale.width, H = this.scale.height;

    // Soft warm background for cartoon style
    this.cameras.main.setBackgroundColor('#fff5ea');
    this.cameras.main.fadeIn(400, 255, 245, 234);

    // Background cartoon styling
    const bg = this.add.graphics();
    this.drawCartoonBg(bg, W, H, world);

    // Trigger premium canvas-confetti burst immediately!
    this.triggerConfetti();

    // Animated isometric trophy block
    const trophy = this.createTrophyBlock(W / 2, H * 0.17, world);

    // LEVEL CLEAR / DAILY COMPLETE heading (Fredoka font, bubbly & drop-shadowed)
    const clearTitle = isDaily ? '🔥 DAILY COMPLETE!' : '✨ LEVEL CLEAR! ✨';
    const clearTxt = this.add.text(W / 2, H * 0.28, clearTitle, {
      fontFamily: 'Fredoka, sans-serif',
      fontSize: Math.min(W * (isDaily ? 0.075 : 0.09), 42) + 'px',
      color: '#ff9f1c',
      fontStyle: 'bold',
      stroke: '#ffffff', strokeThickness: 6,
      shadow: { offsetX: 0, offsetY: 4, color: '#5c3d2e', blur: 0, fill: true }
    }).setOrigin(0.5).setAlpha(0).setScale(0.3);

    gsap.to(clearTxt, {
      alpha: 1,
      scale: 1.0,
      duration: 0.6,
      ease: 'back.out(1.7)',
      delay: 0.2
    });

    // Star rating display
    this.createStarRow(W / 2, H * 0.37, stars);

    // Par score badge
    if (par !== undefined && movesTotal !== undefined) {
      const movesUsed = movesTotal - (data.movesLeft ?? 0);
      const parDiff = movesUsed - par;
      const parLabel = parDiff < 0 ? `🏆 Under Par (${parDiff})` :
                       parDiff === 0 ? '⚡ Par!' :
                       `+${parDiff} Over Par`;
      const parColor = parDiff < 0 ? '#27ae60' : parDiff === 0 ? '#f39c12' : '#e74c3c';
      
      const parBg = this.add.graphics().setAlpha(0);
      const pw = Math.min(W * 0.5, 180), ph = 32;
      parBg.fillStyle(0xffffff, 0.95);
      parBg.fillRoundedRect(W / 2 - pw / 2, H * 0.43 - ph / 2, pw, ph, 16);
      parBg.lineStyle(2.5, parDiff < 0 ? 0x27ae60 : parDiff === 0 ? 0xf39c12 : 0xe74c3c, 1.0);
      parBg.strokeRoundedRect(W / 2 - pw / 2, H * 0.43 - ph / 2, pw, ph, 16);

      const parTxt = this.add.text(W / 2, H * 0.43, parLabel, {
        fontFamily: 'Fredoka, sans-serif', fontSize: '15px', color: parColor, fontStyle: 'bold'
      }).setOrigin(0.5).setAlpha(0);

      gsap.to([parBg, parTxt], {
        alpha: 1,
        duration: 0.4,
        delay: 0.7,
        stagger: 0.1
      });
    }

    // Stats card Y calculations
    const statsCardHeight = 84;
    const statsCardY = H * 0.52;
    this.createStatsCard(W / 2, statsCardY, reward, xpEarned, userRank);

    let currentY = statsCardY + statsCardHeight / 2;

    // Level up check
    if (newLevel && oldLevel && newLevel > oldLevel) {
      GameData.coins.add(100);
      currentY += 10;
      const bannerHeight = 36;
      const bannerY = currentY + bannerHeight / 2;
      const lvlUpBannerText = this.add.text(W / 2, bannerY, `🎉 LEVEL UP! Lvl ${oldLevel} → ${newLevel}! (+100 🪙) 🎉`, {
        fontFamily: 'Fredoka, sans-serif', fontSize: Math.min(W * 0.045, 16) + 'px',
        color: '#27ae60', backgroundColor: '#eafaf1', padding: { x: 16, y: 6 },
        fontStyle: 'bold'
      }).setOrigin(0.5).setDepth(15).setAlpha(0);

      gsap.to(lvlUpBannerText, {
        alpha: 1,
        scale: 1.05,
        duration: 0.5,
        delay: 1.0,
        ease: 'back.out(1.5)'
      });
      currentY += bannerHeight;
    }

    // Next level calculations
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

    // 3X Rewarded Ad Bonus Button (Bubbly Green Button)
    currentY += 14;
    const btnAdHeight = 52;
    const btnAdY = currentY + btnAdHeight / 2;
    const btnAd = this.createBubblyBtn(
      W / 2, btnAdY, 280, btnAdHeight, 0x2ecc71, 0x27ae60, `👑 Watch Ad 3X Coins! (+${reward * 2}🪙)`, 0
    );
    currentY += btnAdHeight;

    // Next button (Bubbly Pink Button)
    currentY += 12;
    const btnNextHeight = 54;
    const btnNextY = currentY + btnNextHeight / 2;
    const btnNextText = isDaily ? '📅 Daily Calendar →' : (hasNext ? (nextWorld !== world ? `Next World ${nextWorld} →` : `Next Level ${nextLevel} →`) : '🌍 World Select');
    const btnNext = this.createBubblyBtn(
      W / 2, btnNextY, 250, btnNextHeight, 0xe91e63, 0xc2185b,
      btnNextText,
      100
    );
    currentY += btnNextHeight;

    // Play Again/Retry button (Bubbly Purple Button)
    currentY += 12;
    const btnRetryHeight = 44;
    const btnRetryY = currentY + btnRetryHeight / 2;
    const btnRetry = this.createBubblyBtn(W / 2, btnRetryY, 190, btnRetryHeight, 0x9b59b6, 0x8e44ad, '🔄 Play Again', 200);

    btnAd.on('pointerdown', async () => {
      audio.playTap();
      const success = await AdManager.showRewardedAd('3x_coins');
      if (success) {
        const bonus = reward * 2;
        GameData.coins.add(bonus);
        audio.playVictory();
        btnAd.destroy();
        this.triggerConfetti();
      }
    });

    btnNext.on('pointerdown', () => {
      audio.playTap();
      this.cameras.main.fadeOut(300, 255, 245, 234);
      this.time.delayedCall(320, () => {
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
      this.cameras.main.fadeOut(300, 255, 245, 234);
      this.time.delayedCall(320, () => {
        this.scene.start('Game', { world, level });
      });
    });
  }

  private triggerConfetti() {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#ffe45e', '#ff6eb4', '#2ecc71', '#3498db', '#9b59b6']
    });
  }

  private drawCartoonBg(g: Phaser.GameObjects.Graphics, W: number, H: number, world: number) {
    // Soft, bright cartoon colors
    const colors = [0xfff5ea, 0xfff5ea, 0xeaf5ff, 0xeafaf1, 0xfaf0ff];
    const bgCol = colors[world] ?? 0xfff5ea;
    g.fillStyle(bgCol, 1);
    g.fillRect(0, 0, W, H);

    // Warm radial gradients/spots in background
    const accentCol = blendColor(bgCol, 0xffbb99, 0.3);
    g.fillStyle(accentCol, 0.4);
    g.fillCircle(W / 2, H * 0.3, Math.min(W, H) * 0.6);

    // Floating bubble shapes for kid friendly aesthetic
    g.fillStyle(0xffffff, 0.6);
    for (let i = 0; i < 15; i++) {
      const rx = Math.random() * W;
      const ry = Math.random() * H;
      const radius = Math.random() * 40 + 10;
      g.fillCircle(rx, ry, radius);
    }
  }

  private createTrophyBlock(cx: number, cy: number, world: number) {
    const g = this.add.graphics().setAlpha(0);
    const pal = getBlockPalette(world, 2);
    const tw = TILE_W * 0.85, th = TILE_H * 0.85, bh = BLOCK_H * 0.85;

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
      g.lineStyle(3, pal.glow, 0.8);
      g.beginPath();
      g.moveTo(cx, cy - th2);
      g.lineTo(cx + tw2, cy);
      g.lineTo(cx, cy + th2);
      g.lineTo(cx - tw2, cy);
      g.closePath();
      g.strokePath();

      // Draw Hat
      const activeSkin = GameData.activeSkin.get();
      if (activeSkin !== 'none') {
        drawHat(g, cx, cy, tw2, th2, activeSkin, this.time.now);
      } else {
        g.fillStyle(0xffe45e, 0.95);
        g.fillCircle(cx, cy - 6, 12 * scale);
        g.fillStyle(0xffffff, 0.7);
        g.fillCircle(cx - 4, cy - 9, 5 * scale);
      }
    };

    drawIt(1);
    
    gsap.to(g, {
      alpha: 1,
      duration: 0.6,
      delay: 0.4
    });

    // float rotation using gsap for smooth animation
    let t = 0;
    this.time.addEvent({
      delay: 16, repeat: -1,
      callback: () => {
        t += 0.016;
        const bounce = Math.sin(t * 2) * 6;
        g.setY(bounce);
        drawIt(1 + Math.sin(t * 1.2) * 0.035);
      }
    });

    return g;
  }

  private createStarRow(cx: number, cy: number, stars: number) {
    const spacing = 75;
    for (let i = 0; i < 3; i++) {
      const filled = i < stars;
      const x = cx + (i - 1) * spacing;
      const star = this.add.text(x, cy, filled ? '⭐' : '☆', {
        fontFamily: 'Fredoka, sans-serif',
        fontSize: filled ? '52px' : '40px',
        color: filled ? '#ff9f1c' : '#bdc3c7'
      }).setOrigin(0.5).setAlpha(0).setScale(0.3);

      gsap.to(star, {
        alpha: 1,
        scale: 1,
        duration: 0.5,
        ease: 'back.out(1.8)',
        delay: 0.5 + i * 0.15
      });

      if (filled) {
        this.time.delayedCall(500 + i * 150 + 300, () => {
          gsap.to(star, {
            scale: 1.15,
            duration: 0.6,
            yoyo: true,
            repeat: -1,
            ease: 'sine.inOut',
            delay: i * 0.1
          });
        });
      }
    }
  }

  private createStatsCard(cx: number, cy: number, reward: number, xpEarned?: number, userRank?: number) {
    const w = Math.min(this.scale.width * 0.85, 340), h = statsCardHeight = 84;
    const container = this.add.container(cx, cy).setAlpha(0);

    const bg = this.add.graphics();
    // Bubbly white stats card
    bg.fillStyle(0xffffff, 0.95);
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, 20);
    bg.lineStyle(3, 0xffd8b3, 1.0);
    bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 20);
    container.add(bg);

    const fontStyle = {
      fontFamily: 'Fredoka, sans-serif', fontSize: '18px', color: '#ff9f1c', fontStyle: 'bold'
    };

    const coins = this.add.text(-w * 0.28, -16, `🪙 +${reward}`, fontStyle).setOrigin(0.5);
    const xp = this.add.text(0, -16, `⚡ +${xpEarned || 85} XP`, { ...fontStyle, color: '#2ecc71' }).setOrigin(0.5);
    const moves = this.add.text(w * 0.28, -16, `🔥 ${GameData.winStreak.get()}x`, { ...fontStyle, color: '#e91e63' }).setOrigin(0.5);
    
    const total = this.add.text(0, 16, `Coins: ${GameData.coins.get()}🪙   Global Rank: #${userRank || 15} 🏆`, {
      fontFamily: 'Fredoka, sans-serif', fontSize: '14px', color: '#7f8c8d', fontStyle: 'bold'
    }).setOrigin(0.5);

    container.add([coins, xp, moves, total]);

    gsap.to(container, {
      alpha: 1,
      duration: 0.5,
      delay: 0.8
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

      // 3D Offset border/shadow
      bg.fillStyle(shadowCol, 1);
      bg.fillRoundedRect(-w / 2, -h / 2 + shH, w, h, r);

      // Main face
      bg.fillStyle(faceBright, 1);
      bg.fillRoundedRect(-w / 2, faceY, w, h, r);

      // Highlight line
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
      delay: 1.1 + delay / 1000
    });

    return container;
  }
}
// Local constant helper workaround
let statsCardHeight = 84;
