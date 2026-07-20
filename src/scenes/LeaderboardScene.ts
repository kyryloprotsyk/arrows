/* LeaderboardScene.ts — Global Online Leaderboards & Real-Time Rankings */
import Phaser from 'phaser';
import { LeaderboardService, type LeaderboardEntry } from '../utils/LeaderboardService';
import { audio } from '../audio';
import { createCartoonButton } from '../utils/IsoHelper';
import { gsap } from 'gsap';

export class LeaderboardScene extends Phaser.Scene {
  private scrollContainer!: Phaser.GameObjects.Container;
  private rankBannerText!: Phaser.GameObjects.Text;
  private tabButtons: Record<string, Phaser.GameObjects.Container> = {};
  
  // Custom scrolling state
  private scrollY = 0;
  private maxScrollY = 0;
  private startPointerY = 0;
  private startScrollY = 0;
  private isScrolling = false;

  constructor() { super({ key: 'Leaderboard' }); }

  create() {
    const W = this.scale.width, H = this.scale.height;
    
    // Peach cartoon-style background
    this.cameras.main.setBackgroundColor('#fff5ea');
    this.cameras.main.fadeIn(300, 255, 245, 234);

    const bg = this.add.graphics();
    bg.fillStyle(0xfff5ea, 1);
    bg.fillRect(0, 0, W, H);

    // Warm radial spots in bg
    bg.fillStyle(0xffebd6, 0.7);
    bg.fillCircle(W / 2, H * 0.15, W * 0.85);

    // Bubbles background detail
    bg.fillStyle(0xffffff, 0.4);
    for (let i = 0; i < 12; i++) {
      bg.fillCircle(Math.random() * W, Math.random() * H, Math.random() * 32 + 8);
    }

    // Title (Fredoka, drop shadow, kid cartoon style)
    this.add.text(W / 2, Math.max(46, H * 0.06), '🏆 Global Leaderboard', {
      fontFamily: 'Fredoka, sans-serif', fontSize: Math.min(W * 0.07, 34) + 'px',
      color: '#ff9f1c', stroke: '#ffffff', strokeThickness: 5,
      fontStyle: 'bold',
      shadow: { offsetX: 0, offsetY: 4, color: '#5c3d2e', blur: 0, fill: true }
    }).setOrigin(0.5);

    // Close / Back button (Bubbly Pink Cartoon button)
    createCartoonButton(this, 75, 42, 100, 42, '◀ Menu', () => {
      audio.playTap();
      this.cameras.main.fadeOut(300, 255, 245, 234);
      this.time.delayedCall(320, () => this.scene.start('Menu'));
    }, { bgColor: 0xe91e63, fontSize: 16 });

    // Live sync banner at bottom
    const bottomY = H - 36;
    this.rankBannerText = this.add.text(W / 2, bottomY, '', {
      fontFamily: 'Fredoka, sans-serif', fontSize: Math.min(W * 0.045, 15) + 'px',
      color: '#27ae60', backgroundColor: '#eafaf1',
      padding: { x: 16, y: 8 }, fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(10);

    // Tabs row (Bubbly Buttons)
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
      const btn = this.createTabButton(tx, tabY, tabW - 6, 38, `${t.icon} ${t.label}`, t.id);
      this.tabButtons[t.id] = btn;
    });

    // Outer scrolling container viewport mask setup
    const viewportY = tabY + 40;
    const viewportH = H - viewportY - 90;
    
    const viewport = this.add.zone(W / 2, viewportY + viewportH / 2, W, viewportH)
      .setInteractive();

    // Create a container that we can shift vertically to scroll
    this.scrollContainer = this.add.container(0, viewportY);
    
    // Add mask to clip anything outside the viewport bounds
    const maskShape = this.make.graphics({});
    maskShape.fillStyle(0xffffff, 1);
    maskShape.fillRoundedRect(16, viewportY, W - 32, viewportH, 16);
    const mask = maskShape.createGeometryMask();
    this.scrollContainer.setMask(mask);

    // Wire custom dragging/touch gestures for smooth mobile scrolling
    viewport.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.startPointerY = pointer.y;
      this.startScrollY = this.scrollY;
      this.isScrolling = true;
    });

    viewport.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.isScrolling) return;
      const dy = pointer.y - this.startPointerY;
      this.scrollY = Phaser.Math.Clamp(this.startScrollY + dy, -this.maxScrollY, 0);
      this.scrollContainer.y = viewportY + this.scrollY;
    });

    viewport.on('pointerup', () => {
      this.isScrolling = false;
    });

    viewport.on('pointerout', () => {
      this.isScrolling = false;
    });

    // Support mouse wheel scrolling
    this.input.on('wheel', (_pointer: any, _gameObjects: any, _deltaX: number, deltaY: number) => {
      this.scrollY = Phaser.Math.Clamp(this.scrollY - deltaY * 0.6, -this.maxScrollY, 0);
      this.scrollContainer.y = viewportY + this.scrollY;
    });

    // Load initial data
    LeaderboardService.simulateLiveActivity();
    this.refreshList('stars', viewportH);
  }

  private createTabButton(x: number, y: number, w: number, h: number, text: string, id: 'stars' | 'streak' | 'solved' | 'level') {
    const cont = this.add.container(x, y);
    const gfx = this.add.graphics();
    const lbl = this.add.text(0, -2, text, {
      fontFamily: 'Fredoka, sans-serif', fontSize: Math.min(w * 0.22, 13) + 'px', color: '#ffffff', fontStyle: 'bold'
    }).setOrigin(0.5);

    cont.add([gfx, lbl]);
    cont.setSize(w, h).setInteractive({ useHandCursor: true });
    
    // Tap event
    cont.on('pointerdown', () => {
      audio.playTap();
      // Visual squeeze effect on tap
      gsap.to(cont, { scale: 0.95, duration: 0.05, yoyo: true, repeat: 1 });
      const viewportY = Math.max(90, this.scale.height * 0.14) + 40;
      const viewportH = this.scale.height - viewportY - 90;
      this.refreshList(id, viewportH);
    });

    return cont;
  }

  private refreshList(tab: 'stars' | 'streak' | 'solved' | 'level', viewportH: number) {
    // Reset scroll positions
    this.scrollY = 0;
    const tabY = Math.max(90, this.scale.height * 0.14);
    this.scrollContainer.y = tabY + 40;

    // Update tab visuals to match bouncy cartoon feel
    Object.entries(this.tabButtons).forEach(([id, cont]) => {
      const gfx = cont.getAt(0) as Phaser.GameObjects.Graphics;
      const lbl = cont.getAt(1) as Phaser.GameObjects.Text;
      const active = id === tab;
      const w = cont.width, h = cont.height;
      
      gfx.clear();
      const bgCol = active ? 0xff9f1c : 0xffffff;
      const borderCol = active ? 0xd35400 : 0xffd8b3;
      const shadowCol = active ? 0xd35400 : 0xffe5cc;

      // 3D Shadow
      gfx.fillStyle(shadowCol, 1);
      gfx.fillRoundedRect(-w / 2, -h / 2 + 4, w, h, 14);

      // Main face
      gfx.fillStyle(bgCol, 1);
      gfx.fillRoundedRect(-w / 2, -h / 2, w, h, 14);

      // Border outline
      gfx.lineStyle(2, borderCol, 1.0);
      gfx.strokeRoundedRect(-w / 2, -h / 2, w, h, 14);

      lbl.setColor(active ? '#ffffff' : '#7f8c8d');
    });

    // Fetch live data
    const { entries, userRank, userEntry } = LeaderboardService.syncAndGetLeaderboard(tab);
    this.rankBannerText.setText(`🌍 Leaderboard Live • Rank: #${userRank} (${userEntry.username})`);

    // Rebuild lists
    this.scrollContainer.removeAll(true);
    const W = this.scale.width;
    const rowH = 58;
    const gap = 8;
    const topN = entries.slice(0, 15);

    topN.forEach((entry, i) => {
      const ry = i * (rowH + gap) + rowH / 2 + 10;
      const row = this.createRowCard(W / 2, ry, W - 32, rowH, entry, i + 1, tab);
      this.scrollContainer.add(row);
      
      // GSAP entrance cascade effect
      row.setScale(0.85).setAlpha(0);
      gsap.to(row, {
        scale: 1,
        alpha: 1,
        duration: 0.35,
        ease: 'back.out(1.4)',
        delay: i * 0.04
      });
    });

    let totalHeight = topN.length * (rowH + gap) + 20;

    // Pin currentUser rank row at the bottom if not in top 15
    if (userRank > 15) {
      const ryDivider = 15 * (rowH + gap) + 12;
      const div = this.add.text(W / 2, ryDivider, '• • • • • • • • • • • • •', {
        fontFamily: 'Fredoka, sans-serif', fontSize: '14px', color: '#ffd8b3', fontStyle: 'bold'
      }).setOrigin(0.5);
      
      const ryUser = ryDivider + 32;
      const userRow = this.createRowCard(W / 2, ryUser, W - 32, rowH, userEntry, userRank, tab);
      
      this.scrollContainer.add([div, userRow]);
      
      userRow.setScale(0.85).setAlpha(0);
      gsap.to(userRow, {
        scale: 1,
        alpha: 1,
        duration: 0.4,
        ease: 'back.out(1.4)',
        delay: 0.65
      });
      totalHeight += 64;
    }

    // Scroll boundaries
    this.maxScrollY = Math.max(0, totalHeight - viewportH);
  }

  private createRowCard(cx: number, cy: number, w: number, h: number, entry: LeaderboardEntry, rank: number, tab: string) {
    const cont = this.add.container(cx, cy);
    const gfx = this.add.graphics();
    const isUser = !!entry.isCurrentUser;

    // Card colors
    const bgCol = isUser ? 0xfff3e0 : (rank <= 3 ? 0xfffcf7 : 0xffffff);
    const borderCol = isUser ? 0xff9f1c : (rank === 1 ? 0xffd700 : rank === 2 ? 0xc0c0c0 : rank === 3 ? 0xcd7f32 : 0xffebd6);
    
    // Background shadow
    gfx.fillStyle(0x000000, 0.03);
    gfx.fillRoundedRect(-w / 2, -h / 2 + 4, w, h, 16);

    // Card face
    gfx.fillStyle(bgCol, 1);
    gfx.fillRoundedRect(-w / 2, -h / 2, w, h, 16);

    // Border stroke
    gfx.lineStyle(isUser ? 3.5 : 2, borderCol, 1.0);
    gfx.strokeRoundedRect(-w / 2, -h / 2, w, h, 16);

    // Rank badge styling
    const rankTxtCol = rank === 1 ? '#e67e22' : rank === 2 ? '#7f8c8d' : rank === 3 ? '#d35400' : '#bdc3c7';
    const rankStr = rank === 1 ? '🥇 #1' : rank === 2 ? '🥈 #2' : rank === 3 ? '🥉 #3' : `#${rank}`;
    const rankTxt = this.add.text(-w / 2 + 16, 0, rankStr, {
      fontFamily: 'Fredoka, sans-serif', fontSize: rank <= 3 ? '18px' : '16px', color: rankTxtCol, fontStyle: 'bold'
    }).setOrigin(0, 0.5);

    // Avatar + Username
    const nameStr = `${entry.avatar} ${entry.username}` + (isUser ? ' (YOU)' : '');
    const nameTxt = this.add.text(-w / 2 + 82, -9, nameStr, {
      fontFamily: 'Fredoka, sans-serif', fontSize: Math.min(w * 0.045, 15) + 'px', color: isUser ? '#d35400' : '#2c3e50', fontStyle: 'bold'
    }).setOrigin(0, 0.5);

    // Subtitle level
    const lvlTxt = this.add.text(-w / 2 + 82, 11, `Lvl ${entry.level} • ${entry.solved} solved`, {
      fontFamily: 'Fredoka, sans-serif', fontSize: '12px', color: '#95a5a6', fontStyle: 'bold'
    }).setOrigin(0, 0.5);

    // Right metric score value
    let scoreStr = '';
    if (tab === 'stars') scoreStr = `${entry.stars} ⭐`;
    else if (tab === 'streak') scoreStr = `${entry.streak}x 🔥`;
    else if (tab === 'solved') scoreStr = `${entry.solved} 🧩`;
    else scoreStr = `${entry.xp.toLocaleString()} XP`;

    const scoreTxt = this.add.text(w / 2 - 20, 0, scoreStr, {
      fontFamily: 'Fredoka, sans-serif', fontSize: '18px', color: '#ff9f1c', fontStyle: 'bold'
    }).setOrigin(1, 0.5);

    cont.add([gfx, rankTxt, nameTxt, lvlTxt, scoreTxt]);
    return cont;
  }
}
