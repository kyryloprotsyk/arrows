/* ShopScene.ts — Gacha machine + skin wardrobe with animated spinning capsule */
import Phaser from 'phaser';
import { GameData } from '../utils/GameData';
import { audio } from '../audio';
import { AdManager } from '../utils/AdManager';

const SKINS = [
  { id: 'none',     name: 'No Hat',      emoji: '😊', rarity: 'common',    hue: 200 },
  { id: 'wizard',   name: 'Wizard Hat',  emoji: '🧙', rarity: 'rare',      hue: 270 },
  { id: 'crown',    name: 'Crown',       emoji: '👑', rarity: 'epic',      hue: 45  },
  { id: 'cat',      name: 'Cat Ears',    emoji: '🐱', rarity: 'common',    hue: 330 },
  { id: 'tophat',   name: 'Top Hat',     emoji: '🎩', rarity: 'rare',      hue: 210 },
  { id: 'chef',     name: 'Chef Hat',    emoji: '👨‍🍳', rarity: 'common',    hue: 30  },
  { id: 'propeller',name: 'Propeller',   emoji: '🪁', rarity: 'epic',      hue: 150 },
  { id: 'rainbow',  name: 'Rainbow',     emoji: '🌈', rarity: 'legendary', hue: 180 },
  { id: 'dragon',   name: 'Dragon Head', emoji: '🐉', rarity: 'legendary', hue: 10  },
  { id: 'golden_crown', name: 'Gold Trophy Crown', emoji: '👑', rarity: 'legendary', hue: 50 }
];

const RARITY_COLORS: Record<string, number> = {
  common: 0x888888, rare: 0x4488ff, epic: 0xaa44ff, legendary: 0xffcc00
};

const GACHA_COST = 50;

export class ShopScene extends Phaser.Scene {
  private machineSpinning = false;
  private capsuleGfx!: Phaser.GameObjects.Graphics;
  private coinText!: Phaser.GameObjects.Text;
  private activeSkin = 'none';

  constructor() { super({ key: 'Shop' }); }

  create() {
    const W = this.scale.width, H = this.scale.height;
    this.activeSkin = GameData.activeSkin.get();

    // Bg
    this.cameras.main.setBackgroundColor('#0a001a');
    this.cameras.main.fadeIn(400, 10, 0, 26);
    this.addStarBg(W, H);

    // Title
    this.add.text(W / 2, H * 0.06, '🎩 Skins Shop', {
      fontFamily: 'Fredoka',
      fontSize: Math.min(W * 0.09, 44) + 'px',
      color: '#ffe45e',
      shadow: { offsetX: 0, offsetY: 5, color: '#ff8800', blur: 20, fill: true }
    }).setOrigin(0.5);

    // Coin display
    this.coinText = this.add.text(W / 2, H * 0.13, `🪙 ${GameData.coins.get()} Coins`, {
      fontFamily: 'Fredoka', fontSize: '22px', color: '#ffe45e'
    }).setOrigin(0.5);

    // Gacha machine (left side on wide screens, top half on mobile)
    const machineX = W > 600 ? W * 0.25 : W / 2;
    const machineY = W > 600 ? H * 0.45 : H * 0.38;
    this.createGachaMachine(machineX, machineY, W, H);

    // Skin wardrobe grid
    const gridX = W > 600 ? W * 0.58 : W / 2;
    const gridY = W > 600 ? H * 0.28 : H * 0.65;
    this.createWardrobeGrid(gridX, gridY, W, H);

    // Back button
    const back = this.add.text(40, 35, '← Back', {
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

  private createGachaMachine(cx: number, cy: number, W: number, _H: number) {
    const machineW = Math.min(W * 0.36, 180);
    const machineH = machineW * 1.3;

    // Machine body graphics
    const bodyGfx = this.add.graphics().setDepth(2);

    const drawMachine = () => {
      bodyGfx.clear();
      // Main body
      bodyGfx.fillStyle(0x220044, 1);
      bodyGfx.fillRoundedRect(cx - machineW / 2, cy - machineH / 2, machineW, machineH, 20);
      // Neon border
      for (let p = 0; p < 3; p++) {
        bodyGfx.lineStyle([5, 3, 1.5][p], 0xff6eb4, [0.1, 0.3, 0.7][p]);
        bodyGfx.strokeRoundedRect(cx - machineW / 2, cy - machineH / 2, machineW, machineH, 20);
      }
      // Glass sphere window
      bodyGfx.fillStyle(0x110033, 0.8);
      bodyGfx.fillCircle(cx, cy - machineH * 0.15, machineW * 0.35);
      bodyGfx.lineStyle(2, 0x9b72ff, 0.5);
      bodyGfx.strokeCircle(cx, cy - machineH * 0.15, machineW * 0.35);
      // Window highlight
      bodyGfx.fillStyle(0xffffff, 0.06);
      bodyGfx.fillEllipse(cx - machineW * 0.1, cy - machineH * 0.22, machineW * 0.25, machineW * 0.14);
      // Dispenser slot
      bodyGfx.fillStyle(0x110033, 1);
      bodyGfx.fillRoundedRect(cx - machineW * 0.22, cy + machineH * 0.24, machineW * 0.44, machineH * 0.12, 6);
      // Label
      bodyGfx.fillStyle(0xff6eb4, 0.9);
      bodyGfx.fillRoundedRect(cx - machineW * 0.35, cy + machineH * 0.06, machineW * 0.7, 28, 8);
    };

    drawMachine();

    // "GACHA" label
    this.add.text(cx, cy + machineH * 0.13, 'GACHA!', {
      fontFamily: 'Fredoka', fontSize: '16px', color: '#ffffff'
    }).setOrigin(0.5).setDepth(3);

    // Spinning capsule inside glass
    this.capsuleGfx = this.add.graphics().setDepth(3);
    const capsuleY = cy - machineH * 0.15;

    // Spin button
    const spinBtnY = cy + machineH / 2 + 28;
    const spinBtnW = machineW * 0.95;
    const spinBtn  = this.add.graphics().setDepth(4);
    const spinTxt_ = this.add.text(cx, spinBtnY, `Spin! 🎰\n🪙${GACHA_COST}`, {
      fontFamily: 'Fredoka', fontSize: '16px', color: '#ffffff', align: 'center'
    }).setOrigin(0.5).setDepth(5);
    void spinTxt_;

    const drawSpinBtn = (hover: boolean) => {
      spinBtn.clear();
      spinBtn.fillStyle(0xff6eb4, hover ? 1 : 0.8);
      spinBtn.fillRoundedRect(cx - spinBtnW / 2, spinBtnY - 24, spinBtnW, 48, 14);
      for (let p = 0; p < 3; p++) {
        spinBtn.lineStyle([5, 3, 1.5][p], 0xff0088, [0.1, 0.25, 0.6][p]);
        spinBtn.strokeRoundedRect(cx - spinBtnW / 2, spinBtnY - 24, spinBtnW, 48, 14);
      }
    };
    drawSpinBtn(false);

    spinBtn.setInteractive(
      new Phaser.Geom.Rectangle(cx - spinBtnW / 2, spinBtnY - 24, spinBtnW, 48),
      Phaser.Geom.Rectangle.Contains
    );
    spinBtn.on('pointerover', () => drawSpinBtn(true));
    spinBtn.on('pointerout',  () => drawSpinBtn(false));
    spinBtn.on('pointerdown', () => {
      if (this.machineSpinning) return;
      if (GameData.coins.get() < GACHA_COST) {
        this.showToast('😅 Not enough coins! Play more levels!');
        return;
      }
      GameData.coins.add(-GACHA_COST);
      this.coinText.setText(`🪙 ${GameData.coins.get()} Coins`);
      this.spinGacha(capsuleY);
    });

    // Free Spin Ad Button
    const adSpinY = spinBtnY + 54;
    const adSpinBtn = this.add.graphics().setDepth(4);
    const adSpinTxt = this.add.text(cx, adSpinY, `🎬 Watch Ad Free Spin!`, {
      fontFamily: 'Fredoka', fontSize: '13px', color: '#0a001a', fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(5);
    void adSpinTxt;

    const drawAdSpin = (hover: boolean) => {
      adSpinBtn.clear();
      adSpinBtn.fillStyle(0x00ffcc, hover ? 1 : 0.85);
      adSpinBtn.fillRoundedRect(cx - spinBtnW / 2, adSpinY - 18, spinBtnW, 36, 12);
      for (let p = 0; p < 3; p++) {
        adSpinBtn.lineStyle([4, 2, 1][p], 0x00aa88, [0.2, 0.4, 0.8][p]);
        adSpinBtn.strokeRoundedRect(cx - spinBtnW / 2, adSpinY - 18, spinBtnW, 36, 12);
      }
    };
    drawAdSpin(false);

    adSpinBtn.setInteractive(
      new Phaser.Geom.Rectangle(cx - spinBtnW / 2, adSpinY - 18, spinBtnW, 36),
      Phaser.Geom.Rectangle.Contains
    );
    adSpinBtn.on('pointerover', () => drawAdSpin(true));
    adSpinBtn.on('pointerout',  () => drawAdSpin(false));
    adSpinBtn.on('pointerdown', async () => {
      if (this.machineSpinning) return;
      audio.playTap();
      const success = await AdManager.showRewardedAd('free_spin');
      if (success) {
        this.spinGacha(capsuleY);
      }
    });

    // Animate capsule idle rotation
    let t = 0;
    this.time.addEvent({
      delay: 16, repeat: -1,
      callback: () => {
        if (this.machineSpinning) return;
        t += 0.016;
        this.drawCapsule(this.capsuleGfx, cx, capsuleY, t, 0x9944ff, machineW * 0.22);
      }
    });
  }

  private drawCapsule(g: Phaser.GameObjects.Graphics, cx: number, cy: number, angle: number, col: number, r: number) {
    g.clear();
    const ax = Math.cos(angle) * r * 0.15;
    const ay = Math.sin(angle * 1.7) * r * 0.15;
    // Bottom half
    g.fillStyle(col, 0.9);
    g.fillEllipse(cx + ax, cy + r * 0.3 + ay, r * 1.2, r * 1.5);
    // Top half (lighter)
    g.fillStyle(Phaser.Display.Color.ValueToColor(col).lighten(25).color, 0.95);
    g.fillEllipse(cx + ax, cy - r * 0.3 + ay, r * 1.2, r * 1.5);
    // Shine
    g.fillStyle(0xffffff, 0.2);
    g.fillEllipse(cx + ax - r * 0.2, cy - r * 0.5 + ay, r * 0.35, r * 0.5);
  }

  private spinGacha(capsuleY: number) {
    this.machineSpinning = true;
    audio.playTap();

    const cx_ = this.capsuleGfx.x || this.scale.width * 0.25;
    void cx_;

    // Fast spin animation
    let t = 0;
    const spinSpeed = [0.05, 0.12, 0.3, 0.5];
    let phase = 0;
    const spinTimer = this.time.addEvent({
      delay: 16, repeat: 120,
      callback: () => {
        t += spinSpeed[Math.min(phase, spinSpeed.length - 1)];
        if (spinTimer.repeatCount < 60) phase = 2;
        if (spinTimer.repeatCount < 20) phase = 3;
        this.drawCapsule(this.capsuleGfx, this.scale.width > 600 ? this.scale.width * 0.25 : this.scale.width / 2,
          capsuleY, t, 0xff6eb4, 35);
        if (spinTimer.repeatCount === 0) {
          this.revealGachaResult();
        }
      },
      callbackScope: this
    });
  }

  private revealGachaResult() {
    const unlocked = GameData.unlockedSkins.get();
    const available = SKINS.filter(s => !unlocked.includes(s.id));
    const skin = available.length > 0
      ? available[Math.floor(Math.random() * available.length)]
      : SKINS[Math.floor(Math.random() * SKINS.length)];

    GameData.unlockedSkins.add(skin.id);
    GameData.activeSkin.set(skin.id);
    this.activeSkin = skin.id;

    // Reveal pop
    const W = this.scale.width, H = this.scale.height;
    const overlay = this.add.graphics().setDepth(30);
    overlay.fillStyle(0x000000, 0.7);
    overlay.fillRect(0, 0, W, H);

    const boxW = Math.min(W * 0.8, 340), boxH = 260;
    overlay.fillStyle(0x1a0035, 1);
    overlay.fillRoundedRect(W / 2 - boxW / 2, H / 2 - boxH / 2, boxW, boxH, 24);
    for (let p = 0; p < 3; p++) {
      overlay.lineStyle([6, 3, 1.5][p], RARITY_COLORS[skin.rarity] ?? 0xaaaaaa, [0.1, 0.3, 0.8][p]);
      overlay.strokeRoundedRect(W / 2 - boxW / 2, H / 2 - boxH / 2, boxW, boxH, 24);
    }

    const rarityNames: Record<string, string> = { common: '✨ Common', rare: '💎 Rare', epic: '🔮 Epic!', legendary: '🌈 LEGENDARY!!' };

    const emojiTxt = this.add.text(W / 2, H / 2 - 60, skin.emoji, { fontSize: '72px' }).setOrigin(0.5).setDepth(31).setAlpha(0).setScale(0.2);
    const nameTxt  = this.add.text(W / 2, H / 2 + 10, skin.name, { fontFamily: 'Fredoka', fontSize: '28px', color: '#ffffff' }).setOrigin(0.5).setDepth(31).setAlpha(0);
    const rarityTxt = this.add.text(W / 2, H / 2 + 44, rarityNames[skin.rarity], {
      fontFamily: 'Fredoka', fontSize: '20px',
      color: `#${(RARITY_COLORS[skin.rarity] ?? 0xffffff).toString(16).padStart(6, '0')}`
    }).setOrigin(0.5).setDepth(31).setAlpha(0);

    const closeTxt = this.add.text(W / 2, H / 2 + 90, 'Tap to close', {
      fontFamily: 'Fredoka', fontSize: '16px', color: '#888888'
    }).setOrigin(0.5).setDepth(31).setAlpha(0);

    // Animate reveal
    audio.playCrownEquip();
    this.tweens.add({ targets: emojiTxt, alpha: 1, scaleX: 1, scaleY: 1, duration: 500, ease: 'Back.Out', delay: 100 });
    this.tweens.add({ targets: [nameTxt, rarityTxt, closeTxt], alpha: 1, duration: 400, delay: 500 });

    // Confetti
    this.add.particles(W / 2, H / 2 - 80, 'star_particle', {
      speed: { min: 60, max: 220 },
      lifespan: { min: 800, max: 1800 },
      scale: { start: 1, end: 0 },
      tint: [0xff6eb4, 0xffe45e, 0x9b72ff, 0x6bcb77],
      angle: { min: 240, max: 300 },
      gravityY: 180,
      frequency: 30
    }).setDepth(32);

    const dismiss = () => {
      overlay.destroy();
      [emojiTxt, nameTxt, rarityTxt, closeTxt].forEach(t => t.destroy());
      this.machineSpinning = false;
      this.refreshWardrobeGrid();
    };

    this.input.once('pointerdown', dismiss);
    this.time.delayedCall(5000, () => {
      if (!overlay.scene) return;
      dismiss();
    });
  }

  private createWardrobeGrid(startX: number, startY: number, W: number, _H: number) {
    const isWide = W > 600;
    const cols = isWide ? 4 : 4;
    const cellSize = Math.min(W * (isWide ? 0.1 : 0.2), 72);
    const gap = cellSize + 12;

    SKINS.forEach((skin, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + (col - (cols - 1) / 2) * gap;
      const y = startY + row * gap;
      this.createSkinCard(x, y, skin, cellSize, i * 50);
    });
  }

  private createSkinCard(cx: number, cy: number, skin: typeof SKINS[0], size: number, delay: number) {
    const g = this.add.graphics().setAlpha(0).setDepth(5);
    const unlocked = GameData.unlockedSkins.has(skin.id);
    const rarCol = RARITY_COLORS[skin.rarity] ?? 0x888888;

    const draw = (hover: boolean, selected: boolean) => {
      g.clear();
      g.fillStyle(selected ? 0x3a006a : hover ? 0x220050 : 0x110033, 1);
      g.fillRoundedRect(cx - size / 2, cy - size / 2, size, size, 10);
      for (let p = 0; p < 3; p++) {
        const a = selected ? 0.9 : hover ? 0.5 : 0.25;
        g.lineStyle([4, 2.5, 1.5][p], selected ? 0xffffff : rarCol, [0.15, 0.3, a][p]);
        g.strokeRoundedRect(cx - size / 2, cy - size / 2, size, size, 10);
      }
      if (!unlocked) {
        g.fillStyle(0x000000, 0.5);
        g.fillRoundedRect(cx - size / 2, cy - size / 2, size, size, 10);
      }
    };

    draw(false, this.activeSkin === skin.id);

    const emojiSize = size * 0.55;
    const emoji = this.add.text(cx, cy - 6, unlocked ? skin.emoji : '🔒', {
      fontSize: `${emojiSize}px`
    }).setOrigin(0.5).setAlpha(0).setDepth(6);

    const label = this.add.text(cx, cy + size * 0.3, unlocked ? skin.name : '???', {
      fontFamily: 'Fredoka', fontSize: `${Math.max(9, size * 0.16)}px`,
      color: unlocked ? '#ffffff' : '#443344'
    }).setOrigin(0.5).setAlpha(0).setDepth(6);

    if (unlocked) {
      g.setInteractive(new Phaser.Geom.Rectangle(cx - size / 2, cy - size / 2, size, size), Phaser.Geom.Rectangle.Contains);
      g.on('pointerover', () => draw(true, this.activeSkin === skin.id));
      g.on('pointerout',  () => draw(false, this.activeSkin === skin.id));
      g.on('pointerdown', () => {
        audio.playCrownEquip();
        GameData.activeSkin.set(skin.id);
        this.activeSkin = skin.id;
        this.refreshWardrobeGrid();
      });
    }

    this.tweens.add({ targets: [g, emoji, label], alpha: 1, duration: 400, delay, ease: 'Back.Out' });
    g.setData('skinId', skin.id);
    g.setData('drawFn', draw);
  }

  private refreshWardrobeGrid() {
    // Re-render all cards to update selected state
    // Simple: restart scene
    this.cameras.main.fadeOut(200, 10, 0, 26);
    this.time.delayedCall(220, () => this.scene.restart());
  }

  private showToast(msg: string) {
    const W = this.scale.width, H = this.scale.height;
    const t = this.add.text(W / 2, H * 0.9, msg, {
      fontFamily: 'Fredoka', fontSize: '17px', color: '#ff8888',
      backgroundColor: '#220022aa', padding: { x: 14, y: 8 }
    }).setOrigin(0.5).setDepth(50);
    this.tweens.add({ targets: t, alpha: 0, delay: 2500, duration: 500, onComplete: () => t.destroy() });
  }

  private addStarBg(W: number, H: number) {
    const g = this.add.graphics();
    g.fillStyle(0x0a001a, 1); g.fillRect(0, 0, W, H);
    for (let i = 0; i < 100; i++) {
      g.fillStyle(0xffffff, 0.15 + Math.random() * 0.4);
      g.fillCircle(Math.random() * W, Math.random() * H, Math.random() * 1.3 + 0.3);
    }
  }
}
