/* DefeatScene.ts — Babylon.js Game Over screen */
import type { IGameScene } from '../babylon/SceneManager';
import { BabylonGUI } from '../babylon/BabylonGUI';
import { SceneManager } from '../babylon/SceneManager';
import { TweenManager } from '../babylon/TweenManager';
import { BabylonBackground } from '../babylon/BabylonBackground';
import { GameData } from '../utils/GameData';
import { audio } from '../audio';
import { AdManager } from '../utils/AdManager';
import { Control, TextBlock, Rectangle, Button } from '@babylonjs/gui';
import type { Scene as BjsScene } from '@babylonjs/core';

export class DefeatScene implements IGameScene {
  key = 'Defeat';

  create(_scene: BjsScene, data: { world: number; level: number; isDaily?: boolean }) {
    const { world, level, isDaily } = data ?? {};

    BabylonBackground.initScene(_scene, world ?? 1);

    const gui = BabylonGUI.createFullscreenUI('defeat_ui');

    // Warm peach background overlay
    const bg = new Rectangle();
    bg.width = '100%'; bg.height = '100%';
    bg.background = '#fff5ea'; bg.thickness = 0; bg.alpha = 0.45;
    gui.addControl(bg);

    // OUT OF MOVES heading
    const heading = new TextBlock();
    heading.text = 'OUT OF MOVES!';
    heading.color = '#ff6b6b';
    heading.fontSize = 52;
    heading.fontStyle = 'bold';
    heading.fontFamily = 'Fredoka, sans-serif';
    heading.shadowColor = '#5c3d2e';
    heading.shadowBlur = 0;
    heading.shadowOffsetX = 3;
    heading.shadowOffsetY = 3;
    heading.top = '-25%';
    heading.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    heading.scaleX = 0.3; heading.scaleY = 0.3; heading.alpha = 0;
    gui.addControl(heading);
    TweenManager.add({ targets: heading, alpha: 1, scaleX: 1, scaleY: 1, duration: 600, ease: 'Back.Out', delay: 200 });

    // Subtitle
    const sub = new TextBlock();
    sub.text = 'Don\'t give up! Try again or watch an ad.';
    sub.color = '#7f8c8d';
    sub.fontSize = 18;
    sub.fontStyle = 'bold';
    sub.fontFamily = 'Fredoka, sans-serif';
    sub.top = '-15%';
    sub.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    sub.alpha = 0;
    gui.addControl(sub);
    TweenManager.add({ targets: sub, alpha: 1, duration: 400, delay: 500 });

    // Watch Ad button (yellow cartoon button)
    const adBtn = Button.CreateSimpleButton('btn_ad', '🎬 Watch Ad for +5 Moves');
    adBtn.width = '300px'; adBtn.height = '65px';
    adBtn.color = '#ffffff'; adBtn.fontSize = 17;
    adBtn.fontStyle = 'bold';
    adBtn.fontFamily = 'Fredoka, sans-serif';
    adBtn.background = '#f1c40f';
    (adBtn as any).color = '#f39c12'; // border color
    adBtn.cornerRadius = 20; adBtn.thickness = 3;
    adBtn.shadowColor = '#f39c12';
    adBtn.shadowBlur = 0;
    adBtn.shadowOffsetX = 0;
    adBtn.shadowOffsetY = 4;
    adBtn.top = '3%';
    adBtn.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    adBtn.alpha = 0;
    gui.addControl(adBtn);
    TweenManager.add({ targets: adBtn, alpha: 1, duration: 500, delay: 600 });
    adBtn.onPointerEnterObservable.add(() => { adBtn.scaleX = 1.03; adBtn.scaleY = 1.03; adBtn.shadowOffsetY = 5; });
    adBtn.onPointerOutObservable.add(() => { adBtn.scaleX = 1.0; adBtn.scaleY = 1.0; adBtn.shadowOffsetY = 4; });
    adBtn.onPointerDownObservable.add(() => { adBtn.scaleX = 0.97; adBtn.scaleY = 0.97; adBtn.shadowOffsetY = 1; });
    adBtn.onPointerUpObservable.add(async () => {
      adBtn.scaleX = 1.0; adBtn.scaleY = 1.0;
      adBtn.shadowOffsetY = 4;
      audio.playTap();
      const success = await AdManager.showRewardedAd('extra_moves' as any);
      if (success) {
        SceneManager.start('Game', { world, level, isDaily, bonusMoves: 5 });
      }
    });

    // Restart button (green cartoon button)
    const restartBtn = Button.CreateSimpleButton('btn_restart', '🔄 Restart Level');
    restartBtn.width = '220px'; restartBtn.height = '55px';
    restartBtn.color = '#ffffff'; restartBtn.fontSize = 18;
    restartBtn.fontStyle = 'bold';
    restartBtn.fontFamily = 'Fredoka, sans-serif';
    restartBtn.background = '#2ecc71';
    (restartBtn as any).color = '#27ae60'; // border color
    restartBtn.cornerRadius = 20; restartBtn.thickness = 3;
    restartBtn.shadowColor = '#27ae60';
    restartBtn.shadowBlur = 0;
    restartBtn.shadowOffsetX = 0;
    restartBtn.shadowOffsetY = 4;
    restartBtn.top = '16%';
    restartBtn.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    restartBtn.alpha = 0;
    gui.addControl(restartBtn);
    TweenManager.add({ targets: restartBtn, alpha: 1, duration: 500, delay: 750 });
    restartBtn.onPointerEnterObservable.add(() => { restartBtn.scaleX = 1.03; restartBtn.scaleY = 1.03; restartBtn.shadowOffsetY = 5; });
    restartBtn.onPointerOutObservable.add(() => { restartBtn.scaleX = 1.0; restartBtn.scaleY = 1.0; restartBtn.shadowOffsetY = 4; });
    restartBtn.onPointerDownObservable.add(() => { restartBtn.scaleX = 0.97; restartBtn.scaleY = 0.97; restartBtn.shadowOffsetY = 1; });
    restartBtn.onPointerUpObservable.add(() => {
      restartBtn.scaleX = 1.0; restartBtn.scaleY = 1.0;
      restartBtn.shadowOffsetY = 4;
      audio.playTap();
      SceneManager.start('Game', { world, level, isDaily });
    });

    // Quit button (pink cartoon button)
    const quitBtn = Button.CreateSimpleButton('btn_quit', '🏠 Main Menu');
    quitBtn.width = '190px'; quitBtn.height = '48px';
    quitBtn.color = '#ffffff'; quitBtn.fontSize = 16;
    quitBtn.fontStyle = 'bold';
    quitBtn.fontFamily = 'Fredoka, sans-serif';
    quitBtn.background = '#e91e63';
    (quitBtn as any).color = '#c2185b'; // border color
    quitBtn.cornerRadius = 20; quitBtn.thickness = 3;
    quitBtn.shadowColor = '#c2185b';
    quitBtn.shadowBlur = 0;
    quitBtn.shadowOffsetX = 0;
    quitBtn.shadowOffsetY = 4;
    quitBtn.top = '27%';
    quitBtn.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    quitBtn.alpha = 0;
    gui.addControl(quitBtn);
    TweenManager.add({ targets: quitBtn, alpha: 1, duration: 500, delay: 900 });
    quitBtn.onPointerEnterObservable.add(() => { quitBtn.scaleX = 1.03; quitBtn.scaleY = 1.03; quitBtn.shadowOffsetY = 5; });
    quitBtn.onPointerOutObservable.add(() => { quitBtn.scaleX = 1.0; quitBtn.scaleY = 1.0; quitBtn.shadowOffsetY = 4; });
    quitBtn.onPointerDownObservable.add(() => { quitBtn.scaleX = 0.97; quitBtn.scaleY = 0.97; quitBtn.shadowOffsetY = 1; });
    quitBtn.onPointerUpObservable.add(() => {
      quitBtn.scaleX = 1.0; quitBtn.scaleY = 1.0;
      quitBtn.shadowOffsetY = 4;
      audio.playTap();
      SceneManager.start('Menu');
    });
  }
}
