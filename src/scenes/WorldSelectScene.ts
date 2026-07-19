/* WorldSelectScene.ts — Babylon.js world selection */
import type { IGameScene } from '../babylon/SceneManager';
import { BabylonGUI } from '../babylon/BabylonGUI';
import { SceneManager } from '../babylon/SceneManager';
import { TweenManager } from '../babylon/TweenManager';
import { BabylonBackground } from '../babylon/BabylonBackground';
import { GameData } from '../utils/GameData';
import { audio } from '../audio';
import { Control, TextBlock, Rectangle, Button, StackPanel } from '@babylonjs/gui';
import type { Scene as BjsScene } from '@babylonjs/core';
import { hslToInt } from '../utils/IsoHelper';

const WORLDS = [
  { id: 1, name: 'Jelly Hills',    emoji: '🌸', hue: 330, desc: 'Sweet & simple puzzles',   starsNeeded: 0  },
  { id: 2, name: 'Dino Valley',    emoji: '🦕', hue: 140, desc: 'Bombs, keys & chests!',    starsNeeded: 5  },
  { id: 3, name: 'Cosmo Station',  emoji: '🚀', hue: 225, desc: 'Rainbow magic & chaos!',   starsNeeded: 10 },
  { id: 4, name: 'Coral Reef',     emoji: '🐠', hue: 175, desc: 'Rotator waves & corals!',  starsNeeded: 15 },
  { id: 5, name: 'Ice Castle',     emoji: '❄️', hue: 195, desc: 'Chilled locks & spires!',  starsNeeded: 22 },
  { id: 6, name: 'Volcanic Land',  emoji: '🌋', hue: 10,  desc: 'Magma cores & high danger!',starsNeeded: 30 },
];

function intToHex(n: number): string {
  return '#' + n.toString(16).padStart(6, '0');
}

export class WorldSelectScene implements IGameScene {
  key = 'WorldSelect';

  create(scene: BjsScene) {
    BabylonBackground.initScene(scene, 1);

    const gui = BabylonGUI.createFullscreenUI('world_select_ui');
    const totalStars = GameData.totalStars();

    // Warm peach background
    const bg = new Rectangle();
    bg.width = '100%'; bg.height = '100%';
    bg.background = '#fff5ea'; bg.thickness = 0;
    gui.addControl(bg);

    // Title
    const title = new TextBlock();
    title.text = '🌍  Choose a World';
    title.color = '#ff9f1c';
    title.fontSize = 38;
    title.fontStyle = 'bold';
    title.fontFamily = 'Fredoka, sans-serif';
    title.shadowColor = '#5c3d2e';
    title.shadowBlur = 0;
    title.shadowOffsetX = 3;
    title.shadowOffsetY = 3;
    title.top = '-44%';
    title.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    gui.addControl(title);

    // Stars badge
    const starsBadge = new TextBlock();
    starsBadge.text = `Total Stars: ${totalStars} ⭐`;
    starsBadge.color = '#d35400';
    starsBadge.fontSize = 20;
    starsBadge.fontStyle = 'bold';
    starsBadge.fontFamily = 'Fredoka, sans-serif';
    starsBadge.top = '-37%';
    starsBadge.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    gui.addControl(starsBadge);

    // World cards in a vertical list
    const panel = new StackPanel();
    panel.isVertical = true;
    panel.top = '4%';
    panel.width = '360px';
    panel.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    gui.addControl(panel);

    WORLDS.forEach((world, i) => {
      const unlocked = totalStars >= world.starsNeeded;
      const col = intToHex(hslToInt(world.hue, unlocked ? 80 : 15, unlocked ? 40 : 20));
      const borderCol = intToHex(hslToInt(world.hue, unlocked ? 90 : 20, unlocked ? 22 : 12));

      const card = new Rectangle();
      card.width = '340px'; card.height = '64px';
      card.background = col; card.color = borderCol;
      card.cornerRadius = 20; card.thickness = 3;
      card.paddingBottom = '10px';
      card.shadowColor = borderCol;
      card.shadowBlur = 0;
      card.shadowOffsetX = 0;
      card.shadowOffsetY = 4;
      card.alpha = 0;
      panel.addControl(card);

      const cardTxt = new TextBlock();
      cardTxt.text = unlocked
        ? `${world.emoji} ${world.name}  —  ${world.desc}`
        : `🔒 ${world.name}  (Need ${world.starsNeeded} ⭐)`;
      cardTxt.color = unlocked ? '#ffffff' : '#9999aa';
      cardTxt.fontSize = 15;
      cardTxt.fontStyle = 'bold';
      cardTxt.fontFamily = 'Fredoka, sans-serif';
      card.addControl(cardTxt);

      TweenManager.add({ targets: card, alpha: 1, duration: 400, delay: 200 + i * 80 });

      if (unlocked) {
        card.onPointerEnterObservable.add(() => { card.scaleX = 1.03; card.scaleY = 1.03; card.shadowOffsetY = 5; });
        card.onPointerOutObservable.add(() => { card.scaleX = 1.0; card.scaleY = 1.0; card.shadowOffsetY = 4; });
        card.onPointerClickObservable.add(() => {
          audio.playTap();
          GameData.world.set(world.id);
          SceneManager.start('LevelSelect', { world: world.id });
        });
      }
    });

    // Back button (pink cartoon design)
    const backBtn = Button.CreateSimpleButton('btn_back', '← Back');
    backBtn.width = '160px'; backBtn.height = '48px';
    backBtn.color = '#ffffff'; backBtn.fontSize = 20;
    backBtn.fontStyle = 'bold';
    backBtn.fontFamily = 'Fredoka, sans-serif';
    backBtn.background = '#e91e63';
    backBtn.color = '#ffffff';
    (backBtn as any).color = '#c2185b'; // border color
    backBtn.cornerRadius = 20; backBtn.thickness = 3;
    backBtn.shadowColor = '#c2185b';
    backBtn.shadowBlur = 0;
    backBtn.shadowOffsetX = 0;
    backBtn.shadowOffsetY = 4;
    backBtn.top = '46%';
    backBtn.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    backBtn.alpha = 0;
    gui.addControl(backBtn);
    TweenManager.add({ targets: backBtn, alpha: 1, duration: 400, delay: 700 });
    backBtn.onPointerUpObservable.add(() => {
      audio.playTap();
      SceneManager.start('Menu');
    });
  }
}
