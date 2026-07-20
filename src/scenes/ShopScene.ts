/* ShopScene.ts — Gacha machine + skin wardrobe with animated spinning capsule */
import Phaser from 'phaser';
import { GameData } from '../utils/GameData';
import { audio } from '../audio';
import { AdManager } from '../utils/AdManager';
import { createCartoonButton, blendColor } from '../utils/IsoHelper';
import { gsap } from 'gsap';
import confetti from 'canvas-confetti';

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
  { id: 'golden_crown', name: 'Gold Crown', emoji: '👑', rarity: 'legendary', hue: 50 }
];

const RARITY_COLORS: Record<string, number> = {
  common: 0x95a5a6, rare: 0x2980b9, epic: 0x8e44ad, legendary: 0xf39c12
};

const RARITY_NAMES: Record<string, string> = {
  common: '✨ Common', rare: '💎 Rare', epic: '🔮 Epic!', legendary: '🌈 LEGENDARY!!'
};

const GACHA_COST = 50;

export class ShopScene extends Phaser.Scene {
  private machineSpinning = false;
  private capsuleGfx!: Phaser.GameObjects.Graphics;
  private coinText!: Phaser.GameObjects.Text;
  private activeSkin = 'none';
  
  // Custom scrolling wardrobe grid state
  private scrollY = 0;
  private maxScrollY = 0;
  private startPointerY = 0;
  private startScrollY = 0;
  private isScrolling = false;
  private wardrobeContainer!: Phaser.GameObjects.Container;

  constructor() { super({ key: 'Shop' }); }

  create() {
    const W = this.scale.width, H = this.scale.height;
    this.activeSkin = GameData.activeSkin.get();

    // Peach cartoon background
    this.cameras.main.setBackgroundColor('#fff5ea');
    this.cameras.main.fadeIn(400, 255, 245, 234);

    const bg = this.add.graphics();
    bg.fillStyle(0xfff5ea, 1);
    bg.fillRect(0, 0, W, H);
    
    // Warm radial spots in bg
    bg.fillStyle(0xffebd6, 0.65);
    bg.fillCircle(W / 2, H * 0.25, W * 0.85);

    // Bubbles background detail
    bg.fillStyle(0xffffff, 0.45);
    for (let i = 0; i < 15; i++) {
      bg.fillCircle(Math.random() * W, Math.random() * H, Math.random() * 32 + 8);
    }

    // Title (Fredoka, drop shadow, kid cartoon style)
    void this.add.text(W / 2, H * 0.06, 'SKINS SHOP', {
      fontFamily: 'Fredoka, sans-serif',
      fontSize: Math.min(W * 0.09, 36) + 'px',
      color: '#ff9f1c',
      fontStyle: 'bold',
      stroke: '#ffffff', strokeThickness: 5,
      shadow: { offsetX: 0, offsetY: 4, color: '#5c3d2e', blur: 0, fill: true }
    }).setOrigin(0.5);

    // Coin display
    this.coinText = this.add.text(W / 2, H * 0.125, `🪙 ${GameData.coins.get()} Coins`, {
      fontFamily: 'Fredoka, sans-serif', fontSize: '20px', color: '#f39c12', fontStyle: 'bold'
    }).setOrigin(0.5);

    // Layout configuration: wide screen vs mobile portrait
    const isWide = W > 600;
    
    const machineX = isWide ? W * 0.26 : W / 2;
    const machineY = isWide ? H * 0.50 : H * 0.31;
    this.createGachaMachine(machineX, machineY, W, H);

    const gridX = isWide ? W * 0.58 : W / 2;
    const gridY = isWide ? H * 0.25 : H * 0.58;
    this.createScrollableWardrobe(gridX, gridY, W, H);

    // Back button (Pink Bubbly Cartoon style)
    createCartoonButton(this, 75, 42, 100, 42, '◀ Back', () => {
      audio.playTap();
      this.cameras.main.fadeOut(300, 255, 245, 234);
      this.time.delayedCall(320, () => this.scene.start('Menu'));
    }, { bgColor: 0xe91e63, fontSize: 16 });
  }

  private createGachaMachine(cx: number, cy: number, W: number, _H: number) {
    const machineW = Math.min(W * 0.38, 160);
    const machineH = machineW * 1.25;

    const bodyGfx = this.add.graphics().setDepth(2);

    const drawMachine = () => {
      bodyGfx.clear();
      // Drop Shadow
      bodyGfx.fillStyle(0x000000, 0.04);
      bodyGfx.fillRoundedRect(cx - machineW / 2, cy - machineH / 2 + 5, machineW, machineH, 20);

      // Main plastic body (white bubbly toy look)
      bodyGfx.fillStyle(0xffffff, 0.95);
      bodyGfx.fillRoundedRect(cx - machineW / 2, cy - machineH / 2, machineW, machineH, 20);

      // Light-orange border
      bodyGfx.lineStyle(3.5, 0xffd8b3, 1.0);
      bodyGfx.strokeRoundedRect(cx - machineW / 2, cy - machineH / 2, machineW, machineH, 20);

      // Glass bowl sphere
      bodyGfx.fillStyle(0xfff7f0, 0.85);
      bodyGfx.fillCircle(cx, cy - machineH * 0.16, machineW * 0.35);
      bodyGfx.lineStyle(2.5, 0xffd8b3, 1.0);
      bodyGfx.strokeCircle(cx, cy - machineH * 0.16, machineW * 0.35);

      // Glass shine highlight
      bodyGfx.fillStyle(0xffffff, 0.6);
      bodyGfx.fillEllipse(cx - machineW * 0.08, cy - machineH * 0.23, machineW * 0.22, machineW * 0.12);

      // Dispenser slot
      bodyGfx.fillStyle(0xffe5cc, 1);
      bodyGfx.fillRoundedRect(cx - machineW * 0.22, cy + machineH * 0.25, machineW * 0.44, machineH * 0.12, 10);
      bodyGfx.lineStyle(2, 0xffd8b3, 1.0);
      bodyGfx.strokeRoundedRect(cx - machineW * 0.22, cy + machineH * 0.25, machineW * 0.44, machineH * 0.12, 10);

      // Label background (Green plastic banner)
      bodyGfx.fillStyle(0x2ecc71, 1);
      bodyGfx.fillRoundedRect(cx - machineW * 0.35, cy + machineH * 0.08, machineW * 0.7, 26, 10);
      bodyGfx.lineStyle(2, 0x27ae60, 1.0);
      bodyGfx.strokeRoundedRect(cx - machineW * 0.35, cy + machineH * 0.08, machineW * 0.7, 26, 10);
    };

    drawMachine();

    // "ROLL!" label
    this.add.text(cx, cy + machineH * 0.15, 'ROLL!', {
      fontFamily: 'Fredoka, sans-serif', fontSize: '13px', color: '#ffffff', fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(3);

    // Spinning capsule inside glass
    this.capsuleGfx = this.add.graphics().setDepth(3);
    const capsuleY = cy - machineH * 0.16;

    // Spin button (Bubbly Pink button)
    const spinBtnY = cy + machineH / 2 + 28;
    const spinBtnW = machineW * 0.95;
    const spinBtnH = 46;

    const spinBtn = this.createBubblyBtn(cx, spinBtnY, spinBtnW, spinBtnH, 0xe91e63, 0xc2185b, `Roll! 🎰 🪙${GACHA_COST}`, 0);

    // Free Spin Ad Button (Bubbly Green button)
    const adSpinY = spinBtnY + 54;
    const adSpinH = 38;

    const adBtn = this.createBubblyBtn(cx, adSpinY, spinBtnW, adSpinH, 0x2ecc71, 0x27ae60, `🎬 Free Spin (Ad)`, 100);

    spinBtn.on('pointerdown', () => {
      if (this.machineSpinning) return;
      if (GameData.coins.get() < GACHA_COST) {
        this.showToast('😅 Play levels to earn more coins!');
        return;
      }
      GameData.coins.add(-GACHA_COST);
      this.coinText.setText(`🪙 ${GameData.coins.get()} Coins`);
      this.spinGacha(capsuleY, cx);
    });

    adBtn.on('pointerdown', async () => {
      if (this.machineSpinning) return;
      audio.playTap();
      const success = await AdManager.showRewardedAd('free_spin');
      if (success) {
        this.spinGacha(capsuleY, cx);
      }
    });

    // Idle capsule wiggle
    let t = 0;
    this.time.addEvent({
      delay: 16, repeat: -1,
      callback: () => {
        if (this.machineSpinning) return;
        t += 0.016;
        this.drawCapsule(this.capsuleGfx, cx, capsuleY, t, 0x9b59b6, machineW * 0.22);
      }
    });
  }

  private drawCapsule(g: Phaser.GameObjects.Graphics, cx: number, cy: number, angle: number, col: number, r: number) {
    g.clear();
    const ax = Math.cos(angle) * r * 0.15;
    const ay = Math.sin(angle * 1.5) * r * 0.15;
    // Bottom half (dark tone)
    g.fillStyle(col, 0.95);
    g.fillEllipse(cx + ax, cy + r * 0.28 + ay, r * 1.25, r * 1.45);
    // Top half (lighter tone)
    g.fillStyle(blendColor(col, 0xffffff, 0.35), 0.98);
    g.fillEllipse(cx + ax, cy - r * 0.28 + ay, r * 1.25, r * 1.45);
    // Highlights
    g.fillStyle(0xffffff, 0.4);
    g.fillEllipse(cx + ax - r * 0.2, cy - r * 0.45 + ay, r * 0.35, r * 0.45);
  }

  private spinGacha(capsuleY: number, cx: number) {
    this.machineSpinning = true;
    audio.playTap();

    // Dim overlay
    const overlay = this.add.graphics().setDepth(15);
    overlay.fillStyle(0x000000, 0.65);
    overlay.fillRect(0, 0, this.scale.width, this.scale.height);
    overlay.setAlpha(0);
    gsap.to(overlay, { alpha: 1, duration: 0.4 });

    // Lightning arcs
    const arcs = this.add.particles(cx, capsuleY, 'star_particle', {
      speed: { min: 100, max: 280 },
      scale: { start: 0.6, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: { min: 120, max: 220 },
      tint: 0xffe45e,
      frequency: 20,
      blendMode: 'ADD'
    }).setDepth(16);

    // Speeding up spin loop
    let t = 0;
    const spinSpeed = [0.06, 0.14, 0.32, 0.55];
    let phase = 0;
    const spinTimer = this.time.addEvent({
      delay: 16, repeat: 100,
      callback: () => {
        t += spinSpeed[Math.min(phase, spinSpeed.length - 1)];
        if (spinTimer.repeatCount < 50) phase = 2;
        if (spinTimer.repeatCount < 18) phase = 3;
        
        this.drawCapsule(this.capsuleGfx, cx, capsuleY, t, 0xe91e63, 32);
        
        // Shake
        this.capsuleGfx.x = (Math.random() - 0.5) * 10;
        this.capsuleGfx.y = (Math.random() - 0.5) * 10;
        
        if (spinTimer.repeatCount === 0) {
          this.capsuleGfx.setPosition(0, 0);
          arcs.destroy();
          this.cameras.main.flash(200, 255, 255, 255, false);
          this.time.delayedCall(200, () => {
            overlay.destroy();
            this.revealGachaResult();
          });
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

    const W = this.scale.width, H = this.scale.height;
    
    // Mask overlay
    const overlay = this.add.graphics().setDepth(30);
    overlay.fillStyle(0x000000, 0.7);
    overlay.fillRect(0, 0, W, H);

    // Card pop (Bubbly White)
    const boxW = Math.min(W * 0.8, 330), boxH = 260;
    overlay.fillStyle(0xffffff, 1.0);
    overlay.fillRoundedRect(W / 2 - boxW / 2, H / 2 - boxH / 2, boxW, boxH, 24);
    
    const rarCol = RARITY_COLORS[skin.rarity] ?? 0x95a5a6;
    overlay.lineStyle(4, rarCol, 1.0);
    overlay.strokeRoundedRect(W / 2 - boxW / 2, H / 2 - boxH / 2, boxW, boxH, 24);

    const emojiTxt = this.add.text(W / 2, H / 2 - 58, skin.emoji, { fontSize: '76px' }).setOrigin(0.5).setDepth(31).setAlpha(0).setScale(0.2);
    
    const nameTxt  = this.add.text(W / 2, H / 2 + 12, skin.name, {
      fontFamily: 'Fredoka, sans-serif', fontSize: '26px', color: '#ff9f1c', fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(31).setAlpha(0);
    
    const rarityTxt = this.add.text(W / 2, H / 2 + 44, RARITY_NAMES[skin.rarity], {
      fontFamily: 'Fredoka, sans-serif', fontSize: '18px',
      color: `#${rarCol.toString(16).padStart(6, '0')}`,
      fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(31).setAlpha(0);

    const closeTxt = this.add.text(W / 2, H / 2 + 90, 'Tap to unlock!', {
      fontFamily: 'Fredoka, sans-serif', fontSize: '14px', color: '#bdc3c7', fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(31).setAlpha(0);

    // Spring reveal
    audio.playCrownEquip();
    gsap.to(emojiTxt, { alpha: 1, scale: 1, duration: 0.5, ease: 'back.out(1.6)', delay: 0.1 });
    gsap.to([nameTxt, rarityTxt, closeTxt], { alpha: 1, duration: 0.4, delay: 0.4, stagger: 0.08 });

    // Burst
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.55 },
      colors: ['#ffe45e', '#ff6eb4', '#2ecc71']
    });

    const dismiss = () => {
      overlay.destroy();
      [emojiTxt, nameTxt, rarityTxt, closeTxt].forEach(t => t.destroy());
      this.machineSpinning = false;
      this.refreshWardrobeGrid();
    };

    this.input.once('pointerdown', dismiss);
    this.time.delayedCall(4500, () => {
      if (!overlay.scene) return;
      dismiss();
    });
  }

  private createScrollableWardrobe(startX: number, startY: number, W: number, H: number) {
    const isWide = W > 600;
    
    // Grid sizing
    const cols = 4;
    const cellW = Math.min(W * (isWide ? 0.08 : 0.18), 70);
    const cellH = cellW * 1.1;
    const gapX = cellW + 12;
    const gapY = cellH + 12;
    const totalW = gapX * cols - 12;

    const viewportH = isWide ? H - startY - 50 : H - startY - 90;
    
    // Viewport masking zone
    const viewport = this.add.zone(startX, startY + viewportH / 2, totalW + 20, viewportH)
      .setInteractive();

    this.wardrobeContainer = this.add.container(startX, startY);
    
    const maskShape = this.make.graphics({});
    maskShape.fillStyle(0xffffff, 1);
    maskShape.fillRoundedRect(startX - totalW / 2 - 10, startY, totalW + 20, viewportH, 16);
    const mask = maskShape.createGeometryMask();
    this.wardrobeContainer.setMask(mask);

    // Touch dragging logic for mobile wardrobe grid scrolling
    viewport.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.startPointerY = pointer.y;
      this.startScrollY = this.scrollY;
      this.isScrolling = true;
    });

    viewport.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.isScrolling) return;
      const dy = pointer.y - this.startPointerY;
      this.scrollY = Phaser.Math.Clamp(this.startScrollY + dy, -this.maxScrollY, 0);
      this.wardrobeContainer.y = startY + this.scrollY;
    });

    viewport.on('pointerup', () => this.isScrolling = false);
    viewport.on('pointerout', () => this.isScrolling = false);

    // Mouse wheel scrolling
    this.input.on('wheel', (_pointer: any, _gameObjects: any, _dx: number, dy: number) => {
      this.scrollY = Phaser.Math.Clamp(this.scrollY - dy * 0.6, -this.maxScrollY, 0);
      this.wardrobeContainer.y = startY + this.scrollY;
    });

    // Populate grid items
    SKINS.forEach((skin, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const cx = (col - (cols - 1) / 2) * gapX;
      const cy = row * gapY + cellH / 2 + 10;
      this.createSkinCard(cx, cy, skin, cellW, cellH, i * 40);
    });

    const totalHeight = Math.ceil(SKINS.length / cols) * gapY + 20;
    this.maxScrollY = Math.max(0, totalHeight - viewportH);
  }

  private createSkinCard(cx: number, cy: number, skin: typeof SKINS[0], w: number, h: number, delay: number) {
    const card = this.add.container(cx, cy).setAlpha(0);
    const unlocked = GameData.unlockedSkins.has(skin.id);
    const rarCol = RARITY_COLORS[skin.rarity] ?? 0x95a5a6;
    const isSelected = this.activeSkin === skin.id;

    const g = this.add.graphics();
    card.add(g);

    const draw = (hover: boolean) => {
      g.clear();
      // Drop Shadow
      g.fillStyle(0x000000, 0.03);
      g.fillRoundedRect(-w / 2, -h / 2 + 4, w, h, 14);

      // Card face
      const bgCol = isSelected ? 0xfff3e0 : (hover ? 0xfffcf7 : 0xffffff);
      g.fillStyle(bgCol, 1);
      g.fillRoundedRect(-w / 2, -h / 2, w, h, 14);

      // Borders
      g.lineStyle(isSelected ? 3.5 : 2, isSelected ? 0xff9f1c : (unlocked ? rarCol : 0xffebd6), 1.0);
      g.strokeRoundedRect(-w / 2, -h / 2, w, h, 14);

      if (!unlocked) {
        g.fillStyle(0x000000, 0.05);
        g.fillRoundedRect(-w / 2, -h / 2, w, h, 14);
      }
    };
    draw(false);

    // Emoji icon
    const emoji = this.add.text(0, -6, unlocked ? skin.emoji : '🔒', {
      fontSize: `${w * 0.5}px`
    }).setOrigin(0.5);

    // Label name (Fredoka font)
    const nameTxt = this.add.text(0, h * 0.32, unlocked ? skin.name : '???', {
      fontFamily: 'Fredoka, sans-serif', fontSize: `${Math.max(9, w * 0.15)}px`,
      color: unlocked ? (isSelected ? '#d35400' : '#7f8c8d') : '#bdc3c7', fontStyle: 'bold'
    }).setOrigin(0.5);

    card.add([emoji, nameTxt]);
    this.wardrobeContainer.add(card);

    if (unlocked) {
      g.setInteractive({
        hitArea: new Phaser.Geom.Rectangle(-w / 2, -h / 2, w, h),
        hitAreaCallback: Phaser.Geom.Rectangle.Contains,
        useHandCursor: true
      });
      g.on('pointerover', () => { draw(true); gsap.to(card, { scale: 1.06, duration: 0.1 }); });
      g.on('pointerout',  () => { draw(false); gsap.to(card, { scale: 1.0, duration: 0.1 }); });
      g.on('pointerdown', () => {
        audio.playCrownEquip();
        gsap.to(card, { scale: 0.95, duration: 0.05, yoyo: true, repeat: 1 });
        GameData.activeSkin.set(skin.id);
        this.activeSkin = skin.id;
        this.refreshWardrobeGrid();
      });
    }

    gsap.to(card, {
      alpha: 1,
      y: cy - 4,
      duration: 0.45,
      ease: 'back.out(1.5)',
      delay: delay / 1000
    });
  }

  private refreshWardrobeGrid() {
    this.cameras.main.fadeOut(200, 255, 245, 234);
    this.time.delayedCall(220, () => this.scene.restart());
  }

  private showToast(msg: string) {
    const W = this.scale.width, H = this.scale.height;
    const t = this.add.text(W / 2, H * 0.9, msg, {
      fontFamily: 'Fredoka, sans-serif', fontSize: '15px', color: '#ffffff',
      backgroundColor: '#e74c3caa', padding: { x: 14, y: 8 }, fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(50);
    
    gsap.from(t, { y: H * 0.95, alpha: 0, duration: 0.3, ease: 'back.out' });
    this.tweens.add({ targets: t, alpha: 0, delay: 2500, duration: 500, onComplete: () => t.destroy() });
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
      fontSize: '15px',
      fontStyle: 'bold',
      color: '#ffffff',
      stroke: '#000000', strokeThickness: 1.5,
      align: 'center'
    }).setOrigin(0.5);
    container.add(txt);

    const faceCol = fill;
    const shadowCol = borderCol;
    const r = 16;

    const draw = (state: 'idle' | 'hover' | 'pressed') => {
      bg.clear();
      let faceY = -h / 2;
      let shH = 5;
      
      if (state === 'pressed') {
        faceY = -h / 2 + 3;
        shH = 2;
        txt.setY(2);
      } else {
        txt.setY(-2);
      }

      const faceBright = state === 'hover' ? blendColor(faceCol, 0xffffff, 0.15) : faceCol;

      bg.fillStyle(shadowCol, 1);
      bg.fillRoundedRect(-w / 2, -h / 2 + shH, w, h, r);

      bg.fillStyle(faceBright, 1);
      bg.fillRoundedRect(-w / 2, faceY, w, h, r);

      bg.lineStyle(2.0, 0xffffff, 0.4);
      bg.beginPath();
      bg.moveTo(-w / 2 + r, faceY + 1.2);
      bg.lineTo(w / 2 - r, faceY + 1.2);
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
      delay: delay / 1000
    });

    return container;
  }
}
