/* ProfileScene.ts — Player Stats, XP Progress & Profile Customize Card */
import Phaser from 'phaser';
import { GameData } from '../utils/GameData';
import { LeaderboardService } from '../utils/LeaderboardService';
import { audio } from '../audio';
import { createCartoonButton } from '../utils/IsoHelper';
import { gsap } from 'gsap';

export class ProfileScene extends Phaser.Scene {
  constructor() { super({ key: 'Profile' }); }

  create() {
    const W = this.scale.width, H = this.scale.height;

    // Warm peach background to stay within bright cartoon rules
    this.cameras.main.setBackgroundColor('#fff5ea');
    this.cameras.main.fadeIn(300, 255, 245, 234);

    const bg = this.add.graphics();
    bg.fillStyle(0xfff5ea, 1);
    bg.fillRect(0, 0, W, H);

    // Warm central spots in bg
    bg.fillStyle(0xffebd6, 0.65);
    bg.fillCircle(W / 2, H * 0.25, W * 0.85);

    // Bubbles background detail
    bg.fillStyle(0xffffff, 0.45);
    for (let i = 0; i < 12; i++) {
      bg.fillCircle(Math.random() * W, Math.random() * H, Math.random() * 32 + 8);
    }

    // Title (Fredoka, drop shadow, kid cartoon style)
    this.add.text(W / 2, Math.max(36, H * 0.06), '👤 Player Profile', {
      fontFamily: 'Fredoka, sans-serif', fontSize: Math.min(W * 0.075, 34) + 'px',
      color: '#ff9f1c', stroke: '#ffffff', strokeThickness: 5,
      fontStyle: 'bold',
      shadow: { offsetX: 0, offsetY: 4, color: '#5c3d2e', blur: 0, fill: true }
    }).setOrigin(0.5);

    // Close button (Bubbly Pink Cartoon button)
    createCartoonButton(this, 75, 42, 100, 42, '◀ Menu', () => {
      audio.playTap();
      this.cameras.main.fadeOut(300, 255, 245, 234);
      this.time.delayedCall(320, () => this.scene.start('Menu'));
    }, { bgColor: 0xe91e63, fontSize: 16 });

    // Profile Card Container (White Bubbly Card)
    const cardY = H * 0.28;
    const cardW = Math.min(W - 32, 380);
    const cardH = 175;

    const cardContainer = this.add.container(W / 2, cardY).setAlpha(0);

    const cardGfx = this.add.graphics();
    cardGfx.fillStyle(0xffffff, 0.95);
    cardGfx.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 20);
    cardGfx.lineStyle(3, 0xffd8b3, 1.0);
    cardGfx.strokeRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 20);
    
    // Drop shadow under card
    cardGfx.fillStyle(0x000000, 0.03);
    cardGfx.fillRoundedRect(-cardW / 2, -cardH / 2 + 5, cardW, cardH, 20);
    cardContainer.add(cardGfx);

    // Avatar Icon + Picker
    const currentAvatar = GameData.avatar.get();
    const avatarTxt = this.add.text(0, -42, currentAvatar, {
      fontSize: '54px'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    // Username display + cycle prompt
    const currentName = GameData.username.get();
    const nameTxt = this.add.text(0, 10, currentName, {
      fontFamily: 'Fredoka, sans-serif', fontSize: '24px', color: '#ff9f1c', fontStyle: 'bold'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    const rankTitle = GameData.playerXP.getRankTitle();
    const rankTxt = this.add.text(0, 42, `✨ ${rankTitle} ✨`, {
      fontFamily: 'Fredoka, sans-serif', fontSize: '15px', color: '#e91e63', fontStyle: 'bold'
    }).setOrigin(0.5);

    const hintTxt = this.add.text(0, 68, '👆 Tap Avatar or Name to Customize!', {
      fontFamily: 'Fredoka, sans-serif', fontSize: '12px', color: '#7f8c8d', fontStyle: 'bold'
    }).setOrigin(0.5);

    cardContainer.add([avatarTxt, nameTxt, rankTxt, hintTxt]);

    // Avatar Picker logic
    const avatars = ['🧙‍♂️', '🐉', '👑', '🚀', '🤖', '🦊', '💎', '🔥', '⚡', '⭐', '🦖', '⛩️'];
    let avatarIdx = avatars.indexOf(currentAvatar);
    if (avatarIdx < 0) avatarIdx = 0;

    avatarTxt.on('pointerdown', () => {
      audio.playTap();
      gsap.to(avatarTxt, { scale: 1.3, duration: 0.1, yoyo: true, repeat: 1 });
      avatarIdx = (avatarIdx + 1) % avatars.length;
      const nextEmo = avatars[avatarIdx];
      avatarTxt.setText(nextEmo);
      GameData.avatar.set(nextEmo);
      LeaderboardService.syncAndGetLeaderboard();
    });

    // Username Picker logic
    const heroNames = [
      'AlexTheGreat', 'SkySlayer99', 'TokyoKing', 'NeoArcher', 'QuantumCube',
      'DragonMaster', 'ElsaFrost', 'CyberSamurai', 'StarSlayer', 'MagmaLord'
    ];
    let nameIdx = heroNames.indexOf(currentName);
    if (nameIdx < 0) nameIdx = 0;

    nameTxt.on('pointerdown', () => {
      audio.playTap();
      gsap.to(nameTxt, { scale: 1.15, duration: 0.1, yoyo: true, repeat: 1 });
      nameIdx = (nameIdx + 1) % heroNames.length;
      const nextName = heroNames[nameIdx];
      nameTxt.setText(nextName);
      GameData.username.set(nextName);
      LeaderboardService.syncAndGetLeaderboard();
    });

    gsap.to(cardContainer, {
      alpha: 1,
      y: cardY - 5,
      duration: 0.5,
      ease: 'back.out(1.5)',
      delay: 0.2
    });

    // ── XP Progression Bar ────────────────────────────────────────────────
    const xpY = H * 0.49;
    const lvl = GameData.playerXP.getLevel();
    const currentXP = GameData.playerXP.get();
    const nextLvlXP = GameData.playerXP.getXPForLevel(lvl + 1);
    const prevLvlXP = GameData.playerXP.getXPForLevel(lvl);
    const progress = nextLvlXP > prevLvlXP ? Math.min(1, Math.max(0, (currentXP - prevLvlXP) / (nextLvlXP - prevLvlXP))) : 1;

    const lvlLabel = this.add.text((W - cardW) / 2 + 6, xpY - 20, `Player Level ${lvl}`, {
      fontFamily: 'Fredoka, sans-serif', fontSize: '18px', color: '#ff9f1c', fontStyle: 'bold'
    }).setAlpha(0);
    
    const xpLabel = this.add.text((W + cardW) / 2 - 6, xpY - 20, `${currentXP.toLocaleString()} / ${nextLvlXP.toLocaleString()} XP`, {
      fontFamily: 'Fredoka, sans-serif', fontSize: '14px', color: '#7f8c8d', fontStyle: 'bold'
    }).setOrigin(1, 0).setAlpha(0);

    const barW = cardW;
    const barH = 20;
    const barGfx = this.add.graphics().setAlpha(0);
    // Background bar
    barGfx.fillStyle(0xffe6cc, 1.0);
    barGfx.fillRoundedRect((W - barW) / 2, xpY, barW, barH, 10);
    // Fill progress bar (bright green cartoon bar)
    barGfx.fillStyle(0x2ecc71, 1);
    barGfx.fillRoundedRect((W - barW) / 2, xpY, Math.max(16, barW * progress), barH, 10);

    gsap.to([lvlLabel, xpLabel, barGfx], {
      alpha: 1,
      duration: 0.5,
      delay: 0.4,
      stagger: 0.08
    });

    // ── Exact Stats Grid (White Bubbly Grid Cards) ─────────────────────────
    const statsY = xpY + 54;
    const statsGrid = [
      { label: 'Total Stars',  value: `${GameData.totalStars()} / 90 ⭐`, color: '#f39c12' },
      { label: 'Puzzles Solved', value: `${GameData.puzzlesSolved.get()} 🧩`, color: '#2980b9' },
      { label: 'Win Streak',   value: `${GameData.winStreak.get()}x 🔥`, color: '#e91e63' },
      { label: 'Total Coins',  value: `${GameData.coins.get()} 🪙`, color: '#27ae60' }
    ];

    const boxW = (cardW - 14) / 2;
    const boxH = 70;

    statsGrid.forEach((st, idx) => {
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      const bx = (W - cardW) / 2 + col * (boxW + 14) + boxW / 2;
      const by = statsY + row * (boxH + 14) + boxH / 2;

      const gridBox = this.add.container(bx, by).setAlpha(0);

      const bgx = this.add.graphics();
      bgx.fillStyle(0xffffff, 0.95);
      bgx.fillRoundedRect(-boxW / 2, -boxH / 2, boxW, boxH, 16);
      bgx.lineStyle(2, 0xffd8b3, 1.0);
      bgx.strokeRoundedRect(-boxW / 2, -boxH / 2, boxW, boxH, 16);

      // shadow
      bgx.fillStyle(0x000000, 0.03);
      bgx.fillRoundedRect(-boxW / 2, -boxH / 2 + 4, boxW, boxH, 16);

      gridBox.add(bgx);

      const lLabel = this.add.text(0, -12, st.label, {
        fontFamily: 'Fredoka, sans-serif', fontSize: '13px', color: '#7f8c8d', fontStyle: 'bold'
      }).setOrigin(0.5);

      const lVal = this.add.text(0, 12, st.value, {
        fontFamily: 'Fredoka, sans-serif', fontSize: '19px', color: st.color, fontStyle: 'bold'
      }).setOrigin(0.5);

      gridBox.add([lLabel, lVal]);

      gsap.to(gridBox, {
        alpha: 1,
        y: by - 4,
        duration: 0.45,
        ease: 'back.out(1.5)',
        delay: 0.5 + idx * 0.08
      });
    });

    // Leaderboard shortcut button (Pink Bubbly Cartoon style)
    createCartoonButton(this, W / 2, H - 55, Math.min(W - 40, 280), 48, '🏆 View Global Leaderboard →', () => {
      audio.playTap();
      this.cameras.main.fadeOut(300, 255, 245, 234);
      this.time.delayedCall(320, () => this.scene.start('Leaderboard'));
    }, { bgColor: 0xe91e63, fontSize: 14 });
  }
}
