/* LeaderboardScene.ts — Babylon.js Global Leaderboard */
import type { IGameScene } from '../babylon/SceneManager';
import { BabylonGUI } from '../babylon/BabylonGUI';
import { SceneManager } from '../babylon/SceneManager';
import { TweenManager } from '../babylon/TweenManager';
import { audio } from '../audio';
import { LeaderboardService, type LeaderboardEntry } from '../utils/LeaderboardService';
import { Control, TextBlock, Rectangle, Button, StackPanel, ScrollViewer } from '@babylonjs/gui';
import type { Scene as BjsScene } from '@babylonjs/core';

export class LeaderboardScene implements IGameScene {
  key = 'Leaderboard';

  async create(_scene: BjsScene) {
    const gui = BabylonGUI.createFullscreenUI('leaderboard_ui');

    // Peach background
    const bg = new Rectangle();
    bg.width = '100%'; bg.height = '100%';
    bg.background = '#fff5ea'; bg.thickness = 0;
    gui.addControl(bg);

    // Title
    const title = new TextBlock();
    title.text = '🏆 Global Leaderboard';
    title.color = '#ff9f1c';
    title.fontSize = 36;
    title.fontStyle = 'bold';
    title.fontFamily = 'Fredoka, sans-serif';
    title.shadowColor = '#5c3d2e';
    title.shadowBlur = 0;
    title.shadowOffsetX = 3;
    title.shadowOffsetY = 3;
    title.top = '-45%';
    title.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    title.alpha = 0;
    gui.addControl(title);
    TweenManager.add({ targets: title, alpha: 1, duration: 500, delay: 100 });

    // Loading indicator
    const loadingTxt = new TextBlock();
    loadingTxt.text = 'Loading...';
    loadingTxt.color = '#ffa500';
    loadingTxt.fontSize = 20;
    loadingTxt.fontStyle = 'bold';
    loadingTxt.fontFamily = 'Fredoka, sans-serif';
    loadingTxt.top = '0%';
    loadingTxt.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    gui.addControl(loadingTxt);

    // Scroll viewer for rows
    const scroller = new ScrollViewer('lb_scroll');
    scroller.width = '380px'; scroller.height = '65%';
    scroller.top = '2%';
    scroller.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    scroller.thickness = 0; scroller.color = 'transparent';
    gui.addControl(scroller);

    const panel = new StackPanel();
    panel.isVertical = true; panel.width = '100%';
    scroller.addControl(panel);

    try {
      const { entries } = LeaderboardService.syncAndGetLeaderboard('stars');
      loadingTxt.isVisible = false;

      entries.forEach((entry, i) => {
        const medals = ['🥇', '🥈', '🥉'];
        const row = new Rectangle();
        row.width = '360px'; row.height = '54px';
        row.background = i < 3 ? ['#fcf3cf', '#ebf5fb', '#fdf2e9'][i] : '#ffffff';
        row.color = i < 3 ? ['#f39c12', '#aab7b8', '#d35400'][i] : '#d5c7b3';
        row.cornerRadius = 16; row.thickness = 3;
        row.paddingBottom = '8px';
        row.shadowColor = row.color;
        row.shadowBlur = 0;
        row.shadowOffsetX = 0;
        row.shadowOffsetY = 4;
        row.alpha = 0;
        panel.addControl(row);

        const rowTxt = new TextBlock();
        rowTxt.text = `${i < 3 ? medals[i] : `#${i + 1}`}  ${entry.avatar ?? ''} ${entry.username}  —  ${entry.stars} pts`;
        rowTxt.color = i < 3 ? ['#7f3d00', '#2c3e50', '#5e2700'][i] : '#4a3e3d';
        rowTxt.fontSize = 15;
        rowTxt.fontStyle = 'bold';
        rowTxt.fontFamily = 'Fredoka, sans-serif';
        row.addControl(rowTxt);

        TweenManager.add({ targets: row, alpha: 1, duration: 350, delay: 200 + i * 50 });
      });
    } catch {
      loadingTxt.text = 'Could not load leaderboard.';
      loadingTxt.color = '#ff4d4d';
    }

    // Back button (pink cartoon design)
    const backBtn = Button.CreateSimpleButton('btn_back', '← Menu');
    backBtn.width = '150px'; backBtn.height = '44px';
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
    TweenManager.add({ targets: backBtn, alpha: 1, duration: 400, delay: 500 });
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
