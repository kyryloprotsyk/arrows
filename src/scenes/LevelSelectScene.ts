/* LevelSelectScene.ts — Babylon.js level selection grid */
import type { IGameScene } from '../babylon/SceneManager';
import { BabylonGUI } from '../babylon/BabylonGUI';
import { SceneManager } from '../babylon/SceneManager';
import { TweenManager } from '../babylon/TweenManager';
import { BabylonBackground } from '../babylon/BabylonBackground';
import { GameData } from '../utils/GameData';
import { audio } from '../audio';
import { Control, TextBlock, Rectangle, Button, StackPanel, ScrollViewer } from '@babylonjs/gui';
import type { Scene as BjsScene } from '@babylonjs/core';
import { hslToInt } from '../utils/IsoHelper';

const WORLD_HUES: Record<number, number> = { 1: 330, 2: 140, 3: 225, 4: 175, 5: 195, 6: 10 };
const WORLD_NAMES: Record<number, string> = {
  1: '🌸 Jelly Hills', 2: '🦕 Dino Valley', 3: '🚀 Cosmo Station',
  4: '🐠 Coral Reef', 5: '❄️ Ice Castle', 6: '🌋 Volcanic Land'
};

function intToHex(n: number): string {
  return '#' + n.toString(16).padStart(6, '0');
}

export class LevelSelectScene implements IGameScene {
  key = 'LevelSelect';
  private worldIndex = 1;

  init(data: any) {
    this.worldIndex = data?.world ?? GameData.world.get();
  }

  create(scene: BjsScene) {
    BabylonBackground.initScene(scene, this.worldIndex);
    const wHue = WORLD_HUES[this.worldIndex] ?? 330;

    const gui = BabylonGUI.createFullscreenUI('level_select_ui');

    // Warm peach background
    const bg = new Rectangle();
    bg.width = '100%'; bg.height = '100%';
    bg.background = '#fff5ea'; bg.thickness = 0;
    gui.addControl(bg);

    // Title
    const title = new TextBlock();
    title.text = WORLD_NAMES[this.worldIndex] ?? 'Select Level';
    title.color = '#ff9f1c';
    title.fontSize = 32;
    title.fontStyle = 'bold';
    title.fontFamily = 'Fredoka, sans-serif';
    title.shadowColor = '#5c3d2e';
    title.shadowBlur = 0;
    title.shadowOffsetX = 3;
    title.shadowOffsetY = 3;
    title.top = '-46%';
    title.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    gui.addControl(title);

    // Scroll container for levels
    const scroller = new ScrollViewer('level_scroll');
    scroller.width = '360px'; scroller.height = '75%';
    scroller.top = '4%';
    scroller.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    scroller.thickness = 0;
    scroller.color = 'transparent';
    gui.addControl(scroller);

    const panel = new StackPanel();
    panel.isVertical = true;
    panel.width = '100%';
    scroller.addControl(panel);

    const LEVELS = 10;
    for (let lv = 1; lv <= LEVELS; lv++) {
      const stars = GameData.starsFor(this.worldIndex, lv);
      const unlocked = lv === 1 || GameData.starsFor(this.worldIndex, lv - 1) > 0;

      const col = intToHex(hslToInt(wHue, unlocked ? 80 : 15, unlocked ? 40 : 20));
      const borderCol = intToHex(hslToInt(wHue, unlocked ? 90 : 20, unlocked ? 22 : 12));

      const row = new Rectangle();
      row.width = '340px'; row.height = '68px';
      row.background = unlocked ? col : '#f0e6d6';
      row.color = borderCol;
      row.cornerRadius = 20; row.thickness = 3;
      row.paddingBottom = '10px';
      row.shadowColor = borderCol;
      row.shadowBlur = 0;
      row.shadowOffsetX = 0;
      row.shadowOffsetY = 4;
      row.alpha = 0;
      panel.addControl(row);

      TweenManager.add({ targets: row, alpha: 1, duration: 350, delay: 150 + lv * 50 });

      const rowTxt = new TextBlock();
      rowTxt.text = unlocked
        ? `Level ${lv}   ${'⭐'.repeat(stars)}${'☆'.repeat(Math.max(0, 3 - stars))}`
        : `🔒  Level ${lv}  (Locked)`;
      rowTxt.color = unlocked ? '#ffffff' : '#9999aa';
      rowTxt.fontSize = 18;
      rowTxt.fontStyle = 'bold';
      rowTxt.fontFamily = 'Fredoka, sans-serif';
      row.addControl(rowTxt);

      if (unlocked) {
        row.onPointerEnterObservable.add(() => { row.scaleX = 1.03; row.scaleY = 1.03; row.shadowOffsetY = 5; });
        row.onPointerOutObservable.add(() => { row.scaleX = 1.0; row.scaleY = 1.0; row.shadowOffsetY = 4; });
        row.onPointerClickObservable.add(() => {
          audio.playTap();
          GameData.level.set(lv);
          SceneManager.start('Game', { world: this.worldIndex, level: lv });
        });
      }
    }

    // Back button (pink cartoon design)
    const backBtn = Button.CreateSimpleButton('btn_back', '← Worlds');
    backBtn.width = '160px'; backBtn.height = '44px';
    backBtn.color = '#ffffff'; backBtn.fontSize = 20;
    backBtn.fontStyle = 'bold';
    backBtn.fontFamily = 'Fredoka, sans-serif';
    backBtn.background = '#e91e63';
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
      SceneManager.start('WorldSelect');
    });
  }
}
