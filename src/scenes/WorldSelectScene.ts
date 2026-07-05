/* WorldSelectScene.ts — World selection with parallax, lock animations */
import Phaser from 'phaser';
import { GameData } from '../utils/GameData';
import { audio } from '../audio';
import { hslToInt } from '../utils/IsoHelper';

const WORLDS = [
  { id: 1, name: 'Jelly Hills',    emoji: '🌸', hue: 330, desc: 'Sweet & simple puzzles',  starsNeeded: 0 },
  { id: 2, name: 'Dino Valley',    emoji: '🦕', hue: 140, desc: 'Bombs, keys & chests!',   starsNeeded: 5 },
  { id: 3, name: 'Cosmo Station',  emoji: '🚀', hue: 225, desc: 'Rainbow magic & chaos!',  starsNeeded: 10 }
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
    this.add.text(W / 2, H * 0.1, '🌍  Choose a World', {
      fontFamily: 'Fredoka', fontSize: Math.min(W * 0.08, 42) + 'px',
      color: '#ffffff',
      shadow: { offsetX: 0, offsetY: 4, color: '#6600ff', blur: 18, fill: true }
    }).setOrigin(0.5);

    // Stars total badge
    this.add.text(W / 2, H * 0.17, `Total Stars: ${totalStars} ⭐`, {
      fontFamily: 'Fredoka', fontSize: '18px', color: '#ffe45e'
    }).setOrigin(0.5);

    // World cards
    const cardH = Math.min(H * 0.22, 130);
    const cardW = Math.min(W * 0.82, 420);
    const startY = H * 0.27;

    WORLDS.forEach((world, i) => {
      const cy = startY + i * (cardH + 20);
      const unlocked = totalStars >= world.starsNeeded;
      this.createWorldCard(W / 2, cy, cardW, cardH, world, unlocked, i * 120);
    });

    // Back button
    const backBtn = this.add.text(40, 35, '← Back', {
      fontFamily: 'Fredoka', fontSize: '20px', color: '#9b72ff'
    }).setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => {
      audio.playTap();
      this.cameras.main.fadeOut(300, 10, 0, 26);
      this.time.delayedCall(320, () => this.scene.start('Menu'));
    });
    backBtn.on('pointerover', () => backBtn.setColor('#ff85c1'));
    backBtn.on('pointerout', () => backBtn.setColor('#9b72ff'));
  }

  private createWorldCard(
    x: number, y: number, w: number, h: number,
    world: typeof WORLDS[0], unlocked: boolean, delay: number
  ) {
    const col  = hslToInt(world.hue, 80, 55);
    const dark = hslToInt(world.hue, 70, 28);
    const glow = hslToInt(world.hue, 100, 75);

    const g = this.add.graphics().setAlpha(0).setDepth(1);
    const draw = (hover: boolean) => {
      g.clear();
      // Card shadow
      g.fillStyle(dark, 0.4);
      g.fillRoundedRect(x - w / 2 + 4, y - h / 2 + 8, w, h, 20);
      // Card bg
      g.fillStyle(unlocked ? (hover ? col : hslToInt(world.hue, 70, 35)) : 0x221133, 1);
      g.fillRoundedRect(x - w / 2, y - h / 2, w, h, 20);
      // Glow border
      for (let pass = 0; pass < 3; pass++) {
        g.lineStyle([5, 3, 1.5][pass], unlocked ? glow : 0x443355, [0.1, 0.3, unlocked ? 0.7 : 0.3][pass]);
        g.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 20);
      }
      // Lock icon bg
      if (!unlocked) {
        g.fillStyle(0x000000, 0.3);
        g.fillRoundedRect(x - w / 2, y - h / 2, w, h, 20);
      }
    };
    draw(false);

    if (unlocked) {
      g.setInteractive(new Phaser.Geom.Rectangle(x - w / 2, y - h / 2, w, h), Phaser.Geom.Rectangle.Contains);
      g.on('pointerover', () => { draw(true); g.setScale(1.02); });
      g.on('pointerout',  () => { draw(false); g.setScale(1); });
      g.on('pointerdown', () => {
        audio.playTap();
        this.cameras.main.fadeOut(300, 10, 0, 26);
        this.time.delayedCall(320, () => {
          GameData.world.set(world.id);
          const savedLevel = parseInt(localStorage.getItem(`arrow_buddies_w${world.id}_level`) ?? '1');
          GameData.level.set(Math.min(savedLevel, 5));
          this.scene.start('Game', { world: world.id, level: GameData.level.get() });
        });
      });
    }

    // Emoji icon
    const emoji = this.add.text(x - w / 2 + 50, y, world.emoji, { fontSize: '44px' })
      .setOrigin(0.5).setAlpha(0).setDepth(2);

    // World name
    const nameText = this.add.text(x - w / 2 + 110, y - 16, world.name, {
      fontFamily: 'Fredoka', fontSize: '24px',
      color: unlocked ? '#ffffff' : '#664477',
      shadow: unlocked ? { offsetX: 0, offsetY: 3, color: '#000', blur: 8, fill: true } : undefined
    }).setAlpha(0).setDepth(2);

    // Description / lock notice
    const descText = this.add.text(x - w / 2 + 110, y + 14, unlocked ? world.desc : `🔒 Need ${world.starsNeeded} Stars`, {
      fontFamily: 'Fredoka', fontSize: '15px',
      color: unlocked ? '#ccbbee' : '#664477'
    }).setAlpha(0).setDepth(2);

    // Level stars row
    const starTexts: Phaser.GameObjects.Text[] = [];
    if (unlocked) {
      for (let l = 1; l <= 5; l++) {
        const stars = GameData.starsFor(world.id, l);
        const sx = x - w / 2 + 110 + (l - 1) * 30;
        const sy = y + h / 2 - 20;
        const starChar = stars >= 3 ? '⭐' : stars >= 2 ? '🌟' : stars >= 1 ? '✨' : '○';
        const st = this.add.text(sx, sy, starChar, { fontSize: '13px' }).setOrigin(0.5).setAlpha(0).setDepth(2);
        starTexts.push(st);
      }
    }

    const allTargets = [g, emoji, nameText, descText, ...starTexts];
    allTargets.forEach(t => t.y += 8);

    // Entrance animation
    this.tweens.add({ targets: allTargets, alpha: 1, y: '-=8', duration: 500, ease: 'Back.Out', delay });

    // Idle float
    if (unlocked) {
      this.tweens.add({
        targets: allTargets,
        y: `-=6`, duration: 1800 + delay, yoyo: true, repeat: -1, ease: 'Sine.InOut',
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
