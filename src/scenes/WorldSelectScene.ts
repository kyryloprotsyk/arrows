/* WorldSelectScene.ts — World selection with parallax, lock animations */
import Phaser from 'phaser';
import { GameData } from '../utils/GameData';
import { audio } from '../audio';
import { hslToInt, createCartoonButton, blendColor } from '../utils/IsoHelper';
import { gsap } from 'gsap';

const WORLDS = [
  { id: 1, name: 'Jelly Hills',    emoji: '🌸', hue: 330, desc: 'Sweet & simple puzzles',  starsNeeded: 0 },
  { id: 2, name: 'Dino Valley',    emoji: '🦕', hue: 140, desc: 'Bombs, keys & chests!',   starsNeeded: 5 },
  { id: 3, name: 'Cosmo Station',  emoji: '🚀', hue: 225, desc: 'Rainbow magic & chaos!',  starsNeeded: 10 },
  { id: 4, name: 'Coral Reef',     emoji: '🐠', hue: 175, desc: 'Rotator waves & corals!', starsNeeded: 15 },
  { id: 5, name: 'Ice Castle',     emoji: '❄️', hue: 195, desc: 'Chilled locks & spires!',  starsNeeded: 22 },
  { id: 6, name: 'Volcanic Land',  emoji: '🌋', hue: 10,  desc: 'Magma cores & high danger!',starsNeeded: 30 }
];

export class WorldSelectScene extends Phaser.Scene {
  constructor() { super({ key: 'WorldSelect' }); }

  create() {
    const W = this.scale.width, H = this.scale.height;
    const totalStars = GameData.totalStars();

    // Peach background to keep visual continuity
    this.cameras.main.setBackgroundColor('#fff5ea');
    this.cameras.main.fadeIn(400, 255, 245, 234);

    const bg = this.add.graphics();
    bg.fillStyle(0xfff5ea, 1);
    bg.fillRect(0, 0, W, H);

    // Warm radial spots in bg
    bg.fillStyle(0xffebd6, 0.6);
    bg.fillCircle(W / 2, H * 0.35, W * 0.85);

    // Bubble floats
    bg.fillStyle(0xffffff, 0.45);
    for (let i = 0; i < 15; i++) {
      bg.fillCircle(Math.random() * W, Math.random() * H, Math.random() * 25 + 10);
    }

    // Title (Fredoka, drop shadow, kid cartoon style)
    const titleTxt = this.add.text(W / 2, H * 0.08, '🌍  Choose a World', {
      fontFamily: 'Fredoka, sans-serif', fontSize: Math.min(W * 0.08, 34) + 'px',
      color: '#ff9f1c', fontStyle: 'bold',
      stroke: '#ffffff', strokeThickness: 5,
      shadow: { offsetX: 0, offsetY: 4, color: '#5c3d2e', blur: 0, fill: true }
    }).setOrigin(0.5).setAlpha(0);

    gsap.to(titleTxt, {
      alpha: 1,
      y: H * 0.08,
      duration: 0.5,
      ease: 'back.out(1.5)',
      delay: 0.1
    });

    // Stars total badge (Fredoka font)
    const starsTxt = this.add.text(W / 2, H * 0.145, `Total Stars: ${totalStars} ⭐`, {
      fontFamily: 'Fredoka, sans-serif', fontSize: '18px', color: '#e67e22', fontStyle: 'bold'
    }).setOrigin(0.5).setAlpha(0);

    gsap.to(starsTxt, {
      alpha: 1,
      duration: 0.4,
      delay: 0.25
    });

    // Grid layout calculations
    const columns = W > 580 ? 2 : 1;
    const cardW = columns === 2 ? Math.min(W * 0.44, 380) : Math.min(W * 0.82, 420);
    const cardH = columns === 2 ? Math.min(H * 0.20, 115) : Math.min(H * 0.10, 78);
    const startY = H * 0.22;
    const gapX = cardW + 16;
    const gapY = cardH + 14;

    WORLDS.forEach((world, i) => {
      let cx = W / 2;
      let cy = startY + i * gapY;
      if (columns === 2) {
        const col = i % 2;
        const row = Math.floor(i / 2);
        cx = W / 2 + (col - 0.5) * gapX;
        cy = startY + row * gapY;
      }
      const unlocked = totalStars >= world.starsNeeded;
      this.createWorldCard(cx, cy, cardW, cardH, world, unlocked, i * 80);
    });

    // Back button (Pink Bubbly Cartoon button)
    createCartoonButton(this, 75, 42, 100, 42, '◀ Back', () => {
      audio.playTap();
      this.cameras.main.fadeOut(300, 255, 245, 234);
      this.time.delayedCall(320, () => this.scene.start('Menu'));
    }, { bgColor: 0xe91e63, fontSize: 16 });
  }

  private createWorldCard(
    x: number, y: number, w: number, h: number,
    world: typeof WORLDS[0], unlocked: boolean, delay: number
  ) {
    const col  = hslToInt(world.hue, 85, 75); // bright cartoon cards
    const dark = hslToInt(world.hue, 80, 52); // accent/border lines
    const glow = hslToInt(world.hue, 100, 85);

    const container = this.add.container(x, y + 10).setAlpha(0).setDepth(1);

    const g = this.add.graphics();
    const draw = (hover: boolean) => {
      g.clear();
      
      // Drop Shadow
      g.fillStyle(0x000000, 0.03);
      g.fillRoundedRect(-w / 2, -h / 2 + 5, w, h, 18);

      // Card bg
      const bgCol = unlocked ? (hover ? blendColor(col, 0xffffff, 0.15) : col) : 0xffffff;
      g.fillStyle(bgCol, 1);
      g.fillRoundedRect(-w / 2, -h / 2, w, h, 18);

      // Borders
      g.lineStyle(isSelected = hover ? 3.5 : 2, unlocked ? dark : 0xffd8b3, 1.0);
      g.strokeRoundedRect(-w / 2, -h / 2, w, h, 18);

      if (!unlocked) {
        // Semitransparent lock layer
        g.fillStyle(0xffffff, 0.45);
        g.fillRoundedRect(-w / 2, -h / 2, w, h, 18);
      }
    };
    draw(false);

    const isSmall = h < 90;
    const emojiSize = isSmall ? '28px' : '40px';
    const titleSize = isSmall ? '18px' : '22px';
    const descSize = isSmall ? '12px' : '14px';

    const emojiX = -w / 2 + (isSmall ? 28 : 42);
    const textX = -w / 2 + (isSmall ? 60 : 92);
    const textYOffset = isSmall ? 8 : 14;

    // Emoji icon
    const emoji = this.add.text(emojiX, 0, world.emoji, { fontSize: emojiSize })
      .setOrigin(0.5);

    // World name (Fredoka font)
    const nameText = this.add.text(textX, -textYOffset, world.name, {
      fontFamily: 'Fredoka, sans-serif', fontSize: titleSize,
      color: unlocked ? '#ffffff' : '#bdc3c7',
      fontStyle: 'bold',
      stroke: unlocked ? '#000000' : undefined,
      strokeThickness: unlocked ? 1.5 : undefined
    }).setOrigin(0, 0.5);

    // Description / lock notice (Fredoka font)
    const descText = this.add.text(textX, textYOffset, unlocked ? world.desc : `🔒 Need ${world.starsNeeded} Stars`, {
      fontFamily: 'Fredoka, sans-serif', fontSize: descSize,
      color: unlocked ? blendColor(col, 0x000000, 0.45) : '#bdc3c7',
      fontStyle: 'bold'
    }).setOrigin(0, 0.5);

    // Level stars row
    const starTexts: Phaser.GameObjects.Text[] = [];
    if (unlocked && !isSmall) {
      for (let l = 1; l <= 5; l++) {
        const stars = GameData.starsFor(world.id, l);
        const sx = -w / 2 + 92 + (l - 1) * 22;
        const sy = h / 2 - 14;
        const starChar = stars >= 3 ? '⭐' : stars >= 2 ? '🌟' : stars >= 1 ? '✨' : '○';
        const st = this.add.text(sx, sy, starChar, { fontSize: '11px' }).setOrigin(0.5);
        starTexts.push(st);
      }
    }

    container.add([g, emoji, nameText, descText, ...starTexts]);

    if (unlocked) {
      container.setInteractive({
        hitArea: new Phaser.Geom.Rectangle(-w / 2, -h / 2, w, h),
        hitAreaCallback: Phaser.Geom.Rectangle.Contains,
        useHandCursor: true
      });
      
      container.on('pointerover', () => {
        draw(true);
        gsap.to(container, { scale: 1.04, duration: 0.15, overwrite: 'auto' });
      });
      container.on('pointerout',  () => {
        draw(false);
        gsap.to(container, { scale: 1.0, duration: 0.15, overwrite: 'auto' });
      });
      container.on('pointerdown', () => {
        audio.playTap();
        gsap.to(container, { scale: 0.96, duration: 0.05, yoyo: true, repeat: 1 });
        this.cameras.main.fadeOut(300, 255, 245, 234);
        this.time.delayedCall(320, () => {
          GameData.world.set(world.id);
          this.scene.start('LevelSelect', { world: world.id });
        });
      });
    }

    // GSAP entrance cascade
    gsap.to(container, {
      alpha: 1,
      y: y,
      duration: 0.5,
      ease: 'back.out(1.5)',
      delay: delay / 1000
    });

    // Gentle GSAP idle float
    if (unlocked) {
      this.time.delayedCall(500 + delay, () => {
        gsap.to(container, {
          y: y - 4,
          duration: 1.8,
          yoyo: true,
          repeat: -1,
          ease: 'sine.inOut'
        });
      });
    }
  }
}
let isSelected = false;
