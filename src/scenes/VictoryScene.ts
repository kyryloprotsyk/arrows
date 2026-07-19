/* VictoryScene.ts — Babylon.js Victory / Level Clear screen */
import type { IGameScene } from '../babylon/SceneManager';
import { BabylonGUI } from '../babylon/BabylonGUI';
import { SceneManager } from '../babylon/SceneManager';
import { TweenManager } from '../babylon/TweenManager';
import { BabylonBackground } from '../babylon/BabylonBackground';
import { BabylonParticles } from '../babylon/BabylonParticles';
import { GameData } from '../utils/GameData';
import { audio } from '../audio';
import { AdManager } from '../utils/AdManager';
import { Control, TextBlock, Rectangle, Button } from '@babylonjs/gui';
import type { Scene as BjsScene } from '@babylonjs/core';
import { Vector3 } from '@babylonjs/core';
import { hslToInt } from '../utils/IsoHelper';

const WORLD_HUES: Record<number, number> = { 1: 330, 2: 140, 3: 225, 4: 175, 5: 195, 6: 10 };

function intToHex(n: number): string { return '#' + n.toString(16).padStart(6, '0'); }

export class VictoryScene implements IGameScene {
  key = 'Victory';

  create(scene: BjsScene, data: {
    world: number; level: number; stars: number; reward: number; movesLeft: number;
    isDaily?: boolean; xpEarned?: number; oldLevel?: number; newLevel?: number;
    userRank?: number; par?: number; movesTotal?: number;
  }) {
    const { world = 1, level = 1, stars = 3, reward = 0, isDaily,
            xpEarned = 0, oldLevel, newLevel, userRank } = data ?? {};

    BabylonBackground.initScene(scene, world);

    // Fireworks
    TweenManager.delayedCall(300, () => BabylonParticles.victoryFireworks(scene));

    // Star burst particles at center
    BabylonParticles.shatterBurst(scene, new Vector3(0, 1, 0), hslToInt(WORLD_HUES[world] ?? 330, 90, 70));

    const gui = BabylonGUI.createFullscreenUI('victory_ui');

    // BG overlay (light warm peach)
    const bg = new Rectangle();
    bg.width = '100%'; bg.height = '100%';
    bg.background = '#fff5ea'; bg.thickness = 0; bg.alpha = 0.45;
    gui.addControl(bg);

    // Level Clear heading
    const heading = new TextBlock();
    heading.text = 'LEVEL CLEAR! 🎉';
    heading.color = '#ff9f1c';
    heading.fontSize = 60;
    heading.fontStyle = 'bold';
    heading.fontFamily = 'Fredoka, sans-serif';
    heading.shadowColor = '#5c3d2e';
    heading.shadowBlur = 0;
    heading.shadowOffsetX = 3;
    heading.shadowOffsetY = 3;
    heading.top = '-32%';
    heading.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    heading.alpha = 0; heading.scaleX = 0.5; heading.scaleY = 0.5;
    gui.addControl(heading);
    TweenManager.add({ targets: heading, alpha: 1, scaleX: 1, scaleY: 1, duration: 700, ease: 'Back.Out', delay: 100 });

    // Stars display
    const starsStr = '⭐'.repeat(Math.max(0, stars)) + '☆'.repeat(Math.max(0, 3 - stars));
    const starsBlock = new TextBlock();
    starsBlock.text = starsStr;
    starsBlock.color = '#ffa500';
    starsBlock.fontSize = 52;
    starsBlock.top = '-18%';
    starsBlock.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    starsBlock.alpha = 0;
    gui.addControl(starsBlock);
    TweenManager.add({ targets: starsBlock, alpha: 1, duration: 600, delay: 500 });

    // Stats
    const statsLines = [
      { text: `💰 Coins earned: +${reward}`, color: '#d35400' },
      xpEarned ? { text: `⚡ XP earned: +${xpEarned}`, color: '#27ae60' } : null,
      (oldLevel && newLevel && newLevel > oldLevel) ? { text: `🎖️ Level Up! ${oldLevel} → ${newLevel}`, color: '#9b59b6' } : null,
      userRank ? { text: `🏆 Your rank: #${userRank}`, color: '#2980b9' } : null,
    ].filter(Boolean) as { text: string; color: string }[];

    statsLines.forEach((lineObj, i) => {
      const stat = new TextBlock();
      stat.text = lineObj.text;
      stat.color = lineObj.color;
      stat.fontSize = 22;
      stat.fontStyle = 'bold';
      stat.fontFamily = 'Fredoka, sans-serif';
      stat.top = `${-5 + i * 7}%`;
      stat.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
      stat.alpha = 0;
      gui.addControl(stat);
      TweenManager.add({ targets: stat, alpha: 1, duration: 400, delay: 700 + i * 120 });
    });

    // Next Level button (bubbly green button)
    const nextBtn = Button.CreateSimpleButton('btn_next', '▶  Next Level');
    nextBtn.width = '240px'; nextBtn.height = '62px';
    nextBtn.color = '#ffffff'; nextBtn.fontSize = 22;
    nextBtn.fontStyle = 'bold';
    nextBtn.fontFamily = 'Fredoka, sans-serif';
    nextBtn.background = '#2ecc71';
    (nextBtn as any).color = '#27ae60'; // border color
    nextBtn.cornerRadius = 24; nextBtn.thickness = 3;
    nextBtn.shadowColor = '#27ae60';
    nextBtn.shadowBlur = 0;
    nextBtn.shadowOffsetX = 0;
    nextBtn.shadowOffsetY = 5;
    nextBtn.top = '26%';
    nextBtn.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    nextBtn.alpha = 0;
    gui.addControl(nextBtn);
    TweenManager.add({ targets: nextBtn, alpha: 1, duration: 500, delay: 900 });
    nextBtn.onPointerEnterObservable.add(() => { nextBtn.scaleX = 1.04; nextBtn.scaleY = 1.04; nextBtn.shadowOffsetY = 6; });
    nextBtn.onPointerOutObservable.add(() => { nextBtn.scaleX = 1.0; nextBtn.scaleY = 1.0; nextBtn.shadowOffsetY = 5; });
    nextBtn.onPointerDownObservable.add(() => { nextBtn.scaleX = 0.96; nextBtn.scaleY = 0.96; nextBtn.shadowOffsetY = 2; });
    nextBtn.onPointerUpObservable.add(() => {
      nextBtn.scaleX = 1.0; nextBtn.scaleY = 1.0;
      nextBtn.shadowOffsetY = 5;
      audio.playTap();
      SceneManager.start('Game', { world, level: level + 1 });
    });

    // Watch Ad for coins button (bubbly yellow button)
    if (!isDaily) {
      const adBtn = Button.CreateSimpleButton('btn_ad', '🎬 Watch Ad for 2× Coins');
      adBtn.width = '300px'; adBtn.height = '52px';
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
      adBtn.top = '37%';
      adBtn.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
      adBtn.alpha = 0;
      gui.addControl(adBtn);
      TweenManager.add({ targets: adBtn, alpha: 1, duration: 400, delay: 1100 });
      adBtn.onPointerEnterObservable.add(() => { adBtn.scaleX = 1.03; adBtn.scaleY = 1.03; adBtn.shadowOffsetY = 5; });
      adBtn.onPointerOutObservable.add(() => { adBtn.scaleX = 1.0; adBtn.scaleY = 1.0; adBtn.shadowOffsetY = 4; });
      adBtn.onPointerDownObservable.add(() => { adBtn.scaleX = 0.97; adBtn.scaleY = 0.97; adBtn.shadowOffsetY = 1; });
      adBtn.onPointerUpObservable.add(async () => {
        adBtn.scaleX = 1.0; adBtn.scaleY = 1.0;
        adBtn.shadowOffsetY = 4;
        audio.playTap();
        await AdManager.showRewardedAd('double_coins' as any);
      });
    }

    // Menu button (bubbly pink button)
    const menuBtn = Button.CreateSimpleButton('btn_menu', '🏠 Menu');
    menuBtn.width = '160px'; menuBtn.height = '44px';
    menuBtn.color = '#ffffff'; menuBtn.fontSize = 18;
    menuBtn.fontStyle = 'bold';
    menuBtn.fontFamily = 'Fredoka, sans-serif';
    menuBtn.background = '#e91e63';
    (menuBtn as any).color = '#c2185b'; // border color
    menuBtn.cornerRadius = 20; menuBtn.thickness = 3;
    menuBtn.shadowColor = '#c2185b';
    menuBtn.shadowBlur = 0;
    menuBtn.shadowOffsetX = 0;
    menuBtn.shadowOffsetY = 4;
    menuBtn.top = '46%';
    menuBtn.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    menuBtn.alpha = 0;
    gui.addControl(menuBtn);
    TweenManager.add({ targets: menuBtn, alpha: 1, duration: 400, delay: 1000 });
    menuBtn.onPointerEnterObservable.add(() => { menuBtn.scaleX = 1.03; menuBtn.scaleY = 1.03; menuBtn.shadowOffsetY = 5; });
    menuBtn.onPointerOutObservable.add(() => { menuBtn.scaleX = 1.0; menuBtn.scaleY = 1.0; menuBtn.shadowOffsetY = 4; });
    menuBtn.onPointerDownObservable.add(() => { menuBtn.scaleX = 0.97; menuBtn.scaleY = 0.97; menuBtn.shadowOffsetY = 1; });
    menuBtn.onPointerUpObservable.add(() => {
      menuBtn.scaleX = 1.0; menuBtn.scaleY = 1.0;
      menuBtn.shadowOffsetY = 4;
      audio.playTap();
      SceneManager.start('Menu');
    });
  }
}
