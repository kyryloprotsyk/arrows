/* MenuScene.ts — Animated splash screen matching the user mockup with pixel-perfect accuracy */
import Phaser from 'phaser';
import { TILE_W, TILE_H, BLOCK_H, getBlockPalette, drawHat, drawIsoCube, blendColor } from '../utils/IsoHelper';
import { GameData } from '../utils/GameData';
import { audio } from '../audio';

export class MenuScene extends Phaser.Scene {
  private blockGfx!: Phaser.GameObjects.Graphics;
  private bgGfx!: Phaser.GameObjects.Graphics;
  private floatingBlocks: Array<{
    x: number; y: number; vy: number; phase: number; speed: number;
    worldIdx: number; posHash: number; scale: number; alpha: number;
    skin: string;
  }> = [];

  // Giant Jelly Buddy fields
  private buddyX = 0;
  private buddyY = 0;
  private buddyBaseY = 0;
  private buddyState: 'idle' | 'wiggle' | 'launch' = 'idle';
  private buddyAnimT = 0;
  private buddyScalePara = 1;
  private buddyScalePerp = 1;
  private buddyAngle = 0;
  private buddyBumpDy = 0;
  private buddySkin = 'none';
  private isBlinking = false;
  private blinkTimer = 2.0;

  constructor() { super({ key: 'Menu' }); }

  create() {
    const W = this.scale.width, H = this.scale.height;

    // 1. Cosmic Gradient Sky (Deep space indigo to violet)
    this.bgGfx = this.add.graphics();
    this.bgGfx.fillGradientStyle(
      0x050012, 0x050012, // top left, top right
      0x0a0024, 0x0a0024, // bottom left, bottom right
      1, 1, 1, 1
    );
    this.bgGfx.fillRect(0, 0, W, H);

    // Large soft nebula-like color glows
    this.bgGfx.fillStyle(0x00d8ff, 0.08);
    this.bgGfx.fillEllipse(W / 2, H * 0.45, W * 1.3, H * 0.45);
    this.bgGfx.fillStyle(0xff00d8, 0.07);
    this.bgGfx.fillEllipse(W / 2, H * 0.20, W * 1.1, H * 0.4);

    // 2. Custom Sparkling Starfield (4-point cross stars twinkling)
    this.createCustomStarfield(W, H);

    // 3. Floating background blocks
    this.blockGfx = this.add.graphics();
    this.spawnFloatingBlocks(W, H);

    // 4. Initialize Giant Jelly Buddy
    const skins = ['none', 'wizard', 'crown', 'cat', 'tophat', 'chef', 'propeller', 'rainbow'];
    this.buddySkin = skins[Math.floor(Math.random() * skins.length)];
    this.buddyX = W / 2;
    this.buddyY = this.buddyBaseY = H * 0.385; // Upper-middle as in mockup
    this.buddyState = 'idle';
    this.buddyAnimT = 0;

    // Interactive zone for giant buddy
    const buddyZone = this.add.zone(W / 2, H * 0.385, 120, 120)
      .setInteractive({ useHandCursor: true });
    buddyZone.on('pointerdown', () => {
      this.triggerBuddyWiggle();
    });

    // 5. Game Logo Title (Centered at top)
    const titleFontSize = Math.round(Math.min(W * 0.115, 48));
    const title1 = this.add.text(W / 2, H * 0.12, 'ARROW', {
      fontFamily: 'Fredoka, sans-serif', fontSize: `${titleFontSize}px`, fontStyle: 'bold',
      color: '#ffffff',
      stroke: '#ff488e', strokeThickness: 5.5,
      align: 'center',
      shadow: { color: '#ff488e', blur: 20, stroke: true, fill: true }
    }).setOrigin(0.5).setAlpha(0);

    const title2 = this.add.text(W / 2, H * 0.188, 'BUDDIES 3D', {
      fontFamily: 'Fredoka, sans-serif', fontSize: `${titleFontSize * 0.88}px`, fontStyle: 'bold',
      color: '#ffffff',
      stroke: '#ff488e', strokeThickness: 5.0,
      align: 'center',
      shadow: { color: '#ff488e', blur: 18, stroke: true, fill: true }
    }).setOrigin(0.5).setAlpha(0);

    // Entrance Animations
    this.tweens.add({ targets: title1, alpha: 1, duration: 600, ease: 'Back.Out', delay: 100 });
    this.tweens.add({ targets: title2, alpha: 1, duration: 600, ease: 'Back.Out', delay: 250 });

    // Slow organic scaling/pulsing on title
    this.tweens.add({
      targets: [title1, title2],
      scaleX: 1.03, scaleY: 1.03,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut'
    });

    // 6. Profile Button (Top-Left, matching mockup)
    this.setupProfileButton();

    // 7. Mute Button (Top-Right, matching mockup)
    this.setupMuteButton(W);

    // 8. Buttons Stack (Lower half, matching mockup)
    const btnW = Math.min(W * 0.76, 290);
    const btnH = 52;
    const btnPlayY = H * 0.58;
    const btnDailyY = H * 0.68;
    const btnLdbY = H * 0.77;
    const btnShopY = H * 0.86;
    const coinY = H * 0.94;

    const btnPlay = this.createGlossyButton(W / 2, btnPlayY, btnW, btnH, 0xff488e, 0xc91c5d, 'PLAY GAME', 0);
    const btnDaily = this.createGlossyButton(W / 2, btnDailyY, btnW, btnH, 0x46c93a, 0x2d8b24, 'DAILY CHALLENGE', 80);
    const btnLdb = this.createGlossyButton(W / 2, btnLdbY, btnW, btnH, 0xffa21a, 0xc77000, 'LEADERBOARDS', 140);
    const btnShop = this.createGlossyButton(W / 2, btnShopY, btnW, btnH, 0xb17eff, 0x7a4cb8, 'SKINS SHOP', 200);

    // Button actions
    btnPlay.on('pointerdown', () => {
      audio.playTap();
      this.launchBuddyAndTransition();
    });

    btnDaily.on('pointerdown', () => {
      audio.playTap();
      this.cameras.main.fadeOut(300, 0, 0, 20);
      this.time.delayedCall(320, () => this.scene.start('DailyChallenge'));
    });

    btnLdb.on('pointerdown', () => {
      audio.playTap();
      this.cameras.main.fadeOut(300, 0, 0, 20);
      this.time.delayedCall(320, () => this.scene.start('Leaderboard'));
    });

    btnShop.on('pointerdown', () => {
      audio.playTap();
      this.cameras.main.fadeOut(300, 0, 0, 20);
      this.time.delayedCall(320, () => this.scene.start('Shop'));
    });

    // 9. Coin Display (Centered at bottom, matching mockup)
    const coinContainer = this.add.container(W / 2, coinY).setAlpha(0);
    
    // Draw vector gold coin
    const goldCoin = this.add.graphics();
    goldCoin.fillStyle(0xffd700, 1.0);
    goldCoin.fillCircle(-42, 0, 9.5);
    goldCoin.lineStyle(1.8, 0xe5a900, 1.0);
    goldCoin.strokeCircle(-42, 0, 9.5);
    goldCoin.fillStyle(0xffea3d, 1.0);
    goldCoin.fillCircle(-42, 0, 5.5);
    coinContainer.add(goldCoin);

    const coinText = this.add.text(-26, 0, `${GameData.coins.get()} Coins`, {
      fontFamily: 'Fredoka, sans-serif', fontSize: '18px', fontStyle: 'bold', color: '#ffffff',
      stroke: '#1e0b35', strokeThickness: 1.5
    }).setOrigin(0, 0.5);
    coinContainer.add(coinText);

    this.tweens.add({ targets: coinContainer, alpha: 1, delay: 700, duration: 400 });

    // Fade in scene
    this.cameras.main.fadeIn(500, 10, 0, 26);

    // Start BGM menu theme
    if (!GameData.muted.get()) audio.playBGM(0);
  }

  private createCustomStarfield(W: number, H: number) {
    const starGfx = this.add.graphics().setDepth(1);
    
    // Static backdrop stars
    for (let i = 0; i < 45; i++) {
      const x = Math.random() * W;
      const y = Math.random() * H * 0.95;
      const r = 0.5 + Math.random() * 1.5;
      const a = 0.25 + Math.random() * 0.55;
      starGfx.fillStyle(0xffffff, a);
      starGfx.fillCircle(x, y, r);
    }

    // Glowing 4-point cross flares (slowly rotating + twinkling)
    const colors = [0xffffff, 0xcbefff, 0xffebfa];
    for (let i = 0; i < 7; i++) {
      const x = 30 + Math.random() * (W - 60);
      const y = 30 + Math.random() * (H * 0.75);
      const scale = 0.7 + Math.random() * 0.5;
      const color = colors[i % colors.length];

      const sp = this.add.graphics({ x, y }).setDepth(2);
      
      // Star center and glow
      sp.fillStyle(color, 1.0);
      sp.fillCircle(0, 0, 1.8);
      sp.fillStyle(color, 0.22);
      sp.fillCircle(0, 0, 5);

      // Flare lines
      sp.lineStyle(1.0, color, 0.8);
      sp.beginPath();
      sp.moveTo(-11 * scale, 0); sp.lineTo(11 * scale, 0);
      sp.moveTo(0, -11 * scale); sp.lineTo(0, 11 * scale);
      sp.strokePath();

      // Rotation tween
      this.tweens.add({
        targets: sp,
        angle: 360,
        duration: 9000 + Math.random() * 7000,
        repeat: -1
      });

      // Twinkle alpha tween
      this.tweens.add({
        targets: sp,
        alpha: { from: 0.18, to: 0.95 },
        duration: 1300 + Math.random() * 1400,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.InOut'
      });
    }
  }

  private setupProfileButton() {
    const profileBtn = this.add.container(35, 40).setDepth(20);
    const cardGfx = this.add.graphics();
    
    // Background and gradient outline
    cardGfx.fillStyle(0x180c2b, 0.9);
    cardGfx.fillRoundedRect(-20, -20, 40, 40, 11);
    cardGfx.lineStyle(2.2, 0xd946ef, 1.0);
    cardGfx.strokeRoundedRect(-20, -20, 40, 40, 11);

    // Inner avatar graphics
    cardGfx.fillStyle(0xd946ef, 0.25);
    cardGfx.fillCircle(0, 0, 13);
    cardGfx.fillStyle(0xe8bbff, 1.0);
    cardGfx.fillCircle(0, -3, 5.5);
    cardGfx.beginPath();
    cardGfx.arc(0, 10, 9, Math.PI, 0, false);
    cardGfx.closePath();
    cardGfx.fillPath();

    profileBtn.add(cardGfx);
    profileBtn.setInteractive(new Phaser.Geom.Rectangle(-20, -20, 40, 40), Phaser.Geom.Rectangle.Contains);
    profileBtn.input!.cursor = 'pointer';

    profileBtn.on('pointerdown', () => {
      audio.playTap();
      this.cameras.main.fadeOut(280, 0, 0, 20);
      this.time.delayedCall(300, () => this.scene.start('Profile'));
    });

    profileBtn.on('pointerover', () => {
      this.tweens.add({ targets: profileBtn, scale: 1.08, duration: 100, overwrite: 'auto' });
    });
    profileBtn.on('pointerout', () => {
      this.tweens.add({ targets: profileBtn, scale: 1.0, duration: 100, overwrite: 'auto' });
    });
  }

  private setupMuteButton(W: number) {
    const muteBtn = this.add.container(W - 35, 40).setDepth(20);
    const muteGfx = this.add.graphics();

    const drawMute = (isMuted: boolean) => {
      muteGfx.clear();
      // Background and border matching avatar button
      muteGfx.fillStyle(0x180c2b, 0.9);
      muteGfx.fillRoundedRect(-20, -20, 40, 40, 11);
      muteGfx.lineStyle(1.8, 0x4f46e5, 0.85);
      muteGfx.strokeRoundedRect(-20, -20, 40, 40, 11);

      // White speaker icon
      muteGfx.fillStyle(0xffffff, 1.0);
      muteGfx.fillRect(-8, -4, 4, 8);
      muteGfx.beginPath();
      muteGfx.moveTo(-4, -4);
      muteGfx.lineTo(0, -8);
      muteGfx.lineTo(0, 8);
      muteGfx.lineTo(-4, 4);
      muteGfx.closePath();
      muteGfx.fillPath();

      if (isMuted) {
        // Red diagonal mute slash
        muteGfx.lineStyle(2.2, 0xef4444, 1.0);
        muteGfx.beginPath();
        muteGfx.moveTo(3, -4); muteGfx.lineTo(9, 2);
        muteGfx.moveTo(9, -4); muteGfx.lineTo(3, 2);
        muteGfx.strokePath();
      } else {
        // Sound waves
        muteGfx.lineStyle(1.8, 0xffffff, 1.0);
        muteGfx.beginPath();
        muteGfx.arc(0, 0, 5, -Math.PI / 3, Math.PI / 3, false);
        muteGfx.strokePath();
      }
    };

    drawMute(GameData.muted.get());
    muteBtn.add(muteGfx);
    muteBtn.setInteractive(new Phaser.Geom.Rectangle(-20, -20, 40, 40), Phaser.Geom.Rectangle.Contains);
    muteBtn.input!.cursor = 'pointer';

    muteBtn.on('pointerdown', () => {
      const muted = GameData.muted.toggle();
      drawMute(muted);
      if (muted) audio.stopBGM(); else audio.playBGM(0);
    });

    muteBtn.on('pointerover', () => {
      this.tweens.add({ targets: muteBtn, scale: 1.08, duration: 100, overwrite: 'auto' });
    });
    muteBtn.on('pointerout', () => {
      this.tweens.add({ targets: muteBtn, scale: 1.0, duration: 100, overwrite: 'auto' });
    });
  }

  private createGlossyButton(
    x: number, y: number, w: number, h: number,
    fillCol: number, shadowCol: number,
    label: string, delay: number
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y).setAlpha(0).setDepth(15);
    container.setInteractive(new Phaser.Geom.Rectangle(-w / 2, -h / 2, w, h), Phaser.Geom.Rectangle.Contains);
    container.input!.cursor = 'pointer';

    const bg = this.add.graphics();
    container.add(bg);

    const txt = this.add.text(0, -2, label, {
      fontFamily: 'Fredoka, sans-serif', fontSize: '20px', fontStyle: 'bold', color: '#ffffff',
      stroke: '#000000', strokeThickness: 3.5, align: 'center'
    }).setOrigin(0.5);
    container.add(txt);

    const r = h / 2;

    const drawBtn = (state: 'idle' | 'hover' | 'pressed') => {
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

      const faceColBright = state === 'hover' ? blendColor(fillCol, 0xffffff, 0.12) : fillCol;

      // 1. Bottom 3D shadow layer
      bg.fillStyle(shadowCol, 1.0);
      bg.fillRoundedRect(-w / 2, -h / 2 + shH, w, h, r);

      // 2. Main top face layer
      bg.fillStyle(faceColBright, 1.0);
      bg.fillRoundedRect(-w / 2, faceY, w, h, r);

      // 3. Highlight Bevel border
      bg.lineStyle(1.8, 0xffffff, 0.35);
      bg.beginPath();
      bg.moveTo(-w / 2 + r, faceY + 1.2);
      bg.lineTo(w / 2 - r, faceY + 1.2);
      bg.strokePath();

      // 4. White bubble gel highlight curve (mockup gloss reflection)
      bg.fillStyle(0xffffff, 0.28);
      bg.fillRoundedRect(-w / 2 + 15, faceY + 4, w - 30, h * 0.24, 6);
    };

    drawBtn('idle');

    container.on('pointerover', () => {
      drawBtn('hover');
      this.tweens.add({ targets: container, scale: 1.04, duration: 100, ease: 'Quad.Out', overwrite: 'auto' });
    });

    container.on('pointerout', () => {
      drawBtn('idle');
      this.tweens.add({ targets: container, scale: 1.0, duration: 100, ease: 'Quad.Out', overwrite: 'auto' });
    });

    container.on('pointerdown', () => {
      drawBtn('pressed');
      this.tweens.add({ targets: container, scale: 0.96, duration: 50, ease: 'Quad.Out', overwrite: 'auto' });
    });

    container.on('pointerup', () => {
      drawBtn('hover');
      this.tweens.add({ targets: container, scale: 1.04, duration: 80, ease: 'Quad.Out', overwrite: 'auto' });
    });

    // Entrance animation and slow float
    this.tweens.add({ targets: container, alpha: 1, duration: 450, delay: 500 + delay, ease: 'Back.Out' });
    this.tweens.add({
      targets: container,
      y: y - 4,
      duration: 1300 + delay * 0.5,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
      delay: 1000
    });

    return container;
  }

  private triggerBuddyWiggle() {
    if (this.buddyState === 'launch') return;
    this.buddyState = 'wiggle';
    this.buddyAnimT = 0;
    this.buddyBumpDy = -22;
    this.triggerHaptic(20);
    audio.playTap();
  }

  private triggerHaptic(pattern: number | number[]) {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try { navigator.vibrate(pattern); } catch {}
    }
  }

  private launchBuddyAndTransition() {
    if (this.buddyState === 'launch') return;
    this.buddyState = 'launch';
    this.buddyAnimT = 0;
    this.triggerHaptic([40, 60]);
    
    this.time.delayedCall(150, () => {
      audio.playLaunch();
    });

    this.time.delayedCall(220, () => {
      this.cameras.main.fadeOut(350, 10, 0, 26);
    });

    this.time.delayedCall(580, () => {
      this.scene.start('WorldSelect');
    });
  }

  private spawnFloatingBlocks(W: number, H: number) {
    const skins = ['none', 'none', 'wizard', 'crown', 'cat', 'tophat', 'chef', 'propeller', 'rainbow'];
    for (let i = 0; i < 8; i++) {
      this.floatingBlocks.push({
        x: Math.random() * W,
        y: Math.random() * H,
        vy: -(0.25 + Math.random() * 0.45),
        phase: Math.random() * Math.PI * 2,
        speed: 0.25 + Math.random() * 0.35,
        worldIdx: Math.floor(Math.random() * 3) + 1,
        posHash: Math.floor(Math.random() * 8),
        scale: 0.35 + Math.random() * 0.45,
        alpha: 0.12 + Math.random() * 0.28,
        skin: skins[Math.floor(Math.random() * skins.length)]
      });
    }
  }

  update(_time: number, delta: number) {
    const W = this.scale.width, H = this.scale.height;
    const dt = Math.min(delta / 1000, 0.1);

    this.blockGfx.clear();

    // 1. Draw floating background blocks
    for (const b of this.floatingBlocks) {
      b.y += b.vy * dt * 60;
      b.phase += dt * b.speed;
      const wobble = Math.sin(b.phase) * 6;

      if (b.y < -80) { b.y = H + 80; b.x = Math.random() * W; }

      const cx = b.x + wobble;
      const cy = b.y;
      const s = b.scale;
      const pal = getBlockPalette(b.worldIdx, b.posHash);

      this.blockGfx.setAlpha(b.alpha);
      const g = this.blockGfx;
      const tw = TILE_W * s, th = TILE_H * s, bh = BLOCK_H * s;

      const fillPoly = (coords: number[]) => {
        g.beginPath(); g.moveTo(coords[0], coords[1]);
        for (let i = 2; i < coords.length; i += 2) g.lineTo(coords[i], coords[i + 1]);
        g.closePath(); g.fillPath();
      };

      g.fillStyle(pal.right, 1); fillPoly([cx+tw,cy, cx,cy+th, cx,cy+th+bh, cx+tw,cy+bh]);
      g.fillStyle(pal.left, 1);  fillPoly([cx-tw,cy, cx,cy+th, cx,cy+th+bh, cx-tw,cy+bh]);
      g.fillStyle(pal.top, 1);   fillPoly([cx,cy-th, cx+tw,cy, cx,cy+th, cx-tw,cy]);

      // Simple gloss bevel highlight
      g.lineStyle(1 * s, 0xffffff, 0.25);
      g.beginPath(); g.moveTo(cx-tw, cy); g.lineTo(cx, cy+th); g.lineTo(cx+tw, cy); g.strokePath();

      drawHat(g, cx, cy, tw, th, b.skin, this.time.now);
    }
    this.blockGfx.setAlpha(1);

    // 2. Update Giant Buddy Animation State
    this.buddyAnimT += dt;

    // Blinking eye timer
    this.blinkTimer -= dt;
    if (this.blinkTimer <= 0) {
      this.isBlinking = true;
      this.blinkTimer = 1.8 + Math.random() * 3.5;
      this.time.delayedCall(110, () => { this.isBlinking = false; });
    }

    if (this.buddyState === 'idle') {
      const breath = Math.sin(this.time.now * 0.0035) * 0.022;
      this.buddyScalePara = 1.0 + breath;
      this.buddyScalePerp = 1.0 - breath;
      this.buddyAngle = 0;
      this.buddyX = W / 2;
      this.buddyY = this.buddyBaseY + Math.sin(this.time.now * 0.002) * 5.5;

      // Pointer drag/stretch react
      const pointer = this.input.activePointer;
      const dist = Math.hypot(pointer.x - this.buddyX, pointer.y - this.buddyY);
      if (dist < 130 && pointer.isDown) {
        const dx = pointer.x - this.buddyX;
        const dy = pointer.y - this.buddyY;
        const len = Math.hypot(dx, dy) || 1;
        this.buddyAngle = Math.atan2(dy, dx);
        const stretch = Math.min(1.35, 1.0 + len * 0.004);
        this.buddyScalePara = stretch;
        this.buddyScalePerp = 1 / stretch;
        this.buddyX = W / 2 + dx * 0.25;
        this.buddyY = this.buddyBaseY + dy * 0.25;
      } else if (dist < 130) {
        const dx = pointer.x - this.buddyX;
        const dy = pointer.y - this.buddyY;
        this.buddyAngle = Math.atan2(dy, dx);
        const squeeze = 1.0 - (1.0 - dist / 130) * 0.12;
        this.buddyScalePara = squeeze;
        this.buddyScalePerp = 2.0 - squeeze;
      }
    } else if (this.buddyState === 'wiggle') {
      const scaleAmp = Math.sin(this.buddyAnimT * Math.PI * 6.2) * Math.exp(-this.buddyAnimT * 4.8);
      this.buddyScalePara = 1.0 - 0.45 * scaleAmp;
      this.buddyScalePerp = 1.0 + 0.35 * scaleAmp;
      this.buddyY = this.buddyBaseY + this.buddyBumpDy * scaleAmp;
      if (this.buddyAnimT >= 0.70) {
        this.buddyState = 'idle';
        this.buddyAnimT = 0;
      }
    } else if (this.buddyState === 'launch') {
      if (this.buddyAnimT < 0.14) {
        this.buddyScalePara = 0.65;
        this.buddyScalePerp = 1.35;
        this.buddyY = this.buddyBaseY + 16;
        this.buddyAngle = Math.PI / 2;
      } else {
        const flyT = this.buddyAnimT - 0.14;
        this.buddyScalePara = 1.48;
        this.buddyScalePerp = 0.68;
        this.buddyY = this.buddyBaseY + 16 - flyT * flyT * 1850 - flyT * 500;
        this.buddyAngle = Math.PI / 2;
      }
    }

    // 3. Render Giant Buddy with arms, legs, shadow, blush & glowing eyes
    const g = this.blockGfx;
    const cx = this.buddyX;
    const cy = this.buddyY;
    const s = 1.1;  // Smaller — matches mockup proportions
    const tw = TILE_W * s;
    const th = TILE_H * s;
    const bh = BLOCK_H * s;

    // Soft peach-orange colors matching the user mockup
    const topCol = 0xffe4d6;
    const leftCol = 0xffb896;
    const rightCol = 0xe58b60;
    const glowCol = 0xff4e9f;

    const scalePara = this.buddyScalePara;
    const scalePerp = this.buddyScalePerp;
    const angle = this.buddyAngle;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    const giantTransformer = (px: number, py: number) => {
      const dx = px - cx;
      const dy = py - (cy + bh / 2);
      const rx = dx * cos + dy * sin;
      const ry = -dx * sin + dy * cos;
      const rxScaled = rx * scalePara;
      const ryScaled = ry * scalePerp;
      const dxP = rxScaled * cos - ryScaled * sin;
      const dyP = rxScaled * sin + ryScaled * cos;
      return { x: cx + dxP, y: (cy + bh / 2) + dyP };
    };

    const tPt = (px: number, py: number) => giantTransformer(px, py);

    const scaleX = scalePara * Math.abs(cos) + scalePerp * Math.abs(sin);
    const scaleY = scalePara * Math.abs(sin) + scalePerp * Math.abs(cos);

    // Floor shadow (drawn first)
    g.fillStyle(0x050012, 0.48);
    g.fillEllipse(cx, cy + 46, 82 * scaleX, 22 * scaleY);

    // Draw transformed stubby legs
    // Left leg
    g.fillStyle(0xffb896, 1.0);
    const ll1 = tPt(cx - 16, cy + 34);
    const ll2 = tPt(cx - 16, cy + 48);
    g.lineStyle(14 * scaleX, 0xffb896, 1.0);
    g.beginPath(); g.moveTo(ll1.x, ll1.y); g.lineTo(ll2.x, ll2.y); g.strokePath();

    // Right leg
    const rl1 = tPt(cx + 16, cy + 34);
    const rl2 = tPt(cx + 16, cy + 48);
    g.lineStyle(14 * scaleX, 0xffb896, 1.0);
    g.beginPath(); g.moveTo(rl1.x, rl1.y); g.lineTo(rl2.x, rl2.y); g.strokePath();

    // Draw transformed stubby side arms with visible round hand tips
    // Left arm
    const la1 = tPt(cx - 36, cy + 10);
    const la2 = tPt(cx - 50, cy + 22);
    g.lineStyle(13 * scaleX, 0xffb896, 1.0);
    g.beginPath(); g.moveTo(la1.x, la1.y); g.lineTo(la2.x, la2.y); g.strokePath();
    // Left hand round cap
    g.fillStyle(0xffb896, 1.0);
    g.fillCircle(la2.x, la2.y, 8 * scaleX);

    // Right arm
    const ra1 = tPt(cx + 36, cy + 10);
    const ra2 = tPt(cx + 50, cy + 22);
    g.lineStyle(13 * scaleX, 0xffb896, 1.0);
    g.beginPath(); g.moveTo(ra1.x, ra1.y); g.lineTo(ra2.x, ra2.y); g.strokePath();
    // Right hand round cap
    g.fillStyle(0xffb896, 1.0);
    g.fillCircle(ra2.x, ra2.y, 8 * scaleX);

    // Draw main isometric cube body
    drawIsoCube(g, cx, cy, topCol, leftCol, rightCol, glowCol, 0.72, giantTransformer, 1, this.time.now);

    // Draw eyes & face details
    const eyeY = cy - th * 0.15;
    const drawEye = (ex: number, ey: number) => {
      const ep = tPt(ex, ey);
      if (this.isBlinking) {
        g.lineStyle(3.5 * scaleY, 0x220516, 1.0);
        g.beginPath();
        g.moveTo(ep.x - 7 * scaleX, ep.y);
        g.lineTo(ep.x + 7 * scaleX, ep.y);
        g.strokePath();
      } else {
        // Glowing neon pink/magenta ring outer outline
        g.lineStyle(2.8 * Math.min(scaleX, scaleY), 0xff3d9c, 0.95);
        g.strokeCircle(ep.x, ep.y, 8.5 * Math.min(scaleX, scaleY));

        // Dark pupil
        g.fillStyle(0x220516, 1.0);
        g.fillCircle(ep.x, ep.y, 7.5 * Math.min(scaleX, scaleY));

        // Double shine highlights
        g.fillStyle(0xffffff, 1.0);
        const sh1 = tPt(ex - 2, ey - 2.5);
        const sh2 = tPt(ex + 2, ey + 2);
        g.fillCircle(sh1.x, sh1.y, 2.2 * Math.min(scaleX, scaleY));
        g.fillCircle(sh2.x, sh2.y, 1.0 * Math.min(scaleX, scaleY));
      }
    };

    drawEye(cx - 15, eyeY);
    drawEye(cx + 15, eyeY);

    if (!this.isBlinking) {
      // Soft glowing cheek blush
      g.fillStyle(0xff4a95, 0.42);
      const lc = tPt(cx - 24, eyeY + 6);
      const rc = tPt(cx + 24, eyeY + 6);
      g.fillEllipse(lc.x, lc.y, 13 * scaleX, 6 * scaleY);
      g.fillEllipse(rc.x, rc.y, 13 * scaleX, 6 * scaleY);
    }

    // Tiny smile
    if (this.buddyState === 'wiggle') {
      g.lineStyle(3, 0x220516, 1.0);
      const s1 = tPt(cx - 5, eyeY + 12);
      const s2 = tPt(cx + 5, eyeY + 12);
      g.beginPath(); g.moveTo(s1.x, s1.y); g.lineTo(s2.x, s2.y); g.strokePath();
    } else {
      const s1 = tPt(cx - 6, eyeY + 12);
      const s1m = tPt(cx - 3, eyeY + 15);
      const s2 = tPt(cx, eyeY + 16.5);
      const s2m = tPt(cx + 3, eyeY + 15);
      const s3 = tPt(cx + 6, eyeY + 12);
      g.lineStyle(3, 0x220516, 0.95);
      g.beginPath();
      g.moveTo(s1.x, s1.y);
      g.lineTo(s1m.x, s1m.y);
      g.lineTo(s2.x, s2.y);
      g.lineTo(s2m.x, s2m.y);
      g.lineTo(s3.x, s3.y);
      g.strokePath();
    }

    // Hat (if any)
    drawHat(g, cx, cy, tw, th, this.buddySkin, this.time.now, giantTransformer);
  }
}
