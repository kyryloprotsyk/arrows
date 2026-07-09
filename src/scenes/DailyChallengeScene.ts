/* DailyChallengeScene.ts — 7-Day Streak Calendar & Procedural Daily Puzzle Lobby */
import Phaser from 'phaser';
import { GameData } from '../utils/GameData';
import { audio } from '../audio';

export class DailyChallengeScene extends Phaser.Scene {
  constructor() { super({ key: 'DailyChallenge' }); }

  create() {
    const W = this.scale.width, H = this.scale.height;

    this.cameras.main.setBackgroundColor('#0a001a');
    this.cameras.main.fadeIn(400, 10, 0, 26);

    // Star background
    const bg = this.add.graphics();
    bg.fillStyle(0x0a001a, 1);
    bg.fillRect(0, 0, W, H);
    for (let i = 0; i < 70; i++) {
      bg.fillStyle(0xffffff, 0.2 + Math.random() * 0.5);
      bg.fillCircle(Math.random() * W, Math.random() * H, Math.random() * 1.5 + 0.3);
    }

    // Header
    this.add.text(W / 2, H * 0.08, '📅 Daily Challenge', {
      fontFamily: 'Fredoka',
      fontSize: Math.min(W * 0.085, 40) + 'px',
      color: '#00ffcc',
      shadow: { offsetX: 0, offsetY: 4, color: '#008866', blur: 16, fill: true }
    }).setOrigin(0.5);

    const todayStr = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
    this.add.text(W / 2, H * 0.14, `Today: ${todayStr}`, {
      fontFamily: 'Fredoka', fontSize: '18px', color: '#ccbbed'
    }).setOrigin(0.5);

    // Current Streak Info
    const currentStreak = GameData.dailyStreak.get();
    const lastPlayed = GameData.dailyStreak.lastPlayed();
    const todayISO = new Date().toISOString().slice(0, 10);
    const alreadyPlayedToday = (lastPlayed === todayISO);

    this.add.text(W / 2, H * 0.22, `🔥 Current Streak: Day ${currentStreak} of 7`, {
      fontFamily: 'Fredoka', fontSize: '22px', color: '#ffe45e'
    }).setOrigin(0.5);

    // Draw 7-Day Timeline Card Grid
    const cardW = Math.min((W * 0.88) / 7, 85);
    const cardH = cardW * 1.35;
    const totalGridW = cardW * 7 + 6 * 8;
    const startX = W / 2 - totalGridW / 2 + cardW / 2;
    const gridY = H * 0.45;

    const g = this.add.graphics();

    for (let day = 1; day <= 7; day++) {
      const cx = startX + (day - 1) * (cardW + 8);
      const isPast = day < currentStreak || (day === currentStreak && alreadyPlayedToday);
      const isCurrent = (day === currentStreak && !alreadyPlayedToday);

      // Card bg
      g.fillStyle(isCurrent ? 0x2d1254 : isPast ? 0x112233 : 0x150826, 1);
      g.fillRoundedRect(cx - cardW / 2, gridY - cardH / 2, cardW, cardH, 12);

      // Border
      const borderCol = isCurrent ? 0x00ffcc : isPast ? 0x44aa88 : 0x443366;
      g.lineStyle(isCurrent ? 3 : 1.5, borderCol, 1);
      g.strokeRoundedRect(cx - cardW / 2, gridY - cardH / 2, cardW, cardH, 12);

      // Day label
      this.add.text(cx, gridY - cardH * 0.32, `Day ${day}`, {
        fontFamily: 'Fredoka', fontSize: Math.min(cardW * 0.24, 14) + 'px',
        color: isCurrent ? '#00ffcc' : '#ffffff'
      }).setOrigin(0.5);

      // Reward icon & text
      let icon = '🪙';
      let amountTxt = `+${day * 50}`;
      if (day === 7) {
        icon = '🐉';
        amountTxt = 'Dragon Skin!';
      } else if (day === 5) {
        icon = '👑';
        amountTxt = 'Gold Crown!';
      }

      this.add.text(cx, gridY - cardH * 0.02, icon, {
        fontSize: Math.min(cardW * 0.42, 28) + 'px'
      }).setOrigin(0.5);

      this.add.text(cx, gridY + cardH * 0.3, amountTxt, {
        fontFamily: 'Fredoka', fontSize: Math.min(cardW * 0.18, 11) + 'px',
        color: '#ffe45e', align: 'center'
      }).setOrigin(0.5);

      if (isPast) {
        // Checkmark overlay
        this.add.text(cx, gridY, '✅', { fontSize: '24px' }).setOrigin(0.5).setAlpha(0.85);
      }
    }

    // Action Button
    const btnY = H * 0.78;
    const btnContainer = this.add.container(W / 2, btnY).setDepth(10);
    const btnW = Math.min(W * 0.75, 300), btnH = 56;
    const btnGfx = this.add.graphics();

    const drawBtn = (hover: boolean) => {
      btnGfx.clear();
      const fill = alreadyPlayedToday ? 0x444455 : hover ? 0x00e6b8 : 0x00bb88;
      btnGfx.fillStyle(fill, 1);
      btnGfx.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 28);
      if (!alreadyPlayedToday) {
        for (let p = 0; p < 3; p++) {
          btnGfx.lineStyle([5, 3, 1.5][p], 0x00ffcc, [0.15, 0.35, 0.8][p]);
          btnGfx.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 28);
        }
      }
    };
    drawBtn(false);

    const btnLabel = this.add.text(0, 0, alreadyPlayedToday ? '⏳ Come Back Tomorrow!' : '🚀 Play Daily Challenge!', {
      fontFamily: 'Fredoka', fontSize: '20px', color: '#0a001a', fontStyle: 'bold'
    }).setOrigin(0.5);

    btnContainer.add([btnGfx, btnLabel]);

    if (!alreadyPlayedToday) {
      btnContainer.setSize(btnW, btnH).setInteractive(
        new Phaser.Geom.Rectangle(-btnW / 2, -btnH / 2, btnW, btnH),
        Phaser.Geom.Rectangle.Contains
      );
      btnContainer.on('pointerover', () => drawBtn(true));
      btnContainer.on('pointerout',  () => drawBtn(false));
      btnContainer.on('pointerdown', () => {
        audio.playTap();
        this.cameras.main.fadeOut(300, 10, 0, 26);
        this.time.delayedCall(320, () => {
          // Launch GameScene with daily flag
          this.scene.start('Game', { world: 3, level: (new Date().getDate() % 5) + 1, isDaily: true });
        });
      });
    }

    // Back button
    const back = this.add.text(40, 35, '← Menu', {
      fontFamily: 'Fredoka', fontSize: '20px', color: '#9b72ff'
    }).setInteractive({ useHandCursor: true });
    back.on('pointerdown', () => {
      audio.playTap();
      this.cameras.main.fadeOut(300, 10, 0, 26);
      this.time.delayedCall(320, () => this.scene.start('Menu'));
    });
    back.on('pointerover', () => back.setColor('#ff85c1'));
    back.on('pointerout',  () => back.setColor('#9b72ff'));
  }
}
