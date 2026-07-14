/* WorldSelectScene.ts — World selection with parallax, lock animations */
import Phaser from 'phaser';
import { GameData } from '../utils/GameData';
import { audio } from '../audio';
import { hslToInt, createCartoonButton } from '../utils/IsoHelper';

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

    // Dark bg
    this.cameras.main.setBackgroundColor('#0a001a');
    this.cameras.main.fadeIn(400, 10, 0, 26);

    // Animated starfield bg
    this.addStarfield(W, H);

    // Title
    this.add.text(W / 2, H * 0.08, '🌍  Choose a World', {
      fontFamily: 'Orbitron', fontSize: Math.min(W * 0.08, 38) + 'px',
      color: '#ffffff',
      shadow: { offsetX: 0, offsetY: 4, color: '#6600ff', blur: 18, fill: true }
    }).setOrigin(0.5);

    // Stars total badge
    this.add.text(W / 2, H * 0.15, `Total Stars: ${totalStars} ⭐`, {
      fontFamily: 'Orbitron', fontSize: '18px', color: '#ffe45e'
    }).setOrigin(0.5);

    // Grid details
    const columns = W > 580 ? 2 : 1;
    const cardW = columns === 2 ? Math.min(W * 0.44, 380) : Math.min(W * 0.82, 420);
    const cardH = columns === 2 ? Math.min(H * 0.20, 115) : Math.min(H * 0.10, 76);
    const startY = H * 0.23;
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
      this.createWorldCard(cx, cy, cardW, cardH, world, unlocked, i * 90);
    });

    // Back button
    createCartoonButton(this, 75, 38, 100, 42, '◀ Back', () => {
      audio.playTap();
      this.cameras.main.fadeOut(300, 10, 0, 26);
      this.time.delayedCall(320, () => this.scene.start('Menu'));
    }, { bgColor: 0x9b72ff, fontSize: 16 });
  }

  private createWorldCard(
    x: number, y: number, w: number, h: number,
    world: typeof WORLDS[0], unlocked: boolean, delay: number
  ) {
    const col  = hslToInt(world.hue, 80, 55);
    const dark = hslToInt(world.hue, 70, 28);
    const glow = hslToInt(world.hue, 100, 75);

    // Create container offset by 6 vertically for the entrance animation
    const container = this.add.container(x, y + 6).setAlpha(0).setDepth(1);

    const g = this.add.graphics();
    const draw = (hover: boolean) => {
      g.clear();
      // Card shadow
      g.fillStyle(dark, 0.4);
      g.fillRoundedRect(-w / 2 + 4, -h / 2 + 6, w, h, 16);
      // Card bg
      g.fillStyle(unlocked ? (hover ? col : hslToInt(world.hue, 70, 32)) : 0x221133, 1);
      g.fillRoundedRect(-w / 2, -h / 2, w, h, 16);
      // Glow border
      for (let pass = 0; pass < 3; pass++) {
        g.lineStyle([5, 3, 1.5][pass], unlocked ? glow : 0x443355, [0.1, 0.3, unlocked ? 0.7 : 0.3][pass]);
        g.strokeRoundedRect(-w / 2, -h / 2, w, h, 16);
      }
      // Lock icon bg
      if (!unlocked) {
        g.fillStyle(0x000000, 0.3);
        g.fillRoundedRect(-w / 2, -h / 2, w, h, 16);
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

    // World name
    const nameText = this.add.text(textX, -textYOffset, world.name, {
      fontFamily: 'Orbitron', fontSize: titleSize,
      color: unlocked ? '#ffffff' : '#664477',
      shadow: unlocked ? { offsetX: 0, offsetY: 2, color: '#000', blur: 6, fill: true } : undefined
    }).setOrigin(0, 0.5);

    // Description / lock notice
    const descText = this.add.text(textX, textYOffset, unlocked ? world.desc : `🔒 Need ${world.starsNeeded} Stars`, {
      fontFamily: 'Orbitron', fontSize: descSize,
      color: unlocked ? '#ccbbee' : '#664477'
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
      container.setSize(w, h).setInteractive({
        hitArea: new Phaser.Geom.Rectangle(-w / 2, -h / 2, w, h),
        hitAreaCallback: Phaser.Geom.Rectangle.Contains,
        useHandCursor: true
      });
      
      container.on('pointerover', () => {
        draw(true);
        this.tweens.add({
          targets: container,
          scale: 1.04,
          duration: 150,
          ease: 'Quad.easeOut',
          overwrite: true
        });
      });
      container.on('pointerout',  () => {
        draw(false);
        this.tweens.add({
          targets: container,
          scale: 1.0,
          duration: 150,
          ease: 'Quad.easeOut',
          overwrite: true
        });
      });
      container.on('pointerdown', () => {
        audio.playTap();
        this.cameras.main.fadeOut(300, 10, 0, 26);
        this.time.delayedCall(320, () => {
          GameData.world.set(world.id);
          this.scene.start('LevelSelect', { world: world.id });
        });
      });
    }

    // Entrance animation
    this.tweens.add({
      targets: container,
      alpha: 1,
      y: y,
      duration: 500,
      ease: 'Back.Out',
      delay
    });

    // Idle float
    if (unlocked) {
      this.tweens.add({
        targets: container,
        y: y - 4,
        duration: 1800 + delay,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.InOut',
        delay: 900 + delay
      });
    }
  }

  private addStarfield(W: number, H: number) {
    const gfx = this.add.graphics();
    for (let i = 0; i < 80; i++) {
      gfx.fillStyle(0xffffff, 0.3 + Math.random() * 0.5);
      gfx.fillCircle(Math.random() * W, Math.random() * H, Math.random() * 1.2 + 0.3);
    }
  }
}
