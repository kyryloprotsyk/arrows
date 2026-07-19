/* HUD.ts — In-game HUD using BabylonGUI */
import { Control, TextBlock, Rectangle } from '@babylonjs/gui';
import { BabylonGUI } from './BabylonGUI';
import { TweenManager } from './TweenManager';
import { GameData } from '../utils/GameData';

export class HUD {
  private levelText!: TextBlock;
  private coinsText!: TextBlock;
  private movesText!: TextBlock;
  private comboLabel!: TextBlock;
  private tutLabel!: TextBlock;
  private parText!: TextBlock;

  init(onHome: () => void, onReset: () => void, onRotateL: () => void, onRotateR: () => void) {
    const ui = BabylonGUI.getUI();

    // Top Bar Background
    const topBar = new Rectangle('hud-bar');
    topBar.height = '60px';
    topBar.width = 1.0;
    topBar.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    topBar.background = '#0a001adc';
    topBar.thickness = 0;
    ui.addControl(topBar);

    // Level Text
    this.levelText = BabylonGUI.createText('', { fontSize: 28 });
    topBar.addControl(this.levelText);

    // Coins Text
    this.coinsText = BabylonGUI.createText('🪙 0', { fontSize: 28, color: '#ffe45e' });
    this.coinsText.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    this.coinsText.left = '20px';
    topBar.addControl(this.coinsText);

    // Moves Text
    this.movesText = BabylonGUI.createText('⚡ 0', { fontSize: 28, color: '#74c0fc' });
    this.movesText.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
    this.movesText.left = '-20px';
    topBar.addControl(this.movesText);

    // Combo Label
    this.comboLabel = BabylonGUI.createText('', {
      fontSize: 50,
      color: '#ffe45e',
      shadowOffsetX: 0,
      shadowOffsetY: 5,
      shadowBlur: 10,
      shadowColor: '#ff8800'
    });
    this.comboLabel.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    this.comboLabel.top = '100px';
    this.comboLabel.alpha = 0;
    ui.addControl(this.comboLabel);

    // Tutorial Label
    this.tutLabel = BabylonGUI.createText('', { fontSize: 24, color: '#ccbbff' });
    this.tutLabel.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
    this.tutLabel.top = '-120px';
    this.tutLabel.alpha = 0;
    ui.addControl(this.tutLabel);

    // Buttons
    const btnSize = '70px';
    const margin = 20;

    const btnHome = BabylonGUI.createButton('🏠', onHome, {
      width: btnSize, height: btnSize, bgColor: '#c0392b', fontSize: 36
    });
    btnHome.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
    btnHome.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
    btnHome.left = `${-margin}px`;
    btnHome.top = `${-margin}px`;
    ui.addControl(btnHome);

    const btnReset = BabylonGUI.createButton('🔄', onReset, {
      width: btnSize, height: btnSize, bgColor: '#27ae60', fontSize: 36
    });
    btnReset.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
    btnReset.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
    btnReset.left = `${-margin * 2 - 70}px`;
    btnReset.top = `${-margin}px`;
    ui.addControl(btnReset);

    const btnRotL = BabylonGUI.createButton('◀', onRotateL, {
      width: btnSize, height: btnSize, bgColor: '#6c3483', fontSize: 36
    });
    btnRotL.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    btnRotL.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
    btnRotL.left = `${margin}px`;
    btnRotL.top = `${-margin}px`;
    ui.addControl(btnRotL);

    const btnRotR = BabylonGUI.createButton('▶', onRotateR, {
      width: btnSize, height: btnSize, bgColor: '#6c3483', fontSize: 36
    });
    btnRotR.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
    btnRotR.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
    btnRotR.left = `${-margin * 3 - 140}px`;
    btnRotR.top = `${-margin}px`;
    ui.addControl(btnRotR);
  }

  update(worldName: string, levelIndex: number, movesLeft: number, isDaily: boolean) {
    if (isDaily) {
      this.levelText.text = `📅 Daily Challenge — Day ${GameData.dailyStreak.get()}`;
    } else {
      this.levelText.text = `${worldName} — Lvl ${levelIndex}`;
    }
    this.coinsText.text = `🪙 ${GameData.coins.get()}`;
    this.movesText.text = `⚡ ${movesLeft}`;
    this.movesText.color = movesLeft <= 3 ? '#ff6b6b' : '#74c0fc';
  }

  showCombo(comboCount: number, addedCoins: number) {
    const msgs = ['', '🔥 COMBO x2!', '⚡ COMBO x3!', '💥 x4 INSANE!', '🌈 MEGA COMBO!'];
    const msg = msgs[Math.min(comboCount - 1, msgs.length - 1)];
    this.comboLabel.text = `${msg} +${addedCoins}🪙`;
    this.comboLabel.alpha = 1.0;
    this.comboLabel.scaleX = 0.5;
    this.comboLabel.scaleY = 0.5;

    TweenManager.add({
      targets: this.comboLabel,
      scaleX: 1.1,
      scaleY: 1.1,
      duration: 250,
      ease: 'Back.Out',
      onComplete: () => {
        TweenManager.add({
          targets: this.comboLabel,
          alpha: 0,
          duration: 800,
          delay: 600
        });
      }
    });
  }

  showMsg(msg: string) {
    this.tutLabel.text = msg;
    this.tutLabel.alpha = 1;
    TweenManager.killTweensOf(this.tutLabel);
    TweenManager.add({
      targets: this.tutLabel,
      alpha: 0,
      delay: 3500,
      duration: 600
    });
  }
}
