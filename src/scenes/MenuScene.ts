/* MenuScene.ts — Animated splash screen with floating isometric buddy blocks */
import Phaser from 'phaser';
import { TILE_W, TILE_H, BLOCK_H, getBlockPalette, drawHat, drawIsoCube, drawCartoonCosmicBg, createCosmicEffects } from '../utils/IsoHelper';
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

    // --- Background gradient via graphics ---
    this.bgGfx = this.add.graphics();
    drawCartoonCosmicBg(this.bgGfx, W, H, 280);

    // --- Animated star field ---
    createCosmicEffects(this, W, H, 280);

    // --- Floating isometric demo blocks ---
    this.blockGfx = this.add.graphics();
    this.spawnFloatingBlocks(W, H);

    // --- Initialize Giant Jelly Buddy ---
    const skins = ['none', 'wizard', 'crown', 'cat', 'tophat', 'chef', 'propeller', 'rainbow'];
    this.buddySkin = skins[Math.floor(Math.random() * skins.length)];
    this.buddyX = W / 2;
    this.buddyY = this.buddyBaseY = H * 0.62;
    this.buddyState = 'idle';
    this.buddyAnimT = 0;

    // Interactive zone for giant buddy
    const buddyZone = this.add.zone(W / 2, H * 0.62, 140, 140)
      .setInteractive({ useHandCursor: true });
    buddyZone.on('pointerdown', () => {
      this.triggerBuddyWiggle();
    });

    // --- Game Logo Title ---
    const titleFontSize = Math.min(W * 0.1, 68);
    const title1 = this.add.text(W / 2, H * 0.145, '🏹 ARROW', {
      fontFamily: 'Orbitron', fontSize: `${titleFontSize}px`,
      color: '#ff85c1',
      stroke: '#ffffff', strokeThickness: 5,
      shadow: { offsetX: 0, offsetY: 6, color: '#ff0088', blur: 25, fill: true }
    }).setOrigin(0.5).setAlpha(0);

    const title2 = this.add.text(W / 2, H * 0.225, 'BUDDIES 3D', {
      fontFamily: 'Orbitron', fontSize: `${titleFontSize * 0.85}px`,
      color: '#ffe45e',
      stroke: '#ffffff', strokeThickness: 4,
      shadow: { offsetX: 0, offsetY: 6, color: '#ffa500', blur: 20, fill: true }
    }).setOrigin(0.5).setAlpha(0);

    const sub = this.add.text(W / 2, H * 0.30, 'Neon Escape Puzzle!', {
      fontFamily: 'Orbitron', fontSize: Math.min(W * 0.045, 22) + 'px',
      color: '#9b72ff'
    }).setOrigin(0.5).setAlpha(0);

    // --- Entrance Animations ---
    this.tweens.add({ targets: title1, alpha: 1, y: H * 0.145, duration: 700, ease: 'Back.Out', delay: 200 });
    this.tweens.add({ targets: title2, alpha: 1, y: H * 0.225, duration: 700, ease: 'Back.Out', delay: 400 });
    this.tweens.add({ targets: sub, alpha: 1, duration: 600, delay: 700 });

    // Pulsing glow on title
    this.tweens.add({ targets: title1, scaleX: 1.04, scaleY: 1.04, duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.InOut' });

    // --- Profile & Prestige Top Bar ---
    const topBar = this.add.container(W / 2, Math.max(28, H * 0.055));
    const topBarBg = this.add.graphics();
    const topW = Math.min(W - 40, 290), topH = 38;
    topBarBg.fillStyle(0x2d1854, 0.9);
    topBarBg.fillRoundedRect(-topW / 2, -topH / 2, topW, topH, 19);
    topBarBg.lineStyle(2, 0x00ffcc, 0.9);
    topBarBg.strokeRoundedRect(-topW / 2, -topH / 2, topW, topH, 19);

    const userEmo = GameData.avatar.get();
    const userName = GameData.username.get();
    const userLvl = GameData.playerXP.getLevel();
    const topBarTxt = this.add.text(0, 0, `${userEmo} ${userName} • Lvl ${userLvl} ⭐`, {
      fontFamily: 'Orbitron', fontSize: Math.min(topW * 0.065, 16) + 'px', color: '#00ffcc', fontStyle: 'bold'
    }).setOrigin(0.5);

    topBar.add([topBarBg, topBarTxt]);
    topBar.setInteractive(new Phaser.Geom.Rectangle(-topW / 2, -topH / 2, topW, topH), Phaser.Geom.Rectangle.Contains);
    topBar.input!.cursor = 'pointer';
    topBar.on('pointerdown', () => {
      audio.playTap();
      this.cameras.main.fadeOut(280, 0, 0, 20);
      this.time.delayedCall(300, () => this.scene.start('Profile'));
    });

    // --- Buttons Layout ---
    const btnPlayY = H * 0.40;
    const btnDailyY = H * 0.70;
    const btnLdbY = btnDailyY + 50;
    const btnShopY = btnLdbY + 50;
    const coinY = btnShopY + 44;
    
    const btnPlayBg = this.createNeonButton(W / 2, btnPlayY, 220, 58, 0xff6eb4, 0xff0088, 'PLAY  GAME', 0);
    const btnDailyBg = this.createNeonButton(W / 2, btnDailyY, 240, 46, 0x00bb88, 0x00ffcc, '📅 DAILY CHALLENGE', 100);
    const btnLdbBg = this.createNeonButton(W / 2, btnLdbY, 240, 46, 0xffa500, 0xffe45e, '🏆 LEADERBOARDS', 150);
    const btnShopBg = this.createNeonButton(W / 2, btnShopY, 200, 46, 0x9b72ff, 0x6600ff, 'SKINS  SHOP', 200);

    // Coin display
    const coinText = this.add.text(W / 2, coinY, `🪙 ${GameData.coins.get()} Coins`, {
      fontFamily: 'Orbitron', fontSize: '22px', color: '#ffe45e'
    }).setOrigin(0.5).setAlpha(0);
    this.tweens.add({ targets: coinText, alpha: 1, delay: 900, duration: 400 });

    // Mute button
    this.createMuteButton(W, H);

    // Info
    this.add.text(W / 2, H * 0.965, '🔄 Drag to rotate  •  👆 Tap to escape  •  💣 Bomb magic!', {
      fontFamily: 'Orbitron', fontSize: Math.min(W * 0.032, 14) + 'px', color: '#665588'
    }).setOrigin(0.5);

    // Button actions
    btnPlayBg.on('pointerdown', () => {
      audio.playTap();
      this.launchBuddyAndTransition();
    });

    btnDailyBg.on('pointerdown', () => {
      audio.playTap();
      this.cameras.main.fadeOut(300, 0, 0, 20);
      this.time.delayedCall(320, () => this.scene.start('DailyChallenge'));
    });

    btnLdbBg.on('pointerdown', () => {
      audio.playTap();
      this.cameras.main.fadeOut(300, 0, 0, 20);
      this.time.delayedCall(320, () => this.scene.start('Leaderboard'));
    });

    btnShopBg.on('pointerdown', () => {
      audio.playTap();
      this.cameras.main.fadeOut(300, 0, 0, 20);
      this.time.delayedCall(320, () => this.scene.start('Shop'));
    });

    // Fade in on start
    this.cameras.main.fadeIn(500, 10, 0, 26);

    // Start BGM
    if (!GameData.muted.get()) audio.playBGM();
  }

  private triggerBuddyWiggle() {
    if (this.buddyState === 'launch') return;
    this.buddyState = 'wiggle';
    this.buddyAnimT = 0;
    this.buddyBumpDy = -20;
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
    for (let i = 0; i < 10; i++) {
      this.floatingBlocks.push({
        x: Math.random() * W,
        y: Math.random() * H,
        vy: -(0.3 + Math.random() * 0.5),
        phase: Math.random() * Math.PI * 2,
        speed: 0.3 + Math.random() * 0.4,
        worldIdx: Math.floor(Math.random() * 3) + 1,
        posHash: Math.floor(Math.random() * 8),
        scale: 0.4 + Math.random() * 0.5,
        alpha: 0.15 + Math.random() * 0.35,
        skin: skins[Math.floor(Math.random() * skins.length)]
      });
    }
  }

  private createNeonButton(
    x: number, y: number, w: number, h: number,
    fillCol: number, glowCol: number,
    label: string, delay: number
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y).setAlpha(0).setDepth(10);

    const g = this.add.graphics();
    const draw = (hover: boolean) => {
      g.clear();
      // Shadow
      g.fillStyle(glowCol, 0.25);
      g.fillRoundedRect(-w / 2 + 2, -h / 2 + 6, w, h, h / 2);
      // Button bg
      g.fillStyle(hover ? fillCol : Phaser.Display.Color.ValueToColor(fillCol).darken(15).color, 1);
      g.fillRoundedRect(-w / 2, -h / 2, w, h, h / 2);
      // Glow outline
      for (let pass = 0; pass < 3; pass++) {
        g.lineStyle([4, 2.5, 1.5][pass], glowCol, [0.15, 0.35, 0.7][pass]);
        g.strokeRoundedRect(-w / 2, -h / 2, w, h, h / 2);
      }
    };

    draw(false);

    // Dynamic font size: fits text inside button (38% of height, capped by width)
    const labelLen  = label.replace(/\p{Emoji}/gu, '  ').length; // emoji ≈ 2 chars wide
    const maxByH    = Math.round(h * 0.42);
    const maxByW    = Math.round(w / Math.max(labelLen * 0.52, 1));
    const fontSize  = Math.min(maxByH, maxByW, 22);

    const text = this.add.text(0, 0, label, {
      fontFamily: 'Orbitron',
      fontSize: `${fontSize}px`,
      color: '#ffffff',
      stroke: '#000000', strokeThickness: 1.5,
      align: 'center'
    }).setOrigin(0.5);

    container.add([g, text]);

    // Set container interactive
    container.setInteractive(new Phaser.Geom.Rectangle(-w / 2, -h / 2, w, h), Phaser.Geom.Rectangle.Contains);
    container.input!.cursor = 'pointer';

    container.on('pointerover', () => {
      draw(true);
      this.tweens.add({
        targets: container,
        scale: 1.06,
        duration: 150,
        ease: 'Quad.easeOut',
        overwrite: true
      });
    });
    container.on('pointerout', () => {
      draw(false);
      this.tweens.add({
        targets: container,
        scale: 1.0,
        duration: 150,
        ease: 'Quad.easeOut',
        overwrite: true
      });
    });

    // Animate in
    this.tweens.add({ targets: container, alpha: 1, duration: 500, delay: 800 + delay, ease: 'Back.Out' });
    // Bounce idle
    this.tweens.add({ targets: container, y: y - 4, duration: 1400 + delay * 0.5, yoyo: true, repeat: -1, ease: 'Sine.InOut', delay: 1400 });

    return container;
  }

  private createMuteButton(W: number, H: number) {
    const btn = this.add.text(W - 45, H - 45, GameData.muted.get() ? '🔇' : '🔊', {
      fontSize: '26px'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    btn.on('pointerdown', () => {
      const muted = GameData.muted.toggle();
      btn.setText(muted ? '🔇' : '🔊');
      if (muted) audio.stopBGM(); else audio.playBGM();
    });
  }

  update(_time: number, delta: number) {
    const W = this.scale.width, H = this.scale.height;
    const dt = Math.min(delta / 1000, 0.1);

    this.blockGfx.clear();

    // 1. Update & draw background floating blocks
    for (const b of this.floatingBlocks) {
      b.y += b.vy * dt * 60;
      b.phase += dt * b.speed;
      const wobble = Math.sin(b.phase) * 8;

      if (b.y < -80) { b.y = H + 80; b.x = Math.random() * W; }

      const cx = b.x + wobble;
      const cy = b.y;
      const s = b.scale;
      const pal = getBlockPalette(b.worldIdx, b.posHash);

      this.blockGfx.setAlpha(b.alpha);

      const g = this.blockGfx;
      const tw = TILE_W * s, th = TILE_H * s, bh = BLOCK_H * s;

      const fillPoly = (g2: Phaser.GameObjects.Graphics, coords: number[]) => {
        g2.beginPath();
        g2.moveTo(coords[0], coords[1]);
        for (let i = 2; i < coords.length; i += 2) g2.lineTo(coords[i], coords[i + 1]);
        g2.closePath();
        g2.fillPath();
      };

      g.fillStyle(pal.right, 1); fillPoly(g, [cx+tw,cy, cx,cy+th, cx,cy+th+bh, cx+tw,cy+bh]);
      g.fillStyle(pal.left, 1);  fillPoly(g, [cx-tw,cy, cx,cy+th, cx,cy+th+bh, cx-tw,cy+bh]);
      g.fillStyle(pal.top, 1);   fillPoly(g, [cx,cy-th, cx+tw,cy, cx,cy+th, cx-tw,cy]);

      // Glossy shine
      g.fillStyle(0xffffff, 0.2);
      fillPoly(g, [cx, cy-th, cx+tw*0.5, cy-th*0.5, cx, cy+th*0.5, cx-tw, cy]);

      // Bevel lines
      g.lineStyle(1 * s, 0xffffff, 0.3);
      g.beginPath();
      g.moveTo(cx-tw, cy); g.lineTo(cx, cy+th); g.lineTo(cx+tw, cy);
      g.strokePath();

      g.lineStyle(1, pal.glow, 0.5);
      g.beginPath();
      g.moveTo(cx, cy-th); g.lineTo(cx+tw, cy); g.lineTo(cx, cy+th); g.lineTo(cx-tw, cy);
      g.closePath();
      g.strokePath();

      drawHat(g, cx, cy, tw, th, b.skin, this.time.now);
    }
    this.blockGfx.setAlpha(1);

    // 2. Update Giant Buddy Animation State
    this.buddyAnimT += dt;

    // Eye blinking timer
    this.blinkTimer -= dt;
    if (this.blinkTimer <= 0) {
      this.isBlinking = true;
      this.blinkTimer = 2.0 + Math.random() * 4.0;
      this.time.delayedCall(120, () => { this.isBlinking = false; });
    }

    if (this.buddyState === 'idle') {
      const breath = Math.sin(this.time.now * 0.003) * 0.025;
      this.buddyScalePara = 1.0 + breath;
      this.buddyScalePerp = 1.0 - breath;
      this.buddyAngle = 0;
      this.buddyX = W / 2;
      this.buddyY = this.buddyBaseY + Math.sin(this.time.now * 0.002) * 4;

      // Pointer drag/hover react
      const pointer = this.input.activePointer;
      const dist = Math.hypot(pointer.x - this.buddyX, pointer.y - this.buddyY);
      if (dist < 130 && pointer.isDown) {
        // Dragging & stretching
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
        // Hover squeeze
        const dx = pointer.x - this.buddyX;
        const dy = pointer.y - this.buddyY;
        this.buddyAngle = Math.atan2(dy, dx);

        const squeeze = 1.0 - (1.0 - dist / 130) * 0.12;
        this.buddyScalePara = squeeze;
        this.buddyScalePerp = 2.0 - squeeze;
      }
    } else if (this.buddyState === 'wiggle') {
      const dur = 0.70;
      const scaleAmp = Math.sin(this.buddyAnimT * Math.PI * 6) * Math.exp(-this.buddyAnimT * 4.5);
      this.buddyScalePara = 1.0 - 0.45 * scaleAmp;
      this.buddyScalePerp = 1.0 + 0.35 * scaleAmp;
      this.buddyY = this.buddyBaseY + this.buddyBumpDy * scaleAmp;

      if (this.buddyAnimT >= dur) {
        this.buddyState = 'idle';
        this.buddyAnimT = 0;
      }
    } else if (this.buddyState === 'launch') {
      if (this.buddyAnimT < 0.15) {
        // Anticipation squeeze down
        this.buddyScalePara = 0.65;
        this.buddyScalePerp = 1.35;
        this.buddyY = this.buddyBaseY + 16;
        this.buddyAngle = Math.PI / 2; // vertical squash
      } else {
        // Stretch and shoot up!
        const flyT = this.buddyAnimT - 0.15;
        this.buddyScalePara = 1.48;
        this.buddyScalePerp = 0.68;
        this.buddyY = this.buddyBaseY + 16 - flyT * flyT * 1800 - flyT * 500;
        this.buddyAngle = Math.PI / 2; // vertical stretch
      }
    }

    // 3. Render Giant Buddy
    const g = this.blockGfx;
    const cx = this.buddyX;
    const cy = this.buddyY;
    const s = 1.8; // scale factor
    const tw = TILE_W * s;
    const th = TILE_H * s;
    const bh = BLOCK_H * s;

    const pal = getBlockPalette(1, 4); // World 1 pink
    const scalePara = this.buddyScalePara;
    const scalePerp = this.buddyScalePerp;
    const angle = this.buddyAngle;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    const giantTransformer = (x: number, y: number) => {
      const dx = x - cx;
      const dy = y - (cy + bh / 2);
      const rx = dx * cos + dy * sin;
      const ry = -dx * sin + dy * cos;
      const rxScaled = rx * scalePara;
      const ryScaled = ry * scalePerp;
      const dxPrime = rxScaled * cos - ryScaled * sin;
      const dyPrime = rxScaled * sin + ryScaled * cos;
      return { x: cx + dxPrime, y: (cy + bh / 2) + dyPrime };
    };

    const tPt = (x: number, y: number) => giantTransformer(x, y);

    const fillTransformedRect = (x: number, y: number, w: number, h: number) => {
      const p1 = tPt(x, y);
      const p2 = tPt(x + w, y);
      const p3 = tPt(x + w, y + h);
      const p4 = tPt(x, y + h);
      g.beginPath();
      g.moveTo(p1.x, p1.y);
      g.lineTo(p2.x, p2.y);
      g.lineTo(p3.x, p3.y);
      g.lineTo(p4.x, p4.y);
      g.closePath();
      g.fillPath();
    };

    const scaleX = scalePara * Math.abs(cos) + scalePerp * Math.abs(sin);
    const scaleY = scalePara * Math.abs(sin) + scalePerp * Math.abs(cos);

    drawIsoCube(g, cx, cy, pal.top, pal.left, pal.right, pal.glow, 0.72, giantTransformer, 1, this.time.now);

    // Draw face
    const eyeY = cy - th * 0.15;
    const eyeScaleY = this.isBlinking ? 0.15 : 1;

    g.fillStyle(0x111111, 1);
    const le = tPt(cx - 15, eyeY);
    g.fillEllipse(le.x, le.y, 12 * scaleX, 10 * eyeScaleY * scaleY);
    const re = tPt(cx + 15, eyeY);
    g.fillEllipse(re.x, re.y, 12 * scaleX, 10 * eyeScaleY * scaleY);

    if (!this.isBlinking) {
      g.fillStyle(0xffffff, 0.85);
      const lhl = tPt(cx - 13, eyeY - 2);
      const rhl = tPt(cx + 17, eyeY - 2);
      g.fillCircle(lhl.x, lhl.y, 3 * Math.min(scaleX, scaleY));
      g.fillCircle(rhl.x, rhl.y, 3 * Math.min(scaleX, scaleY));

      // blush
      g.fillStyle(0xff79a8, 0.45);
      const lc = tPt(cx - 24, eyeY + 6);
      const rc = tPt(cx + 24, eyeY + 6);
      g.fillEllipse(lc.x, lc.y, 14 * scaleX, 6 * scaleY);
      g.fillEllipse(rc.x, rc.y, 14 * scaleX, 6 * scaleY);
    }

    if (this.buddyState === 'wiggle') {
      g.fillStyle(0x111111, 1);
      fillTransformedRect(cx - 20, eyeY - 2, 9, 2.5);
      fillTransformedRect(cx - 16, eyeY - 6, 2.5, 9.5);
      fillTransformedRect(cx + 11, eyeY - 2, 9, 2.5);
      fillTransformedRect(cx + 15, eyeY - 6, 2.5, 9.5);
    } else {
      const s1 = tPt(cx - 7, eyeY + 12);
      const s1m = tPt(cx - 3.5, eyeY + 15.5);
      const s2 = tPt(cx, eyeY + 17.5);
      const s2m = tPt(cx + 3.5, eyeY + 15.5);
      const s3 = tPt(cx + 7, eyeY + 12);
      g.lineStyle(3, 0x333333, 0.9);
      g.beginPath();
      g.moveTo(s1.x, s1.y);
      g.lineTo(s1m.x, s1m.y);
      g.lineTo(s2.x, s2.y);
      g.lineTo(s2m.x, s2m.y);
      g.lineTo(s3.x, s3.y);
      g.strokePath();
    }

    // Hat
    drawHat(g, cx, cy, tw, th, this.buddySkin, this.time.now, giantTransformer);
  }
}
