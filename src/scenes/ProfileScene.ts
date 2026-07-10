/* ProfileScene.ts — Player Stats, XP Progress & Profile Customize Card */
import Phaser from 'phaser';
import { GameData } from '../utils/GameData';
import { LeaderboardService } from '../utils/LeaderboardService';
import { audio } from '../audio';

export class ProfileScene extends Phaser.Scene {
  constructor() { super({ key: 'Profile' }); }

  create() {
    const W = this.scale.width, H = this.scale.height;
    this.cameras.main.setBackgroundColor('#0a001a');
    this.cameras.main.fadeIn(300);

    // Background gradient glow
    const bg = this.add.graphics();
    bg.fillStyle(0x18003a, 0.5);
    bg.fillRect(0, 0, W, H);
    for (let r = 6; r >= 1; r--) {
      bg.fillStyle(0xff0088, 0.04 * r);
      bg.fillCircle(W / 2, H * 0.2, (1 - r / 6) * W * 0.85);
    }

    // Title & Close Button
    this.add.text(W / 2, Math.max(36, H * 0.06), '👤 Player Profile & Prestige', {
      fontFamily: 'Orbitron', fontSize: Math.min(W * 0.075, 36) + 'px',
      color: '#ffe45e', stroke: '#ffffff', strokeThickness: 3,
      shadow: { offsetX: 0, offsetY: 4, color: '#ffa500', blur: 18, fill: true }
    }).setOrigin(0.5);

    const closeBtn = this.add.text(W - 28, Math.max(36, H * 0.06), '✖', {
      fontFamily: 'Orbitron', fontSize: '26px', color: '#ff6b6b'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => { audio.playTap(); this.scene.start('Menu'); });

    // Profile Card Container
    const cardY = H * 0.28;
    const cardW = Math.min(W - 32, 380);
    const cardH = 170;

    const cardGfx = this.add.graphics();
    cardGfx.fillStyle(0x2d1854, 0.95);
    cardGfx.fillRoundedRect((W - cardW) / 2, cardY - cardH / 2, cardW, cardH, 16);
    cardGfx.lineStyle(3, 0x00ffcc, 1);
    cardGfx.strokeRoundedRect((W - cardW) / 2, cardY - cardH / 2, cardW, cardH, 16);

    // Avatar Icon + Picker
    const currentAvatar = GameData.avatar.get();
    const avatarTxt = this.add.text(W / 2, cardY - 42, currentAvatar, {
      fontSize: '52px'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    // Username display + cycle prompt
    const currentName = GameData.username.get();
    const nameTxt = this.add.text(W / 2, cardY + 10, currentName, {
      fontFamily: 'Orbitron', fontSize: '24px', color: '#ffffff', fontStyle: 'bold'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    const rankTitle = GameData.playerXP.getRankTitle();
    this.add.text(W / 2, cardY + 42, `✨ ${rankTitle} ✨`, {
      fontFamily: 'Orbitron', fontSize: '15px', color: '#ff79a8', fontStyle: 'bold'
    }).setOrigin(0.5);

    this.add.text(W / 2, cardY + 68, '👆 Tap Avatar or Name to Customize!', {
      fontFamily: 'Orbitron', fontSize: '12px', color: '#9b72ff'
    }).setOrigin(0.5);

    // Avatar Picker logic
    const avatars = ['🧙‍♂️', '🐉', '👑', '🚀', '🤖', '🦊', '💎', '🔥', '⚡', '⭐', '🦖', '⛩️'];
    let avatarIdx = avatars.indexOf(currentAvatar);
    if (avatarIdx < 0) avatarIdx = 0;

    avatarTxt.on('pointerdown', () => {
      audio.playTap();
      avatarIdx = (avatarIdx + 1) % avatars.length;
      const nextEmo = avatars[avatarIdx];
      avatarTxt.setText(nextEmo);
      GameData.avatar.set(nextEmo);
      LeaderboardService.syncAndGetLeaderboard();
    });

    // Username Picker logic (cycles rich hero names for instant feedback without keyboard friction)
    const heroNames = [
      'AlexTheGreat', 'SkySlayer99', 'TokyoKing', 'NeoArcher', 'QuantumCube',
      'DragonMaster', 'ElsaFrost', 'CyberSamurai', 'StarSlayer', 'MagmaLord'
    ];
    let nameIdx = heroNames.indexOf(currentName);
    if (nameIdx < 0) nameIdx = 0;

    nameTxt.on('pointerdown', () => {
      audio.playTap();
      nameIdx = (nameIdx + 1) % heroNames.length;
      const nextName = heroNames[nameIdx];
      nameTxt.setText(nextName);
      GameData.username.set(nextName);
      LeaderboardService.syncAndGetLeaderboard();
    });

    // ── XP Progression Bar ────────────────────────────────────────────────
    const xpY = H * 0.49;
    const lvl = GameData.playerXP.getLevel();
    const currentXP = GameData.playerXP.get();
    const nextLvlXP = GameData.playerXP.getXPForLevel(lvl + 1);
    const prevLvlXP = GameData.playerXP.getXPForLevel(lvl);
    const progress = nextLvlXP > prevLvlXP ? Math.min(1, Math.max(0, (currentXP - prevLvlXP) / (nextLvlXP - prevLvlXP))) : 1;

    this.add.text((W - cardW) / 2 + 6, xpY - 20, `Player Level ${lvl}`, {
      fontFamily: 'Orbitron', fontSize: '18px', color: '#00ffcc', fontStyle: 'bold'
    });
    this.add.text((W + cardW) / 2 - 6, xpY - 20, `${currentXP.toLocaleString()} / ${nextLvlXP.toLocaleString()} XP`, {
      fontFamily: 'Orbitron', fontSize: '14px', color: '#ccbbff'
    }).setOrigin(1, 0);

    const barW = cardW;
    const barH = 20;
    const barGfx = this.add.graphics();
    barGfx.fillStyle(0x110022, 0.9);
    barGfx.fillRoundedRect((W - barW) / 2, xpY, barW, barH, 10);
    barGfx.fillStyle(0x00ffcc, 1);
    barGfx.fillRoundedRect((W - barW) / 2, xpY, Math.max(16, barW * progress), barH, 10);

    // ── Exact Stats Grid ──────────────────────────────────────────────────
    const statsY = xpY + 54;
    const statsGrid = [
      { label: 'Total Stars',  value: `${GameData.totalStars()} / 90 ⭐`, color: '#ffe45e' },
      { label: 'Puzzles Solved', value: `${GameData.puzzlesSolved.get()} 🧩`, color: '#74c0fc' },
      { label: 'Win Streak',   value: `${GameData.winStreak.get()}x 🔥`, color: '#ff6b6b' },
      { label: 'Total Coins',  value: `${GameData.coins.get()} 🪙`, color: '#00ffcc' }
    ];

    const boxW = (cardW - 14) / 2;
    const boxH = 68;

    statsGrid.forEach((st, idx) => {
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      const bx = (W - cardW) / 2 + col * (boxW + 14) + boxW / 2;
      const by = statsY + row * (boxH + 14) + boxH / 2;

      const bgx = this.add.graphics();
      bgx.fillStyle(0x221144, 0.85);
      bgx.fillRoundedRect(bx - boxW / 2, by - boxH / 2, boxW, boxH, 12);
      bgx.lineStyle(1.5, 0x9b72ff, 0.4);
      bgx.strokeRoundedRect(bx - boxW / 2, by - boxH / 2, boxW, boxH, 12);

      this.add.text(bx, by - 12, st.label, {
        fontFamily: 'Orbitron', fontSize: '13px', color: '#ccbbff'
      }).setOrigin(0.5);

      this.add.text(bx, by + 12, st.value, {
        fontFamily: 'Orbitron', fontSize: '19px', color: st.color, fontStyle: 'bold'
      }).setOrigin(0.5);
    });

    // Leaderboard shortcut button
    const btnLdb = this.add.container(W / 2, H - 50);
    const bgLdb = this.add.graphics();
    const wLdb = Math.min(W - 40, 280), hLdb = 48;
    bgLdb.fillStyle(0xff6eb4, 1);
    bgLdb.fillRoundedRect(-wLdb / 2, -hLdb / 2, wLdb, hLdb, 24);
    bgLdb.lineStyle(2, 0xffffffff, 0.8);
    bgLdb.strokeRoundedRect(-wLdb / 2, -hLdb / 2, wLdb, hLdb, 24);

    const txtLdb = this.add.text(0, 0, '🏆 View Global Leaderboard →', {
      fontFamily: 'Orbitron', fontSize: '16px', color: '#ffffff', fontStyle: 'bold'
    }).setOrigin(0.5);

    btnLdb.add([bgLdb, txtLdb]);
    btnLdb.setSize(wLdb, hLdb).setInteractive({ useHandCursor: true });
    btnLdb.on('pointerdown', () => { audio.playTap(); this.scene.start('Leaderboard'); });
  }
}
