/* ProfileScene.ts — Babylon.js Profile Scene */
import type { IGameScene } from '../babylon/SceneManager';
import { BabylonGUI } from '../babylon/BabylonGUI';
import { SceneManager } from '../babylon/SceneManager';
import { TweenManager } from '../babylon/TweenManager';
import { GameData } from '../utils/GameData';
import { audio } from '../audio';
import { Control, TextBlock, Rectangle, Button, StackPanel } from '@babylonjs/gui';
import type { Scene as BjsScene } from '@babylonjs/core';

export class ProfileScene implements IGameScene {
  key = 'Profile';

  create(_scene: BjsScene) {
    const gui = BabylonGUI.createFullscreenUI('profile_ui');    // Warm peach background
    const bg = new Rectangle();
    bg.width = '100%'; bg.height = '100%';
    bg.background = '#fff5ea'; bg.thickness = 0;
    gui.addControl(bg);

    // Title
    const title = new TextBlock();
    title.text = '👤 Player Profile';
    title.color = '#ff9f1c';
    title.fontSize = 32;
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

    // Panel
    const panel = new StackPanel();
    panel.isVertical = true;
    panel.width = '360px';
    panel.top = '0%';
    panel.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    gui.addControl(panel);

    const level = GameData.playerXP.getLevel();
    const currXP = GameData.playerXP.get();
    const prevXP = GameData.playerXP.getXPForLevel(level);
    const nextXP = GameData.playerXP.getXPForLevel(level + 1);
    const progress = Math.min((currXP - prevXP) / (nextXP - prevXP), 1);

    // Stats box (white cartoon card)
    const statsBox = new Rectangle();
    statsBox.width = '340px'; statsBox.height = '140px';
    statsBox.background = '#ffffff'; statsBox.color = '#ffa500';
    statsBox.cornerRadius = 20; statsBox.thickness = 3;
    statsBox.paddingBottom = '20px';
    statsBox.shadowColor = '#ffa500';
    statsBox.shadowBlur = 0;
    statsBox.shadowOffsetX = 0;
    statsBox.shadowOffsetY = 4;
    statsBox.alpha = 0;
    panel.addControl(statsBox);
    TweenManager.add({ targets: statsBox, alpha: 1, duration: 400, delay: 250 });

    const innerPanel = new StackPanel();
    innerPanel.isVertical = true;
    statsBox.addControl(innerPanel);

    const nameTxt = new TextBlock();
    nameTxt.text = `${GameData.avatar.get()} ${GameData.username.get()}  —  Level ${level}`;
    nameTxt.color = '#d35400'; nameTxt.fontSize = 20;
    nameTxt.fontStyle = 'bold';
    nameTxt.fontFamily = 'Fredoka, sans-serif';
    nameTxt.height = '40px';
    innerPanel.addControl(nameTxt);

    const xpTxt = new TextBlock();
    xpTxt.text = `XP: ${currXP} / ${nextXP}`;
    xpTxt.color = '#ffa500'; xpTxt.fontSize = 16;
    xpTxt.fontStyle = 'bold';
    xpTxt.fontFamily = 'Fredoka, sans-serif';
    xpTxt.height = '30px';
    innerPanel.addControl(xpTxt);

    // Progress bar
    const barBg = new Rectangle();
    barBg.width = '280px'; barBg.height = '20px';
    barBg.background = 'rgba(0,0,0,0.06)'; barBg.cornerRadius = 10; barBg.thickness = 0;
    innerPanel.addControl(barBg);

    const barFill = new Rectangle();
    barFill.width = `${Math.max(5, progress * 100)}%`; barFill.height = '20px';
    barFill.background = '#2ecc71'; barFill.cornerRadius = 10; barFill.thickness = 0;
    barFill.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    barBg.addControl(barFill);

    // Toggles
    const togglePanel = new StackPanel();
    togglePanel.isVertical = false; togglePanel.height = '60px'; togglePanel.paddingBottom = '20px';
    panel.addControl(togglePanel);

    // Mute button
    let isMuted = GameData.muted.get();
    const muteBtn = Button.CreateSimpleButton('btn_mute', isMuted ? '🔇 Muted' : '🔊 Sound On');
    muteBtn.width = '140px'; muteBtn.height = '40px';
    muteBtn.color = '#ffffff'; muteBtn.fontSize = 16;
    muteBtn.fontStyle = 'bold';
    muteBtn.fontFamily = 'Fredoka, sans-serif';
    muteBtn.background = isMuted ? '#e91e63' : '#2ecc71';
    (muteBtn as any).color = isMuted ? '#c2185b' : '#27ae60'; // border color
    muteBtn.cornerRadius = 16; muteBtn.thickness = 3;
    muteBtn.shadowColor = isMuted ? '#c2185b' : '#27ae60';
    muteBtn.shadowBlur = 0;
    muteBtn.shadowOffsetX = 0;
    muteBtn.shadowOffsetY = 4;
    muteBtn.paddingRight = '10px'; muteBtn.alpha = 0;
    togglePanel.addControl(muteBtn);
    TweenManager.add({ targets: muteBtn, alpha: 1, duration: 400, delay: 400 });
    muteBtn.onPointerEnterObservable.add(() => { muteBtn.scaleX = 1.03; muteBtn.scaleY = 1.03; muteBtn.shadowOffsetY = 5; });
    muteBtn.onPointerOutObservable.add(() => { muteBtn.scaleX = 1.0; muteBtn.scaleY = 1.0; muteBtn.shadowOffsetY = 4; });
    muteBtn.onPointerDownObservable.add(() => { muteBtn.scaleX = 0.97; muteBtn.scaleY = 0.97; muteBtn.shadowOffsetY = 1; });
    muteBtn.onPointerUpObservable.add(() => {
      audio.playTap();
      isMuted = !isMuted;
      GameData.muted.set(isMuted);
      const textBlock = muteBtn.children[0] as TextBlock;
      textBlock.text = isMuted ? '🔇 Muted' : '🔊 Sound On';
      muteBtn.background = isMuted ? '#e91e63' : '#2ecc71';
      (muteBtn as any).color = isMuted ? '#c2185b' : '#27ae60';
      muteBtn.shadowColor = isMuted ? '#c2185b' : '#27ae60';
      muteBtn.scaleX = 1.0; muteBtn.scaleY = 1.0;
      muteBtn.shadowOffsetY = 4;
      if (!isMuted) audio.playBGM(); else audio.stopBGM();
    });

    // Dark Mode button (purple cartoon design)
    const dmBtn = Button.CreateSimpleButton('btn_dm', '🌙 Dark Mode');
    dmBtn.width = '140px'; dmBtn.height = '40px';
    dmBtn.color = '#ffffff'; dmBtn.fontSize = 16;
    dmBtn.fontStyle = 'bold';
    dmBtn.fontFamily = 'Fredoka, sans-serif';
    dmBtn.background = '#9b59b6';
    (dmBtn as any).color = '#8e44ad'; // border color
    dmBtn.cornerRadius = 16; dmBtn.thickness = 3;
    dmBtn.shadowColor = '#8e44ad';
    dmBtn.shadowBlur = 0;
    dmBtn.shadowOffsetX = 0;
    dmBtn.shadowOffsetY = 4;
    dmBtn.alpha = 0;
    togglePanel.addControl(dmBtn);
    TweenManager.add({ targets: dmBtn, alpha: 1, duration: 400, delay: 500 });
    dmBtn.onPointerEnterObservable.add(() => { dmBtn.scaleX = 1.03; dmBtn.scaleY = 1.03; dmBtn.shadowOffsetY = 5; });
    dmBtn.onPointerOutObservable.add(() => { dmBtn.scaleX = 1.0; dmBtn.scaleY = 1.0; dmBtn.shadowOffsetY = 4; });
    dmBtn.onPointerDownObservable.add(() => { dmBtn.scaleX = 0.97; dmBtn.scaleY = 0.97; dmBtn.shadowOffsetY = 1; });
    dmBtn.onPointerUpObservable.add(() => {
      audio.playTap();
      dmBtn.scaleX = 1.0; dmBtn.scaleY = 1.0;
      dmBtn.shadowOffsetY = 4;
    });

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
    TweenManager.add({ targets: backBtn, alpha: 1, duration: 400, delay: 600 });
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
