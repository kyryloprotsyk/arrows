/* LeaderboardScene.ts — Global Online Leaderboards & Real-Time Rankings */
import Phaser from 'phaser';
import { LeaderboardService, type LeaderboardEntry } from '../utils/LeaderboardService';
import { audio } from '../audio';
import { createCartoonButton } from '../utils/IsoHelper';

export class LeaderboardScene extends Phaser.Scene {
  private listContainer!: Phaser.GameObjects.Container;
  private rankBannerText!: Phaser.GameObjects.Text;
  private tabButtons: Record<string, Phaser.GameObjects.Container> = {};

  constructor() { super({ key: 'Leaderboard' }); }

  create() {
    const W = this.scale.width, H = this.scale.height;
    this.cameras.main.setBackgroundColor('#0a001a');
    this.cameras.main.fadeIn(300);

    // Background gradient glow
    const bg = this.add.graphics();
    bg.fillStyle(0x18003a, 0.4);
    bg.fillRect(0, 0, W, H);
    for (let r = 5; r >= 1; r--) {
      bg.fillStyle(0x9b72ff, 0.05 * r);
      bg.fillCircle(W / 2, H * 0.15, (1 - r / 5) * W * 0.8);
    }

    // Title
    this.add.text(W / 2, Math.max(46, H * 0.06), '🏆 Global Leaderboard', {
      fontFamily: 'Orbitron', fontSize: Math.min(W * 0.07, 36) + 'px',
      color: '#ffe45e', stroke: '#ffffff', strokeThickness: 3,
      shadow: { offsetX: 0, offsetY: 4, color: '#ffa500', blur: 18, fill: true }
    }).setOrigin(0.5);

    // Close / Back button
    createCartoonButton(this, 75, 38, 100, 42, '◀ Menu', () => {
      audio.playTap();
      this.scene.start('Menu');
    }, { bgColor: 0x9b72ff, fontSize: 16 });

    // Live sync banner at bottom
    const bottomY = H - 36;
    this.rankBannerText = this.add.text(W / 2, bottomY, '', {
      fontFamily: 'Orbitron', fontSize: Math.min(W * 0.045, 18) + 'px',
      color: '#00ffcc', backgroundColor: '#002244aa',
      padding: { x: 16, y: 8 }
    }).setOrigin(0.5).setDepth(10);

    // Tabs row
    const tabY = Math.max(90, H * 0.14);
    const tabs: Array<{ id: 'stars' | 'streak' | 'solved' | 'level'; label: string; icon: string }> = [
      { id: 'stars',  label: 'Stars',  icon: '⭐' },
      { id: 'streak', label: 'Streak', icon: '🔥' },
      { id: 'solved', label: 'Solved', icon: '🧩' },
      { id: 'level',  label: 'Level',  icon: '👑' }
    ];

    const tabW = Math.min((W - 30) / 4, 110);
    tabs.forEach((t, idx) => {
      const tx = 15 + tabW * 0.5 + idx * tabW;
      const btn = this.createTabButton(tx, tabY, tabW - 6, 36, `${t.icon} ${t.label}`, t.id);
      this.tabButtons[t.id] = btn;
    });

    // List container
    this.listContainer = this.add.container(0, tabY + 36);

    // Load initial data
    LeaderboardService.simulateLiveActivity();
    this.refreshList('stars');
  }

  private createTabButton(x: number, y: number, w: number, h: number, text: string, id: 'stars' | 'streak' | 'solved' | 'level') {
    const cont = this.add.container(x, y);
    const gfx = this.add.graphics();
    const lbl = this.add.text(0, 0, text, {
      fontFamily: 'Orbitron', fontSize: Math.min(w * 0.22, 13) + 'px', color: '#ffffff', fontStyle: 'bold'
    }).setOrigin(0.5);

    cont.add([gfx, lbl]);
    cont.setSize(w, h).setInteractive({ useHandCursor: true });
    cont.on('pointerdown', () => {
      audio.playTap();
      this.refreshList(id);
    });

    return cont;
  }

  private refreshList(tab: 'stars' | 'streak' | 'solved' | 'level') {
    // Update tab visual styles
    Object.entries(this.tabButtons).forEach(([id, cont]) => {
      const gfx = cont.getAt(0) as Phaser.GameObjects.Graphics;
      const lbl = cont.getAt(1) as Phaser.GameObjects.Text;
      const active = id === tab;
      const w = cont.width, h = cont.height;
      gfx.clear();
      gfx.fillStyle(active ? 0xff0088 : 0x221144, active ? 1 : 0.7);
      gfx.fillRoundedRect(-w / 2, -h / 2, w, h, 8);
      if (active) {
        gfx.lineStyle(2, 0xffe45e, 1);
        gfx.strokeRoundedRect(-w / 2, -h / 2, w, h, 8);
      }
      lbl.setColor(active ? '#ffe45e' : '#ccbbff');
    });

    // Fetch live sorted data
    const { entries, userRank, userEntry } = LeaderboardService.syncAndGetLeaderboard(tab);

    this.rankBannerText.setText(`🌍 Global Sync Active • Your Rank: #${userRank} (${userEntry.username})`);

    // Rebuild list rows
    this.listContainer.removeAll(true);
    const W = this.scale.width;
    const rowH = 54;
    const topN = entries.slice(0, 15); // Show top 15

    topN.forEach((entry, i) => {
      const ry = i * (rowH + 8) + 30;
      const row = this.createRowCard(W / 2, ry, W - 32, rowH, entry, i + 1, tab);
      this.listContainer.add(row);
    });

    // If user is below #15, show their row pinned at the bottom of the scroll list
    if (userRank > 15) {
      const ry = 15 * (rowH + 8) + 40;
      const div = this.add.text(W / 2, ry - 14, '• • • • • • • • • • • • •', {
        fontFamily: 'Orbitron', fontSize: '14px', color: '#9b72ff'
      }).setOrigin(0.5);
      const userRow = this.createRowCard(W / 2, ry + 16, W - 32, rowH, userEntry, userRank, tab);
      this.listContainer.add([div, userRow]);
    }
  }

  private createRowCard(cx: number, cy: number, w: number, h: number, entry: LeaderboardEntry, rank: number, tab: string) {
    const cont = this.add.container(cx, cy);
    const gfx = this.add.graphics();
    const isUser = !!entry.isCurrentUser;

    // Background card
    gfx.fillStyle(isUser ? 0x441166 : (rank <= 3 ? 0x2d1b4e : 0x180c30), isUser ? 0.95 : 0.85);
    gfx.fillRoundedRect(-w / 2, -h / 2, w, h, 12);

    if (isUser) {
      gfx.lineStyle(2.5, 0x00ffcc, 1);
      gfx.strokeRoundedRect(-w / 2, -h / 2, w, h, 12);
    } else if (rank <= 3) {
      const borderCol = rank === 1 ? 0xffd700 : rank === 2 ? 0xc0c0c0 : 0xcd7f32;
      gfx.lineStyle(2, borderCol, 0.9);
      gfx.strokeRoundedRect(-w / 2, -h / 2, w, h, 12);
    }

    // Rank badge
    const rankTxtCol = rank === 1 ? '#ffd700' : rank === 2 ? '#c0c0c0' : rank === 3 ? '#cd7f32' : '#aaaaaa';
    const rankStr = rank === 1 ? '🥇 #1' : rank === 2 ? '🥈 #2' : rank === 3 ? '🥉 #3' : `#${rank}`;
    const rankTxt = this.add.text(-w / 2 + 14, 0, rankStr, {
      fontFamily: 'Orbitron', fontSize: rank <= 3 ? '18px' : '16px', color: rankTxtCol, fontStyle: 'bold'
    }).setOrigin(0, 0.5);

    // Avatar + Username
    const nameStr = `${entry.avatar} ${entry.username}` + (isUser ? ' (YOU)' : '');
    const nameTxt = this.add.text(-w / 2 + 76, -8, nameStr, {
      fontFamily: 'Orbitron', fontSize: Math.min(w * 0.042, 14) + 'px', color: isUser ? '#00ffcc' : '#ffffff', fontStyle: 'bold'
    }).setOrigin(0, 0.5);

    // Subtitle level
    const lvlTxt = this.add.text(-w / 2 + 76, 12, `Lvl ${entry.level} • ${entry.solved} Puzzles Solved`, {
      fontFamily: 'Orbitron', fontSize: '11px', color: '#9b72ff'
    }).setOrigin(0, 0.5);

    // Right metric value
    let scoreStr = '';
    if (tab === 'stars') scoreStr = `${entry.stars} ⭐`;
    else if (tab === 'streak') scoreStr = `${entry.streak}x 🔥`;
    else if (tab === 'solved') scoreStr = `${entry.solved} 🧩`;
    else scoreStr = `${entry.xp.toLocaleString()} XP`;

    const scoreTxt = this.add.text(w / 2 - 16, 0, scoreStr, {
      fontFamily: 'Orbitron', fontSize: '18px', color: '#ffe45e', fontStyle: 'bold'
    }).setOrigin(1, 0.5);

    cont.add([gfx, rankTxt, nameTxt, lvlTxt, scoreTxt]);
    return cont;
  }
}
