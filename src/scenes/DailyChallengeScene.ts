/* DailyChallengeScene.ts — 7-Day Streak Calendar & Procedural Daily Puzzle Lobby */
import Phaser from 'phaser';
import { GameData } from '../utils/GameData';
import { audio } from '../audio';
import { createCartoonButton } from '../utils/IsoHelper';
import { gsap } from 'gsap';

export class DailyChallengeScene extends Phaser.Scene {
  constructor() { super({ key: 'DailyChallenge' }); }

  create() {
    const W = this.scale.width, H = this.scale.height;

    // Bright cartoon style peach background
    this.cameras.main.setBackgroundColor('#fff5ea');
    this.cameras.main.fadeIn(400, 255, 245, 234);

    const bg = this.add.graphics();
    bg.fillStyle(0xfff5ea, 1);
    bg.fillRect(0, 0, W, H);
    
    // Soft sunny glow
    gBgGlow = this.add.graphics();
    gBgGlow.fillStyle(0xfff0e0, 0.7);
    gBgGlow.fillCircle(W / 2, H * 0.35, Math.min(W, H) * 0.6);

    // Subtle floating cartoon bubbles
    for (let i = 0; i < 12; i++) {
      const rx = Math.random() * W;
      const ry = Math.random() * H;
      bg.fillStyle(0xffffff, 0.45);
      bg.fillCircle(rx, ry, Math.random() * 30 + 10);
    }

    // Header (Bubbly Fredoka Font with orange color drop shadow)
    this.add.text(W / 2, H * 0.10, '📅 Daily Challenge', {
      fontFamily: 'Fredoka, sans-serif',
      fontSize: Math.min(W * 0.08, 38) + 'px',
      color: '#ff9f1c',
      fontStyle: 'bold',
      stroke: '#ffffff', strokeThickness: 5,
      shadow: { offsetX: 0, offsetY: 4, color: '#5c3d2e', blur: 0, fill: true }
    }).setOrigin(0.5);

    const todayStr = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
    this.add.text(W / 2, H * 0.16, `Today: ${todayStr}`, {
      fontFamily: 'Fredoka, sans-serif', fontSize: '18px', color: '#7f8c8d', fontStyle: 'bold'
    }).setOrigin(0.5);

    // Current Streak Info
    const currentStreak = GameData.dailyStreak.get();
    const lastPlayed = GameData.dailyStreak.lastPlayed();
    const todayISO = new Date().toISOString().slice(0, 10);
    const alreadyPlayedToday = (lastPlayed === todayISO);

    this.add.text(W / 2, H * 0.22, `🔥 Current Streak: Day ${currentStreak} of 7`, {
      fontFamily: 'Fredoka, sans-serif', fontSize: '20px', color: '#e67e22', fontStyle: 'bold'
    }).setOrigin(0.5);

    // Draw 7-Day Timeline Card Grid (Bubbly White Cards)
    const cardW = Math.min((W * 0.88) / 7, 85);
    const cardH = cardW * 1.45;
    const totalGridW = cardW * 7 + 6 * 8;
    const startX = W / 2 - totalGridW / 2 + cardW / 2;
    const gridY = H * 0.44;

    const cardsContainer = this.add.container(0, 0);

    for (let day = 1; day <= 7; day++) {
      const cx = startX + (day - 1) * (cardW + 8);
      const isPast = day < currentStreak || (day === currentStreak && alreadyPlayedToday);
      const isCurrent = (day === currentStreak && !alreadyPlayedToday);

      const card = this.add.container(cx, gridY).setAlpha(0);

      const g = this.add.graphics();
      // Premium soft-plastic cartoon colors
      const bgCardCol = isCurrent ? 0xfff3e0 : isPast ? 0xeafaf1 : 0xffffff;
      const borderCardCol = isCurrent ? 0xff9f1c : isPast ? 0x2ecc71 : 0xffd8b3;

      g.fillStyle(bgCardCol, 1);
      g.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 16);

      g.lineStyle(isCurrent ? 3.5 : 2, borderCardCol, 1.0);
      g.strokeRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 16);

      // Shadow depth
      g.fillStyle(0x000000, 0.05);
      g.fillRoundedRect(-cardW / 2, -cardH / 2 + 5, cardW, cardH, 16);

      // Day label
      const dLabel = this.add.text(0, -cardH * 0.35, `Day ${day}`, {
        fontFamily: 'Fredoka, sans-serif', fontSize: Math.min(cardW * 0.22, 14) + 'px',
        color: isCurrent ? '#d35400' : isPast ? '#27ae60' : '#7f8c8d', fontStyle: 'bold'
      }).setOrigin(0.5);

      // Reward icon
      let icon = '🪙';
      let amountTxt = `+${day * 50}`;
      if (day === 7) {
        icon = '🐲';
        amountTxt = 'Skin!';
      } else if (day === 5) {
        icon = '👑';
        amountTxt = 'Crown!';
      }

      const dIcon = this.add.text(0, -cardH * 0.05, icon, {
        fontSize: Math.min(cardW * 0.42, 28) + 'px'
      }).setOrigin(0.5);

      const dReward = this.add.text(0, cardH * 0.28, amountTxt, {
        fontFamily: 'Fredoka, sans-serif', fontSize: Math.min(cardW * 0.18, 11) + 'px',
        color: '#f39c12', fontStyle: 'bold', align: 'center'
      }).setOrigin(0.5);

      card.add([g, dLabel, dIcon, dReward]);

      if (isPast) {
        const check = this.add.text(0, 0, '✅', { fontSize: '24px' }).setOrigin(0.5).setAlpha(0.9);
        card.add(check);
      }

      cardsContainer.add(card);

      gsap.to(card, {
        alpha: 1,
        y: gridY - 8,
        duration: 0.5,
        ease: 'back.out(1.5)',
        delay: 0.3 + day * 0.08
      });
    }

    // Action Button (Bubbly Green Button)
    const btnY = H * 0.76;
    const btnW = Math.min(W * 0.75, 300), btnH = 58;
    const btnContainer = this.add.container(W / 2, btnY).setAlpha(0);

    const btnGfx = this.add.graphics();
    btnContainer.add(btnGfx);

    const btnLabelStr = alreadyPlayedToday ? '⏳ Locked Until Tomorrow' : '🚀 Play Challenge!';
    const btnFontSize = 18;
    const btnLabel = this.add.text(0, -2, btnLabelStr, {
      fontFamily: 'Fredoka, sans-serif', fontSize: `${btnFontSize}px`, color: '#ffffff', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 1.5, align: 'center'
    }).setOrigin(0.5);
    btnContainer.add(btnLabel);

    const drawBtn = (state: 'idle' | 'hover' | 'pressed') => {
      btnGfx.clear();
      let faceY = -btnH / 2;
      let shH = 6;
      
      if (state === 'pressed') {
        faceY = -btnH / 2 + 4;
        shH = 2;
        btnLabel.setY(2);
      } else {
        btnLabel.setY(-2);
      }

      const fill = alreadyPlayedToday ? 0xbdc3c7 : (state === 'hover' ? 0x2ecc71 : 0x21c25e);
      const stroke = alreadyPlayedToday ? 0x95a5a6 : 0x27ae60;

      // 3D shadow bottom face
      btnGfx.fillStyle(stroke, 1);
      btnGfx.fillRoundedRect(-btnW / 2, -btnH / 2 + shH, btnW, btnH, 24);

      // Main face
      btnGfx.fillStyle(fill, 1);
      btnGfx.fillRoundedRect(-btnW / 2, faceY, btnW, btnH, 24);
    };
    drawBtn('idle');

    if (!alreadyPlayedToday) {
      btnContainer.setInteractive(new Phaser.Geom.Rectangle(-btnW / 2, -btnH / 2, btnW, btnH), Phaser.Geom.Rectangle.Contains);
      btnContainer.input!.cursor = 'pointer';

      btnContainer.on('pointerover', () => {
        drawBtn('hover');
        gsap.to(btnContainer, { scale: 1.05, duration: 0.1, overwrite: 'auto' });
      });
      btnContainer.on('pointerout',  () => {
        drawBtn('idle');
        gsap.to(btnContainer, { scale: 1.0, duration: 0.1, overwrite: 'auto' });
      });
      btnContainer.on('pointerdown', () => {
        drawBtn('pressed');
        gsap.to(btnContainer, { scale: 0.96, duration: 0.05, overwrite: 'auto' });
      });
      btnContainer.on('pointerup', () => {
        drawBtn('hover');
        gsap.to(btnContainer, { scale: 1.05, duration: 0.08, overwrite: 'auto' });
        audio.playTap();
        this.cameras.main.fadeOut(300, 255, 245, 234);
        this.time.delayedCall(320, () => {
          this.scene.start('Game', { world: 3, level: (new Date().getDate() % 5) + 1, isDaily: true });
        });
      });
    }

    gsap.to(btnContainer, {
      alpha: 1,
      duration: 0.5,
      delay: 1.0
    });

    // Back button (Pink Bubbly Cartoon style)
    createCartoonButton(this, 75, 42, 100, 42, '◀ Menu', () => {
      audio.playTap();
      this.cameras.main.fadeOut(300, 255, 245, 234);
      this.time.delayedCall(320, () => this.scene.start('Menu'));
    }, { bgColor: 0xe91e63, fontSize: 16 });
  }
}
let gBgGlow: Phaser.GameObjects.Graphics;
