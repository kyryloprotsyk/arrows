/* GameScene.ts — Main isometric 3D puzzle scene with Phaser 3 */
import Phaser from 'phaser';
import {
  TILE_W, TILE_H,
  gridToScreen, getDrawDepth, isPointInBlock,
  drawIsoCube, getBlockPalette, hslToInt, drawHat
} from '../utils/IsoHelper';
import { levelGenerator } from '../levelGenerator';
import type { BlockConfig, LevelData } from '../levelGenerator';
import { GameData } from '../utils/GameData';
import { audio } from '../audio';

interface BuddyBlock extends BlockConfig {
  // Screen-space position (for animation)
  sx: number; sy: number;
  // Target screen position
  tsx: number; tsy: number;
  // Animation state
  state: 'idle' | 'bump' | 'escaping' | 'locked';
  animT: number;          // seconds in current state
  escapeVx: number; escapeVy: number;
  bumpDx: number; bumpDy: number;
  // Eye blink
  blinkTimer: number;
  isBlinking: boolean;
  // Rainbow hue cycle
  rainbowHue: number;
  // Colors
  palTop: number; palLeft: number; palRight: number; palGlow: number;
  // Draw depth
  depth: number;
}

export class GameScene extends Phaser.Scene {
  // ── State ─────────────────────────────────────────────────────────────
  private worldIndex = 1;
  private levelIndex = 1;
  private levelData!: LevelData;
  private buddies: BuddyBlock[] = [];
  private rotState = 0; // 0-3: 90° steps
  private coins = 0;
  private movesLeft = 0;
  private movesTotal = 0;
  private comboCount = 0;
  private lastEscapeTime = 0;
  private activeSkin = 'none';

  // ── Scene center (where puzzle cluster is drawn) ───────────────────────
  private centerX = 0;
  private centerY = 0;

  // ── Camera panning ────────────────────────────────────────────────────
  private panX = 0; private panY = 0;
  private panTargetX = 0; private panTargetY = 0;

  // ── Input ─────────────────────────────────────────────────────────────
  private isDragging = false;
  private dragStartX = 0; private dragStartY = 0;
  private panAtDragX = 0; private panAtDragY = 0;
  private hasMoved = false;
  // Rotation gesture
  private totalDragX = 0;
  private pinchDist0 = 0;
  private camZoom = 1;
  private zoomTarget = 1;

  // ── Graphics ──────────────────────────────────────────────────────────
  private blockGfx!: Phaser.GameObjects.Graphics;
  private bgGfx!: Phaser.GameObjects.Graphics;

  // ── Particles ─────────────────────────────────────────────────────────
  private trailEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;
  private boomEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;
  private confettiEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;

  // ── HUD ───────────────────────────────────────────────────────────────
  private hudCoins!: Phaser.GameObjects.Text;
  private hudMoves!: Phaser.GameObjects.Text;
  private hudLevel!: Phaser.GameObjects.Text;
  private hudBar!: Phaser.GameObjects.Graphics;
  private comboLabel!: Phaser.GameObjects.Text;
  private tutLabel!: Phaser.GameObjects.Text;

  constructor() { super({ key: 'Game' }); }

  init(data: { world?: number; level?: number }) {
    this.worldIndex = data.world ?? GameData.world.get();
    this.levelIndex = data.level ?? GameData.level.get();
    this.coins = GameData.coins.get();
    this.rotState = 0;
    this.panX = this.panTargetX = 0;
    this.panY = this.panTargetY = 0;
    this.camZoom = 1; this.zoomTarget = 1;
    this.activeSkin = GameData.activeSkin.get();
  }

  create() {
    const W = this.scale.width, H = this.scale.height;
    this.centerX = W / 2;
    this.centerY = H / 2;

    this.cameras.main.setBackgroundColor('#0a001a');

    // Background
    this.bgGfx = this.add.graphics();
    this.drawBackground(W, H);

    // Graphics layers
    this.blockGfx = this.add.graphics().setDepth(5);

    // Particles
    this.setupParticles();

    // HUD
    this.setupHUD(W, H);

    // Input
    this.setupInput();

    // Load level
    this.loadLevel(this.worldIndex, this.levelIndex);

    // Fade in
    this.cameras.main.fadeIn(400, 10, 0, 26);

    // BGM
    if (!GameData.muted.get()) audio.playBGM();
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Level Loading
  // ═══════════════════════════════════════════════════════════════════════
  private loadLevel(world: number, level: number) {
    this.worldIndex = world; this.levelIndex = level;
    this.levelData = levelGenerator.generateLevel(world, level);
    this.movesLeft = this.movesTotal = this.levelData.moveLimit;
    this.comboCount = 0;

    // Build buddy array
    this.buddies = this.levelData.blocks.map(cfg => {
      const { x: gx, y: gy, z: gz } = cfg;
      const hash = Math.abs(Math.floor(gx * 7 + gy * 13 + gz * 17));
      const pal = cfg.type === 'normal' || cfg.type === 'rainbow'
        ? getBlockPalette(world, hash)
        : this.getTypePalette(cfg.type);

      const sc = gridToScreen(gx, gy, gz, this.rotState);
      return {
        ...cfg,
        sx: sc.x, sy: sc.y,
        tsx: sc.x, tsy: sc.y,
        state: cfg.type === 'chest' ? 'locked' : 'idle',
        animT: 0,
        escapeVx: 0, escapeVy: 0,
        bumpDx: 0, bumpDy: 0,
        blinkTimer: 1.5 + Math.random() * 3,
        isBlinking: false,
        rainbowHue: Math.random(),
        palTop: pal.top, palLeft: pal.left,
        palRight: pal.right, palGlow: pal.glow,
        depth: getDrawDepth(gx, gy, gz, this.rotState)
      } as BuddyBlock;
    });

    // Camera cinematic intro: start zoomed out, pan to cluster, zoom in
    this.recalcCenter();
    const targetPanX = -this.getClusterCenter().cx;
    const targetPanY = -this.getClusterCenter().cy;

    this.panX = this.panTargetX = targetPanX;
    this.panY = this.panTargetY = targetPanY;

    this.camZoom = 0.35;
    this.zoomTarget = 1;

    this.cameras.main.zoomTo(1, 900, 'Quad.easeOut');

    this.updateHUD();

    // Tutorial tip
    this.showTutorial(world, level);
  }

  private getClusterCenter() {
    if (!this.buddies.length) return { cx: 0, cy: 0 };
    let sx = 0, sy = 0;
    for (const b of this.buddies) { sx += b.sx; sy += b.sy; }
    return { cx: sx / this.buddies.length, cy: sy / this.buddies.length };
  }

  private recalcCenter() {
    const cc = this.getClusterCenter();
    this.panTargetX = -cc.cx;
    this.panTargetY = -cc.cy;
  }

  private getTypePalette(type: string) {
    const t: Record<string, ReturnType<typeof getBlockPalette>> = {
      bomb: { top: 0x2a2a3a, left: 0x1a1a25, right: 0x0f0f18, glow: 0xff3c00 },
      key:  { top: 0xffcc00, left: 0xe6a800, right: 0xb38200, glow: 0xffee55 },
      chest:{ top: 0x8b5e3c, left: 0x6b4020, right: 0x4a2a12, glow: 0xffcc00 }
    };
    return t[type] ?? { top: 0x888888, left: 0x555555, right: 0x333333, glow: 0xaaaaaa };
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Input
  // ═══════════════════════════════════════════════════════════════════════
  private setupInput() {


    // Pointer down
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      // Ignore HUD area
      if (p.y < 80) return;
      this.isDragging = true;
      this.hasMoved = false;
      this.dragStartX = p.x;
      this.dragStartY = p.y;
      this.panAtDragX = this.panX;
      this.panAtDragY = this.panY;
      this.totalDragX = 0;
    });

    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!this.isDragging) return;
      const dx = p.x - this.dragStartX;
      const dy = p.y - this.dragStartY;
      this.totalDragX += p.velocity.x;
      if (Math.abs(dx) + Math.abs(dy) > 6) this.hasMoved = true;

      // Pan
      this.panTargetX = this.panAtDragX + dx / this.camZoom;
      this.panTargetY = this.panAtDragY + dy / this.camZoom;
    });

    this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      if (!this.isDragging) return;
      this.isDragging = false;

      // Snap rotation if big horizontal swipe
      if (Math.abs(this.totalDragX) > 250) {
        this.rotateView(this.totalDragX < 0 ? 1 : -1);
      }

      // If it's a click/tap (no real drag)
      if (!this.hasMoved) {
        this.handleTap(p.x, p.y);
      }
    });

    // Pinch zoom (touch)
    this.input.on('pointermove', (_p: Phaser.Input.Pointer) => {
      if (this.input.pointer1.isDown && this.input.pointer2.isDown) {
        const d = Phaser.Math.Distance.Between(
          this.input.pointer1.x, this.input.pointer1.y,
          this.input.pointer2.x, this.input.pointer2.y
        );
        if (this.pinchDist0 === 0) {
          this.pinchDist0 = d;
        } else {
          this.zoomTarget = Phaser.Math.Clamp(this.camZoom * (d / this.pinchDist0), 0.45, 2.2);
        }
      } else {
        this.pinchDist0 = 0;
      }
    });

    // Scroll wheel zoom
    this.input.on('wheel', (_: any, __: any, ___: any, dy: number) => {
      this.zoomTarget = Phaser.Math.Clamp(this.zoomTarget - dy * 0.001, 0.45, 2.2);
    });

    // Keyboard shortcuts
    this.input.keyboard?.on('keydown-R', () => this.resetLevel());
    this.input.keyboard?.on('keydown-ESC', () => this.goToWorldSelect());
    this.input.keyboard?.on('keydown-LEFT', () => this.rotateView(-1));
    this.input.keyboard?.on('keydown-RIGHT', () => this.rotateView(1));
  }

  private handleTap(px: number, py: number) {
    // Convert screen tap to world space (account for pan, zoom, center offset)
    const wx = (px - this.centerX) / this.camZoom - this.panX;
    const wy = (py - this.centerY) / this.camZoom - this.panY;

    // Sort front-to-back for correct hit order
    const sorted = [...this.buddies]
      .filter(b => b.state !== 'escaping')
      .sort((a, b2) => b2.depth - a.depth); // front first

    for (const buddy of sorted) {
      if (isPointInBlock(wx, wy, buddy.sx, buddy.sy)) {
        audio.playTap();
        this.attemptEscape(buddy);
        return;
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Rotation (orbit simulation)
  // ═══════════════════════════════════════════════════════════════════════
  private rotateView(dir: number) {
    this.rotState = (((this.rotState + dir) % 4) + 4) % 4;

    // Animate: quick zoom out, reposition, zoom in
    this.tweens.add({
      targets: this,
      camZoom: 0.6,
      duration: 200,
      ease: 'Quad.easeIn',
      onComplete: () => {
        // Recalculate all block positions with new rotation
        this.buddies.forEach(b => {
          const sc = gridToScreen(b.x, b.y, b.z, this.rotState);
          b.sx = sc.x; b.sy = sc.y;
          b.tsx = sc.x; b.tsy = sc.y;
          b.depth = getDrawDepth(b.x, b.y, b.z, this.rotState);
        });
        this.recalcCenter();
        this.tweens.add({ targets: this, camZoom: this.zoomTarget, duration: 350, ease: 'Back.Out' });
      }
    });

    // Camera flash tint
    this.cameras.main.flash(150, 50, 0, 100, false);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Game Logic
  // ═══════════════════════════════════════════════════════════════════════
  private attemptEscape(buddy: BuddyBlock) {
    if (buddy.state === 'locked') {
      audio.playBump();
      this.showMsg('🔒 This chest is locked! Find the Key first!');
      buddy.state = 'bump';
      buddy.animT = 0;
      buddy.bumpDx = 5; buddy.bumpDy = 0;
      return;
    }
    if (buddy.state !== 'idle') return;
    if (this.movesLeft <= 0) { this.showMsg('😅 No moves left! Tap 🔄 to restart!'); return; }

    // Bomb: explode!
    if (buddy.type === 'bomb') {
      this.useMove();
      this.explodeBomb(buddy);
      return;
    }

    // Find escape dir
    let escDir = { ...buddy.dir };

    if (buddy.type === 'rainbow') {
      const freeDir = this.findFreeDirection(buddy);
      if (!freeDir) { audio.playBump(); this.startBump(buddy); return; }
      escDir = freeDir;
    } else {
      if (this.isBlocked(buddy, escDir)) { audio.playBump(); this.startBump(buddy); return; }
    }

    // Launch!
    this.useMove();
    this.startEscape(buddy, escDir);

    // Key unlocks chest
    if (buddy.type === 'key' && buddy.targetChestId) {
      const chest = this.buddies.find(b => b.id === buddy.targetChestId);
      if (chest) {
        this.time.delayedCall(200, () => {
          chest.state = 'idle';
          audio.playCapsuleOpen();
          this.spawnUnlockParticles(chest.sx, chest.sy);
        });
      }
    }

    // Combo
    const now = this.time.now;
    if (now - this.lastEscapeTime < 1800) {
      this.comboCount++;
      this.showCombo();
      this.coins += 1;
      GameData.coins.add(1);
    } else {
      this.comboCount = 1;
    }
    this.lastEscapeTime = now;
  }

  private isBlocked(buddy: BuddyBlock, dir: BlockConfig['dir']): boolean {
    for (const other of this.buddies) {
      if (other.id === buddy.id || other.state === 'escaping') continue;
      const diff = { x: other.x - buddy.x, y: other.y - buddy.y, z: other.z - buddy.z };
      const dot = diff.x * dir.x + diff.y * dir.y + diff.z * dir.z;
      if (dot > 0.05) {
        const proj = { x: dir.x * dot, y: dir.y * dot, z: dir.z * dot };
        const rem  = { x: diff.x - proj.x, y: diff.y - proj.y, z: diff.z - proj.z };
        if (Math.abs(rem.x) < 0.1 && Math.abs(rem.y) < 0.1 && Math.abs(rem.z) < 0.1) return true;
      }
    }
    return false;
  }

  private findFreeDirection(buddy: BuddyBlock): BlockConfig['dir'] | null {
    const dirs = [
      { x: 1, y: 0, z: 0 }, { x: -1, y: 0, z: 0 },
      { x: 0, y: 1, z: 0 }, { x: 0, y: -1, z: 0 },
      { x: 0, y: 0, z: 1 }, { x: 0, y: 0, z: -1 }
    ].sort(() => Math.random() - 0.5);
    return dirs.find(d => !this.isBlocked(buddy, d)) ?? null;
  }

  private startEscape(buddy: BuddyBlock, dir: BlockConfig['dir']) {
    buddy.state = 'escaping';
    buddy.animT = 0;
    // Project escape direction to screen space
    const from = gridToScreen(buddy.x, buddy.y, buddy.z, this.rotState);
    const to   = gridToScreen(buddy.x + dir.x * 8, buddy.y + dir.y * 8, buddy.z + dir.z * 8, this.rotState);
    const len  = Math.hypot(to.x - from.x, to.y - from.y) || 1;
    buddy.escapeVx = ((to.x - from.x) / len) * 16;
    buddy.escapeVy = ((to.y - from.y) / len) * 16;

    this.spawnTrailParticles(buddy);
    audio.playLaunch();
  }

  private startBump(buddy: BuddyBlock) {
    buddy.state = 'bump';
    buddy.animT = 0;
    const sc = gridToScreen(buddy.x + buddy.dir.x, buddy.y + buddy.dir.y, buddy.z + buddy.dir.z, this.rotState);
    const base = gridToScreen(buddy.x, buddy.y, buddy.z, this.rotState);
    buddy.bumpDx = (sc.x - base.x) * 0.25;
    buddy.bumpDy = (sc.y - base.y) * 0.25;
  }

  private useMove() {
    this.movesLeft--;
    this.updateHUD();
    if (this.movesLeft <= 0) {
      this.time.delayedCall(1500, () => {
        if (this.buddies.some(b => b.state !== 'escaping')) {
          this.showMsg('😅 Out of moves! Tap 🔄 to restart!');
        }
      });
    }
  }

  private explodeBomb(bomb: BuddyBlock) {
    this.cameras.main.shake(350, 0.022);
    this.cameras.main.flash(120, 255, 60, 0, false);
    audio.playExplosion();
    this.spawnBoomParticles(bomb.sx, bomb.sy);
    this.startEscape(bomb, bomb.dir);

    // Adjacent blocks
    this.buddies
      .filter(b => b.id !== bomb.id && b.state === 'idle')
      .filter(b => Math.hypot(b.x - bomb.x, b.y - bomb.y, b.z - bomb.z) <= 1.5)
      .forEach((b, i) => {
        this.time.delayedCall(80 + i * 70, () => {
          if (b.state === 'idle' || b.state === 'locked') {
            b.state = 'idle';
            const freeDir = this.findFreeDirection(b) ?? b.dir;
            this.startEscape(b, freeDir);
            if (b.type === 'key' && b.targetChestId) {
              const chest = this.buddies.find(c => c.id === b.targetChestId);
              if (chest) { chest.state = 'idle'; this.spawnUnlockParticles(chest.sx, chest.sy); }
            }
          }
        });
      });
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Update Loop
  // ═══════════════════════════════════════════════════════════════════════
  update(_time: number, delta: number) {
    const dt = Math.min(delta / 1000, 0.1);

    // Smooth pan & zoom
    this.panX = Phaser.Math.Linear(this.panX, this.panTargetX, 0.12);
    this.panY = Phaser.Math.Linear(this.panY, this.panTargetY, 0.12);
    this.camZoom = Phaser.Math.Linear(this.camZoom, this.zoomTarget, 0.1);

    // Update buddy animations
    const escaped: BuddyBlock[] = [];
    for (const b of this.buddies) {
      b.animT += dt;

      if (b.type === 'rainbow') b.rainbowHue = (b.rainbowHue + dt * 0.4) % 1;

      if (b.state === 'escaping') {
        b.sx += b.escapeVx * dt * 60;
        b.sy += b.escapeVy * dt * 60;
        const base = gridToScreen(b.x, b.y, b.z, this.rotState);
        if (Math.hypot(b.sx - base.x, b.sy - base.y) > 1200) {
          escaped.push(b);
        }
      } else if (b.state === 'bump') {
        const dur = 0.32;
        const t = Math.sin((b.animT / dur) * Math.PI);
        const base = gridToScreen(b.x, b.y, b.z, this.rotState);
        b.sx = base.x + b.bumpDx * t;
        b.sy = base.y + b.bumpDy * t;
        if (b.animT >= dur) {
          b.state = 'idle';
          b.sx = base.x; b.sy = base.y;
        }
      } else if (b.state === 'idle') {
        // Blink logic
        b.blinkTimer -= dt;
        if (b.blinkTimer <= 0) {
          b.isBlinking = true;
          b.blinkTimer = 2 + Math.random() * 4;
          this.time.delayedCall(120, () => { b.isBlinking = false; });
        }
      }
    }

    // Remove escaped blocks & check victory
    if (escaped.length > 0) {
      this.buddies = this.buddies.filter(b => !escaped.includes(b));
      this.checkVictory();
    }

    // Sort by depth
    this.buddies.sort((a, b) => a.depth - b.depth);

    // Render
    this.draw();
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Rendering
  // ═══════════════════════════════════════════════════════════════════════
  private draw() {
    const g = this.blockGfx;
    g.clear();

    // Apply camera transform manually for block graphics
    g.setPosition(this.centerX + this.panX, this.centerY + this.panY);
    g.setScale(this.camZoom);

    for (const b of this.buddies) {
      this.drawBlock(g, b);
    }
  }

  private drawBlock(g: Phaser.GameObjects.Graphics, b: BuddyBlock) {
    const cx = b.sx, cy = b.sy;

    // Rainbow color override
    let top = b.palTop, left = b.palLeft, right = b.palRight, glow = b.palGlow;
    if (b.type === 'rainbow') {
      top   = hslToInt(b.rainbowHue * 360, 95, 68);
      left  = hslToInt(b.rainbowHue * 360, 85, 48);
      right = hslToInt(b.rainbowHue * 360, 80, 32);
      glow  = hslToInt(b.rainbowHue * 360, 100, 82);
    }

    // Locked chest: pulsing amber outline
    const isLocked = (b.state === 'locked');
    const glowAlpha = isLocked ? 0.3 + Math.sin(this.time.now * 0.004) * 0.2 : 0.55;

    drawIsoCube(g, cx, cy, top, left, right, glow, glowAlpha);

    // Type-specific overlays
    const tw = TILE_W, th = TILE_H;

    if (b.type === 'bomb') {
      // Warning stripes on top face
      g.fillStyle(0xff3c00, 0.3);
      g.fillRect(cx - tw * 0.4, cy + 2, tw * 0.8, 5);
      g.fillRect(cx - tw * 0.4, cy + 10, tw * 0.8, 5);
      // Fuse spark
      const sparkBright = 0.6 + Math.sin(this.time.now * 0.02) * 0.4;
      g.fillStyle(0xffee00, sparkBright);
      g.fillCircle(cx + 2, cy - th - 4, 4);
    }

    if (b.type === 'key') {
      // Key cutout on top face
      g.fillStyle(0xffeebb, 0.8);
      g.fillCircle(cx, cy, 6);
      g.fillRect(cx, cy - 2, 12, 4);
      g.fillRect(cx + 8, cy - 6, 4, 4);
    }

    if (b.type === 'chest') {
      // Gold band
      g.fillStyle(0xffcc00, 0.6);
      g.fillRect(cx - tw + 2, cy - 4, tw * 2 - 4, 8);
      // Lock symbol
      g.fillStyle(0xffcc00, isLocked ? 0.9 : 0.4);
      g.fillCircle(cx, cy + th * 0.5, 5);
      g.fillRect(cx - 3, cy + th * 0.5 - 8, 6, 8);
    }

    // ─── FACE: Eyes ───────────────────────────────────────────────────
    if (b.type !== 'chest' || !isLocked) {
      // Draw eyes on TOP face (projected positions)
      const eyeY = cy - 4;
      const eyeScaleY = b.isBlinking ? 0.15 : 1;

      // Left eye
      g.fillStyle(0x111111, 1);
      g.fillEllipse(cx - 10, eyeY, 8, 7 * eyeScaleY);
      // Right eye
      g.fillEllipse(cx + 10, eyeY, 8, 7 * eyeScaleY);

      if (!b.isBlinking) {
        // Pupil highlights
        g.fillStyle(0xffffff, 0.8);
        g.fillCircle(cx - 8, eyeY - 1, 2);
        g.fillCircle(cx + 12, eyeY - 1, 2);

        // Blush cheeks
        g.fillStyle(0xff79a8, 0.4);
        g.fillEllipse(cx - 16, eyeY + 4, 10, 5);
        g.fillEllipse(cx + 16, eyeY + 4, 10, 5);
      }

      // Smile / squish face on bump
      if (b.state === 'bump') {
        // X eyes during bump
        g.fillStyle(0x111111, 1);
        g.fillRect(cx - 13, eyeY - 1, 7, 2);
        g.fillRect(cx - 10, eyeY - 4, 2, 7);
        g.fillRect(cx + 7, eyeY - 1, 7, 2);
        g.fillRect(cx + 10, eyeY - 4, 2, 7);
      } else {
        // Tiny smile arc on top face
        g.lineStyle(2, 0x333333, 0.8);
        g.beginPath();
        g.arc(cx, eyeY + 10, 6, 0, Math.PI, false);
        g.strokePath();
      }
    }

    // ─── HATS: Render equipped skin 3D hat on top of buddy ──────────────
    if (b.type !== 'chest') {
      drawHat(g, cx, cy, tw, th, this.activeSkin, this.time.now);
    }

    // ─── Arrow Direction Indicator ─────────────────────────────────────
    if (b.type !== 'chest') {
      this.drawArrowIndicator(g, b, cx, cy);
    }
  }

  private drawArrowIndicator(g: Phaser.GameObjects.Graphics, b: BuddyBlock, cx: number, cy: number) {
    // Project escape direction to screen and draw arrow above block
    const from = gridToScreen(b.x, b.y, b.z, this.rotState);
    const to   = gridToScreen(b.x + b.dir.x, b.y + b.dir.y, b.z + b.dir.z, this.rotState);
    const dx = to.x - from.x, dy = to.y - from.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = dx / len, ny = dy / len;

    // Float offset: arrow hovers above block
    const floatOff = Math.sin(this.time.now * 0.003 + b.x + b.z) * 4;
    const ax = cx + nx * 22;
    const ay = cy - TILE_H - 18 + floatOff;

    // Arrow shaft
    const col = b.type === 'rainbow' ? hslToInt(b.rainbowHue * 360, 100, 80) : b.palGlow;

    // Glow passes
    for (let pass = 0; pass < 3; pass++) {
      g.lineStyle([5, 3, 1.5][pass], col, [0.12, 0.3, 0.7][pass]);
      g.beginPath();
      g.moveTo(ax - nx * 10, ay - ny * 10);
      g.lineTo(ax + nx * 10, ay + ny * 10);
      g.strokePath();
    }

    // Arrowhead
    const headAngle = Math.atan2(ny, nx);
    const h1x = ax + nx * 12 + Math.cos(headAngle + Math.PI * 0.75) * 7;
    const h1y = ay + ny * 12 + Math.sin(headAngle + Math.PI * 0.75) * 7;
    const h2x = ax + nx * 12 + Math.cos(headAngle - Math.PI * 0.75) * 7;
    const h2y = ay + ny * 12 + Math.sin(headAngle - Math.PI * 0.75) * 7;

    g.fillStyle(col, 0.9);
    g.fillTriangle(
      ax + nx * 14, ay + ny * 14,
      h1x, h1y,
      h2x, h2y
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Particles
  // ═══════════════════════════════════════════════════════════════════════
  private setupParticles() {
    // Trail emitter
    this.trailEmitter = this.add.particles(0, 0, 'block_particle', {
      speed: { min: 40, max: 120 },
      scale: { start: 0.8, end: 0 },
      alpha: { start: 0.9, end: 0 },
      lifespan: { min: 200, max: 500 },
      blendMode: 'ADD',
      emitting: false
    }).setDepth(8);

    // Explosion emitter
    this.boomEmitter = this.add.particles(0, 0, 'block_particle', {
      speed: { min: 80, max: 280 },
      scale: { start: 1.2, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: { min: 300, max: 700 },
      angle: { min: 0, max: 360 },
      blendMode: 'ADD',
      emitting: false
    }).setDepth(9);

    // Confetti emitter
    this.confettiEmitter = this.add.particles(0, 0, 'star_particle', {
      speed: { min: 50, max: 200 },
      scale: { start: 1, end: 0 },
      lifespan: { min: 600, max: 1500 },
      angle: { min: 220, max: 320 },
      gravityY: 200,
      emitting: false
    }).setDepth(10);
  }

  private getScreenPos(b: BuddyBlock): { x: number; y: number } {
    return {
      x: this.centerX + (b.sx + this.panX) * this.camZoom,
      y: this.centerY + (b.sy + this.panY) * this.camZoom
    };
  }

  private spawnTrailParticles(b: BuddyBlock) {
    const { x, y } = this.getScreenPos(b);
    const col = b.type === 'rainbow' ? hslToInt(b.rainbowHue * 360, 100, 80) : b.palGlow;
    this.trailEmitter.setParticleTint(col);
    this.trailEmitter.explode(18, x, y);
  }

  private spawnBoomParticles(bsx: number, bsy: number) {
    const x = this.centerX + (bsx + this.panX) * this.camZoom;
    const y = this.centerY + (bsy + this.panY) * this.camZoom;
    this.boomEmitter.setParticleTint([0xff4400, 0xff9900, 0xffee00]);
    this.boomEmitter.explode(40, x, y);
  }

  private spawnUnlockParticles(bsx: number, bsy: number) {
    const x = this.centerX + (bsx + this.panX) * this.camZoom;
    const y = this.centerY + (bsy + this.panY) * this.camZoom;
    this.trailEmitter.setParticleTint([0xffcc00, 0xffffff]);
    this.trailEmitter.explode(22, x, y);
  }

  private spawnVictoryConfetti() {
    const W = this.scale.width;
    const colors = [0xff6eb4, 0xffe45e, 0x6bcb77, 0x74c0fc, 0xff9f43, 0x9b72ff];
    for (let i = 0; i < 5; i++) {
      this.time.delayedCall(i * 100, () => {
        this.confettiEmitter.setParticleTint(colors);
        this.confettiEmitter.explode(20, Math.random() * W, -10);
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Victory
  // ═══════════════════════════════════════════════════════════════════════
  private checkVictory() {
    const remaining = this.buddies.filter(b => b.state !== 'escaping');
    if (remaining.length > 0) return;

    audio.stopBGM();
    audio.playVictory();
    this.spawnVictoryConfetti();

    this.cameras.main.flash(800, 255, 255, 255, false);
    this.cameras.main.zoomTo(1.2, 700, 'Quad.easeOut');

    const stars = this.calcStars();
    const reward = 15 + this.movesLeft * 2;
    GameData.setStarsFor(this.worldIndex, this.levelIndex, stars);
    GameData.coins.add(reward);
    localStorage.setItem(`arrow_buddies_w${this.worldIndex}_level`,
      Math.min(this.levelIndex + 1, 5).toString());

    this.time.delayedCall(900, () => {
      this.cameras.main.fadeOut(400, 10, 0, 26);
      this.time.delayedCall(420, () => {
        this.scene.start('Victory', {
          world: this.worldIndex, level: this.levelIndex,
          stars, reward, movesLeft: this.movesLeft
        });
      });
    });
  }

  private calcStars(): number {
    const ratio = this.movesLeft / this.movesTotal;
    return ratio >= 0.4 ? 3 : ratio >= 0.15 ? 2 : 1;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // HUD
  // ═══════════════════════════════════════════════════════════════════════
  private setupHUD(W: number, H: number) {
    // HUD background bar
    this.hudBar = this.add.graphics().setDepth(20);
    this.drawHUDBar(W);

    const fs = Math.min(W * 0.042, 22);

    this.hudLevel = this.add.text(W / 2, 22, '', {
      fontFamily: 'Fredoka', fontSize: fs + 'px', color: '#ffffff',
      shadow: { offsetX: 0, offsetY: 2, color: '#6600ff', blur: 10, fill: true }
    }).setOrigin(0.5).setDepth(21);

    this.hudCoins = this.add.text(20, 22, '🪙 0', {
      fontFamily: 'Fredoka', fontSize: fs + 'px', color: '#ffe45e'
    }).setOrigin(0, 0.5).setDepth(21);

    this.hudMoves = this.add.text(W - 20, 22, '⚡ 0', {
      fontFamily: 'Fredoka', fontSize: fs + 'px', color: '#74c0fc'
    }).setOrigin(1, 0.5).setDepth(21);

    // Combo label
    this.comboLabel = this.add.text(W / 2, H * 0.15, '', {
      fontFamily: 'Fredoka', fontSize: '38px',
      color: '#ffe45e', stroke: '#ffffff', strokeThickness: 3,
      shadow: { offsetX: 0, offsetY: 5, color: '#ff8800', blur: 20, fill: true }
    }).setOrigin(0.5).setDepth(21).setAlpha(0);

    // Tutorial/message label
    this.tutLabel = this.add.text(W / 2, H - 40, '', {
      fontFamily: 'Fredoka', fontSize: '16px', color: '#ccbbff',
      backgroundColor: '#22004488', padding: { x: 12, y: 6 }
    }).setOrigin(0.5).setDepth(21).setAlpha(0);

    // Buttons: Home, Reset, Rotate
    const btnStyle = { fontFamily: 'Fredoka', fontSize: '22px', color: '#ffffff' };
    const home  = this.add.text(W - 60, H - 50, '🏠', btnStyle).setDepth(21).setInteractive({ useHandCursor: true });
    const reset = this.add.text(W - 110, H - 50, '🔄', btnStyle).setDepth(21).setInteractive({ useHandCursor: true });
    const rotL  = this.add.text(15,  H / 2, '◀', { ...btnStyle, color: '#9b72ff' }).setDepth(21).setInteractive({ useHandCursor: true });
    const rotR  = this.add.text(W - 15, H / 2, '▶', { ...btnStyle, color: '#9b72ff' }).setOrigin(1, 0.5).setDepth(21).setInteractive({ useHandCursor: true });

    home.on('pointerdown',  () => { audio.playTap(); this.goToWorldSelect(); });
    reset.on('pointerdown', () => { audio.playTap(); this.resetLevel(); });
    rotL.on('pointerdown',  () => { audio.playTap(); this.rotateView(-1); });
    rotR.on('pointerdown',  () => { audio.playTap(); this.rotateView(1); });
  }

  private drawHUDBar(W: number) {
    this.hudBar.clear();
    this.hudBar.fillStyle(0x0a001a, 0.85);
    this.hudBar.fillRect(0, 0, W, 50);
    this.hudBar.lineStyle(1, 0x9b72ff, 0.3);
    this.hudBar.lineBetween(0, 50, W, 50);
  }

  private updateHUD() {
    this.hudLevel.setText(`${this.levelData.worldName} — Lvl ${this.levelIndex}`);
    this.hudCoins.setText(`🪙 ${GameData.coins.get()}`);
    this.hudMoves.setText(`⚡ ${this.movesLeft}`);

    // Red tint moves when low
    this.hudMoves.setColor(this.movesLeft <= 3 ? '#ff6b6b' : '#74c0fc');
  }

  private showCombo() {
    const msgs = ['', '🔥 COMBO x2!', '⚡ COMBO x3!', '💥 x4 INSANE!', '🌈 MEGA COMBO!'];
    const msg = msgs[Math.min(this.comboCount - 1, msgs.length - 1)];
    this.comboLabel.setText(msg).setAlpha(1).setScale(0.5);
    this.tweens.add({
      targets: this.comboLabel,
      scaleX: 1.1, scaleY: 1.1, duration: 250, ease: 'Back.Out',
      onComplete: () => {
        this.tweens.add({ targets: this.comboLabel, alpha: 0, duration: 800, delay: 600 });
      }
    });

    // Bounce screen for big combos
    if (this.comboCount >= 3) this.cameras.main.shake(180, 0.008);
  }

  private showMsg(msg: string) {
    this.tutLabel.setText(msg).setAlpha(1);
    this.tweens.killTweensOf(this.tutLabel);
    this.tweens.add({ targets: this.tutLabel, alpha: 0, delay: 3500, duration: 600 });
  }

  private showTutorial(w: number, l: number) {
    const tips: Record<string, string> = {
      '1-1': '👆 Tap a buddy! They\'ll fly in their arrow direction!',
      '1-2': '🔄 Drag to pan • Arrow keys or swipe wide to rotate!',
      '2-1': '💣 Bomb Buddy! Tap it to clear nearby blocks!',
      '2-3': '🔑 Find the Key — it unlocks the Chest buddy!',
      '3-1': '🌈 Rainbow Buddy escapes in ANY free direction!'
    };
    const key = `${w}-${l}`;
    if (tips[key]) {
      this.time.delayedCall(800, () => this.showMsg(tips[key]));
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Navigation helpers
  // ═══════════════════════════════════════════════════════════════════════
  private goToWorldSelect() {
    audio.stopBGM();
    this.cameras.main.fadeOut(300, 10, 0, 26);
    this.time.delayedCall(320, () => this.scene.start('WorldSelect'));
  }

  private resetLevel() {
    this.cameras.main.flash(200, 200, 200, 255, false);
    this.time.delayedCall(200, () => {
      audio.stopBGM();
      this.scene.restart({ world: this.worldIndex, level: this.levelIndex });
    });
  }

  private drawBackground(W: number, H: number) {
    const g = this.bgGfx;
    g.clear();
    // Grid dots
    g.fillStyle(0x1a004f, 1);
    g.fillRect(0, 0, W, H);
    g.fillStyle(0xffffff, 0.04);
    const grid = 40;
    for (let x = 0; x < W; x += grid) for (let y = 0; y < H; y += grid)
      g.fillCircle(x, y, 1.2);
    // Center glow
    g.fillStyle(hslToInt(225, 60, 12), 0.7);
    g.fillCircle(W / 2, H / 2, Math.min(W, H) * 0.65);
  }
}
