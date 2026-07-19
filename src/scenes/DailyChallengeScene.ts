/* DailyChallengeScene.ts — Babylon.js Daily Challenge lobby */
import type { IGameScene } from '../babylon/SceneManager';
import { BabylonGUI } from '../babylon/BabylonGUI';
import { SceneManager } from '../babylon/SceneManager';
import { TweenManager } from '../babylon/TweenManager';
import { GameData } from '../utils/GameData';
import { audio } from '../audio';
import { Control, TextBlock, Rectangle, Button, StackPanel } from '@babylonjs/gui';
import type { Scene as BjsScene } from '@babylonjs/core';

export class DailyChallengeScene implements IGameScene {
  key = 'DailyChallenge';

  create(_scene: BjsScene) {
    const gui = BabylonGUI.createFullscreenUI('daily_ui');

    // Warm peach background
    const bg = new Rectangle();
    bg.width = '100%'; bg.height = '100%';
    bg.background = '#fff5ea'; bg.thickness = 0;
    gui.addControl(bg);

    // Header
    const title = new TextBlock();
    title.text = '📅 Daily Challenge';
    title.color = '#ff9f1c';
    title.fontSize = 36;
    title.fontStyle = 'bold';
    title.fontFamily = 'Fredoka, sans-serif';
    title.shadowColor = '#5c3d2e';
    title.shadowBlur = 0;
    title.shadowOffsetX = 3;
    title.shadowOffsetY = 3;
    title.top = '-43%';
    title.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    title.alpha = 0;
    gui.addControl(title);
    TweenManager.add({ targets: title, alpha: 1, duration: 500, delay: 100 });

    // Streak info
    const streak = GameData.dailyStreak?.get?.() ?? 0;
    const streakTxt = new TextBlock();
    streakTxt.text = `🔥 Streak: ${streak} days`;
    streakTxt.color = '#ffa500';
    streakTxt.fontSize = 20;
    streakTxt.fontStyle = 'bold';
    streakTxt.fontFamily = 'Fredoka, sans-serif';
    streakTxt.top = '-35%';
    streakTxt.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    streakTxt.alpha = 0;
    gui.addControl(streakTxt);
    TweenManager.add({ targets: streakTxt, alpha: 1, duration: 500, delay: 250 });

    // Calendar row — last 7 days
    const calRow = new StackPanel();
    calRow.isVertical = false;
    calRow.top = '-22%';
    calRow.width = '360px';
    calRow.height = '60px';
    calRow.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    gui.addControl(calRow);

    for (let d = 6; d >= 0; d--) {
      const completed = d >= (7 - streak);
      const dot = new Rectangle();
      dot.width = '42px'; dot.height = '42px';
      dot.background = completed ? '#2ecc71' : '#f0e6d6';
      dot.color = completed ? '#27ae60' : '#d5c7b3';
      dot.cornerRadius = 14; dot.thickness = 3;
      dot.paddingRight = '6px';
      calRow.addControl(dot);
      const dTxt = new TextBlock();
      dTxt.text = completed ? '✓' : String(d + 1);
      dTxt.color = completed ? '#ffffff' : '#9999aa';
      dTxt.fontSize = 18;
      dTxt.fontStyle = 'bold';
      dTxt.fontFamily = 'Fredoka, sans-serif';
      dot.addControl(dTxt);
    }

    // Desc
    const desc = new TextBlock();
    desc.text = 'Today\'s special puzzle — New challenge every 24 hours!';
    desc.color = '#7f8c8d';
    desc.fontSize = 16;
    desc.fontStyle = 'bold';
    desc.fontFamily = 'Fredoka, sans-serif';
    desc.top = '-10%';
    desc.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    desc.textWrapping = true;
    desc.width = '340px';
    desc.alpha = 0;
    gui.addControl(desc);
    TweenManager.add({ targets: desc, alpha: 1, duration: 400, delay: 400 });

    // Play button (green cartoon button)
    const playBtn = Button.CreateSimpleButton('btn_play', '▶  Play Daily Puzzle');
    playBtn.width = '260px'; playBtn.height = '62px';
    playBtn.color = '#ffffff'; playBtn.fontSize = 20;
    playBtn.fontStyle = 'bold';
    playBtn.fontFamily = 'Fredoka, sans-serif';
    playBtn.background = '#2ecc71';
    (playBtn as any).color = '#27ae60'; // border color
    playBtn.cornerRadius = 24; playBtn.thickness = 3;
    playBtn.shadowColor = '#27ae60';
    playBtn.shadowBlur = 0;
    playBtn.shadowOffsetX = 0;
    playBtn.shadowOffsetY = 4;
    playBtn.top = '8%';
    playBtn.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    playBtn.alpha = 0;
    gui.addControl(playBtn);
    TweenManager.add({ targets: playBtn, alpha: 1, duration: 500, delay: 600 });
    playBtn.onPointerEnterObservable.add(() => { playBtn.scaleX = 1.03; playBtn.scaleY = 1.03; playBtn.shadowOffsetY = 5; });
    playBtn.onPointerOutObservable.add(() => { playBtn.scaleX = 1.0; playBtn.scaleY = 1.0; playBtn.shadowOffsetY = 4; });
    playBtn.onPointerDownObservable.add(() => { playBtn.scaleX = 0.97; playBtn.scaleY = 0.97; playBtn.shadowOffsetY = 1; });
    playBtn.onPointerUpObservable.add(() => {
      playBtn.scaleX = 1.0; playBtn.scaleY = 1.0;
      playBtn.shadowOffsetY = 4;
      audio.playTap();
      const seed = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      SceneManager.start('Game', { world: 1, level: parseInt(seed) % 10 + 1, isDaily: true });
    });

    // Back button (pink cartoon button)
    const backBtn = Button.CreateSimpleButton('btn_back', '← Menu');
    backBtn.width = '140px'; backBtn.height = '44px';
    backBtn.color = '#ffffff'; backBtn.fontSize = 18;
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
    backBtn.onPointerEnterObservable.add(() => { backBtn.scaleX = 1.03; backBtn.scaleY = 1.03; backBtn.shadowOffsetY = 5; });
    backBtn.onPointerOutObservable.add(() => { backBtn.scaleX = 1.0; backBtn.scaleY = 1.0; backBtn.shadowOffsetY = 4; });
    backBtn.onPointerDownObservable.add(() => { backBtn.scaleX = 0.97; backBtn.scaleY = 0.97; backBtn.shadowOffsetY = 1; });
    backBtn.onPointerUpObservable.add(() => {
      backBtn.scaleX = 1.0; backBtn.scaleY = 1.0;
      backBtn.shadowOffsetY = 4;
      audio.playTap();
      SceneManager.start('Menu');
    });
  }
}
